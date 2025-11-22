import { Driver } from '../../models/driver.model.js';
import { generatePhotoLink } from '../../utils/global.utils.js';
import { DriverType } from '../../utils/enums/driverType.enum.js';

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
            type: driver.driver_type,
            email: driver.driver_email,
            businessType: driver.driver_businessType,
            businessName: driver.driver_type === DriverType.BUSINESS ? driver.driver_businessName : driver.businessOwner_businessName,
            businessLocation: driver.driver_type === DriverType.BUSINESS ? driver.driver_businessLocation : driver.businessOwner_businessLocation,
            companyRepresentativeName: driver.driver_type === DriverType.BUSINESS ? driver.driver_companyRepresentativeName : driver.businessOwner_companyRepresentativeName,
            businessPhoneNumber: driver.driver_type === DriverType.BUSINESS ? driver.driver_businessPhoneNumber: driver.businessOwner_businessPhoneNumber,
            crPhoto: driver.driver_type === DriverType.BUSINESS ? generatePhotoLink(driver.driver_crPhoto) : driver.businessOwner_crPhoto ? generatePhotoLink(driver.businessOwner_crPhoto): null,
            taxId: driver.driver_type === DriverType.BUSINESS ? generatePhotoLink(driver.driver_taxId) : driver.businessOwner_taxId ? generatePhotoLink(driver.businessOwner_taxId) : null,
            companyLogo: driver.driver_type === DriverType.BUSINESS ? generatePhotoLink(driver.driver_companyLogo): driver.businessOwner_companyLogo ? generatePhotoLink(driver.businessOwner_companyLogo): null,
            invitedByBusiness: driver.businessOwner_id ? true : false,
            qidApprovalStatus: driver.driver_qidApprovalStatus,
            qidRejectionReason: driver.driver_qidRejectionReason,
            licenseApprovalStatus: driver.driver_licenseApprovalStatus,
            licenseRejectionReason: driver.driver_licenseRejectionReason,
            businessDocsApprovalStatus: driver.driver_businessDocsApprovalStatus,
            businessDocsRejectionReason: driver.driver_businessDocsRejectionReason,
            vehicle: driver.driver_type === DriverType.INDIVIDUAL ? {
                type: driver.vehicle_type,
                model: driver.vehicle_model,
                number: driver.vehicle_number,
                color: driver.vehicle_color,
                productionYear: driver.vehicle_productionYear,
                frontPhoto: generatePhotoLink(driver.vehicle_frontPhoto),
                backPhoto: generatePhotoLink(driver.vehicle_backPhoto),
                leftPhoto: generatePhotoLink(driver.vehicle_leftPhoto),
                rightPhoto: generatePhotoLink(driver.vehicle_rightPhoto),
                registrationFront: generatePhotoLink(driver.vehicle_registrationFront),
                registrationBack: generatePhotoLink(driver.vehicle_registrationBack),
                infoApprovalStatus: driver.vehicle_infoApprovalStatus,
                infoRejectionReason: driver.vehicle_infoRejectionReason,
            } : null,
            ordersCount: Number(driver.orderCount),
        };
    }

    static toResponseArray(drivers: Driver[]): any[] {
        return drivers.map(driver => this.toResponse(driver));
    }

    /**
 * Removes sensitive fields and attaches full photo URLs
 * for a single driver object.
 */
static mapDriverResponse = (driver: any) => {
  const {
    password,
    otp,
    businessName,
    businessLocation,
    crPhoto,
    taxId,
    type,
    companyRepresentativeName,
    ...rest
  } = driver;

  return {
    ...rest,
    qidFront: generatePhotoLink(rest.qidFront),
    qidBack: generatePhotoLink(rest.qidBack),
    licenseFront: generatePhotoLink(rest.licenseFront),
    licenseBack: generatePhotoLink(rest.licenseBack),
    profilePicture: generatePhotoLink(rest.profilePicture),
    vehicle: rest.vehicle
      ? {
          ...rest.vehicle,
          frontPhoto: generatePhotoLink(rest.vehicle.frontPhoto),
          backPhoto:  generatePhotoLink(rest.vehicle.backPhoto),
          leftPhoto: generatePhotoLink(rest.vehicle.leftPhoto),
          rightPhoto: generatePhotoLink(rest.vehicle.rightPhoto),
        }
      : null,
  };
};

/**
 * Maps an array of drivers using the mapDriverResponse util.
 */
static mapInvitedDriversResponse = (drivers: any[]) => {
  return drivers.map(driver => this.mapDriverResponse(driver));
};

}
