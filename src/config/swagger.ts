import path from "path";
import { fileURLToPath } from "url";
import { Application } from "express";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

/**
 * Fix for __dirname in ES modules
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverUrl = 'https://api.shipbee.io/'
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
        {
            url: serverUrl,
        },
    ],

    /**
     * Step 4: Define all schemas (DTOs) in components.schemas
     */
    components: {
        schemas: {
            AddressDto: {
                type: "object",
                properties: {
                    street: { type: "string" },
                    city: { type: "string" },
                    state: { type: "string" },
                    postalCode: { type: "string" },
                    country: { type: "string" },
                },
                required: ["street", "city", "country"],
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
                    address: { $ref: "#/components/schemas/AddressDto" },
                    stopType: { type: "string" },
                },
                required: ["address"],
            },
            CreateOrderDto: {
                type: "object",
                properties: {
                    vehicleId: { type: "string", nullable: true },
                    serviceSubcategory: {
                        type: "string",
                        enum: ["PERSONAL_QUICK", "INTERNATIONAL"],
                    },
                    senderName: { type: "string" },
                    senderPhoneNumber: { type: "string" },
                    senderEmail: { type: "string", format: "email", nullable: true },
                    pickUpDate: { type: "string", format: "date", nullable: true },
                    distance: { type: "number", nullable: true },
                    fromAddress: { $ref: "#/components/schemas/AddressDto" },
                    toAddress: { $ref: "#/components/schemas/AddressDto", nullable: true },
                    receiverName: { type: "string", nullable: true },
                    receiverPhoneNumber: { type: "string", nullable: true },
                    receiverEmail: { type: "string", format: "email", nullable: true },
                    vehicleType: {
                        type: "string",
                        enum: ["CAR", "TRUCK", "MOTORCYCLE"],
                        nullable: true,
                    },
                    paymentMethod: {
                        type: "string",
                        enum: ["CASH", "CARD", "ONLINE"],
                        nullable: true,
                    },
                    paymentStatus: {
                        type: "string",
                        enum: ["PAID", "PENDING", "FAILED"],
                        nullable: true,
                    },
                    shipment: { $ref: "#/components/schemas/ShipmentDto", nullable: true },
                    orderNo: { type: "number", nullable: true },
                    payer: {
                        type: "string",
                        enum: ["SENDER", "RECEIVER"],
                        nullable: true,
                    },
                    stops: {
                        type: "array",
                        items: { $ref: "#/components/schemas/OrderStop" },
                    },
                    type: {
                        type: "string",
                        enum: ["SINGLE_STOP", "MULTI_STOP"],
                        nullable: true,
                    },
                },
                required: ["serviceSubcategory", "senderName", "senderPhoneNumber", "fromAddress"],
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
                    shipment: { $ref: "#/components/schemas/ShipmentDto", nullable: true },
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
            ErrorResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
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
