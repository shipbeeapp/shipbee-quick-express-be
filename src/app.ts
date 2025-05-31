import express, { Application } from "express";
import { AppDataSource } from "./config/data-source.js";
import {env} from "./config/environment.js";
import { seedDatabase } from "./seeders/initial.seeder.js";
import errorMiddleware from "./middlewares/error.middleware.js";
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

  }

  public async initialize(): Promise<void> {
    await this.initializeDataSource();
  }

  private async initializeDataSource() {
    console.log("Initializing Data Source...");
    try {
      await AppDataSource.initialize();
      console.log("Data Source has been initialized!");
      await AppDataSource.runMigrations();
      console.log("Data Source initialized! with migrations run.");
      await seedDatabase();
    } catch (err) {
      console.error("Error during Data Source initialization:", err);
      throw err;
    }
  }

  private initializeControllers(controllers: any): void {
    // this.app.get('/test', (req, res) => {
    //   res.send('Welcome to the API! 🌟');
    // }
    // );
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