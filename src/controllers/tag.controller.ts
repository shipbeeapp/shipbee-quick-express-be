import { Router, Request, Response } from "express";
import {authenticationMiddleware, AuthenticatedRequest } from '../middlewares/authentication.middleware.js';
import {Container} from "typedi";
import TagService from "../services/tag.service.js";
import { env } from "../config/environment.js";

export class TagController {
  public router: Router = Router();
  private tagService: TagService = Container.get(TagService);
  private path = '/tags';
  
  constructor() {
    this.initializeRoutes();
  }

    private initializeRoutes() {
        this.router.get(
            this.path, 
            authenticationMiddleware, 
            this.getAllTags.bind(this)
        );

        this.router.get(
            `${this.path}/:id`, 
            authenticationMiddleware, 
            this.getTagById.bind(this)
        );

        this.router.post(
            this.path, 
            authenticationMiddleware, 
            this.createTag.bind(this)
        );

        this.router.put(
            `${this.path}/:id`, 
            authenticationMiddleware, 
            this.updateTag.bind(this)
        );

        this.router.post(
            `${this.path}/attach-drivers`, 
            authenticationMiddleware, 
            this.attachTagsToDrivers.bind(this)
        );
    }

    private async getAllTags(req: AuthenticatedRequest, res: Response) {
        try {
            if (req.email !== env.ADMIN.EMAIL) 
                return res.status(403).json({ success: false, message: 'Forbidden' });
            console.log('Fetching tags for user:', req.email);
            const tags = await this.tagService.getAllTags();
            console.log('Tags retrieved successfully:', tags);
            res.status(200).json({ success: true, data: tags });
        }
        catch (error) {
            console.error('Error fetching tags:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    private async createTag(req: AuthenticatedRequest, res: Response) {
        try {
            if (req.email !== env.ADMIN.EMAIL)
                return res.status(403).json({ success: false, message: 'Forbidden' });
            const { name } = req.body;
            if (!name) {
                return res.status(400).json({ success: false, message: 'Tag name is required' });
            }
            console.log('Creating tag with name:', name, 'by user:', req.email);
            const newTag = await this.tagService.createTag(name);
            console.log('Tag created successfully:', newTag);
            res.status(201).json({ success: true, data: newTag });
        }
        catch (error) {
            console.error('Error creating tag:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    private async getTagById(req: AuthenticatedRequest, res: Response) {
        try {
            if (req.email !== env.ADMIN.EMAIL)
                return res.status(403).json({ success: false, message: 'Forbidden' });
            const tagId = req.params.id;
            console.log('Fetching tag with ID:', tagId, 'for user:', req.email);
            const tag = await this.tagService.getTagById(tagId);
            console.log('Tag retrieved successfully:', tag);
            res.status(200).json({ success: true, data: tag });
        }
        catch (error) {
            console.error('Error fetching tag by ID:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    private async updateTag(req: AuthenticatedRequest, res: Response) {
        try {
            if (req.email !== env.ADMIN.EMAIL)
                return res.status(403).json({ success: false, message: 'Forbidden' });
            const tagId = req.params.id;
            const { name } = req.body;
            if (!name) {
                return res.status(400).json({ success: false, message: 'Tag name is required' });
            }
            console.log('Updating tag with ID:', tagId, 'to new name:', name, 'by user:', req.email);
            const updatedTag = await this.tagService.updateTag(tagId, name);
            console.log('Tag updated successfully:', updatedTag);
            res.status(200).json({ success: true, data: updatedTag });
        }
        catch (error) {
            console.error('Error updating tag:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    private async attachTagsToDrivers(req: AuthenticatedRequest, res: Response) {
        try {            
            if (req.email !== env.ADMIN.EMAIL)
                return res.status(403).json({ success: false, message: 'Forbidden' });

            const { driverIds, tags } = req.body;
            if (!Array.isArray(driverIds) || !Array.isArray(tags)) {
                return res.status(400).json({ success: false, message: 'driverIds and tags must be arrays' });
            }
            console.log('Attaching tags to drivers. Driver IDs:', driverIds, 'Tags:', tags, 'by user:', req.email);
            await this.tagService.attachTagsToDrivers(driverIds, tags);
            console.log('Tags attached to drivers successfully');
            res.status(200).json({ success: true, message: 'Tags attached to drivers successfully' });
        }
        catch (error) {
            console.error('Error attaching tags to drivers:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}