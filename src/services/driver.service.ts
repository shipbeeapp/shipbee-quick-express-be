import { Service } from "typedi";
import { AppDataSource } from "../config/data-source.js";
import { Driver } from "../models/driver.model.js";
import { Vehicle } from "../models/vehicle.model.js";
import { UpdateDriverDto } from "../dto/driver/updateDriver.dto.js";
import { Not } from "typeorm";

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
                        model: data.vehicleModel, // Assuming vehicleModel is part of the data
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

    async findDriverById(driverId: string): Promise<Driver | null> {
        try {
            return await this.driverRepository.findOne({
                where: { id: driverId },
            });
        } catch (error) {
            console.error("Error finding driver by ID:", error);
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

    async updateDriver(driverId: string, driverData: UpdateDriverDto) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        
        try {
            const driverRepository = queryRunner.manager.getRepository(Driver);
            const vehicleRepository = queryRunner.manager.getRepository(Vehicle);

            const driver = await driverRepository.findOne({
                where: { id: driverId },
                relations: ['vehicle'], // make sure vehicle relation is loaded
              });
            
            if (!driver) {
                throw new Error(`Driver with ID ${driverId} not found`);
            }
            // Update vehicle if vehicleType is provided and driver has a vehicle
            if (driverData.vehicleType && driver.vehicle) {
                console.log("Updating vehicle type for driver:", driverId, "with: ", driver.vehicle.type, "to", driverData.vehicleType);
                driver.vehicle.type = driverData.vehicleType;
                console.log("Vehicle type before saving:", driver.vehicle);
                await vehicleRepository.save(driver.vehicle);
                console.log("Vehicle type updated successfully");
            }

            if (driverData.phoneNumber) {
                // Check if the new phone number already exists for another driver
                const existingDriver = await driverRepository.findOne({
                    where: { phoneNumber: driverData.phoneNumber, id: Not(driverId) }
                });
                if (existingDriver) {
                    throw new Error(`Driver with phone number ${driverData.phoneNumber} already exists`);
                }
            }
          
            // Remove vehicleType from driverData to avoid assigning it directly
            const { vehicleType, ...rest } = driverData;
        
            // Update driver fields
            Object.assign(driver, rest);
        
            await driverRepository.save(driver);
            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error("Error updating driver:", error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
    async findAllDrivers(): Promise<Driver[]> {
        try {
            return await this.driverRepository.find({
                relations: ['vehicle'], // Include vehicle relation if needed
            });
        } catch (error) {
            console.error("Error fetching all drivers:", error);
            throw error;
        }
    }
}