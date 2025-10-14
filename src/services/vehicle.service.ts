import { Service } from "typedi";
import { Vehicle } from "../models/vehicle.model.js";
import { AppDataSource } from "../config/data-source.js";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";

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

  async getAllVehicleTypes() {
    // Logic to retrieve all vehicle types
    // This could be a static list or fetched from the database
    return Object.values(VehicleType);
  }

  async getVehicleNamesAndImages() {
    try {
      const vehicleImages = [
        "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Motorcycle_dsp9nw.png",
        "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Sedan_Car_l8w1gn.png",
        "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Pickup_Truck_2_Tons_dqmymz.png",
        "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Pickup_Truck_3_Tons_nnvyrq.png",
        "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Chiller_Truck_qlewn6.png",
        "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Canter_Truck_l8vhbt.png",
        "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Van_eumwn4.png",
        "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Chiller_Van_w8gf6o.png",
        "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Freezer_Van_e9wzef.png",
        "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Flat_Bed_Truck_crrd0d.png",
        "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Low_Bed_Truck_gopie7.png",
        "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Garbage_Removal_Truck_vdljnt.png",
      ];
      const vehicleNames = Object.values(VehicleType);
      const vehicleNamesAndImages = vehicleNames.map((name, index) => ({
        name,
        image: vehicleImages[index], // Fallback image
      }));
      return vehicleNamesAndImages;

    } catch (error) {
        console.error("Error fetching vehicle names and images:", error);
        throw new Error("Could not fetch vehicle names and images");
    }
  }
}