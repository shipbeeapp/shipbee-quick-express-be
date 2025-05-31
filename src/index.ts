import App from "./app.js";
import "reflect-metadata";
import { OrderController } from "./controllers/order.controller.js";
import { CitiesController } from "./controllers/cities.controller.js";
import {VercelRequest, VercelResponse} from "@vercel/node";

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