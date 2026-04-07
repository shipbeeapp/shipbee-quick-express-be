import { IsString } from "class-validator";

export class BusinessUserDto {
    @IsString()
    name: string;

    @IsString()
    email: string;

    @IsString()
    password: string;

    @IsString()
    companyName: string;

    @IsString()
    industry: string;

    @IsString()
    numOfDrivers: string;

    @IsString()
    numOfVehicles: string;
}