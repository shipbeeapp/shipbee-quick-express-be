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
import { Driver } from "../models/driver.model.js"; // Import the Driver model
import { AddDriverModel1753372238514 } from "../migrations/1753372238514-AddDriverModel.js"; // Import the migration for Driver model
import { AddCoordinatesInAddress1753873681411 } from "../migrations/1753873681411-AddCoordinatesInAddress.js"; // Import the migration for coordinates in Address
import {AlterPickUpDateToBeUtc1753894608853} from "../migrations/1753894608853-AlterPickUpDateToBeUtc.js"; // Import the migration for altering pickUpDate to be UTC
import {AddVehicleModel1754297466425} from "../migrations/1754297466425-AddVehicleModel.js"; // Import the migration for adding vehicle model
import { AddDriverStatus1754389046526 } from "../migrations/1754389046526-AddDriverStatus.js"; // Import the migration for adding driver status
import {AddProofOfOrder1754397946946} from "../migrations/1754397946946-AddProofOfOrder.js"; // Import the migration for adding proof of order
import {AddDriverShareOfTrip1754905342146} from "../migrations/1754905342146-AddDriverShareOfTrip.js"; // Import the migration for adding driver share of trip
import {AddPaymentStatus1754827678174} from "../migrations/1754827678174-AddPaymentStatus.js"; // Import the migration for adding payment status
import {AddCompletionOtpInOrder1755363254865} from "../migrations/1755363254865-AddCompletionOtpInOrder.js"; // Import the migration for adding completion OTP in Order
import {AddTermsAndConditionsTable1755602838041} from "../migrations/1755602838041-AddTermsAndConditionsTable.js"; // Import the migration for adding terms and conditions table
import { TermsAndConditions } from "../models/terms-and-conditions.model.js"; // Import the TermsAndConditions model
import { AddCancellationReasonInOrder1755685207970 } from "../migrations/1755685207970-AddCancellationReasonInOrder.js"; // Import the migration for adding cancellation reason in Order
import { Shipment } from "../models/shipment.model.js"; // Import the Shipment model
import { AddShipmentTable1756200923757 } from "../migrations/1756200923757-AddShipmentTable.js"; // Import the migration for adding Shipment table

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
    Driver, // ✅ Add Driver entity
    Vehicle, // ✅ Add Vehicle entity
    TermsAndConditions, // ✅ Add TermsAndConditions entity
    Shipment, // ✅ Add Shipment entity
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
    AddDriverModel1753372238514, // ✅ Add migration for Driver model
    AddCoordinatesInAddress1753873681411, // ✅ Add migration for coordinates in Address
    AlterPickUpDateToBeUtc1753894608853, // ✅ Add migration for altering pickUpDate to be UTC
    AddVehicleModel1754297466425, // ✅ Add migration for adding vehicle model
    AddDriverStatus1754389046526, // ✅ Add migration for adding driver status
    AddProofOfOrder1754397946946, // ✅ Add migration for adding proof of order
    AddDriverShareOfTrip1754905342146, // ✅ Add migration for adding driver share of trip
    AddPaymentStatus1754827678174, // ✅ Add migration for adding payment status
    AddCompletionOtpInOrder1755363254865, // ✅ Add migration for adding completion OTP in Order
    AddTermsAndConditionsTable1755602838041, // ✅ Add migration for adding terms and conditions table
    AddCancellationReasonInOrder1755685207970, // ✅ Add migration for adding cancellation reason in Order
    AddShipmentTable1756200923757, // ✅ Add migration for adding Shipment table
  ], // ✅ Path to migrations
  ssl: false,
  synchronize: false, // Always false in production!
  logging: false,
});