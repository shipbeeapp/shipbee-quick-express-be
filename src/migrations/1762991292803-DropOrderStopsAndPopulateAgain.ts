import { MigrationInterface, QueryRunner } from "typeorm";

export class DropOrderStopsAndPopulateAgain1762991292803 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Intentionally left blank
        await queryRunner.query(`DROP TABLE IF EXISTS "order_stops"`);
        //add order_stops table
        await queryRunner.query(`
            CREATE TABLE "order_stops" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "orderId" uuid NOT NULL,
                "receiverUserId" uuid NOT NULL,
                "toAddressId" uuid NOT NULL,
                "sequence" INTEGER NOT NULL,
                "itemDescription" TEXT,
                "itemType" VARCHAR(255),
                "distance" FLOAT,
                "status" "orderStatus" DEFAULT 'Pending',
                "proofOfOrder" TEXT,
                "deliveredAt" TIMESTAMPTZ,
                PRIMARY KEY ("id"),
                CONSTRAINT "FK_order_stop_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_order_stop_receiver" FOREIGN KEY ("receiverUserId") REFERENCES "users"("id"),
                CONSTRAINT "FK_order_stop_to_address" FOREIGN KEY ("toAddressId") REFERENCES "addresses"("id")
            );
        `);

        //populate order_stops for existing orders
        await queryRunner.query(`
            INSERT INTO "order_stops" ("orderId", "receiverUserId", "toAddressId", "sequence", "itemDescription", "itemType", "distance", "status", "createdAt", "updatedAt", "proofOfOrder", "deliveredAt")
            SELECT o.id, o."receiverUserId", o."toAddressId", 1, o."itemDescription", o."itemType", o.distance, o.status, o."createdAt", o."updatedAt", o."proofOfOrder", o."updatedAt"
            FROM "orders" o;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
