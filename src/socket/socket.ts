// socket/socket.ts
import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";
import { Order } from "../models/order.model.js"; // Assuming you have an Order model
import { hasDriverBeenNotified, markDriverNotified } from "../utils/notification-tracker.js";
import { Container } from "typedi";
import OrderService from "../services/order.service.js"; // Assuming you have an OrderService to fetch

type OnlineDriver = {
    socketId: string;
    vehicleType: VehicleType;
    // currentLocation: string;
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

    socket.on("driver-online", async (data: { driverId: string; vehicleType: VehicleType }) => {
      const { driverId, vehicleType} = data;
      onlineDrivers.set(driverId, {
        socketId: socket.id,
        vehicleType: vehicleType,
        // currentLocation: currentLocation,
      });
      console.log(`Driver ${driverId} is now online with vehicle type ${vehicleType}`);

      const now = new Date();
      console.log(`⏰ Current time is ${now.toISOString()}`);
      const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);
      console.log(`⏰ Upcoming orders will be checked until ${fifteenMinutesLater.toISOString()}`);

      const upcomingOrders = await orderService.getPendingOrdersInWindow(vehicleType, now, fifteenMinutesLater);
      for (const order of upcomingOrders) {
        if (!hasDriverBeenNotified(order.id, driverId)) {
          socket.emit("new-order", order);
          markDriverNotified(order.id, driverId);
          console.log(`📦 Sent upcoming order ${order.id} to driver ${driverId}`);
        } else {
          console.log(`Driver ${driverId} has already been notified for order ${order.id}`);
        }
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

export function emitOrderToDrivers(order: Order): void {
  const io = getSocketInstance();
  const onlineDrivers = getOnlineDrivers();

  for (const [driverId, { socketId, vehicleType }] of onlineDrivers.entries()) {
    if (vehicleType === order.vehicleType) {
      if (hasDriverBeenNotified(driverId, order.id)) {
        console.log(`Driver ${driverId} has already been notified for order ${order.id}`);
        continue; // Skip if the driver has already been notified
      }
      io.to(socketId).emit("new-order", order);
      markDriverNotified(order.id, driverId);
      console.log(`📦 Sent order ${order.id} to driver ${driverId}`);
    }
  }
}