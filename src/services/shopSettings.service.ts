import { Service } from "typedi";
import { ShopSettings } from "../models/shopSettings.model.js";
import { AppDataSource } from "../config/data-source.js";

@Service()
export default class ShopSettingsService {
  private shopSettingsRepository = AppDataSource.getRepository(ShopSettings);

  async createShopSettings(data: Partial<ShopSettings>): Promise<ShopSettings> {
    let shopSettings = await this.shopSettingsRepository.findOneBy({ shopDomain: data.shopDomain });
    if (shopSettings) {
      throw new Error('Shop settings for this domain already exist');
    } else {
      shopSettings = this.shopSettingsRepository.create(data);
    }
    return await this.shopSettingsRepository.save(shopSettings);
  }

  async updateShopSettings(shopDomain: string, data: Partial<ShopSettings>): Promise<ShopSettings> {
    let shopSettings = await this.shopSettingsRepository.findOneBy({ shopDomain });
    if (!shopSettings) {
      throw new Error('Shop settings not found');
    }
    Object.assign(shopSettings, data);
    return await this.shopSettingsRepository.save(shopSettings);
  }


  async getSettings(shopDomain: string): Promise<ShopSettings | null> {
      return await this.shopSettingsRepository.findOneBy({ shopDomain });
  }
}

