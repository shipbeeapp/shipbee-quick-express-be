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
import { getSocketInstance, getOnlineDrivers } from "../socket/socket.js";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";
import { createDriverOrderResource } from "../resource/drivers/driverOrder.resource.js";
// import { getDistanceAndDuration } from "../utils/google-maps/distance-time.js"; // Assuming you have a function to get distance and duration


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
  
  async createOrder(orderData: CreateOrderDto, userId?: string) {
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
      let sender;
      if (userId) {
        sender = await this.userService.getUserById(userId);
        if (!sender) {
          throw new Error(`Sender with ID ${userId} not found`);
        }
        orderData.senderName = sender.name;
        orderData.senderEmail = sender.email;
        orderData.senderPhoneNumber = sender.phoneNumber;
      }
      else {
      const senderData = {
        email: orderData.senderEmail,
        name: orderData.senderName,
        phoneNumber: orderData.senderPhoneNumber
      };
      sender = await this.userService.findOrCreateUser(senderData, queryRunner);
    }
      const receiverData = {
        email: orderData.receiverEmail,
        name: orderData.receiverName,
        phoneNumber: orderData.receiverPhoneNumber
      };
      
      // Create or find both users
      const receiver = await this.userService.findOrCreateUser(receiverData, queryRunner);

      // 🔹 Step 2: Create Addresses
      const { fromAddress, toAddress } = await this.addressService.createAddresses(orderData.fromAddress, orderData.toAddress, queryRunner);

      
      // Add serviceSubcategory
      const serviceSubcategory = await this.serviceSubcategoryService.findServiceSubcategoryByName(orderData.serviceSubcategory, orderData.type,  queryRunner);
      if (!serviceSubcategory) {
          throw new Error(`Service subcategory ${orderData.serviceSubcategory} not found`);
        }
        
      //🔹 Step 3: Calculate total cost
      const totalCost = orderData.lifters ? (orderData.lifters * serviceSubcategory.perLifterCost) : getTripCostBasedOnKm(orderData.distance, orderData.vehicleType);
      console.log(totalCost)

      //🔹 Step 4: Create Order using OrderRepository
      const order = queryRunner.manager.create(Order, {
        vehicle: orderData.vehicleId ? { id: orderData.vehicleId } : null, // If vehicleId is provided, associate it with the order
        pickUpDate: orderData.pickUpDate,
        itemType: orderData.itemType,
        itemDescription: orderData.itemDescription ?? null,
        lifters: orderData.lifters ?? 0,   
        vehicleType: orderData.vehicleType,
        sender,
        receiver,
        fromAddress,
        toAddress,
        distance: orderData.distance,
        totalCost,
        serviceSubcategory,
        status: OrderStatus.PENDING, // Default status
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY, // Default payment method
      });

     await queryRunner.manager.save(order);

     //Step 5: Add Order Status History
     await this.orderStatusHistoryService.createOrderStatusHistory(order, queryRunner);

     await sendOrderConfirmation(orderData, totalCost, orderData.vehicleType, "ship@shipbee.io", 'admin').catch((err) => {
       console.error("Error sending emaill to admin:", err);
      });
     console.log('sent mail to admin: ', env.SMTP.USER);
     if (orderData.senderEmail) {
      await sendOrderConfirmation(orderData, totalCost, orderData.vehicleType, orderData.senderEmail).catch((err) => {
        console.error("Error sending email to user:", err);
      }
      );
      console.log('sent mail to user: ', orderData.senderEmail);
     }

     const io = getSocketInstance();
     const onlineDrivers = getOnlineDrivers();
       
     //🔹 Step 5: Create Payment
     // await this.paymentService.createPayment(order, totalCost, queryRunner);

     // Commit transaction
     await queryRunner.commitTransaction();
     // Broadcast to online drivers with matching vehicleType
     for (const [driverId, { socketId, vehicleType }] of onlineDrivers.entries()) {
       if (vehicleType === orderData.vehicleType) {
          console.log(`🚚 Sending order to driver ${driverId} with socket ID ${socketId}`);
          // const { distanceKm, durationMin } = await getDistanceAndDuration(currentLocation, order.fromAddress.city);
         io.to(socketId).emit("new-order", createDriverOrderResource(order));
         console.log(`🚚 Sent order to driver ${driverId}`);
       }
     }
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
    try {
    console.log("Fetching orders for user ID:", userId);
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
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
  } catch (error) {
    console.error("Error fetching orders for user:", error.message);
    throw new Error(`Could not fetch orders for user: ${error.message}`);
  }
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

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    console.log("Updating order status for order ID:", orderId, "to status:", status);
    // Create a QueryRunner from the DataSource
    const queryRunner = AppDataSource.createQueryRunner();

    // Establish real database connection using our queryRunner
    await queryRunner.connect();

    // Start a new transaction
    await queryRunner.startTransaction();
    try {
      const orderRepository = queryRunner.manager.getRepository(Order);
      const order = await orderRepository.findOne({
        where: { id: orderId },
        relations: ["orderStatusHistory"],
      });

      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      // Update the order status
      order.status = status;
      const updatedOrder = await orderRepository.save(order);

      // Add a new entry to the order status history
      await this.orderStatusHistoryService.createOrderStatusHistory(updatedOrder, queryRunner);

      // Commit transaction
      await queryRunner.commitTransaction();
      console.log("Order status updated successfully");
    } catch (error) {
      console.error("Error updating order status:", error.message);
      // Rollback transaction in case of error
      await queryRunner.rollbackTransaction();
      throw new Error(`${error.message}`);
    }
    finally {
      // Release the queryRunner which is manually created
      await queryRunner.release();
    }
  }

  async getOrderDetails(orderId: string) {
    console.log("Fetching order details for order ID:", orderId);
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["sender", "receiver", "fromAddress", "toAddress", "serviceSubcategory", "orderStatusHistory"],
    });
    if (!order) {
      console.log(`Order with ID ${orderId} not found`);
      return null;
    }
    return toOrderResponseDto(order);
  }

  async getPendingOrdersForVehicleType(vehicleType: VehicleType) {
    console.log("Fetching pending orders for vehicle type:", vehicleType);
    return this.orderRepository.find({
      where: { status: OrderStatus.PENDING, vehicleType },
      relations: ["sender", "receiver", "fromAddress", "toAddress"], // add as needed
      order: { createdAt: "DESC" },
    });
  }

  async acceptOrder(orderId: string, driverId: string) {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Lock the order row to prevent race condition
    const order = await queryRunner.manager
      .getRepository(Order)
      .createQueryBuilder("order")
      .setLock("pessimistic_write")
      .where("order.id = :orderId", { orderId })
      .getOne();

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new Error("Order already accepted");
    }

    // Update order to assign driver and change status
    order.driver = { id: driverId } as any;
    order.status = OrderStatus.ASSIGNED;

    await queryRunner.manager.save(order);
    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}

}

