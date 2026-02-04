import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BasePricing } from "./basePricing.entity.js";
import { User } from "./user.model.js";

@Entity("user_pricing")
@Index(["user", "serviceSubcategory", "vehicleType"])
export class UserPricing extends BasePricing {

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({type: "uuid"})
  userId: string;
}
