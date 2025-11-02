export class myOrderResource {
    totalCost: number;
    distance: number;
    fromAddress: string;
    pickUpDate: string; // Assuming this is a date string
    pickUpTime: string; // Assuming this is a time string
    additionalFromAddressInfo: string;
    toAddress: string;
    additionalToAddressInfo: string;
    senderName: string;
    senderPhoneNumber: string;
    receiverName: string;
    stops: any;
}

export function createMyOrderResource(order: any): myOrderResource {
    const resource = new myOrderResource();
    resource.totalCost = order.totalCost;
    resource.distance = order.distance;
    resource.fromAddress = order.fromAddress.city;
    resource.pickUpDate = order.pickUpDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC" // or your desired timezone
    }); // "07/15/2025"
    resource.pickUpTime = order.pickUpDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC" // or your desired timezone
    }).toLowerCase(); // "6:17 pm"    resource.additionalFromAddressInfo = order.fromAddress.landmarks || '';
    // resource.toAddress = order.toAddress?.city;
    // resource.additionalToAddressInfo = order.toAddress?.landmarks || '';
    resource.stops = order.stops.map((stop: any) => {
        return {
            toAddress: stop.toAddress.city,
            additionalToAddressInfo: stop.toAddress.landmarks || '',
            receiverName: stop.receiver.name,
            sequence: stop.sequence
        };
    });
    resource.senderName = order.sender.name;
    // resource.receiverName = order.receiver.name;
    return resource;
}