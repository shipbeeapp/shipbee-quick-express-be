import { Driver } from '../../models/driver.model.js';

export class DriverResource {
    static toResponse(driver: Driver): any {
        return {
            id: driver.id,
            name: driver.name,
            phoneNumber: driver.phoneNumber,
            vehicle: {
                type: driver.vehicle?.type,
                model: driver.vehicle?.model,
                number: driver.vehicle?.number,
            },
        };
    }

    static toResponseArray(drivers: Driver[]): any[] {
        return drivers.map(driver => this.toResponse(driver));
    }
}
