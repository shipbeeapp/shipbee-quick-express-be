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

export const AppDataSource = new DataSource({
  type: "postgres",
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
  ],
  migrations: [
    InitialMigration1739286971657,
  ], // ✅ Path to migrations
  ssl: env.APP_ENV === 'production', // Use SSL in production environment
  synchronize: false, // Always false in production!
  logging: false,
});