import Handlebars from "handlebars";
import { env } from '../config/environment.js';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import twilio from 'twilio';
import { VehicleType } from '../utils/enums/vehicleType.enum.js';
import { ServiceSubcategoryName } from '../utils/enums/serviceSubcategory.enum.js';
import { OrderStatus } from '../utils/enums/orderStatus.enum.js';
import { google } from 'googleapis';

const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = env.OAUTH.REFRESH_TOKEN;


const oAuth2Client = new google.auth.OAuth2(
  env.OAUTH.GOOGLE_CLIENT_ID,
  env.OAUTH.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const accessToken = await oAuth2Client.getAccessToken();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: 'ship@shipbee.io',
    clientId: env.OAUTH.GOOGLE_CLIENT_ID,
    clientSecret: env.OAUTH.GOOGLE_CLIENT_SECRET,
    refreshToken: REFRESH_TOKEN,
    accessToken: accessToken.token,
  },
  tls: {
    rejectUnauthorized: false
  }
});
const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export async function sendOrderConfirmation(orderDetails: any, totalCost: number, vehicleType: VehicleType, recipientMail: string, userType: string = 'non-admin', emailType: string = 'order-confirmation', stopNumber?: string) {
  const html = generateOrderHtml(orderDetails, totalCost, vehicleType, userType, emailType, stopNumber);
  console.log("sending order confirmation email to:", recipientMail);
  await transporter.sendMail({
    from: `Shipbee <${env.SMTP.USER}>`,
    to: recipientMail,
    subject: `Order #${orderDetails.orderNo}`,
    html: html,
  });
  
    console.log(`${emailType} email sent to: ${recipientMail}`);
}

export async function sendOtp(emailOrPhone: string, otp: string, phoneExtension: string) {
  if (emailOrPhone.includes('@')) {
    // Handle email case
    try {
      await transporter.sendMail({
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
        from: env.PHONE_EXTENSION === '+974' ? 'ShipBee' : env.TWILIO_PHONE_NUMBER, // Use sender ID for Qatar, else use Twilio number
        to: `${phoneExtension}${emailOrPhone}`,
      });
      console.log(`OTP sent to phone number: ${emailOrPhone}`);
    } catch (error) {
      console.error('Error sending OTP via SMS:', error);
      throw new Error(`Failed to send OTP to ${emailOrPhone}: ${error.message}`);
    }
  }
}

export async function sendOtpToUser(phoneNumber: string, otp: string, phoneExtension: string = '+974') {
  // You can use Twilio, or any SMS service
  try {
    await twilioClient.messages.create({
      to: `${phoneExtension}${phoneNumber}`,
      from: 'ShipBee',
      body: `Please provide the driver with this code to complete the order: ${otp}`,
    });
    console.log(`OTP sent to ${phoneNumber}: ${otp}`);
  } catch (err) {
    console.error("Error sending OTP:", err.message);
    throw new Error(`Failed to send OTP to ${phoneNumber}: ${err.message}`);
  }
}

export function formatAddress(address: any): string {
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


export function generateOrderHtml(order: any, totalCost: number, vehicleType: VehicleType, userType: string, emailType: string, stopNumber?: string): string {
    const templatePath = path.join(process.cwd(), 'private', 'emails', `${emailType}.html`);
    const html = fs.readFileSync(templatePath, 'utf8');
    console.log("order stops:", order.stops);
  
    const template = Handlebars.compile(html);
    // const orderDescription = order.itemDescription ? JSON.parse(order.itemDescription): null;
    // const imageUrls = orderDescription?.images || null;
    // const images = imageUrls ? imageUrls.map((img: string) => `${env.CLOUDINARY_BASE_URL}${img}`) : []
    const category = (order.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK || order.serviceSubcategory?.name === ServiceSubcategoryName.PERSONAL_QUICK) ? 'Quick shipBee' : 'Express shipBee';
    let orderStatus = '';
    switch (order.status) {
      case OrderStatus.ASSIGNED:
        orderStatus = 'accepted';
        break;
      case OrderStatus.ACTIVE:
        orderStatus = 'started';
        break;
      case OrderStatus.EN_ROUTE_TO_PICKUP:
        orderStatus = 'started';
        break;
      case OrderStatus.COMPLETED:
        orderStatus = 'completed';
        break;
      case OrderStatus.CANCELED:
        orderStatus = 'cancelled';
        break;
      default:
        orderStatus = 'unknown';
    }
    let heading = emailType === 'order-confirmation' ? (userType === 'admin' ? `New Request Received – <strong>${category}</strong>` : 'Your Service request has been submitted!') : `Order #${order.orderNo} has been ${orderStatus} by driver ${order.driver?.name}`;
    if (emailType === 'order-status' && stopNumber) {
      if (stopNumber === 'pickup') {
        heading += ` and is going to pickup location.`;
      } else {
        heading += ` and is going to stop #${stopNumber}.`;
      }
    }
    const replacements = {
      recipient: userType === 'admin' ? 'admin' : `${order.senderName || order.sender?.name}`,
      heading: heading,
      name: order.senderName,
      email: order.senderEmail,
      phoneNumber: order.senderPhoneNumber,
      serviceSubcategory: (order.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL || order.serviceSubcategory?.name === ServiceSubcategoryName.INTERNATIONAL) ? 'Express' : (order.serviceSubcategory?.name || order.serviceSubcategory),
      quantity: '01', // Assuming quantity is always 1 for now
      itemType: order.itemType,
      pickUpDate: new Date(order.pickUpDate).toLocaleString("en-US", {
                    timeZone: "Asia/Qatar", // ideally use driver.timezone from DB
                    day: "numeric",
                    month: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
      }),
      lifters: order.lifters ?? null,
      totalCost: Number(totalCost).toFixed(2),
      // itemDescription: orderDescription?.text || '',
      // imageUrls: images,
      fromAddress: formatAddress(order.fromAddress),
      toAddress: formatAddress(order.toAddress),
      sender: {
        name: order.senderName || order.sender?.name,
        email: order.senderEmail || order.sender?.email,
        phoneNumber: order.senderPhoneNumber || order.sender?.phoneNumber,
      },
      // receiver: {
      //   name: order.receiverName,
      //   email: order.receiverEmail,
      //   phoneNumber: order.receiverPhoneNumber,
      // },
      stops: order.stops.map((stop: any) => ({
        sequence: stop.sequence,
        toAddress: formatAddress(stop.toAddress),
        receiverName: stop.receiverName || stop.receiver?.name,
        receiverPhoneNumber: stop.receiverPhoneNumber || stop.receiver?.phoneNumber,
        itemDescription: stop.itemDescription ? JSON.parse(stop.itemDescription).text : '',
        images: stop.itemDescription ? (JSON.parse(stop.itemDescription).images || []).map((img: string) => `${env.CLOUDINARY_BASE_URL}${img}`) : [],
        items: stop.items,
        totalPrice: stop.totalPrice ? Number(stop.totalPrice).toFixed(2) : null,
        paymentMethod: stop.paymentMethod,
        comments: stop.comments ?? null,
        deliveryFee: stop.deliveryFee ? Number(stop.deliveryFee).toFixed(2) : null
      })),
      vehicleType: vehicleType,
      status: "CONFIRMED",
      paymentMethod: "CASH", // Assuming default payment method is CASH
      shipment: order.shipment
    };
    console.log("order stops in replacements:", replacements.stops);
    return template(replacements);
  }

export async function sendOrderDetailsViaSms(orderId: string, senderPhoneNumber: string, receiverPhoneNumber: string, token: string) {
  try {
  
    const message = `Shipbee Order Placed. Here is the link to view your order details: ${env.CLIENT_URL}/order-details/${orderId}?token=${token}`;
    await twilioClient.messages.create({
      body: message,
      // from: env.TWILIO_PHONE_NUMBER,
      from: 'ShipBee', // Your Twilio number or sender ID
      to: `+974${senderPhoneNumber}`,
      riskCheck: 'disable'
    });
    console.log('Order details SMS sent to:', senderPhoneNumber);
    await twilioClient.messages.create({
      body: message,
      // from: env.TWILIO_PHONE_NUMBER,
      from: 'ShipBee', // Your Twilio number or sender ID
      to: `+974${receiverPhoneNumber}`,
      riskCheck: 'disable'
    });
    console.log('Order details SMS sent to:', receiverPhoneNumber);
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw new Error('Failed to send SMS for order details: ' + error.message);
  }
}

export async function sendDriverData(phoneNumber: string, password: string) {
  try {
    console.log("Sending driver data to phone number:", phoneNumber);
    await twilioClient.messages.create({
      body: `Your Shipbee driver account has been created. Your phone number is ${phoneNumber} and your password is ${password}. Here is the link to download the driver app: ${env.DRIVER_APP_LINK}`,
      from: 'ShipBee',
      to: `+974${phoneNumber}`,
    });
    console.log(`Driver data sent to phone number: ${phoneNumber}`);
  } catch (error) {
    console.error('Error sending driver data via SMS:', error);
    // throw new Error(`Failed to send driver data to ${phoneNumber}: ${error.message}`);
  }
}

export async function sendOrderCancellationEmail(orderNo: number, driverName: string, driverPhoneNumber: string) {
  try {
    await transporter.sendMail({
      from: `Shipbee <${env.SMTP.USER}>`,
      // to: "basselhalabi17@aucegypt.edu", // Testing email
      to: env.SMTP.USER, // Admin email from environment variables
      subject: `Order #${orderNo}`,
      html: `<p>Driver ${driverName} with phone number ${driverPhoneNumber} has requested to cancel order #${orderNo}.
      You can accept or decline the request from the dashboard <a href="${env.ADMIN_URL}">here</a>.</p>`,
    });
    console.log(`Order cancellation email sent to: ${env.SMTP.USER}`);
  } catch (error) {
    console.error('Error sending order cancellation email:', error);
    throw new Error(`Failed to send order cancellation email to ${env.SMTP.USER}: ${error.message}`);
  }
}

export async function sendDriverSignUpMail(driverName: string, driverPhoneNumber: string) {
  try {
    await transporter.sendMail({
      from: `Shipbee <${env.SMTP.USER}>`,
      // to: "basselhalabi17@aucegypt.edu",
      to: env.SMTP.USER, // Admin email from environment variables
      subject: 'New Driver Sign-Up Request',
      html: `<p style="font-size: 24px;">Driver ${driverName} with phone number ${driverPhoneNumber} has signed up as a driver.
      You can review and approve or reject the request from the dashboard <a href="${env.ADMIN_URL}">here</a>.</p>`,
    });
    console.log(`Driver sign-up email sent to: ${env.SMTP.USER}`);
  } catch (error) {
    console.error('Error sending driver sign-up email:', error);
    throw new Error(`Failed to send driver sign-up email to ${env.SMTP.USER}: ${error.message}`);
  } 
}

export async function sendArrivalNotification(phoneNumber: string, email: string, orderNo: number, driverName: string, driverPhoneNumber: string, stopSequence?: number, atPickup: boolean = false) {
  try {
    let content = `<p>Your Shipbee driver, ${driverName} (Phone: ${driverPhoneNumber}) `;
    if (stopSequence) {
      if (atPickup) {
        content += `is on his way to stop #${stopSequence} for dropoff with order #${orderNo}.`;
      }
      else {
        content += `has arrived at stop #${stopSequence} for dropoff for order #${orderNo}.`;
      }
    }
    else {
      content += `has arrived for pickup with order #${orderNo}`;
    }
    if (email) {
      await transporter.sendMail({
        from: `Shipbee <${env.SMTP.USER}>`,
        to: email,
        subject: `Order #${orderNo}`,
        html: content,
      });
      console.log(`Arrival notification email to ${email}`);
    } 
    else {
      await twilioClient.messages.create({
        body: content,
        from: 'ShipBee',
        to: `+974${phoneNumber}`,
      });
      console.log(`Arrival notification SMS sent to: ${phoneNumber}`);
    }
  } catch (error) {
    console.error('Error sending arrival notification SMS:', error);
    throw new Error(`Failed to send arrival notification SMS to ${phoneNumber}: ${error.message}`);
  }
}

export async function sendDriverUpdateInfoMail(driverName: string, driverPhoneNumber: string, updatedInfo: string) {
  try {
    await transporter.sendMail({
      from: `Shipbee <${env.SMTP.USER}>`,
      to: env.SMTP.USER, // Admin email from environment variables
      subject: 'Driver Information Update Request',
      html: `<p style="font-size: 24px;">Driver ${driverName} with phone number ${driverPhoneNumber} has requested to update the following information: ${updatedInfo}.
      You can review and approve or reject the request from the dashboard <a href="${env.ADMIN_URL}">here</a>.</p>`,
    });
    console.log(`Driver update info email sent to: ${env.SMTP.USER}`);
  } catch (error) {
    console.error('Error sending driver update info email:', error);
    throw new Error(`Failed to send driver update info email to ${env.SMTP.USER}: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(recipientEmail: string, resetUrl: string) {
  try {
    await transporter.sendMail({
      from: `Shipbee <${env.SMTP.USER}>`,
      to: recipientEmail,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset. Click the link below to reset your password:</p>
             <a href="${resetUrl}">${resetUrl}</a>
             <p>If you did not request this, please ignore this email.</p>`,
    });
    console.log(`Password reset email sent to: ${recipientEmail}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error(`Failed to send password reset email to ${recipientEmail}: ${error.message}`);
  }
}
