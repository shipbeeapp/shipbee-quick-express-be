import { Service } from "typedi";
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

@Service()
export default class DriverService {
    private driverRepository = AppDataSource.getRepository(Driver);
    private vehicleRepository = AppDataSource.getRepository(Vehicle);
    private orderRepository = AppDataSource.getRepository(Order); // Assuming you have an Order model

    async findOrCreateDriver(data: any, queryRunner?: any): Promise<any> {
        try {
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
                        // add other vehicle fields if needed
                    });
                    vehicle = await vehicleManager.save(vehicle);
                }
                // Create new driver and assign vehicle
                const newDriver = manager.create({
                    ...data,
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
                "vehicle.id",
                "vehicle.type",
                "vehicle.model",
                "vehicle.number",
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
            const startOfToday = new Date();
            startOfToday.setUTCHours(0, 0, 0, 0);

            const endOfToday = new Date();
            endOfToday.setUTCHours(23, 59, 59, 999);
            // Get All orders for this driver
            const result = await this.orderRepository
                .find({
                    where: {
                        driver: { id: driverId },
                        status: OrderStatus.COMPLETED,// Assuming you want completed orders only
                        completedAt: Between(startOfToday, endOfToday)
                    },
                    select: ["id", "pickUpDate", "totalCost", "completedAt"],
                    order: { pickUpDate: "DESC" }
                });

            const totalIncome = result.reduce((sum, order) => sum + Number(order.totalCost || 0), 0);
            console.log("Total income for driver:", totalIncome);
            console.log("Driver orders:", JSON.stringify(result, null, 2));
            const orders = result.map(order => ({
                id: order.id,
                date: order.completedAt.toLocaleString("en-US", {
                    timeZone: "Asia/Qatar", // or use device's local timezone
                    day: "numeric",    // 15
                    month: "numeric",     // July
                    year: "numeric",   // 2025
                }),
                time: order.completedAt.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: "Asia/Qatar",
                }),
                driverShare: Number(order.totalCost) || 0
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

    async getDriverPerformance(driverId: string): Promise<any> {
        try {
            // Get today's start and end timestamps
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

            const monthlyOrders = await this.orderRepository.count({
                where: {
                    driver: { id: driverId },
                    pickUpDate: Between(startOfMonth, endOfMonth),
                    status: OrderStatus.COMPLETED
                }
            });
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            sevenDaysAgo.setHours(0, 0, 0, 0); // Set to start of the day
            console.log("Fetching earnings for driver:", driverId, "from", sevenDaysAgo, "to", now);
            const earningsLastWeek = await this.orderRepository.manager
                .createQueryBuilder()
                .from(`(
                  SELECT generate_series(
                    DATE_TRUNC('day', :start::timestamp),
                    DATE_TRUNC('day', :end::timestamp),
                    '1 day'
                  )::date AS day
                )`, "days")
                .select([
                  `TO_CHAR(days.day, 'DD FMMon') AS date`,
                  `TO_CHAR(days.day, 'Dy') AS day_name`,
                  `COALESCE(SUM(o."totalCost")::float, 0) AS total`
                ])
                .leftJoin(Order, "o", `
                  DATE(o."pickUpDate") = days.day
                  AND o."driverId" = :driverId
                  AND o."status" = :status
                `)
                .setParameters({
                  start: sevenDaysAgo,
                  end: now,
                  driverId,
                  status: OrderStatus.COMPLETED
                })
                .groupBy("days.day")
                .orderBy("days.day", "ASC")
                .getRawMany();
            console.log("Earnings last week for driver:", driverId, earningsLastWeek);

            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0); // Set to start of the day
            console.log("Fetching total trips today for driver:", driverId, "from", startOfDay, "to", now);
            const totalTripsToday = await this.orderRepository.count({
                where: {
                    driver: { id: driverId },
                    pickUpDate: Between(startOfDay, now),
                    status: OrderStatus.COMPLETED
                }
            });

            console.log("Total trips today for driver:", driverId, totalTripsToday);
            const earningsToday = await this.orderRepository
                .createQueryBuilder("order")
                .select("COALESCE(SUM(order.totalCost)::float, 0)", "total")
                .where("order.driverId = :driverId", { driverId })
                .andWhere("order.pickUpDate BETWEEN :start AND :end", {
                    start: startOfDay,
                    end: now
                })
                .andWhere("order.status = :status", { status: OrderStatus.COMPLETED })
                .getRawOne();
            
            console.log("Earnings today for driver:", driverId, earningsToday);
            const earningsMonth = await this.orderRepository
                .createQueryBuilder("order")
                .select("COALESCE(SUM(order.totalCost)::float, 0)", "total")
                .where("order.driverId = :driverId", { driverId })
                .andWhere("order.pickUpDate BETWEEN :start AND :end", {
                    start: startOfMonth,
                    end: endOfMonth
                })
                .andWhere("order.status = :status", { status: OrderStatus.COMPLETED })
                .getRawOne();

            const hoursActiveToday = calculateActiveHoursToday(driverId);
            console.log("Active hours today for driver:", driverId, hoursActiveToday);

            return {
                monthlyOrders,
                earningsLastWeek,
                totalTripsToday,
                earningsToday: earningsToday.total,
                earningsMonth: earningsMonth.total,
                hoursActiveToday: Number(hoursActiveToday.toFixed(1)) // Round to 1 decimal place,
            }

        } catch (error) {
            console.error("Error fetching driver performance:", error);
            throw error;
        }
    }

    async cancelOrder(driverId: string, orderId: string, cancellationReason: string): Promise<void> {
        try {
            const order = await this.orderRepository.findOne({
                where: { id: orderId, driver: { id: driverId } },
                relations: ["driver"]
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
            await this.orderRepository.update(orderId, { status: OrderStatus.CANCELED, driver: null, cancellationReason });
            console.log(`Order ${orderId} cancelled successfully for driver ${driverId}`);
            //emit order to socket
            resetNotifiedDrivers(order.id);
            await emitOrderToDrivers(order);
        } catch (error) {
            console.error("Error cancelling order:", error);
            throw error;
        }
    }
}