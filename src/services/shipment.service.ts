import { Service } from "typedi";
import { AppDataSource } from "../config/data-source.js";
import { Shipment } from "../models/shipment.model.js";

@Service()
export default class ShipmentService {
    private shipmentRepository = AppDataSource.getRepository(Shipment);

    constructor() {}

    async createShipment(shipmentData: Partial<Shipment>, queryRunner?: any): Promise<Shipment> {
        const shipment = queryRunner.manager.create(Shipment, shipmentData);
        await queryRunner.manager.save(shipment);
        return shipment;
    }
}
