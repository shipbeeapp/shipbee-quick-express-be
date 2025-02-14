import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { ServiceCategory } from "./serviceCategory.model.js";
import { ServiceSubcategoryName } from "../utils/enums/serviceSubcategory.enum.js";
import BaseEntity from "./baseEntity.js";
import { Order } from "./order.model.js";

@Entity("service_subcategories")
export class ServiceSubcategory extends BaseEntity {

  @Column({type: "enum", enum: ServiceSubcategoryName, unique: true})
  name: ServiceSubcategoryName;

  @ManyToOne(() => ServiceCategory)
  @JoinColumn({ name: "serviceCategoryId" })
  serviceCategory: ServiceCategory;

  @Column("decimal", { precision: 10, scale: 2 })
  baseCost: number;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  perLifterCost: number;

  @OneToMany(() => Order, order => order.serviceSubcategory)
  orders: Order[];
}
