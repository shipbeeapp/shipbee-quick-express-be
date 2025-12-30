import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeliveryFeeInStop1767108713906 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_stops"
            ADD COLUMN "deliveryFee" float
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_stops"
            DROP COLUMN "deliveryFee"
        `);
    }

}
