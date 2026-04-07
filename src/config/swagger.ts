import path from "path";
import { fileURLToPath } from "url";
import { Application } from "express";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { PaymentMethod } from "../utils/enums/paymentMethod.enum.js";
import { itemType } from "../utils/enums/itemType.enum.js";
import {env} from "./environment.js"

/**
 * Fix for __dirname in ES modules
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverUrl = {
  development: "https://api.staging.shipbee.io",
  production: "https://api.shipbee.io",
  local: "http://localhost:7501"
}[env.APP_ENV] // default fallback
/**
 * Step 1: Define the basic Swagger info
 */
console.log({ serverUrl });

const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
        title: "My Node.js API",
        version: "1.0.0",
        description: "API documentation generated with Swagger",
    },
    servers: [
        { url: "https://api.staging.shipbee.io", description: "Staging server" },
        { url: "https://api.shipbee.io", description: "Production server" }
    ],

    /**
     * Step 4: Define all schemas (DTOs) in components.schemas
     */
    components: {
        securitySchemes: {
            ApiKeyAuth: {
              type: "apiKey",
              in: "header",
              name: "x-api-key",
            },
        },
        schemas: {
            AddressDto: {
                type: "object",
                properties: {
                    country: { type: "string" },
                    city: { type: "string" },
                    street: { type: "string" },
                    buildingNumber: { type: "string"},
                    floor: { type: "string" },
                    apartmentNumber: {type: "string"},
                    landmarks: { type: "string" },
                    zone: { type: "string" },
                    coordinates: { type: "string" }
                },
                required: ["coordinates"],
            },
            ShipmentDto: {
                type: "object",
                properties: {
                    shipmentId: { type: "string" },
                    weight: { type: "number" },
                    carrier: { type: "string" },
                },
                required: ["shipmentId", "weight"],
            },
            OrderStop: {
                type: "object",
                properties: {
                    receiverName: { type: "string" },
                    receiverPhoneNumber: {type: "string"},
                    receiverEmail: {type: "string", format: "email", nullable: true, default: "user@gmail.com"},
                    toAddress: { $ref: "#/components/schemas/AddressDto"},
                    itemDescription: { type: "string"},
                    sequence: {type: "number"},
                    items: { type: "string", default: `[{"name": "Shoes", "price": 100}]`},
                    itemType: { type: "string", enum: itemType, default: "Gifts"},
                    totalPrice: { type: "number" },
                    paymentMethod: {
                        type: "string",
                        enum: PaymentMethod,
                        default: PaymentMethod.CASH_ON_DELIVERY
                    },
                    clientStopId: { type: "string" },
                    comments: {type: "string", nullable: true},
                    deliveryFee: { type: "number" }
                },
                required: ["receiverName", "receiverPhoneNumber", "itemType", "sequence", "totalPrice", "paymentMethod"],
            },
            CreateOrderDto: {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        enum: ["SINGLE_STOP", "MULTI_STOP"],
                        description: "Order type (single or multiple delivery stops)",
                        example: "SINGLE_STOP",
                    },
                    serviceSubcategory: {
                        type: "string",
                        enum: ["Personal - Quick", "International"]
                    },
                    senderName: { type: "string" },
                    senderPhoneNumber: { type: "string" },
                    senderEmail: { type: "string", format: "email", nullable: true, default: "user@mail.com" },
                    vehicleType: {
                        type: "string",
                        enum: [
                            "Motorcycle", 
                            "Sedan Car", 
                            "Pickup Truck 2 Tons", 
                            "Pickup Truck 3 Tons",
                            "Chiller Truck",
                            "Van",
                            "Freezer Truck",
                            "Canter Truck",
                            "Flat Bed Trailer",
                            "Low Bed Trailer",
                            "Garbage Removal Truck",
                            "Chiller Van",
                            "Freezer Van"
                        ]
                    },
                    pickUpDate: { type: "string", format: "date-time", nullable: true },
                    lifters: { type: "number", nullable: true },
                    distance: { type: "number", default: 10 },
                    fromAddress: { $ref: "#/components/schemas/AddressDto" },
                    paymentMethod: {
                        type: "string",
                        enum: ["CASH_ON_DELIVERY", "CREDIT_DEBIT", "WALLET", "CARD_ON_DELIVERY"],
                        nullable: true,
                    },
                    paymentStatus: {
                        type: "string",
                        enum: [
                            "pending",
                            "successful",
                            "failed",
                            "refunded",
                            "canceled"
                        ],
                        nullable: true,
                    },
                    payer: {
                        type: "string",
                        enum: [
                            "SENDER",
                            "RECEIVER"
                        ],
                        nullable: true,
                    },
                    stops: {
                        type: "array",
                        items: { $ref: "#/components/schemas/OrderStop" },
                    },
                },
                required: ["serviceSubcategory", "senderName", "senderPhoneNumber", "fromAddress", "vehicleType"],
            },
            ViewOrderStatusQuery: {
                type: "object",
                properties: {
                    orderId: { type: "string", description: "Client stop ID to fetch the order status" },
                },
                required: ["orderId"],
            },
            DriverDto: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    phoneNumber: { type: "string" },
                    profilePicture: { type: "string", nullable: true },
                    qid: { type: "string", nullable: true },
                    licenseFront: { type: "string", nullable: true },
                    licenseBack: { type: "string", nullable: true },
                    currentLocation: {
                        type: "object",
                        properties: {
                            lat: { type: "number" },
                            lng: { type: "number" },
                        },
                    },
                },
            },
            OrderStatusDto: {
                type: "object",
                properties: {
                    orderId: { type: "string" },
                    status: { type: "string" },
                    amount: { type: "number", nullable: true },
                    deliveryFee: { type: "number", nullable: true },
                    driver: { $ref: "#/components/schemas/DriverDto", nullable: true },
                },
            },
            OrderStatusResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/OrderStatusDto" },
                },
            },
            /**
             * ✅ Response schemas
             */
            OrderDto: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    orderNo: { type: "number" },
                    pickUpDate: { type: "string", format: "date-time", nullable: true },
                    vehicleType: { type: "string", enum: ["CAR", "TRUCK", "MOTORCYCLE"], nullable: true },
                    totalCost: { type: "number" },
                    paymentStatus: { type: "string", enum: ["PAID", "PENDING", "FAILED"] },
                    paymentMethod: { type: "string", enum: ["CASH", "CARD", "ONLINE"] },
                    status: { type: "string" },
                    stops: { type: "array", items: { $ref: "#/components/schemas/OrderStop" } },
                    sender: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            phoneNumber: { type: "string" },
                            email: { type: "string", format: "email", nullable: true },
                        },
                    },
                },
            },
            OrderResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/OrderDto" },
                },
            },
            OrderReportResponse: {
                type: "object",
                properties: {
                    success: {type: "boolean"},
                    data: {
                        type: "object",
                        properties: {
                            totalOrders: { type: "number"},
                            avgDistancePerOrder: { type: "number"},
                            avgDurationMinutesPerOrder: {type: "number"}
                        }
                    }
                }
            }, 
            ErrorResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", default: false },
                    message: { type: "string",  },
                },
            },
        },
    },
};

/**
 * Step 2: Options for swagger-jsdoc
 */
const options = {
    swaggerDefinition,
    apis: [
        path.join(__dirname, "../controllers/*.{js,ts}")
    ],
};

/**
 * Step 3: Generate Swagger spec
 */
const swaggerSpec = swaggerJSDoc(options);

/**
 * Step 5: Setup Swagger route
 */
export const setupSwagger = (app: Application) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
