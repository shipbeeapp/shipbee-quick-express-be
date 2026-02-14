import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Relation, OneToOne } from "typeorm";
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
import { PaymentStatus } from "../utils/enums/paymentStatus.enum.js";
import { Shipment } from "./shipment.model.js";
import { OrderCancellationRequest } from "./orderCancellationRequest.model.js";
import { Payer } from "../utils/enums/payer.enum.js";
import { OrderStop } from "./orderStops.model.js";
import { OrderType } from "../utils/enums/orderType.enum.js";

@Entity("orders")
export class Order extends BaseEntity {
  @Column({ type: 'int', nullable: true, unique: true, default: () => "nextval('order_no_seq')", })
  orderNo: number;

  // Order entity
  @ManyToOne(() => User, {nullable: false})
  @JoinColumn({ name: 'createdById' })
  createdBy: Relation<User>;

  @ManyToOne(() => User)
  @JoinColumn({ name: "senderUserId" })
  sender: Relation<User>;
  
  // @ManyToOne(() => User)
  // @JoinColumn({ name: "receiverUserId" })
  // receiver: Relation<User>;

  @ManyToOne(() => ServiceSubcategory, subcategory => subcategory.orders)
  @JoinColumn({ name: "serviceSubcategoryId" })
  serviceSubcategory: ServiceSubcategory;

  @Column({ type: "timestamptz", nullable: true })
  pickUpDate: Date;

  // @Column({type: "enum", enum: itemType, nullable: true})
  // itemType: itemType;

  @ManyToOne(() => Address, address => address.sentOrders)
  @JoinColumn({ name: "fromAddressId" })
  fromAddress: Address;

  // @ManyToOne(() => Address, address => address.receivedOrders)
  // @JoinColumn({ name: "toAddressId" })
  // toAddress: Address;

  // @Column("text", { nullable: true })
  // itemDescription: string;

  @Column({ nullable: true, type: "int" })
  lifters: number;

  @Column({ type: "float", nullable: true })
  distance: number; // distance in km, used for calculating cost

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  totalCost: number;

  @Column({type: "enum", enum: OrderStatus})
  status: OrderStatus; // current status of order

  @Column({type: "enum", enum: PaymentMethod})
  paymentMethod: PaymentMethod; // payment method used for the order

  @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus; // current status of payment

  @OneToMany(() => OrderStatusHistory, history => history.order)
  orderStatusHistory: OrderStatusHistory[];

  @Column({type: "enum", enum: VehicleType, nullable: true})
  vehicleType: VehicleType; // type of vehicle used for the order

  @Column({ type: "text", nullable: true })
  proofOfOrder: string; // URL to the proof photo uploaded by the driver

  @Column({ type: "float", nullable: true })
  driverShare: number; // share of the total cost for the driver, if applicable

  @Column({ type: "text", nullable: true })
  completionOtp: string; // OTP for order completion, if applicable

  @Column({type: "timestamptz", nullable: true})
  startedAt: Date; // timestamp when the order was started by the driver

  @Column({type: "timestamptz", nullable: true})
  completedAt: Date; // timestamp when the order was completed by the driver

  @ManyToOne(() => Driver, driver => driver.orders, { nullable: true })
  @JoinColumn({ name: "driverId" })
  driver: Driver; // driver assigned to the order, if any

  // inside Order class:
  @OneToOne(() => Shipment, shipment => shipment.order)
  @JoinColumn({ name: "shipmentId" }) // this will create a foreign key in "orders"
  shipment: Shipment;

  @Column({ type: "text", nullable: true })
  accessToken: string; // access token for secure order access, if applicable

  @OneToMany(() => OrderCancellationRequest, (cancel) => cancel.order)
  cancellationRequests: OrderCancellationRequest[];

  @Column({ type: "enum", nullable: false, enum: Payer, default: Payer.SENDER })
  payer: Payer; // who will pay for the order: sender or receiver

  @Column({type: "boolean", default: false})
  isViewed: boolean; // whether the order has been viewed by admin

  //viewed at
  @Column({type: "timestamptz", nullable: true})
  viewedAt: Date;

  @Column({ type: "enum", enum: OrderType, default: OrderType.SINGLE_STOP })
  type: OrderType; // SINGLE_STOP or MULTI_STOP

  @Column({ type: "text", nullable: true })
  deletedDriverData: string; // JSON string to store deleted driver info

  @Column({ type: "float", nullable: false })
  serviceFeePercentage: number;
  
  @Column({ type: "text", nullable: true })
  proofOfPickup: string; // URL to the proof of pickup photo uploaded by the driver

  @OneToMany(() => OrderStop, (stop) => stop.order, { cascade: true })
  stops: OrderStop[];
}
