import { Entity, Column, OneToMany, BaseEntity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
// import BaseEntity  from  "./baseEntity.js";
import { Order } from "./order.model.js";
import { UserPromoCode } from "./userPromoCode.model.js";

@Entity("users")
export class User extends BaseEntity {

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
  name: string;

  @Column({ nullable: true, unique: true, type: "text" })
  phoneNumber: string;

  @Column({ unique: true, type: "text" })
  email: string;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => UserPromoCode, (userPromoCode) => userPromoCode.user)
  promoCodeUsages: UserPromoCode[];
}