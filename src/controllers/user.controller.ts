import { NextFunction, Response, Router, Request } from 'express';
import UserService from '../services/user.service.js';
import {Container} from 'typedi';
import { authenticationMiddleware, AuthenticatedRequest } from '../middlewares/authentication.middleware.js';

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
}