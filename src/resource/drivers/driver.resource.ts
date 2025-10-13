import { Driver } from '../../models/driver.model.js';
import { generatePhotoLink } from '../../utils/global.utils.js';

export class DriverResource {
    static toResponse(driver: any): any {
        return {
            id: driver.driver_id,
            name: driver.driver_name,
            phoneNumber: driver.driver_phoneNumber,
            status: driver.driver_status,
            signUpStatus: driver.driver_signUpStatus,
            lastActiveAt: driver.driver_updatedAt,
            dateOfBirth: driver.driver_dateOfBirth,
            surname: driver.driver_surname,
            qid: driver.driver_qid,
            profilePicture: generatePhotoLink(driver.driver_profilePicture),
            qidFront: generatePhotoLink(driver.driver_qidFront),
            qidBack: generatePhotoLink(driver.driver_qidBack),
            licenseFront: generatePhotoLink(driver.driver_licenseFront),
            licenseBack: generatePhotoLink(driver.driver_licenseBack),
            licenseExpirationDate: driver.driver_licenseExpirationDate,
            vehicle: {
                type: driver.vehicle_type,
                model: driver.vehicle_model,
                number: driver.vehicle_number,
                frontPhoto: generatePhotoLink(driver.vehicle_frontPhoto),
                backPhoto: generatePhotoLink(driver.vehicle_backPhoto),
                leftPhoto: generatePhotoLink(driver.vehicle_leftPhoto),
                rightPhoto: generatePhotoLink(driver.vehicle_rightPhoto),
                registrationFront: generatePhotoLink(driver.vehicle_registrationFront),
                registrationBack: generatePhotoLink(driver.vehicle_registrationBack),
            },
            ordersCount: Number(driver.orderCount),
        };
    }

    static toResponseArray(drivers: Driver[]): any[] {
        return drivers.map(driver => this.toResponse(driver));
    }
}
