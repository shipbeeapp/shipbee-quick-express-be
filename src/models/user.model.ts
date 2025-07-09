import { Entity, Column, OneToMany } from "typeorm";
import BaseEntity  from  "./baseEntity.js";
import { Order } from "./order.model.js";
import { UserPromoCode } from "./userPromoCode.model.js";

@Entity("users")
export class User extends BaseEntity {

  
  @Column({type: "text", nullable: true})
  name: string;

  @Column({ nullable: true, unique: true, type: "text" })
  phoneNumber: string;

  @Column({ unique: true, type: "text", nullable: true })
  email: string;

  @Column({ type: "text", nullable: true })
  otp: string;
  // 👇 New: orders where the user is the sender
  @OneToMany(() => Order, (order) => order.sender)
  sentOrders: Order[];

  // 👇 New: orders where the user is the receiver
  @OneToMany(() => Order, (order) => order.receiver)
  receivedOrders: Order[];

  @OneToMany(() => UserPromoCode, (userPromoCode) => userPromoCode.user)
  promoCodeUsages: UserPromoCode[];
}