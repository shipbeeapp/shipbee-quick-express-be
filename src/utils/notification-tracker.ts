const notifiedDriversPerOrder = new Map<string, Set<string>>();

export function hasDriverBeenNotified(orderId: string, driverId: string): boolean {
console.log(`Checking if driver ${driverId} has been notified for order ${orderId}`);
const notified = notifiedDriversPerOrder.get(orderId)?.has(driverId) ?? false;
return notified;
}

export function markDriverNotified(orderId: string, driverId: string): void {
  if (!notifiedDriversPerOrder.has(orderId)) {
    notifiedDriversPerOrder.set(orderId, new Set());
  }
  notifiedDriversPerOrder.get(orderId)!.add(driverId);
}

// Optional: Cleanup to avoid memory leaks
export function clearNotificationsForOrder(orderId: string): void {
    if (notifiedDriversPerOrder.has(orderId)) {
        notifiedDriversPerOrder.delete(orderId);
        console.log(`🧹 Cleaned up notifications for accepted order ${orderId}`);
    }
}