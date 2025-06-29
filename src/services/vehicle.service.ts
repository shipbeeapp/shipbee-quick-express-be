import { Service } from "typedi";
import { Vehicle } from "../models/vehicle.model.js";
import { AppDataSource } from "../config/data-source.js";

@Service()
export default class VehicleService {
  // This service can be expanded to include methods for managing vehicles
  // such as creating, updating, deleting, and retrieving vehicles.
  private vehicleRepository = AppDataSource.getRepository(Vehicle);
  
  // Example method to get all vehicles
  async getAllVehicles() {
    // Logic to retrieve all vehicles from the database
    // This would typically involve using a repository pattern with TypeORM
    return await this.vehicleRepository.find();
  }

  async getVehicleById(vehicleId: string, queryRunner?: any) {
    // Logic to retrieve a vehicle by its ID
    try {
        if (!queryRunner) return await this.vehicleRepository.findOne({ where: { id: vehicleId } });
        let vehicle = await queryRunner.manager.findOne(Vehicle, {
          where: { id: vehicleId }
        });
        if (!vehicle) {
          throw new Error(`Vehicle with ID ${vehicleId} not found`);
        }
        return vehicle;
    }
    catch (error) {
        console.error("Error fetching vehicle by ID:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
  }

  // Example method to create a new vehicle
  async createVehicle(vehicleData: any) {
    // Logic to create a new vehicle in the database
    // This would typically involve using a repository pattern with TypeORM
  }
}