import "reflect-metadata";
import App from "../src/app.js";
import { OrderController } from "../src/controllers/order.controller.js";
import { CitiesController } from "../src/controllers/cities.controller.js";
import { env } from "../src/config/environment.js";
import nodemailer from "nodemailer";
import { generateOrderHtml } from "../src/services/email.service.js"; // Adjust the import path as needed

let appInstance: App | null = null;

async function ensureAppInitialized() {
  if (!appInstance) {
    appInstance = new App([
      new OrderController(),
      new CitiesController(),
    ]);

    // Optional: a test route
    appInstance.app.get('/test', (req, res) => {
      res.send("Welcome to the API! 🌟");
    });

    await appInstance.initializeDataSource();
    console.log("✅ Data Source initialized successfully!");
  }
}

// 👇 This is what Vercel needs: a handler function
export default async function handler(req, res) {
  await ensureAppInitialized();
  return appInstance!.app(req, res); // Pass request to Express
}
