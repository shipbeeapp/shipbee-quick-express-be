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
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (!records || records.length === 0) return null;

  // latest occurrence
  return records[0].createdAt;
}

export function getDurationInMinutes(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60);
}

