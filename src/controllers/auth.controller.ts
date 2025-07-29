import { NextFunction, Response, Router, Request } from 'express';
import jwt from 'jsonwebtoken';
import UserService from '../services/user.service.js';
import {Container} from 'typedi';
import { env } from '../config/environment.js';
import { sendOtp, sendDriverData } from '../services/email.service.js';
import axios from 'axios';
import bcrypt from 'bcrypt';

import DriverService from '../services/driver.service.js';
import { DriverDto } from '../dto/driver/driver.dto.js';
import authenticationMiddleware from '../middlewares/authentication.middleware.js';

export class AuthController {
  public router: Router = Router();
  public path = '/auth';
  private userService: UserService = Container.get(UserService)
  private driverService = Container.get(DriverService); // Assuming driverService is also UserService
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
        this.router.post(`${this.path}/admin/login`, this.adminLogin);
        this.router.post(`${this.path}/admin/driver/reset-password`, authenticationMiddleware, this.adminResetPasswordForDriver);
        this.router.post(`${this.path}/driver/signup`, authenticationMiddleware, this.driverSignup);
        this.router.post(`${this.path}/driver/login`, this.driverLogin);
        //forget password for driver
        this.router.post(`${this.path}/driver/forget-password`, this.driverForgetPassword);
        // verify otp for driver
        this.router.post(`${this.path}/driver/verify-otp`, this.driverVerifyOtp);
        // reset password for driver
        this.router.post(`${this.path}/driver/reset-password`, this.driverResetPassword);
    }

    private signup = async (req, res) => {
        // This is a placeholder for the actual implementation
        // You would typically handle user signup logic here
        try {
            const { token } = req.body
            if (!token) {
                return res.status(400).json({ success: false, message: 'Token is required.' });
            }
            const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
          
              // This contains the user's profile info
              const userInfo = response.data;
          
              console.log(userInfo);

            const email = userInfo.email;
            const user = await this.userService.findOrCreateUser({email});
            // const userEmail = await this.userService.findOrCreateUser(email);
            // Now generate your own JWT for your app
            const userData = {
                email: user.email,
                userId: user.id,
                phoneNumber: user.phoneNumber,
                isNewUser: user.isNewUser,
                userType: user.type  
            }
            const myToken = jwt.sign(
                userData,
                env.JWT_SECRET,
            );

            res.status(200).json({ success: true, token: myToken, userData: userData });
        } catch (error) {
            console.error('Error during signup:', error);
            res.status(401).json({ success: false, message: 'Token not valid.' });
        }
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
                const phoneExtension = '+974'
                await sendOtp(emailOrPhone, otp, phoneExtension);
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
            name: user.name,
            userId: user.id,
            phoneNumber: user.phoneNumber,
            isNewUser: user.isNewUser,
            userType: user.type // Assuming userType is a field in your User model  
        }
        const myToken = jwt.sign(
            userData,
            env.JWT_SECRET,
        );
        return res.status(200).json({ success: true, message: 'OTP verified successfully.', token: myToken, userData: userData});
    }

    private adminLogin = async (req, res) => {
        const { email, password } = req.body;
        if (email !== env.ADMIN.EMAIL || password !== env.ADMIN.PASSWORD) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
        }
        const adminData = {
            email: env.ADMIN.EMAIL,
        };
        const token = jwt.sign(adminData, env.JWT_SECRET);
        return res.status(200).json({ success: true, token, userData: adminData });
    }

    private driverSignup = async (req, res) => {
        if (req.email !== env.ADMIN.EMAIL) {
            return res.status(403).json({ success: false, message: "You are not authorized to invite drivers." });
        }
        const driverDto: DriverDto = req.body;
        if (!driverDto.phoneNumber || !driverDto.name) {
            return res.status(400).json({ success: false, message: 'Email, phone number and name are required.' });
        }
        try {
            // Hash the password before saving
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(driverDto.password, saltRounds);
            const plainPassword = driverDto.password; // Store the plain password for sending to the driver
            // Replace the plain password with the hashed one
            driverDto.password = hashedPassword;
            const {driver, vehicleType} = await this.driverService.findOrCreateDriver(driverDto);
            const driverData = {
                email: driver.email,
                driverId: driver.id,
                phoneNumber: driver.phoneNumber,
                vehicleType: vehicleType,
                vehicleNumber: driverDto.vehicleNumber,
            }
            await sendDriverData(driverDto.phoneNumber, plainPassword);
            return res.status(200).json({ success: true, message: "Driver invited successfully",  driverData});
        } catch (error) {
            console.error('Error during driver signup:', error);
            return res.status(500).json({ success: false, message: error.message || 'Failed to sign up driver.' });
        }
    }

    private driverLogin = async (req, res) => {
        const { phoneNumber, password } = req.body;
        if (!phoneNumber || !password) {
            return res.status(400).json({ success: false, message: 'Phone number and password are required.' });
        }
        try {
            const driver = await this.driverService.findDriverByPhone(phoneNumber);
            if (!driver) {
                return res.status(404).json({ success: false, message: 'Driver not found.' });
            }
            // Compare the provided password with the hashed password in the database
            const isPasswordValid = await bcrypt.compare(password, driver.password);

            if (!isPasswordValid) {
                return res.status(401).json({ success: false, message: 'Invalid driver credentials.' });
            }
            const driverData = {
                driverId: driver.id,
                phoneNumber: driver.phoneNumber,
                vehicleType: driver.vehicle?.type,
            }
            const token = jwt.sign(driverData, env.JWT_SECRET);
            return res.status(200).json({ success: true, token, driverData });
        } catch (error) {
            console.error('Error during driver login:', error);
            return res.status(500).json({ success: false, message: 'Failed to log in driver.' });
        }
    }

    private driverForgetPassword = async (req, res) => {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ success: false, message: 'Phone number is required.' });
        }
        try {
            const driver = await this.driverService.findDriverByPhone(phoneNumber);
            if (!driver) {
                return res.status(404).json({ success: false, message: 'Driver not found.' });
            }
            // Generate a new OTP
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            driver.otp = otp; // Save the OTP to the driver model
            await this.driverService.saveDriver(driver); // Save the driver with the OTP
            const phoneExtension = '+20'
            await sendOtp(phoneNumber, otp, phoneExtension);
            return res.status(200).json({ success: true, message: 'OTP sent successfully.' });
        } catch (error) {
            console.error('Error sending OTP:', error);
            return res.status(500).json({ success: false, message: 'Failed to send OTP.' });
        }
    }

    private driverVerifyOtp = async (req, res) => {
        const { phoneNumber, otp } = req.body;
        if (!phoneNumber || !otp) {
            return res.status(400).json({ success: false, message: 'Phone number and OTP are required.' });
        }
        try {
            const driver = await this.driverService.findDriverByPhone(phoneNumber);
            if (!driver) {
                return res.status(404).json({ success: false, message: 'Driver not found.' });
            }
            if (driver.otp !== otp) {
                return res.status(400).json({ success: false, message: 'Invalid OTP.' });
            }
            // Clear the OTP after successful verification
            driver.otp = null;
            await this.driverService.saveDriver(driver); // Save the updated driver
            // Generate a new token for the driver
            const driverData = {
                driverId: driver.id,
            }
            const token = jwt.sign(driverData, env.JWT_SECRET);
            return res.status(200).json({ success: true, message: 'OTP verified successfully.', token });
        } catch (error) {
            console.error('Error verifying OTP:', error);
            return res.status(500).json({ success: false, message: 'Failed to verify OTP.' });
        }
    }

    private driverResetPassword = async (req, res) => {
        const { newPassword } = req.body;
        if (!newPassword) {
            return res.status(400).json({ success: false, message: 'New password is required.' });
        }
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ success: false, message: 'Unauthorized access.' });
            }
            // Verify the token
            const decodedToken = jwt.verify(token, env.JWT_SECRET) as { driverId: string };
            const driver = await this.driverService.findDriverById(decodedToken.driverId);
            if (!driver) {
                return res.status(404).json({ success: false, message: 'Driver not found.' });
            }
            
            // Hash the new password before saving
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            driver.password = hashedPassword; // Update the password
            await this.driverService.saveDriver(driver); // Save the updated driver
            return res.status(200).json({ success: true, message: 'Password reset successfully.' });
        } catch (error) {
            console.error('Error resetting password:', error);
            return res.status(500).json({success: false, message: `Error Resetting password: ${error.message}`})
        }
    }

    private adminResetPasswordForDriver = async (req, res) => {
            const { phoneNumber, newPassword } = req.body;
            if (!phoneNumber || !newPassword) {
                return res.status(400).json({ success: false, message: 'Phone number and new password are required.' });
            }
            try {
                const driver = await this.driverService.findDriverByPhone(phoneNumber);
                if (!driver) {
                    return res.status(404).json({ success: false, message: 'Driver not found.' });
                }
                // Hash the new password before saving
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
                driver.password = hashedPassword; // Update the password
                await this.driverService.saveDriver(driver); // Save the updated driver
                return res.status(200).json({ success: true, message: 'Password reset successfully.' });
            } catch (error) {
                console.error('Error admin resetting password for driver:', error);
                return res.status(500).json({ success: false, message: 'Error admin resetting password.' });
            }
        }
}