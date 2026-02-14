import { Entity, Column, ManyToOne, Or, JoinColumn, Relation } from "typeorm";
import { Order } from "./order.model.js";
import BaseEntity from "./baseEntity.js";
import { OrderStatus } from "../utils/enums/orderStatus.enum.js";
import { Driver } from "./driver.model.js";
import { OrderStop } from "./orderStops.model.js";
import { OrderEventType } from "../utils/enums/orderEventType.enum.js";

@Entity("order_status_history")
export class OrderStatusHistory extends BaseEntity {

  @ManyToOne(() => Order, order => order.orderStatusHistory)
  @JoinColumn({ name: "orderId" })
  order: Relation<Order>;

  @Column({ type: "enum", enum: OrderStatus})
  status: OrderStatus;

  @ManyToOne(() => Driver, driver => driver.orderStatusHistory, { nullable: true })
  @JoinColumn({ name: "driverId" })
  driver: Relation<Driver>;

  @ManyToOne(() => OrderStop, orderStop => orderStop.orderStatusHistory, { nullable: true })
  @JoinColumn({ name: "orderStopId" })
  orderStop: Relation<OrderStop>;

  @Column({ type: "boolean", default: false })
  triggeredByAdmin: boolean;

  @Column({ type: "boolean", default: false })
  hasArrived: boolean;

  @Column({ type: 'timestamp', nullable: true })
  returnedStartedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnedCompletedAt: Date;

  @Column({ type: "enum", enum: OrderEventType })
  event: OrderEventType;

  @Column({type: "text", nullable: true})
  cancellationReason?: string;
}
