import { IsString, IsNumber, IsOptional, IsEnum, IsEmail, IsDateString, ValidateNested } from "class-validator";
import { Type, Transform } from "class-transformer";   
import { itemType } from "../../utils/enums/itemType.enum.js";
import { ServiceSubcategoryName } from "../../utils/enums/serviceSubcategory.enum.js";
import { furnitureRequests } from "../../utils/enums/furnitureRequests.enum.js";


class AddressDto {
    @IsString()
    country: string;

    @IsString()
    city: string;

    @IsString()
    buildingNumber: string;

    @IsString()
    floor: string;

    @IsString()
    apartmentNumber: string;

    @IsString()
    @IsOptional()
    zone: string;
}

export class CreateOrderDto {
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

  @IsString()
  name: string;

  @IsString()
  phoneNumber: string;

  @IsEmail()
  email: string;
}