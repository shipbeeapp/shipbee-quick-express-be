import { Entity, Column, OneToOne, JoinColumn, OneToMany } from "typeorm";
import BaseEntity from "./baseEntity.js";
// import { Vehicle } from "./vehicle.model.js";
import { Order } from "./order.model.js";
import DriverSignupStatus from "../utils/enums/driverSignUpStatus.enum.js";
// let Vehicle:  any;

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

    @Column({ type: "enum", enum: DriverSignupStatus, default: DriverSignupStatus.PENDING })
    signUpStatus: DriverSignupStatus;

    @Column({ type: "text", nullable: true })
    profilePicture: string; // URL to the driver's profile picture

    // Document uploads (store file paths or URLs after uploading to S3/local)
    @Column({type: "text", nullable: false})
    qidFront: string;
    
    @Column({type: "text", nullable: false})
    qidBack: string;
    
    @Column({type: "text", nullable: false})
    driverRegistrationFront: string;
    
    @Column({type: "text", nullable: false})
    driverRegistrationBack: string;
    
    @Column({type: "text", nullable: false})
    vehicleRegistrationFront: string;
    
    @Column({type: "text", nullable: false})
    vehicleRegistrationBack: string;

    @OneToOne(() => Vehicle, (vehicle: any) => vehicle.driver)
    @JoinColumn({name: "vehicleId"}) // This will create a foreign key in the drivers table
    vehicle: any;

    @OneToMany(() => Order, order => order.driver)
    orders: Order[];

    @OneToMany(() => OrderStatusHistory, orderStatusHistory => orderStatusHistory.driver)
    orderStatusHistory: OrderStatusHistory[];

    @OneToMany(() => OrderCancellationRequest, (cancel) => cancel.driver)
    cancellationRequests: OrderCancellationRequest[];
}

import { Vehicle } from "./vehicle.model.js";
import { OrderStatusHistory } from "./orderStatusHistory.model.js";
import { DriverStatus } from "../utils/enums/driverStatus.enum.js";import { OrderCancellationRequest } from "./orderCancellationRequest.model.js";

