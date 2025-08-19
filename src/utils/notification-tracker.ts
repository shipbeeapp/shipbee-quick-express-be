const notifiedDriversPerOrder = new Map<
  string,
  { notified: Set<string>; canceled: Set<string> }
>();

export function hasDriverBeenNotified(orderId: string, driverId: string): boolean {
  return notifiedDriversPerOrder.get(orderId)?.notified.has(driverId) ?? false;
}

export function markDriverNotified(orderId: string, driverId: string): void {
  if (!notifiedDriversPerOrder.has(orderId)) {
    notifiedDriversPerOrder.set(orderId, { notified: new Set(), canceled: new Set() });
  }
  notifiedDriversPerOrder.get(orderId)!.notified.add(driverId);
}

export function markDriverCanceled(orderId: string, driverId: string): void {
  if (!notifiedDriversPerOrder.has(orderId)) {
    notifiedDriversPerOrder.set(orderId, { notified: new Set(), canceled: new Set() });
  }
  notifiedDriversPerOrder.get(orderId)!.canceled.add(driverId);
}

export function hasDriverCanceled(orderId: string, driverId: string): boolean {
  return notifiedDriversPerOrder.get(orderId)?.canceled.has(driverId) ?? false;
}

// Reset notifications so we can re-notify drivers (but keep canceled drivers excluded)
export function resetNotifiedDrivers(orderId: string): void {
  const entry = notifiedDriversPerOrder.get(orderId);
  if (entry) {
    entry.notified.clear();
  }
}

// Optional: Cleanup to avoid memory leaks
export function clearNotificationsForOrder(orderId: string): void {
    if (notifiedDriversPerOrder.has(orderId)) {
        notifiedDriversPerOrder.delete(orderId);
        console.log(`🧹 Cleaned up notifications for accepted order ${orderId}`);
    }
}