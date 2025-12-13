import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { VehicleType } from '../../utils/enums/vehicleType.enum.js';

export class UpdateDriverDto {
    @IsString()
    @IsOptional()
    name: string;

    @IsString()
    @IsOptional()
    phoneNumber: string;

    @IsString()
    @IsOptional()
    profilePicture: string; // URL to the driver's profile picture

    @IsEnum(VehicleType)
    @IsOptional()
    vehicleType: VehicleType; // Type of vehicle the driver operates

    @IsString()
    @IsOptional()
    fcmToken: string; // FCM token for push notifications
}