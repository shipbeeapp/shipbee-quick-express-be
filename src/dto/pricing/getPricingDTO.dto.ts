import { IsEnum, ValidateIf, IsPositive, IsOptional, IsNumber, IsDateString, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { ServiceSubcategoryName } from "../../utils/enums/serviceSubcategory.enum.js";
import { VehicleType } from "../../utils/enums/vehicleType.enum.js";
import { Type } from "class-transformer";

export class GetPricingDTO {
    @IsEnum(ServiceSubcategoryName)
    serviceSubcategory: ServiceSubcategoryName;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    shippingCompany?: string;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
    vehicleType: VehicleType; // Optional, only for PERSONAL_QUICK

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
    @IsPositive()
    @Type(() => Number)
    distance?: number; // Optional, only for PERSONAL_QUICK

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    fromCountry?: string; // Optional, only for INTERNATIONAL

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL && o.shippingCompany === 'DHL')
    fromCity?: string; // Optional, only for INTERNATIONAL with DHL

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    toCountry?: string; // Optional, only for INTERNATIONAL

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL && o.shippingCompany === 'DHL')
    toCity?: string; // Optional, only for INTERNATIONAL with DHL

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    @IsPositive()
    @Type(() => Number)
    weight?: number; // Optional, only for INTERNATIONAL

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL && o.shippingCompany === 'DHL')
    @IsPositive()
    @Type(() => Number)
    length?: number; // Optional, only for INTERNATIONAL

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL && o.shippingCompany === 'DHL')
    @IsPositive()
    @Type(() => Number)
    width?: number; // Optional, only for INTERNATIONAL

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL && o.shippingCompany === 'DHL')
    @IsPositive()
    @Type(() => Number)
    height?: number; // Optional, only for INTERNATIONAL

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL && o.shippingCompany === 'DHL')
    @IsString()
    @Transform(({ value }) => value ? new Date(value.replace(' GMT', '')).toISOString().split('T')[0] : value)
    plannedShippingDate?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    lifters?: number; // Optional, only for Personal Quick
}
