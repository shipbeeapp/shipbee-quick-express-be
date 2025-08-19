import { Entity, Column} from "typeorm";
import BaseEntity from "./baseEntity.js";

@Entity("terms_and_conditions")
export class TermsAndConditions extends BaseEntity {

  @Column("text", { nullable: false })
  content: string;
}