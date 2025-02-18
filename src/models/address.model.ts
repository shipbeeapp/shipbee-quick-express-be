import { Entity, Column, OneToMany } from "typeorm";
import BaseEntity from "./baseEntity.js";
import { Order } from "./order.model.js";

@Entity("addresses")
export class Address extends BaseEntity {

  @Column({type: "text"})
  country: string;

  @Column({type: "text"})
  city: string;

  @Column({ nullable: true, type: "text" })
  district: string;

  @Column({ nullable: true, type: "text" })
  street: string;

  @Column({type: "text"})
  buildingNumber: string;

  @Column({type: "text"})
  floor: number;

  @Column({type: "text"})
  apartmentNumber: string;

  @Column({ type: "text" })
  zone: string;

  @Column({ nullable: true, type: "text" })
  landmarks: string;

  // One-to-Many with Orders where this address is the sender
  @OneToMany(() => Order, (order) => order.fromAddress)
  sentOrders: Order[];

  // One-to-Many with Orders where this address is the receiver
  @OneToMany(() => Order, (order) => order.toAddress)
  receivedOrders: Order[];
}
