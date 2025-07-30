import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterPickUpDateToBeUtc1753894608853 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Alter the pickUpDate column to be of type timestamp with time zone
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "pickUpDate" TYPE TIMESTAMP WITH TIME ZONE USING "pickUpDate" AT TIME ZONE 'UTC';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert the pickUpDate column back to its original type
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "pickUpDate" TYPE TIMESTAMP WITHOUT TIME ZONE USING "pickUpDate" AT TIME ZONE 'UTC';
        `);
    }

}
