import { Service } from "typedi"
import { Pricing } from "../models/pricing.model.js"
import { AppDataSource } from "../config/data-source.js";
import { GetPricingDTO } from "../dto/pricing/getPricingDTO.dto.js";
import { ServiceSubcategoryName } from "../utils/enums/serviceSubcategory.enum.js";
import { LessThanOrEqual, MoreThan, MoreThanOrEqual } from "typeorm";
import { env } from "../config/environment.js";
import { getCountryIsoCode } from "../utils/dhl.utils.js";
import axios from "axios";

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
                  return {
                    totalCost: Number(currentPricing.baseCost) + (getPricingDTO.lifters ? getPricingDTO.lifters * Number(env.PER_LIFTER_COST) : 0)
                  } 
                }
            
                return {
                    totalCost: (
                  Number(currentPricing.baseCost) +
                  (getPricingDTO.distance - Number(currentPricing.thresholdDistance ?? currentPricing.maxDistance)) *
                    Number(currentPricing.additionalPerKm) + (getPricingDTO.lifters ? getPricingDTO.lifters * Number(env.PER_LIFTER_COST) : 0)
                )};
            } else if (getPricingDTO.serviceSubcategory == ServiceSubcategoryName.INTERNATIONAL) {
                if (getPricingDTO.shippingCompany === 'DHL') {
                    const params = {
                      accountNumber: env.DHL.ACCOUNT_NUMBER,
                      originCountryCode: getCountryIsoCode(getPricingDTO.fromCountry),
                      originCityName: getPricingDTO.fromCity,
                      destinationCountryCode: getCountryIsoCode(getPricingDTO.toCountry),
                      destinationCityName: getPricingDTO.toCity,
                      weight: getPricingDTO.weight,
                      length: getPricingDTO.length,
                      width: getPricingDTO.width,
                      height: getPricingDTO.height,
                      plannedShippingDate: getPricingDTO.plannedShippingDate,
                      isCustomsDeclarable: true,
                      unitOfMeasurement: "metric",
                    };
                    console.log('shipping date: ', getPricingDTO.plannedShippingDate);

                    const auth = {
                        username: env.DHL.API_KEY,
                        password: env.DHL.API_SECRET,
                    }
                    const response = await axios.get(env.DHL.DOMAIN, { params, auth });
                    const cost = response.data.products.find((product: any) => product.productName === "EXPRESS WORLDWIDE").find((price: any) => price.currencyType === "BILLC")?.price;
                    console.log('DHL pricing:', cost);
                    return {
                        totalCost: Number(cost),
                        estimatedDeliveryDays: response.data.products[0].deliveryCapabilities.totalTransitDays
                    };
                } else {
                    const currentPricing = await this.pricingRepository.findOne({
                        where: {
                            serviceSubcategory: ServiceSubcategoryName.INTERNATIONAL,
                            fromCountry: getPricingDTO.fromCountry,
                            toCountry: getPricingDTO.toCountry,
                            maxWeight: MoreThanOrEqual(getPricingDTO.weight),
                            isCurrent: true
                        },
                        order: { maxWeight: "ASC" } // Prefer exact matches over open-ended
                    });
                    if (!currentPricing) {
                        throw new Error('No pricing found for the given criteria');
                    }
                    const cost = Number(currentPricing.firstKgCost) + (getPricingDTO.weight - 1) * Number(currentPricing.additionalKgCost);
                    return {
                        totalCost: Number(cost.toFixed(1)),
                        estimatedDeliveryDays: currentPricing.transitTime
                    };
                }
            }
            else {
                throw new Error('Unsupported service subcategory'); 
            }
        } catch (error) {
            console.error('Error fetching current pricing:', error);
            throw new Error(`Error fetching current pricing: ${error.message}`);
        }
 }
 
 async getAllExpressPricings(getPricingDTO: GetPricingDTO) {
    try {
        const pricingList = [];
        // DHL Pricing
        const params = {
            accountNumber: env.DHL.ACCOUNT_NUMBER,
            originCountryCode: getCountryIsoCode(getPricingDTO.fromCountry),
            originCityName: getPricingDTO.fromCity,
            destinationCountryCode: getCountryIsoCode(getPricingDTO.toCountry),
            destinationCityName: getPricingDTO.toCity,
            weight: getPricingDTO.weight,
            length: getPricingDTO.length,
            width: getPricingDTO.width,
            height: getPricingDTO.height,
            plannedShippingDate: getPricingDTO.plannedShippingDate,
            isCustomsDeclarable: true,
            unitOfMeasurement: "metric",
        };
        console.log('shipping date: ', getPricingDTO.plannedShippingDate)
        const auth = {
            username: env.DHL.API_KEY,
            password: env.DHL.API_SECRET,
        }
        const response = await axios.get(env.DHL.DOMAIN, { params, auth });
        console.log('DHL response data:', response.data.products);
        const cost = response.data.products.find((product: any) => product.productName === "EXPRESS WORLDWIDE").totalPrice.find((price: any) => price.currencyType === "BILLC")?.price;
        const estimatedDeliveryDays =  response.data.products.find((product: any) => product.productName === "EXPRESS WORLDWIDE").deliveryCapabilities.totalTransitDays;
        console.log('DHL pricing:', cost, " estimated days: ", estimatedDeliveryDays);
        pricingList.push({
            carrier: 'DHL',
            totalCost: Number(cost),
            estimatedDeliveryDays
        });

        //Qatar Post
        const currentPricing = await this.pricingRepository.findOne({
            where: {
                serviceSubcategory: ServiceSubcategoryName.INTERNATIONAL,
                fromCountry: getPricingDTO.fromCountry,
                toCountry: getPricingDTO.toCountry,
                maxWeight: MoreThanOrEqual(getPricingDTO.weight),
                isCurrent: true
            },
            order: { maxWeight: "ASC" } // Prefer exact matches over open-ended
        });
        if (!currentPricing) {
            throw new Error('No pricing found for the given criteria');
        }
        const qpCost = Number(currentPricing.firstKgCost) + (getPricingDTO.weight - 1) * Number(currentPricing.additionalKgCost);
        pricingList.push({
            carrier: 'Qatar Post',
            totalCost: Number(qpCost.toFixed(1)),
            estimatedDeliveryDays: currentPricing.transitTime
        });

        return pricingList;
    } catch (error) {
        console.error('Error fetching DHL pricing:', error);
        throw new Error(`Error fetching DHL pricing: ${error.message}`);
    } 
}
}