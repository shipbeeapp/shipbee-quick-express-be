import { Driver } from '../../models/driver.model.js';

export class DriverResource {
    static toResponse(driver: any): any {
        return {
            id: driver.driver_id,
            name: driver.driver_name,
            phoneNumber: driver.driver_phoneNumber,
            status: driver.driver_status,
            signUpStatus: driver.driver_signUpStatus,
            lastActiveAt: driver.driver_updatedAt,
            vehicle: {
                type: driver.vehicle_type,
                model: driver.vehicle_model,
                number: driver.vehicle_number,
            },
            ordersCount: Number(driver.orderCount),
        };
    }

    static toResponseArray(drivers: Driver[]): any[] {
        return drivers.map(driver => this.toResponse(driver));
    }
}
