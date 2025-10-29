import { Entity, Column, OneToMany, Relation, OneToOne, JoinColumn, Check } from "typeorm";
import BaseEntity from "./baseEntity.js";
import { Order } from "./order.model.js";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";
import { ApprovalStatus } from "../utils/enums/approvalStatus.enum.js";
// import { Driver } from "./driver.model.js";
// let Driver: any

@Entity("vehicles")
@Check(`"productionYear" >= 1900 AND "productionYear" <= EXTRACT(YEAR FROM CURRENT_DATE) + 1`)
@Check(`"number" ~ '^[0-9]{0,6}$'`) // ✅ all digits, max 6, or empty
export class Vehicle extends BaseEntity {
    @Column("enum", {enum: VehicleType, nullable: false})
    type: VehicleType; // e.g., "car", "bike", etc.

    @Column({ type: "text"})
    number: string; // Vehicle number or license plate

    @Column({ type: "text", nullable: true })
    model: string; // Vehicle model

    @Column({type: "text", nullable: true})
    color: string

    @Column({type: "int", nullable: true})
    productionYear: number;

    @Column({type: "text", nullable: true})
    registrationFront: string;
    
    @Column({type: "text", nullable: true})
    registrationBack: string;

    @Column({ type: "text", nullable: true })
    frontPhoto: string; // URL to the vehicle's front photo

    @Column({ type: "text", nullable: true })
    backPhoto: string; // URL to the vehicle's back photo

    @Column({ type: "text", nullable: true })
    leftPhoto: string; // URL to the vehicle's left side photo

    @Column({ type: "text", nullable: true })
    rightPhoto: string; // URL to the vehicle's right side photo
    
    @OneToOne(() => Driver, (driver: any) => driver.vehicle)
    driver: any; // Relation to the driver who owns this vehicle

    @Column({ type: "enum", enum: ApprovalStatus, default: ApprovalStatus.PENDING })
    infoApprovalStatus: ApprovalStatus;

    @Column({ type: "text", nullable: true })
    infoRejectionReason: string;
}

import { Driver } from "./driver.model.js";