import { Entity, Column, OneToMany, BaseEntity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
// import BaseEntity from "./baseEntity.js";
import { Order } from "./order.model.js";

@Entity("addresses")
export class Address extends BaseEntity {

   @PrimaryGeneratedColumn("uuid")
    public id: string;
  
    @CreateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
      })
    public createdAt: Date;
    
      @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
      })
    public updatedAt: Date;
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

  @Column({ type: "text", nullable: true })
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
