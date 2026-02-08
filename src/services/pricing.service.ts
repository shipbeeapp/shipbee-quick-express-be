import { Service } from "typedi"
import { Pricing } from "../models/pricing.model.js"
import { AppDataSource } from "../config/data-source.js";
import { GetPricingDTO } from "../dto/pricing/getPricingDTO.dto.js";
import { ServiceSubcategoryName } from "../utils/enums/serviceSubcategory.enum.js";
import { LessThanOrEqual, MoreThan, MoreThanOrEqual } from "typeorm";
import { env } from "../config/environment.js";
import { getCountryIsoCode } from "../utils/dhl.utils.js";
import axios from "axios";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";
import { UserPricing } from "../models/userPricing.model.js";
import { User } from "../models/user.model.js";

@Service()
export default class PricingService {
    private pricingRepository = AppDataSource.getRepository(Pricing);
    private userPricingRepository = AppDataSource.getRepository(UserPricing)

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

    async createUserPricing(pricingData: Partial<UserPricing>[], queryRunner?: any) {
        try {
            const manager = queryRunner ? queryRunner.manager.getRepository(UserPricing) : this.userPricingRepository;
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

    getPersonalQuickWhere(getPricingDto: GetPricingDTO) {
        return [
          {
            serviceSubcategory: ServiceSubcategoryName.PERSONAL_QUICK,
            vehicleType: getPricingDto.vehicleType,
            minDistance: LessThanOrEqual(getPricingDto.distance),
            maxDistance: MoreThan(getPricingDto.distance),
            isCurrent: true,
          },
          {
            serviceSubcategory: ServiceSubcategoryName.PERSONAL_QUICK,
            vehicleType: getPricingDto.vehicleType,
            minDistance: LessThanOrEqual(getPricingDto.distance),
            maxDistance: null,
            isCurrent: true,
          },
        ];
    }

    async getClientPersonalQuickPricing(getPricingDto: GetPricingDTO) {
        if (!getPricingDto.userId) return null;

        return this.userPricingRepository.findOne({
          where: this.getPersonalQuickWhere(getPricingDto).map(where => ({
            ...where,
            userId: getPricingDto.userId,
          })),
          order: { maxDistance: "DESC" },
        });
    }


    async calculatePricing(getPricingDTO: GetPricingDTO) {
        try {    
            if (getPricingDTO.serviceSubcategory == ServiceSubcategoryName.PERSONAL_QUICK) {
                const basePricing = await this.pricingRepository.findOne({
                    where: this.getPersonalQuickWhere(getPricingDTO),
                    order: { maxDistance: "DESC" } // Prefer exact matches over open-ended
                });
                console.log(basePricing);
                if (!basePricing) {
                    throw new Error('No pricing found for the given criteria');
                }
                const clientPricing = await this.getClientPersonalQuickPricing(getPricingDTO);
                console.log("client pricing: ", JSON.stringify(clientPricing, null, 2))
                const currentPricing = clientPricing ?? basePricing
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
                    const response = await axios.get(env.DHL.DOMAIN + "/rates", { params, auth });
                    const cost = response.data.products.find((product: any) => product.productName === "EXPRESS WORLDWIDE").totalPrice.find((price: any) => price.currencyType === "BILLC")?.price;
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
            console.error(error.response?.data?.message);
            throw new Error(`Error fetching current pricing: ${error.message} ${error.response?.data?.detail || ''}`.trim());
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
            const response = await axios.get(env.DHL.DOMAIN + "/rates", { params, auth });
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
                console.error(`No pricing Found for given criteria...from ${getPricingDTO.fromCountry} to ${getPricingDTO.toCountry} `)
            }
            else {
                const qpCost = Number(currentPricing.firstKgCost) + (getPricingDTO.weight - 1) * Number(currentPricing.additionalKgCost);
                pricingList.push({
                    carrier: 'Qatar Post',
                    totalCost: Number(qpCost.toFixed(1)),
                    estimatedDeliveryDays: currentPricing.transitTime
                });
            }
            return pricingList;
        } catch (error) {
            console.error('Error fetching DHL pricing:', error);
            throw new Error(`Error fetching DHL pricing: ${error.message}`);
        } 
    }

    async getAllQuickPricings(distance: number, lifters: number) {
        const vehicleNames = Object.values(VehicleType).filter(type => type != VehicleType.GARBAGE_REMOVAL_TRUCK);
        console.log("vehicle names")
        console.log(vehicleNames)
        const pricings = (await Promise.all(
            vehicleNames.map(async (vehicleName) => {
              try {
                console.log(vehicleName)
                console.log("distance: ", distance)
                console.log("lifters: ", lifters)
                if (distance > 15 && vehicleName == VehicleType.MOTORCYCLE) {
                    console.warn('Max for motorcycle is 15km')
                }
                else {
                const pricing = await this.calculatePricing({
                  vehicleType: vehicleName,
                  serviceSubcategory: ServiceSubcategoryName.PERSONAL_QUICK,
                  distance,
                  lifters
                });

                return {
                    vehicleType: vehicleName,
                    totalCost: pricing.totalCost
                }
            }
              } catch (err) {
                  console.warn(`No pricing found for ${vehicleName}: ${err.message}`);
              }
            }
           )
         )
        ).filter(Boolean);
     return pricings;
    }
}