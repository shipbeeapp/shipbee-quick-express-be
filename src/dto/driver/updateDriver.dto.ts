import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { VehicleType } from '../../utils/enums/vehicleType.enum.js';

export class UpdateDriverDto {
    @IsString()
    @IsOptional()
    name: string;

    @IsString()
    @IsOptional()
    phoneNumber: string;

    @IsEnum(VehicleType)
    @IsOptional()
    vehicleType: VehicleType; // Type of vehicle the driver operates
}