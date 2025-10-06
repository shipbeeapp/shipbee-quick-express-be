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

    @IsString()
    qidFront: string; // URL or path to the front side of the QID

    @IsString()
    qidBack: string; // URL or path to the back side of the QID

    @IsString()
    driverRegistrationFront: string; // URL or path to the front side of the driver's registration

    @IsString()
    driverRegistrationBack: string; // URL or path to the back side of the driver's registration

    @IsString()
    vehicleRegistrationFront: string; // URL or path to the front side of the vehicle's registration

    @IsString()
    vehicleRegistrationBack: string; // URL or path to the back side of the vehicle's registration
}