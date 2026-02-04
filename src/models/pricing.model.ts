import {BasePricing} from "./basePricing.entity.js"
import { Entity } from "typeorm";
@Entity("pricing")
export class Pricing extends BasePricing {}