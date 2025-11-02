import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMultiOrderFeature1762079321388 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "order_type_enum" AS ENUM ('SINGLE_STOP', 'MULTI_STOP');`);
        await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN "type" "order_type_enum" DEFAULT 'SINGLE_STOP';`);

        // For existing orders, set type to SINGLE_STOP
        await queryRunner.query(`UPDATE "orders" SET "type" = 'SINGLE_STOP';`);

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
                "deliveredAt" TIMESTAMPTZ,
                PRIMARY KEY ("id"),
                CONSTRAINT "FK_order_stop_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_order_stop_receiver" FOREIGN KEY ("receiverUserId") REFERENCES "users"("id"),
                CONSTRAINT "FK_order_stop_to_address" FOREIGN KEY ("toAddressId") REFERENCES "addresses"("id")
            );
        `);

        //populate order_stops for existing orders
        await queryRunner.query(`
            INSERT INTO "order_stops" ("orderId", "receiverUserId", "toAddressId", "sequence", "itemDescription", "itemType", "distance", "status", "createdAt", "updatedAt")
            SELECT o.id, o."receiverUserId", o."toAddressId", 1, o."itemDescription", o."itemType", o.distance, o.status, o."createdAt", o."updatedAt"
            FROM "orders" o;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "order_stops";`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "type";`);
        await queryRunner.query(`DROP TYPE "order_type_enum";`);
    }

}
