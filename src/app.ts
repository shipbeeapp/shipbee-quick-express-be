import express, { Application, Request, Response } from "express";
import { AppDataSource } from "./config/data-source.js";
import {env} from "./config/environment.js";
import { seedDatabase } from "./seeders/initial.seeder.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import cors from "cors";
import session from 'express-session';
import { oauthStateStore } from "./controllers/auth.controller.js";
import path from "path";
import ejs from "ejs";
import { fileURLToPath } from "url";
import { itemType } from "./utils/enums/itemType.enum.js";
import { VehicleType } from "./utils/enums/vehicleType.enum.js";
import ShopSettingsService from "./services/shopSettings.service.js";

// Fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// import OrderService from "./services/order.service.js";
// import {Container} from "typedi";

class App {
  public app: Application;
  private PORT: number = Number(env.PORT) || 3000;
  // private orderService: OrderService = Container.get(OrderService);
  constructor(controllers: any) {
    this.app = express();
    // this.initializeDataSource();
    this.initializeMiddlewares();
    this.initializeControllers(controllers);
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(express.json()); // Example middleware for handling JSON data
    this.app.use(express.urlencoded({ extended: true })); // ✅ Handles form data
    this.app.use(cors({ origin: "*" }));
    this.app.use(session({
      secret: process.env.SESSION_SECRET || 'some_secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,       // must be true if using HTTPS (ngrok provides HTTPS)
        sameSite: 'none',   // important for Shopify embedded apps
        httpOnly: true,
      }
    }));
     // ---- VIEW ENGINE CONFIG ----
    this.app.engine("html", ejs.renderFile);
    
    this.app.set(
      "views",
      path.join(__dirname, "..", "private", "shopify")
    );

    this.app.set("view engine", "html");
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
      next();
});

  }

  // public async initialize(): Promise<void> {
  //   await this.initializeDataSource();
  // }

  public async initializeDataSource(): Promise<void> {
    try {
      if (AppDataSource.isInitialized) {
        console.log("Data Source already initializedd, skipping initialization.");
        return;
      }
      console.log("Initializing data source.....");
      await AppDataSource.initialize();
      await AppDataSource.runMigrations();
      await seedDatabase();
    } catch (error) {
      console.error("Failed during initialization", error);
      // If you're manually managing transactions, rollback here
      // Or close data source so next run starts fresh
      if (AppDataSource.isInitialized) await AppDataSource.destroy();
      throw error;
    }
  }


  private initializeControllers(controllers: any): void {
    controllers.forEach((controller: any) => {
      this.app.use('/api', controller.router);
    });

    this.app.get('/welcome', async (req: Request, res) => {
      console.log("Received request for /welcome");
      const { shop } = req.query;
      console.log("Shop query parameter:", shop);
      console.log({oauthStateStore});
      if (!oauthStateStore[shop as string]?.shopifyToken) {
        console.log("No Shopify token found in session, redirecting to /api/auth");
        return res.redirect(`/api/auth?shop=${shop}`); // start OAuth if missing
      }
      console.log("Shopify token found, sending welcome message");
      const shopSettingsService = new ShopSettingsService();
      const shopSettings = await shopSettingsService.getSettings(shop as string);
      res.render('welcome_page.html', { 
        shop,
        senderName: shopSettings?.senderName || "",
        pickupAddress: shopSettings?.pickupAddress || "",
        phone: shopSettings?.senderPhoneNumber || "",
        longitude: shopSettings?.longitude || "",
        latitude: shopSettings?.latitude || "",
        isNew: shopSettings ? false : true,
        itemTypes: Object.values(itemType),
        vehicleTypes: Object.values(VehicleType), 
      });
    });

    this.app.post('/api/settings/save', async (req: Request, res: Response) => {
      const shopSettingsService = new ShopSettingsService();
      const { shop, senderName, pickupAddress, phone, itemType, vehicleType, longitude, latitude } = req.body;

      console.log("Received settings save request:", { shop, senderName, pickupAddress, phone, itemType, vehicleType, longitude, latitude });
      let shopSettings = await shopSettingsService.getSettings(shop);
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

        await shopSettingsService.updateShopSettings(shop, shopSettings);
      }
      else {
        console.log("No existing shop settings, creating new...");
        await shopSettingsService.createShopSettings({
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
    });


    // ----------- 2. OAuth Start -----------
  //   this.app.get('/auth', (req, res) => {
  //     const shop = req.query.shop as string;
  //     if (!shop) return res.send('Missing shop parameter');

  //     const state = crypto.randomBytes(8).toString('hex');
  //     req.session!.shopifyState = state;

  //     const redirectUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&redirect_uri=${HOST}/auth/callback&state=${state}`;

  //     res.redirect(redirectUrl);
  // });
}

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }

  public listen(): void {
    this.app.listen(this.PORT, () => {
      console.log(`🚀 Server running on port: ${this.PORT}`);
    });
  }
}

export default App;