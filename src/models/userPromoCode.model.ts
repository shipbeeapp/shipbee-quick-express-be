import { Entity, ManyToOne, JoinColumn, Relation, Column } from "typeorm";
import { User } from "./user.model.js";
import { PromoCode } from "./promoCode.model.js";
import BaseEntity from "./baseEntity.js";

@Entity("user_promo_codes")
export class UserPromoCode extends BaseEntity {

  @ManyToOne(() => User, user => user.promoCodeUsages)
  @JoinColumn({ name: "userId" })
  user: Relation<User>;

  @ManyToOne(() => PromoCode, promoCode => promoCode.userPromoCodes)
  @JoinColumn({ name: "promoCodeId" })
  promoCode: PromoCode;

  @Column({ type: "int", default: 0 })
  usageCount: number;
  
}
