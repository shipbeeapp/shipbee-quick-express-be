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
        sendArrivalNotification,
        formatAddressSingleLine
} from "../services/email.service.js";
import { env } from "../config/environment.js";
import { Between, MoreThan, In, Not } from "typeorm";
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
import { generatePhotoLink, generateToken } from "../utils/global.utils.js";
import DriverService from "./driver.service.js";
import { OrderCancellationRequest } from "../models/orderCancellationRequest.model.js";
import { CancelRequestStatus } from "../utils/enums/cancelRequestStatus.enum.js";
import { emitOrderAccepted, emitOrderCancellationUpdate, emitOrderCompletionUpdate, emitOrderToDrivers, getCurrentLocationOfDriver } from "../socket/socket.js";
import { broadcastDriverStatusUpdate, broadcastOrderUpdate } from "../controllers/user.controller.js";
import PromoCodeService from "./promoCode.service.js";
import { User } from "../models/user.model.js";
import { OrderStop } from "../models/orderStops.model.js";
import { OrderType } from "../utils/enums/orderType.enum.js";
import axios from "axios";
import { getCountryIsoCode } from "../utils/dhl.utils.js";
import {formatAddress}  from "../services/email.service.js";
import { CountryCode, getCountryCallingCode } from 'libphonenumber-js';
import { externalTrackingSocket } from "../socket/external-tracking-socket.js";
import { createDriverOrderResource } from "../resource/drivers/driverOrder.resource.js";

interface AnsarOrderInfo {
  orderNo: number;
  status: OrderStatus;
}

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
  private orderStopRepository = AppDataSource.getRepository(OrderStop);
  private ansarOrders: Map<string, AnsarOrderInfo> = new Map();
  // private mailService = Container.get(MailService);  

  constructor() {}
  
  async createOrder(orderData: CreateOrderDto, userId?: string, madeByClient: boolean = false, isSandbox: boolean = false): Promise<any> {
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
      let createdByUser: User;
      let sender: User;
      const senderData = {
        email: orderData.senderEmail,
        name: orderData.senderName,
        phoneNumber: orderData.senderPhoneNumber
      };
      if (userId) {
        createdByUser = await this.userService.getUserById(userId);
        if (!createdByUser) {
          throw new Error(`No signed in user with ID ${userId} not found`);
        }
        sender = await this.userService.findOrCreateUser(senderData, queryRunner); 
      }
      else {
        sender = await this.userService.findOrCreateUser(senderData, queryRunner);
        createdByUser = sender;
    }
      // const receiverData = {
      //   email: orderData.receiverEmail,
      //   name: orderData.receiverName,
      //   phoneNumber: orderData.receiverPhoneNumber
      // };
      
      // // Create or find both users
      // const receiver = await this.userService.findOrCreateUser(receiverData, queryRunner);

      // 🔹 Step 2: Create Addresses
      const fromAddress  = await this.addressService.createAddress(orderData.fromAddress, queryRunner);

      
      // Add serviceSubcategory
      const serviceSubcategory = await this.serviceSubcategoryService.findServiceSubcategoryByName(orderData.serviceSubcategory, null, queryRunner);
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
      console.log("orderData.shipment:", orderData.shipment);
        
      //🔹 Step 3: Calculate total cost
      let total;
      if (!madeByClient) {
        const pricingInput = await validateObject(GetPricingDTO, {
          serviceSubcategory: orderData.serviceSubcategory,
          vehicleType: orderData.vehicleType,
          distance: orderData.distance,
          fromCountry: orderData.fromAddress.country,
          fromCity: orderData.fromAddress.city,
          toCountry: orderData.stops[0]?.toAddress?.country,
          toCity: orderData.stops[0]?.toAddress?.city,
          weight: orderData.shipment?.weight,
          length: orderData.shipment?.length,
          width: orderData.shipment?.width,
          height: orderData.shipment?.height,
          plannedShippingDate: orderData.shipment?.plannedShippingDateAndTime, // extract date in YYYY-MM-DD format
          shippingCompany: orderData.shipment ? orderData.shipment?.shippingCompany : null,
          lifters: orderData.stops.reduce((total, stop) => total + (stop.lifters || 0), 0)
        });
        const {totalCost: costBeforePromo} = await this.pricingService.calculatePricing(pricingInput);

        console.log("total cost before discount:", costBeforePromo);
        const {totalCost, discount, promoCodeStatus} = await this.promoCodeService.applyPromosToOrder(userId, costBeforePromo);
        total = totalCost;
        console.log("total cost after discount:", totalCost, "discount applied:", discount, "promo code status:", promoCodeStatus);
      }
      const accessToken = generateToken();
      //🔹 Step 4: Create Order using OrderRepository
      const order = queryRunner.manager.create(Order, {
        vehicle: orderData.vehicleId ? { id: orderData.vehicleId } : null, // If vehicleId is provided, associate it with the order
        pickUpDate: orderData.pickUpDate,
        // itemType: orderData.itemType,
        // itemDescription: orderData.itemDescription ?? null,
        // lifters: orderData.lifters ?? 0,   
        vehicleType: orderData.vehicleType,
        createdBy: createdByUser,
        sender,
        fromAddress,
        distance: orderData.distance,
        totalCost: total,
        serviceSubcategory,
        status: OrderStatus.PENDING, // Default status
        paymentStatus: orderData.paymentStatus ?? PaymentStatus.PENDING, // Default payment status
        paymentMethod: orderData.paymentMethod ?? PaymentMethod.CASH_ON_DELIVERY, // Default payment method
        shipment,
        accessToken, // Generate a secure access token for the order
        payer: orderData.payer,
        type: orderData.type
      });

    await queryRunner.manager.save(order);
    if (madeByClient) {
      this.addAnsarOrder(order.id, order.orderNo, order.status)
    }

    // 🔹 Step 4: Create multiple stops
    if (orderData.serviceSubcategory === ServiceSubcategoryName.PERSONAL_QUICK && (!orderData.stops || orderData.stops.length === 0)) {
      throw new Error("At least one stop is required for multi-stop order");
    }
    
    let stopEntities: OrderStop[] = [];
    if (orderData.serviceSubcategory === ServiceSubcategoryName.INTERNATIONAL) {
      orderData.stops = [{
        toAddress: orderData.stops[0].toAddress,
        receiverEmail: orderData.stops[0].receiverEmail,
        receiverName: orderData.stops[0].receiverName,
        receiverPhoneNumber: orderData.stops[0].receiverPhoneNumber,
        itemType: orderData.stops[0].itemType,
        distance: 0,
        sequence: 1
    }
    ];

    if (orderData.shipment.shippingCompany === 'DHL') {
      const dhlTrackingNumber = await this.createDHLShipment(orderData)
      console.log("tracking number:", dhlTrackingNumber);
      order.shipment.trackingNumber = dhlTrackingNumber;
      await queryRunner.manager.save(order.shipment);
    }
  }

     for (const [index, stopData] of orderData.stops.entries()) {
      console.log("Creating stop:", stopData);
      const receiver = await this.userService.findOrCreateUser({email: stopData.receiverEmail, phoneNumber: stopData.receiverPhoneNumber, name: stopData.receiverName}, queryRunner);
      const toAddress = await this.addressService.createAddress(stopData.toAddress, queryRunner);

      if (typeof stopData.items === 'string') {
        stopData.items = JSON.parse(stopData.items);
      }
      const stop = queryRunner.manager.create(OrderStop, {
        order,
        receiver,
        toAddress,
        itemDescription: stopData.itemDescription ?? null,
        itemType: stopData.itemType,
        distance: stopData.distance,
        sequence: stopData.sequence ?? index + 1,
        lifters: stopData.lifters ?? 0,
        clientStopId: stopData.clientStopId ?? null,
        items: stopData.items,
        totalPrice: stopData.totalPrice ?? null,
        paymentMethod: stopData.paymentMethod,
        comments: stopData.comments ?? null,
        deliveryFee: stopData.deliveryFee ?? null
      });

      stopEntities.push(stop);
    }

    await queryRunner.manager.save(stopEntities);
     //Step 5: Add Order Status History
    await this.orderStatusHistoryService.createOrderStatusHistory(order, null, queryRunner);
     orderData.orderNo = order.orderNo;
     let recipientAdminMail;
     if (order.serviceSubcategory.name == ServiceSubcategoryName.PERSONAL_QUICK) recipientAdminMail = env.SMTP.USER;
     else recipientAdminMail = env.EXPRESS_ADMIN_EMAIL;
     await sendOrderConfirmation(orderData, total, orderData.vehicleType, recipientAdminMail, 'admin').catch((err) => {
       console.error("Error sending emaill to admin:", err);
      });
     console.log('sent mail to admin: ', recipientAdminMail);
     if (createdByUser.email) {
      await sendOrderConfirmation(orderData, total, orderData.vehicleType, createdByUser.email).catch((err) => {
        console.error("Error sending email to user:", err);
      }
      );
      console.log('sent mail to user: ', createdByUser.email);
     }

    
     //🔹 Step 5: Create Payment
     // await this.paymentService.createPayment(order, totalCost, queryRunner);
     // Commit transaction
     await queryRunner.commitTransaction();
    //  if (env.SEND_SMS) {
    //    sendOrderDetailsViaSms(order.id, orderData.senderPhoneNumber, orderData.receiverPhoneNumber, accessToken);
    //  }
     // Broadcast to online drivers with matching vehicleType
     order.stops = stopEntities;
     if (order.serviceSubcategory.name == ServiceSubcategoryName.PERSONAL_QUICK && !isSandbox) {
      console.log("Emitting order to drivers for order ID:", order.id);
       scheduleOrderEmission(order);
     }
     broadcastOrderUpdate(order.id, order.status); // Notify all connected clients about the new order
     return await toOrderResponseDto(order);
    } catch (error) {
      console.log(error.message);
      await queryRunner.rollbackTransaction();
      throw new Error(`${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async getOrdersbyUser(userId: string, serviceType?: string) {
    try {
    console.log("Fetching orders for user ID:", userId);
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    const orders = await this.orderRepository.find({
      where: {
        createdBy: { id: userId },
        serviceSubcategory: serviceType ? { name: In([serviceType]) } : undefined
      },
      relations: [
        "sender", "fromAddress", "serviceSubcategory", 
        "orderStatusHistory", "shipment", 
        "cancellationRequests", "cancellationRequests.driver", "driver", "driver.vehicle",
        "stops", "stops.receiver", "stops.toAddress"
      ],
      order: {
        createdAt: "DESC",
      },
    })
     return await Promise.all(
      orders.map(order => toOrderResponseDto(order))
    );
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
      relations: [
          "sender", "fromAddress", "serviceSubcategory", "orderStatusHistory", 
          "driver", "driver.vehicle", "shipment", 
          "cancellationRequests", "cancellationRequests.driver",
          "stops", "stops.receiver", "stops.toAddress", 
      ],
      order: {
        createdAt: "DESC",
      },
    });
     return await Promise.all(
      orders.map(order => toOrderResponseDto(order))
    );
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
        relations: ["orderStatusHistory", "driver"],
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
      if (status === OrderStatus.CANCELED) {
        emitOrderCancellationUpdate(order.driver.id, order.id, CancelRequestStatus.APPROVED);
        if (order.driver.id) await this.driverService.updateDriverStatus(order.driver.id, DriverStatus.ACTIVE)
      }

      else if (status === OrderStatus.COMPLETED) {
        emitOrderCompletionUpdate(order.driver.id, order.id);
        await this.driverService.updateDriverStatus(order.driver.id, DriverStatus.ACTIVE)
      }
    
      this.updateAnsarOrderStatus(order.id, status)
      if (this.isAnsarOrder(order.id)) {
        const driverCurrentLocation = getCurrentLocationOfDriver(order.driver?.id)
        const [latStr, lngStr] = driverCurrentLocation?.split(",");
        const latitude = parseFloat(latStr);
        const longitude = parseFloat(lngStr);
        externalTrackingSocket.send({
              route: "shipbeeUpdate",
              payload: {
                id: order.orderNo,
                status: order.status,
                latitude,
                longitude
              }
            })
      }
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
      relations: ["sender", "fromAddress", "serviceSubcategory", "orderStatusHistory", "shipment", 
            "stops", "stops.toAddress", "stops.receiver", "driver", "driver.vehicle", "createdBy"
      ],
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
    return await toOrderResponseDto(order);
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
      relations: ["sender", "fromAddress", "stops", "stops.receiver", "stops.toAddress"], // add as needed
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
      relations: ["sender", "fromAddress", "stops", "stops.receiver", "stops.toAddress"], // add as needed
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
      { status: DriverStatus.BUSY }
    );
    // Add to order status history
    await this.orderStatusHistoryService.createOrderStatusHistory(order, null, queryRunner);

    await queryRunner.commitTransaction();

    emitOrderAccepted(orderId, driverId); // Notify other drivers that the order has been accepted

    clearNotificationsForOrder(order.id); // Clear notifications for this order
    const fullOrder = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: [
        "driver",
        "sender",
        "serviceSubcategory",
        "fromAddress",
        "stops",
        "stops.toAddress",
        "stops.receiver"
      ]
    });
    sendOrderConfirmation(fullOrder, order.totalCost, order.vehicleType, env.SMTP.USER, 'admin', 'order-status').catch((err) => {
      console.error("Error sending email to admin:", err);
    });
    console.log('sent mail to admin');
    broadcastOrderUpdate(order.id, order.status); // Notify all connected clients about the order status update
    broadcastDriverStatusUpdate(driverId, DriverStatus.BUSY); // Notify all connected clients about the driver status update
    this.updateAnsarOrderStatus(order.id, OrderStatus.ASSIGNED)
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

  async startOrder(orderId: string, driverId: string, stopId?: string, isPickup?: boolean) {
    try {
      let stopNumber;
      console.log("Starting order for order ID:", orderId, "by driver ID:", driverId);
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ["driver", "sender", "fromAddress", "serviceSubcategory",
          "stops", "stops.toAddress", "stops.receiver"
        ],
      });
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      if (order.driver?.id !== driverId) {
        throw new Error(`Driver with ID ${driverId} is not assigned to this order`);
      }

      if (isPickup) {
        if (order.status !== OrderStatus.ASSIGNED) throw new Error(`Order ${orderId} not ready for pickup`);

        await this.orderRepository.update(orderId, { status: OrderStatus.EN_ROUTE_TO_PICKUP, startedAt: new Date().toISOString() });
        // Add to order status history
        order.status = OrderStatus.EN_ROUTE_TO_PICKUP;
        await this.orderStatusHistoryService.createOrderStatusHistory(order);
        console.log(`Driver ${driverId} going to pickup address for order ${orderId}`);
        // Reload order with relations
        console.log('sent mail to admin');
        broadcastOrderUpdate(order.id, order.status); // Notify all connected clients about the order status update
        this.updateAnsarOrderStatus(order.id, OrderStatus.EN_ROUTE_TO_PICKUP);
      }
      
      else {
        
        if (order.status !== OrderStatus.EN_ROUTE_TO_PICKUP && order.type == OrderType.SINGLE_STOP) {
          throw new Error(`Order with ID ${orderId} is not ready to start`);
        }
        const currentStop = order.stops.find(stop => stop.id === stopId);
        if (!currentStop) throw new Error(`Stop with ID ${stopId} not found for order ${orderId}`);
        
        if (currentStop.status === OrderStatus.COMPLETED)
          throw new Error(`Stop ${stopId} already completed`);
        if (currentStop.status === OrderStatus.ACTIVE)
          throw new Error(`Stop ${stopId} is already active`);

        // Multi-stop: ensure no other stop is active
        if (order.type === OrderType.MULTI_STOP) {
          const activeStop = order.stops.find(s => s.status === OrderStatus.ACTIVE);
          if (activeStop) throw new Error(`Stop ${activeStop.sequence} is still active. Cannot start another stop.`);
        }
        
        currentStop.status = OrderStatus.ACTIVE;
        await this.orderStopRepository.save(currentStop);
        // Add to order status history
        order.status = OrderStatus.ACTIVE;
        await this.orderRepository.save(order);
        await this.orderStatusHistoryService.createOrderStatusHistory(order);
        stopNumber = currentStop.sequence;
        console.log(`Order ${orderId} by driver ${driverId} is going to stop #${currentStop.sequence}`);
        broadcastOrderUpdate(order.id, order.status, currentStop.sequence); // Notify all connected clients about the order status update
        this.updateAnsarOrderStatus(order.id, OrderStatus.ACTIVE)
      }
      sendOrderConfirmation(order, order.totalCost, order.vehicleType, env.SMTP.USER, 'admin', 'order-status', isPickup ? "pickup": stopNumber.toString()).catch((err) => {
        console.error("Error sending email to admin:", err);
      });
    } catch (error) {
      console.error("Error starting order:", error.message);
      throw new Error(`Could not start order: ${error.message}`);
    }
} 

async completeOrder(orderId: string, driverId: string, stopId: string, proofUrl: string) {
  try {
    console.log("Completing order for order ID:", orderId, "by driver ID:", driverId);
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["driver", "sender", "fromAddress", "serviceSubcategory",
        "stops", "stops.toAddress", "stops.receiver"
      ],
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

    // Find the stop being completed
    const stop = order.stops.find((s) => s.id === stopId);
    if (!stop) throw new Error(`Stop ${stopId} not found in order ${orderId}`);
    if (stop.status === OrderStatus.COMPLETED)
      throw new Error(`Stop ${stopId} is already completed`);

    stop.status = OrderStatus.COMPLETED;
    stop.deliveredAt = new Date();
    stop.proofOfOrder = proofUrl.split("image/upload/")[1];
    await this.orderStopRepository.save(stop);

    // Check if all stops are completed
    const allCompleted = order.stops.every((s) => s.status === OrderStatus.COMPLETED);
    if (allCompleted) {
      order.status = OrderStatus.COMPLETED;
      order.completedAt = new Date(); // Set the completedAt timestamp as a Date object
      order.driver.status = DriverStatus.ACTIVE;
      await this.orderRepository.save(order);
      await this.orderStatusHistoryService.createOrderStatusHistory(order);
      console.log(`Order ${orderId} completed successfully by driver ${driverId}`);
      sendOrderConfirmation(order, order.totalCost, order.vehicleType, env.SMTP.USER, 'admin', 'order-status').catch((err) => {
          console.error("Error sending email to admin:", err);
        });
      console.log('sent mail to admin');
      broadcastOrderUpdate(order.id, order.status); // Notify all connected clients about the order status update
      broadcastDriverStatusUpdate(order.driver.id, DriverStatus.ACTIVE)
      this.updateAnsarOrderStatus(order.id, OrderStatus.COMPLETED)
     if (this.isAnsarOrder(order.id)) {
        const driverCurrentLocation = getCurrentLocationOfDriver(order.driver?.id)
        const [latStr, lngStr] = driverCurrentLocation?.split(",");
        const latitude = parseFloat(latStr);
        const longitude = parseFloat(lngStr);
        externalTrackingSocket.send({
              route: "shipbeeUpdate",
              payload: {
                id: order.orderNo,
                status: order.status,
                latitude,
                longitude
              }
            })
        console.log(`Sent location update to ansar upon completion for order #${order.orderNo}`)
      }
      this.removeAnsarOrder(order.id)
    }
    else {
      console.log(`🟢 Stop ${stopId} completed, but order ${orderId} still has pending stops.`);
      broadcastOrderUpdate(order.id, order.status, stop.sequence); // Notify all connected clients about the order status update
    }

    // order.proofOfOrder = proofUrl.split("image/upload/")[1];
    // order.completionOtp = null; // Clear OTP after completion
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

  // async sendOtpToReceiver(orderId: string, otp: string) {
  //   try {
  //     console.log("Sending OTP to receiver for order ID:", orderId);
  //     const order = await this.orderRepository.findOne({
  //       where: { id: orderId },
  //       relations: ["receiver"],
  //     });
  //     if (!order) {
  //       throw new Error(`Order with ID ${orderId} not found`);
  //     }
  //     if (!order.receiver || !order.receiver.phoneNumber) {
  //       throw new Error(`Receiver for order ${orderId} does not have a phone number`);
  //     }
  //     await sendOtpToUser(order.receiver.phoneNumber, otp, '+974');
  //     console.log(`OTP sent to receiver for order ${orderId}: ${otp}`);
  //   } catch (error) {
  //     console.error("Error sending OTP to receiver:", error.message);
  //     throw new Error(`Could not send OTP to receiver: ${error.message}`);
  //   }
  // }

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
                relations: ["fromAddress", "sender", "stops", "stops.toAddress", "stops.receiver"],
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
            relations: ["driver", "fromAddress", "sender", "stops", "stops.toAddress", "stops.receiver"],
        });
        if (!order) {
            throw new Error(`Order with ID ${orderId} not found`);
        }
        if (order.driver?.id !== driverId) {
            throw new Error(`Driver with ID ${driverId} is not assigned to this order`);
        }

        if (order.status !== OrderStatus.ASSIGNED && order.status !== OrderStatus.ACTIVE && order.status !== OrderStatus.EN_ROUTE_TO_PICKUP) {
            throw new Error(`Order with ID ${orderId} is not assigned or active`);
        }
        
        const existingRequest = await this.orderCancellationRequestRepository.findOne({
            where: { order: { id: orderId }, driver: { id: driverId }, status: CancelRequestStatus.PENDING }
        });

        if (existingRequest) {
            throw new Error(`Cancellation request already exists for order ${orderId}`);
        }

        // Case 1️⃣: ASSIGNED — auto reassign, but store cancellation history
        if ([OrderStatus.ASSIGNED, OrderStatus.EN_ROUTE_TO_PICKUP].includes(order.status)) {
          console.log(`Order ${orderId} is ${order.status} — driver ${driverId} canceled. Creating auto-approved record.`);
        
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
          //Update driver status to Active
          await this.driverService.updateDriverStatus(driverId, DriverStatus.ACTIVE)
        
          // 3. Broadcast updates
          await this.orderStatusHistoryService.createOrderStatusHistory(order, reason);
          resetNotifiedDrivers(order.id);
          await emitOrderToDrivers(order);
          broadcastOrderUpdate(order.id, order.status);
          broadcastDriverStatusUpdate(driverId, DriverStatus.ACTIVE)
        
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
        broadcastOrderUpdate(order.id, order.status, undefined, "order-cancel-request", cancelRequest.id); // Notify all connected clients about the order status update
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
                relations: ["order", "driver", "order.driver", "order.sender", "order.stops", "order.stops.toAddress", "order.stops.receiver", "order.fromAddress", "order.serviceSubcategory", "order.shipment"]
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
                const driverCurrentLocation = getCurrentLocationOfDriver(cancellationRequest.driver.id);
                console.log(`Driver current location when cancellation request approved for driver ${cancellationRequest.driver.id}:`, driverCurrentLocation);
                cancellationRequest.status = CancelRequestStatus.APPROVED;
                await queryRunner.manager.save(cancellationRequest);
                const order = cancellationRequest.order;
                order.status = OrderStatus.PENDING;
                await this.driverService.updateDriverStatus(order.driver.id, DriverStatus.ACTIVE, queryRunner)
                broadcastDriverStatusUpdate(order.driver.id, DriverStatus.ACTIVE)
                order.driver = null;
                await queryRunner.manager.save(order);
                await this.orderStatusHistoryService.createOrderStatusHistory(order, null, queryRunner);
                resetNotifiedDrivers(order.id);
                await emitOrderToDrivers(order, driverCurrentLocation);
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
          relations: ["driver", "sender", "stops", "stops.receiver"],
          order: { stops: { sequence: "ASC" } }
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

        // Notify first receiver (if any)
        const firstStop = order.stops?.[0];
        console.log("First stop for order:", firstStop);
        if (firstStop && firstStop.receiver) {
          await this.notifyReceiver(orderId, driverId, firstStop.id, true);
        }
      } catch (error) {
        console.error("Error sending arrival notification to sender:", error.message);
        throw new Error(`Could not send arrival notification to sender: ${error.message}`);
      }
    }

    async notifyReceiver(orderId: string, driverId: string, stopId: string, atPickup: boolean = false) {
      try {
        const order = await this.orderRepository.findOne({
          where: { id: orderId },
          relations: ["driver", "stops", "stops.receiver"],
          order: { stops: { sequence: "ASC" } }
        });
        if (!order) {
          throw new Error(`Order with ID ${orderId} not found`);
        }
        if (order.driver?.id !== driverId) {
          throw new Error(`Driver with ID ${driverId} is not assigned to this order`);
        }
        // ✅ Find the specific stop
        const stop = order.stops.find((s) => s.id === stopId);
        if (!stop) {
          throw new Error(`Stop with ID ${stopId} not found in order ${orderId}`);
        }
      
        if (!stop.receiver) {
          throw new Error(`Receiver for stop ${stopId} in order ${orderId} not found`);
        }
      
        if (!stop.receiver.phoneNumber) {
          throw new Error(`Receiver for stop ${stopId} does not have a phone number`);
        }
        await sendArrivalNotification(stop.receiver.phoneNumber, stop.receiver.email, order.orderNo, order.driver.name, order.driver.phoneNumber, stop.sequence, atPickup);
        console.log(`Arrival notification sent to receiver for order ${orderId}`);

        // Notify next receiver in sequence, if any
        if (!atPickup) {
          const nextStopIndex = order.stops.findIndex((s) => s.id === stopId) + 1;
          const nextStop = order.stops[nextStopIndex];
          if (nextStop && nextStop.receiver) {
            await this.notifyReceiver(orderId, driverId, nextStop.id, true);
          }
        }
      } catch (error) {
        console.error("Error sending arrival notification to sender:", error.message);
        throw new Error(`Could not send arrival notification to sender: ${error.message}`);
      }
    }

    async saveOrder(order: Order) {
      return this.orderRepository.save(order);
    }

    async updateOrder(orderId: string) {
      const order = await this.orderRepository.findOne({ where: { id: orderId } });
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      order.isViewed = true;
      order.viewedAt = new Date();
      return this.orderRepository.save(order);
    }

    async getAllOrderStatuses(userId: string) {
      const orders =  await this.orderRepository.find({
        where: { createdBy: { id: userId } },
        select: ["id", "status", "createdAt"],
        relations: ["driver"],
      });
      console.log("Fetched orders for user:", JSON.stringify(orders, null, 2));
      return orders.map(order => ({
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        driver: order.driver ? { 
          name: order.driver.name, 
          phoneNumber: order.driver.phoneNumber,
          profilePicture: generatePhotoLink(order.driver.profilePicture),
          qid: order.driver.qid,
          licenseFront: order.driver.licenseFront ? generatePhotoLink(order.driver.licenseFront) : null,
          licenseBack: order.driver.licenseBack ? generatePhotoLink(order.driver.licenseBack) : null,  
        } : null,
      }) );
    }

    async getOrderStatus(userId: string, orderId?: string) {
      try {
          if (!orderId) {
            throw new Error("Either orderId or orderNo must be provided");
          }
          const order =  await this.orderRepository.findOne({
            where: { 
              stops: {
                clientStopId: orderId
              }, 
              createdBy: { id: userId } 
            },
            select: ["id", "status"],
            relations: ["driver", "stops"],
          });   
          
          if (!order) {
            throw new Error(`Order not found for user ${userId}`);
          }
          const clientStop = order.stops.find(stop => stop.clientStopId === orderId);
          if (clientStop.status === OrderStatus.COMPLETED) {
            order.status = OrderStatus.COMPLETED;
          }
          return {
            orderId,
            status: order.status,
            amount: clientStop.totalPrice,
            deliveryFee: clientStop.deliveryFee,
            driver: order.driver ? { 
              name: order.driver.name, 
              phoneNumber: order.driver.phoneNumber,
              profilePicture: generatePhotoLink(order.driver.profilePicture),
              qid: order.driver.qid,
              licenseFront: order.driver.licenseFront ? generatePhotoLink(order.driver.licenseFront) : null,
              licenseBack: order.driver.licenseBack ? generatePhotoLink(order.driver.licenseBack) : null,
              currentLocation: getCurrentLocationOfDriver(order.driver.id)
            } : null,
          };
      } catch (error) {
        console.error("Error fetching order status:", error.message);
        throw new Error(`Could not fetch order status: ${error.message}`);
    }
  }

  async clientCancelOrder(userId: string, orderId: string, reason?: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, createdBy: { id: userId } },
      relations: ["driver"],
    });

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found for user ${userId}`);
    }

    if (order.status === OrderStatus.CANCELED) {
      throw new Error(`Order with ID ${orderId} is already canceled`);
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new Error(`Order with ID ${orderId} is already completed and cannot be canceled`);
    }
    console.log(`reason for cancellation: ${reason}`);
    if (order.status === OrderStatus.PENDING || order.status === OrderStatus.ASSIGNED || order.status === OrderStatus.EN_ROUTE_TO_PICKUP) {
      //cancel directly and notify driver
      order.status = OrderStatus.CANCELED;
      await this.orderRepository.save(order);
      await this.orderStatusHistoryService.createOrderStatusHistory(order, reason || 'Cancellation by client');
      broadcastOrderUpdate(order.id, order.status);
      if (order.driver) emitOrderCancellationUpdate(order.driver.id, order.id, CancelRequestStatus.APPROVED);
      return;
    }

    if (order.status === OrderStatus.ACTIVE) {
      //create cancellation request for admin approval
      const existingRequest = await this.orderCancellationRequestRepository.findOne({
        where: { order: { id: orderId }, status: CancelRequestStatus.PENDING }
      });

      if (existingRequest) {
        throw new Error(`Cancellation request already exists for order ${orderId}`);
      }

      const cancellationRequest = this.orderCancellationRequestRepository.create({
          order: { id: orderId } as any,
          status: CancelRequestStatus.PENDING,
          reason
      });

      const cancelRequest = await this.orderCancellationRequestRepository.save(cancellationRequest);
      console.log(`Order cancellation requested for order ${orderId} by client ${userId}`);
      // broadcastOrderUpdate(order.id, order.status, undefined, "order-cancel-request", cancelRequest.id);
      return cancelRequest.id;
    }
  }

  async adminApproveClientCancellation(orderId: string, cancellationRequestId: string, status: CancelRequestStatus, reason?: string) {
    const order = await this.orderRepository.findOne({
      where: { 
        id: orderId, 
        cancellationRequests: 
        { id: cancellationRequestId }
       },
      relations: ["driver"],
    });

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    if (order.status === OrderStatus.CANCELED) {
      throw new Error(`Order with ID ${orderId} is already canceled`);
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new Error(`Order with ID ${orderId} is already completed and cannot be canceled`);
    }
    console.log(`Admin processing cancellation request ${cancellationRequestId} for order ${orderId} with status ${status}`);
    if (status === CancelRequestStatus.APPROVED) {
      order.status = OrderStatus.CANCELED;
      await this.orderRepository.save(order);
      await this.orderStatusHistoryService.createOrderStatusHistory(order, reason || 'Cancellation approved by admin');
      await this.orderCancellationRequestRepository.update(cancellationRequestId, { status: CancelRequestStatus.APPROVED });
      broadcastOrderUpdate(order.id, order.status);
      if (order.driver) emitOrderCancellationUpdate(order.driver.id, order.id, CancelRequestStatus.APPROVED);
    } else if (status === CancelRequestStatus.DECLINED) {
      console.log(`Admin declined cancellation request ${cancellationRequestId} for order ${orderId} declined`);
      await this.orderCancellationRequestRepository.update(cancellationRequestId, { status: CancelRequestStatus.DECLINED });
    }

    return;

  }
  
  // Check if a given order belongs to the user
  async isOrderOwnedByUser(orderId: string, userId: string): Promise<Order | null> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, createdBy: { id: userId } },
      select: ["id", "status"],
      relations: ["stops"]
    });
    return order;
  }

  async validateReceiverTrackingToken(token: string) {
    try {
      const order = await this.orderRepository.findOne({
        where: { accessToken: token },
        select: ["id"]
      });
      if (!order) {
        return {
          isValid: false,
          orderId: null
        }
      }
      return {
        isValid: true,
        orderId: order.id
      }
    }
    catch (error) {
      console.error("Error validating receiver tracking token:", error.message);
      return {
        isValid: false,
        orderId: null
      }
    }
  }

  async getOrdersReport(userId: string, startDate: Date, endDate: Date) {
    try {
      console.log(`Generating orders report for user ${userId} from ${startDate} to ${endDate}`);
      //get number of orders created by user in date range, average distance per order, average time per order
      const ordersReport = await this.orderRepository
        .createQueryBuilder("order")
        .select("COUNT(order.id)", "totalOrders")
        .addSelect("AVG(order.distance)", "avgDistance")
        .addSelect(
          "AVG(EXTRACT(EPOCH FROM (order.completedAt - order.startedAt)) / 60)",
          "avgDurationMinutes"
        )
        .where("order.createdById = :userId", { userId })
        .andWhere("order.createdAt BETWEEN :start AND :end", {
          start: startDate,
          end: endDate,
        })
        .getRawOne();

      return {
        totalOrders: parseInt(ordersReport.totalOrders, 10) || 0,
        avgDistancePerOrder: parseFloat(ordersReport.avgDistance) || null,
        avgDurationMinutesPerOrder: parseFloat(ordersReport.avgDurationMinutes) || null,
      };
      } catch (error) {
        console.error("Error generating orders report:", error.message);
        throw new Error(`Could not generate orders report: ${error.message}`);
      }
  }

  async getCurrentActiveStop(orderId: string) {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ["stops"],
      });

      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      const activeStop = order.stops.find(stop => stop.status === OrderStatus.ACTIVE);
      return activeStop || null;
    } catch (error) {
      console.error("Error fetching current active stop:", error.message);
      throw new Error(`Could not fetch current active stop: ${error.message}`);
    }
  }

  async createDHLShipment(orderData: CreateOrderDto) {
    console.log("from address:", orderData.fromAddress);
    console.log("STOP:", orderData.stops[0]);
    try {
      const data = {
        plannedShippingDateAndTime: orderData.shipment.plannedShippingDateAndTime,
        pickup: {
          isRequested: orderData.shipment.pickupRequested,
        },
        getRateEstimates: true,
        productCode: "P",
        accounts: [{
          typeCode: "shipper",
          number: env.DHL.ACCOUNT_NUMBER,
        }],
        customerDetails: {
          shipperDetails: {
            postalAddress: {
              postalCode: "",
              cityName: orderData.fromAddress.city,
              countryCode: getCountryIsoCode(orderData.fromAddress.country),
              addressLine1: formatAddressSingleLine(orderData.fromAddress),
            },
            contactInformation: {
              phone: `+${getCountryCallingCode(getCountryIsoCode(orderData.fromAddress.country) as CountryCode)} ${orderData.senderPhoneNumber}`,
              companyName: orderData.senderName,
              fullName: orderData.senderName,
          }
        },
        receiverDetails: {
          postalAddress: {
            postalCode: "",
            cityName: orderData.stops[0].toAddress.city,
            countryCode: getCountryIsoCode(orderData.stops[0].toAddress.country),
            addressLine1: formatAddressSingleLine(orderData.stops[0].toAddress),
          },
          contactInformation: {
            
            phone: `+${getCountryCallingCode(getCountryIsoCode(orderData.stops[0].toAddress.country) as CountryCode)} ${orderData.stops[0].receiverPhoneNumber}`,
            companyName: orderData.stops[0].receiverName,
            fullName: orderData.stops[0].receiverName,
        }
      },
    },
    content: {
      packages: [
        { 
          weight: orderData.shipment.weight,  // Weight in KG
          dimensions: {
            length: orderData.shipment.length,
            width: orderData.shipment.width,
            height: orderData.shipment.height,
          }
        }
      ],
      description: orderData.shipment.description,
      unitOfMeasurement: "metric",
      declaredValue: orderData.shipment.totalValue,
      declaredValueCurrency: "USD",
      isCustomsDeclarable: true,
      incoterm: orderData.shipment.incoterm || "DAF",
      exportDeclaration: {
        lineItems: orderData.shipment.lineItems,
        invoice: {
          number: orderData.shipment.invoiceNumber || "INV-" + Math.floor(Math.random() * 1000000),
          date: orderData.shipment.invoiceDate || new Date().toISOString().split('T')[0],
        }
      }
    }

    
  };
    console.log("phone number from:", data.customerDetails.shipperDetails.contactInformation.phone)
    console.log("phone number to:", data.customerDetails.receiverDetails.contactInformation.phone)
    const config = {
      auth: {
        username: env.DHL.API_KEY,
        password: env.DHL.API_SECRET,
      },
      headers: {
        "Content-Type": "application/json",
      },
    };
    console.log("url:", env.DHL.DOMAIN + '/shipments');
    const response = await axios.post(env.DHL.DOMAIN + '/shipments', data, config);
    if (response.data.status && response.data.status.code !== "200") {
      console.error("DHL API error:", response.data);
      throw new Error(`DHL API error: ${response.data.detail}`);
    }
    return response.data.shipmentTrackingNumber;
  }
    catch (error) {
      console.error("Error creating DHL shipment:", error.message);
      console.error("Full error:", error.response.data);
      throw new Error(`Could not create DHL shipment: ${error.response.data.detail}`);
    }
  }

  async getOrdersDashboard(userId: string, serviceType?: string) {
    try {
        const dashboardQuery = this.orderRepository
          .createQueryBuilder("order")
          .innerJoin("order.serviceSubcategory", "subcategory")
          .select("order.status", "status")
          .addSelect("COUNT(order.id)", "count")

        if (userId !== "admin") {
          dashboardQuery.andWhere("order.createdById = :userId", {
            userId
          })
        }

        if (serviceType) {
          dashboardQuery.andWhere("subcategory.name = :serviceType", {
            serviceType,
          });
        }

        dashboardQuery.groupBy("order.status")
        const dashboard = await dashboardQuery.getRawMany();
        return dashboard;
      }
    catch (err) {
      console.error(err)
      throw new Error(`Couldn't fetch orders dashboard: ${err.message}`)
    }
  }

  async cancelOrder(orderNo: number, userId: string) {
    try {
      const order = await this.orderRepository.findOne({
        where: {
          orderNo,
          createdBy: {id: userId}
        },
        relations: ["driver"]
      })

      if (!order) {
        console.error(`Order with number ${orderNo} and userId: ${userId} not found`)
        throw new Error(`Order not found`)
      }

      if (order.status === OrderStatus.CANCELED) {
        throw new Error(`Order with ID ${orderNo} is already canceled`);
      }

      if (order.status === OrderStatus.COMPLETED) {
        throw new Error(`Order with ID ${orderNo} is already completed and cannot be canceled`);
      }

      order.status = OrderStatus.CANCELED;
      await this.orderRepository.save(order);
      await this.orderStatusHistoryService.createOrderStatusHistory(order, 'Cancellation by client (Ansar)');
      broadcastOrderUpdate(order.id, order.status);
      if (order.driver) emitOrderCancellationUpdate(order.driver.id, order.id, CancelRequestStatus.APPROVED);
      return;

    } catch (err) {
      console.error(err.message)
      throw new Error(`Error canceling order: ${err.message}`)
    }
  }

  async getCurrentActiveOrder(driverId: string) {
    try {
      const activeOrder = await this.orderRepository.findOne({
        where: {
          driver: { id: driverId },
          status: In([OrderStatus.ASSIGNED, OrderStatus.ACTIVE, OrderStatus.EN_ROUTE_TO_PICKUP])
        },
        relations: ["fromAddress", "sender", "stops", "stops.toAddress", "stops.receiver"]
      }) 
      console.log(`cuurent active order: ${JSON.stringify(activeOrder, null, 2)}`)
      return createDriverOrderResource(activeOrder, null, null)

    } catch (err) {
      console.error(err.message)
      throw new Error(`Error getting current active order: ${err.message}`)
    }
  }

  async preloadAnsarOrders() {

    const ansarOrdersFromDB = await this.orderRepository.find({
      where: {
        createdBy: { name: "Ansar" },
        status: Not(In([OrderStatus.COMPLETED, OrderStatus.CANCELED]))
      },
      select: ["id", "orderNo", "status"]
    });

    ansarOrdersFromDB.forEach(order => {
      this.ansarOrders.set(order.id, { orderNo: order.orderNo, status: order.status });
    });

    console.log(`Preloaded Ansar orders: ${JSON.stringify(this.ansarOrders, null, 2)}`);
    console.log(`Number of Ansar orders: ${this.ansarOrders.size}`)
  }

  addAnsarOrder(orderId: string, orderNo: number, status: OrderStatus) {
    console.log(`added ansar order with order id: ${orderId} orderNo: ${orderNo} status: ${status}`)
    this.ansarOrders.set(orderId, { orderNo, status });
  }

  /** Remove order (completed or reassigned) */
  removeAnsarOrder(orderId: string) {
    console.log("removed orderId from ansar", orderId)
    this.ansarOrders.delete(orderId);
  }

  /** Check if order belongs to Ansar */
  isAnsarOrder(orderId: string): boolean {
    return this.ansarOrders.has(orderId);
  }

  /** Get Ansar order info */
  getAnsarOrderInfo(orderId: string): AnsarOrderInfo | null {
    return this.ansarOrders.get(orderId) || null;
  }

  updateAnsarOrderStatus(orderId: string, status: OrderStatus) {
    console.log(`updated order status for orderId: ${orderId} to status: ${status}`)
    const orderInfo = this.ansarOrders.get(orderId);
    if (orderInfo) {
      orderInfo.status = status;
      this.ansarOrders.set(orderId, orderInfo);
    }
  }

}
