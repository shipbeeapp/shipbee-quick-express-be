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
app.listen();