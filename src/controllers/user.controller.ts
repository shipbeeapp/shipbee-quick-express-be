import { NextFunction, Response, Router, Request } from 'express';
import UserService from '../services/user.service.js';
import {Container} from 'typedi';
import { authenticationMiddleware, AuthenticatedRequest } from '../middlewares/authentication.middleware.js';
import { OrderStatus } from '../utils/enums/orderStatus.enum.js';
let clients: Response[] = [];

 // Call this whenever you want to broadcast updates
export function broadcastOrderUpdate(orderId: string, orderStatus: OrderStatus, eventName: string = "order-status-update") {
  clients.forEach(client => {
    client.write(`event: ${eventName}\n`);
    client.write(`data: ${JSON.stringify({ orderId, orderStatus })}\n\n`);
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
        this.router.put(`${this.path}/:id`, authenticationMiddleware, this.updateUser.bind(this));
        this.router.get("/admin/order-status-update", this.orderStatusUpdate.bind(this));
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
}