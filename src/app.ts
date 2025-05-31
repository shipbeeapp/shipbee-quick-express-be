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
    this.initializeDataSource();
    this.initializeMiddlewares();
    this.initializeControllers(controllers);
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(express.json()); // Example middleware for handling JSON data
    this.app.use(express.urlencoded({ extended: true })); // ✅ Handles form data

  }

  // public async initialize(): Promise<void> {
  //   await this.initializeDataSource();
  // }

  private initializeDataSource(): void {
    // Initialize the database connection
    console.log(`Initializing Data Source....`);
    AppDataSource
      .initialize()
      .then(async () => {
        AppDataSource.runMigrations().then(async () => {
          console.log(`Data Source has been initialized!!`);
          await seedDatabase();
          console.log(`Database seeded successfully!`);
          // await this.orderService.getOrdersbyUser('feb24ee6-1d57-4b46-a718-62c24951c086');
        });
      })
      .catch((err) => {
        console.error('Error during Data Source initialization:', err);
      });

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