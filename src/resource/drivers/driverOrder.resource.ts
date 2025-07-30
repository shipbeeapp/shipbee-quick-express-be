import { itemType } from "../../utils/enums/itemType.enum.js";

export class DriverOrderResource {
    orderId: string;
    itemType: itemType;
    totalCost: number;
    distance: number;
    fromAddress: string;
    fromCoordinates: string; // Optional field for storing coordinates as a string (e.g., "lat,long")
    additionalFromAddressInfo: string;
    toAddress: string;
    toCoordinates: string; // Optional field for storing coordinates as a string (e.g., "lat,long")
    additionalToAddressInfo: string;
    // distanceToPickup: number;
    // timeToPickup: number;
}

export function createDriverOrderResource(order: any): DriverOrderResource {
    const resource = new DriverOrderResource();
    resource.orderId = order.id;
    resource.itemType = order.itemType;
    resource.totalCost = order.totalCost;
    resource.distance = order.distance;
    resource.fromAddress = order.fromAddress.city;
    resource.fromCoordinates = order.fromAddress.coordinates;
    resource.additionalFromAddressInfo = order.fromAddress.landmarks;
    resource.toAddress = order.toAddress.city;
    resource.toCoordinates = order.toAddress.coordinates;
    resource.additionalToAddressInfo = order.toAddress.landmarks;
    // resource.distanceToPickup = distanceToPickup;
    // resource.timeToPickup = timeToPickup;
    return resource;
}

