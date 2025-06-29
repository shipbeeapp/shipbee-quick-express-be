import { Entity, Column, OneToMany, Relation } from "typeorm";
import BaseEntity from "./baseEntity.js";
import { Order } from "./order.model.js";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";

@Entity("vehicles")
export class Vehicle extends BaseEntity {
    @Column("enum", {enum: VehicleType, nullable: false})
    type: VehicleType; // e.g., "car", "bike", etc.

    @OneToMany(() => Order, (order) => order.vehicle)
    orders: Relation<Order[]>;
}