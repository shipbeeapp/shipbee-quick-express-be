import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDriverShareOfTrip1754905342146 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add the driverShare column to the orders table
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "driverShare" float DEFAULT NULL;
        `);
        console.log("Added driverShare column to orders table");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the driverShare column from the orders table
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "driverShare";
        `);
        console.log("Removed driverShare column from orders table");
    }

}
