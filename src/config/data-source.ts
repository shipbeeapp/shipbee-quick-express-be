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
import {MakeDistanceNullable1757840748304} from "../migrations/1757840748304-MakeDistanceNullable.js"; // Import the migration for making distance nullable
import {AddPricingTable1758011273700} from "../migrations/1758011273700-AddPricingTable.js"; // Import the migration for adding Pricing table
import { Pricing } from "../models/pricing.model.js"; // Import the Pricing model
import {AddDriverAndCancellationToOrderStatusHistory1758021504299} from "../migrations/1758021504299-AddDriverAndCancellationToOrderStatusHistory.js"; // Import the migration for adding driver and cancellation reason to OrderStatusHistory
import { AddAccessTokenToOrder1758457694553 } from "../migrations/1758457694553-AddAccessTokenToOrder.js"; // Import the migration for adding access token to Order
import { OrderCancellationRequest } from "../models/orderCancellationRequest.model.js"; // Import the OrderCancellationRequest model
import { AddOrderCancellationRequest1759230306609 } from "../migrations/1759230306609-AddOrderCancellationRequest.js"; // Import the migration for adding OrderCancellationRequest
import {AddDriverDocs1759746365678} from "../migrations/1759746365678-AddDriverDocs.js"; // Import the migration for adding driver document fields
import {AddReasonInOrderCancellationRequest1759958006098} from "../migrations/1759958006098-AddReasonInOrderCancellationRequest.js"; // Import the migration for adding reason in OrderCancellationRequest
import { AddExtraFieldsInDriverAndVehicle1760101767713 } from "../migrations/1760101767713-AddExtraFieldsInDriverAndVehicle.js"; // Import the migration for adding extra fields in Driver and Vehicle
import { MakeDriverColumnsNullable1760367494628 } from "../migrations/1760367494628-MakeDriverColumnsNullable.js";
import { MakeDriverDOBnullable1760367798785 } from "../migrations/1760367798785-MakeDriverDOBnullable.js";
import {AddMoreFieldsInVehicle1760388514301} from "../migrations/1760388514301-AddMoreFieldsInVehicle.js";
import {MakeVehicleNumberNotNull1760391271327}  from "../migrations/1760391271327-MakeVehicleNumberNotNull.js";
import {AlterVehicleTypeEnum1761041771794} from "../migrations/1761041771794-AlterVehicleTypeEnum.js";
import {AlterVehicleTypeEnum21761057209124} from "../migrations/1761057209124-AlterVehicleTypeEnum2.js";
import {DropRequiredInPlateNumber1761235459302} from "../migrations/1761235459302-DropRequiredInPlateNumber.js";
import {AddModificationsToPromoCode1761207892348} from "../migrations/1761207892348-AddModificationsToPromoCode.js";
import {AddDescriptionInPromocode1761240108086} from "../migrations/1761240108086-AddDescriptionInPromocode.js";
import {AddPayerOptionInOrder1761577063081} from "../migrations/1761577063081-AddPayerOptionInOrder.js";
import {AddCreatedByUser1761643526306} from "../migrations/1761643526306-AddCreatedByUser.js";
import {AddNewDriverFields1761645175717} from "../migrations/1761645175717-AddNewDriverFields.js";
import {AddApprovalColumnsForDriverAndVehicle1761729766887} from "../migrations/1761729766887-AddApprovalColumnsForDriverAndVehicle.js";
import {AddIsViewedAndViewedAtInOrder1761827413501} from "../migrations/1761827413501-AddIsViewedAndViewedAtInOrder.js";
import {AddMoreFieldsInDriver1762085640369} from "../migrations/1762085640369-AddMoreFieldsInDriver.js";
import {AddMoreFieldsInDriver1762117406201} from "../migrations/1762117406201-AddMoreFieldsInDriver.js";
import {AddMoreFieldsForEcommerce1762772511358} from "../migrations/1762772511358-AddMoreFieldsForEcommerce.js";
import {AddMultiOrderFeature1762079321388} from "../migrations/1762079321388-AddMultiOrderFeature.js";
import {AddApiKeyInUser1762947817693} from "../migrations/1762947817693-AddApiKeyInUser.js";
import { OrderStop } from "../models/orderStops.model.js";
import {DropOrderStopsAndPopulateAgain1762991292803} from "../migrations/1762991292803-DropOrderStopsAndPopulateAgain.js";
import { ModifyDriverSignUpStatusEnumToIncludeDeactivated1763215698193 } from "../migrations/1763215698193-ModifyDriverSignUpStatusEnumToIncludeDeactivated.js";
import {ModifyOrderStatusEnumToIncludeEnRoutePickup1763543196272} from "../migrations/1763543196272-ModifyOrderStatusEnumToIncludeEnRoutePickup.js";
import { AddBusinessDocsApprovalAndReason1763817948893 } from "../migrations/1763817948893-AddBusinessDocsApprovalAndReason.js";
import {AddShopSettingsTable1763899376760}  from "../migrations/1763899376760-AddShopSettingsTable.js";
import { ShopSettings } from "../models/shopSettings.model.js";
import { AddSenderNameInShopSettings1763904870962 } from "../migrations/1763904870962-AddSenderNameInShopSettings.js";
import { AddBroadcastMessageAndDriverBroadcast1764238643026 } from '../migrations/1764238643026-AddBroadcastMessageAndDriverBroadcast.js';
import { DriverBroadcastMessage } from '../models/driverBroadcastMessage.model.js';
import { BroadcastMessage } from '../models/broadcastMessage.model.js';
import {AddShippingCompanyInShipment1764847815381} from "../migrations/1764847815381-AddShippingCompanyInShipment.js";
import {MakeAllUsersNew1765029363063} from "../migrations/1765029363063-MakeAllUsersNew.js";
import {AddFcmTokenInDrivers1765366534790} from "../migrations/1765366534790-AddFcmTokenInDrivers.js";
import { AddLiftersInOrderStop1765883228517 } from "../migrations/1765883228517-AddLiftersInOrderStop.js";
import {MakeVehicleTypeInOrderCorrect1765884622888} from "../migrations/1765884622888-MakeVehicleTypeInOrderCorrect.js";
import { AddResetFields1766495848820 } from '../migrations/1766495848820-AddResetFields.js';
import {AddExtraFieldsForStops1766610543221} from "../migrations/1766610543221-AddExtraFieldsForStops.js";
import {AddCommentsInStops1767086905430} from "../migrations/1767086905430-AddCommentsInStops.js";
import { AddIsSandboxInUser1767088062249 } from '../migrations/1767088062249-AddIsSandboxInUser.js';
import { AddFieldsInShipment1767103859531 } from "../migrations/1767103859531-AddFieldsInShipment.js";
import { AddDeliveryFeeInStop1767108713906 } from '../migrations/1767108713906-AddDeliveryFeeInStop.js';
import { MakePickUpDateNullable1767260830156 } from '../migrations/1767260830156-MakePickUpDateNullable.js';
import {AddLoggedInFieldsInUser1767619399914} from "../migrations/1767619399914-AddLoggedInFieldsInUser.js";
import {AddVehicleApprovalInDriverTable1768251957627} from "../migrations/1768251957627-AddVehicleApprovalInDriverTable.js"
import { ModifyDriverStatusOnDutyToBusy1768296334869 } from "../migrations/1768296334869-ModifyDriverStatusOnDutyToBusy.js";
import {AddDefaultDriverStatus1768297449812} from "../migrations/1768297449812-AddDefaultDriverStatus.js"
import {AddCardOnDeliveryOption1768989836638} from "../migrations/1768989836638-AddCardOnDeliveryOption.js"
import {AddUserPricingTable1769079453736} from "../migrations/1769079453736-AddUserPricingTable.js"
import { UserPricing } from "../models/userPricing.model.js";
import {AddDriverIncomeAndCashBalance1769467331980} from "../migrations/1769467331980-AddDriverIncomeAndCashBalance.js"
import { AddDriverCashAndOnlineIncome1769678429853 } from "../migrations/1769678429853-AddDriverCashAndOnlineIncome.js";
import { AddMaxOrderTimePerBusiness1769696374021 } from "../migrations/1769696374021-AddMaxOrderTimePerBusiness.js";
import { AddShipbeeServiceFeePercentageInOrder1769785724664 } from "../migrations/1769785724664-AddShipbeeServiceFeePercentageInOrder.js";
import { AddHistoricalIncome1770059204107 } from '../migrations/1770059204107-AddHistoricalIncome.js';
import {AddProceedWithoutPaymentInUser1770563510535} from "../migrations/1770563510535-AddProceedWithoutPaymentInUser.js"; // Import the migration for adding proceedWithoutPayment in User
import {AddDisconnectedDriverStatus1770719913115} from "../migrations/1770719913115-AddDisconnectedDriverStatus.js"; // Import the migration for adding Disconnected status in DriverStatus enum
import { AddNewEnumInStatus1770726819376 } from "../migrations/1770726819376-AddNewEnumInStatus.js";
import { AddIsDisconnectedColumn1771064017511 } from "../migrations/1771064017511-AddIsDisconnectedColumn.js";
import { Tag } from "../models/tag.model.js";
import { DriverTag } from "../models/driverTag.model.js";
import {AddDriverTags1771078966854} from "../migrations/1771078966854-AddDriverTags.js";
import { AddMonthlyBill1771365542054 } from "../migrations/1771365542054-AddMonthlyBill.js";
import { AddAnotherOrderStatus1771685981514 } from "../migrations/1771685981514-AddAnotherOrderStatus.js";
import {MakeIncomesDecimal1771754729406} from "../migrations/1771754729406-MakeIncomesDecimal.js";
import { AddExtensionsToPhoneNumbers1772095940609 } from "../migrations/1772095940609-AddExtensionsToPhoneNumbers.js";
import {MakeFloorStringInAddress1772284155567} from "../migrations/1772284155567-MakeFloorStringInAddress.js"; // Import the migration for making floor a string in Address

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
    Pricing, // ✅ Add Pricing entity
    OrderCancellationRequest, // ✅ Add OrderCancellationRequest entity
    OrderStop, // ✅ Add OrderStop entity
    ShopSettings, // ✅ Add ShopSettings entity
    BroadcastMessage,
    DriverBroadcastMessage,
    UserPricing,
    Tag,
    DriverTag,
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
    MakeDistanceNullable1757840748304, // ✅ Add migration for making distance nullable
    AddPricingTable1758011273700, // ✅ Add migration for adding Pricing table
    AddDriverAndCancellationToOrderStatusHistory1758021504299, // ✅ Add migration for adding driver and cancellation reason to OrderStatusHistory
    AddAccessTokenToOrder1758457694553, // ✅ Add migration for adding access token to Order
    AddOrderCancellationRequest1759230306609, // ✅ Add migration for adding OrderCancellationRequest
    AddDriverDocs1759746365678,
    AddReasonInOrderCancellationRequest1759958006098,
    AddExtraFieldsInDriverAndVehicle1760101767713,
    MakeDriverColumnsNullable1760367494628,
    MakeDriverDOBnullable1760367798785,
    AddMoreFieldsInVehicle1760388514301,
    MakeVehicleNumberNotNull1760391271327,
    AlterVehicleTypeEnum1761041771794,
    AlterVehicleTypeEnum21761057209124,
    DropRequiredInPlateNumber1761235459302,
    AddModificationsToPromoCode1761207892348,
    AddDescriptionInPromocode1761240108086,
    AddPayerOptionInOrder1761577063081,
    AddCreatedByUser1761643526306,
    AddNewDriverFields1761645175717,
    AddApprovalColumnsForDriverAndVehicle1761729766887,
    AddIsViewedAndViewedAtInOrder1761827413501,
    AddMoreFieldsInDriver1762085640369,
    AddMoreFieldsInDriver1762117406201,
    AddMoreFieldsForEcommerce1762772511358,
    AddMultiOrderFeature1762079321388,
    AddApiKeyInUser1762947817693,
    DropOrderStopsAndPopulateAgain1762991292803,
    ModifyDriverSignUpStatusEnumToIncludeDeactivated1763215698193,
    ModifyOrderStatusEnumToIncludeEnRoutePickup1763543196272,
    AddBusinessDocsApprovalAndReason1763817948893,
    AddShopSettingsTable1763899376760,
    AddSenderNameInShopSettings1763904870962,
    AddBroadcastMessageAndDriverBroadcast1764238643026,
    AddShippingCompanyInShipment1764847815381,
    MakeAllUsersNew1765029363063,
    AddFcmTokenInDrivers1765366534790,
    AddLiftersInOrderStop1765883228517,
    MakeVehicleTypeInOrderCorrect1765884622888,
    AddResetFields1766495848820,
    AddExtraFieldsForStops1766610543221,
    AddCommentsInStops1767086905430,
    AddIsSandboxInUser1767088062249,
    AddFieldsInShipment1767103859531,
    AddDeliveryFeeInStop1767108713906,
    MakePickUpDateNullable1767260830156,
    AddLoggedInFieldsInUser1767619399914,
    AddVehicleApprovalInDriverTable1768251957627,
    ModifyDriverStatusOnDutyToBusy1768296334869,
    AddDefaultDriverStatus1768297449812,
    AddCardOnDeliveryOption1768989836638,
    AddUserPricingTable1769079453736,
    AddDriverIncomeAndCashBalance1769467331980,
    AddDriverCashAndOnlineIncome1769678429853,
    AddMaxOrderTimePerBusiness1769696374021,
    AddShipbeeServiceFeePercentageInOrder1769785724664,
    AddHistoricalIncome1770059204107,
    AddProceedWithoutPaymentInUser1770563510535,
    AddDisconnectedDriverStatus1770719913115,
    AddNewEnumInStatus1770726819376,
    AddIsDisconnectedColumn1771064017511,
    AddDriverTags1771078966854,
    AddMonthlyBill1771365542054,
    AddAnotherOrderStatus1771685981514,
    MakeIncomesDecimal1771754729406,
    AddExtensionsToPhoneNumbers1772095940609,
    MakeFloorStringInAddress1772284155567,
  ], // ✅ Path to migrations
  ssl: false,
  synchronize: false, // Always false in production!
  logging: false,
  schema: "public",
});