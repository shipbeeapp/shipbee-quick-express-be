import { Entity, Column, JoinColumn, OneToOne, OneToMany} from "typeorm";
import BaseEntity from "./baseEntity.js";
import { Order } from "./order.model.js";
import { PaymentMethod } from "../utils/enums/paymentMethod.enum.js";
import { PaymentStatus } from "../utils/enums/paymentStatus.enum.js";
import { PaymentStatusHistory } from "./paymentStatusHistory.model.js";
import { PromoCode } from "./promoCode.model.js";

@Entity("payments")
export class Payment extends BaseEntity {

  @OneToOne(() => Order)
  @JoinColumn({ name: "orderId" })
  order: Order;

  @Column({type: "enum", enum: PaymentMethod})
  paymentMethod: PaymentMethod; // 'cash_on_delivery', 'credit_debit', 'wallet'

  @OneToOne(() => PromoCode, { nullable: true }) // Nullable promo code
  @JoinColumn({name: "promoCodeId"})
  promoCode: PromoCode;

  @Column("decimal", { precision: 10, scale: 2 })
  totalAmount: number;

  @Column("decimal", { precision: 10, scale: 2 })
  discountAmount: number;

  @Column("decimal", { precision: 10, scale: 2 })
  finalAmount: number;

  @Column({type: "enum", enum: PaymentStatus})
  paymentStatus: PaymentStatus; //current status of payment

  @OneToMany(() => PaymentStatusHistory, history => history.payment)
  paymentStatusHistory: PaymentStatusHistory[];
}
