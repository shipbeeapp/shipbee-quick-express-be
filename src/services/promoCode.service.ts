import { Service, Container } from "typedi";
import { AppDataSource } from "../config/data-source.js";
import { PromoCode } from "../models/promoCode.model.js";
import { UserPromoCode } from "../models/userPromoCode.model.js";
import { User } from "../models/user.model.js";
import { DiscountType } from "../utils/enums/discountType.enum.js";
import UserService from "./user.service.js";

@Service()
export default class PromoCodeService {
    private promoCodeRepository = AppDataSource.getRepository(PromoCode);
    private userPromoCodeRepository = AppDataSource.getRepository(UserPromoCode);
    private userService = Container.get(UserService);

    async createPromoCode(promoCodeData: Partial<PromoCode>, queryRunner?: any) {
        try {
            const manager = queryRunner ? queryRunner.manager.getRepository(PromoCode) : this.promoCodeRepository;
            const newPromoCode = manager.create(promoCodeData);
            await manager.save(newPromoCode);
            return newPromoCode;
        } catch (error) {
            console.error('Error creating promo code:', error);
            throw new Error('Error creating promo code: ' + error.message);
        }
    }

    async getPromoCodeByCode(code: string) {
        try {
            const promoCode = await this.promoCodeRepository.findOne({ where: { code } });
            return promoCode;
        } catch (error) {
            console.error('Error fetching promo code by code:', error);
            throw new Error('Error fetching promo code: ' + error.message);
        }
    }

    async IsPromoCodeActive(code: string) {
        const promoCode = await this.getPromoCodeByCode(code);
        if (!promoCode) {
            return false;
        }
        if (!promoCode.isActive) {
            return false;
        }
        return true;
    }

    async applyPromoOnSignup(userId: string, promoCodeInput: string) {

        if (!promoCodeInput) throw new Error("No promocode provided"); // No code entered, skip

        const promo = await this.promoCodeRepository.findOne({
          where: { code: promoCodeInput },
        });
    
        if (!promo) {
          throw new Error("Promo code not found");
        }
        console.log("Promo found:", promo);
        if (!promo.isActive) {
          throw new Error("Promo code is inactive");
        }
        // Optional: check if promo is active based on validFrom/validTo
        const now = new Date();
        if (
          (promo.validFrom && promo.validFrom > now) ||
          (promo.validTo && promo.validTo < now)
        ) {
          console.log("promo validity dates:", promo.validFrom, promo.validTo);
          throw new Error("Promo code is not active");
        }
    
        const user = await this.userService.getUserById(userId);
        if (!user) {
          throw new Error("User not found");
        }
    
        // Check if user already has this promo code assigned
        const existingUserPromo = await this.userPromoCodeRepository.findOne({
          where: { user: { id: userId }, promoCode: { id: promo.id } },
        });
        if (existingUserPromo) {
          throw new Error("Promo code already assigned to user");
        }
        // Assign promo code to the user
        const userPromo = this.userPromoCodeRepository.create({
          user,
          promoCode: promo,
        });
    
        await this.userPromoCodeRepository.save(userPromo);
    
        return {
            message: "Promo code applied successfully",
            userId: user.id,
            promoCode: promo.code,
            discount: {
                type: promo.discountType,
                value: Number(promo.discountValue),
                description: promo.description,
                validTo: promo.validTo
            }
        };
    }

    async applyPromosToOrder(userId: string, totalCost: number, type: string = 'order'): Promise<any> {

        // Fetch promo assigned to user
        const userPromos = await this.userPromoCodeRepository.find({
          where: { user: { id: userId } },
          relations: ["promoCode"],
        });
    
        if (!userPromos) return {
            error: "No promo code assigned to user"
        }
        let discount = 0;
        const promoCodeStatus = [];
        for (const userPromo of userPromos) {
            const promo = userPromo.promoCode;

            if (!promo.isActive) {
                promoCodeStatus.push({
                    promoCode: promo.code,
                    status: "Promo code not active anymore"
                });
                continue;
            }
            
            // Check if usage limit reached
            if (userPromo.usageCount >= promo.usageLimit) {
                promoCodeStatus.push({
                    promoCode: promo.code,
                    status: "Usage limit reached"
                });
                continue;
            }
        
            // Apply discount
            
            if (promo.discountType === DiscountType.FIXED) {
              discount = promo.discountValue;
            } else if (promo.discountType === DiscountType.PERCENTAGE) {
              discount = Math.min(
                (totalCost * promo.discountValue) / 100,
                promo.maxDiscount ?? Number.MAX_SAFE_INTEGER
              );
            }
        
            // Update order total
            totalCost = totalCost - discount;
    
        
            // Increment usage count
            if (type === 'order') {
                userPromo.usageCount += 1;
                await this.userPromoCodeRepository.save(userPromo);
            }
            promoCodeStatus.push({
                promoCode: promo.code,
                status: "Applied",
                discountApplied: discount
            });
        }
        console.log({promoCodeStatus});
        return { totalCost, discount, promoCodeStatus };
    }

    async updatePromoCode(promoCodeId: string, updateData: Partial<PromoCode>) {
        try {
            const promoCode = await this.promoCodeRepository.findOne({ where: { id: promoCodeId } });
            if (!promoCode) {
                throw new Error('Promo code not found');
            }
            Object.assign(promoCode, updateData);
            await this.promoCodeRepository.save(promoCode);
            return promoCode;
        } catch (error) {
            console.error('Error updating promo code:', error);
            throw new Error('Error updating promo code: ' + error.message);
        }
    }
}