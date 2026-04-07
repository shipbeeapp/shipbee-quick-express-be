import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExtraFieldsForStops1766610543221 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_stops"
            ADD COLUMN "clientStopId" text,
            ADD COLUMN "items" jsonb,
            ADD COLUMN "totalPrice" float,
            ADD COLUMN "paymentMethod" "paymentMethod" DEFAULT 'CASH_ON_DELIVERY'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_stops"
            DROP COLUMN "paymentMethod",
            DROP COLUMN "totalPrice",
            DROP COLUMN "items",
            DROP COLUMN "clientStopId"
        `);
    }

}
