import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import BaseEntity from "./baseEntity.js";
import { BroadcastMessage } from "./broadcastMessage.model.js";

@Entity("driver_broadcast_messages")
export class DriverBroadcastMessage extends BaseEntity {
    @ManyToOne(() => Driver, (driver) => driver.broadcastMessages, { nullable: false })
    @JoinColumn({ name: "driverId" })
    driver: any;
    
    @ManyToOne(() => BroadcastMessage, (broadcastMessage) => broadcastMessage.driverMessages, { nullable: false })
    @JoinColumn({ name: "broadcastMessageId" })
    broadcastMessage: BroadcastMessage;
    
    @Column({ type: "boolean", default: false })
    isRead: boolean;
}
import { Driver } from "./driver.model.js";