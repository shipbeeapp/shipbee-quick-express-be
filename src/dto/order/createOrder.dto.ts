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
    @IsOptional()
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
  @IsOptional()
  itemType: itemType;

  @IsString()
  @IsOptional()
  receiverName: string;

  @IsString()
  @IsOptional()
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
}

export class CreateOrderDto {
  @IsOptional()
  vehicleId?: string;

  @IsEnum(ServiceSubcategoryName)
  serviceSubcategory: ServiceSubcategoryName;

  // @IsEnum(furnitureRequests)
  // @IsOptional()
  // type: furnitureRequests;

  // @IsEnum(itemType)
  // @IsOptional()
  // itemType: itemType;

  @ValidateNested() // ✅ Ensure validation of nested object
  @Type(() => AddressDto)
  fromAddress: AddressDto  

  // @IsOptional()
  // @ValidateNested() // ✅ Ensure validation of nested object
  // @Type(() => AddressDto)
  // toAddress?: AddressDto

  // @IsOptional()
  // @IsString()
  // itemDescription?: string;

  @IsDateString()
  pickUpDate: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : value))
  lifters?: number;

  @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
  @Transform(({ value }) => (value ? Number(value) : value))
  @IsNumber()
  distance: number;

  @IsString()
  @IsOptional()
  senderName: string;

  @IsString()
  @IsOptional()
  senderPhoneNumber: string;

  @IsEmail()
  @IsOptional()
  senderEmail: string;

  // @IsString()
  // @IsOptional()
  // receiverName: string;

  // @IsString()
  // @IsOptional()
  // receiverPhoneNumber: string;

  // @IsEmail()
  // @IsOptional()
  // receiverEmail: string;

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

  @IsEnum(Payer)
  @IsOptional()
  payer: Payer;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderStop)
  stops?: OrderStop[];

  @IsEnum(OrderType)
  @IsOptional()
  type?: OrderType;
}