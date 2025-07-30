// socket/socket.ts
import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";
import OrderService from "../services/order.service.js";
import {Container} from "typedi";
import { createDriverOrderResource } from "../resource/drivers/driverOrder.resource.js";
// import { getDistanceAndDuration } from "../utils/google-maps/distance-time.js"; // Assuming you have a function to get distance and duration

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
  const orderService = Container.get(OrderService) // Assuming you have an OrderService class to handle orders

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
      const pendingOrders = await orderService.getPendingOrdersForVehicleType(vehicleType);
      for (const order of pendingOrders) {
        console.log(`Sending pending order ${order.id} to driver ${driverId}`);
        // const { distanceKm, durationMin } = await getDistanceAndDuration(currentLocation, order.fromAddress.city);
        socket.emit("new-order", createDriverOrderResource(order));
        console.log(`Sent pending order ${order.id} to driver ${driverId}`);
      }
    });

    socket.on("driver-offline", (driverId: string) => {
      onlineDrivers.delete(driverId);
      console.log(`Driver ${driverId} went offline`);
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
