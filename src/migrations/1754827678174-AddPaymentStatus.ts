import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentStatus1754827678174 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        // 1. Create the enum type
        await queryRunner.query(`
            CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'successful', 'failed', 'refunded', 'canceled');
        `);
        // 2. Add the column using the new type
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "paymentStatus" "payment_status_enum" DEFAULT 'pending';
        `);
        console.log("Added paymentStatus column to orders table");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "paymentStatus";
        `);
        console.log("Removed paymentStatus column from orders table");
    }

}
