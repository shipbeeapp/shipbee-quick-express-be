import express, { Application, Request, Response } from "express";
import { AppDataSource } from "./config/data-source.js";
import { env } from "./config/environment.js";
import { seedDatabase } from "./seeders/initial.seeder.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from 'express-session';
import { oauthStateStore } from "./controllers/auth.controller.js";
import path from "path";
import ejs from "ejs";
import { fileURLToPath } from "url";
import { itemType } from "./utils/enums/itemType.enum.js";
import { VehicleType } from "./utils/enums/vehicleType.enum.js";
import ShopSettingsService from "./services/shopSettings.service.js";
import { setupSwagger } from "./config/swagger.js";


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
    setupSwagger(this.app); // <-- Add here
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security headers
    this.app.use(helmet());

    this.app.use(
      express.json({
        verify: (req: any, res, buf) => {
          req.rawBody = buf; // Save raw request body
        }
      })
    );
    this.app.use(express.urlencoded({ extended: true })); // ✅ Handles form data
    const allowedOrigins = [
      'https://admin.staging.shipbee.io',
      'https://www.admin.staging.shipbee.io',
      'https://staging.shipbee.io',
      'https://www.staging.shipbee.io',
      'https://admin.shipbee.io',
      'https://www.admin.shipbee.io',
      'https://shipbee.io',
      'https://www.shipbee.io',
      'https://www.trucks.shipbee.io',
      'https://trucks.shipbee.io',
      'http://localhost:3000',
      'http://localhost:3010',
      'http://localhost:8080'
    ];

    this.app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin) return callback(null, true); // backend tools
        
          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
        
          return callback(new Error('CORS blocked'));
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );

    // Rate limiting
    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per window
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please try again later.' },
    });
    this.app.use(globalLimiter);
    this.app.use(session({
      secret: env.SESSION_SECRET,
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
      console.log({ oauthStateStore });
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

    this.app.get('/stay-active', (req: Request, res: Response) => {
      res.send('I am still active!');
    });
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