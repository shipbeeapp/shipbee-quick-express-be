import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    session?: {
      shopifyToken?: string;
      shop?: string;
      shopifyState?: string;
    };
  }
}