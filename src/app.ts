import express, { Application } from "express";
import { AppDataSource } from "./config/data-source.js";
import {env} from "./config/environment.js";
import { seedDatabase } from "./seeders/initial.seeder.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import cors from "cors";
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
      console.log("Initializing data source...");
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