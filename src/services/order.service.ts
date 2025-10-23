import  { Service, Container } from "typedi";
import UserService  from "./user.service.js";
import { AddressService } from "./address.service.js";
// import { PaymentService } from "./payment.service.js";
import { CreateOrderDto } from "../dto/order/createOrder.dto.js";
import { AppDataSource } from "../config/data-source.js";
import { Order } from "../models/order.model.js";
import ServiceSubcategoryService from "./serviceSubcategory.service.js";
import OrderStatusHistoryService from "./orderStatusHistory.service.js";
import { OrderStatus } from "../utils/enums/orderStatus.enum.js";
import { toOrderResponseDto } from "../resource/orders/order.resource.js";
import { PaymentMethod } from "../utils/enums/paymentMethod.enum.js";
import {sendOrderConfirmation, 
        sendOrderCancellationEmail, 
        sendOrderDetailsViaSms,
        sendArrivalNotification
} from "../services/email.service.js";
import { env } from "../config/environment.js";
import { Between, MoreThan, In } from "typeorm";
import { scheduleOrderEmission } from "../utils/order.scheduler.js";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";
import { clearNotificationsForOrder, resetNotifiedDrivers } from "../utils/notification-tracker.js";
// import { getDistanceAndDuration } from "../utils/google-maps/distance-time.js"; // Assuming you have a function to get distance and duration
import { Driver } from "../models/driver.model.js";
import { DriverStatus } from "../utils/enums/driverStatus.enum.js";
import { PaymentStatus } from "../utils/enums/paymentStatus.enum.js";
import { sendOtpToUser } from "../services/email.service.js";
import { createMyOrderResource, myOrderResource } from "../resource/drivers/myOrder.resource.js";
import ShipmentService from "./shipment.service.js";
import { ServiceSubcategoryName } from "../utils/enums/serviceSubcategory.enum.js";
import PricingService from "./pricing.service.js";
import { validateObject } from "../middlewares/validation.middleware.js";
import { GetPricingDTO } from "../dto/pricing/getPricingDTO.dto.js";
import { generateToken } from "../utils/global.utils.js";
import DriverService from "./driver.service.js";
import { OrderCancellationRequest } from "../models/orderCancellationRequest.model.js";
import { CancelRequestStatus } from "../utils/enums/cancelRequestStatus.enum.js";
import { emitOrderCancellationUpdate, emitOrderToDrivers } from "../socket/socket.js";
import { broadcastDriverStatusUpdate, broadcastOrderUpdate } from "../controllers/user.controller.js";
import PromoCodeService from "./promoCode.service.js";

@Service()
export default class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private userService = Container.get(UserService);
  private addressService = Container.get(AddressService);
  private serviceSubcategoryService = Container.get(ServiceSubcategoryService);
  private orderStatusHistoryService = Container.get(OrderStatusHistoryService);
  private shipmentService = Container.get(ShipmentService);
  private pricingService = Container.get(PricingService);
  private driverService = Container.get(DriverService);
  private orderCancellationRequestRepository = AppDataSource.getRepository(OrderCancellationRequest);
  private promoCodeService = Container.get(PromoCodeService);
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
      const pricingInput = await validateObject(GetPricingDTO, {
        serviceSubcategory: orderData.serviceSubcategory,
        vehicleType: orderData.vehicleType,
        distance: orderData.distance,
        fromCountry: orderData.fromAddress.country,
        toCountry: orderData.toAddress.country,
        weight: orderData.shipment?.weight,
        lifters: orderData.lifters
      });
      const {totalCost: costBeforePromo} = await this.pricingService.calculatePricing(pricingInput);

      console.log("total cost before discount:", costBeforePromo);
      const {totalCost, discount, promoCodeStatus} = await this.promoCodeService.applyPromosToOrder(userId, costBeforePromo);
      console.log("total cost after discount:", totalCost, "discount applied:", discount, "promo code status:", promoCodeStatus);
      const accessToken = generateToken();
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
        accessToken, // Generate a secure access token for the order
      });

     await queryRunner.manager.save(order);

     //Step 5: Add Order Status History
    await this.orderStatusHistoryService.createOrderStatusHistory(order, null, queryRunner);
     orderData.orderNo = order.orderNo;
    //  await sendOrderConfirmation(orderData, totalCost, orderData.vehicleType, env.SMTP.USER, 'admin').catch((err) => {
    //    console.error("Error sending emaill to admin:", err);
    //   });
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
     if (env.SEND_SMS) {
       sendOrderDetailsViaSms(order.id, orderData.senderPhoneNumber, orderData.receiverPhoneNumber, accessToken);
     }
     // Broadcast to online drivers with matching vehicleType
     if (order.serviceSubcategory.name == ServiceSubcategoryName.PERSONAL_QUICK) {
       scheduleOrderEmission(order);
     }
     broadcastOrderUpdate(order.id, order.status); // Notify all connected clients about the new order
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
      relations: ["sender", "receiver", "fromAddress", "toAddress", "serviceSubcategory", "orderStatusHistory", "shipment", 
      "cancellationRequests", "cancellationRequests.driver", "driver", "driver.vehicle"
      ],
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
      relations: ["sender", "receiver", "fromAddress", "toAddress", "serviceSubcategory", "orderStatusHistory", "driver", "driver.vehicle", "shipment", "cancellationRequests", "cancellationRequests.driver"],
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
      await this.orderStatusHistoryService.createOrderStatusHistory(updatedOrder, null, queryRunner);

      // Commit transaction
      await queryRunner.commitTransaction();
      broadcastOrderUpdate(order.id, order.status); // Notify all connected clients about the order status update
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

  async getOrderDetails(orderId: string, accessToken?: string): Promise<any> {
    console.log("Fetching order details for order ID:", orderId);
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["sender", "receiver", "fromAddress", "toAddress", "serviceSubcategory", "orderStatusHistory", "shipment"],
    });
    if (!order) {
      console.log(`Order with ID ${orderId} not found`);
      return null;
    }
    if (accessToken && order.accessToken !== accessToken) {
      return {
        error: "Invalid access token",
        status: 403
      };
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
    // Add to order status history
    await this.orderStatusHistoryService.createOrderStatusHistory(order, null, queryRunner);

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
    sendOrderConfirmation(fullOrder, order.totalCost, order.vehicleType, env.SMTP.USER, 'admin', 'order-status').catch((err) => {
      console.error("Error sending email to admin:", err);
    });
    console.log('sent mail to admin');
    broadcastOrderUpdate(order.id, order.status); // Notify all connected clients about the order status update
    broadcastDriverStatusUpdate(driverId, DriverStatus.ON_DUTY); // Notify all connected clients about the driver status update
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
       // Add to order status history
      await this.orderStatusHistoryService.createOrderStatusHistory(order);

      console.log(`Order ${orderId} started successfully by driver ${driverId}`);
      // Reload order with relations
      sendOrderConfirmation(order, order.totalCost, order.vehicleType, env.SMTP.USER, 'admin', 'order-status').catch((err) => {
        console.error("Error sending email to admin:", err);
      });
      console.log('sent mail to admin');
      broadcastOrderUpdate(order.id, order.status); // Notify all connected clients about the order status update
    } catch (error) {
      console.error("Error starting order:", error.message);
      throw new Error(`Could not start order: ${error.message}`);
    }
} 

async completeOrder(orderId: string, driverId: string, proofUrl: string) {
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
    // order.completionOtp = null; // Clear OTP after completion
    order.completedAt = new Date(); // Set the completedAt timestamp as a Date object
    await this.orderRepository.save(order);
    await this.orderStatusHistoryService.createOrderStatusHistory(order);
    console.log(`Order ${orderId} completed successfully by driver ${driverId}`);
    sendOrderConfirmation(order, order.totalCost, order.vehicleType, env.SMTP.USER, 'admin', 'order-status').catch((err) => {
        console.error("Error sending email to admin:", err);
      });
    console.log('sent mail to admin');
    broadcastOrderUpdate(order.id, order.status); // Notify all connected clients about the order status update
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
      await sendOtpToUser(order.receiver.phoneNumber, otp, '+974');
      console.log(`OTP sent to receiver for order ${orderId}: ${otp}`);
    } catch (error) {
      console.error("Error sending OTP to receiver:", error.message);
      throw new Error(`Could not send OTP to receiver: ${error.message}`);
    }
  }

  async getDriverOrders(driverId: string): Promise<myOrderResource[]> {
        try {
            const orders = await this.orderRepository.find({
                where: { 
                  driver: { id: driverId }, 
                  status: In([
                    OrderStatus.COMPLETED,
                    OrderStatus.CANCELED,
                    OrderStatus.ASSIGNED,
                    OrderStatus.ACTIVE,
                  ]), 
                },
                relations: ["fromAddress", "toAddress", "sender", "receiver"],
                order: { pickUpDate: "DESC" }
            });
            return orders.map(order => createMyOrderResource(order));
        } catch (error) {
            console.error("Error fetching driver orders:", error);
            throw error;
        }
    }

    async requestOrderCancellation(driverId: string, orderId: string, reason: string) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ["driver"],
        });
        if (!order) {
            throw new Error(`Order with ID ${orderId} not found`);
        }
        if (order.driver?.id !== driverId) {
            throw new Error(`Driver with ID ${driverId} is not assigned to this order`);
        }

        if (order.status !== OrderStatus.ASSIGNED && order.status !== OrderStatus.ACTIVE) {
            throw new Error(`Order with ID ${orderId} is not assigned or active`);
        }
        
        const existingRequest = await this.orderCancellationRequestRepository.findOne({
            where: { order: { id: orderId }, driver: { id: driverId }, status: CancelRequestStatus.PENDING }
        });

        if (existingRequest) {
            throw new Error(`Cancellation request already exists for order ${orderId}`);
        }

        // Case 1️⃣: ASSIGNED — auto reassign, but store cancellation history
        if (order.status === OrderStatus.ASSIGNED) {
          console.log(`Order ${orderId} is ASSIGNED — driver ${driverId} canceled. Creating auto-approved record.`);
        
          // 1. Create auto-approved cancellation request
          const cancellationRequest = this.orderCancellationRequestRepository.create({
            order: { id: orderId } as any,
            driver: { id: driverId } as any,
            status: CancelRequestStatus.APPROVED, // auto approved
            reason,
          });
          await this.orderCancellationRequestRepository.save(cancellationRequest);
        
          // 2. Unassign order and reset to pending
          order.status = OrderStatus.PENDING;
          order.driver = null;
          await this.orderRepository.save(order);
        
          // 3. Broadcast updates
          await this.orderStatusHistoryService.createOrderStatusHistory(order, reason);
          resetNotifiedDrivers(order.id);
          await emitOrderToDrivers(order);
          broadcastOrderUpdate(order.id, order.status);
        
          return cancellationRequest.id;
        }

        const cancellationRequest = this.orderCancellationRequestRepository.create({
            order: { id: orderId } as any,
            driver: { id: driverId } as any,
            status: CancelRequestStatus.PENDING,
            reason: reason
        });

        const cancelRequest = await this.orderCancellationRequestRepository.save(cancellationRequest);
        console.log(`Order cancellation requested for order ${orderId} by driver ${driverId}`);
        broadcastOrderUpdate(order.id, order.status, "order-cancel-request", cancelRequest.id); // Notify all connected clients about the order status update
        sendOrderCancellationEmail(order.orderNo, order.driver?.name, order.driver?.phoneNumber).catch((err) => {
            console.error('Error sending order cancellation email:', err);
        });
        return cancelRequest.id;
    }

    async processOrderCancellation(cancelRequestId: string, action: string) {
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

        try {
            const cancellationRequest = await queryRunner.manager.findOne(OrderCancellationRequest, {
                where: { id: cancelRequestId,  },
                relations: ["order", "driver", "order.driver", "order.sender", "order.receiver", "order.fromAddress", "order.toAddress", "order.serviceSubcategory", "order.shipment"]
            });
            if (!cancellationRequest) {
                throw new Error(`Cancellation request with ID ${cancelRequestId} not found`);
            }
            if (cancellationRequest.status == CancelRequestStatus.APPROVED) {
                throw new Error(`Cancellation request with ID ${cancelRequestId} has already been approved`);
            }
            if (cancellationRequest.status == CancelRequestStatus.DECLINED) {
                throw new Error(`Cancellation request with ID ${cancelRequestId} has already been declined`);
            }
            if (action === "APPROVE") {
                // Approve the cancellation
                cancellationRequest.status = CancelRequestStatus.APPROVED;
                await queryRunner.manager.save(cancellationRequest);
                const order = cancellationRequest.order;
                order.status = OrderStatus.PENDING;
                order.driver = null;
                await queryRunner.manager.save(order);
                await this.orderStatusHistoryService.createOrderStatusHistory(order, null, queryRunner);
                resetNotifiedDrivers(order.id);
                await emitOrderToDrivers(order);
                broadcastOrderUpdate(order.id, order.status); // Notify all connected clients about the order status update
            } else if (action === "DECLINE") {
                // Decline the cancellation
                cancellationRequest.status = CancelRequestStatus.DECLINED;
                await queryRunner.manager.save(cancellationRequest);
              } else {
                throw new Error(`Invalid action: ${action}`);
              }
            await queryRunner.commitTransaction();
            emitOrderCancellationUpdate(cancellationRequest.driver.id, cancellationRequest.order.id, cancellationRequest.status);
            console.log(`Order cancellation request ${cancelRequestId} processed with action: ${action}`);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error("Error processing order cancellation:", error.message);
            throw new Error(`Could not process order cancellation: ${error.message}`);
        }
        finally {
            await queryRunner.release();  
      }
    }
    async notifySender(orderId: string, driverId: string) {
      try {
        const order = await this.orderRepository.findOne({
          where: { id: orderId },
          relations: ["driver", "sender"],
        });
        if (!order) {
          throw new Error(`Order with ID ${orderId} not found`);
        }
        if (order.driver?.id !== driverId) {
          throw new Error(`Driver with ID ${driverId} is not assigned to this order`);
        }
        if (!order.sender) {
          throw new Error(`Sender for order ${orderId} does not exist`);
        }
        await sendArrivalNotification(order.sender.phoneNumber, order.sender.email, order.orderNo, order.driver.name, order.driver.phoneNumber);
        console.log(`Arrival notification sent to sender for order ${orderId}`);
      } catch (error) {
        console.error("Error sending arrival notification to sender:", error.message);
        throw new Error(`Could not send arrival notification to sender: ${error.message}`);
      }
    }

    async notifyReceiver(orderId: string, driverId: string) {
      try {
        const order = await this.orderRepository.findOne({
          where: { id: orderId },
          relations: ["driver", "receiver"],
        });
        if (!order) {
          throw new Error(`Order with ID ${orderId} not found`);
        }
        if (order.driver?.id !== driverId) {
          throw new Error(`Driver with ID ${driverId} is not assigned to this order`);
        }
        if (!order.receiver) {
          throw new Error(`Receiver for order ${orderId} does not have a phone number`);
        }
        await sendArrivalNotification(order.receiver.phoneNumber, order.receiver.email, order.orderNo, order.driver.name, order.driver.phoneNumber);
        console.log(`Arrival notification sent to receiver for order ${orderId}`);
      } catch (error) {
        console.error("Error sending arrival notification to sender:", error.message);
        throw new Error(`Could not send arrival notification to sender: ${error.message}`);
      }
    }

    async saveOrder(order: Order) {
      return this.orderRepository.save(order);
    }
  }
