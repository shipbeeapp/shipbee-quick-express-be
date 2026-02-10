import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 3000,
  APP_ENV: process.env.APP_ENV || "development",
  APP_HOST: process.env.APP_HOST || `http://localhost:${process.env.PORT || 3000}`,
  CLIENT_HOST: process.env.CLIENT_HOST || 'http://localhost:4200',
  DB: {
    HOST: process.env.DB_HOST,
    PORT: Number(process.env.DB_PORT),
    USERNAME: process.env.DB_USERNAME,
    PASSWORD: process.env.DB_PASSWORD,
    DATABASE: process.env.DB_NAME,
    URL: process.env.DATABASE_URL,
  },
  SMTP: {
    HOST: process.env.SMTP_HOST,
    PORT: Number(process.env.SMTP_PORT) || 587,
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASS,
  },
  RESEND: {
    API_KEY: process.env.RESEND_API_KEY,
  },
  CLOUDINARY_BASE_URL: process.env.CLOUDINARY_BASE_URL || "https://res.cloudinary.com/demo/image/upload",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  BASE_COST: process.env.BASE_COST || 360.80,
  PER_LIFTER_COST: process.env.PER_LIFTER_COST || 50,
  JWT_SECRET: process.env.JWT_SECRET,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  ADMIN: {
    EMAIL: process.env.ADMIN_EMAIL,
    PASSWORD: process.env.ADMIN_PASSWORD,
  },
  DRIVER_APP_LINK: process.env.DRIVER_APP_LINK || 'https://drive.google.com/drive/folders/1k4aXRRXQIhe4Rmo9wI7Lg-5eaLtCUi1u',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  RADIUS_KM_MOTORCYCLE: Number(process.env.RADIUS_KM_MOTORCYCLE) || 5,
  RADIUS_KM_SEDAN_CAR: Number(process.env.RADIUS_KM_SEDAN_CAR) || 10,
  RADIUS_KM_OTHER: Number(process.env.RADIUS_KM_OTHER) || 15,
  EMIT_TIME_SEDAN_CAR_MINUTES: Number(process.env.EMIT_TIME_SEDAN_CAR_MINUTES) || 15,
  EMIT_TIME_OTHER_MINUTES: Number(process.env.EMIT_TIME_OTHER_MINUTES) || 90,
  ACCEPTANCE_TIME_SEDAN_MINUTES: Number(process.env.ACCEPTANCE_TIME_SEDAN_MINUTES) || 15,
  ACCEPTANCE_TIME_OTHER_MINUTES: Number(process.env.ACCEPTANCE_TIME_OTHER_MINUTES) || 30,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:4200',
  SEND_SMS: process.env.SEND_SMS === 'true' || false,
  ADMIN_URL: process.env.ADMIN_URL || 'https://shipbee-admin-fe.vercel.app/dashboard',
  PHONE_EXTENSION: process.env.PHONE_EXTENSION || '+974', // Default to Qatar country code
  OAUTH: {
    GOOGLE_CLIENT_ID: process.env.OAUTH_GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
    REFRESH_TOKEN: process.env.OAUTH_REFRESH_TOKEN,
  },
  SHOPIFY: {
    CLIENT_ID: process.env.SHOPIFY_CLIENT_ID,
    SECRET: process.env.SHOPIFY_SECRET,
    SCOPES: process.env.SHOPIFY_SCOPES,
  },
  DHL: {
    API_KEY: process.env.DHL_API_KEY,
    API_SECRET: process.env.DHL_API_SECRET,
    ACCOUNT_NUMBER: process.env.DHL_ACCOUNT_NUMBER,
    DOMAIN: process.env.DHL_DOMAIN || 'https://api-dhl.com',
  },
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  FIREBASE_CONFIG_PATH: process.env.FIREBASE_CONFIG_PATH || "/etc/secrets/firebase-account.json",
  EXPRESS_ADMIN_EMAIL: process.env.EXPRESS_ADMIN_EMAIL || 'ems@shipbee.io',
  EXTERNAL_TRACKING_SOCKET: {
    URL: process.env.EXTERNAL_TRACKING_SOCKET_URL,
    TOKEN: process.env.EXTERNAL_TRACKING_SOCKET_TOKEN 
  },
  SERVICE_FEE_PERCENTAGE: Number(process.env.SERVICE_FEE_PERCENTAGE) || 10, // Default to 10%
  FCM_INTERVAL_SECONDS: Number(process.env.FCM_INTERVAL_SECONDS) || 5, // Default to 5 seconds
};
