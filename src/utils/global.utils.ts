import crypto from "crypto";
import { env } from "../config/environment.js"
import { Order } from "../models/order.model.js";

// Generate a secure random token
export function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

export function generatePhotoLink(filename: string): string {
  if (!filename) {
    return null;
  }
  const baseUrl = env.CLOUDINARY_BASE_URL;
  return `${baseUrl}${filename}`;
}

export function getStatusTimestamp(
  order: Order,
  status: string
): Date | null {
  if (status === "Pickup Date") {
    return order.pickUpDate ?? null;
  }

  const records = order.orderStatusHistory
    ?.filter(h => h.status === status)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  if (!records || records.length === 0) return null;

  // latest occurrence
  return records[0].createdAt;
}

export function getDurationInMinutes(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60);
}

export function setIslatestOrderStatus(orders: Order[], isLate: boolean): Order[] {
  const filteredOrders = orders.filter(order => {
    const maxDuration = order.createdBy?.maxOrderDuration;

    // If we cannot compute lateness, treat as NOT late
    if (!maxDuration || !order.pickUpDate || !order.completedAt) {
      // console.log("Cannot determine lateness for order ID:", order.id);
      return isLate === false;
    }

    const diffMinutes =
      (order.completedAt.getTime() - order.pickUpDate.getTime()) / (1000 * 60);
    const late = diffMinutes >= maxDuration;


    return late === isLate;
  });
  return filteredOrders
}

export function intraStatusDuration(orders: Order[], fromStatus: string, toStatus: string, thresholdMinutes: number): Order[] {
  if (fromStatus && toStatus && thresholdMinutes !== undefined) {
    const filteredOrders = orders.filter(order => {
      const fromTime = getStatusTimestamp(order, fromStatus);
      const toTime = getStatusTimestamp(order, toStatus);

      if (!fromTime || !toTime) return false;

      if (toTime < fromTime) return false;

      const duration = getDurationInMinutes(fromTime, toTime);
      console.log(`Order ID: ${order.id}, Duration from ${fromStatus} to ${toStatus}: ${duration} minutes`);
      return duration >= thresholdMinutes;
    });
    return filteredOrders;
  }
  return [];
}