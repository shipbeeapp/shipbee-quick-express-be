import schedule from "node-schedule";
import { emitOrderToDrivers } from"../socket/socket.js";
import { Order } from "../models/order.model.js";
import OrderService  from "../services/order.service.js";
// import { Container } from "typedi";

// const orderService = Container.get(OrderService);

export function scheduleOrderEmission(order: Order): void {
  const pickupTime = new Date(order.pickUpDate);
  const emitTime = new Date(pickupTime.getTime() - 15 * 60 * 1000); // 15 minutes before
  console.log(`📅 Scheduling order ${order.id} for ${emitTime.toISOString()}`);
  const now = new Date();
  console.log(`⏰ Current time is ${now.toISOString()}`);
  if (emitTime <= now) {
    console.log(`⏱ Pickup time is soon/past — emitting order ${order.id} immediately`);
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
