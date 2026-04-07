import { Column, Entity, OneToOne, JoinColumn } from "typeorm";
import BaseEntity from "./baseEntity.js";

@Entity("shipments")
export class Shipment extends BaseEntity {
    // Define shipment properties and relationships here
    @Column({type: "numeric", precision: 10, scale: 2, nullable: true})
    weight: number;

    @OneToOne(() => Order, order => order.shipment)
    order: any;

    // number of items
    @Column({type: "int", nullable: true})
    itemCount: number;

    // items total value in USD
    @Column({type: "numeric", precision: 10, scale: 2, nullable: true})
    totalValue: number;

    //length in cm
    @Column({type: "numeric", precision: 10, scale: 2, nullable: true})
    length: number;

    //width in cm
    @Column({type: "numeric", precision: 10, scale: 2, nullable: true})
    width: number;

    //height in cm
    @Column({type: "numeric", precision: 10, scale: 2, nullable: true})
    height: number;

    @Column({type: "varchar", length: 100, nullable: true})
    shippingCompany: string; // e.g., 'DHL', 'Qatar Post'

    @Column({type: "date", nullable: true})
    plannedShippingDateAndTime: string; // in YYYY-MM-DD format

    @Column({type: "boolean", default: false})
    pickupRequested: boolean; // whether pickup is requested

    @Column({type: "text", nullable: true})
    description: string; // description of the shipment

    @Column({type: "text", nullable: true})
    invoiceNumber: string; // invoice number

    @Column({type: "date", nullable: true})
    invoiceDate: string; // invoice date

    @Column({type: "jsonb", nullable: true})
    lineItems: any; // array of line items

    @Column({type: "text", nullable: true})
    trackingNumber: string; // tracking number from shipping company

    @Column({type: "text", nullable: true})
    incoterm: string; // Incoterm for international shipments

}

import { Order } from "./order.model.js";