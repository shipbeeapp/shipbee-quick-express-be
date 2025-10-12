import { Order } from '../../models/order.model.js';
import { env } from '../../config/environment.js';
import { VehicleType } from '../../utils/enums/vehicleType.enum.js';
import { CancelRequestStatus } from '../../utils/enums/cancelRequestStatus.enum.js';
export class OrderResponseDto {
    id: string;
    pickUpDate: Date;
    itemType: string;
    itemDescription: string | null;
    lifters: number;
    distance: number;
    totalCost: number;
    currentStatus: string;
    createdAt: Date;
    updatedAt: Date;
    orderNo: number;
    vehicleType: VehicleType;
  
    sender: {
      id: string;
      name: string;
      email: string;
      phoneNumber: string;
    };
  
    receiver: {
      id: string;
      name: string;
      email: string;
      phoneNumber: string;
    };

    serviceSubcategory: {
      id: string;
      name: string;
      type: string;
    };
  
    fromAddress: {
      country: string;
      city: string;
      district?: string;
      street?: string;
      buildingNumber: string;
      floor: number;
      apartmentNumber: string;
      zone?: string;
      landmarks?: string;
      coordinates: string;
    };
  
    toAddress: {
        country: string;
        city: string;
        district?: string;
        street?: string;
        buildingNumber: string;
        floor: number;
        apartmentNumber: string;
        zone?: string;
        landmarks?: string;
        coordinates: string;
    };
  
    statusHistory: {
      status: string;
      timestamp: Date;
    }[];

    shipment: {
      weight?: number;
      length?: number;
      width?: number;
      height?: number;
      itemCount?: number;
      totalValue?: number;
  }
  cancellationRequests?: {
    id: string;
    status: CancelRequestStatus;
    updatedAt: Date;
    driver: {
      name: string;
      phoneNumber: string;
    }
  }[];

    driver?: {
      id: string;
      name: string;
      phoneNumber: string;
      vehicle?: {
        type: VehicleType;
        model: string;
        number: string;
      }
    } | null;
}

  export function toOrderResponseDto(order: Order): OrderResponseDto {
    const itemDescription = JSON.parse(order.itemDescription) || null;
    if (itemDescription?.images?.length) {
        itemDescription.images = itemDescription?.images?.map(
          (img: string) => `${env.CLOUDINARY_BASE_URL}${img}`
        );
    }
    return {
      id: order.id,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      orderNo: order.orderNo,
      pickUpDate: order.pickUpDate,
      itemType: order.itemType,
      itemDescription: itemDescription,
      lifters: order.lifters,
      distance: order.distance,
      totalCost: Number(order.totalCost),
      currentStatus: order.status,
      vehicleType: order.vehicleType,
      sender: {
        id: order.sender?.id,
        name: order.sender?.name,
        email: order.sender?.email,
        phoneNumber: order.sender?.phoneNumber,
      },
      receiver: {
        id: order.receiver?.id,
        name: order.receiver?.name,
        email: order.receiver?.email,
        phoneNumber: order.receiver?.phoneNumber,
      },
      serviceSubcategory: {
        id: order.serviceSubcategory.id,
        name: order.serviceSubcategory.name,
        type: order.serviceSubcategory.type,
      },
      fromAddress: {
        country: order.fromAddress.country,
        city: order.fromAddress.city,
        district: order.fromAddress.district,
        street: order.fromAddress.street,
        buildingNumber: order.fromAddress.buildingNumber,
        floor: order.fromAddress.floor,
        apartmentNumber: order.fromAddress.apartmentNumber,
        zone: order.fromAddress.zone,
        landmarks: order.fromAddress.landmarks,
        coordinates: order.fromAddress.coordinates,
      },
      toAddress: {
        country: order.toAddress.country,
        city: order.toAddress.city,
        district: order.toAddress.district,
        street: order.toAddress.street,
        buildingNumber: order.toAddress.buildingNumber,
        floor: order.toAddress.floor,
        apartmentNumber: order.toAddress.apartmentNumber,
        zone: order.toAddress.zone,
        landmarks: order.toAddress.landmarks,
        coordinates: order.toAddress.coordinates,
      },
      statusHistory: order.orderStatusHistory?.map(status => ({
        status: status.status,
        timestamp: status.createdAt,
      })),
      shipment: {
        weight: Number(order.shipment?.weight),
        length: Number(order.shipment?.length),
        width: Number(order.shipment?.width),
        height: Number(order.shipment?.height),
        itemCount: Number(order.shipment?.itemCount),
        totalValue: Number(order.shipment?.totalValue),
      },
      cancellationRequests: order.cancellationRequests?.map(request => ({
        id: request.id,
        status: request.status,
        reason: request.reason,
        updatedAt: request.updatedAt,
        driver: {
          name: request.driver?.name,
          phoneNumber: request.driver?.phoneNumber,
        }
      })) || [],

      driver: order.driver ? {
        id: order.driver.id,
        name: order.driver.name,
        phoneNumber: order.driver.phoneNumber,
        vehicle: order.driver.vehicle ? {
          type: order.driver.vehicle.type,
          model: order.driver.vehicle.model,
          number: order.driver.vehicle.number,
        }: null
      } : null,
    };
  }
  