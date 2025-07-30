import { itemType } from "../../utils/enums/itemType.enum.js";

export class DriverOrderResource {
    orderId: string;
    itemType: itemType;
    totalCost: number;
    distance: number;
    fromAddress: string;
    additionalFromAddressInfo: string;
    toAddress: string;
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
    resource.fromAddress = order.fromAddress.city
    resource.additionalFromAddressInfo = order.fromAddress.landmarks;
    resource.toAddress = order.toAddress.city;
    resource.additionalToAddressInfo = order.toAddress.landmarks;
    // resource.distanceToPickup = distanceToPickup;
    // resource.timeToPickup = timeToPickup;
    return resource;
}

