import { IsString, IsNumber, IsOptional, IsEnum, IsEmail, IsDateString, ValidateNested, ValidateIf, IsBoolean, IsDefined } from "class-validator";
import { Type, Transform, plainToInstance } from "class-transformer";   
import { itemType } from "../../utils/enums/itemType.enum.js";
import { ServiceSubcategoryName } from "../../utils/enums/serviceSubcategory.enum.js";
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
    district?: string;

    @IsString()
    @IsOptional()
    street?: string;

    @IsString()
    @IsOptional()
    buildingNumber?: string;

    @IsString()
    @IsOptional()
    floor?: string;

    @IsString()
    @IsOptional()
    apartmentNumber?: string;

    @IsString()
    @IsOptional()
    zone?: string;

    @IsString()
    @IsOptional()
    landmarks?: string;

    @IsOptional()
    _isQuick?: boolean; // injected by parent transform — do not send from client

    @IsString()
    @ValidateIf(o => o._isQuick === true)
    coordinates: string; // Optional field for storing coordinates as a string (e.g., "lat,long")
}

class QuantityDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : value))
  value: number;

  @IsOptional()
  @IsString()
  unitOfMeasurement: string;
}

class WeightDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : value))
  netValue: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : value))
  grossValue: number;
}

class LineItemDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  number: number;
  
  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuantityDto)
  quantity: QuantityDto;

  @IsOptional()
  @IsString()
  manufacturerCountry: string;

  @IsString()
  @IsOptional()
  packageType: string;
  
  @IsOptional()
  @ValidateNested()
  @Type(() => WeightDto)
  weight: WeightDto;

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

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => (value === 'true' || value === true))
    pickupRequested?: boolean; // whether pickup is requested

    @IsString()
    @IsOptional()
    description: string; // description of the shipment

    @IsString()
    @IsOptional()
    invoiceNumber: string; // invoice number

    @IsDateString()
    @IsOptional()
    invoiceDate: string; // invoice date

    @IsString()
    @IsOptional()
    plannedShippingDateAndTime: string; // allow "GMT+01:00" format

    @IsString()
    @IsOptional()
    incoterm?: string; // Incoterm for international shipments

    @ValidateNested({ each: true })
    @Type(() => LineItemDto)
    @IsOptional()
    lineItems?: LineItemDto[];

}

export class OrderStop {

  @IsOptional()
  _isQuick?: boolean; // injected by parent transform — do not send from client

  @IsOptional()
  @ValidateNested() // ✅ Ensure validation of nested object
  @Type(() => AddressDto)
  @Transform(({ value, obj }) => {
    const addr = typeof value === 'string' ? JSON.parse(value) : value;
    if (addr) addr._isQuick = obj._isQuick === true;
    return addr;
  })
  toAddress?: AddressDto

  @IsOptional()
  @IsString()
  itemDescription?: string;

  @ValidateIf(o => o._isQuick === true) // itemType is required for quick stops only
  @IsDefined()
  @IsEnum(itemType, {
    message: 'itemType must be a valid item type',
  })

  itemType?: string;

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

  @IsOptional()
  @IsString()
  clientStopId?: string;

  @IsOptional()
  items?: any;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : value))
  totalPrice?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : value))
  deliveryFee?: number;
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
  @Transform(({ value, obj }) => {
    const addr = typeof value === 'string' ? JSON.parse(value) : value;
    if (addr) addr._isQuick = obj.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK;
    return addr;
  })
  fromAddress: AddressDto  

  @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
  @ValidateNested() // ✅ Ensure validation of nested object
  @Type(() => AddressDto)
  toAddress?: AddressDto

  // @IsOptional()
  // @IsString()
  // itemDescription?: string;

  @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
  @IsDateString()
  pickUpDate: string;

  // @IsOptional()
  // @IsNumber()
  // @Transform(({ value }) => (value ? Number(value) : value))
  // lifters?: number;

  @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
  @Transform(({ value }) => (value ? Number(value) : value))
  @IsNumber()
  @IsOptional()
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
  @Transform(({ value, obj }) => {
    if (!Array.isArray(value)) return value;
    return value.map(stop => plainToInstance(OrderStop, { ...stop, _isQuick: obj.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK }));
  })
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