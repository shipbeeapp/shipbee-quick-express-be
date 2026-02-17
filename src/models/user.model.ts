import { Entity, Column, OneToMany } from "typeorm";
import BaseEntity  from  "./baseEntity.js";
import { Order } from "./order.model.js";
import { UserPromoCode } from "./userPromoCode.model.js";
import { userType } from "../utils/enums/userType.enum.js";
import { OrderStop } from "./orderStops.model.js";

@Entity("users")
export class User extends BaseEntity {

  
  @Column({type: "text", nullable: true})
  name: string;

  @Column({ nullable: true, unique: true, type: "text" })
  phoneNumber: string;

  @Column({ type: "text", nullable: true })
  password: string;

  @Column({ type: "text", nullable: true })
  industry: string;

  @Column({ type: "text", nullable: true })
  numOfDrivers: string;

  @Column({ type: "text", nullable: true })
  numOfVehicles: string;

  @Column({ unique: true, type: "text", nullable: true })
  email: string;

  @Column({ type: "enum", enum: userType, nullable: true })
  type: userType;

  @Column({ type: "text", nullable: true })
  companyName: string;

  @Column({ type: "text", nullable: true })
  otp: string;

  @Column({type: "boolean", default: true})
  isNewUser: boolean;

  @Column({ type: "text", nullable: true, unique: true })
  apiKey?: string;

  @Column({ type: "boolean", nullable: true, default: true })
  isSandboxUser: boolean;

  @Column({ type: "text", nullable: true })
  resetPasswordToken: string;

  @Column({ type: "timestamp", nullable: true })
  resetPasswordExpires: Date;

  @Column({ type: "boolean", nullable: true })
  hasLoggedInQuick: boolean;

  @Column({ type: "boolean", nullable: true })
  hasLoggedInExpress: boolean;

  @Column({type: "float", nullable: true})
  maxOrderDuration: number;

  @Column({ type: "boolean", nullable: true, default: false })
  proceedWithoutPayment: boolean;

  @Column({ type: "boolean", nullable: true, default: false })
  monthlyBillingEnabled: boolean;

  // 👇 New: orders where the user is the sender
  @OneToMany(() => Order, (order) => order.sender)
  sentOrders: Order[];

 // Orders where the user is a receiver in a stop
  @OneToMany(() => OrderStop, (stop) => stop.receiver)
  receivedStops: OrderStop[];

  @OneToMany(() => UserPromoCode, (userPromoCode) => userPromoCode.user)
  promoCodeUsages: UserPromoCode[];
}