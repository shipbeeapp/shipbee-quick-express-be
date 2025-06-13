import nodemailer from 'nodemailer';
import Handlebars from "handlebars";
import { Service } from 'typedi';
import { env } from '../config/environment.js';
import { CreateOrderDto } from '../dto/order/createOrder.dto.js';
import path from 'path';
import fs from 'fs';

@Service()
export default class MailService {
  private transporter = nodemailer.createTransport({
    host: env.SMTP.HOST,
    port: env.SMTP.PORT,
    secure: true, // true for 465, false for other ports
    auth: {
      user: env.SMTP.USER,
      pass: env.SMTP.PASS,
    },
  });

  async sendOrderConfirmation(orderDetails: any, totalCost: number): Promise<void> {
    const html = this.generateOrderHtml(orderDetails, totalCost);
    console.log('sending mail')
    await this.transporter.sendMail({
      from: 'ship@shipbee.io',
      to: 'ship@shipbee.io',
      subject: 'Your Order Confirmation',
      html: html,
    });
  }

  private formatAddress(address: any): string {
    if (!address) return '';
  
    const parts = [
        address.country && `<div style="margin-bottom: 4px;"><strong>Country:</strong> ${address.country}</div>`,
        address.city && `<div style="margin-bottom: 4px;"><strong>City:</strong> ${address.city}</div>`,
        address.district && `<div style="margin-bottom: 4px;"><strong>District:</strong> ${address.district}</div>`,
        address.street && `<div style="margin-bottom: 4px;"><strong>Street:</strong> ${address.street}</div>`,
        address.buildingNumber && `<div style="margin-bottom: 4px;"><strong>Building Number:</strong> ${address.buildingNumber}</div>`,
        address.floor && `<div style="margin-bottom: 4px;"><strong>Floor:</strong> ${address.floor}</div>`,
        address.apartmentNumber && `<div style="margin-bottom: 4px;"><strong>Apartment:</strong> ${address.apartmentNumber}</div>`,
        address.zone && `<div style="margin-bottom: 4px;"><strong>Zone:</strong> ${address.zone}</div>`,
        address.landmarks && `<div style="margin-bottom: 4px;"><strong>Landmarks:</strong> ${address.landmarks}</div>`,
      ].filter(Boolean);

    return parts.join(''); // joins with line breaks for HTML formatting
  }


private generateOrderHtml(order: CreateOrderDto, totalCost: number): string {
    const templatePath = path.join(process.cwd(), 'private', 'emails', 'order-confirmation.html');
    const html = fs.readFileSync(templatePath, 'utf8');
  
    const template = Handlebars.compile(html);
    const orderDescription = JSON.parse(order.itemDescription);
    const replacements = {
      name: order.name,
      email: order.email,
      phoneNumber: order.phoneNumber,
      serviceSubcategory: order.serviceSubcategory,
      itemType: order.itemType,
      pickUpDate: new Date(order.pickUpDate).toLocaleString(),
      lifters: order.lifters ?? null,
      totalCost: Number(totalCost).toFixed(2),
      itemDescription: orderDescription.text || '',
      fromAddress: this.formatAddress(order.fromAddress),
      toAddress: this.formatAddress(order.toAddress),
      status: "CONFIRMED",
      paymentMethod: "CASH", // Assuming default payment method is CASH
    };
  
    return template(replacements);
  }
}