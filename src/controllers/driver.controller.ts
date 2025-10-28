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
import validationMiddleware from '../middlewares/validation.middleware.js';
import bcrypt from 'bcrypt';
import { VehicleType } from '../utils/enums/vehicleType.enum.js';

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
              { name: "driverLicenseFront", maxCount: 1 },
              { name: "driverLicenseBack", maxCount: 1 },
              { name: "vehicleRegistrationFront", maxCount: 1 },
              { name: "vehicleRegistrationBack", maxCount: 1 },
              { name: "profilePicture", maxCount: 1 },
              { name: "vehicleLeft", maxCount: 1 },
              { name: "vehicleRight", maxCount: 1 },
              { name: "vehicleFront", maxCount: 1 },
              { name: "vehicleBack", maxCount: 1 },
              { name: "crPhoto", maxCount: 1 },
              { name: "taxId", maxCount: 1 },
            ]),
            validationMiddleware(DriverDto),
            this.signupDriver.bind(this));
        this.router.put(`${this.path}/:id/approve-reject`, authenticationMiddleware, this.approveOrRejectDriver.bind(this));
        this.router.get(`${this.path}/invited-drivers`, authenticationMiddleware, this.getInvitedDriversByBusinessOwner.bind(this));
        this.router.post(`${this.path}/send-otp`, this.sendOtp.bind(this));
        this.router.post(`${this.path}/verify-otp`, this.verifyOtp.bind(this));
        this.router.get(`${this.path}/nearest-active`, authenticationMiddleware, this.getNearestActiveDrivers.bind(this));
        this.router.post(`${this.path}/assign`, authenticationMiddleware, this.assignDriverToOrder.bind(this));
        this.router.post(`${this.path}/invite-by-business`, authenticationMiddleware, this.inviteDriverByBusinessOwner.bind(this));
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
                
                driverData.licenseFront = files['driverLicenseFront'] ? files['driverLicenseFront'][0].path.split("/upload/")[1] : undefined;
                driverData.licenseBack = files['driverLicenseBack'] ? files['driverLicenseBack'][0].path.split("/upload/")[1] : undefined;
                
                driverData.registrationFront = files['vehicleRegistrationFront'] ? files['vehicleRegistrationFront'][0].path.split("/upload/")[1] : undefined;
                driverData.registrationBack = files['vehicleRegistrationBack'] ? files['vehicleRegistrationBack'][0].path.split("/upload/")[1] : undefined;
                driverData.profilePicture = files['profilePicture'] ? files['profilePicture'][0].path.split("/upload/")[1] : undefined;
                  // Vehicle photos
                
                driverData.leftPhoto = files['vehicleLeft'] ? files['vehicleLeft'][0].path.split("/upload/")[1] : undefined;
                driverData.rightPhoto = files['vehicleRight'] ? files['vehicleRight'][0].path.split("/upload/")[1] : undefined;
                driverData.frontPhoto = files['vehicleFront'] ? files['vehicleFront'][0].path.split("/upload/")[1] : undefined;
                driverData.backPhoto = files['vehicleBack'] ? files['vehicleBack'][0].path.split("/upload/")[1] : undefined;

                driverData.crPhoto = files['crPhoto'] ? files['crPhoto'][0].path.split("/upload/")[1] : undefined;
                driverData.taxId = files['taxId'] ? files['taxId'][0].path.split("/upload/")[1] : undefined;
                console.log("Processed driver data with file paths:", driverData);
            }
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(driverData.password, saltRounds);
            driverData.password = hashedPassword;
            await this.driverService.findOrCreateDriver(driverData);
            await sendDriverSignUpMail(driverData.name, driverData.phoneNumber);
            res.status(201).json({ success: true, message: 'Driver signed up successfully' });
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

    private sendOtp = async (req: Request, res: Response) => {
        try {
            const { phoneNumber } = req.body;
            if (!phoneNumber) {
                return res.status(400).json({ success: false, message: "Phone number is required." });
            }
            const driver = await this.driverService.findDriverByPhone(phoneNumber);
            if (driver) {
                return res.status(400).json({ success: false, message: "Driver with this phone number already exists. Please sign in with your password and phone", driverExists: true });
            }
            const otp = await this.driverService.sendOtp(phoneNumber);
            const result = { success: true, message: "OTP sent successfully.", driverExists: false };
            if (env.APP_ENV !== 'production') {
                console.log(`OTP for phone number ${phoneNumber}: ${otp}`);
                Object.assign(result, { otp }); // Include OTP in response for non-production environments
            }
            res.status(200).json(result); // In production, do not send OTP in response
        } catch (error) {
            console.error("Error sending OTP:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private verifyOtp = async (req: Request, res: Response) => {
        try {
            const { phoneNumber, otp } = req.body;
            if (!phoneNumber || !otp) {
                return res.status(400).json({ success: false, message: "Phone number and OTP are required." });
            }
            const isValid = await this.driverService.verifyOtp(phoneNumber, otp);
            if (!isValid) {
                return res.status(400).json({ success: false, message: "Invalid OTP." });
            }
            const driver = await this.driverService.findDriverByPhone(phoneNumber);
            res.status(200).json({ success: true, message: "OTP verified successfully.", type: driver.type, invitedByBusiness: driver.businessOwner ? true : false, businessOwnerId: driver.businessOwner ? driver.businessOwner?.id : null });
        } catch (error) {
            console.error("Error verifying OTP:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private getNearestActiveDrivers = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (req.email !== env.ADMIN.EMAIL) {
                return res.status(403).json({ success: false, message: "Unauthorized access" });
            }
            const { vehicleType, pickUpCoordinates } = req.query;
            const drivers = await this.driverService.getNearestActiveDrivers(vehicleType as VehicleType, pickUpCoordinates as string);
            res.status(200).json({ success: true, data: drivers });
        }
        catch (error) {
            console.error("Error fetching nearest active drivers:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private assignDriverToOrder = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (req.email !== env.ADMIN.EMAIL) {
                return res.status(403).json({ success: false, message: "Unauthorized access" });
            }
            const { driverId, orderId } = req.body;
            await this.driverService.assignDriverToOrder(driverId, orderId);
            res.status(200).json({ success: true, message: "Driver assigned to order successfully." });
        }
        catch (error) {
            console.error("Error assigning driver to order:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private inviteDriverByBusinessOwner = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const businessOwnerId = req.driverId;
            const { phoneNumber } = req.body;
            if (!businessOwnerId) {
                return res.status(400).json({ success: false, message: "Business owner ID is required." });
            }
            await this.driverService.inviteDriverByBusinessOwner(businessOwnerId, phoneNumber);
            res.status(200).json({ success: true, message: "Driver invited successfully." });
        }
        catch (error) {
            console.error("Error inviting driver by business owner:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private getInvitedDriversByBusinessOwner = async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log("Fetching invited drivers by business owner");
            const businessOwnerId = req.driverId;
            console.log("Business Owner ID:", businessOwnerId);
            if (!businessOwnerId) {
                return res.status(400).json({ success: false, message: "Business owner ID is required." });
            }
            const drivers = await this.driverService.getInvitedDriversByBusinessOwner(businessOwnerId);
            res.status(200).json({ success: true, data: drivers });
        }
        catch (error) {
            console.error("Error fetching invited drivers by business owner:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}