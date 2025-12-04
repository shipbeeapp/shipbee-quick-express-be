import { IsEnum, ValidateIf, IsPositive, IsOptional, IsString, IsDateString } from "class-validator";
import { Transform } from "class-transformer";
import { ServiceSubcategoryName } from "../../utils/enums/serviceSubcategory.enum.js";
import { VehicleType } from "../../utils/enums/vehicleType.enum.js";
import { Type } from "class-transformer";

export class GetPricingDTO {
    @IsEnum(ServiceSubcategoryName)
    serviceSubcategory: ServiceSubcategoryName;

    @IsString()
    shippingCompany: string;

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
    @Transform(({ value }) => {
      if (!value) return value;
      const date = new Date(value);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    })
    @IsDateString()
    plannedShippingDate?: string;

    @IsOptional()
    @IsPositive()
    @Type(() => Number)
    lifters?: number; // Optional, only for Personal Quick
}