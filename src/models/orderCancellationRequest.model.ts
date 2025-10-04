import { Entity, Column, ManyToOne, JoinColumn} from "typeorm";
import BaseEntity from "./baseEntity.js";
import { Driver } from "./driver.model.js";
import { Order } from "./order.model.js";
import { CancelRequestStatus } from "../utils/enums/cancelRequestStatus.enum.js";


@Entity("order_cancellation_requests")
export class OrderCancellationRequest extends BaseEntity {

  @ManyToOne(() => Order, (order) => order.cancellationRequests, { onDelete: "CASCADE" })
  @JoinColumn({ name: "orderId" })
  order: any;

  @ManyToOne(() => Driver, (driver) => driver.cancellationRequests, { onDelete: "CASCADE" })
  @JoinColumn({ name: "driverId" })
  driver: any;

  @Column({
    type: "enum",
    enum: CancelRequestStatus,
    default: CancelRequestStatus.PENDING,
  })
  status: CancelRequestStatus;
}