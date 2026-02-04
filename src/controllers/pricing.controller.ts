import { Router, Request, Response } from 'express';
import { authenticationMiddleware, AuthenticatedRequest } from '../middlewares/authentication.middleware.js';
import { CreatePricingDTO } from '../dto/pricing/createPricingDTO.dto.js';
import { env } from '../config/environment.js';
import { GetPricingDTO } from '../dto/pricing/getPricingDTO.dto.js';
import PricingService from '../services/pricing.service.js';
import { Container } from 'typedi';
import validateDto from '../middlewares/validation.middleware.js';

export class PricingController {
    public path = '/pricing';
    public router: Router = Router(); 
    private pricingService = Container.get(PricingService);

    constructor() {

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // this.router.get(this.path, this.getTermsAndConditions.bind(this));
    this.router.post(this.path, authenticationMiddleware, this.createPricing.bind(this));
    //update pricing
    this.router.put(`${this.path}/:id`, authenticationMiddleware, this.updatePricing.bind(this));
    //get current pricing
    this.router.get(`${this.path}/calculate`, validateDto(GetPricingDTO), this.calculatePricing.bind(this));
    /**
     * @swagger
     * /api/pricing/quick:
     *   get:
     *     summary: Get quick pricing
     *     description: |
     *       Retrieves pricing for all available vehicles for a quick delivery based on `distance` and optional `lifters`. 
     *       Vehicles like Motorcycle have a max distance limit (e.g., 15 km).
     *     tags:
     *       - Pricing
     *     parameters:
     *       - in: query
     *         name: distance
     *         schema:
     *           type: number
     *           example: 10
     *         required: true
     *         description: Distance in kilometers
     *       - in: query
     *         name: lifters
     *         schema:
     *           type: number
     *           example: 0
     *         required: false
     *         description: Number of lifters
     *     responses:
     *       200:
     *         description: Quick pricing calculated successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 pricing:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       vehicleType:
     *                         type: string
     *                         example: "Sedan Car"
     *                       totalCost:
     *                         type: number
     *                         example: 120
     *       400:
     *         description: Missing required parameter or invalid request
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: false
     *                 message:
     *                   type: string
     *                   example: "Distance is required"
     *       500:
     *         description: Error calculating pricing
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: false
     *                 message:
     *                   type: string
     *                   example: "Error fetching quick pricing"
     */

    this.router.get(`${this.path}/quick`, this.getQuickPricing.bind(this))
    this.router.post(`/user-pricing`, authenticationMiddleware, this.createUserPricing.bind(this))
  }

    private async createPricing(req: AuthenticatedRequest, res: Response) {
        if (req.email != env.ADMIN.EMAIL) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }
        const pricingData: CreatePricingDTO[] = Array.isArray(req.body) ? req.body : [req.body];

        try {
            const newPricing = await this.pricingService.createPricing(pricingData);
            res.status(201).json(newPricing);
        } catch (error) {
            console.error('Error creating pricing:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async createUserPricing(req: AuthenticatedRequest, res: Response) {
        if (req.email != env.ADMIN.EMAIL) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }
        const pricingData: CreatePricingDTO[] = Array.isArray(req.body) ? req.body : [req.body];

        try {
            const newPricing = await this.pricingService.createUserPricing(pricingData);
            res.status(201).json(newPricing);
        } catch (error) {
            console.error('Error creating pricing:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }


    private async updatePricing(req: AuthenticatedRequest, res: Response) {
        try {
            if (req.email != env.ADMIN.EMAIL) {
                return res.status(403).json({ error: 'Unauthorized access' });
            }

            const { id } = req.params;
            const pricingData: CreatePricingDTO = req.body;

            const newPricing = await this.pricingService.updatePricing(id, pricingData);
            res.status(200).json(newPricing);
        } catch (error) {
            console.error('Error updating pricing:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async calculatePricing(req: Request, res: Response) {
        try {
            const getPricingDTO = req.query as any;
            const currentPricing = await this.pricingService.getAllExpressPricings(getPricingDTO)
            res.status(200).json(currentPricing);
        } catch (error) {
            console.error('Error fetching current pricing:', error);
            res.status(400).json({ error: `${error.message}` });
        }
    }

    private async getQuickPricing(req: Request, res: Response) {
        try {
            const {distance, lifters} = req.query
            if (!distance) {
                return res.status(400).json({success: false, message: "Distance is required"})
            }
            console.log("distance in req.body: ", distance, " lifters in req.body: ", lifters)
            const quickPricings = await this.pricingService.getAllQuickPricings(Number(distance), Number(lifters));
            res.status(200).json({success: true, pricing: quickPricings})
        }
        catch (err) {
            console.error(err.message)
            throw new Error(`Error fetching quick pricing: ${err.message}`)
        }
    }
}