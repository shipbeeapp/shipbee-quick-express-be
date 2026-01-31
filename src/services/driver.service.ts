import {Container, Service } from "typedi";
import { AppDataSource } from "../config/data-source.js";
import { Driver } from "../models/driver.model.js";
import { Vehicle } from "../models/vehicle.model.js";
import { UpdateDriverDto } from "../dto/driver/updateDriver.dto.js";
import { Not } from "typeorm";
import { Between } from "typeorm";
import { Order } from "../models/order.model.js";
import { OrderStatus } from "../utils/enums/orderStatus.enum.js";
import { calculateActiveHoursToday, getCurrentLocationOfDriver } from "../socket/socket.js";
import { emitOrderToDrivers, emitOrderToDriver } from "../socket/socket.js";
import { resetNotifiedDrivers, markDriverNotified, getNotifiedDriversForOrder } from "../utils/notification-tracker.js";
import OrderStatusHistoryService from "./orderStatusHistory.service.js";
import { sendDriverUpdateInfoMail, sendOrderConfirmation, sendOtp } from "../services/email.service.js";
import DriverSignupStatus from "../utils/enums/signupStatus.enum.js";
import { env } from "../config/environment.js";
import { getOnlineDrivers } from "../socket/socket.js";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";
import { getDrivingDistanceInKm } from "../utils/google-maps/distance-time.js";
import { DriverType } from "../utils/enums/driverType.enum.js";
import { DriverResource } from "../resource/drivers/driver.resource.js";
import { generatePhotoLink } from "../utils/global.utils.js";
import { DriverStatus } from "../utils/enums/driverStatus.enum.js";
import { ApprovalStatus } from "../utils/enums/approvalStatus.enum.js";
import { BroadcastMessageService } from "./broadcastMessage.service.js";
import { PaymentMethod } from "../utils/enums/paymentMethod.enum.js";

const otpCache = new Map<string, string>(); // In-memory cache for OTPs

@Service()
export default class DriverService {
    private driverRepository = AppDataSource.getRepository(Driver);
    private vehicleRepository = AppDataSource.getRepository(Vehicle);
    private orderRepository = AppDataSource.getRepository(Order); // Assuming you have an Order model
    private orderStatusHistoryService = Container.get(OrderStatusHistoryService);
    private broadcastMessageService = Container.get(BroadcastMessageService);

    async findOrCreateDriver(data: any, queryRunner?: any): Promise<any> {
        try {
            queryRunner = AppDataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();
            console.log("Starting findOrCreateDriver with data:", data);
            const manager = queryRunner ? queryRunner.manager.getRepository(Driver) : this.driverRepository;
            const vehicleManager = queryRunner ? queryRunner.manager.getRepository(Vehicle) : this.vehicleRepository;
            let driver;
            let vehicle;
            console.log("findOrCreateDriver called with data:", data);
            driver = await this.driverRepository.findOne({
                where: { phoneNumber: data.phoneNumber },
                relations: ["vehicle", "businessOwner"]
            });
            
            if (!driver) {
                // Create new driver
                // vehicle = await vehicleManager.findOne({
                //     where: { type: data.vehicleType, number: data.vehicleNumber },
                //     relations: ["driver"]
                // });
    
                // if (vehicle && vehicle.driver) {
                //     throw new Error(`Vehicle with number ${data.vehicleNumber} is already linked to another driver`);
                // }

                // If vehicle doesn't exist, create it
                if (!vehicle && (data.type === DriverType.INDIVIDUAL || data.vehicleType)) {
                    vehicle = vehicleManager.create({
                        type: data.vehicleType,
                        number: data.vehicleNumber,
                        model: data.vehicleModel, // Assuming vehicleModel is part of the data
                        color: data.color,
                        productionYear: data.productionYear,
                        registrationFront: data.registrationFront,
                        registrationBack: data.registrationBack,
                        frontPhoto: data.frontPhoto, // Placeholder if not provided
                        backPhoto: data.backPhoto, // Placeholder if not provided
                        leftPhoto: data.leftPhoto, // Placeholder if not provided
                        rightPhoto: data.rightPhoto // Placeholder if not provided
                    });
                    vehicle = await vehicleManager.save(vehicle);
                }
                // Create new driver and assign vehicle
                const newDriver = manager.create({
                    name: data.name,
                    surname: data.surname,
                    phoneNumber: data.phoneNumber,
                    password: data.password, // In real app, hash the password before saving
                    dateOfBirth: data.dateOfBirth,
                    profilePicture: data.profilePicture, // Placeholder if not provided
                    signUpStatus: data.signUpStatus || DriverSignupStatus.PENDING,
                    qid: data.qid,
                    qidFront: data.qidFront,
                    qidBack: data.qidBack,
                    licenseFront: data.licenseFront,
                    licenseBack: data.licenseBack,
                    licenseExpirationDate: data.licenseExpirationDate,
                    type: data.type,
                    businessName: data.businessName,
                    businessLocation: data.businessLocation,
                    businessPhoneNumber: data.businessPhoneNumber,
                    companyRepresentativeName: data.companyRepresentativeName,
                    crPhoto: data.crPhoto,
                    taxId: data.taxId,
                    companyLogo: data.companyLogo,
                    businessOwner: data.type === DriverType.BUSINESS ? null : { id: data.businessOwnerId },
                    vehicle: vehicle,
                    email: data.email,
                    businessType: data.businessType,
                    businessDocsApprovalStatus: data.type === DriverType.BUSINESS ? ApprovalStatus.PENDING : null
                });
                driver = await manager.save(newDriver);
              }
              else {
                // if (driver.type === DriverType.BUSINESS) {

                // }
                //checked if he has a business owner and it matches the one in the request
                if (driver.businessOwner && data.businessOwnerId && driver.businessOwner?.id !== data.businessOwnerId) {
                    throw new Error(`Driver with phone number ${data.phoneNumber} already linked to another business owner`);
                }
                if (driver.businessOwner && data.businessOwnerId && driver.businessOwner?.id === data.businessOwnerId) {
                    // Driver already linked to this business owner, set this vehicle and driver details
                    if (driver.vehicle) {
                        throw new Error(`Driver with phone number ${data.phoneNumber} is already linked to this business owner and has a vehicle assigned`);
                    }
                    if (driver.signUpStatus !== DriverSignupStatus.APPROVED) {
                        console.log(`Driver with phone number ${data.phoneNumber} is already linked to this business owner`);
                        vehicle = vehicleManager.create({
                            type: data.vehicleType,
                            number: data.vehicleNumber,
                            model: data.vehicleModel, // Assuming vehicleModel is part of the data
                            color: data.color,
                            productionYear: data.productionYear,
                            registrationFront: data.registrationFront,
                            registrationBack: data.registrationBack,
                            frontPhoto: data.frontPhoto, // Placeholder if not provided
                            backPhoto: data.backPhoto, // Placeholder if not provided
                            leftPhoto: data.leftPhoto, // Placeholder if not provided
                            rightPhoto: data.rightPhoto // Placeholder if not provided
                        });
                        vehicle = await vehicleManager.save(vehicle);
                        driver.name = data.name ?? driver.name;
                        driver.surname = data.surname ?? driver.surname;
                        driver.password = data.password ?? driver.password;
                        driver.dateOfBirth = data.dateOfBirth ?? driver.dateOfBirth;
                        driver.profilePicture = data.profilePicture ?? driver.profilePicture;
                        driver.qid = data.qid ?? driver.qid;
                        driver.qidFront = data.qidFront ?? driver.qidFront;
                        driver.qidBack = data.qidBack ?? driver.qidBack;
                        driver.licenseFront = data.licenseFront ?? driver.licenseFront;
                        driver.licenseBack = data.licenseBack ?? driver.licenseBack;
                        driver.licenseExpirationDate = data.licenseExpirationDate ?? driver.licenseExpirationDate;
                        driver.type = data.type ?? driver.type;
                        driver.businessName = data.businessName ?? driver.businessName;
                        driver.businessLocation = data.businessLocation ?? driver.businessLocation;
                        driver.businessPhoneNumber = data.businessPhoneNumber ?? driver.businessPhoneNumber;
                        driver.companyRepresentativeName = data.companyRepresentativeName ?? driver.companyRepresentativeName;
                        driver.crPhoto = data.crPhoto ?? driver.crPhoto;
                        driver.taxId = data.taxId ?? driver.taxId;
                        driver.companyLogo = data.companyLogo ?? driver.companyLogo;
                        driver.vehicle = vehicle;
                        driver.email = data.email ?? driver.email;
                        driver.businessType = data.businessType ?? driver.businessType;
                        driver = await manager.save(driver);
                   }
                   else throw new Error(`Driver with phone number ${data.phoneNumber} is already linked to this business owner and approved`);
                }
                else {
                    throw new Error(`Driver with phone number ${data.phoneNumber} already exists`);
                }
              }
            await queryRunner.commitTransaction();
            await this.broadcastMessageService.assignDriverToActiveMessages(driver.id);
            return {driver, vehicleType: vehicle?.type};
        } catch (error) {
            console.error("Error in findOrCreateDriver:", error);
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();  
      }
    }

    async findDriverByPhone(phoneNumber: string): Promise<Driver | null> {
        try {
            return await this.driverRepository.findOne({
                where: { phoneNumber },
                relations: ["vehicle", "businessOwner"],
            });
        } catch (error) {
            console.error("Error finding driver by phone:", error);
            throw error;
        }
    }
    baseDriverQuery() {
        return this.driverRepository.createQueryBuilder("driver")
                .leftJoin("driver.vehicle", "vehicle")
                // .leftJoin("driver.orders", "orders")
                .leftJoin("driver.businessOwner", "businessOwner")
                .select([
                    "driver.id",
                    "driver.income",
                    "driver.cashIncome",
                    "driver.onlineIncome",
                    "driver.cashBalance",
                    "driver.name",
                    "driver.phoneNumber",
                    "driver.hasCardOnDelivery",
                    "driver.status",
                    "driver.updatedAt",
                    "driver.signUpStatus",
                    "driver.dateOfBirth",
                    "driver.surname",
                    "driver.profilePicture",
                    "driver.qid",
                    "driver.qidFront",
                    "driver.qidBack",
                    "driver.licenseFront",
                    "driver.licenseBack",
                    "driver.licenseExpirationDate",
                    "driver.type",
                    "driver.email",
                    "driver.businessType",
                    "driver.businessName",
                    "driver.businessLocation",
                    "driver.companyRepresentativeName",
                    "driver.businessPhoneNumber",
                    "driver.companyLogo",
                    "driver.crPhoto",
                    "driver.taxId",
                    "driver.qidApprovalStatus",
                    "driver.qidRejectionReason",
                    "driver.licenseApprovalStatus",
                    "driver.licenseRejectionReason",
                    "driver.businessDocsApprovalStatus",
                    "driver.businessDocsRejectionReason",
                    "driver.vehicleInfoApprovalStatus",
                    "driver.vehicleInfoRejectionReason",
                    "businessOwner.id",
                    "businessOwner.name",
                    "businessOwner.phoneNumber",
                    "businessOwner.businessName",
                    "businessOwner.businessLocation",
                    "businessOwner.businessPhoneNumber",
                    "businessOwner.companyRepresentativeName",
                    "businessOwner.crPhoto",
                    "businessOwner.taxId",
                    "businessOwner.companyLogo",
                    "vehicle.id",
                    "vehicle.type",
                    "vehicle.model",
                    "vehicle.number",
                    "vehicle.color",
                    "vehicle.productionYear",
                    "vehicle.frontPhoto",
                    "vehicle.backPhoto",
                    "vehicle.leftPhoto",
                    "vehicle.rightPhoto",
                    "vehicle.registrationFront",
                    "vehicle.registrationBack",
                ])
    }

    async findDriverById(driverId: string, type?: string): Promise<Driver | null> {
        try {
            if (type) return await this.baseDriverQuery()
                    .where("driver.id = :driverId", { driverId })
                    .getOne();
            else return await this.baseDriverQuery()
                    .where("driver.id = :driverId", { driverId })
                    .getRawOne();
        } catch (error) {
            console.error("Error finding driver by ID:", error);
            throw error;
        }
    }

    async saveDriver(driver: Driver): Promise<Driver> {
        try {
            return await this.driverRepository.save(driver);
        } catch (error) {
            console.error("Error saving driver:", error);
            throw error;
        }
    }

    async updateDriver(driverId: string, driverData: any) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        
        try {
            const driverRepository = queryRunner.manager.getRepository(Driver);
            const vehicleRepository = queryRunner.manager.getRepository(Vehicle);

            const driver = await driverRepository.findOne({
                where: { id: driverId },
                relations: ['vehicle'], // make sure vehicle relation is loaded
              });
            
            if (!driver) {
                throw new Error(`Driver with ID ${driverId} not found`);
            }
            // Update vehicle if vehicleType is provided and driver has a vehicle
            if (driver.vehicle) {
                console.log("Updating vehicle type for driver:", driverId, "with: ", driver.vehicle.type, "to", driverData.vehicleType);
                driver.vehicle.type = driverData.vehicleType ? driverData.vehicleType : driver.vehicle.type;
                driver.vehicle.number = driverData.vehicleNumber ? driverData.vehicleNumber : driver.vehicle.number;
                driver.vehicle.model = driverData.vehicleModel ? driverData.vehicleModel : driver.vehicle.model;
                driver.vehicle.color = driverData.vehicleColor ? driverData.vehicleColor : driver.vehicle.color;
                driver.vehicle.productionYear = driverData.vehicleProductionYear ? driverData.vehicleProductionYear : driver.vehicle.productionYear;
                driver.vehicle.registrationFront = driverData.vehicleRegistrationFront ? driverData.vehicleRegistrationFront : driver.vehicle.registrationFront;
                driver.vehicle.registrationBack = driverData.vehicleRegistrationBack ? driverData.vehicleRegistrationBack : driver.vehicle.registrationBack;
                driver.vehicle.frontPhoto = driverData.vehicleFront ? driverData.vehicleFront : driver.vehicle.frontPhoto;
                driver.vehicle.backPhoto = driverData.vehicleBack ? driverData.vehicleBack : driver.vehicle.backPhoto;
                driver.vehicle.leftPhoto = driverData.vehicleLeft ? driverData.vehicleLeft : driver.vehicle.leftPhoto;
                driver.vehicle.rightPhoto = driverData.vehicleRight ? driverData.vehicleRight : driver.vehicle.rightPhoto;
                console.log("Vehicle type before saving:", driver.vehicle);
                await vehicleRepository.save(driver.vehicle);
                console.log("Vehicle type updated successfully");
            }

            if (driverData.phoneNumber) {
                // Check if the new phone number already exists for another driver
                const existingDriver = await driverRepository.findOne({
                    where: { phoneNumber: driverData.phoneNumber, id: Not(driverId) }
                });
                if (existingDriver) {
                    throw new Error(`Driver with phone number ${driverData.phoneNumber} already exists`);
                }
            }
          
            // Remove vehicleType from driverData to avoid assigning it directly
            const { vehicleType, 
                vehicleNumber, 
                vehicleModel,
                vehicleColor,
                vehicleProductionYear,
                vehicleRegistrationFront,
                vehicleRegistrationBack,
                vehicleFront,
                vehicleBack,
                vehicleLeft,
                vehicleRight,
                ...rest } = driverData;
        
            // Update driver fields
            Object.assign(driver, rest);
        
            await driverRepository.update(
                {id: driverId},
                rest
            )
            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error("Error updating driver:", error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
    async findAllDrivers(): Promise<any> {
        try {
            const result = await this.baseDriverQuery()
            .leftJoin("driver.orders", "orders")
            .addSelect("COUNT(DISTINCT orders.id)", "orderCount")
            .addSelect("SUM(CASE WHEN orders.status = 'Completed' THEN distance ELSE 0 END)", "numberOfKms")
            .addSelect(`
                COALESCE(
                    jsonb_agg(
                        DISTINCT jsonb_build_object(
                            'id', orders.id,
                            'orderNo', orders."orderNo",
                            'status', orders.status,
                            'distance', orders.distance,
                            'totalCost', orders."totalCost",
                            'startedAt', orders."startedAt",
                            'completedAt', orders."completedAt"
                        )
                    ) FILTER (WHERE orders.id IS NOT NULL),
                    '[]'
                )
            `, "orders")
            .groupBy("driver.id")
            .addGroupBy("vehicle.id")
            .addGroupBy("businessOwner.id")
            .getRawMany();
        
        return result;
        } catch (error) {
            console.error("Error fetching all drivers:", error);
            throw error;
        }
    }

    async getDriverIncome(driverId: string): Promise<any> {
        try {
            const allOrders = await this.orderRepository.find({
                where: {
                    driver: { id: driverId },
                    status: OrderStatus.COMPLETED
                },
                select: ["id", "orderNo", "pickUpDate", "totalCost", "completedAt", "paymentMethod"],
                relations: ["stops"],
                order: { completedAt: "DESC" }
            });
            const driver = await this.findDriverById(driverId, "get-income")
            const orders = allOrders.map(order => {

                // Sum totalPrice from cash stops (if any)
                const totalStopsPrice =
                    order.stops
                      ?.filter((s: any) => s.paymentMethod === PaymentMethod.CASH_ON_DELIVERY)
                      .reduce((sum, s: any) => sum + (Number(s.totalPrice) || 0), 0) || 0;
            
                const cashValueOfGoods =
                  totalStopsPrice > 0 ? totalStopsPrice : 0;
                
                const paymentMethods = new Set<string>();
                if (order.paymentMethod) paymentMethods.add(order.paymentMethod);
                order.stops?.forEach((stop: any) => {
                  if (stop.paymentMethod) paymentMethods.add(stop.paymentMethod);
                });
                return {
                    id: order.id,
                    orderNo: order.orderNo,
                    date: order.completedAt.toLocaleString("en-US", {
                        timeZone: "Asia/Qatar", // ideally use driver.timezone from DB
                        day: "numeric",
                        month: "numeric",
                        year: "numeric"
                    }),
                    time: order.completedAt.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: "Asia/Qatar"
                    }),
                    driverShare: Number(order.totalCost) || 0,
                    cashValueOfGoods,
                    paymentMethod: Array.from(paymentMethods)
                }
            });

            return {
                income: Number(driver.income) || 0,
                cashIncome: Number(driver.cashIncome) || 0,
                onlineIncome: Number(driver.onlineIncome) || 0,
                cashBalance: Number(driver.cashBalance) || 0,
                orders
            };
        } catch (error) {
            console.error("Error fetching driver income:", error);
            throw error;
        }
    }

    // Utility to get Qatar local midnight in UTC
    private qatarMidnightUTC(date: Date) {
        const d = new Date(date);
        d.setUTCHours(d.getUTCHours() - 3, 0, 0, 0); // shift Qatar UTC+3 to UTC
        return d;
    }

    async getDriverPerformance(driverId: string): Promise<any> {
        try {
           // Qatar is UTC+3
            const offsetHours = 3;
                    
            // Get current UTC time
            const now = new Date();
                    
            // Start of today in Qatar time
            const startOfDay = new Date(
              Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                0 - offsetHours, // shift UTC midnight to Qatar midnight
                0,
                0,
                0
              )
            );
        
            // Start of month in Qatar time
            const startOfMonth = new Date(
                Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    1,
                    0 - offsetHours, // shift UTC midnight to Qatar midnight
                    0,
                    0,
                    0
                )
                );
            // End of month in Qatar time
            const endOfMonth = new Date(
                Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth() + 1,
                    0, // last day of the month
                    23 - offsetHours, // shift UTC to Qatar
                    59,
                    59,
                    999
                )
            );

            // 7 days ago in Qatar time
            const sevenDaysAgo = new Date(
                Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate() - 7,
                    0 - offsetHours, // shift UTC midnight to Qatar midnight
                    0,
                    0,
                    0
                )
            );
            // End of day in Qatar time
            const endOfDay = new Date(
                Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate(),
                    23 - offsetHours, // shift UTC to Qatar
                    59,
                    59,
                    999
                )
            );
        // Total orders this month
        const monthlyOrders = await this.orderRepository.count({
            where: {
                driver: { id: driverId },
                completedAt: Between(startOfMonth, endOfMonth),
                status: OrderStatus.COMPLETED
            }
        });
        console.log("sevenDaysAgo:", sevenDaysAgo, " endofDay:", endOfDay);
        // Earnings last 7 days
        const earningsLastWeek = await this.orderRepository.find({
            where: {
                driver: { id: driverId },
                completedAt: Between(sevenDaysAgo, endOfDay),
                status: OrderStatus.COMPLETED
            },
            select: ["totalCost", "completedAt"],
           
        })
        console.log("Earnings last week:", earningsLastWeek);

        // Total trips today
        const totalTripsToday = await this.orderRepository.count({
            where: {
                driver: { id: driverId },
                completedAt: Between(startOfDay, endOfDay),
                status: OrderStatus.COMPLETED
            }
        });

        // Earnings today
        const earningsToday = await this.orderRepository
            .createQueryBuilder("order")
            .select("COALESCE(SUM(order.totalCost)::float, 0)", "total")
            .where("order.driverId = :driverId", { driverId })
            .andWhere("order.completedAt BETWEEN :start AND :end", {
                start: startOfDay,
                end: endOfDay
            })
            .andWhere("order.status = :status", { status: OrderStatus.COMPLETED })
            .getRawOne();

        // Earnings this month
        const earningsMonth = await this.orderRepository
            .createQueryBuilder("order")
            .select("COALESCE(SUM(order.totalCost)::float, 0)", "total")
            .where("order.driverId = :driverId", { driverId })
            .andWhere("order.completedAt BETWEEN :start AND :end", {
                start: startOfMonth,
                end: endOfMonth
            })
            .andWhere("order.status = :status", { status: OrderStatus.COMPLETED })
            .getRawOne();

        // Active hours today (custom function)
        const hoursActiveToday = calculateActiveHoursToday(driverId);
        const earningsByDay: Record<string, number> = {};
        earningsLastWeek.forEach(order => {
            // Format date as YYYY-MM-DD for grouping
            const day = order.completedAt.toLocaleDateString("en-CA", { 
                timeZone: "Asia/Qatar",
                day: "2-digit",
                month: "short" 
            }); // e.g., "2025-08-13"
            earningsByDay[day] = (earningsByDay[day] || 0) + Number(order.totalCost || 0);
        });

        // Build the last 7 days array (oldest to newest)
        const last7Days: { date: string, totalCost: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(endOfDay);
            d.setDate(d.getDate() - i);
            const dayStr = d.toLocaleDateString("en-CA", { 
                timeZone: "Asia/Qatar",
                day: "2-digit",
                month: "short"  
            }); // "YYYY-MM-DD"
            last7Days.push({
                date: dayStr,
                totalCost: earningsByDay[dayStr] || 0
            });
        }
        return {
            monthlyOrders,
            earningsLastWeek: last7Days,
            totalTripsToday,
            earningsToday: earningsToday.total,
            earningsMonth: earningsMonth.total,
            hoursActiveToday: Number(hoursActiveToday.toFixed(1))
        };

        
        } catch (error) {
            console.error("Error fetching driver performance:", error);
            throw error;
        }
    }

    async cancelOrder(driverId: string, orderId: string, cancellationReason: string): Promise<void> {
        try {
            const order = await this.orderRepository.findOne({
                where: { id: orderId, driver: { id: driverId } },
                relations: ["driver", "fromAddress", "sender", "serviceSubcategory", "stops", "stops.toAddress", "stops.receiver"]
            });
            if (!order) {
                throw new Error(`Order with ID ${orderId} not found or not assigned to driver ${driverId}`);
            }
            if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELED || order.status === OrderStatus.PENDING) {
                throw new Error(`Order with ID ${orderId} has status ${order.status} and cannot be cancelled`);
            }
            //check that order is related to this driver
            if (order.driver.id !== driverId) {
                throw new Error(`Order with ID ${orderId} is not assigned to driver ${driverId}`);
            }
            await this.orderRepository.update(orderId, { status: OrderStatus.PENDING, driver: null });
            // Add to order status history
            order.status = OrderStatus.PENDING; // update status for history record
            await this.orderStatusHistoryService.createOrderStatusHistory(order, cancellationReason);
            console.log(`Order ${orderId} cancelled successfully for driver ${driverId}`);
            sendOrderConfirmation(order, order.totalCost, order.vehicleType, env.SMTP.USER, 'admin', 'order-status').catch((err) => {
              console.error("Error sending email to admin:", err);
            });
            console.log('sent mail to admin');
            //emit order to socket
            resetNotifiedDrivers(order.id);
            await emitOrderToDrivers(order);
        } catch (error) {
            console.error("Error cancelling order:", error);
            throw error;
        }
    }

    async approveOrRejectDriver(driverId: string, action: 'approve' | 'reject'): Promise<void> {
        try {
            const driver = await this.driverRepository.findOneBy({ id: driverId });
            if (!driver) {
                throw new Error(`Driver with ID ${driverId} not found`);
            }
            if (action === 'approve') {
                driver.signUpStatus = DriverSignupStatus.APPROVED;
            } else if (action === 'reject') {
                driver.signUpStatus = DriverSignupStatus.REJECTED;
            } else {
                throw new Error(`Invalid action: ${action}`);
            }
            await this.driverRepository.save(driver);
        } catch (error) {
            console.error("Error updating driver sign-up status:", error);
            throw error;
        }
    }

    async sendOtp(phoneNumber: string): Promise<string> {
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        try {
            otpCache.set(phoneNumber, otp);
            const phoneExtension = env.PHONE_EXTENSION; // Qatar country code
            await sendOtp(phoneNumber, otp, phoneExtension);
            console.log(`OTP ${otp} sent to new driver with phone number ${phoneNumber}`);
            return otp;
        } catch (error) {
            console.error("Error sending OTP:", error);
            return otp;
        }
    }

    async verifyOtp(phoneNumber: string, otp: string): Promise<boolean> {
        try {
            const cachedOtp = otpCache.get(phoneNumber);
            if (cachedOtp && cachedOtp === otp) {
                otpCache.delete(phoneNumber); // Invalidate OTP after successful verification
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error verifying OTP:", error);
            throw error;
        }
    }

    async getNearestActiveDrivers(
        vehicleType: VehicleType,
        pickUpCoordinates: string,
        hasCardOnDelivery: boolean
    ): Promise<{
        matchingDrivers: any[];
        nonMatchingDrivers: any[]
    }> {
        try {
          const filterOptions: any = {
            status: DriverStatus.ACTIVE,
          };
          
          if (hasCardOnDelivery) {
            filterOptions.hasCardOnDelivery = true;
          }
          const onlineDrivers = await this.driverRepository.find
          ({
            where: filterOptions,
            relations: ["vehicle"]
          })
          console.log("length of driver array:" , onlineDrivers.length)
        
          // Run all lookups + distance calculations in parallel
          const driverPromises = onlineDrivers.map(async (driver) => {
            const driverCurrentLocation = getCurrentLocationOfDriver(driver.id)
            let distanceMeters;
            let durationMinutes;
            if (driverCurrentLocation) {
                const distanceResults = await getDrivingDistanceInKm(
                  driverCurrentLocation,
                  pickUpCoordinates
                );
                distanceMeters = distanceResults.distanceMeters
                durationMinutes = distanceResults.durationMinutes
            }
        
            return {
              id: driver.id,
              name: driver.name,
              phoneNumber: driver.phoneNumber,
              currentLocation: driverCurrentLocation,
              vehicleType: driver.vehicle.type,
              distanceMeters,
              durationMinutes
            };
          });
      
          // Wait for all promises to finish
          const results = await Promise.all(driverPromises);
      
      
          // Sort by distance (nearest first)
          // Split drivers by vehicle type
          const matchingDrivers = results.filter(
            (driver) => driver.vehicleType === vehicleType
          );
      
          const nonMatchingDrivers = results.filter(
            (driver) => driver.vehicleType !== vehicleType
          );
          // Sort each group by distance (nearest first)
          const sortByDistance = (a, b) =>
            (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
      
          matchingDrivers.sort(sortByDistance);
          nonMatchingDrivers.sort(sortByDistance);
      
          console.log("Matching drivers:", matchingDrivers);
          console.log("Non-matching drivers:", nonMatchingDrivers);
          return { matchingDrivers, nonMatchingDrivers };
        } catch (error) {
          console.error("Error fetching nearest active drivers:", error);
          throw error;
        }
}

  async assignDriverToOrder(driverId: string, orderId: string): Promise<void> {
    try {
        const driver = await this.driverRepository.findOneBy({ id: driverId });
        if (!driver) {
            throw new Error(`Driver with ID ${driverId} not found`);
        }
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ["driver", "fromAddress", "sender", "stops", "stops.toAddress", "stops.receiver"]
        });
        if (!order) {
            throw new Error(`Order with ID ${orderId} not found`);
        }
        if (order.driver) {
            throw new Error(`Order with ID ${orderId} is already assigned to a driver`);
        }
        if (order.status !== OrderStatus.PENDING) {
            throw new Error(`Order with ID ${orderId} has status ${order.status} and cannot be assigned`);
        }
        await emitOrderToDriver(driverId, order, driver.fcmToken);
    }
    catch (error) {
        console.error("Error assigning driver to order:", error);
        throw error;
    }
  }

  async inviteDriverByBusinessOwner(businessOwnerId: string, phoneNumber: string): Promise<void> {
    try {
        const businessOwner = await this.driverRepository.findOneBy({ id: businessOwnerId });
        if (!businessOwner) {
            throw new Error(`Business owner with ID ${businessOwnerId} not found`);
        }
        if (businessOwner.type !== DriverType.BUSINESS) {
            throw new Error(`Driver with ID ${businessOwnerId} is not a business owner`);
        }
        let driver = await this.driverRepository.findOne({ where: { phoneNumber }, relations: ["businessOwner"] });
        if (!driver) {
            driver = this.driverRepository.create({
                phoneNumber,
                type: DriverType.INDIVIDUAL,
                businessOwner: { id: businessOwnerId },
            });
            await this.driverRepository.save(driver);
        } else {
            if (driver.businessOwner && driver.businessOwner.id === businessOwnerId) {
                throw new Error(`Driver with phone number ${phoneNumber} is already invited by this business owner`);
            }
            else if (driver.businessOwner && driver.businessOwner.id !== businessOwnerId) {
                throw new Error(`Driver with phone number ${phoneNumber} already linked to another business owner`);
            }
            else if (!driver.businessOwner) {
                driver.businessOwner = { id: businessOwnerId } as Driver;
                await this.driverRepository.save(driver);
            }
            else throw new Error(`Driver with phone number ${phoneNumber} already linked to another business owner`);
        }
    } catch (error) {
        console.error("Error inviting driver by business owner:", error);
        throw error;
    }
 }

  async getInvitedDriversByBusinessOwner(businessOwnerId: string): 
    Promise<{ drivers: Partial<Driver>[], stats: { Total: number; Active: number; Offline: number; OnDelivery: number } 
    }> {
    try {
        const businessOwner = await this.driverRepository.findOneBy({ id: businessOwnerId });
        if (!businessOwner) {
            throw new Error(`Business owner with ID ${businessOwnerId} not found`);
        }

         // 2️⃣ Fetch invited drivers with vehicle relation
        const invitedDrivers = await this.driverRepository.find({
          where: { businessOwner: { id: businessOwnerId } },
          relations: ["vehicle"],
        });

        // 3️⃣ Aggregate counts by driver.status directly from DB
        const rawCounts = await this.driverRepository
          .createQueryBuilder("driver")
          .select("driver.status", "status")
          .addSelect("COUNT(driver.id)", "count")
          .where("driver.businessOwnerId = :businessOwnerId", { businessOwnerId })
          .groupBy("driver.status")
          .getRawMany();

        // 4️⃣ Normalize results (defaulting to 0)
        const stats = {
          Total: invitedDrivers.length,
          Active: Number(rawCounts.find(r => r.status === DriverStatus.ACTIVE)?.count || 0),
          Offline: Number(rawCounts.find(r => r.status === DriverStatus.OFFLINE)?.count || 0),
          OnDelivery: Number(rawCounts.find(r => r.status === DriverStatus.BUSY)?.count || 0),
        };

        return {
          drivers: DriverResource.mapInvitedDriversResponse(invitedDrivers),
          stats,
        };
    } catch (error) {
        console.error("Error fetching invited drivers by business owner:", error);
        throw error;
    }
  }

  //approvedWithoutVehicle flag used so that admin can approve a driver even if he hasnt entered his vehicle details yet
  async updateDriverSignUpStatus(driverId: string) {
    const driver = await this.driverRepository.findOne({
      where: { id: driverId },
    });

    if (!driver) throw new Error("Driver not found");

    // Evaluate combined approval
    const allApproved =
      driver.qidApprovalStatus === ApprovalStatus.APPROVED &&
      driver.licenseApprovalStatus === ApprovalStatus.APPROVED &&
      driver.vehicleInfoApprovalStatus === ApprovalStatus.APPROVED;

    const anyRejected =
      driver.qidApprovalStatus === ApprovalStatus.REJECTED ||
      driver.licenseApprovalStatus === ApprovalStatus.REJECTED ||
      driver.vehicleInfoApprovalStatus === ApprovalStatus.REJECTED
    
    console.log("any Rejected:" , anyRejected)
    console.log("all approved: ", allApproved)
    if (anyRejected) {
      driver.signUpStatus = DriverSignupStatus.REJECTED;
    } else if (allApproved) {
      driver.signUpStatus = DriverSignupStatus.APPROVED;
    } else {
      driver.signUpStatus = DriverSignupStatus.PENDING;
    }

    await this.driverRepository.save(driver);
}

  async approveQid(driverId: string, status: ApprovalStatus, reason: string): Promise<void> {
    const driver = await this.driverRepository.findOneBy({ id: driverId });

    if (!driver) {
      throw new Error(`Driver with ID ${driverId} not found`);
    }

    driver.qidApprovalStatus = status;
    driver.qidRejectionReason = status === ApprovalStatus.REJECTED ? reason : null;
    await this.driverRepository.save(driver);

    await this.updateDriverSignUpStatus(driverId);

  }

  async approveLicense(driverId: string, status: ApprovalStatus, reason: string): Promise<void> {
    const driver = await this.driverRepository.findOneBy({ id: driverId });

    if (!driver) {
      throw new Error(`Driver with ID ${driverId} not found`);
    }
    driver.licenseApprovalStatus = status;
    driver.licenseRejectionReason = status === ApprovalStatus.REJECTED ? reason : null;
    await this.driverRepository.save(driver);

    await this.updateDriverSignUpStatus(driverId);
  }

  
  async approveVehicleInfo(driverId: string, status: ApprovalStatus, reason: string): Promise<void> {
    const driver = await this.driverRepository.findOne({
      where: { id: driverId }
    });

    if (!driver) {
      throw new Error(`Driver with ID ${driverId} not found`);
    }

    driver.vehicleInfoApprovalStatus = status;
    driver.vehicleInfoRejectionReason = status === ApprovalStatus.REJECTED ? reason : null;
    await this.driverRepository.save(driver);
    await this.updateDriverSignUpStatus(driverId);
  }

  async approveBusinessDocs(driverId: string, status: ApprovalStatus, reason: string): Promise<void> {
    const driver = await this.driverRepository.findOneBy({ id: driverId });
    if (!driver) {
      throw new Error(`Driver with ID ${driverId} not found`);
    }

    driver.businessDocsApprovalStatus = status;
    driver.businessDocsRejectionReason = status === ApprovalStatus.REJECTED ? reason : null;
    driver.signUpStatus = status === ApprovalStatus.APPROVED ? DriverSignupStatus.APPROVED : DriverSignupStatus.REJECTED;
    await this.driverRepository.save(driver);
  }

  async editQid(driverId: string, qidData: any): Promise<void> {
    const driver = await this.driverRepository.findOneBy({ id: driverId });

    if (!driver) {
      throw new Error(`Driver with ID ${driverId} not found`);
    }

    driver.qid = qidData.qid;
    driver.qidFront = qidData.qidFront;
    driver.qidBack = qidData.qidBack;

    // Reset approval status to pending on edit
    driver.qidApprovalStatus = ApprovalStatus.PENDING;
    driver.qidRejectionReason = null;

    await this.driverRepository.save(driver);
    await this.updateDriverSignUpStatus(driverId);
    await sendDriverUpdateInfoMail(driver.name, driver.phoneNumber, 'QID').catch((err) => {
        console.error("Error sending driver QID update email:", err);
    });
  } 
  
   async editLicense(driverId: string, licenseData: any): Promise<void> {
      const driver = await this.driverRepository.findOneBy({ id: driverId });

        if (!driver) {
            throw new Error(`Driver with ID ${driverId} not found`);
        }

        driver.licenseFront = licenseData.licenseFront;
        driver.licenseBack = licenseData.licenseBack;
        driver.licenseExpirationDate = licenseData.licenseExpirationDate;

        // Reset approval status to pending on edit
        driver.licenseApprovalStatus = ApprovalStatus.PENDING;
        driver.licenseRejectionReason = null;
        await this.driverRepository.save(driver);
        await this.updateDriverSignUpStatus(driverId);

        await sendDriverUpdateInfoMail(driver.name, driver.phoneNumber, 'License').catch((err) => {
            console.error("Error sending driver license update email:", err);
        });
    }

  async editVehicleInfo(driverId: string, vehicleData: any): Promise<void> {
    const driver = await this.driverRepository.findOne({
      where: { id: driverId },
      relations: ["vehicle"],
    });

    if (!driver) {
      throw new Error(`Driver with ID ${driverId} not found`);
    }

    if (!driver.vehicle) {
      throw new Error(`Driver with ID ${driverId} has no vehicle assigned`);
    }

    driver.vehicle.model = vehicleData.model;
    driver.vehicle.number = vehicleData.number;
    driver.vehicle.color = vehicleData.color;
    driver.vehicle.productionYear = vehicleData.productionYear;

    // Reset approval status to pending on edit
    driver.vehicleInfoApprovalStatus = ApprovalStatus.PENDING;
    driver.vehicleInfoRejectionReason = null;

    await this.driverRepository.manager.getRepository(Vehicle).save(driver.vehicle);
    await this.updateDriverSignUpStatus(driverId);

    await sendDriverUpdateInfoMail(driver.name, driver.phoneNumber, 'Vehicle Information').catch((err) => {
        console.error("Error sending driver vehicle info update email:", err);
    });
  }

  async editBusinessDocs(driverId: string, businessDocsData: any): Promise<void> {
    const driver = await this.driverRepository.findOneBy({ id: driverId });
    if (!driver) {
      throw new Error(`Driver with ID ${driverId} not found`);
    }

    driver.crPhoto = businessDocsData.crPhoto;
    driver.taxId = businessDocsData.taxId;

    // Reset approval status to pending on edit
    driver.businessDocsApprovalStatus = ApprovalStatus.PENDING;
    driver.businessDocsRejectionReason = null;
    driver.signUpStatus = DriverSignupStatus.PENDING;

    await this.driverRepository.save(driver);
    
    await sendDriverUpdateInfoMail(driver.name, driver.phoneNumber, 'Business Documents').catch((err) => {
        console.error("Error sending driver business documents update email:", err);
    });
  }


  async activateDeactivateDriver(driverId: string, deactivate: string): Promise<void> {
    const driver = await this.driverRepository.findOneBy({ id: driverId });
    if (!driver) {
        throw new Error(`Driver with ID ${driverId} not found`);
    }
    console.log("Deactivate value:", deactivate, "type:", typeof deactivate);
    if (deactivate) { 
        driver.signUpStatus = DriverSignupStatus.DEACTIVATED;
        console.log(`Driver with ID ${driverId} deactivated`);
    }
    else driver.signUpStatus = DriverSignupStatus.APPROVED;
    await this.driverRepository.save(driver);
    }

  async deleteDriver(driverId: string): Promise<void> {
    const driver = await this.driverRepository.findOne({ where: { id: driverId }, relations: ["orders", "vehicle"] });
    if (!driver) {
        throw new Error(`Driver with ID ${driverId} not found`);
    }
    if (driver.orders && driver.orders.length > 0) {
        for (const order of driver.orders) {
            order.driver = null;
            order.deletedDriverData = JSON.stringify({
                name: driver.name,
                phoneNumber: driver.phoneNumber,
                vehicleType: driver.vehicle?.type,
                vehicleNumber: driver.vehicle?.number,
                vehicleModel: driver.vehicle?.model
            });
            await this.orderRepository.save(order);
        }
    }   
    if (driver.vehicle) await this.vehicleRepository.remove(driver.vehicle);
    await this.driverRepository.remove(driver);
    }

    async getAllOnlineDrivers(): Promise<any[]> {
        try {
            const onlineDriversMap = getOnlineDrivers();
            const onlineDrivers: any[] = [];
            for (const [driverId, driverData] of onlineDriversMap.entries()) {
                const driver = await this.driverRepository.findOneBy({ id: driverId });
                if (driver) {
                    onlineDrivers.push({
                        id: driver.id,
                        name: driver.name,
                        phoneNumber: driver.phoneNumber,
                        currentLocation: driverData.currentLocation,
                        vehicleType: driverData.vehicleType,
                        status: driver.status
                    });
                }
            }
            return onlineDrivers;
        }
        catch (error) {
            console.error("Error fetching all online drivers:", error);
            throw error;
        }
    }
    
    async isDriverConnected(driverId: string): Promise<boolean> {
        try {
            const onlineDriversMap = getOnlineDrivers();
            const driver = onlineDriversMap.get(driverId);
            console.log("Driver connection status for ID", driverId, ":", driver);
            const isConnected = (driver && driver?.socketId) ? true : false;
            console.log("isConnected:", isConnected);
            return isConnected;
        }
        catch (error) {
            console.error("Error checking if driver is connected:", error);
            throw error;
        }
    }

    async markDriverAsNotified(driverId: string, orderId: string): Promise<void> {
        try {
            markDriverNotified(orderId, driverId);
            const notifiedDrivers = getNotifiedDriversForOrder(orderId);
            console.log(`Driver ${driverId} marked as notified for order ${orderId}. Notified drivers:`, notifiedDrivers);
        } catch (error) {
            console.error("Error marking driver as notified:", error);
            throw error;
        }
    }

    async switchDriverType(driverId: string, businessOwnerId: string) {
        try {
            const driver = await this.driverRepository.findOne({
                where: {id: driverId},
                relations: ["businessOwner"]
            })

            if (driver.type === DriverType.BUSINESS) {
                console.error(`Cannot switch a business`)
                throw new Error(`Cannot switch a business`)
            }

            // if he is already under a business
            if (driver.businessOwner) {
                //switch to another business
                if (businessOwnerId) {
                    driver.businessOwner.id = businessOwnerId;
                }
                //make him a freelance driver (no business owner)
                else {
                    console.log("driver has a business and will be freelance")
                    driver.businessOwner = null;
                }
            }
            // he is a freelance driver
            else {
                if (!businessOwnerId) throw new Error(`Driver is already freelance`)
                //switch driver to be under a business
                driver.businessOwner = {id: businessOwnerId} as any;
            }

            await this.saveDriver(driver)
        } catch (err) {
            console.error(`Error switching driver type: ${err.message}`)
            throw new Error(`Error switching driver type: ${err.message}`)
        }
    }

    async updateDriverStatus(driverId: string, status: DriverStatus, queryRunner?: any) {
        try {
            let driver: Driver;
            const manager = queryRunner ? queryRunner.manager : this.driverRepository;

            // Find the driver
            if (queryRunner) {
                driver = await manager.findOne(Driver, { where: { id: driverId } });
            } else {
                driver = await manager.findOne({ where: { id: driverId } });
            }
        
            if (!driver) {
              throw new Error(`Couldn't find driver to update status`);
            }
        
            driver.status = status;
            await manager.save(driver);
        } catch (err) {
            console.error(`Error updating driver status: ${err.message}`)
            throw new Error(`Error updating driver status: ${err.message}`)
        }
    }

    async getAllDriverBusinesses() {
        try {
            const driverBusinesses = await this.driverRepository.find({
                where: {type: DriverType.BUSINESS}
            })

            return driverBusinesses.map((driverBusiness) => ({
                id: driverBusiness.id,
                name: driverBusiness.name,
                phoneNumber: driverBusiness.phoneNumber,
                businessName: driverBusiness.businessName
            }))

        } catch (err) {
            console.error(`Error getting driver businesses: ${err.message}`)
            throw new Error(`Error getting driver businesses: ${err.message}`)
        }
    }

    async updateDriverIncomeAndCashBalance(driverId: string, order: Order) {
        try {
            const driver = await this.driverRepository.findOne({
                where: { id: driverId }, 
                relations: ["businessOwner"]
            })
            if (!driver) {
              console.error("driver not found")
              throw new Error("Driver not found");
            }
            console.log("order totalCost:", order.totalCost)
            console.log("driver current income:" , driver.income)
            driver.income = Number(driver.income || 0) + Number(order.totalCost || 0); 
            console.log("new driver income: ", driver.income)
            const stops = order.stops || [];

            const cashStops = stops.filter(
              s => s.paymentMethod === PaymentMethod.CASH_ON_DELIVERY);
        
            const cardStops = stops.filter(
              s =>
                s.paymentMethod === PaymentMethod.CREDIT_DEBIT ||
                s.paymentMethod === PaymentMethod.CARD_ON_DELIVERY ||
                s.paymentMethod === PaymentMethod.WALLET
            );

            const hasAnyTotalPrice = stops.some(
              s => s.totalPrice !== null && s.totalPrice !== undefined
            );
        
            const cashStopsTotal = cashStops.reduce(
              (sum, s) => sum + (Number(s.totalPrice) || 0),
              0
            );

            // 2️⃣ DRIVER HAS BUSINESS OWNER
            // then only add to the cash balance in case of cash orders
            // and never subtract from it in any case (business need)
            console.log("current cash balance: ", driver.cashBalance)
            if (driver.businessOwner) {
              console.log("order has a business owner")
              if (hasAnyTotalPrice) {
                console.log("order has total price on at least one stop so updating cash balance")
                driver.cashBalance = 
                    Number(driver.cashBalance) + cashStopsTotal
                driver.onlineIncome = Number(driver.onlineIncome || 0) + Number(order.totalCost || 0);
              }
              else {
                console.log("order is via website so no total price on any stop")
                if (order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
                    driver.cashIncome = Number(driver.cashIncome || 0) + Number(order.totalCost) || 0;
                }
                else{
                  driver.onlineIncome = Number(driver.onlineIncome || 0) + Number(order.totalCost || 0);
                }
              }
            }

            // 3️⃣ DRIVER DOES NOT HAVE BUSINESS OWNER
            else {
                // const allCash = cashStops.length === stops.length;
                // const allCard = cardStops.length === stops.length;
                // const mixed = cashStops.length > 0 && cardStops.length > 0; 
                // 🔹 NO totalPrice ON ANY STOP (means order made via website)
                // check if order payment method is 
                if (!hasAnyTotalPrice) {
                  console.log("order is made via website so no total price")
                  //revisit this later if a payment would be made per stop when ordering from site
                  if (order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
                    driver.cashIncome =
                      Number(driver.cashIncome || 0) + Number(order.totalCost) || 0;
                  } else {
                    driver.onlineIncome =
                      Number(driver.onlineIncome || 0) + Number(order.totalCost) || 0;
                  }
                }
                else {
                  console.log("order is made by a client")
                  driver.cashBalance = Number(driver.cashBalance || 0) + cashStopsTotal;
                  driver.onlineIncome = Number(driver.onlineIncome || 0) + Number(order.totalCost || 0);
                }
            }
            console.log("new driver cash balance: ", driver.cashBalance)
            await this.driverRepository.save(driver);
        } catch (err) {
            console.error(`Error getting updating driver income: ${err.message}`)
            throw new Error(`Error getting updating driver income: ${err.message}`)
        }
    }

    async resolveCashBalance(driverId: string): Promise<void> {
        try {
            const driver = await this.driverRepository.findOneBy({ id: driverId });
            if (!driver) {
                throw new Error(`Driver with ID ${driverId} not found`);
            }
            driver.cashBalance = 0;
            console.log(`Driver ${driverId} cash balance resolved to zero.`);
            await this.driverRepository.save(driver);
        }
        catch (error) {
            console.error("Error resolving driver cash balance:", error);
            throw error;
        }
    }

    async getDriverIncomeForBusiness(driverId: string, businessOwnerId: string) {
        try {
            const driver = await this.driverRepository.findOne({
                where: { id: driverId, businessOwner: { id: businessOwnerId } }
            });
            if (!driver) {
                throw new Error(`Driver with ID ${driverId} not found or not linked to business owner ${businessOwnerId}`);
            }
            const income = this.getDriverIncome(driverId);
            return income;
        } catch (error) {
            console.error("Error fetching driver income for business owner:", error);
            throw error;
        }
    }
}
