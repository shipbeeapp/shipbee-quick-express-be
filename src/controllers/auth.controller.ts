import { NextFunction, Response, Router, Request } from 'express';
import jwt from 'jsonwebtoken';
import UserService from '../services/user.service.js';
import {Container} from 'typedi';
import { env } from '../config/environment.js';
import { sendOtp } from '../services/email.service.js';

export class AuthController {
  public router: Router = Router();
  public path = '/auth';
  private userService: UserService = Container.get(UserService)
  constructor() {

    this.initializeRoutes();
  }

    private initializeRoutes() {
        // Define your routes here
        // Example: this.router.get('/orders', this.getOrders.bind(this));
        // You can add more routes as needed
        this.router.post(`${this.path}/sign-up`, this.signup);
        this.router.post(`${this.path}/send-otp`, this.sendOtp)
        this.router.post(`${this.path}/verify-otp`, this.verifyOtp);
    }

    private signup = async (req, res) => {
        // This is a placeholder for the actual implementation
        // You would typically handle user signup logic here
        const { token } = req.body
        //decode it using jwt to get email
        const decodedToken = jwt.decode(token);
        console.log("decodedToken: ", decodedToken);
        if (!decodedToken || typeof decodedToken !== 'object' || !decodedToken.email) {
            return res.status(400).json({ success: false, message: 'Invalid token or email not found in token.' });
        }

        const email = decodedToken.email;
        const user = await this.userService.findOrCreateUser(email);
        // const userEmail = await this.userService.findOrCreateUser(email);
        // Now generate your own JWT for your app
        const userData = {
            email: user.email,
            userId: user.id,
            phoneNumber: user.phoneNumber,
            isNewUser: user.isNewUser  
        }
        const myToken = jwt.sign(
            userData,
            env.JWT_SECRET,
        );

        res.status(200).json({ success: true, token: myToken, userData: userData });
    }

    private sendOtp = async (req, res) => {
        const {emailOrPhone} = req.body
        if (!emailOrPhone) {
            return res.status(400).json({ success: false, message: 'Email or phone number is required.' });
        }
        else {

            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            try {
                const data = {
                    email: emailOrPhone.includes('@') ? emailOrPhone : null,
                    phoneNumber: emailOrPhone.includes('@') ? null : emailOrPhone,
                }
                console.log("data: ", data);
                const user = await this.userService.findOrCreateUser(data);
                user.otp = otp; // Save the OTP to the user model
                await this.userService.saveUser(user); // Save the user with the OTP
                console.log("otp: ", otp);
                await sendOtp(emailOrPhone, otp);
                return res.status(200).json({ success: true, message: 'OTP sent successfully.' });
            } catch (error) {
                console.error('Error sending OTP:', error);
                return res.status(500).json({ success: false, message: 'Failed to send OTP.' });
            }
        }
    }

    private verifyOtp = async (req, res) => {
        const { emailOrPhone, otp } = req.body;
        // Here you would typically verify the OTP against your database or cache
        // For this example, we'll just return a success message
        if (!emailOrPhone || !otp) {
            return res.status(400).json({ success: false, message: 'Email or phone number and OTP are required.' });
        }
        // Assuming OTP verification is successful
        const data = {
            email: emailOrPhone.includes('@') ? emailOrPhone : null,
            phoneNumber: emailOrPhone.includes('@') ? null : emailOrPhone,
        }
        const user = await this.userService.findOrCreateUser(data);
        // const userEmail = await this.userService.findOrCreateUser(email);
        // Now generate your own JWT for your app
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (user.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }
        const userData = { 
            email: user.email,
            userId: user.id,
            phoneNumber: user.phoneNumber,
            isNewUser: user.isNewUser  
        }
        const myToken = jwt.sign(
            userData,
            env.JWT_SECRET,
        );
        return res.status(200).json({ success: true, message: 'OTP verified successfully.', token: myToken, userData: userData});
    }
}