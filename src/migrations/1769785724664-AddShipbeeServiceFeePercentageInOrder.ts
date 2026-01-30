import { MigrationInterface, QueryRunner } from "typeorm";

export class AddShipbeeServiceFeePercentageInOrder1769785724664 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "serviceFeePercentage" FLOAT
        `);

        // Optionally, set a default value for existing records
        await queryRunner.query(`
            UPDATE "orders"
            SET "serviceFeePercentage" = 10.0
            WHERE "serviceFeePercentage" IS NULL
        `);

        // If desired, set the column to NOT NULL after updating existing records
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "serviceFeePercentage" SET NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "serviceFeePercentage"
        `);
    }

}
