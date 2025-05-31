import { Router, Request, Response } from "express";
import multer from "multer";
import OrderService  from "../services/order.service.js";
import {Container} from "typedi";
import validateDto from "../middlewares/validation.middleware.js";
import {CreateOrderDto} from "../dto/order/createOrder.dto.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";

export class OrderController {
  public router: Router = Router();
  private orderService: OrderService = Container.get(OrderService);
  
  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
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

    this.router.post(
       "/orders",
       upload.array("images", 5), 
       validateDto(CreateOrderDto), 
       this.createOrder.bind(this)
    );

    this.router.get("/orders", this.getOrders.bind(this));
  }

  private async createOrder(req: Request, res: Response) {
    try {
      console.log("req.body in create order", req.body);
      const orderData = req.body;
      console.log("req.files", req.files);
      const imageUrls = Array.isArray(req.files) ? req.files?.map(file => `${file.path.split("/upload/")[1]}`) : [];      
      if (orderData.itemDescription || imageUrls.length) {
        orderData.itemDescription = JSON.stringify({
            text: orderData.itemDescription || "",
            images: imageUrls,
        });
      }
      
      const order = await this.orderService.createOrder(orderData);
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      console.error("Error in order controller creating order:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async getOrders(req: Request, res: Response) {
    try {
      const orders = await this.orderService.getOrders();
      res.status(200).json({ success: true, orders: orders });
    } catch (error) {
      console.error("Error in order controller getting orders:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }
}