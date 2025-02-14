import { Service } from "typedi";
import { Order } from "../models/order.model.js";
import { OrderStatusHistory } from "../models/orderStatusHistory.model.js";


@Service()
export default class OrderStatusHistoryService {

    async createOrderStatusHistory(order: Order, queryRunner: any){
        try {
            const orderStatusHistory = queryRunner.manager.create(OrderStatusHistory, { order, status: order.status });
            await queryRunner.manager.save(orderStatusHistory);
        } catch (error) {
            console.log(error);
            throw new Error(`Error creating order status history: ${error.message}`);
        }
    }
}