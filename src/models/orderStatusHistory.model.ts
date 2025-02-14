import { Entity, Column, ManyToOne, Or, JoinColumn, Relation } from "typeorm";
import { Order } from "./order.model.js";
import BaseEntity from "./baseEntity.js";
import { OrderStatus } from "../utils/enums/orderStatus.enum.js";

@Entity("order_status_history")
export class OrderStatusHistory extends BaseEntity {

  @ManyToOne(() => Order, order => order.orderStatusHistory)
  @JoinColumn({ name: "orderId" })
  order: Relation<Order>;

  @Column({ type: "enum", enum: OrderStatus})
  status: OrderStatus;
}
