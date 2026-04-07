import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 3000,
  APP_ENV: process.env.APP_ENV || "development",
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
  SEABAY_APP_KEY: process.env.SEABAY_APP_KEY || 'Amiup54rt4dD478',
  SEABAY_APP_SECRET: process.env.SEABAY_APP_SECRET || 'q4t345688356E#23',
  SEARATES_PLATFORM_ID: process.env.SEARATES_PLATFORM_ID || '40506',
  SEARATES_API_KEY: process.env.SEARATES_API_KEY || 'K-CE43A6A8-B6F8-4EDF-9B67-11B89B587A09',
  SEARATES_LOGIN: process.env.SEARATES_LOGIN || 'mousa@shipbee.io',
  SEARATES_PASSWORD: process.env.SEARATES_PASSWORD || '#Test@123!',
  TRACK17_API_KEY: process.env.TRACK17_API_KEY || '50239608CB8B3EAB7CB2CC48D573AEE5',
  AISSTREAM_API_KEY: process.env.AISSTREAM_API_KEY || '1de7e21cc6959c0e2bfbe3c41f1be03e4c72b850',
};

