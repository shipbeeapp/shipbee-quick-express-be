import { Router } from 'express';
import {Container} from 'typedi';
import ShopSettingsService from '../services/shopSettings.service.js';

export class ShopSettingsController {
    public path = '/shop-settings';
    public router: Router = Router(); 
    private shopSettingsService = Container.get(ShopSettingsService)

    constructor() {

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Define your routes here
    this.router.post(this.path, this.saveOrUpdateSettings.bind(this));
  }

    private async saveOrUpdateSettings(req, res) {
        // Implementation for saving or updating shop settings
        const { shop, senderName, pickupAddress, phone, itemType, vehicleType, longitude, latitude } = req.body;    
        console.log("Received settings save request:", { shop, senderName, pickupAddress, phone, itemType, vehicleType, longitude, latitude });
        let shopSettings = await this.shopSettingsService.getSettings(shop);
        if (shopSettings) {
            console.log("Shop settings exist, updating...");
            // Update existing
            if (senderName !== undefined && senderName !== "") shopSettings.senderName = senderName;
            if (pickupAddress !== undefined && pickupAddress !== "") shopSettings.pickupAddress = pickupAddress;
            if (phone !== undefined && phone !== "") shopSettings.senderPhoneNumber = phone;
            if (itemType !== undefined && itemType !== "") shopSettings.itemType = itemType;
            if (vehicleType !== undefined && vehicleType !== "") shopSettings.vehicleType = vehicleType;
            if (latitude !== undefined && latitude !== "") shopSettings.latitude = latitude;
            if (longitude !== undefined && longitude !== "") shopSettings.longitude = longitude;  
            await this.shopSettingsService.updateShopSettings(shop, shopSettings);
            console.log("Shop settings updated successfully for shop:", shop);
        }
        else {
            console.log("No existing shop settings, creating new...");
            await this.shopSettingsService.createShopSettings({
              shopDomain: shop,
              senderName,
              pickupAddress,
              senderPhoneNumber: phone,
              itemType,
              vehicleType,
              longitude,
              latitude
            });
            console.log("Shop settings saved successfully for shop:", shop);
        }

        res.redirect(`/welcome?shop=${shop}`);
    }


}