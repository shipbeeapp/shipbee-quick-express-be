import { itemType } from "../../utils/enums/itemType.enum.js";
import { PaymentMethod } from "../../utils/enums/paymentMethod.enum.js";
import { env } from "../../config/environment.js";
import { Payer } from "../../utils/enums/payer.enum.js";
import { OrderType } from "../../utils/enums/orderType.enum.js";


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
}
export class DriverOrderResource {
    orderId: string;
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
    lifters: number | null;
    payer: Payer;
    stops: DriverOrderStopResource[];
}

export function createDriverOrderResource(order: any, distanceToPickup: number, timeToPickup: number): DriverOrderResource {
    const resource = new DriverOrderResource();
    resource.orderId = order.id;
    resource.itemType = order.itemType;
    resource.paymentMethod = order.paymentMethod;
    resource.totalCost = order.totalCost;
    resource.distance = order.distance;
    resource.type = order.type;
    resource.fromAddress = order.fromAddress?.city;
    resource.fromCoordinates = order.fromAddress.coordinates;
    resource.additionalFromAddressInfo = order.fromAddress.landmarks;
    // resource.toAddress = order.toAddress.city;
    // resource.toCoordinates = order.toAddress.coordinates;
    // resource.additionalToAddressInfo = order.toAddress.landmarks;
    resource.senderName = order.sender.name;
    resource.senderPhoneNumber = order.sender.phoneNumber;
    // resource.receiverName = order.receiver.name;
    // resource.receiverPhoneNumber = order.receiver.phoneNumber;
    resource.distanceToPickup = distanceToPickup;
    resource.timeToPickup = timeToPickup;
    resource.lifters = order.lifters;
    resource.payer = order.payer;
    // Map each stop
    resource.stops = order.stops?.map((stop: any) => {
        const stopDesc = stop.itemDescription ? JSON.parse(stop.itemDescription) : null;
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
            receiverPhoneNumber: stop.receiver?.phoneNumber
        };
    }) || [];
    return resource;
}

