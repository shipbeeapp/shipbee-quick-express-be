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

    this.app.get('/welcome', (req: Request, res) => {
      console.log("Received request for /welcome");
      const { shop } = req.query;
      console.log("Shop query parameter:", shop);
      console.log({oauthStateStore});
      if (!oauthStateStore[shop as string]?.shopifyToken) {
        console.log("No Shopify token found in session, redirecting to /api/auth");
        return res.redirect(`/api/auth?shop=${shop}`); // start OAuth if missing
      }
      console.log("Shopify token found, sending welcome message");
      res.render('welcome_page.html', { 
        shop,
        senderName: "",
        pickupAddress: "",
        phone: "",
        itemTypes: Object.values(itemType),
        vehicleTypes: Object.values(VehicleType), 
      });
    });

    this.app.post('/api/settings/save', async (req: Request, res: Response) => {
      const { shop, senderName, pickupAddress, phone, itemType, vehicleType } = req.body;

      console.log("Received settings save request:", { shop, senderName, pickupAddress, phone, itemType, vehicleType });
    
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