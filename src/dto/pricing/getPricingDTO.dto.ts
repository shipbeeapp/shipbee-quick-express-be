import { IsEnum, ValidateIf, IsPositive } from "class-validator";
import { ServiceSubcategoryName } from "../../utils/enums/serviceSubcategory.enum.js";
import { VehicleType } from "../../utils/enums/vehicleType.enum.js";
import { Type } from "class-transformer";

export class GetPricingDTO {
    @IsEnum(ServiceSubcategoryName)
    serviceSubcategory: ServiceSubcategoryName;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
    vehicleType: VehicleType; // Optional, only for PERSONAL_QUICK

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
    @IsPositive()
    @Type(() => Number)
    distance?: number; // Optional, only for PERSONAL_QUICK

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    fromCountry?: string; // Optional, only for INTERNATIONAL

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    toCountry?: string; // Optional, only for INTERNATIONAL

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    @IsPositive()
    @Type(() => Number)
    weight?: number; // Optional, only for INTERNATIONAL
}