import { Router, Response, Request } from 'express';
import authenticationMiddleware, { AuthenticatedRequest } from '../middlewares/authentication.middleware.js';
import { Container } from 'typedi';
import PromoCodeService from '../services/promoCode.service.js';
import { env } from '../config/environment.js';

export class PromoCodeController {
    public path = '/promo-codes';
    public router: Router = Router();
    private promoCodeService = Container.get(PromoCodeService); 

    constructor() {

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Define your routes here
    this.router.post(this.path, authenticationMiddleware, this.createPromoCode.bind(this));
    this.router.get(`${this.path}/check-promo`, this.checkPromoCode.bind(this));
    this.router.post(`${this.path}/:userId/apply`, authenticationMiddleware, this.applyPromoCodeOnSignup.bind(this));
    this.router.put(`${this.path}/:id`, authenticationMiddleware, this.updatePromoCode.bind(this));
  }

    private async createPromoCode(req: AuthenticatedRequest, res: Response) {
        try {
            const email = req.email
            if (email !== env.ADMIN.EMAIL) {
                return res.status(403).json({ error: 'Unauthorized access' });
            }
            const promoCodeData = req.body;
            const newPromoCode = await this.promoCodeService.createPromoCode(promoCodeData);
            res.status(201).json(newPromoCode);
        } catch (error) {
            console.error('Error creating promo code:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    private async checkPromoCode(req: Request, res: Response) {
        try {
            const code = req.query.code as string;
            const promoCode = await this.promoCodeService.getPromoCodeByCode(code);
            if (!promoCode) {
                return res.status(404).json({ valid: false, message: 'Promo code not found' });
            }
            if (!promoCode.isActive) {
                return res.status(400).json({ valid: false, message: 'Promo code is inactive' });
            }
            res.status(200).json({ valid: true, data: promoCode });
        }
        catch (error) {
            console.error('Error checking promo code:', error.message);
            res.status(500).json({ error: error.message });
        }   
    }

    private async applyPromoCodeOnSignup(req: AuthenticatedRequest, res: Response) {
        try {
            const loggedInUserId = req.userId;
            if (req.params.userId !== loggedInUserId) {
                return res.status(403).json({ error: 'Unauthorized access' });
            }
            const promoCode = req.query.promoCode as string;
            const result = await this.promoCodeService.applyPromoOnSignup(loggedInUserId, promoCode);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('Error applying promo code on signup:', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async updatePromoCode(req: AuthenticatedRequest, res: Response) {
        try {
            const email = req.email
            if (email !== env.ADMIN.EMAIL) {
                return res.status(403).json({ error: 'Unauthorized access' });
            }
            const promoCodeId = req.params.id;
            const updateData = req.body;
            const updatedPromoCode = await this.promoCodeService.updatePromoCode(promoCodeId, updateData);
            res.status(200).json(updatedPromoCode);
        } catch (error) {
            console.error('Error updating promo code:', error.message);
            res.status(500).json({ error: error.message });
        } 
    }
}
