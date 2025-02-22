import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Relation } from "typeorm";
import { User } from "./user.model.js";
import { ServiceSubcategory } from "./serviceSubcategory.model.js";
import { Address } from "./address.model.js";
import { itemType } from "../utils/enums/itemType.enum.js";
import { OrderStatus } from "../utils/enums/orderStatus.enum.js";
import BaseEntity from "./baseEntity.js";
import { OrderStatusHistory } from "./orderStatusHistory.model.js";

@Entity("orders")
export class Order extends BaseEntity {

  @ManyToOne(() => User , user => user.orders)
  @JoinColumn({ name: "userId" })
  user: Relation<User>;

  @ManyToOne(() => ServiceSubcategory, subcategory => subcategory.orders)
  @JoinColumn({ name: "serviceSubcategoryId" })
  serviceSubcategory: ServiceSubcategory;

  @Column("timestamp")
  pickUpDate: Date;

  @Column({type: "enum", enum: itemType, nullable: true})
  itemType: itemType;

  @ManyToOne(() => Address, address => address.sentOrders)
  @JoinColumn({ name: "fromAddressId" })
  fromAddress: Address;

  @ManyToOne(() => Address, address => address.receivedOrders)
  @JoinColumn({ name: "toAddressId" })
  toAddress: Address;

  @Column("text", { nullable: true })
  itemDescription: string;

  @Column({ nullable: true, type: "int" })
  lifters: number;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  totalCost: number;

  @Column({type: "enum", enum: OrderStatus})
  status: OrderStatus; // current status of order

  @OneToMany(() => OrderStatusHistory, history => history.order)
  orderStatusHistory: OrderStatusHistory[];
}
