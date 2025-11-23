import { Column, Entity } from "typeorm";
import BaseEntity from "./baseEntity.js";
import { itemType } from "../utils/enums/itemType.enum.js";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";

@Entity("shop_settings")
export class ShopSettings extends BaseEntity {
  @Column({ type: "varchar", length: 255, unique: true })
  shopDomain: string; // e.g., bassel-store-2.myshopify.com

  @Column({ type: "varchar", length: 255, nullable: true })
  shopId?: string; // optional Shopify store ID

  @Column({ type: "varchar", length: 255, nullable: true })
  senderName?: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  pickupAddress?: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  senderPhoneNumber?: string; // without country code, e.g., 5xxxxxxx

  @Column({ type: "varchar", length: 30, nullable: true })
  senderEmail?: string;

  @Column({ type: "enum", enum: itemType, nullable: true })
  itemType?: itemType; // enum value

  @Column({ type: "enum", enum: VehicleType, nullable: true })
  vehicleType?: VehicleType; // enum value

  @Column({ type: "text", nullable: false })
  latitude: number;

  @Column({ type: "text", nullable: false })
  longitude: number;
}