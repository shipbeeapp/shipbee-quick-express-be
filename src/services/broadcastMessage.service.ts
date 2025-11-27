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

    async getAllMessages() {
        try {
            const messages = await this.broadcastRepo.find({
                order: { createdAt: "DESC" }
            });
            return messages;
        } catch (error) {
            console.error("Error retrieving all broadcast messages:", error);
            throw new Error("Failed to retrieve broadcast messages: " + error.message);
        }
    }

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
                where: { driver: { id: driverId }, broadcastMessage: { isActive: true } },
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

    async modifyMessageStatus(broadcastMessageId: string, isActive: boolean) {
        try {
            const message = await this.broadcastRepo.findOne({  where: { id: broadcastMessageId } });
            if (!message) {
                throw new Error("Broadcast message not found");
            }
            message.isActive = isActive;
            await this.broadcastRepo.save(message);
        } catch (error) {
            console.error("Error modifying message status:", error);
            throw new Error("Failed to modify message status: " + error.message);
        }
    }

    async assignDriverToActiveMessages(driverId: string) {
        try {
            const driver = await this.driverRepository.findOne({ where: { id: driverId } });
            if (!driver) {
                throw new Error("Driver not found");
            }
            const activeMessages = await this.broadcastRepo.find({ where: { isActive: true } });
            for (const message of activeMessages) {
                const existingRelation = await this.broadcastDriverRepo.findOne({
                    where: { driver: { id: driverId }, broadcastMessage: { id: message.id } }
                });

                if (!existingRelation) {
                    const relation = this.broadcastDriverRepo.create({
                        broadcastMessage: message,
                        driver,
                    });
                    await this.broadcastDriverRepo.save(relation);
                }
                else {
                    console.log(`Driver ${driverId} already has message ${message.id} assigned.`);
                }
            }
        } catch (error) {
            console.error("Error assigning driver to active messages:", error);
            throw new Error("Failed to assign driver to active messages: " + error.message);
        }
    }
}