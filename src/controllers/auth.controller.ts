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
import {authenticationMiddleware} from '../middlewares/authentication.middleware.js';
import DriverSignupStatus from '../utils/enums/signupStatus.enum.js';
import { BusinessUserDto } from '../dto/user/businessUser.dto.js';
import { broadcastNewDriver } from './user.controller.js';
import crypto from 'crypto';
export const oauthStateStore: Record<string, {
    state: string,
    shopifyToken?: string,
    shop?: string
}> = {};

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
        this.router.get(`${this.path}`, this.auth);
        this.router.get(`${this.path}/callback`, this.authCallback);
        this.router.post(`/webhooks/orders_create`, this.orderCreateWebhook);
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
        // sign up for business
        this.router.post(`${this.path}/business/sign-up`, this.businessSignup);
        // login for business
        this.router.post(`${this.path}/business/login`, this.businessLogin);

    }

    private auth = async (req, res) => {
        console.log("Starting Shopify OAuth process");
        const shop = req.query.shop as string;
        console.log("Shop parameter:", shop);
        if (!shop) return res.send('Missing shop parameter');

        const state = crypto.randomBytes(8).toString('hex');
        console.log("Generated state parameter in auth endpoint:", state);
        oauthStateStore[shop] = { state };
        console.log("Stored state for shop:", {oauthStateStore});
        console.log("shopify scopes:", env.SHOPIFY.SCOPES); 
        const redirectUrl = `https://${shop}/admin/oauth/authorize?client_id=${env.SHOPIFY.CLIENT_ID}&scope=${env.SHOPIFY.SCOPES}&redirect_uri=${env.APP_HOST}/api/auth/callback&state=${state}`;

        res.redirect(redirectUrl);
    }


    private authCallback = async (req, res) => {
        console.log("Handling Shopify OAuth callback");
        const { shop, code, state } = req.query;
        console.log("Callback query parameters:", { shop, code, state });

        console.log({oauthStateStore});
        const storedState = oauthStateStore[shop as string].state;
        if (state !== storedState) {
          return res.status(403).send('Request origin cannot be verified');
        }
        console.log("State parameter verified successfully");
        // Exchange code for access token
        const tokenResp = await axios.post(`https://${shop}/admin/oauth/access_token`, {
          client_id: env.SHOPIFY.CLIENT_ID,
          client_secret: env.SHOPIFY.SECRET,
          code
        });

        console.log("Received access token response from Shopify:", tokenResp.data);
    
        const accessToken = tokenResp.data.access_token;
        // req.session.shopifyToken = accessToken;
        // req.session.shop = shop;

        oauthStateStore[shop as string].shopifyToken = accessToken;
        // Register webhook after OAuth
        try {
            await this.registerWebhooks(shop, accessToken);
        } catch (error) {
            console.error("Error registering webhooks:", error);
        }
        console.log("Shopify OAuth process completed successfully for shop:", shop, " redirecting to /welcome");
        res.redirect(`/welcome?shop=${shop}`) // redirect merchant to App URL
    }

    private async registerWebhooks(shop, accessToken) {
        console.log("Registering webhooks for shop:", shop, "with access token:", accessToken);
        const webhookUrl = `https://${shop}/admin/api/2025-10/webhooks.json`;
        console.log("address for webhook registration:", `${env.APP_HOST}/api/webhooks/orders_create`);

        await axios.post(webhookUrl, {
          webhook: {
            topic: 'orders/create',
            address: `${env.APP_HOST}/api/webhooks/orders_create`,
            format: 'json'
          }
        }, { headers: { 'X-Shopify-Access-Token': accessToken } });
        console.log("Webhook registration completed for shop:", shop);
    }


    private orderCreateWebhook = async (req, res) => {
        console.log("Received order create webhook:", req.body);
        const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
        const digest = crypto.createHmac('sha256', env.SHOPIFY.SECRET!)
          .update(req.body)
          .digest('base64');

        if (digest !== hmacHeader) return res.status(401).send('Unauthorized');

        const order = JSON.parse(req.body.toString());

        // Map Shopify order to your /api/orders payload
        const orderPayload = {
          order_id: order.id,
          customer: order.customer,
          line_items: order.line_items,
          shipping_address: order.shipping_address,
          total_price: order.total_price
        };

        console.log("Mapped order payload:", orderPayload);
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
            driverDto.signUpStatus = DriverSignupStatus.APPROVED; // Set initial status to PENDING
            const {driver, vehicleType} = await this.driverService.findOrCreateDriver(driverDto);
            const driverData = {
                email: driver.email,
                driverId: driver.id,
                phoneNumber: driver.phoneNumber,
                vehicleType: vehicleType,
                vehicleNumber: driverDto.vehicleNumber,
                vehicleModel: driverDto.vehicleModel // Assuming vehicleModel is part of the driverDto
            }
            await sendDriverData(driverDto.phoneNumber, plainPassword);
            broadcastNewDriver(driver.id, driver.name);
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
                name: driver.name,
                phoneNumber: driver.phoneNumber,
                vehicleType: driver.vehicle?.type,
                vehicleModel: driver.vehicle?.model,
                vehicleNumber: driver.vehicle?.number,
                vehicleColor: driver.vehicle?.color,
                vehicleProductionYear: driver.vehicle?.productionYear,
                infoApprovalStatus: driver.vehicle?.infoApprovalStatus,
                infoRejectionReason: driver.vehicle?.infoRejectionReason,
                qid: driver.qid,
                qidFront: driver.qidFront ? `${env.CLOUDINARY_BASE_URL}${driver.qidFront}` : null,
                qidBack: driver.qidBack ? `${env.CLOUDINARY_BASE_URL}${driver.qidBack}` : null,
                licenseFront: driver.licenseFront ? `${env.CLOUDINARY_BASE_URL}${driver.licenseFront}` : null,
                licenseBack: driver.licenseBack ? `${env.CLOUDINARY_BASE_URL}${driver.licenseBack}` : null,
                licenseExpirationDate: driver.licenseExpirationDate,
                qidApprovalStatus: driver.qidApprovalStatus,
                qidRejectionReason: driver.qidRejectionReason,
                licenseApprovalStatus: driver.licenseApprovalStatus,
                licenseRejectionReason: driver.licenseRejectionReason,
                surname: driver.surname,
                dateOfBirth: driver.dateOfBirth,
                signUpStatus: driver.signUpStatus,
                type: driver.type,
                email: driver.email,
                businessType: driver.businessType,
                invitedByBusiness: driver.businessOwner ? true : false,
                businessOwnerName: driver.businessOwner?.name,
                businessName: driver.businessOwner ? driver.businessOwner.businessName : driver.businessName,
                businessLocation: driver.businessOwner ? driver.businessOwner.businessLocation : driver.businessLocation,
                businessPhoneNumber: driver.businessOwner ? driver.businessOwner.businessPhoneNumber : driver.businessPhoneNumber,
                companyRepresentativeName: driver.businessOwner ? driver.businessOwner.companyRepresentativeName : driver.companyRepresentativeName,
                companyLogo: driver.companyLogo ? `${env.CLOUDINARY_BASE_URL}${driver.companyLogo}` : null,
                crPhoto: driver.crPhoto ? `${env.CLOUDINARY_BASE_URL}${driver.crPhoto}` : null,
                taxId:  driver.taxId ? `${env.CLOUDINARY_BASE_URL}${driver.taxId}` : null   ,
                profilePicture: `${env.CLOUDINARY_BASE_URL}${driver.profilePicture}` // Assuming profilePicture is a field in the Driver model
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
            const phoneExtension = '+974';
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
            const driver = await this.driverService.findDriverById(decodedToken.driverId, "reset-password");
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
    
    private businessSignup = async (req, res) => {
        try {
            const businessUserDto: BusinessUserDto = req.body;
            const businessUser = await this.userService.findOrCreateBusinessUser(businessUserDto);
            const businessUserData = {
                id: businessUser.id,
                name: businessUser.name,
                email: businessUser.email,
                companyName: businessUser.companyName,
                industry: businessUser.industry,
                numOfDrivers: businessUser.numOfDrivers,
                numOfVehicles: businessUser.numOfVehicles,
            }
            return res.status(200).json({ success: true, message: 'Business user signed up successfully.', businessUserData });

        } catch (error) {
            console.error('Error during business signup:', error);
            return res.status(500).json({ success: false, message: error.message || 'Failed to sign up business user.' });
        }
    }

    private businessLogin = async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }
        try {
            const businessUser = await this.userService.getBusinessUserByEmail(email);
            if (!businessUser) {
                return res.status(404).json({ success: false, message: 'Business user not found.' });
            }
            const isPasswordValid = await bcrypt.compare(password, businessUser.password);

            if (!isPasswordValid) {
                return res.status(401).json({ success: false, message: 'Invalid business user credentials.' });
            }
            const businessUserData = {
                id: businessUser.id,
                name: businessUser.name,
                email: businessUser.email,
                type: businessUser.type,
                companyName: businessUser.companyName,
                industry: businessUser.industry,
                numOfDrivers: businessUser.numOfDrivers,
                numOfVehicles: businessUser.numOfVehicles,
            }
            const token = jwt.sign(businessUserData, env.JWT_SECRET);
            return res.status(200).json({ success: true, token, businessUserData });
        } catch (error) {
            console.error('Error during business login:', error);
            return res.status(500).json({ success: false, message: 'Failed to log in business user.' });
        }
    }        
}