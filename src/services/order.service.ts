import  { Service, Container } from "typedi";
import UserService  from "./user.service.js";
import { AddressService } from "./address.service.js";
// import { PaymentService } from "./payment.service.js";
import { CreateOrderDto } from "../dto/order/createOrder.dto.js";
import { AppDataSource } from "../config/data-source.js";
import { Order } from "../models/order.model.js";
import {User} from "../models/user.model.js";
import ServiceSubcategoryService from "./serviceSubcategory.service.js";
import OrderStatusHistoryService from "./orderStatusHistory.service.js";
import { OrderStatus } from "../utils/enums/orderStatus.enum.js";
@Service()
export default class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private userRepo = AppDataSource.getRepository(User);
  private userService = Container.get(UserService);
  private addressService = Container.get(AddressService);
  private serviceSubcategoryService = Container.get(ServiceSubcategoryService);
  private orderStatusHistoryService = Container.get(OrderStatusHistoryService);
  
  constructor() {}
  
  async createOrder(orderData: CreateOrderDto) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 🔹 Step 1: Get or Create User
      const userData = { email: orderData.email, name: orderData.name, phoneNumber: orderData.phoneNumber };
      const user = await this.userService.findOrCreateUser(userData, queryRunner);

      // 🔹 Step 2: Create Addresses
      const { fromAddress, toAddress } = await this.addressService.createAddresses(orderData.fromAddress, orderData.toAddress, queryRunner);

      
      // Add serviceSubcategory
      const serviceSubcategory = await this.serviceSubcategoryService.findServiceSubcategoryByName(orderData.serviceSubcategory, orderData.type,  queryRunner);
      if (!serviceSubcategory) {
          throw new Error(`Service subcategory ${orderData.serviceSubcategory} not found`);
        }
        
      //🔹 Step 3: Calculate total cost
      console.log(serviceSubcategory.baseCost, orderData?.lifters, serviceSubcategory.perLifterCost)
      const totalCost = orderData.lifters ? (orderData.lifters * serviceSubcategory.perLifterCost) : serviceSubcategory.baseCost;
      console.log(totalCost)

      //🔹 Step 4: Create Order using OrderRepository
      const order = queryRunner.manager.create(Order, {
        pickUpDate: orderData.pickUpDate,
        itemType: orderData.itemType,
        itemDescription: orderData.itemDescription ?? null,
        lifters: orderData.lifters ?? 0,   
        user,
        fromAddress,
        toAddress,
        totalCost,
        serviceSubcategory,
        status: OrderStatus.PENDING_PAYMENT,
      });

     await queryRunner.manager.save(order);

     //Step 5: Add Order Status History
     await this.orderStatusHistoryService.createOrderStatusHistory(order, queryRunner);

     //🔹 Step 5: Create Payment
     // await this.paymentService.createPayment(order, totalCost, queryRunner);

     // Commit transaction
     await queryRunner.commitTransaction();
     return order;
    } catch (error) {
      console.log(error.message);
      await queryRunner.rollbackTransaction();
      throw new Error(`${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async getOrdersbyUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ["orders"] });
    console.log(user.orders)
  }
}

