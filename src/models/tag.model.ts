import { Column, Entity, OneToOne, JoinColumn } from "typeorm";
import BaseEntity from "./baseEntity.js";

@Entity("tags")
export class Tag extends BaseEntity {
    @Column({ type: "varchar", length: 255, unique: true })
    name: string;
}