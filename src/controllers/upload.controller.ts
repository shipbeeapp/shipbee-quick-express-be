import { NextFunction, Response, Router, Request } from 'express';
import {AuthenticatedRequest, authenticationMiddleware} from '../middlewares/authentication.middleware.js';
import { env } from '../config/environment.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import multer from 'multer';
import { console } from 'inspector';

export class UploadController {
  public router: Router = Router();
  public path = '/upload';

  private s3Client: S3Client;
  private uploadMiddleware: multer.Multer;


  constructor() {
    this.s3Client = new S3Client({region: env.AWS.REGION});
    this.uploadMiddleware = multer({storage: multer.memoryStorage()});
    this.initializeRoutes();
  }


  private initializeRoutes() {
    this.router.post(
        `${this.path}/forced-updates`, 
        authenticationMiddleware, 
        this.uploadMiddleware.single('file'),
        this.upload.bind(this)
    );
  }
 
  private async upload(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        if (req.email !== env.ADMIN.EMAIL) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        console.log('Received file:', req.file.originalname, 'size:', req.file.size, 'bytes');
        const s3Key = env.AWS.FILENAME; // static key, overwrites existing file
        const putCommand = new PutObjectCommand({
          Bucket: env.AWS.BUCKET_NAME,
          Key: s3Key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          CacheControl: 'no-store', // ensures mobile app always gets latest
        });
        console.log('Uploading file to S3 with key:', s3Key);
        await this.s3Client.send(putCommand);
        console.log('File uploaded successfully to S3');

        res.status(200).json({ message: 'File uploaded successfully' });
    } catch (error) {    
        console.error('Error uploading file:', error.message);
        res.status(500).json({ message: 'Internal server error' });        
    }
  }
}