import { Service } from "typedi";
import { Order } from "../models/order.model.js";
import { OrderStatusHistory } from "../models/orderStatusHistory.model.js";
import { AppDataSource } from "../config/data-source.js";


@Service()
export default class OrderStatusHistoryService {
    private orderStatusHistoryRepository = AppDataSource.getRepository(OrderStatusHistory);

    async createOrderStatusHistory(order: Order, cancellationReason: string = null, queryRunner?: any){
        try {
            const manager = queryRunner ? queryRunner.manager.getRepository(OrderStatusHistory) : this.orderStatusHistoryRepository;
            //check if order with status already exists
            // const existingHistory = await manager.findOne({
            //     where: { order: { id: order.id }, status: order.status },
            // });
            // console.log("Checking for existing order status history:", existingHistory);
            // if (existingHistory) {
            //     console.log("Order status history already exists for this order and status.");
            //     return;
            // }
            console.log("Creating new order status history for order:", order.id, "with status:", order.status);
            const orderStatusHistory = manager.create({ order, status: order.status, driver: order.driver, cancellationReason: cancellationReason});
            await manager.save(orderStatusHistory);
        } catch (error) {
            console.log(error);
            throw new Error(`Error creating order status history: ${error.message}`);
        }
    }
}