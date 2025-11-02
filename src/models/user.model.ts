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
  // 👇 New: orders where the user is the sender
  @OneToMany(() => Order, (order) => order.sender)
  sentOrders: Order[];

 // Orders where the user is a receiver in a stop
  @OneToMany(() => OrderStop, (stop) => stop.receiver)
  receivedStops: OrderStop[];

  @OneToMany(() => UserPromoCode, (userPromoCode) => userPromoCode.user)
  promoCodeUsages: UserPromoCode[];
}