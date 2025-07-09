import App from "./app.js";
import "reflect-metadata";
import { OrderController } from "./controllers/order.controller.js";
import { CitiesController } from "./controllers/cities.controller.js";
import { VehicleController } from "./controllers/vehicle.controller.js";
import { AuthController } from "./controllers/auth.controller.js";
import { UserController } from "./controllers/user.controller.js";
const app = new App(
    [
    new OrderController(),
    new CitiesController(),
    new VehicleController(),
    new AuthController(),
    new UserController(),
    ],
);
app.app.get('/test', (req: any, res: any): void => {
  res.send('Welcome to the API! 🌟');
});
app.initializeDataSource()
.then(() => {
  console.log("Data Source initialized successfully!");
  app.listen();
  console.log("Server is listening for requests...");
})
.catch((err) => {
  console.error("Failed to initialize app:", err);
});