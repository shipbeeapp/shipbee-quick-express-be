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
import { getTripCostBasedOnKg, getTripCostBasedOnKm } from "../utils/trip-cost.js";
import { PaymentMethod } from "../utils/enums/paymentMethod.enum.js";
import {sendOrderConfirmation} from "../services/email.service.js";
import { env } from "../config/environment.js";
import { Between, MoreThan } from "typeorm";
import { scheduleOrderEmission } from "../utils/order.scheduler.js";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";
import { clearNotificationsForOrder } from "../utils/notification-tracker.js";
// import { getDistanceAndDuration } from "../utils/google-maps/distance-time.js"; // Assuming you have a function to get distance and duration
import { Driver } from "../models/driver.model.js";
import { DriverStatus } from "../utils/enums/driverStatus.enum.js";
import { PaymentStatus } from "../utils/enums/paymentStatus.enum.js";
import { sendOtpToUser } from "../services/email.service.js";
import { createMyOrderResource, myOrderResource } from "../resource/drivers/myOrder.resource.js";
import ShipmentService from "./shipment.service.js";
import { ServiceSubcategoryName } from "../utils/enums/serviceSubcategory.enum.js";


@Service()
export default class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private userRepo = AppDataSource.getRepository(User);
  private userService = Container.get(UserService);
  private addressService = Container.get(AddressService);
  private serviceSubcategoryService = Container.get(ServiceSubcategoryService);
  private orderStatusHistoryService = Container.get(OrderStatusHistoryService);
  private shipmentService = Container.get(ShipmentService);
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

      // create shipment if shipment data is provided
      let shipment = null;
      console.log("Shipment data:", orderData.shipment);
      if (orderData.shipment) {
        shipment = await this.shipmentService.createShipment(orderData.shipment, queryRunner);
        console.log("Shipment created:", shipment);
      }
        
      //🔹 Step 3: Calculate total cost
      const totalCost = orderData.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK ? 
                    (orderData.lifters ? (orderData.lifters * serviceSubcategory.perLifterCost) : 
                    getTripCostBasedOnKm(orderData.distance, orderData.vehicleType)) : (orderData.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL ?
                      getTripCostBasedOnKg(orderData.shipment.weight, orderData.fromAddress.country, orderData.toAddress.country) : null
                    )
      
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
        paymentStatus: orderData.paymentStatus ?? PaymentStatus.PENDING, // Default payment status
        paymentMethod: orderData.paymentMethod ?? PaymentMethod.CASH_ON_DELIVERY, // Default payment method
        shipment,
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

       
     //🔹 Step 5: Create Payment
     // await this.paymentService.createPayment(order, totalCost, queryRunner);

     // Commit transaction
     await queryRunner.commitTransaction();
     // Broadcast to online drivers with matching vehicleType
     if (order.serviceSubcategory.name == ServiceSubcategoryName.PERSONAL_QUICK) {
       scheduleOrderEmission(order);
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
    console.log("Orders fetched for user:", orders);
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

  async getOrderDriver(orderId: string) {
    console.log("Fetching driver for order ID:", orderId);
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["driver"],
    });
    if (!order) {
      console.log(`Order with ID ${orderId} not found`);
      return null;
    }
    if (!order.driver) {
      console.log(`No driver assigned for order ID ${orderId}`);
      return null;
    }
    return order.driver;
  }

  async getPendingOrdersWithPickupAfter(date: Date) {
    return this.orderRepository.find({
      where: { 
         status: OrderStatus.PENDING,
         pickUpDate: MoreThan(date),
         serviceSubcategory: { name: ServiceSubcategoryName.PERSONAL_QUICK }
       },
      relations: ["sender", "receiver", "fromAddress", "toAddress"], // add as needed
      order: { createdAt: "DESC" },
    });
  }

  async getPendingOrdersInWindow(vehicleType: VehicleType, startTime: Date, endTime: Date) {
    return this.orderRepository.find({
      where: {
        status: OrderStatus.PENDING,
        vehicleType: vehicleType,
        pickUpDate: Between(startTime, endTime),
        serviceSubcategory: { name: ServiceSubcategoryName.PERSONAL_QUICK }
      },
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

    if (order.status  == OrderStatus.ASSIGNED) {
      throw new Error("Order already assigned to a driver");
    }
    if (order.status == OrderStatus.ACTIVE) {
      throw new Error("Order is already active");
    }
    if (order.status == OrderStatus.COMPLETED) {
      throw new Error("Order is already completed");
    }
    // Update order to assign driver and change status
    order.driver = { id: driverId } as any;
    order.status = OrderStatus.ASSIGNED;

    await queryRunner.manager.save(order);
    // Update driver status to ON_DUTY
    await queryRunner.manager.getRepository(Driver).update(
      { id: driverId },
      { status: DriverStatus.ON_DUTY }
    );
    await queryRunner.commitTransaction();
    clearNotificationsForOrder(order.id); // Clear notifications for this order
    const fullOrder = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: [
        "driver",
        "sender",
        "receiver",
        "serviceSubcategory",
        "fromAddress",
        "toAddress"
      ]
    });
    sendOrderConfirmation(fullOrder, order.totalCost, order.vehicleType, "ship@shipbee.io", 'admin', 'order-status').catch((err) => {
      console.error("Error sending email to admin:", err);
    });
    console.log('sent mail to admin');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}

  async updateProofOfOrder(orderId: string, proofUrl: string) {
    console.log("Updating proof of order for order ID:", orderId, "with URL:", proofUrl);
    proofUrl = proofUrl.split("image/upload/")[1];
    await this.orderRepository.update(orderId, { proofOfOrder: proofUrl });
  }

  async startOrder(orderId: string, driverId: string) {
    try {
      console.log("Starting order for order ID:", orderId, "by driver ID:", driverId);
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ["driver", "sender", "fromAddress", "toAddress", "receiver", "serviceSubcategory"],
      });
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      if (order.driver?.id !== driverId) {
        throw new Error(`Driver with ID ${driverId} is not assigned to this order`);
      }
      if (order.status === OrderStatus.ACTIVE) {
        throw new Error(`Order with ID ${orderId} has already started`);
      }
      if (order.status !== OrderStatus.ASSIGNED) {
        throw new Error(`Order with ID ${orderId} is not in ASSIGNED status`);
      }
      order.status = OrderStatus.ACTIVE;
      await this.orderRepository.update(orderId, { status: OrderStatus.ACTIVE, startedAt: new Date().toISOString() });
      // console.log("Order started at:", order.startedAt);
      // await this.orderRepository.save(order);

      console.log(`Order ${orderId} started successfully by driver ${driverId}`);
      // Reload order with relations
      sendOrderConfirmation(order, order.totalCost, order.vehicleType, "ship@shipbee.io", 'admin', 'order-status').catch((err) => {
        console.error("Error sending email to admin:", err);
      });
      console.log('sent mail to admin');
    } catch (error) {
      console.error("Error starting order:", error.message);
      throw new Error(`Could not start order: ${error.message}`);
    }
} 

async completeOrder(orderId: string, driverId: string, otp: string, proofUrl: string) {
  try {
    console.log("Completing order for order ID:", orderId, "by driver ID:", driverId);
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["driver", "sender", "fromAddress", "toAddress", "receiver", "serviceSubcategory"],
    });
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
    if (order.driver?.id !== driverId) {
      throw new Error(`Driver with ID ${driverId} is not assigned to this order`);
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new Error(`Order with ID ${orderId} has already been completed`);
    }

    if (order.status !== OrderStatus.ACTIVE) {
      throw new Error(`Order with ID ${orderId} is not in ACTIVE status`);
    }
    // if (order.completionOtp !== otp) {
    //   throw new Error(`Invalid OTP for order ${orderId}`);
    // }
    order.status = OrderStatus.COMPLETED;
    order.proofOfOrder = proofUrl.split("image/upload/")[1];
    order.completionOtp = null; // Clear OTP after completion
    order.completedAt = new Date(); // Set the completedAt timestamp as a Date object
    await this.orderRepository.save(order);
    console.log(`Order ${orderId} completed successfully by driver ${driverId}`);
    sendOrderConfirmation(order, order.totalCost, order.vehicleType, "ship@shipbee.io", 'admin', 'order-status').catch((err) => {
        console.error("Error sending email to admin:", err);
      });
    console.log('sent mail to admin');
  } catch (error) {
    console.error("Error completing order:", error.message);
    throw new Error(`Could not complete order: ${error.message}`);
  }
}

  async updateCompletionOtp(orderId: string, otp: string) {
    try {
      console.log("Updating completion OTP for order ID:", orderId, "with OTP:", otp);
      await this.orderRepository.update(orderId, { completionOtp: otp });
      console.log(`Completion OTP updated successfully for order ${orderId}`);
    } catch (error) {
      console.error("Error updating completion OTP:", error.message);
      throw new Error(`Could not update completion OTP: ${error.message}`);
    }
  }

  async sendOtpToReceiver(orderId: string, otp: string) {
    try {
      console.log("Sending OTP to receiver for order ID:", orderId);
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ["receiver"],
      });
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      if (!order.receiver || !order.receiver.phoneNumber) {
        throw new Error(`Receiver for order ${orderId} does not have a phone number`);
      }
      await sendOtpToUser(order.receiver.phoneNumber, otp, '+20');
      console.log(`OTP sent to receiver for order ${orderId}: ${otp}`);
    } catch (error) {
      console.error("Error sending OTP to receiver:", error.message);
      throw new Error(`Could not send OTP to receiver: ${error.message}`);
    }
  }

  async getDriverOrders(driverId: string): Promise<myOrderResource[]> {
        try {
            const orders = await this.orderRepository.find({
                where: { driver: { id: driverId }, status: OrderStatus.COMPLETED },
                relations: ["fromAddress", "toAddress", "sender", "receiver"],
                order: { pickUpDate: "DESC" }
            });
            return orders.map(order => createMyOrderResource(order));
        } catch (error) {
            console.error("Error fetching driver orders:", error);
            throw error;
        }
    }
}