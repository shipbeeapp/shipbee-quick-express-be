import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderCancellationRequest1759230306609 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        //CREATE status enum type
        await queryRunner.query(`CREATE TYPE "cancel_request_status_enum" AS ENUM('PENDING', 'APPROVED', 'DECLINED')`);
        await queryRunner.query(`
            CREATE TABLE "order_cancellation_requests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "orderId" uuid,
                "driverId" uuid,
                "status" "cancel_request_status_enum" NOT NULL DEFAULT 'PENDING',
                CONSTRAINT "FK_order_cancellation_requests_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_order_cancellation_requests_driver" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "order_cancellation_requests"`);
        await queryRunner.query(`DROP TYPE "cancel_request_status_enum"`);
    }

}
