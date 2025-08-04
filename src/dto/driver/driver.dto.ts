import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { VehicleType } from '../../utils/enums/vehicleType.enum.js';

export class DriverDto {
    @IsString()
    @IsOptional()
    name: string;

    @IsString()
    phoneNumber: string;

    @IsString()
    password: string;

    @IsEnum(VehicleType)
    vehicleType: VehicleType; // Type of vehicle the driver operates

    @IsString()
    vehicleNumber: string; // Vehicle number or license plate

    @IsString()
    @IsOptional()
    vehicleModel: string; // Vehicle model
}