import { IsString, IsNumber, IsOptional, IsEnum, IsEmail, IsDateString, ValidateNested, ValidateIf } from "class-validator";
import { Type, Transform } from "class-transformer";   
import { itemType } from "../../utils/enums/itemType.enum.js";
import { ServiceSubcategoryName } from "../../utils/enums/serviceSubcategory.enum.js";
import { furnitureRequests } from "../../utils/enums/furnitureRequests.enum.js";
import { VehicleType } from "../../utils/enums/vehicleType.enum.js";
import { PaymentMethod } from "../../utils/enums/paymentMethod.enum.js";
import { PaymentStatus } from "../../utils/enums/paymentStatus.enum.js";
import { Payer } from "../../utils/enums/payer.enum.js";
import { OrderType } from "../../utils/enums/orderType.enum.js";


class AddressDto {
    @IsString()
    @IsOptional()
    country: string;

    @IsString()
    @IsOptional()
    city: string;

    @IsString()
    @IsOptional()
    buildingNumber: string;

    @IsOptional()
    @Transform(({ value }) => (value ? Number(value) : null))
    floor: number;

    @IsString()
    @IsOptional()
    apartmentNumber: string;

    @IsString()
    @IsOptional()
    zone: string;

    @IsString()
    @IsOptional()
    landmarks: string;

    @IsString()
    coordinates: string; // Optional field for storing coordinates as a string (e.g., "lat,long")
}

class ShipmentDto {
    @IsNumber()
    @Type(() => Number)
    weight: number; // weight in kg

    @IsNumber()
    @Type(() => Number) 
    length: number; // length in cm

    @IsNumber()
    @Type(() => Number)
    width: number; // width in cm

    @IsNumber()
    @Type(() => Number)
    height: number; // height in cm

    @IsString()
    @IsOptional()
    shippingCompany?: string; // e.g., 'DHL', 'Qatar Post'

    @IsNumber()
    @Type(() => Number)
    itemCount: number; // number of items

    @IsNumber()
    @Type(() => Number)
    totalValue: number; // total value in USD

}

export class OrderStop {
  
  @IsOptional()
  @ValidateNested() // ✅ Ensure validation of nested object
  @Type(() => AddressDto)
  toAddress?: AddressDto

  @IsOptional()
  @IsString()
  itemDescription?: string;

  @IsEnum(itemType)
  itemType: itemType;

  @IsString()
  receiverName: string;

  @IsString()
  receiverPhoneNumber: string;

  @IsEmail()
  @IsOptional()
  receiverEmail: string;

  @IsNumber()
  @Type(() => Number)
  sequence: number;

  @IsNumber()
  @IsOptional()
  // @Type(() => Number)
  @Transform(({ value }) => (value ? Number(value) : value))
  distance: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : value))
  lifters?: number;
}

export class CreateOrderDto {
  @IsOptional()
  vehicleId?: string;

  @IsEnum(ServiceSubcategoryName)
  serviceSubcategory: ServiceSubcategoryName;

  // @IsEnum(furnitureRequests)
  // @IsOptional()
  // type: furnitureRequests;

  @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
  @IsOptional()
  @IsEnum(itemType)
  itemType?: itemType;

  @ValidateNested() // ✅ Ensure validation of nested object
  @Type(() => AddressDto)
  fromAddress: AddressDto  

  @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
  @ValidateNested() // ✅ Ensure validation of nested object
  @Type(() => AddressDto)
  toAddress?: AddressDto

  // @IsOptional()
  // @IsString()
  // itemDescription?: string;

  @IsDateString()
  pickUpDate: string;

  // @IsOptional()
  // @IsNumber()
  // @Transform(({ value }) => (value ? Number(value) : value))
  // lifters?: number;

  @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
  @Transform(({ value }) => (value ? Number(value) : value))
  @IsNumber()
  distance: number;

  @IsString()
  senderName: string;

  @IsString()
  senderPhoneNumber: string;

  @IsEmail()
  @IsOptional()
  senderEmail: string;

  @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
  @IsString()
  @IsOptional()
  receiverName?: string;

  @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
  @IsOptional()
  @IsString()
  receiverPhoneNumber?: string;

  @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
  @IsOptional()
  @IsEmail()
  receiverEmail?: string;

  @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @ValidateNested() // ✅ Ensure validation of nested object
  @Type(() => ShipmentDto)
  shipment?: ShipmentDto

  @IsOptional()
  @IsNumber()
  orderNo?: number;

  @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
  @IsEnum(Payer)
  @IsOptional()
  @Transform(({ obj, value }) => {
    if (obj.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL) {
      return Payer.SENDER;      // force SENDER for international shipments
    }
    return value;
    })
  payer: Payer;

  @ValidateNested({ each: true })
  @Type(() => OrderStop)
  stops?: OrderStop[];

  @IsEnum(OrderType)
  @IsOptional()
  @Transform(({ obj, value }) => {
    if (obj.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL) {
      return OrderType.SINGLE_STOP;      // force SINGLE_STOP for international shipments
    }
    return value;
    })
  type?: OrderType;
}