import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Relation } from "typeorm";
import { User } from "./user.model.js";
import { ServiceSubcategory } from "./serviceSubcategory.model.js";
import { Address } from "./address.model.js";
import { itemType } from "../utils/enums/itemType.enum.js";
import { OrderStatus } from "../utils/enums/orderStatus.enum.js";
import BaseEntity from "./baseEntity.js";
import { OrderStatusHistory } from "./orderStatusHistory.model.js";
import { PaymentMethod } from "../utils/enums/paymentMethod.enum.js";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";
import { Driver } from "./driver.model.js";
@Entity("orders")
export class Order extends BaseEntity {
  @Column({ type: 'int', nullable: true, unique: true, default: () => "nextval('order_no_seq')", })
  orderNo: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "senderUserId" })
  sender: Relation<User>;
  
  @ManyToOne(() => User)
  @JoinColumn({ name: "receiverUserId" })
  receiver: Relation<User>;

  @ManyToOne(() => ServiceSubcategory, subcategory => subcategory.orders)
  @JoinColumn({ name: "serviceSubcategoryId" })
  serviceSubcategory: ServiceSubcategory;

  @Column({ type: "timestamptz" })
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

  @Column("float")
  distance: number; // distance in km, used for calculating cost

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  totalCost: number;

  @Column({type: "enum", enum: OrderStatus})
  status: OrderStatus; // current status of order

  @Column({type: "enum", enum: PaymentMethod})
  paymentMethod: PaymentMethod; // payment method used for the order

  @OneToMany(() => OrderStatusHistory, history => history.order)
  orderStatusHistory: OrderStatusHistory[];

  @Column({type: "enum", enum: VehicleType, nullable: true})
  vehicleType: VehicleType; // type of vehicle used for the order

  @ManyToOne(() => Driver, driver => driver.orders, { nullable: true })
  @JoinColumn({ name: "driverId" })
  driver: Driver; // driver assigned to the order, if any
}
