import nodemailer from 'nodemailer';
import Handlebars from "handlebars";
import { Service } from 'typedi';
import { env } from '../config/environment.js';
import { CreateOrderDto } from '../dto/order/createOrder.dto.js';
import path from 'path';
import fs from 'fs';

const transporter = nodemailer.createTransport({
  host: env.SMTP.HOST,
  port: env.SMTP.PORT,
  secure: true, // true for 465, false for other ports
  auth: {
    user: env.SMTP.USER,
    pass: env.SMTP.PASS,
  },
});

export const sendOrderConfirmation = async (orderDetails: any, totalCost: number, recipientMail: string, userType: string = 'non-admin') => {
    const html = generateOrderHtml(orderDetails, totalCost, userType);
    console.log(env.SMTP.HOST, env.SMTP.PORT, env.SMTP.USER, env.SMTP.PASS);
    await new Promise((resolve, reject) => {
        // verify connection configuration
        transporter.verify(function (error, success) {
            if (error) {
                console.log(error);
                reject(error);
            } else {
                console.log("Server is ready to take our messages");
                resolve(success);
            }
        });
    });
    console.log("Sending order confirmation email to:", recipientMail);
    const mailData = {
      from: 'ship@shipbee.io',
      to: recipientMail,
      subject: 'Your Order Confirmation',
      html: html,
    }
    await new Promise((resolve, reject) => {
        // send mail
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
    console.log("Order confirmation email sent successfully.");
  }

function formatAddress(address: any): string {
    if (!address) return '';
  
    const parts = [
        address.country && `${address.country}`,
        address.city && `${address.city}`,
        address.district && `${address.district}`,
        address.street && `${address.street}`,
        address.buildingNumber && `${address.buildingNumber}`,
        address.floor && `${address.floor}`,
        address.apartmentNumber && `${address.apartmentNumber}`,
        address.zone && `${address.zone}`,
        address.landmarks && `${address.landmarks}`,
      ].filter(Boolean);

    return parts.join(', '); // joins with comma breaks for HTML formatting
  }


function generateOrderHtml(order: CreateOrderDto, totalCost: number, userType: string): string {
    const templatePath = path.join(process.cwd(), 'private', 'emails', 'order-confirmation.html');
    const html = fs.readFileSync(templatePath, 'utf8');
  
    const template = Handlebars.compile(html);
    const orderDescription = JSON.parse(order.itemDescription);
    const replacements = {
      recipient: userType === 'admin' ? 'admin' : order.name,
      heading: userType === 'admin' ? 'New Request Received – <strong>Quick shipBee!</strong>' : 'Your Service request has been submitted!',
      name: order.name,
      email: order.email,
      phoneNumber: order.phoneNumber,
      serviceSubcategory: order.serviceSubcategory,
      quantity: '01', // Assuming quantity is always 1 for now
      itemType: order.itemType,
      pickUpDate: new Date(order.pickUpDate).toLocaleString(),
      lifters: order.lifters ?? null,
      totalCost: Number(totalCost).toFixed(2),
      itemDescription: orderDescription.text || '',
      fromAddress: formatAddress(order.fromAddress),
      toAddress: formatAddress(order.toAddress),
      status: "CONFIRMED",
      paymentMethod: "CASH", // Assuming default payment method is CASH
    };
  
    return template(replacements);
  }
