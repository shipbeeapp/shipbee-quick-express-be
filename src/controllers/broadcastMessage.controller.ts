import { Router } from 'express';
import { BroadcastMessageService } from '../services/broadcastMessage.service.js';
import {Container} from 'typedi';
import {authenticationMiddleware, AuthenticatedRequest } from '../middlewares/authentication.middleware.js';
import { env } from '../config/environment.js';

export class BroadcastMessageController {
  public router: Router = Router();
  public path = '/broadcast-messages';
  private broadcastMessageService = Container.get(BroadcastMessageService);
  
  constructor() {
    this.initializeRoutes();
  }

    private initializeRoutes() {
        // Define your routes here
        // Example: this.router.get('/orders', this.getOrders.bind(this));
        // You can add more routes as needed
        this.router.get(this.path, authenticationMiddleware, this.getAllMessages.bind(this));
        this.router.post(`${this.path}/broadcast`, authenticationMiddleware, this.broadcastMessageToDrivers.bind(this));
        this.router.get(`${this.path}/driver-messages`, authenticationMiddleware, this.getDriverMessages.bind(this));
        this.router.put(`${this.path}/:broadcastMessageId`, authenticationMiddleware, this.markMessageAsRead.bind(this));
        this.router.put(`${this.path}/:broadcastMessageId/status`, authenticationMiddleware, this.modifyMessageStatus.bind(this));
    }

    private async getAllMessages(req: AuthenticatedRequest, res) {
        // This is a placeholder for the actual implementation
        try {
            const email = req.email;
            if (email !== env.ADMIN.EMAIL) {
                return res.status(403).json({ success: false, message: "Forbidden: You do not have permission to view all messages." });
            }
            const messages = await this.broadcastMessageService.getAllMessages();
            res.status(200).json({ success: true, data: messages });
        } catch (error) {
            console.error("Error fetching broadcast messages:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private async broadcastMessageToDrivers(req: AuthenticatedRequest, res) {
        // This is a placeholder for the actual implementation
        // You would typically create a broadcast message and associate it with drivers in the database
        const email = req.email;
        if (email !== env.ADMIN.EMAIL) {
            return res.status(403).json({ success: false, message: "Forbidden: You do not have permission to broadcast messages." });
        }
        const { title, message } = req.body;
        try {
            const result = await this.broadcastMessageService.broadcastToAllDrivers(title, message);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error("Error broadcasting message:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private async getDriverMessages(req: AuthenticatedRequest, res) {
        // This is a placeholder for the actual implementation
        const driverId = req.driverId;
        if (!driverId) {
            return res.status(401).json({ success: false, message: "Unauthorized: Driver ID not found." });
        }

        try {
            const messages = await this.broadcastMessageService.getMessagesForDriver(driverId);
            res.status(200).json({ success: true, data: messages });
        } catch (error) {
            console.error("Error fetching driver messages:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private async markMessageAsRead(req: AuthenticatedRequest, res) {
        const driverId = req.driverId;
        const { broadcastMessageId } = req.params;

        if (!driverId) {
            return res.status(401).json({ success: false, message: "Unauthorized: Driver ID not found." });
        }

        try {
            await this.broadcastMessageService.markMessageAsRead(driverId, broadcastMessageId);
            res.status(200).json({ success: true, message: "Message marked as read." });
        } catch (error) {
            console.error("Error marking message as read:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private async modifyMessageStatus(req: AuthenticatedRequest, res) {
        const email = req.email;
        if (email !== env.ADMIN.EMAIL) {
            return res.status(403).json({ success: false, message: "Forbidden: You do not have permission to modify message status." });
        }
        const { broadcastMessageId } = req.params;
        const { isActive } = req.query;

        try {
            await this.broadcastMessageService.modifyMessageStatus(broadcastMessageId, isActive === 'true');
            res.status(200).json({ success: true, message: "Message status updated." });
        } catch (error) {
            console.error("Error modifying message status:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}