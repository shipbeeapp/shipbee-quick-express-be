import "reflect-metadata";
import App from "../dist/app.js";
import { OrderController } from "../dist/controllers/order.controller.js";
import { CitiesController } from "../dist/controllers/cities.controller.js";
import { env } from "../dist/config/env.js";
import nodemailer from "nodemailer";
import { generateOrderHtml } from "../dist/services/email.service.js"; // Adjust the import path as needed

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

export const sendOrderConfirmation = async (orderDetails: any, totalCost: number, recipientMail: string, userType: string = 'non-admin') => {
  const html = generateOrderHtml(orderDetails, totalCost, userType);
  return new Promise((resolve, reject) => {
  const transporter = nodemailer.createTransport({
      host: env.SMTP.HOST,
      port: env.SMTP.PORT,
      secure: true, // true for 465, false for other ports
      auth: {
        user: env.SMTP.USER,
        pass: env.SMTP.PASS,
      },
    });
  console.log("Sending order confirmation email to:", recipientMail);
  const mailData = {
    from: 'ship@shipbee.io',
    to: recipientMail,
    subject: 'Your Order Confirmation',
    html: html,
  }
      transporter.sendMail(mailData, (err, info) => {
          if (err) {
              console.error("Error sending email:", err);
              console.error(err);
              reject(err);
          } else {
              console.log("Email sent successfully:", info.response);
              // Log the full info object for debugging
              console.log(info);
              resolve(info);
          }
      });
  });
  // await transporter.sendMail({
  //   from: 'ship@shipbee.io',
  //   to: recipientMail,
  //   subject: 'Your Order Confirmation',
  //   html: html,
  // });
}

// 👇 This is what Vercel needs: a handler function
export default async function handler(req, res) {
  await ensureAppInitialized();
  return appInstance!.app(req, res); // Pass request to Express
}
