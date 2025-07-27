import { Service } from "typedi";
import { AppDataSource } from "../config/data-source.js";
import { Driver } from "../models/driver.model.js";
import { Vehicle } from "../models/vehicle.model.js";

@Service()
export default class DriverService {
    private driverRepository = AppDataSource.getRepository(Driver);
    private vehicleRepository = AppDataSource.getRepository(Vehicle);

    async findOrCreateDriver(data: any, queryRunner?: any): Promise<any> {
        try {
            const manager = queryRunner ? queryRunner.manager.getRepository(Driver) : this.driverRepository;
            const vehicleManager = queryRunner ? queryRunner.manager.getRepository(Vehicle) : this.vehicleRepository;
            let driver;
            let vehicle;
            console.log("findOrCreateDriver called with data:", data);
            driver = await this.driverRepository.findOneBy({ phoneNumber: data.phoneNumber });
            
            if (!driver) {
                // Create new driver
                vehicle = await vehicleManager.findOne({
                    where: { type: data.vehicleType, number: data.vehicleNumber },
                    relations: ["driver"]
                });
    
                if (vehicle && vehicle.driver) {
                    throw new Error(`Vehicle with number ${data.vehicleNumber} is already linked to another driver`);
                }

                // If vehicle doesn't exist, create it
                if (!vehicle) {
                    vehicle = vehicleManager.create({
                        type: data.vehicleType,
                        number: data.vehicleNumber,
                        // add other vehicle fields if needed
                    });
                    vehicle = await vehicleManager.save(vehicle);
                }
                // Create new driver and assign vehicle
                const newDriver = manager.create({
                    ...data,
                    vehicle: vehicle
                });
                driver = await manager.save(newDriver);
              }
              else {
                throw new Error(`Driver with phone number ${data.phoneNumber} already exists`);
              }
            return {driver, vehicleType: vehicle.type};
        } catch (error) {
            console.error("Error in findOrCreateDriver:", error);
            throw error;
        }
    }

    async findDriverByPhone(phoneNumber: string): Promise<Driver | null> {
        try {
            return await this.driverRepository.findOne({
                where: { phoneNumber },
                relations: ["vehicle"],
            });
        } catch (error) {
            console.error("Error finding driver by phone:", error);
            throw error;
        }
    }

    async saveDriver(driver: Driver): Promise<Driver> {
        try {
            return await this.driverRepository.save(driver);
        } catch (error) {
            console.error("Error saving driver:", error);
            throw error;
        }
    }
}