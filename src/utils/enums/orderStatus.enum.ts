export enum OrderStatus {
    PENDING_PAYMENT = "pending_payment",
    CONFIRMED = "confirmed",
    PREPARING = "preparing",
    EN_ROUTE = "en_route",
    DELIVERED = "delivered",
    CANCELED = "canceled",
    FAILED = "failed",
  }
// Order Status Workflow
// 1️⃣ pending_payment → The user has filled in order details but hasn't completed the payment (still on payment page)
// 2️⃣ confirmed → The payment is successful (or COD selected). The order is now being processed.
// 3️⃣ preparing → The service provider (driver, vehicle, etc.) is preparing for pickup.
// 4️⃣ en_route → The service provider is on the way to the destination.
// 5️⃣ delivered → The service is completed (e.g., package delivered, moving service completed).
// 6️⃣ canceled → The order was canceled (by user or system).
// 7️⃣ failed → The service couldn't be completed for some reason (e.g., no driver available).  