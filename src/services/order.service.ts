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
import { toOrderResponseDto } from "../resource/orders/order.resource.js";
import { getTripCostBasedOnKm } from "../utils/trip-cost.js";
import { PaymentMethod } from "../utils/enums/paymentMethod.enum.js";
import {sendOrderConfirmation} from "../services/email.service.js";
import { env } from "../config/environment.js";
import VehicleService from "./vehicle.service.js";

@Service()
export default class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private userRepo = AppDataSource.getRepository(User);
  private userService = Container.get(UserService);
  private addressService = Container.get(AddressService);
  private serviceSubcategoryService = Container.get(ServiceSubcategoryService);
  private orderStatusHistoryService = Container.get(OrderStatusHistoryService);
  private vehicleService = Container.get(VehicleService);
  // private mailService = Container.get(MailService);  
  
  constructor() {}
  
  async createOrder(orderData: CreateOrderDto) {
    console.log("Creating order with data:", orderData);
    if (!AppDataSource.isInitialized) {
      console.log("wasnt initialized, initializing now...");
      await AppDataSource.initialize();
      console.log("Data Source has been initialized! in OrderService");
    }
    const queryRunner = AppDataSource.createQueryRunner();
    console.log("QueryRunner created:");
    await queryRunner.connect();
    console.log("QueryRunner connected:");  
    await queryRunner.startTransaction();
    console.log("Transaction started:");

    try {
      // 🔹 Step 1: Get or Create Users
      const senderData = {
        email: orderData.senderEmail,
        name: orderData.senderName,
        phoneNumber: orderData.senderPhoneNumber
      };
      
      const receiverData = {
        email: orderData.receiverEmail,
        name: orderData.receiverName,
        phoneNumber: orderData.receiverPhoneNumber
      };
      
      // Create or find both users
      const sender = await this.userService.findOrCreateUser(senderData, queryRunner);
      const receiver = await this.userService.findOrCreateUser(receiverData, queryRunner);

      // 🔹 Step 2: Create Addresses
      const { fromAddress, toAddress } = await this.addressService.createAddresses(orderData.fromAddress, orderData.toAddress, queryRunner);

      
      // Add serviceSubcategory
      const serviceSubcategory = await this.serviceSubcategoryService.findServiceSubcategoryByName(orderData.serviceSubcategory, orderData.type,  queryRunner);
      if (!serviceSubcategory) {
          throw new Error(`Service subcategory ${orderData.serviceSubcategory} not found`);
        }
      let vehicle;
      if (orderData.vehicleId) {
        // If vehicleId is provided, fetch the vehicle and associate it with the order
        vehicle = await this.vehicleService.getVehicleById(orderData.vehicleId, queryRunner);
      }
        
      //🔹 Step 3: Calculate total cost
      const totalCost = orderData.lifters ? (orderData.lifters * serviceSubcategory.perLifterCost) : getTripCostBasedOnKm(orderData.distance, vehicle.type);
      console.log(totalCost)

      //🔹 Step 4: Create Order using OrderRepository
      const order = queryRunner.manager.create(Order, {
        vehicle: orderData.vehicleId ? { id: orderData.vehicleId } : null, // If vehicleId is provided, associate it with the order
        pickUpDate: orderData.pickUpDate,
        itemType: orderData.itemType,
        itemDescription: orderData.itemDescription ?? null,
        lifters: orderData.lifters ?? 0,   
        sender,
        receiver,
        fromAddress,
        toAddress,
        distance: orderData.distance,
        totalCost,
        serviceSubcategory,
        status: OrderStatus.CONFIRMED, // Default status
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY, // Default payment method
      });

     await queryRunner.manager.save(order);

     //Step 5: Add Order Status History
     await this.orderStatusHistoryService.createOrderStatusHistory(order, queryRunner);

     await sendOrderConfirmation(orderData, totalCost, "ship@shipbee.io", 'admin').catch((err) => {
       console.error("Error sending emaill to admin:", err);
      });
     console.log('sent mail to admin: ', env.SMTP.USER);
     if (orderData.senderEmail) {
      await sendOrderConfirmation(orderData, totalCost, orderData.senderEmail).catch((err) => {
        console.error("Error sending email to user:", err);
      }
      );
      console.log('sent mail to user: ', orderData.senderEmail);
     }

     //🔹 Step 5: Create Payment
     // await this.paymentService.createPayment(order, totalCost, queryRunner);

     // Commit transaction
     await queryRunner.commitTransaction();
     return toOrderResponseDto(order);
    } catch (error) {
      console.log(error.message);
      await queryRunner.rollbackTransaction();
      throw new Error(`${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async getOrdersbyUser(userId: string) {
    console.log("Fetching orders for user ID:", userId);
    const orders = await this.orderRepository.find({
      where: {
        sender: { id: userId },
      },
      relations: ["sender", "receiver", "fromAddress", "toAddress", "serviceSubcategory", "orderStatusHistory"],
      order: {
        createdAt: "DESC",
      },
    })
    return orders.map(toOrderResponseDto);
  }

  async getOrders() {
    if (!AppDataSource.isInitialized) {
      console.log("wasnt initialized, initializing now...");
      await AppDataSource.initialize();
      console.log("Data Source has been initialized! in OrderService");
    }
    console.log("Fetching all orders for admin");
    const orders = await this.orderRepository.find({
      relations: ["sender", "receiver", "fromAddress", "toAddress", "serviceSubcategory", "orderStatusHistory"],
      order: {
        createdAt: "DESC",
      },
    });
    return orders.map(toOrderResponseDto);
  }
}

