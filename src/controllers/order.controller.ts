import { Router, Request, Response } from "express";
import multer from "multer";
import OrderService  from "../services/order.service.js";
import {Container} from "typedi";
import validateDto from "../middlewares/validation.middleware.js";
import {CreateOrderDto} from "../dto/order/createOrder.dto.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";
import { AuthenticatedRequest, authenticationMiddleware } from "../middlewares/authentication.middleware.js";
import { env } from "../config/environment.js";
import jwt from 'jsonwebtoken';

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

    this.router.get("/orders", authenticationMiddleware, this.getOrders.bind(this));
    // route to update order status. I want only admin to be able to update order status
    this.router.put("/orders/:orderId/status", authenticationMiddleware, this.updateOrderStatus.bind(this));
    // view order details by orderId
    this.router.get("/orders/:orderId", authenticationMiddleware, this.getOrderDetails.bind(this));
    // accept order by driver
    this.router.post("/orders/:orderId/accept", authenticationMiddleware, this.acceptOrder.bind(this));

    this.router.post(
      "/orders/:orderId/start",
      authenticationMiddleware,
      this.startOrder.bind(this)
    );

    this.router.post(
      "/orders/:orderId/complete",
      authenticationMiddleware,
      this.completeOrder.bind(this),
    );

    this.router.post(
    "/orders/:orderId/proof",
    authenticationMiddleware, // Only authenticated drivers
    upload.single("proof"),
    this.uploadProofOfOrder.bind(this)
  );
  }

  private async createOrder(req: Request, res: Response) {
    try {
      let userId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const decoded: any = jwt.verify(token, env.JWT_SECRET); // adjust secret as needed
          userId = decoded.userId;
        } catch (err) {
          // Invalid token, ignore and proceed as guest
          console.error("Invalid token:", err.message);
          return res.status(401).json({ success: false, message: "Invalid token" });
        }
      }
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
      const order = await this.orderService.createOrder(orderData, userId);
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      console.error("Error in order controller creating order:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async getOrders(req: AuthenticatedRequest, res: Response) {
    try {
      console.log("Authenticated user ID:", req.userId);
      console.log("Authenticated user email:", req.email);
      let orders;
      console.log("admin in email: ", env.ADMIN.EMAIL);
      if (req.email == env.ADMIN.EMAIL) orders = await this.orderService.getOrders();
      else orders = await this.orderService.getOrdersbyUser(req.userId);
      res.status(200).json({ success: true, orders: orders });
    } catch (error) {
      console.error("Error in order controller getting orders:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async updateOrderStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      if (req.email !== env.ADMIN.EMAIL) {
          return res.status(403).json({ success: false, message: "You are not authorized to update order status." });

      }
      if (!orderId || !status) {
        return res.status(400).json({ success: false, message: "Order ID and status are required." });
      }

      await this.orderService.updateOrderStatus(orderId, status);
      res.status(200).json({ success: true, message: "Order Status Updated Successfully" });
    } catch (error) {
      console.error("Error in order controller updating order status:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async getOrderDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required." });
      }
      const order = await this.orderService.getOrderDetails(orderId);
      // Check if the authenticated user is the sender or an admin
      if (req.userId !== order.sender.id && req.email !== env.ADMIN.EMAIL) {
        return res.status(403).json({ success: false, message: "You are not authorized to view this order." });
      }
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }
      res.status(200).json({ success: true, data: order });
    } catch (error) {
      console.error("Error in order controller getting order details:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async acceptOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const driverId = req.driverId; // Get driverId from the authenticated request
      if (!orderId || !driverId) {
        return res.status(400).json({ success: false, message: "Order ID and Driver ID are required." });
      }
      const order = await this.orderService.acceptOrder(orderId, driverId);
      res.status(200).json({ success: true, message: "Order accepted successfully." });
    } catch (error) {
      console.error("Error in order controller accepting order:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async uploadProofOfOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const driverId = req.driverId; // Get driverId from the authenticated request
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required." });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Proof of order file is required." });
      }
      const proofUrl = req.file.path; // Assuming the file path is stored in req.file.path
      // Optionally: check if this driver is assigned to this order
      const driver = await this.orderService.getOrderDriver(orderId);
      if (!driver || driver.id !== driverId) {
        return res.status(403).json({ success: false, message: "Not authorized for this order" });
      }
      await this.orderService.updateProofOfOrder(orderId, proofUrl);
      res.status(200).json({ success: true, message: "Proof of order uploaded successfully." });
    } catch (error) {
      console.error("Error in order controller uploading proof of order:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async startOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const driverId = req.driverId; // Get driverId from the authenticated request
      if (!orderId || !driverId) {
        return res.status(400).json({ success: false, message: "Order ID and Driver ID are required." });
      }
      await this.orderService.startOrder(orderId, driverId);
      res.status(200).json({ success: true, message: "Order started successfully." });
    } catch (error) {
      console.error("Error in order controller starting order:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async completeOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const driverId = req.driverId; // Get driverId from the authenticated request
      if (!orderId || !driverId) {
        return res.status(400).json({ success: false, message: "Order ID and Driver ID are required." });
      }
      await this.orderService.completeOrder(orderId, driverId);
      res.status(200).json({ success: true, message: "Order completed successfully." });
    } catch (error) {
      console.error("Error in order controller completing order:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }
}