import { Entity, Column, OneToMany, Relation, OneToOne, JoinColumn } from "typeorm";
import BaseEntity from "./baseEntity.js";
import { Order } from "./order.model.js";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";
// import { Driver } from "./driver.model.js";
// let Driver: any

@Entity("vehicles")
export class Vehicle extends BaseEntity {
    @Column("enum", {enum: VehicleType, nullable: false})
    type: VehicleType; // e.g., "car", "bike", etc.

    @Column({ type: "text", nullable: true })
    number: string; // Vehicle number or license plate

    @Column({ type: "text", nullable: true })
    model: string; // Vehicle model
    
    @OneToOne(() => Driver, (driver: any) => driver.vehicle)
    driver: any; // Relation to the driver who owns this vehicle
}

import { Driver } from "./driver.model.js";