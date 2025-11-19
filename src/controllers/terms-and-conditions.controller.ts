import { Router, Response, Request } from "express";
import { TermsAndConditions } from "../models/terms-and-conditions.model.js";
import { AppDataSource } from "../config/data-source.js";
import {authenticationMiddleware, AuthenticatedRequest } from "../middlewares/authentication.middleware.js";
import { env } from "../config/environment.js";


export class TermsAndConditionsController {
    public path = '/terms-and-conditions';
    public router: Router = Router(); 
    private termsAndConditionsRepository = AppDataSource.getRepository(TermsAndConditions);

    constructor() {

    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(this.path, this.getTermsAndConditions.bind(this));
    this.router.post(this.path, authenticationMiddleware, this.createTermsAndConditions.bind(this));
  }

  private async getTermsAndConditions(req: Request, res: Response) {
    const termsAndConditions = await this.termsAndConditionsRepository.findOne({
        where: {},
        order: { updatedAt: "DESC" }
    });
    if (!termsAndConditions) {
        return res.status(404).send({ message: "Terms and Conditions not found" });
    }
    res.send({
        content: termsAndConditions.content,
        updatedAt: termsAndConditions.updatedAt,
    });
  }

  private createTermsAndConditions(req: AuthenticatedRequest, res: Response) {
    console.log("Creating new terms and conditions with content:", req.body.content);
    if (!req.body.content) {
        return res.status(400).send({ message: "Content is required" });
    }
    if (req.email !== env.ADMIN.EMAIL) {
        return res.status(403).send({ message: "Unauthorized access" });
    }
    const termsAndConditions = this.termsAndConditionsRepository.create({
        content: req.body.content
    });
    this.termsAndConditionsRepository.save(termsAndConditions);
    res.status(201).send(termsAndConditions);
  }
}