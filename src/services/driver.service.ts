import {Container, Service } from "typedi";
import { AppDataSource } from "../config/data-source.js";
import { Driver } from "../models/driver.model.js";
import { Vehicle } from "../models/vehicle.model.js";
import { UpdateDriverDto } from "../dto/driver/updateDriver.dto.js";
import { Not } from "typeorm";
import { Between } from "typeorm";
import { Order } from "../models/order.model.js";
import { OrderStatus } from "../utils/enums/orderStatus.enum.js";
import { calculateActiveHoursToday } from "../socket/socket.js";
import { emitOrderToDrivers } from "../socket/socket.js";
import { resetNotifiedDrivers } from "../utils/notification-tracker.js";
import OrderStatusHistoryService from "./orderStatusHistory.service.js";
import { sendOrderConfirmation, sendOtp } from "../services/email.service.js";
import DriverSignupStatus from "../utils/enums/signupStatus.enum.js";
import { env } from "../config/environment.js";

const otpCache = new Map<string, string>(); // In-memory cache for OTPs

@Service()
export default class DriverService {
    private driverRepository = AppDataSource.getRepository(Driver);
    private vehicleRepository = AppDataSource.getRepository(Vehicle);
    private orderRepository = AppDataSource.getRepository(Order); // Assuming you have an Order model
    private orderStatusHistoryService = Container.get(OrderStatusHistoryService);

    async findOrCreateDriver(data: any, queryRunner?: any): Promise<any> {
        try {
            console.log("Starting findOrCreateDriver with data:", data);
            const manager = queryRunner ? queryRunner.manager.getRepository(Driver) : this.driverRepository;
            const vehicleManager = queryRunner ? queryRunner.manager.getRepository(Vehicle) : this.vehicleRepository;
            let driver;
            let vehicle;
            console.log("findOrCreateDriver called with data:", data);
            driver = await this.driverRepository.findOneBy({ phoneNumber: data.phoneNumber });
            
            if (!driver) {
                // Create new driver
                vehicle = await vehicleManager.findOne({
                    where: { type: data.vehicleType, number: data.vehicleNumber },
                    relations: ["driver"]
                });
    
                if (vehicle && vehicle.driver) {
                    throw new Error(`Vehicle with number ${data.vehicleNumber} is already linked to another driver`);
                }

                // If vehicle doesn't exist, create it
                if (!vehicle) {
                    vehicle = vehicleManager.create({
                        type: data.vehicleType,
                        number: data.vehicleNumber,
                        model: data.vehicleModel, // Assuming vehicleModel is part of the data
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
                    qid: data.qid,
                    qidFront: data.qidFront,
                    qidBack: data.qidBack,
                    licenseFront: data.licenseFront,
                    licenseBack: data.licenseBack,
                    licenseExpirationDate: data.licenseExpirationDate,
                    vehicle: vehicle
                });
                driver = await manager.save(newDriver);
              }
              else {
                throw new Error(`Driver with phone number ${data.phoneNumber} already exists`);
              }
            return {driver, vehicleType: vehicle.type};
        } catch (error) {
            console.error("Error in findOrCreateDriver:", error);
            throw error;
        }
    }

    async findDriverByPhone(phoneNumber: string): Promise<Driver | null> {
        try {
            return await this.driverRepository.findOne({
                where: { phoneNumber },
                relations: ["vehicle"],
            });
        } catch (error) {
            console.error("Error finding driver by phone:", error);
            throw error;
        }
    }

    async findDriverById(driverId: string): Promise<Driver | null> {
        try {
            return await this.driverRepository.findOne({
                where: { id: driverId },
                relations: ["vehicle"],
            });
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

    async updateDriver(driverId: string, driverData: UpdateDriverDto) {
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
            if (driverData.vehicleType && driver.vehicle) {
                console.log("Updating vehicle type for driver:", driverId, "with: ", driver.vehicle.type, "to", driverData.vehicleType);
                driver.vehicle.type = driverData.vehicleType;
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
            const { vehicleType, ...rest } = driverData;
        
            // Update driver fields
            Object.assign(driver, rest);
        
            await driverRepository.save(driver);
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
            const result = await this.driverRepository
            .createQueryBuilder("driver")
            .leftJoinAndSelect("driver.vehicle", "vehicle")
            .leftJoin("driver.orders", "order")
            .select([
                "driver.id",
                "driver.name",
                "driver.phoneNumber",
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
                "vehicle.id",
                "vehicle.type",
                "vehicle.model",
                "vehicle.number",
                "vehicle.frontPhoto",
                "vehicle.backPhoto",
                "vehicle.leftPhoto",
                "vehicle.rightPhoto",
                "vehicle.registrationFront",
                "vehicle.registrationBack",
            ])
            .addSelect("COUNT(order.id)", "orderCount")
            .groupBy("driver.id")
            .addGroupBy("vehicle.id")
            .getRawMany();
        
        console.log("Raw driver data:", result);
        return result;
        } catch (error) {
            console.error("Error fetching all drivers:", error);
            throw error;
        }
    }

    async getDriverIncome(driverId: string): Promise<any> {
        try {
            // Qatar is UTC+3
            const offsetHours = 3;
                    
            // Get current UTC time
            const now = new Date();
                    
            // Start of today in Qatar time
            const startOfToday = new Date(
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
            
            // End of today in Qatar time
            const endOfToday = new Date(
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
            // 1. Query today's completed orders for income
            const todayOrders = await this.orderRepository.find({
                where: {
                    driver: { id: driverId },
                    status: OrderStatus.COMPLETED,
                    completedAt: Between(startOfToday, endOfToday)
                },
                select: ["id", "totalCost", "completedAt"]
            });

            const totalIncome = todayOrders.reduce(
                (sum, order) => sum + Number(order.totalCost || 0),
                0
            );
            // 2. Query all completed orders for list
            const allOrders = await this.orderRepository.find({
                where: {
                    driver: { id: driverId },
                    status: OrderStatus.COMPLETED
                },
                select: ["id", "pickUpDate", "totalCost", "completedAt", "paymentMethod"],
                order: { completedAt: "DESC" }
            });
            const orders = allOrders.map(order => ({
                id: order.id,
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
                paymentMethod: order.paymentMethod
            }));

            return {
                totalIncome,
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
                relations: ["driver", "fromAddress", "toAddress", "sender", "receiver", "serviceSubcategory"]
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
            await this.orderRepository.update(orderId, { status: OrderStatus.CANCELED, driver: null });
            // Add to order status history
            order.status = OrderStatus.CANCELED; // update status for history record
            await this.orderStatusHistoryService.createOrderStatusHistory(order, cancellationReason);
            console.log(`Order ${orderId} cancelled successfully for driver ${driverId}`);
            sendOrderConfirmation(order, order.totalCost, order.vehicleType, "ship@shipbee.io", 'admin', 'order-status').catch((err) => {
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

    async sendOtp(phoneNumber: string): Promise<void> {
        try {
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            otpCache.set(phoneNumber, otp);
            const phoneExtension = env.PHONE_EXTENSION; // Qatar country code
            await sendOtp(phoneNumber, otp, phoneExtension);
            console.log(`OTP ${otp} sent to new driver with phone number ${phoneNumber}`);
        } catch (error) {
            console.error("Error sending OTP:", error);
            throw error;
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
}