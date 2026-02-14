import { Service } from "typedi";
import { Order } from "../models/order.model.js";
import { OrderStatusHistory } from "../models/orderStatusHistory.model.js";
import { AppDataSource } from "../config/data-source.js";
import { OrderEventType } from "../utils/enums/orderEventType.enum.js";
import { IsNull, Not } from "typeorm";


@Service()
export default class OrderStatusHistoryService {
    private orderStatusHistoryRepository = AppDataSource.getRepository(OrderStatusHistory);

    async createOrderStatusHistory(options: {
      order: Order,
      cancellationReason?: string,
      queryRunner?: any,
      stopId?: string,
      triggeredByAdmin?: boolean,
      hasArrived?: boolean,
      returnedStartedAt?: Date,
      returnedCompletedAt?: Date,
      event?: OrderEventType
    }) {
      try {
        const orderStatusHistory = new OrderStatusHistory();
        orderStatusHistory.order = options.order;
        orderStatusHistory.status = options.order.status;
        orderStatusHistory.event = options.event ?? null;
        orderStatusHistory.driver = options.order.driver ?? null;
        orderStatusHistory.cancellationReason = options.cancellationReason ?? null;
        orderStatusHistory.orderStop = options.stopId ? { id: options.stopId } as any : null;
        orderStatusHistory.triggeredByAdmin = options.triggeredByAdmin ?? false;
        orderStatusHistory.hasArrived = options.hasArrived ?? false;
        orderStatusHistory.returnedStartedAt = options.returnedStartedAt ?? null;
        orderStatusHistory.returnedCompletedAt = options.returnedCompletedAt ?? null;

        if (options.queryRunner) {
          await options.queryRunner.manager.save(OrderStatusHistory, orderStatusHistory);
        } else {
          await this.orderStatusHistoryRepository.save(orderStatusHistory);
        }
      } catch (error) {
        console.log(error);
        throw new Error(`Error creating order status history: ${error.message}`);
      }
    }

    async updateOrderStatusHistory(options: {
      order: Order,
      cancellationReason?: string,
      queryRunner?: any,
      stopId?: string,
      triggeredByAdmin?: boolean,
      hasArrived?: boolean,
      returnedStartedAt?: Date,
      returnedCompletedAt?: Date,
      event?: OrderEventType
    }) {
      try {
        const orderStatusHistory = await this.orderStatusHistoryRepository.findOne({
            where: {
                order: { id: options.order.id },
                orderStop: options.stopId ? { id: options.stopId } as any : null,
                returnedStartedAt: Not(IsNull()),
            }
        });
        if (!orderStatusHistory) {
          throw new Error(`Order status history not found for order ID ${options.order.id}`);
        }
        
        orderStatusHistory.returnedCompletedAt = options.returnedCompletedAt ?? orderStatusHistory.returnedCompletedAt;

        if (options.queryRunner) {
          await options.queryRunner.manager.save(OrderStatusHistory, orderStatusHistory);
        } else {
          await this.orderStatusHistoryRepository.save(orderStatusHistory);
        }
      } catch (error) {
        console.log(error);
        throw new Error(`Error updating order status history: ${error.message}`);
      }
    }
}