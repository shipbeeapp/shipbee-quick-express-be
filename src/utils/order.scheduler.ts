import schedule from "node-schedule";
import { emitOrderToDrivers } from"../socket/socket.js";
import { Order } from "../models/order.model.js";
import OrderService  from "../services/order.service.js";
import { VehicleType } from "./enums/vehicleType.enum.js";
import {env} from "../config/environment.js";
// import { Container } from "typedi";

// const orderService = Container.get(OrderService);

export function scheduleOrderEmission(order: Order): void {
  const pickupTime = new Date(order.pickUpDate);
  let emitTime: Date;
  if (order.vehicleType === VehicleType.SEDAN_CAR || order.vehicleType === VehicleType.MOTORCYCLE) {
    emitTime = new Date(pickupTime.getTime() - env.EMIT_TIME_SEDAN_CAR_MINUTES * 60 * 1000); // 15 minutes before
  } else {
     emitTime = new Date(pickupTime.getTime() - env.EMIT_TIME_OTHER_MINUTES * 60 * 1000); // 90 minutes before
  }
  console.log(`📅 Scheduling order ${order.id} for ${emitTime.toISOString()}`);
  const now = new Date();
  console.log(`⏰ Current time is ${now.toISOString()}`);

  if (now >= pickupTime) {
    // Pickup time already passed, no point emitting
    console.log(`❌ Pickup time for order ${order.id} already passed, skipping emit.`);
    return;
  }

  if (emitTime <= now) {
    console.log(`⏱ Pickup time is soon (within window) — emitting order ${order.id} immediately`);
    emitOrderToDrivers(order);
    return;
  }

  schedule.scheduleJob(emitTime, () => {
    console.log(`🚚 Emitting scheduled order ${order.id} at ${new Date().toISOString()}`);
    emitOrderToDrivers(order);
  });

  console.log(`📅 Order ${order.id} scheduled for ${emitTime.toISOString()}`);
}

export async function schedulePendingOrdersOnStartup(orderService: OrderService): Promise<void> {
  const now = new Date();
  const futureOrders = await orderService.getPendingOrdersWithPickupAfter(now);

  for (const order of futureOrders) {
    scheduleOrderEmission(order);
  }

  console.log(`🔁 Rescheduled ${futureOrders.length} orders after startup`);
}
