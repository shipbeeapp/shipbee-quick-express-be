import App from "../dist/app.js";
import "reflect-metadata";
import { OrderController } from "../dist/controllers/order.controller.js";
import { CitiesController } from "../dist/controllers/cities.controller.js";

const app = new App(
    [
    new OrderController(),
    new CitiesController(),
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