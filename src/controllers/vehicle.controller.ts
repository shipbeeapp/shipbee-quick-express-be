import { Router } from 'express';
import { Container } from 'typedi';
import VehicleService from '../services/vehicle.service.js';
import { env } from '../config/environment.js';

export class VehicleController {
  public router: Router = Router();
  private vehicleService = Container.get(VehicleService);

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/vehicles', this.getAllVehicles.bind(this));
        this.router.get('/vehicles/:id', this.getVehicleById.bind(this));
        this.router.get('/vehicle-types', this.getAllVehicleTypes.bind(this));
        this.router.get('/vehicle-info', this.getVehicleInfo.bind(this));
        // Additional routes for creating, updating, and deleting vehicles can be added here
    }

    private async getAllVehicles(req, res) {
        try {
            const vehicles = await this.vehicleService.getAllVehicles();
            res.status(200).json({ success: true, data: vehicles });
        } catch (error) {
            console.error("Error fetching vehicles:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private async getVehicleById(req, res) {
        const vehicleId = req.params.id;
        try {
            const vehicle = await this.vehicleService.getVehicleById(vehicleId);
            res.status(200).json({ success: true, data: vehicle });
        } catch (error) {
            console.error("Error fetching vehicle by ID:", error.message);
            res.status(404).json({ success: false, message: error.message });
        }
    }

    private async getAllVehicleTypes(req, res) {
        try {
            const vehicleTypes = await this.vehicleService.getAllVehicleTypes();
            res.status(200).json({ success: true, data: vehicleTypes });
        } catch (error) {
            console.error("Error fetching vehicle types:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private async getVehicleInfo(req, res) {
        try {
            const {distance, pickUpDate} = req.query;
            // You can use distance and pickUpDate to filter or customize the response if needed
            // For now, we'll just fetch all vehicle names and images
            const vehicleInfo = await this.vehicleService.getVehicleInfo(distance, pickUpDate);
            res.status(200).json({ success: true, data: vehicleInfo, lifterCost: Number(env.PER_LIFTER_COST) });
        }
        catch (error) {
            console.error("Error fetching vehicle names and images:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}