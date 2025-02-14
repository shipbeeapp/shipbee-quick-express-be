import { Router, Request, Response } from "express";
import multer from "multer";
import OrderService  from "../services/order.service.js";
import {Container} from "typedi";
import validateDto from "../middlewares/validation.middleware.js";
import {CreateOrderDto} from "../dto/order/createOrder.dto.js";

export class OrderController {
  public router: Router = Router();
  private orderService: OrderService = Container.get(OrderService);
  
  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, "uploads/"), // Save images to 'uploads'
      filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
    });
    const upload = multer({ storage });

    this.router.post(
       "/orders",
       upload.array("images", 5), 
       validateDto(CreateOrderDto), 
       this.createOrder.bind(this)
    );
  }

  private async createOrder(req: Request, res: Response) {
    try {
      console.log("req.body in create order", req.body);
      const orderData = req.body;
      console.log("orderData", orderData);
      const imageUrls = Array.isArray(req.files) ? req.files?.map(file => `/uploads/${file.filename}`) : [];      
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
}