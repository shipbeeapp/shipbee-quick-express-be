import { IsString, IsNumber, IsOptional, IsEnum, IsEmail, IsDateString, ValidateNested } from "class-validator";
import { Type, Transform } from "class-transformer";   
import { itemType } from "../../utils/enums/itemType.enum.js";
import { ServiceSubcategoryName } from "../../utils/enums/serviceSubcategory.enum.js";
import { furnitureRequests } from "../../utils/enums/furnitureRequests.enum.js";
import { Vehicle } from "../../models/vehicle.model.js";
import { VehicleType } from "../../utils/enums/vehicleType.enum.js";


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

    @IsString()
    @IsOptional()
    floor: string;

    @IsString()
    @IsOptional()
    apartmentNumber: string;

    @IsString()
    @IsOptional()
    zone: string;
}

export class CreateOrderDto {
  @IsOptional()
  vehicleId?: string;

  @IsEnum(ServiceSubcategoryName)
  serviceSubcategory: ServiceSubcategoryName;

  @IsEnum(furnitureRequests)
  @IsOptional()
  type: furnitureRequests;

  @IsEnum(itemType)
  @IsOptional()
  itemType: itemType;

  @ValidateNested() // ✅ Ensure validation of nested object
  @Type(() => AddressDto)
  fromAddress: AddressDto  

  @IsOptional()
  @ValidateNested() // ✅ Ensure validation of nested object
  @Type(() => AddressDto)
  toAddress?: AddressDto

  @IsOptional()
  @IsString()
  itemDescription?: string;

  @IsDateString()
  pickUpDate: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : value))
  lifters?: number;

  @IsNumber()
  @Type(() => Number)
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

  @IsString()
  @IsOptional()
  receiverName: string;

  @IsString()
  @IsOptional()
  receiverPhoneNumber: string;

  @IsEmail()
  @IsOptional()
  receiverEmail: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;
}