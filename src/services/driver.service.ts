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
import { emitOrderToDrivers, emitOrderToDriver } from "../socket/socket.js";
import { resetNotifiedDrivers } from "../utils/notification-tracker.js";
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

const otpCache = new Map<string, string>(); // In-memory cache for OTPs

@Service()
export default class DriverService {
    private driverRepository = AppDataSource.getRepository(Driver);
    private vehicleRepository = AppDataSource.getRepository(Vehicle);
    private orderRepository = AppDataSource.getRepository(Order); // Assuming you have an Order model
    private orderStatusHistoryService = Container.get(OrderStatusHistoryService);

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
    constructDriverQuery() {
        return this.driverRepository.createQueryBuilder("driver")
                .leftJoinAndSelect("driver.vehicle", "vehicle")
                .leftJoin("driver.orders", "order")
                .leftJoinAndSelect("driver.businessOwner", "businessOwner")
                .select([
                    "driver.id",
                    "driver.name",
                    "driver.phoneNumber",
                    "driver.status",
                    "driver.password",
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
                    "vehicle.infoApprovalStatus",
                    "vehicle.infoRejectionReason"
                ])
    }

    async findDriverById(driverId: string, type?: string): Promise<Driver | null> {
        try {
            if (type) return await this.constructDriverQuery()
                    .where("driver.id = :driverId", { driverId })
                    .getOne();
            else return await this.constructDriverQuery()
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
            const result = await this.constructDriverQuery()
            .addSelect("COUNT(order.id)", "orderCount")
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
            await this.orderRepository.update(orderId, { status: OrderStatus.CANCELED, driver: null });
            // Add to order status history
            order.status = OrderStatus.CANCELED; // update status for history record
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
        pickUpCoordinates: string
    ): Promise<any[]> {
        try {
          const onlineDrivers = getOnlineDrivers();
        
          // Convert map to array and filter by vehicle type first
          const candidates = Array.from(onlineDrivers.entries())
            .filter(([_, driver]) => driver.vehicleType === vehicleType);
        
          // Run all lookups + distance calculations in parallel
          const driverPromises = candidates.map(async ([driverId, driver]) => {
            const driverDetails = await this.driverRepository.findOne({
              where: { id: driverId }
            });
        
            if (!driverDetails) return null;
            if (driverDetails.status !== DriverStatus.ACTIVE) return null;
        
            const { distanceMeters, durationMinutes } = await getDrivingDistanceInKm(
              driver.currentLocation,
              pickUpCoordinates
            );
        
            return {
              id: driverId,
              name: driverDetails.name,
              phoneNumber: driverDetails.phoneNumber,
              currentLocation: driver.currentLocation,
              vehicleType: driver.vehicleType,
              distanceMeters,
              durationMinutes
            };
          });
      
          // Wait for all promises to finish
          const results = await Promise.all(driverPromises);
      
          // Filter out any null results
          const filteredDrivers = results.filter(Boolean);
      
          // Sort by distance (nearest first)
          filteredDrivers.sort((a, b) => a.distanceMeters - b.distanceMeters);
          console.log("Nearest active drivers:", filteredDrivers);
          return filteredDrivers;
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
        await emitOrderToDriver(driverId, order);
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
          OnDelivery: Number(rawCounts.find(r => r.status === DriverStatus.ON_DUTY)?.count || 0),
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

  async updateDriverSignUpStatus(driverId: string) {
    const driver = await this.driverRepository.findOne({
      where: { id: driverId },
      relations: ["vehicle"],
    });

    if (!driver) throw new Error("Driver not found");

    // Evaluate combined approval
    const allApproved =
      driver.qidApprovalStatus === ApprovalStatus.APPROVED &&
      driver.licenseApprovalStatus === ApprovalStatus.APPROVED &&
      driver.vehicle?.infoApprovalStatus === ApprovalStatus.APPROVED;

    const anyRejected =
      driver.qidApprovalStatus === ApprovalStatus.REJECTED ||
      driver.licenseApprovalStatus === ApprovalStatus.REJECTED ||
      driver.vehicle?.infoApprovalStatus === ApprovalStatus.REJECTED;

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
      where: { id: driverId },
      relations: ["vehicle"],
    });

    if (!driver) {
      throw new Error(`Driver with ID ${driverId} not found`);
    }
    if (!driver.vehicle) {
      throw new Error(`Driver with ID ${driverId} has no vehicle assigned`);
    }

    driver.vehicle.infoApprovalStatus = status;
    driver.vehicle.infoRejectionReason = status === ApprovalStatus.REJECTED ? reason : null;
    await this.driverRepository.manager.getRepository(Vehicle).save(driver.vehicle);

    await this.updateDriverSignUpStatus(driverId);
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
    driver.vehicle.infoApprovalStatus = ApprovalStatus.PENDING;
    driver.vehicle.infoRejectionReason = null;

    await this.driverRepository.manager.getRepository(Vehicle).save(driver.vehicle);
    await this.updateDriverSignUpStatus(driverId);

    await sendDriverUpdateInfoMail(driver.name, driver.phoneNumber, 'Vehicle Information').catch((err) => {
        console.error("Error sending driver vehicle info update email:", err);
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
}
