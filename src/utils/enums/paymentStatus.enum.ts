export enum PaymentStatus {
    PENDING = "pending",
    SUCCESSFUL = "successful",
    FAILED = "failed",
    REFUNDED = "refunded",
    CANCELED = "canceled",
  }
  
// Payment Status Workflow
// 1️⃣ pending → The payment has not been made yet (e.g., user reached payment page but hasn't paid).
// 2️⃣ successful → The payment was completed successfully. (Whether debit/credit/wallet succeeded or customer paid upon delivery)
// 3️⃣ failed → The payment attempt failed (e.g., card declined, insufficient funds).
// 4️⃣ refunded → The payment was refunded to the user.
// 5️⃣ canceled → The payment was canceled before processing.
