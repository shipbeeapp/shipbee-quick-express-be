import App from "./app.js";
import "reflect-metadata";
import { OrderController } from "./controllers/order.controller.js";
import { CitiesController } from "./controllers/cities.controller.js";
import formidableMiddleware from 'express-formidable';
import cors from "cors";
import express from "express";
const app = new App(
    [
    new OrderController(),
    new CitiesController(),
    ],
);
console.log("Starting the application...");
app.app.get('/test', (req: any, res: any): void => {
  res.send('Welcome to the API! 🌟');
});
app.initializeDataSource()
.then(async () => {
  console.log("Data Source initialized successfully!");
  // Dynamically import and initialize AdminJS after DataSource is ready
  app.app.use(cors({ origin: "*" }));
  app.app.use(formidableMiddleware());
  const { adminJs, adminRouter } = await import("./admin.js");
  app.app.use(adminJs.options.rootPath, adminRouter);
  app.app.use(express.json()); // Example middleware for handling JSON data
  app.app.use(express.urlencoded({ extended: true })); // ✅ Handles form data

  console.log("Server is listening for requests...");
})
.catch((err) => {
  console.error("Failed to initialize app:", err);
});
app.listen()