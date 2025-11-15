import { Order } from '../../models/order.model.js';
import { env } from '../../config/environment.js';
import { VehicleType } from '../../utils/enums/vehicleType.enum.js';
import { CancelRequestStatus } from '../../utils/enums/cancelRequestStatus.enum.js';
import { Payer } from '../../utils/enums/payer.enum.js';
import { itemType } from '../../utils/enums/itemType.enum.js';
import { OrderStatus } from '../../utils/enums/orderStatus.enum.js';
import { OrderType } from '../../utils/enums/orderType.enum.js';
export class OrderResponseDto {
    id: string;
    pickUpDate: Date;
    type: OrderType;
    // itemType: string;
    // itemDescription: string | null;
    lifters: number;
    distance: number;
    totalCost: number;
    currentStatus: string;
    createdAt: Date;
    updatedAt: Date;
    orderNo: number;
    vehicleType: VehicleType;
    payer: Payer;
    isViewed: boolean;
    viewedAt: Date | null;
  
    sender: {
      id: string;
      name: string;
      email: string;
      phoneNumber: string;
    };
  
    receiver?: {
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
  
    stops: {
      receiver: {
        id: string;
        name: string;
        email: string;
        phoneNumber: string;
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
      itemDescription: {
        text: string;
        images: string[];
      };
      sequence: number;
      distance?: number;
      itemType?: itemType;
      status: OrderStatus;
  }[];
  
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
    const stops = order.stops?.map(stop => {
    let itemDesc;
    try {
      itemDesc = stop.itemDescription ? JSON.parse(stop.itemDescription) : { text: "", images: [] };
      itemDesc.images = itemDesc.images.map((img: string) => `${env.CLOUDINARY_BASE_URL}${img}`);
    } catch {
      itemDesc = { text: stop.itemDescription || "", images: [] };
    }

    return {
      receiver: {
        id: stop.receiver?.id,
        name: stop.receiver?.name,
        email: stop.receiver?.email,
        phoneNumber: stop.receiver?.phoneNumber,
      },
      toAddress: {
        country: stop.toAddress.country,
        city: stop.toAddress.city,
        district: stop.toAddress.district,
        street: stop.toAddress.street,
        buildingNumber: stop.toAddress.buildingNumber,
        floor: stop.toAddress.floor,
        apartmentNumber: stop.toAddress.apartmentNumber,
        zone: stop.toAddress.zone,
        landmarks: stop.toAddress.landmarks,
        coordinates: stop.toAddress.coordinates,
      },
      itemDescription: {
        text: itemDesc.text || "",
        images: itemDesc.images || [],
      },
      sequence: stop.sequence,
      distance: stop.distance,
      itemType: stop.itemType,
      status: stop.status,
    };
  }) || [];
    return {
      id: order.id,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      orderNo: order.orderNo,
      pickUpDate: order.pickUpDate,
      type: order.type,
      // itemType: order.itemType,
      // itemDescription: itemDescription,
      lifters: order.lifters,
      distance: order.distance,
      totalCost: Number(order.totalCost),
      currentStatus: order.status,
      vehicleType: order.vehicleType,
      payer: order.payer,
      isViewed: order.isViewed,
      viewedAt: order.viewedAt,
      sender: {
        id: order.sender?.id,
        name: order.sender?.name,
        email: order.sender?.email,
        phoneNumber: order.sender?.phoneNumber,
      },
      stops,
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
      // toAddress: {
      //   country: order.toAddress.country,
      //   city: order.toAddress.city,
      //   district: order.toAddress.district,
      //   street: order.toAddress.street,
      //   buildingNumber: order.toAddress.buildingNumber,
      //   floor: order.toAddress.floor,
      //   apartmentNumber: order.toAddress.apartmentNumber,
      //   zone: order.toAddress.zone,
      //   landmarks: order.toAddress.landmarks,
      //   coordinates: order.toAddress.coordinates,
      // },
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
      } : order.deletedDriverData ? {
        id: null,
        name: JSON.parse(order.deletedDriverData).name,
        phoneNumber: JSON.parse(order.deletedDriverData).phoneNumber,
        vehicle: {
          type: JSON.parse(order.deletedDriverData).vehicleType,
          model: JSON.parse(order.deletedDriverData).vehicleModel,
          number: JSON.parse(order.deletedDriverData).vehicleNumber,
        },
      }: null,
    };
  }
  