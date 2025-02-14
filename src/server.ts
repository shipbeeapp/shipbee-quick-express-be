import App from "./app.js";
import "reflect-metadata";
import { OrderController } from "./controllers/order.controller.js";

const app = new App(
    [
    new OrderController(),
    ],
);
app.listen();