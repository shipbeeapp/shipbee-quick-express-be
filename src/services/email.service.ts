import nodemailer from 'nodemailer';
import Handlebars from "handlebars";
import { Service } from 'typedi';
import { env } from '../config/environment.js';
import { CreateOrderDto } from '../dto/order/createOrder.dto.js';
import path from 'path';
import fs from 'fs';
import { Resend } from 'resend';
import twilio from 'twilio';

const resend = new Resend(env.RESEND.API_KEY); // keep API key in env 
const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

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

export async function sendOtp(emailOrPhone: string, otp: string){
  if (emailOrPhone.includes('@')) {
    // Handle email case
    try {
      await resend.emails.send({
        from: `Shipbee <${env.SMTP.USER}>`,
        to: emailOrPhone,
        subject: 'Your Shipbee OTP Code',
        html: `<p>Your Shipbee OTP code is <strong>${otp}</strong></p>`,
      });
      console.log(`OTP sent to email: ${emailOrPhone}`);
    } catch (error) {
      console.error('Error sending OTP via email:', error);
      throw new Error(`Failed to send OTP to ${emailOrPhone}: ${error.message}`);
    }
  } else {
    // Handle phone case
    try {
      await twilioClient.messages.create({
        body: `Your Shipbee OTP code is ${otp}`,
        from: env.TWILIO_PHONE_NUMBER,
        to: `+974${emailOrPhone}`,
      });
      console.log(`OTP sent to phone number: ${emailOrPhone}`);
    } catch (error) {
      console.error('Error sending OTP via SMS:', error);
      throw new Error(`Failed to send OTP to ${emailOrPhone}: ${error.message}`);
    }
  }
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
    const imageUrls = orderDescription?.images || null;
    const images = imageUrls ? imageUrls.map((img: string) => `${env.CLOUDINARY_BASE_URL}${img}`) : []
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
      imageUrls: images,
      fromAddress: formatAddress(order.fromAddress),
      toAddress: formatAddress(order.toAddress),
      sender: {
        name: order.senderName,
        email: order.senderEmail,
        phoneNumber: order.senderPhoneNumber,
      },
      receiver: {
        name: order.receiverName,
        email: order.receiverEmail,
        phoneNumber: order.receiverPhoneNumber,
      },
      status: "CONFIRMED",
      paymentMethod: "CASH", // Assuming default payment method is CASH
    };
  
    return template(replacements);
  }
