import { Order } from '../../models/order.model.js';
import { env } from '../../config/environment.js';
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
    vehicleId: string | null;
  
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
    };
  
    statusHistory: {
      status: string;
      timestamp: Date;
    }[];
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
      vehicleId: order.vehicle?.id || null,
      sender: {
        id: order.sender?.id,
        name: order.sender?.name,
        email: order.sender?.email,
        phoneNumber: order.sender?.phoneNumber,
      },
      receiver: {
        id: order.sender?.id,
        name: order.sender?.name,
        email: order.sender?.email,
        phoneNumber: order.sender?.phoneNumber,
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
      },
      statusHistory: order.orderStatusHistory?.map(status => ({
        status: status.status,
        timestamp: status.createdAt,
      })),
    };
  }
  