// socket/socket.ts
import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";
import OrderService from "../services/order.service.js";
import {Container} from "typedi";

type OnlineDriver = {
    socketId: string;
    vehicleType: VehicleType;
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
  console.log("io:", io);
  const orderService = Container.get(OrderService) // Assuming you have an OrderService class to handle orders

  io.on("connection", (socket) => {
    console.log("Driver connected:", socket.id);
    
    socket.on("driver-online", async (data: { driverId: string; vehicleType: VehicleType }) => {
      const { driverId, vehicleType } = data;
      onlineDrivers.set(driverId, {
        socketId: socket.id,
        vehicleType: vehicleType,
      });
      console.log(`Driver ${driverId} is now online with vehicle type ${vehicleType}`);
      const pendingOrders = await orderService.getPendingOrdersForVehicleType(vehicleType);
      for (const order of pendingOrders) {
        socket.emit("new-order", order);
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
