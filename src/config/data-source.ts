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
  ], // ✅ Path to migrations
  ssl: {
    rejectUnauthorized: false, // 👈 Add this line
  },
  synchronize: false, // Always false in production!
  logging: false,
});