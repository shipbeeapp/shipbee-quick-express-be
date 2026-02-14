import { Entity, ManyToOne, JoinColumn, Column, Relation, OneToMany } from "typeorm";
import { Order } from "./order.model.js";
import { User } from "./user.model.js";
import { Address } from "./address.model.js";
import { itemType } from "../utils/enums/itemType.enum.js";
import { OrderStatus } from "../utils/enums/orderStatus.enum.js";
import BaseEntity from "./baseEntity.js";
import { PaymentMethod } from "../utils/enums/paymentMethod.enum.js";
import { OrderStatusHistory } from "./orderStatusHistory.model.js";

@Entity("order_stops")
export class OrderStop extends BaseEntity {

  @ManyToOne(() => Order, (order) => order.stops, { onDelete: "CASCADE" })
  @JoinColumn({ name: "orderId" })
  order: Relation<Order>;

  @ManyToOne(() => User)
  @JoinColumn({ name: "receiverUserId" })
  receiver: Relation<User>;

  @ManyToOne(() => Address)
  @JoinColumn({ name: "toAddressId" })
  toAddress: Relation<Address>;

  @Column({ type: "int", nullable: false })
  sequence: number;

  @Column({ type: "text", nullable: true })
  itemDescription: string;

  @Column({ type: "enum", enum: itemType, nullable: true })
  itemType: itemType;

  @Column({type: "float", nullable: true})
  distance: number;

  @Column({ type: "enum", enum: OrderStatus, nullable: true, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({type: "text", nullable: true})
  proofOfOrder: string;

  @Column({ type: "int", nullable: true })
  lifters: number;

  @Column({ type: "jsonb", nullable: true })
  items: any;

  @Column({ type: "text", nullable: true })
  clientStopId: string;

  @Column({ type: "float", nullable: true })
  totalPrice: number;

  @Column({ type: "enum", enum: PaymentMethod, nullable: true, default: PaymentMethod.CASH_ON_DELIVERY })
  paymentMethod: PaymentMethod;

  @Column({ type: "text", nullable: true })
  comments: string;

  @Column({ type: "float", nullable: true })
  deliveryFee: number;

  @Column({ type: "timestamptz", nullable: true })
  deliveredAt: Date;

  @Column({ type: "boolean", default: false })
  isReturned: boolean;

  @Column({ type: "text", nullable: true })
  proofOfReturn: string; // URL to the proof of return photo uploaded by the driver

  @OneToMany(() => OrderStatusHistory, orderStatusHistory => orderStatusHistory.orderStop)
  orderStatusHistory: OrderStatusHistory[];
}
