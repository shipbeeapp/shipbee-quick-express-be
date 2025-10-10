import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { VehicleType } from '../../utils/enums/vehicleType.enum.js';
import DriverSignupStatus from '../../utils/enums/signupStatus.enum.js';

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

    @IsEnum(DriverSignupStatus)
    @IsOptional()
    signUpStatus: DriverSignupStatus; // Driver's signup status

    @IsString()
    qidFront: string; // URL or path to the front side of the QID

    @IsString()
    qidBack: string; // URL or path to the back side of the QID

    @IsString()
    licenseFront: string; // URL or path to the front side of the driver's license

    @IsString()
    licenseBack: string; // URL or path to the back side of the driver's license

    @IsString()
    registrationFront: string; // URL or path to the front side of the vehicle's registration

    @IsString()
    registrationBack: string; // URL or path to the back side of the vehicle's registration

    @IsString()
    profilePicture: string; // URL or path to the driver's profile picture

    @IsString()
    @IsOptional()
    surname: string;

    @IsString()
    dateOfBirth: string; // ISO date string

    @IsString()
    qid: string; // Qatar ID number

    @IsString()
    licenseExpirationDate: string; // ISO date string

    @IsString()
    leftPhoto: string; // URL or path to the left side photo of the vehicle

    @IsString()
    rightPhoto: string; // URL or path to the right side photo of the vehicle

    @IsString()
    frontPhoto: string; // URL or path to the front side photo of the vehicle

    @IsString()
    backPhoto: string; // URL or path to the back side photo of the vehicle
}