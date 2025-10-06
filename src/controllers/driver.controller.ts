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
import { DriverDto } from '../dto/driver/driver.dto.js';
import { sendDriverSignUpMail } from '../services/email.service.js';

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
        this.router.post(`${this.path}/signup`,
            upload.fields([
              { name: "qidFront", maxCount: 1 },
              { name: "qidBack", maxCount: 1 },
              { name: "driverRegistrationFront", maxCount: 1 },
              { name: "driverRegistrationBack", maxCount: 1 },
              { name: "vehicleRegistrationFront", maxCount: 1 },
              { name: "vehicleRegistrationBack", maxCount: 1 },
            ]),
            this.signupDriver.bind(this));
        this.router.put(`${this.path}/:id/approve-reject`, authenticationMiddleware, this.approveOrRejectDriver.bind(this));
        this.router.get(`${this.path}/:id`, authenticationMiddleware, this.getDriver.bind(this)); // For testing via browser
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

    private signupDriver = async (req: Request, res: Response) => {
        try {
            const driverData: DriverDto  = req.body;
            if (!driverData.phoneNumber || !driverData.name) {
                return res.status(400).json({ success: false, message: 'Email, phone number and name are required.' });
            }
            if (req.files) {
              const files = req.files as { [fieldname: string]: Express.Multer.File[] };
              console.log("Files received during driver signup:", files);
              driverData.qidFront = files['qidFront'] ? files['qidFront'][0].path.split("/upload/")[1] : undefined;
              driverData.qidBack = files['qidBack'] ? files['qidBack'][0].path.split("/upload/")[1] : undefined;
              driverData.driverRegistrationFront = files['driverRegistrationFront'] ? files['driverRegistrationFront'][0].path.split("/upload/")[1] : undefined;
              driverData.driverRegistrationBack = files['driverRegistrationBack'] ? files['driverRegistrationBack'][0].path.split("/upload/")[1] : undefined;
              driverData.vehicleRegistrationFront = files['vehicleRegistrationFront'] ? files['vehicleRegistrationFront'][0].path.split("/upload/")[1] : undefined;
              driverData.vehicleRegistrationBack = files['vehicleRegistrationBack'] ? files['vehicleRegistrationBack'][0].path.split("/upload/")[1] : undefined;
            }
            const driver = await this.driverService.findOrCreateDriver(driverData);
            await sendDriverSignUpMail(driverData.name, driverData.phoneNumber);
            res.status(201).json({ success: true, message: 'Driver signed up successfully', data: DriverResource.toResponse(driver) });
        }
        catch (error) {
            console.error('Error signing up driver:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private approveOrRejectDriver = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const paramDriverId = req.params.id;
            const action = req.body.action; // 'approve' or 'reject'
            if (req.email !== env.ADMIN.EMAIL) {
                return res.status(403).json({ success: false, message: "Unauthorized access" });
            }
            await this.driverService.approveOrRejectDriver(paramDriverId, action);
            res.status(200).json({ success: true, message: "Driver Approved Successfully" });
        } catch (error) {
            console.error("Error approving driver:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    } 
    
    private getDriver = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const paramDriverId = req.params.id;
            // Validate that the driver ID matches the authenticated user's ID
            if (req.email !== env.ADMIN.EMAIL && req.driverId !== paramDriverId) {
                return res.status(403).json({ success: false, message: "Unauthorized access" });
            }
            const driver = await this.driverService.findDriverById(paramDriverId);
            if (!driver) {
                return res.status(404).json({ success: false, message: "Driver not found" });
            }
            res.status(200).json({ success: true, data: DriverResource.toResponse(driver) });

        } catch (error) {
            console.error("Error fetching driver:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}