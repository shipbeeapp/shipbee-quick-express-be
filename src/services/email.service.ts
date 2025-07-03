import nodemailer from 'nodemailer';
import Handlebars from "handlebars";
import { Service } from 'typedi';
import { env } from '../config/environment.js';
import { CreateOrderDto } from '../dto/order/createOrder.dto.js';
import path from 'path';
import fs from 'fs';
import { Resend } from 'resend';

const resend = new Resend(env.RESEND.API_KEY); // keep API key in env 

export async function sendOrderConfirmation(orderDetails: any, totalCost: number, recipientMail: string, userType: string = 'non-admin') {
  const html = generateOrderHtml(orderDetails, totalCost, userType);
  console.log("sending order confirmation email to:", recipientMail);
  await resend.emails.send({
    from: `Shipbee <${env.SMTP.USER}>`,
    to: recipientMail,
    subject: 'Your Order Confirmation',
    html: html,
  });
    console.log("Order confirmation email sentt to:", recipientMail);
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


export function generateOrderHtml(order: CreateOrderDto, totalCost: number, userType: string): string {
    const templatePath = path.join(process.cwd(), 'private', 'emails', 'order-confirmation.html');
    const html = fs.readFileSync(templatePath, 'utf8');
  
    const template = Handlebars.compile(html);
    const orderDescription = order.itemDescription ? JSON.parse(order.itemDescription): null;
    const replacements = {
      recipient: userType === 'admin' ? 'Test admin' : `Test ${order.senderName}`,
      heading: userType === 'admin' ? 'Test Request Received – <strong>Quick shipBee!</strong>' : 'Your Test Service request has been submitted!',
      name: order.senderName,
      email: order.senderEmail,
      phoneNumber: order.senderPhoneNumber,
      serviceSubcategory: order.serviceSubcategory,
      quantity: '01', // Assuming quantity is always 1 for now
      itemType: order.itemType,
      pickUpDate: new Date(order.pickUpDate).toLocaleString(),
      lifters: order.lifters ?? null,
      totalCost: Number(totalCost).toFixed(2),
      itemDescription: orderDescription?.text || '',
      fromAddress: formatAddress(order.fromAddress),
      toAddress: formatAddress(order.toAddress),
      status: "CONFIRMED",
      paymentMethod: "CASH", // Assuming default payment method is CASH
    };
  
    return template(replacements);
  }
