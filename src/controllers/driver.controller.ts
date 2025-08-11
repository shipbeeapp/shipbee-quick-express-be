import { Router, Request, Response } from 'express';
import {Container} from 'typedi';
import DriverService from '../services/driver.service.js';
import authenticationMiddleware from '../middlewares/authentication.middleware.js';
import { AuthenticatedRequest } from '../middlewares/authentication.middleware.js';
import {env} from '../config/environment.js';
import { UpdateDriverDto } from '../dto/driver/updateDriver.dto.js';
import { DriverResource } from '../resource/drivers/driver.resource.js';

export class DriverController {
    public router: Router = Router();
      public path = '/drivers';
      private driverService = Container.get(DriverService); // Assuming driverService is also UserService
      constructor() {
        this.initializeRoutes();
      }

    private initializeRoutes() {
        // Define your routes here
       // route to update driver details
        this.router.put(`${this.path}/:id`, authenticationMiddleware, this.updateDriver.bind(this));
        this.router.get(`${this.path}`, authenticationMiddleware, this.getDrivers.bind(this));
        this.router.get(`${this.path}/income`, authenticationMiddleware, this.getDriverIncome.bind(this));
        this.router.get(`${this.path}/performance`, authenticationMiddleware, this.getDriverPerformance.bind(this));
    }

    private updateDriver = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const paramDriverId = req.params.id;
            const driverData: UpdateDriverDto = req.body;

            // Validate that the driver ID matches the authenticated user's ID
            if (req.email !== env.ADMIN.EMAIL) {
                return res.status(403).json({ success: false, message: "Unauthorized access" });
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
}