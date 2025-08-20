import { Router, Request, Response } from 'express';
import {Container} from 'typedi';
import DriverService from '../services/driver.service.js';
import authenticationMiddleware from '../middlewares/authentication.middleware.js';
import { AuthenticatedRequest } from '../middlewares/authentication.middleware.js';
import {env} from '../config/environment.js';
import { UpdateDriverDto } from '../dto/driver/updateDriver.dto.js';
import { DriverResource } from '../resource/drivers/driver.resource.js';
import OrderService from '../services/order.service.js';
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";
import multer from "multer";

export class DriverController {
    public router: Router = Router();
      public path = '/drivers';
      private driverService = Container.get(DriverService); // Assuming driverService is also UserService
      private orderService = Container.get(OrderService); // Assuming you have an OrderService for order-related operations
      constructor() {
        this.initializeRoutes();
      }

    private initializeRoutes() {
        // Define your routes here
       // route to update driver details
        const storage = new CloudinaryStorage({
              cloudinary: cloudinary,
              params: async (req, file) => {
                const originalExt = file.originalname.split(".").pop(); // Get original file extension
                
                return {
                  folder: "uploads",
                  format: originalExt, // Use original extension
                  public_id: Date.now() + "-" + file.originalname.replace(/\s+/g, "_").replace(`.${originalExt}`, ""), // Remove original extension from name
                };
              },
            });
        const upload = multer({ storage });
        this.router.put(`${this.path}/:id`, authenticationMiddleware, upload.single('profilePic'), this.updateDriver.bind(this));
        this.router.get(`${this.path}`, authenticationMiddleware, this.getDrivers.bind(this));
        this.router.get(`${this.path}/income`, authenticationMiddleware, this.getDriverIncome.bind(this));
        this.router.get(`${this.path}/performance`, authenticationMiddleware, this.getDriverPerformance.bind(this));
        this.router.post(`${this.path}/:orderId/cancel`, authenticationMiddleware, this.cancelOrder.bind(this));
        this.router.get(`${this.path}/orders`, authenticationMiddleware, this.getDriverOrders.bind(this));
    }

    private updateDriver = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const paramDriverId = req.params.id;
            const driverData: UpdateDriverDto = req.body;

            // Validate that the driver ID matches the authenticated user's ID
            if (req.email !== env.ADMIN.EMAIL && req.driverId !== paramDriverId) {
                return res.status(403).json({ success: false, message: "Unauthorized access" });
            }
            if (req.file) {
                driverData.profilePicture = req.file.path.split("image/upload/")[1]; // Assuming the file path is stored in req.file.path
            }
            console.log("Updating driver with ID:", paramDriverId, "and data:", driverData);
            await this.driverService.updateDriver(paramDriverId, driverData);
            res.status(200).json({ success: true, message: "Driver Updated Successfully" });
        } catch (error) {
            console.error("Error updating driver:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private getDrivers = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (req.email !== env.ADMIN.EMAIL) {
                return res.status(403).json({ success: false, message: "Unauthorized access" });
            }
            const drivers = await this.driverService.findAllDrivers();
            res.status(200).json({ success: true, data: DriverResource.toResponseArray(drivers) });
        } catch (error) {
            console.error("Error fetching drivers:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private getDriverIncome = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const driverId = req.driverId;
            if (!driverId) {
                return res.status(400).json({ success: false, message: "Driver ID is required." });
            }
            const income = await this.driverService.getDriverIncome(driverId);
            if (!income) {
                return res.status(404).json({ success: false, message: "No income" });
            }
            res.status(200).json({ success: true, data: income });
        } catch (error) {
            console.error("Error fetching driver income:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private getDriverPerformance = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const driverId = req.driverId;
            if (!driverId) {
                return res.status(400).json({ success: false, message: "Driver ID is required." });
            }
            const performance = await this.driverService.getDriverPerformance(driverId);
            if (!performance) {
                return res.status(404).json({ success: false, message: "No performance data found." });
            }
            res.status(200).json({ success: true, data: performance });
        } catch (error) {
            console.error("Error fetching driver performance:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private cancelOrder = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const orderId = req.params.orderId;
            const driverId = req.driverId; // Get driverId from the authenticated request
            const cancellationReason = req.body.reason; // Assuming reason is sent in the request body
            if (!orderId) {
                return res.status(400).json({ success: false, message: "Order ID is required." });
            }
            await this.driverService.cancelOrder(driverId, orderId, cancellationReason);
            res.status(200).json({ success: true, message: "Order cancelled successfully." });
        } catch (error) {
            console.error("Error cancelling order:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private getDriverOrders = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const driverId = req.driverId;
            if (!driverId) {
                return res.status(400).json({ success: false, message: "Driver ID is required." });
            }
            const orders = await this.orderService.getDriverOrders(driverId);
            res.status(200).json({ success: true, data: orders });
        } catch (error) {
            console.error("Error fetching driver orders:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}