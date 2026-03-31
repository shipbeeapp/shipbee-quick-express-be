import { Service, Container } from "typedi";
import UserService from "./user.service.js";
import { AddressService } from "./address.service.js";
// import { PaymentService } from "./payment.service.js";
import { CreateOrderDto } from "../dto/order/createOrder.dto.js";
import { AppDataSource } from "../config/data-source.js";
import { Order } from "../models/order.model.js";
import ServiceSubcategoryService from "./serviceSubcategory.service.js";
import OrderStatusHistoryService from "./orderStatusHistory.service.js";
import { OrderStatus } from "../utils/enums/orderStatus.enum.js";
import { OrderResponseDto, toOrderResponseDto, toOrderListDto } from "../resource/orders/order.resource.js";
import { PaymentMethod } from "../utils/enums/paymentMethod.enum.js";
import {
  sendOrderConfirmation,
  sendOrderCancellationEmail,
  sendOrderDetailsViaSms,
  sendArrivalNotification,
  formatAddressSingleLine
} from "../services/email.service.js";
import { env } from "../config/environment.js";
import { Between, MoreThan, In, Not, LessThan, QueryRunner, MoreThanOrEqual, LessThanOrEqual } from "typeorm";
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
import { emitOrderAccepted, emitOrderCancellationUpdate, emitOrderCompletionUpdate, emitOrderToDrivers, getCurrentLocationOfDriver, emitOrderStopUpdate } from "../socket/socket.js";
import { broadcastDriverStatusUpdate, broadcastOrderUpdate } from "../controllers/user.controller.js";
import PromoCodeService from "./promoCode.service.js";
import { User } from "../models/user.model.js";
import { OrderStop } from "../models/orderStops.model.js";
import { OrderType } from "../utils/enums/orderType.enum.js";
import axios from "axios";
import { getCountryIsoCode } from "../utils/dhl.utils.js";
import { formatAddress } from "../services/email.service.js";
import { CountryCode, getCountryCallingCode } from 'libphonenumber-js';
import { externalTrackingSocket } from "../socket/external-tracking-socket.js";
import { createDriverOrderResource } from "../resource/drivers/driverOrder.resource.js";
import { getStatusTimestamp, getDurationInMinutes } from "../utils/global.utils.js";
import { OrderEventType } from "../utils/enums/orderEventType.enum.js";
import { calculateDistanceForClientOrder } from "../utils/google-maps/distance-time.js";
import { setIslatestOrderStatus, intraStatusDuration } from "../utils/global.utils.js";
import { OrderStatusHistory } from "../models/orderStatusHistory.model.js";
import { userType } from "../utils/enums/userType.enum.js";

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

  constructor() { }

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
      const fromAddress = await this.addressService.createAddress(orderData.fromAddress, queryRunner);


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
      if (orderData.vehicleType == VehicleType.FLAT_BED_TRAILER || orderData.vehicleType == VehicleType.LOW_BED_TRAILER
        || orderData.vehicleType == VehicleType.CHILLER_VAN
        || orderData.vehicleType == VehicleType.FREEZER_VAN || orderData.vehicleType == VehicleType.CANTER_TRUCK) {
        total = null;
      }
      else {
        console.log("distance given by client:", orderData.distance);
        orderData.distance = await calculateDistanceForClientOrder(orderData.fromAddress.coordinates, orderData.stops);
        console.log("distance calculated using google maps:", orderData.distance);
        const pricingInput = await validateObject(GetPricingDTO, {
          userId: createdByUser.id,
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
        const { totalCost: costBeforePromo } = await this.pricingService.calculatePricing(pricingInput);
        console.log("total cost before discount:", costBeforePromo);
        const { totalCost, discount, promoCodeStatus } = await this.promoCodeService.applyPromosToOrder(userId, costBeforePromo);
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
        type: orderData.type,
        serviceFeePercentage: env.SERVICE_FEE_PERCENTAGE,
        bankFeePercentage: createdByUser.bankFeePercentage ? Number(createdByUser.bankFeePercentage) : 0
      });

      await queryRunner.manager.save(order);

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
        const receiver = await this.userService.findOrCreateUser({ email: stopData.receiverEmail, phoneNumber: stopData.receiverPhoneNumber, name: stopData.receiverName }, queryRunner);
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
      await this.orderStatusHistoryService.createOrderStatusHistory({ order, cancellationReason: null, queryRunner });
      orderData.orderNo = order.orderNo;
      let recipientAdminMail;
      if (order.serviceSubcategory.name == ServiceSubcategoryName.PERSONAL_QUICK) recipientAdminMail = env.SMTP.USER;
      else recipientAdminMail = env.EXPRESS_ADMIN_EMAIL;
      await sendOrderConfirmation(orderData, total, orderData.vehicleType, recipientAdminMail, 'admin').catch((err) => {
        console.error("Error sending emaill to admin:", err);
      });
      console.log('sent mail to admin: ', recipientAdminMail);
      if (createdByUser.email && createdByUser.type !== userType.BUSINESS) {
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
      await this.addAnsarOrder(order.id, order.orderNo, order.status)
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

  async getOrdersbyUser(
    userId: string[], 
    serviceType?: string, 
    isLate?: boolean, 
    startDate?: Date, 
    endDate?: Date
  ) {
    try {
      console.log("Fetching orders for user ID:", userId);
      const orders = await this.orderRepository.find({
        where: {
          createdBy: { id: In(userId) },
          serviceSubcategory: serviceType ? { name: In([serviceType]) } : undefined,
          pickUpDate: startDate && endDate ? Between(startDate, endDate) : startDate ? MoreThanOrEqual(startDate) : endDate ? LessThanOrEqual(endDate) : undefined,
        },
        relations: [
          "sender", "fromAddress", "serviceSubcategory",
          "orderStatusHistory", "orderStatusHistory.orderStop", "shipment",
          "createdBy", "orderStatusHistory.driver",
          "cancellationRequests", "cancellationRequests.driver", "driver", "driver.vehicle",
          "stops", "stops.receiver", "stops.toAddress",
        ],
        order: {
          createdAt: "DESC",
        },
      })

      const filteredOrders = isLate ? setIslatestOrderStatus(orders, isLate) : orders;

      return await Promise.all(
        filteredOrders.map(order => toOrderResponseDto(order))
      );
    } catch (error) {
      console.error("Error fetching orders for user:", error.message);
      throw new Error(`Could not fetch orders for user: ${error.message}`);
    }
  }

  async getOrders(
    serviceType: ServiceSubcategoryName, 
    fromStatus?: string, 
    toStatus?: string, 
    thresholdMinutes?: number, 
    userId?: string,
    startDate?: Date,
    endDate?: Date,
    status?: OrderStatus,
    driverId?: string,
    hasCanceledStops?: boolean,
    hasReturnedStops?: boolean,
    page: number = 1,
    limit: number = 20,
  ) {
    if (!AppDataSource.isInitialized) {
      console.log("wasnt initialized, initializing now...");
      await AppDataSource.initialize();
      console.log("Data Source has been initialized! in OrderService");
    }
    console.log("Fetching orders for admin, page:", page, "limit:", limit);

    // When filtering by intra-status duration we must load all matching orders
    // first (the filter depends on status history timestamps that can't easily
    // be expressed in a WHERE clause), then paginate the filtered result.
    const needsInMemoryFilter = fromStatus && toStatus && thresholdMinutes !== undefined;

    const baseWhere = {
      serviceSubcategory: { name: serviceType },
      createdBy: userId ? { id: userId } : undefined,
      pickUpDate: startDate && endDate ? Between(startDate, endDate) : startDate ? MoreThanOrEqual(startDate) : endDate ? LessThanOrEqual(endDate) : undefined,
      status: status ? status : undefined,
      driver: driverId ? { id: driverId } : undefined,
    };
    
    const where = hasCanceledStops || hasReturnedStops
      ? [
          ...(hasCanceledStops ? [{ ...baseWhere, stops: { status: OrderStatus.CANCELED } }] : []),
          ...(hasReturnedStops ? [{ ...baseWhere, stops: { isReturned: true } }] : []),
        ]
      : baseWhere;
      
    const [orders, total] = await this.orderRepository.findAndCount({
      where,
      relations: [
        "sender", "fromAddress", "serviceSubcategory", "orderStatusHistory",
        "orderStatusHistory.orderStop", "orderStatusHistory.driver", "driver", "driver.vehicle", "shipment",
        "createdBy", "cancellationRequests", "cancellationRequests.driver",
        "stops", "stops.receiver", "stops.toAddress",
      ],
      order: {
        createdAt: "DESC",
      },
      ...(needsInMemoryFilter ? {} : { skip: (page - 1) * limit, take: limit }),
    });

    let resultOrders = orders;
    let resultTotal = total;

    if (needsInMemoryFilter) {
      const filtered = intraStatusDuration(resultOrders, fromStatus, toStatus, thresholdMinutes);
      resultTotal = filtered.length;
      resultOrders = filtered.slice((page - 1) * limit, page * limit);
    }

    return {
      orders: resultOrders.map(order => toOrderListDto(order)),
      total: resultTotal,
      page,
      limit,
      totalPages: Math.ceil(resultTotal / limit),
    };
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    console.log("Updating order status for order ID:", orderId, "to status:", status);

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let order: Order;

    try {
      const orderRepository = queryRunner.manager.getRepository(Order);

      order = await orderRepository.findOne({
        where: { id: orderId },
        relations: ["driver", "stops"],
        lock: {
          mode: "pessimistic_write",
          tables: ["orders"]
        },
      });

      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      order.status = status;

      if (status === OrderStatus.COMPLETED) {
        order.completedAt = new Date();
        await this.driverService.updateDriverIncomeAndCashBalance(order.driver?.id, order, queryRunner);
      }

      await orderRepository.save(order);

      await this.orderStatusHistoryService.createOrderStatusHistory(
        { order, cancellationReason: null, queryRunner, triggeredByAdmin: true }
      );

      if (
        status === OrderStatus.CANCELED ||
        status === OrderStatus.COMPLETED
      ) {
        if (order.driver)
          await this.driverService.updateDriverStatus(
            order.driver.id,
            DriverStatus.ACTIVE,
            queryRunner
          );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      console.error("Error updating order status:", error.message);

      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw error;
    } finally {
      await queryRunner.release();
    }

    broadcastOrderUpdate(order.id, order.status);

    if (status === OrderStatus.CANCELED) {
      if (order.driver) {
        emitOrderCancellationUpdate(
          order.driver.id,
          order.id,
          CancelRequestStatus.APPROVED
        );
        broadcastDriverStatusUpdate(order.driver.id, DriverStatus.ACTIVE);
      }
    }

    if (status === OrderStatus.COMPLETED) {
      if (order.driver) {
        emitOrderCompletionUpdate(order.driver.id, order.id);
        broadcastDriverStatusUpdate(order.driver.id, DriverStatus.ACTIVE);
      }
    }

    this.updateAnsarOrderStatus(order.id, status);

    if (this.isAnsarOrder(order.id)) {
      const driverCurrentLocation = getCurrentLocationOfDriver(order.driver?.id);

      let latitude: number | null = null;
      let longitude: number | null = null;

      if (driverCurrentLocation) {
        const [latStr, lngStr] = driverCurrentLocation.split(",");
        latitude = parseFloat(latStr);
        longitude = parseFloat(lngStr);
      }

      externalTrackingSocket.send({
        route: "shipbeeUpdate",
        payload: {
          id: order.orderNo,
          status: order.status,
          latitude,
          longitude,
        },
      });
    }

    console.log("Order status updated successfully");
  }

  async getOrderDetails(orderId: string, accessToken?: string): Promise<any> {
    console.log("Fetching order details for order ID:", orderId);
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["sender", "fromAddress", "serviceSubcategory", "orderStatusHistory", "shipment",
        "orderStatusHistory.orderStop", "orderStatusHistory.driver",
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
      console.log(`Driver ${driverId} attempting to accept order ${orderId}`);
      const result = await queryRunner.manager
        .createQueryBuilder(Order, "order")
        .update(Order)
        .set({
          driver: { id: driverId } as any,
          status: OrderStatus.ASSIGNED
        })
        .where("id = :orderId", { orderId })
        .andWhere("status = :pending", { pending: OrderStatus.PENDING })
        .returning("*") // get the updated row
        .execute();

      if (result.affected === 0 || !result.raw[0]) {
        console.error(`Order ${orderId} is not available for acceptance by driver ${driverId}`);
        throw new Error("Order already assigned or not available");
      }
      console.log(`Order ${orderId} accepted by driver ${driverId}`);
      const order = result.raw[0] as Order;
      console.log(`Order details: ${JSON.stringify(order, null, 2)}`);
      // Update driver status to ON_DUTY
      await queryRunner.manager.getRepository(Driver).update(
        { id: driverId },
        { status: DriverStatus.BUSY }
      );
      // Add to order status history
      order.driver = { id: driverId } as any; // set driver relation for history record
      await this.orderStatusHistoryService.createOrderStatusHistory({ order, cancellationReason: null, queryRunner });

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
        console.log("Updating order status to EN_ROUTE_TO_PICKUP");
        await this.orderRepository.update(orderId, { status: OrderStatus.EN_ROUTE_TO_PICKUP, startedAt: new Date().toISOString() });
        // Add to order status history
        order.status = OrderStatus.EN_ROUTE_TO_PICKUP;
        await this.orderStatusHistoryService.createOrderStatusHistory({ order });
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
        await this.orderStatusHistoryService.createOrderStatusHistory({ order, stopId: currentStop.id });
        stopNumber = currentStop.sequence;
        console.log(`Order ${orderId} by driver ${driverId} is going to stop #${currentStop.sequence}`);
        broadcastOrderUpdate(order.id, order.status, currentStop.sequence); // Notify all connected clients about the order status update
        this.updateAnsarOrderStatus(order.id, OrderStatus.ACTIVE)
      }
      sendOrderConfirmation(order, order.totalCost, order.vehicleType, env.SMTP.USER, 'admin', 'order-status', isPickup ? "pickup" : stopNumber.toString()).catch((err) => {
        console.error("Error sending email to admin:", err);
      });
    } catch (error) {
      console.error("Error starting order:", error.message);
      throw new Error(`Could not start order: ${error.message}`);
    }
  }

  async completeOrder(orderId: string, driverId: string, stopId: string, proofUrl: string) {
    console.log("Completing order for order ID:", orderId, "by driver ID:", driverId);
    const queryRunner = this.orderRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
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
      await queryRunner.manager.save(OrderStop, stop);

      // Check if all stops are completed and finalize order if so
      await this.finalizeOrderCompletion(order, driverId, stop, queryRunner);
      await queryRunner.commitTransaction();
    } catch (error) {
      console.error("Error completing order:", error.message);
      await queryRunner.rollbackTransaction();
      throw new Error(`Could not complete order: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async finalizeOrderCompletion(order: Order, driverId: string, stop: OrderStop, queryRunner?: QueryRunner, isReturned: boolean = false) {
    const allCompleted = order.stops.every((s) => s.status === OrderStatus.COMPLETED || s.status === OrderStatus.CANCELED);
    if (allCompleted) {
      order.status = OrderStatus.COMPLETED;
      order.completedAt = new Date(); // Set the completedAt timestamp as a Date object
      order.driver.status = DriverStatus.ACTIVE;
      await queryRunner.manager.save(Order, order);
      await queryRunner.manager.save(Driver, order.driver);
      await this.orderStatusHistoryService.createOrderStatusHistory({ order, queryRunner });
      console.log(`Order ${order.id} completed successfully by driver ${driverId}`);
      sendOrderConfirmation(order, order.totalCost, order.vehicleType, env.SMTP.USER, 'admin', 'order-status').catch((err) => {
        console.error("Error sending email to admin:", err);
      });
      console.log('sent mail to admin');
      broadcastOrderUpdate(order.id, order.status); // Notify all connected clients about the order status update
      broadcastDriverStatusUpdate(order.driver.id, DriverStatus.ACTIVE)
      await this.driverService.updateDriverIncomeAndCashBalance(driverId, order, queryRunner);
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
        this.removeAnsarOrder(order.id)
      }
    }
    else {
      console.log(`🟢 Stop ${stop.id} is ${stop.status}, but order ${order.id} still has pending stops.`);
      if (!isReturned) await this.orderStatusHistoryService.createOrderStatusHistory({ order, queryRunner, stopId: stop.id, event: OrderEventType.STOP_COMPLETED });
      broadcastOrderUpdate(order.id, order.status, stop.sequence); // Notify all connected clients about the order status update
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
      await this.orderStatusHistoryService.createOrderStatusHistory({ order, cancellationReason: reason });
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
        where: { id: cancelRequestId, },
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
        await this.orderStatusHistoryService.createOrderStatusHistory({ order, cancellationReason: null, queryRunner });
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
      if (order.sender.type !== userType.BUSINESS) {
        await sendArrivalNotification(order.sender.phoneNumber, order.sender.email, order.orderNo, order.driver.name, order.driver.phoneNumber);
        console.log(`Arrival notification sent to sender for order ${orderId}`);
      }

      await this.orderStatusHistoryService.createOrderStatusHistory({ order, hasArrived: true });
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
        console.warn(`Receiver for stop ${stopId} does not have a phone number`);
      }
      await sendArrivalNotification(stop.receiver.phoneNumber, stop.receiver.email, order.orderNo, order.driver.name, order.driver.phoneNumber, stop.sequence, atPickup);
      console.log(`Arrival notification sent to receiver for order ${orderId}`);

      // Only add order status history for the intended receiver (not for recursive calls)
      if (!atPickup) {
        await this.orderStatusHistoryService.createOrderStatusHistory({ order, stopId: stop.id, hasArrived: true });
      }

      // Notify next receiver in sequence, if any (but do NOT add status history for them)
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
    const orders = await this.orderRepository.find({
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
    }));
  }

  async getOrderStatus(userId: string, orderId?: string) {
    try {
      if (!orderId) {
        throw new Error("Either orderId or orderNo must be provided");
      }
      const order = await this.orderRepository.findOne({
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
        status: clientStop.isReturned ? "Returned" : order.status,
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
      await this.orderStatusHistoryService.createOrderStatusHistory({ order, cancellationReason: reason || 'Cancellation by client' });
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
      await this.orderStatusHistoryService.createOrderStatusHistory({ order, cancellationReason: reason || 'Cancellation approved by admin' });
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

  async getOrdersDashboard(
    userId: string,
    serviceType?: string,
    startDate?: Date,
    endDate?: Date,
    filterByUserId?: string,
    fromStatus?: string,
    toStatus?: string,
    thresholdMinutes?: number,
    driverId?: string,
    status?: OrderStatus,
    hasCanceledStops?: boolean,
    hasReturnedStops?: boolean
  ) {
    try {
      const needsInMemoryFilter = fromStatus && toStatus && thresholdMinutes !== undefined;

      // When threshold filter is active, we need full order entities with status history
      if (needsInMemoryFilter) {
        const where: any = {
          serviceSubcategory: serviceType ? { name: serviceType } : undefined,
          pickUpDate: startDate && endDate ? Between(startDate, endDate) : startDate ? MoreThanOrEqual(startDate) : endDate ? LessThanOrEqual(endDate) : undefined,
        };
        if (userId !== "admin") where.createdBy = { id: userId };
        if (filterByUserId) where.createdBy = { id: filterByUserId };
        if (driverId) where.driver = { id: driverId };
        if (status) where.status = status;
        if (hasCanceledStops || hasReturnedStops) {
          where.stops = hasCanceledStops && hasReturnedStops ? 
            [
              { status: OrderStatus.CANCELED },
              { isReturned: true }
            ] : hasCanceledStops ? { status: OrderStatus.CANCELED } : { isReturned: true };
        }
        const orders = await this.orderRepository.find({
          where,
          relations: [
            "serviceSubcategory", 
            "orderStatusHistory"
          ],
        });
        console.log("orders length: ", orders.length);
        const filtered = intraStatusDuration(orders, fromStatus, toStatus, thresholdMinutes);
        const counts: Record<string, number> = {};
        for (const order of filtered) {
          counts[order.status] = (counts[order.status] || 0) + 1;
        }
        const statusCounts = Object.entries(counts).map(([status, count]) => ({ status, count: String(count) }));
        const total = statusCounts.reduce((sum, s) => sum + Number(s.count), 0);
        return { statusCounts, total };
      }

      // Fast path: aggregate in DB
      const dashboardQuery = this.orderRepository
        .createQueryBuilder("o")
        .innerJoin("o.serviceSubcategory", "subcategory")
        .select("o.status", "status")
        .addSelect("COUNT(o.id)", "count")

      console.log("Generating orders dashboard with filters - userId:", userId, "serviceType:", serviceType, "startDate:", startDate, "endDate:", endDate, "filterByUserId:", filterByUserId);
      if (userId !== "admin") {
        dashboardQuery.andWhere("o.createdById = :userId", {
          userId
        })
      }

      if (filterByUserId) {
        dashboardQuery.andWhere("o.createdById = :filterByUserId", {
          filterByUserId,
        });
      }

      if (serviceType) {
        dashboardQuery.andWhere("subcategory.name = :serviceType", {
          serviceType,
        });
      }

      if (startDate && endDate) {
        dashboardQuery.andWhere("o.pickUpDate BETWEEN :startDate AND :endDate", { startDate, endDate });
      } else if (startDate) {
        dashboardQuery.andWhere("o.pickUpDate >= :startDate", { startDate });
      } else if (endDate) {
        dashboardQuery.andWhere("o.pickUpDate <= :endDate", { endDate });
      }

      if (driverId) {
        dashboardQuery.andWhere("o.driverId = :driverId", { driverId });
      }

      if (status) {
        dashboardQuery.andWhere("o.status = :status", { status });
      }

      if (hasCanceledStops || hasReturnedStops) {
        const conditions = [];

        if (hasCanceledStops) {
          conditions.push(`stops.status = :canceledStatus`);
        }
      
        if (hasReturnedStops) {
          conditions.push(`stops."isReturned" = :isReturned`);
        }
      
        dashboardQuery.andWhere(
          `EXISTS (
            SELECT 1 FROM order_stops stops
            WHERE stops."orderId" = o.id
            AND (${conditions.join(" OR ")})
          )`,
          {
            canceledStatus: OrderStatus.CANCELED,
            isReturned: true,
          }
        );
      }

      dashboardQuery.groupBy("o.status")
      const statusCounts = await dashboardQuery.getRawMany();
      const total = statusCounts.reduce((sum: number, s: any) => sum + Number(s.count), 0);
      return { statusCounts, total };
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
          createdBy: { id: userId }
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
      await this.orderStatusHistoryService.createOrderStatusHistory({ order, cancellationReason: 'Cancellation by client (Ansar)' });
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
        relations: [
          "fromAddress", "sender", "stops",
          "stops.toAddress", "stops.receiver",
          "orderStatusHistory", "orderStatusHistory.orderStop"
        ]
      })
      console.log(`current active order: ${JSON.stringify(activeOrder, null, 2)}`)
      if (!activeOrder) {
        return null;
      }
      
      const returnedStop = activeOrder?.stops.find(stop => stop.status === OrderStatus.RETURNING);
      if (returnedStop) return createDriverOrderResource(activeOrder, null, null, true, returnedStop.id);
      return createDriverOrderResource(activeOrder, null, null)

    } catch (err) {
      console.error(err.message)
      throw new Error(`Error getting current active order: ${err.message}`)
    }
  }

  async getOrdersFinancials(
    serviceType?: ServiceSubcategoryName, 
    startDate?: Date, 
    endDate?: Date, 
    userId?: string
  ) {
    try {
      // I want some insights for completed orders which include:
      // - total sale: some of order.order_stops.total_price + order.total_cost for all completed orders
      // - total delivery fees: sum of order.total_cost for all completed orders
      // - total service fee: sum of order.totalCost * 10% for all completed orders
      // - total cash delivery fee: sum of order.totalCost if no order.order_stops.totalprice and order.paymentMethod = CASH
      // - total online delivery fee: sum of order.totalCost if order.order_stops.totalprice or order.paymentMethod != CASH
      // - the completed orders details should include orderNo, pickupDate, completedAt, drivername, vehicleType, driver.businessOwner.name if exists (else freelance), order.createdBy.name, order.distance, (sum of order.order_stops.total_price + order.totalCost), order.total_cost, order.totalCost * 10% as service fee, paymentMethod (if there is order_stops.totalPrice then get order.order_stops.paymentMethods), paymentStatus(always Completed)
      // if startDate given and endDate not get from startDate to now, if endDate given and startDate not get from beginning to endDate, if both given get between them, if none get all completed orders
      const completedOrders = await this.orderRepository.find({
        where: {
          status: OrderStatus.COMPLETED,
          serviceSubcategory: serviceType ? { name: serviceType } : undefined,
          pickUpDate: startDate && endDate ? Between(startDate, endDate) : startDate ? MoreThanOrEqual(startDate) : endDate ? LessThanOrEqual(endDate) : undefined,
          createdBy: userId ? { id: userId } : undefined
        },
        order: { createdAt: "DESC" },
        relations: ["driver", "driver.businessOwner", "createdBy", "stops"]
      });
      let totalSales = 0;
      let totalDeliveryFees = 0;
      let totalServiceFees = 0;
      let totalCashDeliveryFees = 0;
      let totalOnlineDeliveryFees = 0;
      let totalCardOnDeliveryPayments = 0;
      let bankFee = 0;

      const orders = completedOrders.map(order => {
        // Only include stops that are not canceled and not returned
        const validStops = order.stops.filter(stop => stop.status !== OrderStatus.CANCELED && !stop.isReturned);
        const orderTotalPrice = validStops.length === 0
          ? Number(order.totalCost)
          : validStops.reduce((sum, stop) => sum + (Number(stop.totalPrice) || 0) + (Number(stop.deliveryFee) || 0), 0) + Number(order.totalCost);
        const serviceFee = Number(order.totalCost) * env.SERVICE_FEE_PERCENTAGE / 100;
        totalSales += orderTotalPrice;
        totalDeliveryFees += Number(order.totalCost);
        totalServiceFees += serviceFee;
        if (order.stops.some(stop => stop.totalPrice) || order.paymentMethod !== PaymentMethod.CASH_ON_DELIVERY) {
          totalOnlineDeliveryFees += Number(order.totalCost);
        } else {
          totalCashDeliveryFees += Number(order.totalCost);
        }
        //CHECK payment method for each stop if totalPrice exists, if payment method is CARD_ON_DELIVERY then add to cardOnDeliveryPayments
        // if no stops have payment method but have totalPrice, check order payment method and if it's CARD_ON_DELIVERY then add totalPrice to cardOnDeliveryPayments
        const cardOnDeliveryPayments = validStops
          .filter(stop => stop.totalPrice && (stop.paymentMethod ?? order.paymentMethod) === PaymentMethod.CARD_ON_DELIVERY)
          .reduce((sum, stop) => sum + Number(stop.totalPrice) + (Number(stop.deliveryFee) || 0), 0);
        
        totalCardOnDeliveryPayments += cardOnDeliveryPayments;
          
        //get bankFee Percentage from user pricing table using order.createdBy
        const bankFeePercentage = Number(order.bankFeePercentage) || 0;
        if (bankFeePercentage > 0) console.log(`Card on delivery payments for order ${order.orderNo}: ${cardOnDeliveryPayments}`);
        bankFee += (cardOnDeliveryPayments * bankFeePercentage) / 100;
        return {
          orderNo: order.orderNo,
          pickUpDate: order.pickUpDate,
          completedAt: order.completedAt,
          driverName: order.driver?.name || 'N/A',
          vehicleType: order.vehicleType || 'N/A',
          logisticsCompany: order.driver?.businessOwner ? order.driver.businessOwner.name : 'Freelance',
          createdBy: order.createdBy.name,
          distance: order.distance,
          totalAmount: orderTotalPrice,
          deliveryFee: Number(order.totalCost),
          serviceFee: serviceFee,
          //if stops have totalPrice, get paymentMethods from all stops (each stop can have different paymentMethod), else use order.paymentMethod
          paymentMethod: order.stops.some(stop => stop.totalPrice) ?
            //check if at least one stop has paymentMethod then get unique payment methods from all stops, else use order.paymentMethod
            (order.stops.some(stop => stop.paymentMethod) ?
              Array.from(new Set(order.stops.map(stop => stop.paymentMethod).filter(method => method !== null)))
              : [order.paymentMethod])
            : [order.paymentMethod],
          paymentStatus: 'Completed',
          cardOnDeliveryPayments: cardOnDeliveryPayments,
          bankFee: (cardOnDeliveryPayments * bankFeePercentage) / 100
        }
      });

      return {
        totalSales,
        totalDeliveryFees,
        totalServiceFees,
        totalCashDeliveryFees,
        totalOnlineDeliveryFees,
        totalCardOnDeliveryPayments,
        bankFee,
        orders
      };
    } catch (err) {
      console.error(err.message)
      throw new Error(`Error getting orders financials: ${err.message}`)
    }
  }

  async getOrdersSummary(
    driverId: string, 
    serviceType?: ServiceSubcategoryName,
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      // i want to get driver cash balance, driver income from driver table
      //  then get total number of completed orders and their complete order details
      const completedOrders = await this.orderRepository.find({
        where: {
          driver: { id: driverId },
          serviceSubcategory: serviceType ? { name: serviceType } : undefined,
          status: OrderStatus.COMPLETED,
          pickUpDate: startDate && endDate ? Between(startDate, endDate) : startDate ? MoreThanOrEqual(startDate) : endDate ? LessThanOrEqual(endDate) : undefined,
          createdBy: userId ? { id: userId } : undefined
        },
        relations: [
          "sender", "fromAddress", "serviceSubcategory", "orderStatusHistory",
          "orderStatusHistory.orderStop", "orderStatusHistory.driver",
          "driver", "driver.vehicle", "shipment", "createdBy",
          "cancellationRequests", "cancellationRequests.driver",
          "stops", "stops.receiver", "stops.toAddress",
        ],
        order: {
          createdAt: "DESC",
        },
      });
      const driver = await this.driverService.findDriverById(driverId, 'order summary');
      if (!driver) {
        throw new Error(`Driver with ID ${driverId} not found`);
      }
      let totalPaidAmount = 0;
      let cardOnDeliveryPayments = 0;
      // i just want the totalPaidAmount returned as well
      completedOrders.forEach(order => {
        const validStops = order.stops.filter(stop => stop.status !== OrderStatus.CANCELED && !stop.isReturned);
        const orderTotalPrice = validStops.length === 0
          ? Number(order.totalCost)
          : validStops.reduce((sum, stop) => sum + (Number(stop.totalPrice) || 0) + (Number(stop.deliveryFee) || 0), 0) + Number(order.totalCost);
        totalPaidAmount += orderTotalPrice;
        cardOnDeliveryPayments += validStops.reduce((sum, stop) => sum + (stop.paymentMethod === PaymentMethod.CARD_ON_DELIVERY ? (Number(stop.totalPrice) || 0) + (Number(stop.deliveryFee) || 0) : 0), 0);
      });

      console.log(`Total paid amount for driver ${driverId}: ${totalPaidAmount}`);

      return {
        cashBalance: Number(driver.cashBalance),
        income: Number(driver.income),
        totalPaidAmount,
        cardOnDeliveryPayments,
        orderCount: completedOrders.length,
        completedOrders: await Promise.all(
          completedOrders.map(order => toOrderResponseDto(order))
        )
      };
    }
    catch (err) {
      console.error(err.message)
      throw new Error(`Error getting orders summary: ${err.message}`)
    }
  }

  async getUnassignedOrders(serviceType?: ServiceSubcategoryName, thresholdMinutes?: number) {
    try {
      const now = new Date();
      const unassignedOrders = await this.orderRepository
        .find({
          where: {
            status: OrderStatus.PENDING,
            serviceSubcategory: serviceType ? { name: serviceType } : undefined,
            pickUpDate: thresholdMinutes ? LessThan(new Date(now.getTime() - thresholdMinutes * 60000)) : undefined
          },
          relations: ["fromAddress", "sender", "stops", "stops.toAddress", "stops.receiver", "serviceSubcategory"],
          order: { createdAt: "ASC" }
        });

      return await Promise.all(
        unassignedOrders.map(order => toOrderResponseDto(order))
      );
    } catch (err) {
      console.error(err.message);
      throw new Error(`Error getting unassigned orders: ${err.message}`);
    }
  }

  async uploadProofOfPickup(orderId: string, driverId: string, proofOfPickupUrl: string) {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId, driver: { id: driverId } },
        relations: ["stops", "stops.toAddress", "stops.receiver"]
      });

      if (!order) {
        throw new Error(`Order with ID ${orderId} not found for driver ${driverId}`);
      }

      order.proofOfPickup = proofOfPickupUrl.split("image/upload/")[1];
      await this.orderRepository.save(order);
      console.log(`Proof of pickup uploaded for order ${orderId} by driver ${driverId}`);
    } catch (error) {
      console.error("Error uploading proof of pickup:", error.message);
      throw new Error(`Could not upload proof of pickup: ${error.message}`);
    }
  }

  async startReturn(orderId: string, driverId: string, stopId: string) {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId, driver: { id: driverId } },
        relations: ["stops", "stops.toAddress", "stops.receiver"]
      });
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found for driver ${driverId}`);
      }
      const stop = order.stops.find(s => s.id === stopId);
      if (!stop) {
        throw new Error(`Stop with ID ${stopId} not found in order ${orderId}`);
      }
      if (stop.status == OrderStatus.COMPLETED) {
        throw new Error(`Stop with ID ${stopId} is completed and cannot be returned`);
      }

      if (stop.status !== OrderStatus.RETURNING) {
        stop.status = OrderStatus.RETURNING;
        await this.orderRepository.save(order);
        console.log(`Return started for stop ${stopId} in order ${orderId} by driver ${driverId}`);
      }
      console.log(`adding started at record for returning stop`)
      await this.orderStatusHistoryService.createOrderStatusHistory({ order, stopId, returnedStartedAt: new Date() });
    } catch (error) {
      console.error("Error in order service starting return:", error.message);
      throw new Error(`Error starting return: ${error.message}`);
    }
  }

  async completeReturn(orderId: string, driverId: string, stopId: string, proofOfReturnUrl: string) {
    console.log(`Completing return for orderId: ${orderId}, driverId: ${driverId}, stopId: ${stopId}`);
    const queryRunner = this.orderRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId, driver: { id: driverId } },
        relations: ["stops", "stops.toAddress", "stops.receiver", "driver"]
      });
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found for driver ${driverId}`);
      }
      if (order.status === OrderStatus.COMPLETED) {
        throw new Error(`Order with ID ${orderId} is already completed`);
      }
      const stop = order.stops.find(s => s.id === stopId);
      if (!stop) {
        throw new Error(`Stop with ID ${stopId} not found in order ${orderId}`);
      }
      if (stop.status == OrderStatus.COMPLETED) {
        throw new Error(`Stop with ID ${stopId} is completed and cannot be returned`);
      }

      stop.status = OrderStatus.COMPLETED;
      stop.proofOfReturn = proofOfReturnUrl.split("image/upload/")[1];
      stop.isReturned = true;
      await queryRunner.manager.save(OrderStop, stop);
      console.log(`Return completed for stop ${stopId} in order ${orderId} by driver ${driverId}`);
      await this.orderStatusHistoryService.updateOrderStatusHistory({ order, stopId, queryRunner, returnedCompletedAt: new Date() });
      await this.finalizeOrderCompletion(order, driverId, stop, queryRunner, true);
      await queryRunner.commitTransaction();
    } catch (error) {
      console.error("Error in completing return:", error.message);
      await queryRunner.rollbackTransaction();
      throw new Error(`Error completing return: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async cancelOrReturnStop(orderId: string, stopId: string, action: string, reason: string) {
    const queryRunner = this.orderRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        relations: ["stops", "stops.toAddress", "stops.receiver", "driver"]
      });
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      const stop = order.stops.find(s => s.id === stopId);
      if (!stop) {
        throw new Error(`Stop with ID ${stopId} not found in order ${orderId}`);
      }
      if (stop.status === OrderStatus.COMPLETED) {
        throw new Error(`Stop with ID ${stopId} is completed and cannot be canceled or returned`);
      }
      if (action === "RETURN_STOP" && stop.status === OrderStatus.RETURNING) {
        throw new Error(`Stop with ID ${stopId} is currently being returned and cannot be returned again`);
      }
      if (action === "CANCEL_STOP" && stop.status === OrderStatus.CANCELED) {
        throw new Error(`Stop with ID ${stopId} is already canceled`);
      }
      let returnedStartedAt: Date | undefined;
      if (action === "CANCEL_STOP") {
        stop.status = OrderStatus.CANCELED;
      } else if (action === "RETURN_STOP") {
        stop.status = OrderStatus.RETURNING;
        returnedStartedAt = new Date();
      } else {
        throw new Error(`Invalid action: ${action}`);
      }
      emitOrderStopUpdate(orderId, order.driver?.id, stopId, stop.status);
      await this.orderStatusHistoryService.createOrderStatusHistory(
        {
          order, stopId, cancellationReason: reason,
          triggeredByAdmin: true, returnedStartedAt,
          queryRunner,
          event: action === "CANCEL_STOP" ? OrderEventType.STOP_CANCELED : OrderEventType.STOP_RETURNED
        }
      );
      await queryRunner.manager.save(OrderStop, stop);
      await this.finalizeOrderCompletion(order, order.driver?.id, stop, queryRunner, true);
    } catch (error) {
      console.error("Error in order service canceling or returning stop:", error.message);
      await queryRunner.rollbackTransaction();
      throw new Error(`Error canceling or returning stop: ${error.message}`);
    } finally {
      await queryRunner.release();
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

  async addAnsarOrder(orderId: string, orderNo: number, status: OrderStatus) {
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId,
        createdBy: { name: "Ansar" },
      },
    });
    if (order) {
      console.log(`added ansar order with order id: ${orderId} orderNo: ${orderNo} status: ${status}`)
      this.ansarOrders.set(orderId, { orderNo, status });
    }
    else {
      console.warn(`Order is not for Ansar`)
    }
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
  async getCompletedOrdersByDateRange(
    startDate: Date,
    endDate: Date,
    businessIds?: string[],
    driverIds?: string[],
    isLate: boolean = false,
    fromStatus?: string,
    toStatus?: string,
    thresholdMinutes?: number,

    page: number = 1,
    limit: number = 10
  ): Promise<{ data: OrderResponseDto[]; total: number; page: number; limit: number }> {
    try {
      const whereClause: any = {
        status: OrderStatus.COMPLETED,
      };
      if (startDate && endDate) {
        whereClause.completedAt = Between(startDate, endDate);
      }
      if (driverIds && driverIds.length > 0) {
        whereClause.driver = { id: In(driverIds) };
      }
      if (businessIds && businessIds.length > 0) {
        whereClause.createdBy = { id: In(businessIds) };
      }

      let [completedOrders, total] = await this.orderRepository.findAndCount({
        where: whereClause,
        relations: [
          "sender", "fromAddress", "serviceSubcategory", "orderStatusHistory", "shipment",
          "orderStatusHistory.orderStop", "orderStatusHistory.driver",
          "stops", "stops.toAddress", "stops.receiver", "driver", "driver.vehicle", "driver.businessOwner", "createdBy"
        ],
        order: {
          completedAt: "DESC"
        },
        skip: (page) * limit,
        take: limit
      });
      completedOrders = isLate ? setIslatestOrderStatus(completedOrders, isLate) : completedOrders;
      if (fromStatus && toStatus && thresholdMinutes !== undefined) {
        completedOrders = intraStatusDuration(completedOrders, fromStatus, toStatus, thresholdMinutes);
      }
      return {
        data: await Promise.all(completedOrders.map(order => toOrderResponseDto(order))),
        total,
        page,
        limit
      };
    } catch (error) {
      console.error("Error fetching completed orders by date range:", error.message);
      throw new Error(`Could not fetch completed orders: ${error.message}`);
    }
  }

  async requestStopCancellationReturn(orderId: string, stopId: string, driverId: string, action: string, reason: string) {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId, driver: { id: driverId } },
        relations: ["stops", "stops.toAddress", "stops.receiver", "driver"]
      });
      if (!order) {
        throw new Error("Order not found or you are not authorized to request stop cancellation/return for this order.");
      }
      if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELED) {
        throw new Error(`Order is already ${order.status}. Cannot request stop cancellation or return.`);
      }
      const stop = order.stops.find(s => s.id === stopId);
      if (!stop) {
        throw new Error("Stop not found for this order.");
      }
      
      if (stop.status === OrderStatus.COMPLETED || stop.status === OrderStatus.CANCELED || stop.status === OrderStatus.RETURNING) {
        throw new Error(`Stop is already ${stop.status}. Cannot request cancellation or return.`);
      }
      
      if (action !== "CANCEL_STOP" && action !== "RETURN_STOP") {
        throw new Error("Invalid action. Must be either CANCEL_STOP or RETURN_STOP.");
      }

      const existingRequest = await this.orderStatusHistoryService.findExistingCancelReturnRequest({
        orderId,
        stopId,
        driverId,
        eventType: action === "CANCEL_STOP" ? [OrderEventType.STOP_CANCELLATION_REQUESTED] : [OrderEventType.STOP_RETURN_REQUESTED],
        requestStatus: CancelRequestStatus.PENDING
      });
      
      if (existingRequest) {
        throw new Error(`There is already an existing ${existingRequest.event === OrderEventType.STOP_CANCELLATION_REQUESTED ? 'cancellation' : 'return'} request for this stop.`);
      }

      return await this.orderStatusHistoryService.createOrderStatusHistory({
        order,
        stopId,
        cancellationReason: reason,
        event: action === "CANCEL_STOP" ? OrderEventType.STOP_CANCELLATION_REQUESTED : OrderEventType.STOP_RETURN_REQUESTED,
        requestStatus: CancelRequestStatus.PENDING
      });
    } catch (error) {
      console.error("Error in order service requesting stop cancellation or return:", error.message);
      throw new Error(`Failed to request stop cancellation or return: ${error.message}`);
    }
  }

  async processStopCancellationReturn(historyId: string, action: string, reason: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const historyRecord = await queryRunner.manager.findOne(OrderStatusHistory, {
        where: { id: historyId },
        relations: ["order", "order.driver", "order.stops", "orderStop"]
      });
      
      if (!historyRecord) {
        throw new Error("Order status history record not found.");
      }

      if (historyRecord.requestStatus !== CancelRequestStatus.PENDING) {
        throw new Error("This cancellation or return request has already been processed.");
      }
      
      if (action !== "APPROVE" && action !== "DECLINE") {
        throw new Error("Invalid action. Must be either APPROVE or DECLINE.");
      }

      await queryRunner.manager.update(OrderStatusHistory, historyId, {
        requestStatus: action === 'APPROVE' ? CancelRequestStatus.APPROVED : CancelRequestStatus.DECLINED,
      });

      const isReturn = historyRecord.event === OrderEventType.STOP_RETURN_REQUESTED;
      
      await this.orderStatusHistoryService.createOrderStatusHistory({
        order: historyRecord.order,
        stopId: historyRecord.orderStop.id,
        cancellationReason: reason,
        triggeredByAdmin: true,
        queryRunner,
        event: action === 'APPROVE'
        ? (isReturn ? OrderEventType.STOP_RETURN_APPROVED : OrderEventType.STOP_CANCELLATION_APPROVED)
        : (isReturn ? OrderEventType.STOP_RETURN_REJECTED : OrderEventType.STOP_CANCELLATION_REJECTED)
      });
      
      const newStatus = isReturn ? OrderStatus.RETURNING : OrderStatus.CANCELED;
      
      if (action === 'APPROVE') {
        await queryRunner.manager.update(OrderStop, historyRecord.orderStop.id, {
          status: newStatus,
        });
        await this.finalizeOrderCompletion(historyRecord.order, historyRecord.order.driver?.id, historyRecord.orderStop, queryRunner, true);
      }
      emitOrderStopUpdate(historyRecord.order.id, historyRecord.order.driver?.id, historyRecord.orderStop.id, newStatus, );
      await queryRunner.commitTransaction();
    } catch (error) {
      console.error("Error processing stop cancellation or return:", error.message);
      await queryRunner.rollbackTransaction();
      throw new Error(`Failed to process stop cancellation or return: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }
}
