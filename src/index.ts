import App from "./app.js";
import "reflect-metadata";
import { OrderController } from "./controllers/order.controller.js";
import { CitiesController } from "./controllers/cities.controller.js";
import { VehicleController } from "./controllers/vehicle.controller.js";
import { AuthController } from "./controllers/auth.controller.js";
import { UserController } from "./controllers/user.controller.js";
import { DriverController } from "./controllers/driver.controller.js"; // Assuming DriverController is defined
import http from "http";
import { initializeSocket } from "./socket/socket.js";
import { env } from "./config/environment.js";
import { schedulePendingOrdersOnStartup } from "./utils/order.scheduler.js";
import { Container } from "typedi";
import OrderService from "./services/order.service.js";
import { TermsAndConditionsController } from "./controllers/terms-and-conditions.controller.js";
import { PricingController } from "./controllers/pricing.controller.js";
import { PromoCodeController } from "./controllers/promoCode.controller.js";
import { ShopSettingsController } from "./controllers/shopSettings.controller.js";

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  // process.exit(1); // optional: crash the app to avoid unknown state
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // process.exit(1); // optional: restart app via Render or Docker
});

const app = new App(
    [
    new OrderController(),
    new CitiesController(),
    new VehicleController(),
    new AuthController(),
    new UserController(),
    new DriverController(), // Assuming DriverController is defined
    new TermsAndConditionsController(), // Add TermsAndConditionsController
    new PricingController(), // Add PricingController
    new PromoCodeController(), // Add PromoCodeController
    new ShopSettingsController(), // Add ShopSettingsController
    ],
);

const server = http.createServer(app.app);
initializeSocket(server); // ✅ inject socket here

app.app.get('/test', (req: any, res: any): void => {
  res.send('Welcome to the API! 🌟');
});
app.initializeDataSource()
.then(async () => {
  console.log("Data Source initialized successfully!");
  const orderService = Container.get(OrderService);
  await schedulePendingOrdersOnStartup(orderService);
  server.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
  });
  console.log("Server is listening for requests...");
})
.catch((err) => {
  console.error("Failed to initialize app:", err);
});