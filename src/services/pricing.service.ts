import { Service } from "typedi"
import { Pricing } from "../models/pricing.model.js"
import { AppDataSource } from "../config/data-source.js";
import { GetPricingDTO } from "../dto/pricing/getPricingDTO.dto.js";
import { ServiceSubcategoryName } from "../utils/enums/serviceSubcategory.enum.js";
import { LessThanOrEqual, MoreThan } from "typeorm";
import validateDto from "../middlewares/validation.middleware.js";
    
@Service()
export default class PricingService {
    private pricingRepository = AppDataSource.getRepository(Pricing);

    async createPricing(pricingData: Partial<Pricing>[], queryRunner?: any) {
        try {
            const manager = queryRunner ? queryRunner.manager.getRepository(Pricing) : this.pricingRepository;
            const newPricing = manager.create(pricingData);
            await manager.save(newPricing);
            return newPricing;
        } catch (error) {
            console.error('Error creating pricing:', error);
            throw new Error('Error creating pricing: ' + error.message);
        }
    }

    async updatePricing(id: string, pricingData: Partial<Pricing>) {
        try {
            const existingPricing = await this.pricingRepository.findOneBy({ id });
            if (!existingPricing) {
                throw new Error('Pricing not found');
            }

            // Mark old pricing as not current
            existingPricing.isCurrent = false;
            await this.pricingRepository.save(existingPricing);

            // Create new pricing row with new data and isCurrent true
            const newPricing = this.pricingRepository.create({
                ...pricingData,
            });
            await this.pricingRepository.save(newPricing);
        } catch (error) {
            console.error('Error updating pricing:', error);
            throw new Error('Error updating pricing: ' + error.message);
        }
    }

    async calculatePricing(getPricingDTO: GetPricingDTO) {
        try {    
            if (getPricingDTO.serviceSubcategory == ServiceSubcategoryName.PERSONAL_QUICK) {
                const currentPricing = await this.pricingRepository.findOne({
                    where: [
                    {
                        serviceSubcategory: ServiceSubcategoryName.PERSONAL_QUICK,
                        vehicleType: getPricingDTO.vehicleType,
                        minDistance: LessThanOrEqual(getPricingDTO.distance),
                        maxDistance: MoreThan(getPricingDTO.distance),
                        isCurrent: true
                    },
                    {
                      serviceSubcategory: ServiceSubcategoryName.PERSONAL_QUICK,
                      vehicleType: getPricingDTO.vehicleType,
                      minDistance: LessThanOrEqual(getPricingDTO.distance),
                      maxDistance: null, // open-ended
                      isCurrent: true,
                    },
                    
                ],
                order: { maxDistance: "DESC" } // Prefer exact matches over open-ended
                });
                console.log(currentPricing);
                if (!currentPricing) {
                    throw new Error('No pricing found for the given criteria');
                }
                if (getPricingDTO.distance <= Number(currentPricing.thresholdDistance ?? currentPricing.maxDistance)) {
                  return Number(currentPricing.baseCost);
                }
            
                return (
                  Number(currentPricing.baseCost) +
                  (getPricingDTO.distance - Number(currentPricing.thresholdDistance ?? currentPricing.maxDistance)) *
                    Number(currentPricing.additionalPerKm)
                );
            } else if (getPricingDTO.serviceSubcategory == ServiceSubcategoryName.INTERNATIONAL) {
                const currentPricing = await this.pricingRepository.findOne({
                    where: {
                        serviceSubcategory: ServiceSubcategoryName.INTERNATIONAL,
                        fromCountry: getPricingDTO.fromCountry,
                        toCountry: getPricingDTO.toCountry,
                        maxWeight: MoreThan(getPricingDTO.weight),
                        isCurrent: true
                    },
                    order: { maxWeight: "ASC" } // Prefer exact matches over open-ended
                });
                if (!currentPricing) {
                    throw new Error('No pricing found for the given criteria');
                }
                const cost = Number(currentPricing.firstKgCost) + (getPricingDTO.weight - 1) * Number(currentPricing.additionalKgCost);
                return Number(cost.toFixed(1));
            }
            else {
                throw new Error('Unsupported service subcategory'); 
            }
        } catch (error) {
            console.error('Error fetching current pricing:', error);
            throw new Error(`Error fetching current pricing: ${error.message}`);
        }
 }   
}