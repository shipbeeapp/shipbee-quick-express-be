import { Order } from '../../models/order.model.js';
export class OrderResponseDto {
    id: string;
    pickUpDate: Date;
    itemType: string;
    itemDescription: string | null;
    lifters: number;
    totalCost: number;
    currentStatus: string;
    createdAt: Date;
  
    user: {
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
    return {
      id: order.id,
      pickUpDate: order.pickUpDate,
      itemType: order.itemType,
      itemDescription: order.itemDescription,
      lifters: order.lifters,
      totalCost: Number(order.totalCost),
      currentStatus: order.status,
      createdAt: order.createdAt,
      user: {
        id: order.user.id,
        name: order.user.name,
        email: order.user.email,
        phoneNumber: order.user.phoneNumber,
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
      statusHistory: order.orderStatusHistory.map(status => ({
        status: status.status,
        timestamp: status.createdAt,
      })),
    };
  }
  