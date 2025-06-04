import { Entity, Column, BaseEntity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn} from "typeorm";
// import BaseEntity from "./baseEntity.js";
import { ServiceCategoryName } from "../utils/enums/serviceCategory.enum.js";


@Entity("service_categories")
export class ServiceCategory extends BaseEntity {

   @PrimaryGeneratedColumn("uuid")
    public id: string;
  
    @CreateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
      })
    public createdAt: Date;
    
      @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
      })
    public updatedAt: Date;

  @Column({type: "enum", enum: ServiceCategoryName, unique: true})
  name: ServiceCategoryName;
}
