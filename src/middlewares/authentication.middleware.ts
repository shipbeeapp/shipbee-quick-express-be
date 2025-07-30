import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';


export interface AuthenticatedRequest extends Request {
    userId?: string; // Optional userId property to store the authenticated user's ID
    email?: string; // Optional email property to store the authenticated user's email
    driverId?: string; // Optional driverId property to store the authenticated driver's ID
  }

export const authenticationMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
    res.status(401).json({ success: false, message: 'Access token is missing' });
    return;
    }

    try {
        const secretKey = env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token as string, secretKey) as { userId: string, email: string, driverId?: string };

        req.userId = decoded.userId; // Add userId to the request object
        req.email = decoded.email; // Add email to the request object
        req.driverId = decoded.driverId; // Add driverId to the request object
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
        return
    }
};

export default authenticationMiddleware;