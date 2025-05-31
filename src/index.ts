import App from "./app.js";
import "reflect-metadata";
import { OrderController } from "./controllers/order.controller.js";
import { CitiesController } from "./controllers/cities.controller.js";

const app = new App(
    [
    new OrderController(),
    new CitiesController(),
    ],
);
app.listen();