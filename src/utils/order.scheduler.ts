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

  const diffMs = now.getTime() - pickupTime.getTime();
  const orderEmitBuffer  = env.ORDER_EMIT_BUFFER_MINUTES * 60 * 1000; // Convert buffer minutes to milliseconds
  console.log('diffMs:', diffMs, 'orderEmitBuffer:', orderEmitBuffer);
  if (diffMs > orderEmitBuffer) {
    // Pickup time already passed beyond the buffer, no point emitting
    console.log(`❌ Pickup time for order ${order.id} already passed beyond buffer, skipping emit.`);
    return;
  }
  
   // ⏱ If pickup is in the past but within buffer → emit immediately
  if (diffMs >= 0 && diffMs <= orderEmitBuffer) {
    console.log(
      `⏱ Pickup was within last ${env.ORDER_EMIT_BUFFER_MINUTES} minutes — emitting order ${order.id} immediately`
    );
    emitOrderToDrivers(order);
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
