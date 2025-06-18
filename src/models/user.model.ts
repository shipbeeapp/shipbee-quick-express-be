import { Entity, Column, OneToMany } from "typeorm";
import BaseEntity  from  "./baseEntity.js";
import { Order } from "./order.model.js";
import { UserPromoCode } from "./userPromoCode.model.js";

@Entity("users")
export class User extends BaseEntity {

  @Column({type: "text"})
  name: string;

  @Column({ nullable: true, unique: true, type: "text" })
  phoneNumber: string;

  @Column({ unique: true, type: "text", nullable: true })
  email: string;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => UserPromoCode, (userPromoCode) => userPromoCode.user)
  promoCodeUsages: UserPromoCode[];
}