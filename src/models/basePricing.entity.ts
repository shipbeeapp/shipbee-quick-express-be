import BaseEntity from "./baseEntity.js";
import { Column } from "typeorm";
import { ServiceSubcategoryName } from "../utils/enums/serviceSubcategory.enum.js";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";

export abstract class BasePricing extends BaseEntity {
    @Column({ type: "enum", enum: ServiceSubcategoryName })
    serviceSubcategory: ServiceSubcategoryName;

    @Column({ type: "enum" , enum: VehicleType, nullable: true })
    vehicleType: VehicleType;

    // Distance-based
    @Column("decimal", { nullable: true })
    minDistance: number;

    @Column("decimal", { nullable: true })
    maxDistance: number;

    @Column("decimal", { nullable: true })
    baseCost: number;

    @Column("decimal", { nullable: true })
    thresholdDistance: number;

    @Column("decimal", { nullable: true })
    additionalPerKm: number;

    // Weight-based
    @Column({type: "text", nullable: true })
    fromCountry: string;

    @Column({type: "text", nullable: true })
    toCountry: string;

    @Column("decimal", { nullable: true })
    maxWeight: number;

    @Column("decimal", { nullable: true })
    firstKgCost: number;

    @Column("decimal", { nullable: true })
    additionalKgCost: number;

    @Column({type: "text", nullable: true })
    transitTime: string;

    @Column("boolean", { default: true })
    isCurrent: boolean; // To mark if this pricing is current or outdated
}