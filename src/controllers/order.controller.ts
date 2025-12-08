import { Router, Request, Response } from "express";
import multer from "multer";
import OrderService  from "../services/order.service.js";
import {Container} from "typedi";
import validateDto from "../middlewares/validation.middleware.js";
import {CreateOrderDto} from "../dto/order/createOrder.dto.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";
import { AuthenticatedRequest, authenticationMiddleware, apiKeyAuthenticationMiddleware } from "../middlewares/authentication.middleware.js";
import { env } from "../config/environment.js";
import jwt from 'jsonwebtoken';
import UserService from "../services/user.service.js";
import { ServiceSubcategoryName } from "../utils/enums/serviceSubcategory.enum.js";

export class OrderController {
  public router: Router = Router();
  private orderService: OrderService = Container.get(OrderService);
  private userService = Container.get(UserService);
  
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
      upload.any(), 
      validateDto(CreateOrderDto), 
      this.createOrder.bind(this)
    );

    this.router.get("/orders/report", apiKeyAuthenticationMiddleware, this.getOrdersReport.bind(this));
      
    this.router.get(
      "/orders/view-order-status",
      apiKeyAuthenticationMiddleware,
      this.viewOrderStatus.bind(this),
    )
    
    this.router.get("/orders", authenticationMiddleware, this.getOrders.bind(this));
    // route to update order status. I want only admin to be able to update order status
    this.router.put("/orders/:orderId/status", authenticationMiddleware, this.updateOrderStatus.bind(this));
    // view order details by orderId
    this.router.get("/orders/:orderId", authenticationMiddleware, this.getOrderDetails.bind(this));
    this.router.get("/order-details/:orderId", this.viewOrderDetails.bind(this)); // public route to get order details by orderId
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
      upload.single("proof"),
      this.completeOrder.bind(this),
    );

    this.router.post(
      "/orders/:orderId/proof",
      authenticationMiddleware, // Only authenticated drivers
      upload.single("proof"),
      this.uploadProofOfOrder.bind(this)
    );
    this.router.post(
      "/orders/:orderId/request-cancellation",
      authenticationMiddleware,
      this.requestOrderCancellation.bind(this)
    );

    this.router.post(
      "/orders/process-cancellation/:cancelRequestId",
      authenticationMiddleware,
      this.processOrderCancellation.bind(this)
    );

    this.router.post(
      "/orders/:orderId/notify-sender",
      authenticationMiddleware,
      this.notifySender.bind(this)
    )

    this.router.post(
      "/orders/:orderId/notify-receiver",
      authenticationMiddleware,
      this.notifyReceiver.bind(this)
    )

    this.router.put(
      "/orders/:orderId",
      authenticationMiddleware,
      this.updateOrder.bind(this)
    )

    this.router.post(
      "/orders/:orderId/client-cancel",
      authenticationMiddleware,
      this.clientCancelOrder.bind(this)
    )

    this.router.post(
      "/orders/:orderId/admin-cancel",
      authenticationMiddleware,
      this.adminApproveClientCancellation.bind(this)
    )
  }

  private async createOrder(req: Request, res: Response) {
    try {
      let userId: string | undefined;
      const authHeader = req.headers.authorization;
      const apiKey = req.headers["x-api-key"] as string | undefined;
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
      else if (apiKey) {
        // Validate API key and get associated user ID
        userId = await this.userService.getUserIdByApiKey(apiKey);
        if (!userId) {
          return res.status(401).json({ success: false, message: "Invalid API key" });
        }
      }
      console.log("req.body in create order", req.body);
      const orderData = req.body;
      console.log("req.files", req.files);
      // Map uploaded files to the correct stop
      const files = req.files as Express.Multer.File[];
      // Map uploaded files to the correct stop
      files.forEach(file => {
        // Match field like "stops[0][images]"
        const match = file.fieldname.match(/stops\[(\d+)\]\[images\]/);
        console.log("file match:", match);
        if (match) {
          const index = parseInt(match[1]);
          if (!orderData.stops[index].images) {
            orderData.stops[index].images = [];
          }
          orderData.stops[index].images.push(file.path.split('/upload/')[1]); // use URL from Cloudinary
        }
      });
      if (orderData.ServiceSubcategoryName === ServiceSubcategoryName.PERSONAL_QUICK && !orderData.stops) return res.status(400).json({ status: '400', success: false, message: "At least one stop is required." });
      // Ensure itemDescription is a JSON string with { text, images }
      if (orderData.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK) {
      orderData.stops = orderData.stops.map(stop => ({
        ...stop,
        itemDescription: JSON.stringify({
          text: stop.itemDescription || "",
          images: stop.images || []
        })
      }));
    }

      // orderData.stops = stops;
      const order = await this.orderService.createOrder(orderData, userId);
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      console.error("Error in order controller creating order:", error.message);
      res.status(400).json({ status: 400, success: false, message: error.message });
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
      const { stopId, isPickup } = req.query as { stopId?: string, isPickup?: string };
      const driverId = req.driverId; // Get driverId from the authenticated request
      if (!orderId || !driverId) {
        return res.status(400).json({ success: false, message: "Order ID and Driver ID are required." });
      }
      if (!stopId && !isPickup) {
        return res.status(400).json({ success: false, message: "Either stopId or isPickup parameter is required." });
      }
      // Convert isPickup from string to boolean
      const pickupFlag = isPickup === "true";
      await this.orderService.startOrder(orderId, driverId, stopId, pickupFlag);
      // const otp = Math.floor(1000 + Math.random() * 9000).toString();
      // console.log(`Generated OTP for order ${orderId}: ${otp}`);
      // await this.orderService.sendOtpToReceiver(orderId, otp);
      // await this.orderService.updateCompletionOtp(orderId, otp);
      res.status(200).json({ success: true, message: "Order started successfully." });
    } catch (error) {
      console.error("Error in order controller starting order:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async completeOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const { stopId } = req.query as { stopId: string };
      const driverId = req.driverId; // Get driverId from the authenticated request
      // const { otp } = req.body; // Get OTP from request body
      if (!orderId || !driverId) {
      return res.status(400).json({ success: false, message: "Order ID and Driver ID are required." });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Proof of order file is required." });
      }
      const proofUrl = req.file.path; // Assuming the file path is stored in req.file.path
      await this.orderService.completeOrder(orderId, driverId, stopId, proofUrl);
      res.status(200).json({ success: true, message: "Order completed successfully." });
    } catch (error) {
      console.error("Error in order controller completing order:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async viewOrderDetails(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const accessToken = req.query.token as string;
      if (!orderId || !accessToken) {
        return res.status(400).json({ success: false, message: "Order ID and access token are required." });
      }
      const orderDetails = await this.orderService.getOrderDetails(orderId, accessToken);
      if (orderDetails.error) {
        return res.status(orderDetails.status).json({ success: false, message: orderDetails.error });
      }
      res.status(200).json({ success: true, data: orderDetails });
    } catch (error) {
      console.error("Error in order controller viewing order details:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async requestOrderCancellation(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const driverId = req.driverId;
      const { reason } = req.body;

      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required." });
      }
      const cancellationRequestId = await this.orderService.requestOrderCancellation(driverId, orderId, reason);
      res.status(200).json({ success: true, message: "Order cancellation requested successfully.", cancellationRequestId });
    } catch (error) {
      console.error("Error in order controller requesting order cancellation:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async processOrderCancellation(req: AuthenticatedRequest, res: Response) {
    try {
      const { cancelRequestId } = req.params;
      const { action } = req.body; // 'APPROVE' or 'DECLINE'
      if (req.email !== env.ADMIN.EMAIL) {
          return res.status(403).json({ success: false, message: "You are not authorized to process order cancellations." });
      }
      await this.orderService.processOrderCancellation(cancelRequestId, action);
      res.status(200).json({ success: true, message: "Order cancellation processed successfully." });
    } catch (error) {
      console.error("Error in order controller processing order cancellation:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async notifySender(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const driverId = req.driverId;
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required." });
      }

      await this.orderService.notifySender(orderId, driverId);
      res.status(200).json({ success: true, message: "Sender notified successfully." });
    } catch (error) {
      console.error("Error in order controller notifying sender:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async notifyReceiver(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const driverId = req.driverId;
      const stopId = req.query.stopId as string;
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required." });
      }

      await this.orderService.notifyReceiver(orderId, driverId, stopId);
      res.status(200).json({ success: true, message: "Receiver notified successfully." });
    } catch (error) {
      console.error("Error in order controller notifying sender:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async updateOrder(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.email !== env.ADMIN.EMAIL) {
          return res.status(403).json({ success: false, message: "You are not authorized to update orders." });
      }
      const { orderId } = req.params;
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required." });
      }

      await this.orderService.updateOrder(orderId);
      res.status(200).json({ success: true, message: "Order updated successfully." });
    }
    catch (error) {
      console.error("Error in order controller updating order:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async viewOrderStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId, orderNo } = req.query as { orderId: string, orderNo: string };
      const userId = req.userId;

      if (!orderId && !orderNo) {
        const orders = await this.orderService.getAllOrderStatuses(userId);
        return res.status(200).json({ success: true, data: orders });
      }
      const orderStatus = await this.orderService.getOrderStatus(userId, orderId, Number(orderNo));
      res.status(200).json({ success: true, data: orderStatus });
    }
    catch (error) {
      console.error("Error in order controller viewing order status:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async clientCancelOrder(req: AuthenticatedRequest, res: Response) {
    try {
      console.log("Inside clientCancelOrder controller");
      const { orderId } = req.params;
      const userId = req.userId;

      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required." });
      }
      const {reason} = req.body;
      await this.orderService.clientCancelOrder(userId, orderId, reason);
      res.status(200).json({ success: true, message: "Order cancelled successfully." });
    }
    catch (error) {
      console.error("Error in order controller cancelling order:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async adminApproveClientCancellation(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const cancellationRequestId = req.query.cancellationRequestId as string;
      const {status, reason} = req.body;
      if (req.email !== env.ADMIN.EMAIL) {
          return res.status(403).json({ success: false, message: "You are not authorized to approve order cancellations." });
      }
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required." });
      }
      await this.orderService.adminApproveClientCancellation(orderId, cancellationRequestId, status, reason);
      res.status(200).json({ success: true, message: "Order cancellation approved successfully." });
    } 
    catch (error) {
      console.error("Error in order controller approving order cancellation:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async getOrdersReport(req: AuthenticatedRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query as { startDate?: Date, endDate?: Date };
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: "Start date and end date are required." });
      }
      const reports = await this.orderService.getOrdersReport(req.userId, startDate, endDate);
      res.status(200).json({ success: true, data: reports });
    }
    catch (error) {
      console.error("Error in order controller getting orders report:", error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  }
}