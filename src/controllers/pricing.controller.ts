import { Router, Request, Response } from 'express';
import { Pricing } from '../models/pricing.model.js';
import { AppDataSource } from '../config/data-source.js';
import authenticationMiddleware, { AuthenticatedRequest } from '../middlewares/authentication.middleware.js';
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
    private pricingRepository = AppDataSource.getRepository(Pricing);

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
            const getPricingDTO: GetPricingDTO = req.body;
            const currentPricing = await this.pricingService.calculatePricing(getPricingDTO)
            res.status(200).json(currentPricing);
        } catch (error) {
            console.error('Error fetching current pricing:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}