import { Service, Container } from "typedi";
import { Vehicle } from "../models/vehicle.model.js";
import { AppDataSource } from "../config/data-source.js";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";
import PricingService from "./pricing.service.js";
import { ServiceSubcategoryName } from "../utils/enums/serviceSubcategory.enum.js";
import PromoCodeService from "./promoCode.service.js";
import { env } from "../config/environment.js";

@Service()
export default class VehicleService {
  // This service can be expanded to include methods for managing vehicles
  // such as creating, updating, deleting, and retrieving vehicles.
  private vehicleRepository = AppDataSource.getRepository(Vehicle);
  private pricingService = Container.get(PricingService);
  private promoCodeService = Container.get(PromoCodeService);
  
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

 async getVehicleInfo(distance: number, pickUpDate: string, lifters: number, userId?: string) {
  try {
    const vehicleImages = [
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Motorcycle_dsp9nw.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Sedan_Car_l8w1gn.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Pickup_Truck_2_Tons_dqmymz.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Pickup_Truck_3_Tons_nnvyrq.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Chiller_Truck_qlewn6.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Van_eumwn4.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Chiller_Truck_qlewn6.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Canter_Truck_l8vhbt.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Flat_Bed_Truck_crrd0d.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Low_Bed_Truck_gopie7.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Garbage_Removal_Truck_vdljnt.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Chiller_Van_w8gf6o.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Freezer_Van_e9wzef.png",

    ];

    const vehicleNames = Object.values(VehicleType);

    // Combine name and image in a single structure
    const vehicleData = vehicleNames.map((name, index) => ({
      name,
      image: vehicleImages[index],
    }));

    // Run all pricing lookups in parallel
    const pricingResults = await Promise.all(
      vehicleData.map(async (vehicle) => {
        try {
          const pricing = await this.pricingService.calculatePricing({
            vehicleType: vehicle.name,
            serviceSubcategory: ServiceSubcategoryName.PERSONAL_QUICK,
            distance,
            lifters
          });
          const afterPromoPricing = userId
            ? await this.promoCodeService.applyPromosToOrder(
                userId,
                pricing.totalCost,
                'view'
              )
            : { discount: 0, totalCost: pricing.totalCost };
          return { 
                  ...vehicle,
                  beforePromoPricing: pricing?.totalCost || null, 
                  afterPromoPricing: afterPromoPricing?.totalCost || null, 
                  isPromoApplied: afterPromoPricing.discount > 0 ? true : false,
                  discount: afterPromoPricing.discount || 0 
                };
        } catch (error) {
          console.warn(`No pricing found for ${vehicle.name}: ${error.message}`);
          return { ...vehicle, beforePromoPricing: null, afterPromoPricing: null, isPromoApplied: false, discount: 0 };
        }
      })
    );
    // console.log(pricingResults);
    // Apply motorcycle restrictions
    const results = pricingResults.map((vehicle) => {
      let disabled = false;
      let reason: string | null = null;

      if (vehicle.name === VehicleType.MOTORCYCLE) {
        // 🚫 Distance restriction
          if (distance > 15) {
            disabled = true;
            reason = "Distance exceeds 15KM limit";
          }

        // 🕒 Date restriction (June 1st - Sept 15th, 10AM-4PM)
        if (pickUpDate) {
          const pickupDateObj = new Date(pickUpDate);
          const month = pickupDateObj.getMonth() + 1;
          const day = pickupDateObj.getDate();
          const pickupHour = pickupDateObj.getHours();

          console.log({ month, day, pickupHour });
          // Check if date is between June 1st and Sept 15th
          // and time is between 10AM and 4PM

          const isInRestrictedDateRange =
            (month === 6 && day >= 1) ||
            month === 7 ||
            month === 8 ||
            (month === 9 && day <= 15);
          
          // console.log({ isInRestrictedDateRange });

          const isInRestrictedTime = pickupHour >= 10 && pickupHour < 16;
          // console.log({ isInRestrictedTime });

          if (isInRestrictedDateRange && isInRestrictedTime) {
            disabled = true;
            reason = reason
              ? `${reason} and not available June 1st - September 15th, 10AM-4PM`
              : "Not available June 1st - September 15th, 10AM-4PM";
          }
        }
      }

      else if (vehicle.name == VehicleType.FLAT_BED_TRAILER || vehicle.name == VehicleType.LOW_BED_TRAILER 
              || vehicle.name == VehicleType.GARBAGE_REMOVAL_TRUCK || vehicle.name == VehicleType.CHILLER_VAN
              || vehicle.name == VehicleType.FREEZER_VAN || vehicle.name == VehicleType.CANTER_TRUCK) 
      {
        reason = "Price at request";
      }
      console.log({vehicle});
      return {
        name: vehicle.name,
        image: vehicle.image,
        lifterTotalCost: lifters * Number(env.PER_LIFTER_COST || 0), 
        vehicleTotalCost: vehicle.afterPromoPricing ? Number((vehicle.beforePromoPricing - (lifters * Number(env.PER_LIFTER_COST || 0))).toFixed(2)) : null,
        totalbeforePromoPricing: Number(vehicle.beforePromoPricing?.toFixed(2)),
        afterPromoPricing: Number(vehicle.afterPromoPricing?.toFixed(2)),
        isPromoApplied: vehicle.isPromoApplied,
        discount: Number(vehicle.discount?.toFixed(2)),
        disabled,
        reason,
      };
    });

    return results;
  } catch (error) {
    console.error("Error fetching vehicle info:", error);
    throw new Error("Could not fetch vehicle info");
  }
}
  async getVehicleNamesImages() {
    try {
      const vehicleImages = [
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Motorcycle_dsp9nw.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Sedan_Car_l8w1gn.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Pickup_Truck_2_Tons_dqmymz.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Pickup_Truck_3_Tons_nnvyrq.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Chiller_Truck_qlewn6.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Van_eumwn4.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Chiller_Truck_qlewn6.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Canter_Truck_l8vhbt.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Flat_Bed_Truck_crrd0d.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Low_Bed_Truck_gopie7.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473702/Garbage_Removal_Truck_vdljnt.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Chiller_Van_w8gf6o.png",
      "https://res.cloudinary.com/dgzd4faca/image/upload/v1760473703/Freezer_Van_e9wzef.png",

    ];

    const vehicleNames = Object.values(VehicleType);

    // Combine name and image in a single structure
    const vehicleData = vehicleNames.map((name, index) => ({
      name,
      image: vehicleImages[index],
    }));

    return vehicleData;
  }
  catch (error) {
      console.error("Error fetching vehicle names and images:", error);
      throw new Error("Could not fetch vehicle names and images");
  }
  }
}