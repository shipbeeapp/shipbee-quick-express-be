import { IsEnum, IsOptional, ValidateIf } from "class-validator";
import { ServiceSubcategoryName } from "../../utils/enums/serviceSubcategory.enum.js";
import { VehicleType } from "../../utils/enums/vehicleType.enum.js";

export class CreatePricingDTO {
    @IsEnum(ServiceSubcategoryName)
    serviceSubcategory: ServiceSubcategoryName;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
    @IsEnum(VehicleType)
    vehicleType: VehicleType;

    // Distance-based
    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
    minDistance: number;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
    maxDistance: number;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
    baseCost: number;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
    thresholdDistance: number;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK)
    additionalPerKm: number;

    // Weight-based
    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    fromCountry: string;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    toCountry: string;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    maxWeight: number;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    firstKgCost: number;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    additionalKgCost: number;

    @ValidateIf(o => o.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL)
    @IsOptional()
    transitTime: string;

    @IsOptional()
    isCurrent: boolean; // To mark if this pricing is current or outdated

}