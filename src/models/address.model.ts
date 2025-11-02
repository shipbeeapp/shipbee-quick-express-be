import { Entity, Column, OneToMany } from "typeorm";
import BaseEntity from "./baseEntity.js";
import { Order } from "./order.model.js";
import { OrderStop } from "./orderStops.model.js";

@Entity("addresses")
export class Address extends BaseEntity {

  @Column({type: "text", nullable: true})
  country: string;

  @Column({type: "text", nullable: true})
  city: string;

  @Column({ nullable: true, type: "text" })
  district: string;

  @Column({ nullable: true, type: "text" })
  street: string;

  @Column({type: "text", nullable: true})
  buildingNumber: string;

  @Column({type: "text", nullable: true})
  floor: number;

  @Column({type: "text", nullable: true})
  apartmentNumber: string;

  @Column({ type: "text", nullable: true })
  zone: string;

  @Column({ nullable: true, type: "text" })
  landmarks: string;

  @Column({ type: "text", nullable: true })
  coordinates: string; // Optional field for storing coordinates as a string (e.g., "lat,long")

  // One-to-Many with Orders where this address is the sender
  @OneToMany(() => Order, (order) => order.fromAddress)
  sentOrders: Order[];

  // One-to-Many with Orders where this address is the receiver
  @OneToMany(() => OrderStop, (stop) => stop.toAddress)
  receivedStops: OrderStop[];
}
