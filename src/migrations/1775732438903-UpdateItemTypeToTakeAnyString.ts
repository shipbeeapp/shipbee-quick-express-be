import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateItemTypeToTakeAnyString1775732438903 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "itemType" TYPE text
        `);

        await queryRunner.query(`
            ALTER TABLE "order_stops"
            ALTER COLUMN "itemType" TYPE text
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "itemType" TYPE "itemType"
        `);

        await queryRunner.query(`
            ALTER TABLE "order_stops"
            ALTER COLUMN "itemType" TYPE "itemType"
        `);
    }

}
