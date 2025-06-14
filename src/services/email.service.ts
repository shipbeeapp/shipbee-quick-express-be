import Handlebars from "handlebars";
import { Service } from 'typedi';
import { env } from '../config/environment.js';
import { CreateOrderDto } from '../dto/order/createOrder.dto.js';
import path from 'path';
import fs from 'fs';
import { Resend } from 'resend';

@Service()
export default class MailService {
    private resend = new Resend(env.RESEND.API_KEY);

  async sendOrderConfirmation(orderDetails: any, totalCost: number, recipientMail: string, userType: string = 'non-admin'): Promise<void> {
    const html = this.generateOrderHtml(orderDetails, totalCost, userType);
    await this.resend.emails.send({
      from: 'ship@shipbee.io',
      to: recipientMail,
      subject: 'Your Order Confirmation',
      html: html,
    });
  }

  private formatAddress(address: any): string {
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


private generateOrderHtml(order: CreateOrderDto, totalCost: number, userType: string): string {
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
      fromAddress: this.formatAddress(order.fromAddress),
      toAddress: this.formatAddress(order.toAddress),
      status: "CONFIRMED",
      paymentMethod: "CASH", // Assuming default payment method is CASH
    };
  
    return template(replacements);
  }
}