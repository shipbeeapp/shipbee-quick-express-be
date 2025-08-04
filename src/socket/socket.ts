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

type OnlineDriver = {
    socketId: string;
    vehicleType: VehicleType;
    currentLocation: string;
  };
const onlineDrivers = new Map<string, OnlineDriver>(); // driverId -> socketId

let io: SocketIOServer;

export function initializeSocket(server: HTTPServer): SocketIOServer {
  console.log("Initializing Socket.IO...");
  io = new SocketIOServer(server, {
    path: "/ws",
    cors: { origin: "*" },
  });
  console.log("Socket.IO initialized");
  const orderService = Container.get(OrderService); // Assuming you have an OrderService to fetch orders

  io.on("connection", (socket) => {
    console.log("Driver connected:", socket.id);

    socket.on("driver-online", async (data: { driverId: string; vehicleType: VehicleType, currentLocation: string }) => {
      const { driverId, vehicleType, currentLocation } = data;
      onlineDrivers.set(driverId, {
        socketId: socket.id,
        vehicleType: vehicleType,
        currentLocation: currentLocation,
      });
      console.log(`Driver ${driverId} is now online with vehicle type ${vehicleType}`);

      const now = new Date();
      console.log(`⏰ Current time is ${now.toISOString()}`);
      const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);
      console.log(`⏰ Upcoming orders will be checked until ${fifteenMinutesLater.toISOString()}`);

      const upcomingOrders = await orderService.getPendingOrdersInWindow(vehicleType, now, fifteenMinutesLater);
      for (const order of upcomingOrders) {
        const { distanceMeters, durationMinutes } = await getDrivingDistanceInKm(
          currentLocation,
          order.fromAddress.coordinates
        );

        if (distanceMeters === null || distanceMeters > env.RADIUS_KM) {
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

    socket.on("location-update", (data: { driverId: string; location: string }) => {
      const { driverId, location } = data;

      const driver = onlineDrivers.get(driverId);
      if (driver) {
        driver.currentLocation = location;
        onlineDrivers.set(driverId, driver);

        console.log(`📍 Updated location for driver ${driverId}:`, location);
      }
});

    socket.on("driver-offline", (driverId: string) => {
      onlineDrivers.delete(driverId);
      console.log(`Driver ${driverId} went offline`);
      console.log("Current online drivers:", Array.from(onlineDrivers.keys()));
    });

    socket.on("disconnect", () => {
        for (const [driverId, info] of onlineDrivers.entries()) {
          if (info.socketId === socket.id) {
            onlineDrivers.delete(driverId);
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

export async function emitOrderToDrivers(order: Order): Promise<void> {
  const io = getSocketInstance();
  const onlineDrivers = getOnlineDrivers();
  for (const [driverId, { socketId, vehicleType, currentLocation }] of onlineDrivers.entries()) {
    if (vehicleType === order.vehicleType) {
      if (hasDriverBeenNotified(driverId, order.id)) {
        console.log(`Driver ${driverId} has already been notified for order ${order.id}`);
        continue; // Skip if the driver has already been notified
      }
      const {distanceMeters, durationMinutes} = await getDrivingDistanceInKm(
        currentLocation,
        order.fromAddress.coordinates
      );
      if (distanceMeters === null || distanceMeters > env.RADIUS_KM) {
        console.log(`❌ Driver ${driverId} too far (${distanceMeters} km) or distance unavailable`);
        continue;
      }
      io.to(socketId).emit("new-order", createDriverOrderResource(order, distanceMeters, durationMinutes));
      markDriverNotified(order.id, driverId);
      console.log(`📦 Sent order ${order.id} to driver ${driverId} who is ${distanceMeters} km away`);
    }
  }
}