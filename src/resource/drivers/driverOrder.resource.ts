import { itemType } from "../../utils/enums/itemType.enum.js";
import { PaymentMethod } from "../../utils/enums/paymentMethod.enum.js";
import { env } from "../../config/environment.js";

export class DriverOrderResource {
    orderId: string;
    itemType: itemType;
    itemDescription?: string;
    itemImages?: string[];
    paymentMethod: PaymentMethod;
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
}

export function createDriverOrderResource(order: any, distanceToPickup: number, timeToPickup: number): DriverOrderResource {
    const resource = new DriverOrderResource();
    resource.orderId = order.id;
    resource.itemType = order.itemType;
    const itemDescription = order.itemDescription ? JSON.parse(order.itemDescription) : null;
    if (itemDescription) {
        resource.itemDescription = itemDescription.text ? itemDescription.text : null;
        resource.itemImages = itemDescription.images ? itemDescription.images.map((img: string) => `${env.CLOUDINARY_BASE_URL}${img}`) : [];
    }
    resource.paymentMethod = order.paymentMethod;
    resource.totalCost = order.totalCost;
    resource.distance = order.distance;
    resource.fromAddress = order.fromAddress.city;
    resource.fromCoordinates = order.fromAddress.coordinates;
    resource.additionalFromAddressInfo = order.fromAddress.landmarks;
    resource.toAddress = order.toAddress.city;
    resource.toCoordinates = order.toAddress.coordinates;
    resource.additionalToAddressInfo = order.toAddress.landmarks;
    resource.senderName = order.sender.name;
    resource.senderPhoneNumber = order.sender.phoneNumber;
    resource.receiverName = order.receiver.name;
    resource.receiverPhoneNumber = order.receiver.phoneNumber;
    resource.distanceToPickup = distanceToPickup;
    resource.timeToPickup = timeToPickup;
    return resource;
}

