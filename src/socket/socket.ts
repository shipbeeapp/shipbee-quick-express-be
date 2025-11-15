// socket/socket.ts
import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";
import { Order } from "../models/order.model.js"; // Assuming you have an Order model
import { hasDriverBeenNotified, markDriverNotified } from "../utils/notification-tracker.js";
import { Container } from "typedi";
import OrderService from "../services/order.service.js"; // Assuming you have an OrderService to fetch
import { createDriverOrderResource } from "../resource/drivers/driverOrder.resource.js"; // Assuming you have a function to create order resources for drivers
import { getDrivingDistanceInKm } from "../utils/google-maps/distance-time.js";
import { env } from "../config/environment.js"; // Assuming you have an environment config
import { AppDataSource } from "../config/data-source.js";
import { DriverStatus } from "../utils/enums/driverStatus.enum.js";
import { Driver } from "../models/driver.model.js"; // Assuming you have a Driver model
import { broadcastDriverStatusUpdate, broadcastOrderTrackingUpdate, broadcastDriverTrackingUpdate } from "../controllers/user.controller.js";
import DriverSignupStatus from "../utils/enums/signupStatus.enum.js";

type OnlineDriver = {
    socketId: string;
    vehicleType: VehicleType;
    currentLocation: string;
  };
const onlineDrivers = new Map<string, OnlineDriver>(); // driverId -> socketId
type Session = [Date, Date | null]; // [onlineTime, offlineTime]

const driverSessions = new Map<string, Session[]>();

let io: SocketIOServer;

const RADIUS_BY_VEHICLE_TYPE: Record<any, number> = {
  [VehicleType.MOTORCYCLE]: env.RADIUS_KM_MOTORCYCLE,
  [VehicleType.SEDAN_CAR]: env.RADIUS_KM_SEDAN_CAR,
  // For all other vehicle types, default to 15 km
};

export function initializeSocket(server: HTTPServer): SocketIOServer {
  console.log("Initializing Socket.IO...");
  io = new SocketIOServer(server, {
    path: "/ws",
    cors: { origin: "*" },
  });
  console.log("Socket.IO initialized");
  const orderService = Container.get(OrderService); // Assuming you have an OrderService to fetch orders

  io.on("connection", (socket) => {
    
    socket.on("driver-online", async (data: { driverId: string; vehicleType: VehicleType, currentLocation: string }) => {
      console.log("Driver connected:", socket.id);
      const { driverId, vehicleType, currentLocation } = data;
      const driver = await AppDataSource.getRepository(Driver).findOneBy({ id: driverId });
      if (!driver) {
        console.log(`❌ Driver ${driverId} not found in database`);
        return;
      }
      if (driver.signUpStatus !== DriverSignupStatus.APPROVED) {
        console.log(`❌ Driver ${driverId} is not approved, cannot go online`);
        return;
      }
      onlineDrivers.set(driverId, {
        socketId: socket.id,
        vehicleType: vehicleType,
        currentLocation: currentLocation,
      });
      // Add new session with online time = now, offline time = null (still online)
      const now = new Date();
      const sessions = driverSessions.get(driverId) || [];
      sessions.push([now, null]);
      driverSessions.set(driverId, sessions);
      await AppDataSource.getRepository(Driver).update(
        { id: driverId },
        { status: DriverStatus.ACTIVE, updatedAt: new Date()}
      );
      console.log(`Driver ${driverId} is now online with vehicle type ${vehicleType}`);
      broadcastDriverStatusUpdate(driverId, DriverStatus.ACTIVE); // Notify all connected clients about the driver status update

      console.log(`⏰ Current time is ${now.toISOString()}`);
      let window: Date;
      if (vehicleType == VehicleType.SEDAN_CAR || vehicleType == VehicleType.MOTORCYCLE) {
        window = new Date(now.getTime() + env.EMIT_TIME_SEDAN_CAR_MINUTES * 60 * 1000);
        console.log(`⏰ Upcoming orders will be checked until ${window.toISOString()}`);
      } else {
        window = new Date(now.getTime() + env.EMIT_TIME_OTHER_MINUTES * 60 * 1000);
        console.log(`⏰ Upcoming orders will be checked until ${window.toISOString()}`);
      }

      const upcomingOrders = await orderService.getPendingOrdersInWindow(vehicleType, now, window);
      const maxRadiusKm = RADIUS_BY_VEHICLE_TYPE[vehicleType] ?? env.RADIUS_KM_OTHER; // default 15 km
      for (const order of upcomingOrders) {
        const { distanceMeters, durationMinutes } = await getDrivingDistanceInKm(
          currentLocation,
          order.fromAddress.coordinates
        );

        if (distanceMeters === null || distanceMeters > maxRadiusKm) {
          console.log(`❌ Driver ${driverId} is too far (${distanceMeters} km) from order ${order.id}`);
          continue;
        }

        if (!hasDriverBeenNotified(order.id, driverId)) {
          socket.emit("new-order", createDriverOrderResource(order, distanceMeters, durationMinutes));
          markDriverNotified(order.id, driverId);
          console.log(`📦 Sent upcoming order ${order.id} to driver ${driverId} who is ${distanceMeters} km away`);
        } else {
          console.log(`Driver ${driverId} has already been notified for order ${order.id}`);
        }
      }
    });

    socket.on("track-order", async (orderId: string) => {
      const roomName = `order-${orderId}`;
      console.log('room name: ', roomName);
      socket.join(roomName);
      console.log(`✅ Customer ${socket.id} joined room ${roomName}`);
    });

    socket.on("track-driver", async (driverId: string) => {
      const roomName = `driver-${driverId}`;
      console.log('room name: ', roomName);
      socket.join(roomName);
      console.log(`✅ Customer ${socket.id} joined room ${roomName}`);
    });

    socket.on("location-update", async (data: { driverId: string; currentLocation: string; orderId: string }) => {
      const { driverId, currentLocation, orderId } = data;

      const driver = onlineDrivers.get(driverId);
      if (driver) {
        driver.currentLocation = currentLocation;
        onlineDrivers.set(driverId, driver);
        await AppDataSource.getRepository(Driver).update(driverId, { updatedAt: new Date() });
        console.log(`📍 Updated location for driver ${driverId}:`, currentLocation);
        broadcastDriverTrackingUpdate(driverId, currentLocation); // Notify all connected clients about the driver location update
        io.to(`driver-${driverId}`).emit("driver-location", { driverId, currentLocation });
      }

      if (orderId) {
        console.log(`Emitting location update for order ID: ${orderId}`);
        broadcastOrderTrackingUpdate(orderId, currentLocation);
        io.to(`order-${orderId}`).emit("order-location", { orderId, currentLocation });
    }
});

    socket.on("stop-tracking-order", async (orderId: string) => {
      const roomName = `order-${orderId}`;
      socket.leave(roomName);
      console.log(`❌ Customer ${socket.id} left room ${roomName}`);
    });

    socket.on("driver-offline", async (driverId: string) => {
      console.log("Driver going offline:", driverId);
      onlineDrivers.delete(driverId);
      const now = new Date();
      const sessions = driverSessions.get(driverId);
      if (sessions && sessions.length > 0) {
        // Find last session with null offline time and set it
        for (let i = sessions.length - 1; i >= 0; i--) {
          if (sessions[i][1] === null) {
            sessions[i][1] = now;
            console.log(`Driver ${driverId} went offline at ${now.toISOString()}`);
            break;
          }
        }
      }
      console.log(`Driver ${driverId} went offline`);
      await AppDataSource.getRepository(Driver).update(driverId, { status: DriverStatus.OFFLINE, updatedAt: new Date() });
      console.log("Current online drivers:", Array.from(onlineDrivers.keys()));
      broadcastDriverStatusUpdate(driverId, DriverStatus.OFFLINE); // Notify all connected clients about the driver status update
    });

    socket.on("disconnect", async () => {
        for (const [driverId, info] of onlineDrivers.entries()) {
          if (info.socketId === socket.id) {
            onlineDrivers.delete(driverId);
            await AppDataSource.getRepository(Driver).update(driverId, { status: DriverStatus.OFFLINE, updatedAt: new Date() });
            broadcastDriverStatusUpdate(driverId, DriverStatus.OFFLINE); // Notify all connected clients about the driver status update
            const now = new Date();
            const sessions = driverSessions.get(driverId);
            if (sessions && sessions.length > 0) {
              // Find last session with null offline time and set it
              for (let i = sessions.length - 1; i >= 0; i--) {
                if (sessions[i][1] === null) {
                  sessions[i][1] = now;
                  console.log(`Driver ${driverId} went offline at ${now.toISOString()}`);
                  break;
                }
              }
            }
            console.log(`Driver ${driverId} disconnected`);
            break;
          }
        }
      });
  });

  return io;
}

export function getSocketInstance(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function getOnlineDrivers(): Map<string, OnlineDriver> {
  return onlineDrivers;
}

export async function emitOrderToDrivers(order: Order, locationOnCancel?: string): Promise<void> {
  const io = getSocketInstance();
  const onlineDrivers = getOnlineDrivers();
  console.log(`📦 Emitting order ${order.id} to online drivers... ${Array.from(onlineDrivers.keys()).join(", ")}`);
  for (const [driverId, { socketId, vehicleType, currentLocation }] of onlineDrivers.entries()) {
    const driver = await AppDataSource.getRepository(Driver).findOneBy({ id: driverId });
    if (!driver) {
      console.log(`❌ Driver ${driverId} not found in database`);
      continue;
    }
    if (driver.signUpStatus !== DriverSignupStatus.APPROVED) {
      console.log(`❌ Driver ${driverId} is not approved, cannot receive orders`);
      continue;
    }
    if (vehicleType === order.vehicleType) {
      console.log(`🚚 Checking driver ${driverId} for order ${order.id} with vehicleType ${vehicleType} and location ${currentLocation}`);
      console.log(`checking if this is a cancellation emit with locationOnCancel: ${locationOnCancel}`);
      // if (hasDriverBeenNotified(driverId, order.id)) {
      //   console.log(`Driver ${driverId} has already been notified for order ${order.id}`);
      //   continue; // Skip if the driver has already been notified
      // }
      const {distanceMeters, durationMinutes} = await getDrivingDistanceInKm(
        currentLocation,
        locationOnCancel ? locationOnCancel : order.fromAddress.coordinates
      );
      console.log(`📦 Distance of pickup from driver ${driverId}: ${distanceMeters} km`);
      const maxRadiusKm = RADIUS_BY_VEHICLE_TYPE[vehicleType] ?? env.RADIUS_KM_OTHER; // default 15 km
      console.log(`📦 Max radius for vehicle type ${vehicleType}: ${maxRadiusKm} km`);
      if (distanceMeters === null || distanceMeters > maxRadiusKm) {
        console.log(`❌ Driver ${driverId} too far (${distanceMeters} km) or distance unavailable`);
        continue;
      }
      order.fromAddress.coordinates = locationOnCancel ? locationOnCancel : order.fromAddress.coordinates;
      io.to(socketId).emit("new-order", createDriverOrderResource(order, distanceMeters, durationMinutes));
      markDriverNotified(order.id, driverId);
      console.log(`📦 Sent order ${order.id} to driver ${driverId} who is ${distanceMeters} km away`);
    }
  }
}

export function emitOrderCancellationUpdate(driverId: string, orderId: string, status: string): Promise<void> {
  const io = getSocketInstance();
  const onlineDrivers = getOnlineDrivers();
  const driver = onlineDrivers.get(driverId);
  if (!driver) {
    console.log(`Driver ${driverId} is not online`);
    return;
  }
  io.to(driver.socketId).emit("order-cancellation-update", { driverId, orderId, status });
  console.log(`order cancellation update sent to driver id: ${driverId} having order id: ${orderId} with status: ${status} `)
}

export function emitOrderCompletionUpdate(driverId: string, orderId: string): Promise<void> {
  const io = getSocketInstance();
  const onlineDrivers = getOnlineDrivers();
  const driver = onlineDrivers.get(driverId);

  if (!driver) {
    console.log(`Driver ${driverId} is not online`);
    return;
  }
  io.to(driver.socketId).emit("order-completion-update", { driverId, orderId });
  console.log(`order completion update sent to driver id: ${driverId} having order id: ${orderId} `)
}

export function calculateActiveHoursToday(driverId: string): number {
  const sessions = driverSessions.get(driverId) || [];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  let totalMilliseconds = 0;

  for (const [start, end] of sessions) {
    // Ignore sessions completely outside today
    if (start >= todayEnd || (end !== null && end <= todayStart)) continue;

    // Clamp start/end inside today's range
    const sessionStart = start < todayStart ? todayStart : start;
    const sessionEnd = end === null || end > todayEnd ? new Date() : end;

    totalMilliseconds += sessionEnd.getTime() - sessionStart.getTime();
  }

  return totalMilliseconds / (1000 * 60 * 60); // convert ms to hours, rounded to 1 decimal
}

export async function emitOrderToDriver(driverId: string, order: Order) {
  const io = getSocketInstance();
  const onlineDrivers = getOnlineDrivers();
  const driver = onlineDrivers.get(driverId);

  if (driver) {
    const {distanceMeters, durationMinutes} = await getDrivingDistanceInKm(
      driver.currentLocation,
      order.fromAddress.coordinates
    );
    io.to(driver.socketId).emit("new-order", createDriverOrderResource(order, distanceMeters, durationMinutes));
    console.log(`📦 Sent order ${order.id} by assignment to driver ${driverId}`);
  } else {
    console.log(`❌ Driver ${driverId} is not online when trying to assign order ${order.id}`);
  }
}

export function getCurrentLocationOfDriver(driverId: string): string | null {
  const onlineDrivers = getOnlineDrivers();
  const driver = onlineDrivers.get(driverId);

  if (driver) {
    return driver.currentLocation;
  } else {
    return null;
  }
}