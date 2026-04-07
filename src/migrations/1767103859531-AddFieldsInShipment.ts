import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFieldsInShipment1767103859531 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shipments"
            ADD COLUMN "plannedShippingDateAndTime" TIMESTAMP,
            ADD COLUMN "incoterm" text,
            ADD COLUMN "lineItems" jsonb,
            ADD COLUMN "invoiceNumber" text,
            ADD COLUMN "invoiceDate" date,
            ADD COLUMN "trackingNumber" text,
            ADD COLUMN "description" text,
            ADD COLUMN "pickupRequested" boolean DEFAULT false
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shipments"
            DROP COLUMN "pickupRequested",
            DROP COLUMN "description",
            DROP COLUMN "trackingNumber",
            DROP COLUMN "invoiceDate",
            DROP COLUMN "invoiceNumber",
            DROP COLUMN "lineItems",
            DROP COLUMN "incoterm",
            DROP COLUMN "plannedShippingDateAndTime"
        `);
    }

}
