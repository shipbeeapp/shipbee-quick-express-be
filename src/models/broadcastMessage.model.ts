import { Entity, Column, OneToMany } from "typeorm";
import BaseEntity from "./baseEntity.js";
import { DriverBroadcastMessage } from "./driverBroadcastMessage.model.js";

@Entity("broadcast_messages")
export class BroadcastMessage extends BaseEntity {
    @Column({ type: "text", nullable: false })
    message: string;

    @Column({ type: "text", nullable: true })
    title: string;

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @OneToMany(() => DriverBroadcastMessage, (driverBroadcastMessage) => driverBroadcastMessage.broadcastMessage)
    driverMessages: DriverBroadcastMessage[];
}