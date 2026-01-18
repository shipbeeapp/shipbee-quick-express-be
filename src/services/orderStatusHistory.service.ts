import { Service } from "typedi";
import { Order } from "../models/order.model.js";
import { OrderStatusHistory } from "../models/orderStatusHistory.model.js";
import { AppDataSource } from "../config/data-source.js";


@Service()
export default class OrderStatusHistoryService {
    private orderStatusHistoryRepository = AppDataSource.getRepository(OrderStatusHistory);

    async createOrderStatusHistory(order: Order, cancellationReason: string = null, queryRunner?: any){
        try {
            const orderStatusHistory = new OrderStatusHistory();

            orderStatusHistory.order = order;
            orderStatusHistory.status = order.status;
            orderStatusHistory.driver = order.driver ?? null;
            orderStatusHistory.cancellationReason = cancellationReason;

            if (queryRunner) {
              await queryRunner.manager.save(OrderStatusHistory, orderStatusHistory);
            } else {
              await this.orderStatusHistoryRepository.save(orderStatusHistory);
            }
        } catch (error) {
            console.log(error);
            throw new Error(`Error creating order status history: ${error.message}`);
        }
    }
}