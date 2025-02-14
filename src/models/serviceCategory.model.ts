import { Entity, Column} from "typeorm";
import BaseEntity from "./baseEntity.js";
import { ServiceCategoryName } from "../utils/enums/serviceCategory.enum.js";


@Entity("service_categories")
export class ServiceCategory extends BaseEntity {

  @Column({type: "enum", enum: ServiceCategoryName, unique: true})
  name: ServiceCategoryName;
}
