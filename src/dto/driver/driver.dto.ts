import { IsString, IsOptional, IsEnum, IsInt, MaxLength } from 'class-validator';
import { Max, Min, Matches } from 'class-validator';
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

    @IsString({message: "Plate number must not be empty"})
    @Matches(/^\d+$/, {
      message: "Plate number must contain only digits",
    })
    @MaxLength(6, {
      message: "Plate number must be at most 6 digits long",
    })
    vehicleNumber: string; // Vehicle number or license plate

    @IsString()
    @IsOptional()
    vehicleModel: string; // Vehicle model

    @IsString()
    @IsOptional()
    color: string; // Vehicle color

    @IsInt({ message: "Production year must be an integer" })
    @IsOptional()
    @Min(1900, { message: "Production year cannot be before 1900" })
    @Max(new Date().getFullYear() + 1, {
      message: `Production year cannot be after ${new Date().getFullYear() + 1}`,
    })
    productionYear: number; // Vehicle production year


    @IsEnum(DriverSignupStatus)
    @IsOptional()
    signUpStatus: DriverSignupStatus; // Driver's signup status

    @IsString()
    @IsOptional()
    qidFront: string; // URL or path to the front side of the QID

    @IsString()
    @IsOptional()
    qidBack: string; // URL or path to the back side of the QID

    @IsString()
    @IsOptional()
    licenseFront: string; // URL or path to the front side of the driver's license

    @IsString()
    @IsOptional()
    licenseBack: string; // URL or path to the back side of the driver's license

    @IsString()
    @IsOptional()
    registrationFront: string; // URL or path to the front side of the vehicle's registration

    @IsString()
    @IsOptional()
    registrationBack: string; // URL or path to the back side of the vehicle's registration

    @IsString()
    @IsOptional()
    profilePicture: string; // URL or path to the driver's profile picture

    @IsString()
    @IsOptional()
    surname: string;

    @IsString()
    @IsOptional()
    dateOfBirth: string; // ISO date string

    @IsString()
    @IsOptional()
    qid: string; // Qatar ID number

    @IsString()
    @IsOptional()
    licenseExpirationDate: string; // ISO date string

    @IsString()
    @IsOptional()
    leftPhoto: string; // URL or path to the left side photo of the vehicle

    @IsString()
    @IsOptional()
    rightPhoto: string; // URL or path to the right side photo of the vehicle

    @IsString()
    @IsOptional()
    frontPhoto: string; // URL or path to the front side photo of the vehicle

    @IsString()
    @IsOptional()
    backPhoto: string; // URL or path to the back side photo of the vehicle
}