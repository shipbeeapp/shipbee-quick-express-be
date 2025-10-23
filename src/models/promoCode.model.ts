import { Entity, Column, OneToMany} from "typeorm";
import BaseEntity from "./baseEntity.js";
import { UserPromoCode } from "./userPromoCode.model.js";
import { DiscountType } from "../utils/enums/discountType.enum.js";
import { PromoCodeType } from "../utils/enums/promoCodeType.enum.js";

@Entity("promo_codes")
export class PromoCode extends BaseEntity {

  @Column({ unique: true, type: "text" })
  code: string;

  @Column({type: "enum", enum: PromoCodeType, default: PromoCodeType.PROMOTIONAL})
  type: PromoCodeType; // 'signup', 'referral', 'seasonal', etc.

  @Column({type: "enum", enum: DiscountType})
  discountType: DiscountType; // 'fixed', 'percentage'

  @Column("decimal", { precision: 10, scale: 2 })
  discountValue: number;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  maxDiscount: number;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  minOrderAmount: number;

  @Column({type: "int"})
  usageLimit: number;

  @Column("timestamp")
  validFrom: Date;

  @Column("timestamp")
  validTo: Date;

  @Column({type: "boolean", default: true})
  isActive: boolean;

  @Column({type: "text", nullable: true})
  description: string;

  @OneToMany(() => UserPromoCode, (userPromoCode) => userPromoCode.promoCode)
  userPromoCodes: UserPromoCode[];
}
