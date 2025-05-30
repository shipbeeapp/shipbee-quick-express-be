import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    Relation,
  } from "typeorm";
  import { Payment } from "./payment.model.js";
import { PaymentStatus } from "../utils/enums/paymentStatus.enum.js";
import BaseEntity from "./baseEntity.js";
  
  @Entity("payment_status_history")
  export class PaymentStatusHistory extends BaseEntity {

    @ManyToOne(() => Payment, payment => payment.paymentStatusHistory) // Tracks changes for a payment
    @JoinColumn({ name: "paymentId" })
    payment: Relation<Payment>;
  
    @Column({
      type: "enum",
      enum: PaymentStatus,
    })
    status: PaymentStatus;

  }
  