import { DataSource } from "typeorm";
import { env } from "./environment.js";
import { User } from "../models/user.model.js";
import { Order } from "../models/order.model.js";
import { Payment } from "../models/payment.model.js";
import { PaymentStatusHistory } from "../models/paymentStatusHistory.model.js";
import { PromoCode } from "../models/promoCode.model.js";
import { UserPromoCode } from "../models/userPromoCode.model.js";
import { ServiceCategory } from "../models/serviceCategory.model.js";
import { ServiceSubcategory } from "../models/serviceSubcategory.model.js";
import { Address } from "../models/address.model.js";
import { OrderStatusHistory } from "../models/orderStatusHistory.model.js";
import { InitialMigration1739286971657 } from "../migrations/1739286971657-InitialMigration.js";
import {AddPaymentMethodInOrder1749152821888} from "../migrations/1749152821888-AddPaymentMethodInOrder.js";
import {AddDistanceInOrder1750237696460} from "../migrations/1750237696460-AddDistanceInOrder.js";
import {ModifyMandatoryFieldsAndAddOrderNumber1750280063917} from "../migrations/1750280063917-ModifyMandatoryFieldsAndAddOrderNumber.js"
import {AddVehiclesTable1751188463677} from "../migrations/1751188463677-AddVehiclesTable.js";
import { Vehicle } from "../models/vehicle.model.js";
import {UpdateUserFieldsInOrder1751354850907} from "../migrations/1751354850907-UpdateUserFieldsInOrder.js"
import {AddOtpInUserModel1752051730087} from "../migrations/1752051730087-AddOtpInUserModel.js";
import { AddIsNewUserInUserModel1752060113738 } from "../migrations/1752060113738-AddIsNewUserInUserModel.js";
import {AddUserTypeAndCompany1752070861633} from "../migrations/1752070861633-AddUserTypeAndCompany.js";
import { AddNewVehicleTypes1752404858340 } from "../migrations/1752404858340-AddNewVehicleTypes.js";
import {ModifyOrderStatusEnum1752935477326} from "../migrations/1752935477326-ModifyOrderStatusEnum.js";
import { AddNewItemTypes1752141261233 } from "../migrations/1752141261233-AddNewItemTypes.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  // url: env.DATABASE_URL,
  host: env.DB.HOST,
  port: Number(env.DB.PORT),
  username: env.DB.USERNAME,
  password: env.DB.PASSWORD,
  database: env.DB.DATABASE,
  entities: [
    User,
    Address,
    ServiceCategory,
    ServiceSubcategory,
    PromoCode,
    UserPromoCode,
    Order,
    OrderStatusHistory,
    Payment,
    PaymentStatusHistory,
    Vehicle, // ✅ Add Vehicle entity
  ],
  migrations: [
    InitialMigration1739286971657,
    AddPaymentMethodInOrder1749152821888,
    AddDistanceInOrder1750237696460,
    ModifyMandatoryFieldsAndAddOrderNumber1750280063917,
    AddVehiclesTable1751188463677,
    UpdateUserFieldsInOrder1751354850907,
    AddOtpInUserModel1752051730087,
    AddIsNewUserInUserModel1752060113738,
    AddUserTypeAndCompany1752070861633,
    AddNewItemTypes1752141261233,
    AddNewVehicleTypes1752404858340,
    ModifyOrderStatusEnum1752935477326,
  ], // ✅ Path to migrations
  ssl: false,
  synchronize: false, // Always false in production!
  logging: false,
});