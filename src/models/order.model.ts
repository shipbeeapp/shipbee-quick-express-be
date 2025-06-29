import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Relation } from "typeorm";
import { User } from "./user.model.js";
import { ServiceSubcategory } from "./serviceSubcategory.model.js";
import { Address } from "./address.model.js";
import { itemType } from "../utils/enums/itemType.enum.js";
import { OrderStatus } from "../utils/enums/orderStatus.enum.js";
import BaseEntity from "./baseEntity.js";
import { OrderStatusHistory } from "./orderStatusHistory.model.js";
import { PaymentMethod } from "../utils/enums/paymentMethod.enum.js";
import { Vehicle } from "./vehicle.model.js";

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

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.orders)
  @JoinColumn({ name: "vehicleId" })
  vehicle: Relation<Vehicle>;
}
