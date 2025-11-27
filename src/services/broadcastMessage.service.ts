import { Service } from "typedi";
import { BroadcastMessage } from "../models/broadcastMessage.model.js";
import { DriverBroadcastMessage } from "../models/driverBroadcastMessage.model.js";
import { AppDataSource } from "../config/data-source.js";
import { Driver } from "../models/driver.model.js";

@Service()
export class BroadcastMessageService {
    private broadcastRepo = AppDataSource.getRepository(BroadcastMessage);
    private broadcastDriverRepo = AppDataSource.getRepository(DriverBroadcastMessage)
    private driverRepository = AppDataSource.getRepository(Driver);
    // Implement methods to create, retrieve, and manage broadcast messages
    async broadcastToAllDrivers(title: string, message: string) {
        try {
            const drivers = await this.driverRepository.find();

            if (drivers.length === 0) {
              throw new Error("No drivers available to broadcast to");
            }

            // 1. Create the broadcast message
            const broadcastMessage = this.broadcastRepo.create({title, message});
            await this.broadcastRepo.save(broadcastMessage);

            // 2. Create broadcast message entries for each driver
            const relations = drivers.map((driver) =>
              this.broadcastDriverRepo.create({
                broadcastMessage,
                driver,
              })
            );

            await this.broadcastDriverRepo.save(relations);

            return { message, driversCount: drivers.length };
        } catch (error) {
            console.error("Error broadcasting message to drivers:", error);
            throw new Error("Failed to broadcast message: " + error.message);
        }
    }
    
    async getMessagesForDriver(driverId: string) {
        try {
            const driverMessages = await this.broadcastDriverRepo.find({
                where: { driver: { id: driverId } },
                relations: ["broadcastMessage"],
                order: { createdAt: "DESC" }
            });

            return driverMessages.map(dm => ({
                id: dm.broadcastMessage.id,
                title: dm.broadcastMessage.title,
                message: dm.broadcastMessage.message,
                isRead: dm.isRead,
                createdAt: dm.broadcastMessage.createdAt,
            }));
        } catch (error) {
            console.error("Error retrieving messages for driver:", error);
            throw new Error("Failed to retrieve messages: " + error.message);
        }
    }

    async markMessageAsRead(driverId: string, broadcastMessageId: string) {
        try {
            const driverMessage = await this.broadcastDriverRepo.findOne({
                where: {
                    driver: { id: driverId },
                    broadcastMessage: { id: broadcastMessageId }
                }
            });
            if (!driverMessage) {
                throw new Error("Message not found for this driver");
            }
            driverMessage.isRead = true;
            await this.broadcastDriverRepo.save(driverMessage);
        } catch (error) {
            console.error("Error marking message as read:", error);
            throw new Error("Failed to mark message as read: " + error.message);
        }
    }
}