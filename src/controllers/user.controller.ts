import { NextFunction, Response, Router, Request } from 'express';
import UserService from '../services/user.service.js';
import {Container} from 'typedi';
import { authenticationMiddleware, AuthenticatedRequest } from '../middlewares/authentication.middleware.js';
import { OrderStatus } from '../utils/enums/orderStatus.enum.js';
import { DriverStatus } from '../utils/enums/driverStatus.enum.js';
import { env } from '../config/environment.js';
let clients: Response[] = [];
let driverStatusClients: Response[] = [];
let orderTrackingClients: Response[] = [];
let driverTrackingClients: Response[] = [];
let newDriverClients: Response[] = [];


 // Call this whenever you want to broadcast updates
export function broadcastOrderUpdate(orderId: string, orderStatus: OrderStatus, stopNumber?: number, eventName: string = "order-status-update", cancellationRequestId: string = null) {
  clients.forEach(client => {
    client.write(`event: ${eventName}\n`);
    client.write(`data: ${JSON.stringify({ orderId, orderStatus, stopNumber, cancellationRequestId })}\n\n`);
  });
}

export function broadcastDriverStatusUpdate(driverId: string, driverStatus: DriverStatus) {
  driverStatusClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ driverId, driverStatus })}\n\n`);
  });
}

export function broadcastOrderTrackingUpdate(orderId: string, driverLocation: string) {
  orderTrackingClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ orderId, driverLocation })}\n\n`);
  });
}

export function broadcastDriverTrackingUpdate(driverId: string, driverLocation: string) {
  driverTrackingClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ driverId, driverLocation })}\n\n`);
  });
}

export function broadcastNewDriver(driverId: string, driverName: string) {
  newDriverClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ driverId, driverName })}\n\n`);
  });
}
export class UserController {
  public router: Router = Router();
  public path = '/users';
  private userService: UserService = Container.get(UserService)
  constructor() {

    this.initializeRoutes();
  }

    private initializeRoutes() {
        // Define your routes here
        //update user endpoint using id
        this.router.get(`/admin${this.path}`, authenticationMiddleware, this.getUsers.bind(this));
        this.router.put(`${this.path}/:id`, authenticationMiddleware, this.updateUser.bind(this));
        this.router.get("/admin/order-status-update", this.orderStatusUpdate.bind(this));
        this.router.get("/admin/driver-status-update", this.driverStatusUpdate.bind(this));
        this.router.get("/admin/new-driver", this.newDriver.bind(this));
        this.router.get("/order-tracking", this.orderTracking.bind(this));
        this.router.get("/driver-tracking", this.driverTracking.bind(this));
        this.router.post(`${this.path}/generate-api-key`, authenticationMiddleware, this.generateApiKey.bind(this));
    }

    private updateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const paramUserId = req.params.id;
            const authenticatedUserId = req.userId;

            if (paramUserId !== authenticatedUserId) {
              return res.status(403).json({ success: false, message: "Unauthorized access" });
            }
            const userData = {
                ...req.body,
                isNewUser: false // Assuming you want to set isNewUser to false on update
            };
            console.log("Updating user with ID:", paramUserId, "and data:", userData);
            await this.userService.updateUser(paramUserId, userData);
            res.status(200).json({ success: true, message: "User Updated Successfully" });
        } catch (error) {
            console.error("Error updating user:", error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private getUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const email = req.email;
            if (email !== env.ADMIN.EMAIL) {
              return res.status(403).json({ success: false, message: "Unauthorized access" });
            }
            const users =  await this.userService.getUsers();
            res.status(200).json({ success: true, data: users });
        }
        catch (error) {
            console.error("Error fetching users:", error.message);
            res.status(500).json({success: false, message: error.message})
        }
    }

    private orderStatusUpdate = async (req: Request, res: Response) => {
        // 1️⃣ Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        // 2️⃣ Add client to clients array
        clients.push(res);

        // 3️⃣ Remove client on disconnect
        req.on("close", () => {
          clients = clients.filter(client => client !== res);
        });
    }

    private driverStatusUpdate = async (req: Request, res: Response) => {
        // 1️⃣ Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();
        // 2️⃣ Add client to clients array
        driverStatusClients.push(res);
        // 3️⃣ Remove client on disconnect
        req.on("close", () => {
          driverStatusClients = driverStatusClients.filter(client => client !== res);
        });
    }

    private orderTracking = async (req: Request, res: Response) => {
        // 1️⃣ Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        // 2️⃣ Add client to clients array
        orderTrackingClients.push(res);
        // 3️⃣ Remove client on disconnect
        req.on("close", () => {
          orderTrackingClients = orderTrackingClients.filter(client => client !== res);
        });
      }

      private driverTracking = async (req: Request, res: Response) => {
        // 1️⃣ Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        // 2️⃣ Add client to clients array
        driverTrackingClients.push(res);
        // 3️⃣ Remove client on disconnect
        req.on("close", () => {
          driverTrackingClients = driverTrackingClients.filter(client => client !== res);
        });
      }

      private generateApiKey = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
          console.log("Generate API Key request by:", req.email);
          if (req.email !== env.ADMIN.EMAIL) {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
          }
          const { userId } = req.body;
          const apiKey = await this.userService.generateAndAssignApiKey(userId);
          res.status(200).json({ success: true, apiKey });
        } catch (error) {
          console.error("Error generating API key:", error.message);
          res.status(500).json({ success: false, message: error.message });
        }
      }

      private newDriver = async (req: Request, res: Response) => {
        // 1️⃣ Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        // 2️⃣ Add client to clients array
        newDriverClients.push(res);
        // 3️⃣ Remove client on disconnect
        req.on("close", () => {
          newDriverClients = newDriverClients.filter(client => client !== res);
        });
      }
}