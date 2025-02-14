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
  },
  BASE_COST: process.env.BASE_COST || 360.80,
  PER_LIFTER_COST: process.env.PER_LIFTER_COST || 360.80,
};
