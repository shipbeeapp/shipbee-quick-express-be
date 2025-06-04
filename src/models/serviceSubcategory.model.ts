import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Unique, BaseEntity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ServiceCategory } from "./serviceCategory.model.js";
import { ServiceSubcategoryName } from "../utils/enums/serviceSubcategory.enum.js";
// import BaseEntity from "./baseEntity.js";
import { Order } from "./order.model.js";
import { furnitureRequests } from "../utils/enums/furnitureRequests.enum.js";

@Entity("service_subcategories")
@Unique(["name", "type"])
export class ServiceSubcategory extends BaseEntity {
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

  @Column({type: "enum", enum: ServiceSubcategoryName})
  name: ServiceSubcategoryName;

  @Column({type: "enum", enum: furnitureRequests, nullable: true})
  type: furnitureRequests;

  @ManyToOne(() => ServiceCategory)
  @JoinColumn({ name: "serviceCategoryId" })
  serviceCategory: ServiceCategory;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  baseCost: number;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  perLifterCost: number;

  @OneToMany(() => Order, order => order.serviceSubcategory)
  orders: Order[];
}
