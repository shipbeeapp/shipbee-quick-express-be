import { userType } from "../../utils/enums/userType.enum.js";
import { User } from "../../models/user.model.js";

export class UserResponseDto {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    createdAt: Date;
    updatedAt: Date;
    companyName: string;
    type: userType;
    hasLoggedInQuick?: boolean;
    hasLoggedInExpress?: boolean;
}

export function toUserResponseDto(user: User): UserResponseDto {
    const userResponseDto = new UserResponseDto();
    userResponseDto.id = user.id;
    userResponseDto.name = user.name;
    userResponseDto.email = user.email;
    userResponseDto.phoneNumber = user.phoneNumber;
    userResponseDto.createdAt = user.createdAt;
    userResponseDto.updatedAt = user.updatedAt;
    userResponseDto.companyName = user.companyName;
    userResponseDto.type = user.type;
    userResponseDto.hasLoggedInQuick = user.hasLoggedInQuick;
    userResponseDto.hasLoggedInExpress = user.hasLoggedInExpress;
    return userResponseDto;
}