import { Entity, Column, OneToOne, JoinColumn, OneToMany, ManyToOne } from "typeorm";
import BaseEntity from "./baseEntity.js";
// import { Vehicle } from "./vehicle.model.js";
import { Order } from "./order.model.js";
import DriverSignupStatus from "../utils/enums/signupStatus.enum.js";
import { DriverType } from "../utils/enums/driverType.enum.js";
import { ApprovalStatus } from "../utils/enums/approvalStatus.enum.js";
import { DriverBroadcastMessage } from "./driverBroadcastMessage.model.js";

@Entity("drivers")
export class Driver extends BaseEntity {
    @Column({ type: "text", nullable: true })
    name: string;

    @Column({type: "text", nullable: true})
    surname: string;

    @Column({ unique: true, type: "text", nullable: true })
    phoneNumber: string;

    //date of birth
    @Column({type: "date", nullable: true})
    dateOfBirth: Date;

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
    @Column({type: "text", nullable: true})
    qid: string; // Qatar ID number
    
    @Column({type: "text", nullable: true})
    qidFront: string;
    
    @Column({type: "text", nullable: true})
    qidBack: string;
    
    @Column({type: "text", nullable: true})
    licenseFront: string;
    
    @Column({type: "text", nullable: true})
    licenseBack: string;

    @Column({type: "date", nullable: true})
    licenseExpirationDate: Date;

    @OneToOne(() => Vehicle, (vehicle: any) => vehicle.driver)
    @JoinColumn({name: "vehicleId"}) // This will create a foreign key in the drivers table
    vehicle: any;

    @OneToMany(() => Order, order => order.driver)
    orders: Order[];

    @OneToMany(() => OrderStatusHistory, orderStatusHistory => orderStatusHistory.driver)
    orderStatusHistory: OrderStatusHistory[];

    @OneToMany(() => OrderCancellationRequest, (cancel) => cancel.driver)
    cancellationRequests: OrderCancellationRequest[];

    @Column({ type: "enum", enum: DriverType, default: DriverType.INDIVIDUAL })
    type: DriverType; // 'INDIVIDUAL' or 'BUSINESS'

    @Column({ type: "text", nullable: true })
    email: string;

    @Column( { type: "text", nullable: true })
    businessType: string; // only for BUSINESS

    @Column({ type: "text", nullable: true })
    businessName: string; // only for BUSINESS

    @Column({ type: "text", nullable: true })
    businessLocation: string; // address or coordinates

    @Column({ type: "text", nullable: true })
    businessPhoneNumber: string; // contact number

    @Column({ type: "text", nullable: true })
    companyRepresentativeName: string; // CR name

    @Column( {type: "text", nullable: true })
    companyLogo: string; // URL

    @Column({ type: "text", nullable: true })
    crPhoto: string; // URL

    @Column({ type: "text", nullable: true })
    taxId: string; // URL

    /**
     * Self-referencing relation
     * If this driver belongs to a business, this points to the business owner
     */
    @ManyToOne(() => Driver, (driver) => driver.invitedDrivers, { nullable: true })
    @JoinColumn({ name: "businessOwnerId" })
    businessOwner: Driver;

    @OneToMany(() => Driver, (driver) => driver.businessOwner)
    invitedDrivers: Driver[];


    @Column({ type: "enum", enum: ApprovalStatus, default: ApprovalStatus.PENDING })
    qidApprovalStatus: ApprovalStatus;
    
    @Column({ type: "text", nullable: true })
    qidRejectionReason: string;
    
    @Column({ type: "enum", enum: ApprovalStatus, default: ApprovalStatus.PENDING })
    licenseApprovalStatus: ApprovalStatus;
    
    @Column({ type: "text", nullable: true })
    licenseRejectionReason: string;

    @Column({ type: "enum", enum: ApprovalStatus, default: ApprovalStatus.PENDING })
    businessDocsApprovalStatus: ApprovalStatus;
    
    @Column({ type: "text", nullable: true })
    businessDocsRejectionReason: string;

    @Column({ type: "text", nullable: true })
    fcmToken: string;

    @Column({ type: "enum", enum: ApprovalStatus, default: ApprovalStatus.PENDING })
    vehicleInfoApprovalStatus: ApprovalStatus;

    @Column({ type: "text", nullable: true })
    vehicleInfoRejectionReason: string;
    
    @OneToMany(() => DriverBroadcastMessage, (driverBroadcastMessage) => driverBroadcastMessage.driver)
    broadcastMessages: DriverBroadcastMessage[];

    @Column({type: "boolean", default: false})
    hasCardOnDelivery: boolean

    @Column({type: "bigint", default: 0})
    income: number

    @Column({type: "bigint", default: 0})
    cashIncome: number

    @Column({type: "bigint", default: 0})
    onlineIncome: number
    
    @Column({type: "bigint", default: 0})
    cashBalance: number
}

import { Vehicle } from "./vehicle.model.js";
import { OrderStatusHistory } from "./orderStatusHistory.model.js";
import { DriverStatus } from "../utils/enums/driverStatus.enum.js";import { OrderCancellationRequest } from "./orderCancellationRequest.model.js";

