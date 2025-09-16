import { IsEnum, ValidateIf, IsPositive } from "class-validator";
import { ServiceSubcategoryName } from "../../utils/enums/serviceSubcategory.enum.js";
import { VehicleType } from "../../utils/enums/vehicleType.enum.js";

export class GetPricingDTO {
    @IsEnum(ServiceSubcategoryName)
    serviceSubcategory: ServiceSubcategoryName;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
    vehicleType: VehicleType; // Optional, only for PERSONAL_QUICK

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
    @IsPositive()
    distance?: number; // Optional, only for PERSONAL_QUICK

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    fromCountry?: string; // Optional, only for INTERNATIONAL

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    toCountry?: string; // Optional, only for INTERNATIONAL

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    @IsPositive()
    weight?: number; // Optional, only for INTERNATIONAL
}