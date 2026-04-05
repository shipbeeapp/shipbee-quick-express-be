
import { Router, Request, Response } from 'express';
import { getAirRates, getSeaRates, getLandRates, unifiedTrack, unifiedBooking } from '../services/freight/freight.service.js';

export class FreightController {
  public readonly router: Router;

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post('/rates/air', this.airRatesHandler);
    this.router.post('/rates/sea', this.seaRatesHandler);
    this.router.post('/rates/land', this.landRatesHandler);
    this.router.get('/unified/track', this.unifiedTrackHandler);
    this.router.post('/unified/booking', this.unifiedBookingHandler);
  }

  private async airRatesHandler(req: Request, res: Response) {
    try {
      const result = await getAirRates(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(200).json({ rates: [], total: 0, error: error.message });
    }
  }

  private async seaRatesHandler(req: Request, res: Response) {
    try {
      const result = await getSeaRates(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(200).json({ rates: [], total: 0, error: error.message });
    }
  }

  private async landRatesHandler(req: Request, res: Response) {
    try {
      const result = await getLandRates(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(200).json({ rates: [], total: 0, error: error.message });
    }
  }

  private async unifiedTrackHandler(req: Request, res: Response) {
    try {
      const result = await unifiedTrack(req.query);
      res.json(result);
    } catch (error: any) {
      res.status(200).json({ found: false, error: error.message });
    }
  }

  private async unifiedBookingHandler(req: Request, res: Response) {
    try {
      const result = await unifiedBooking(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(200).json({ success: false, error: error.message });
    }
  }
}
