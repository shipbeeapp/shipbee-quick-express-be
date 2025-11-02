import { Entity, ManyToOne, JoinColumn, Column, Relation } from "typeorm";
import { Order } from "./order.model.js";
import { User } from "./user.model.js";
import { Address } from "./address.model.js";
import { itemType } from "../utils/enums/itemType.enum.js";
import { OrderStatus } from "../utils/enums/orderStatus.enum.js";
import BaseEntity from "./baseEntity.js";

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

  @Column({ type: "timestamptz", nullable: true })
  deliveredAt: Date;
}
