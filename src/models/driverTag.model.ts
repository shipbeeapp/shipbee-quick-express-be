import { Column, Entity, OneToOne, JoinColumn, ManyToOne } from "typeorm";
import BaseEntity from "./baseEntity.js";
import { Tag } from "./tag.model.js";

@Entity("driver_tags")
export class DriverTag extends BaseEntity {
    @ManyToOne(() => Driver, driver => driver.id, { nullable: false })
    @JoinColumn({ name: "driverId" })
    driver: any;
    
    @ManyToOne(() => Tag, tag => tag.id, { nullable: false })
    @JoinColumn({ name: "tagId" })
    tag: Tag;
}
import { Driver } from "./driver.model.js";