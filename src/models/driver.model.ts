import { Entity, Column, OneToOne, JoinColumn, OneToMany } from "typeorm";
import BaseEntity from "./baseEntity.js";
// import { Vehicle } from "./vehicle.model.js";
import { Order } from "./order.model.js";
// let Vehicle: any;

@Entity("drivers")
export class Driver extends BaseEntity {
    @Column({ type: "text", nullable: true })
    name: string;

    @Column({ unique: true, type: "text", nullable: true })
    phoneNumber: string;

    //password
    @Column({ type: "text", nullable: true })
    password: string;

    @Column({type: "text", nullable: true})
    otp: string;

    @Column({ type: "enum", enum: DriverStatus, default: DriverStatus.OFFLINE })
    status: DriverStatus;

    @Column({ type: "text", nullable: true })
    profilePicture: string; // URL to the driver's profile picture

    @OneToOne(() => Vehicle, (vehicle: any) => vehicle.driver)
    @JoinColumn({name: "vehicleId"}) // This will create a foreign key in the drivers table
    vehicle: any;

    @OneToMany(() => Order, order => order.driver)
    orders: Order[];
}

import { Vehicle } from "./vehicle.model.js";
import { DriverStatus } from "../utils/enums/driverStatus.enum.js";
