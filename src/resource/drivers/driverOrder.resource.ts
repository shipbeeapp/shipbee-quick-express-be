import { itemType } from "../../utils/enums/itemType.enum.js";
import { PaymentMethod } from "../../utils/enums/paymentMethod.enum.js";
import { env } from "../../config/environment.js";
import { Payer } from "../../utils/enums/payer.enum.js";
import { OrderType } from "../../utils/enums/orderType.enum.js";
import { OrderStatus } from "../../utils/enums/orderStatus.enum.js";


export class DriverOrderStopResource {
    stopId: string;
    itemType: itemType;
    itemDescription?: string;
    itemImages?: string[];
    toAddress: string;
    toCoordinates: string;
    additionalToAddressInfo: string;
    receiverName: string;
    receiverPhoneNumber: string;
    status: OrderStatus;
    lifters: number | null;
    items?: any;
    totalPrice?: number
    paymentMethod?: PaymentMethod;
    comments?: string;
    deliveryFee?: number;
}
export class DriverOrderResource {
    orderId: string;
    orderNo: string;
    status: OrderStatus;
    itemType: itemType;
    itemDescription?: string;
    itemImages?: string[];
    paymentMethod: PaymentMethod;
    type: OrderType;
    totalCost: number;
    distance: number;
    fromAddress: string;
    fromCoordinates: string; // Optional field for storing coordinates as a string (e.g., "lat,long")
    additionalFromAddressInfo: string;
    toAddress: string;
    toCoordinates: string; // Optional field for storing coordinates as a string (e.g., "lat,long")
    additionalToAddressInfo: string;
    senderName: string;
    senderPhoneNumber: string;
    receiverName: string;
    receiverPhoneNumber: string;
    distanceToPickup: number;
    timeToPickup: number;
    payer: Payer;
    stops: DriverOrderStopResource[];
    hasReturn?: boolean;
    returnOrderStopId?: string;
}

export function createDriverOrderResource(order: any, distanceToPickup: number, timeToPickup: number, hasReturn: boolean = false, returnOrderStopId: string | null = null): DriverOrderResource {
    const resource = new DriverOrderResource();
    resource.orderId = order.id;
    const orderNo = order.stops[0]?.clientStopId
        ? order.stops.map(stop => stop.clientStopId).join(",")
        : order.orderNo;
    resource.orderNo = orderNo;
    resource.status = order.status;
    resource.itemType = order.itemType;
    resource.paymentMethod = order.paymentMethod;
    const allStopsHaveNoPrice = order.stops?.every(
      stop => !stop.totalPrice
    );

    resource.totalCost = allStopsHaveNoPrice
      ? order.totalCost
      : order.stops.reduce(
          (sum, stop) =>
            sum +
            (stop.totalPrice ?? 0) +
            (stop.deliveryFee ?? 0),
          0
        );
    resource.distance = order.distance;
    resource.type = order.type;
    resource.fromAddress = order.fromAddress?.city ? order.fromAddress?.city: order.fromAddress?.landmarks;
    resource.fromCoordinates = order.fromAddress.coordinates;
    resource.additionalFromAddressInfo = order.fromAddress.landmarks;
    resource.senderName = order.sender.name;
    const senderPhone =  order.sender.phoneNumber ?? null;
    resource.senderPhoneNumber = senderPhone ? senderPhone : null;
    resource.distanceToPickup = distanceToPickup;
    resource.timeToPickup = timeToPickup;
    resource.payer = order.payer;
    resource.hasReturn = hasReturn;
    resource.returnOrderStopId = returnOrderStopId;
    // Map each stop
    resource.stops = order.stops?.map((stop: any) => {
        const stopDesc = stop.itemDescription ? JSON.parse(stop.itemDescription) : null;
        const receiverPhone = stop.receiver?.phoneNumber ?? null;
        return {
            stopId: stop.id,
            sequence: stop.sequence,
            itemType: stop.itemType,
            itemDescription: stopDesc?.text || null,
            itemImages: stopDesc?.images?.map((img: string) => `${env.CLOUDINARY_BASE_URL}${img}`) || [],
            toAddress: stop.toAddress?.city,
            toCoordinates: stop.toAddress?.coordinates,
            additionalToAddressInfo: stop.toAddress?.landmarks,
            receiverName: stop.receiver?.name,
            receiverPhoneNumber: receiverPhone ? receiverPhone : null,
            status: stop.status,
            lifters: stop.lifters,
            items: stop.items,
            totalPrice: stop.totalPrice + (stop.deliveryFee || 0),
            paymentMethod: stop.paymentMethod,
            comments: stop.comments,
            deliveryFee: stop.deliveryFee
        };
    }) || [];
    return resource;
}

