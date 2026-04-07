import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCardOnDeliveryOption1768989836638 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          ALTER TABLE "orders"
          ALTER COLUMN "paymentMethod" DROP DEFAULT;
        `);

        await queryRunner.query(`
          ALTER TABLE "order_stops"
          ALTER COLUMN "paymentMethod" DROP DEFAULT;
        `);

        await queryRunner.query(`
          ALTER TABLE "payments"
          ALTER COLUMN "paymentMethod" DROP DEFAULT;
        `);

        await queryRunner.query(`
            CREATE TYPE "paymentMethod_temp" AS ENUM('CASH_ON_DELIVERY', 'CREDIT_DEBIT', 'WALLET', 'CARD_ON_DELIVERY');
        `);

        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "paymentMethod" TYPE "paymentMethod_temp"
            USING "paymentMethod"::text::"paymentMethod_temp"
        `);

        await queryRunner.query(`
            ALTER TABLE "order_stops"
            ALTER COLUMN "paymentMethod" TYPE "paymentMethod_temp"
            USING "paymentMethod"::text::"paymentMethod_temp"
        `);

        await queryRunner.query(`
            ALTER TABLE "payments"
            ALTER COLUMN "paymentMethod" TYPE "paymentMethod_temp"
            USING "paymentMethod"::text::"paymentMethod_temp"
        `);
        
        await queryRunner.query(`DROP TYPE "paymentMethod"`);
        await queryRunner.query(`ALTER TYPE "paymentMethod_temp" RENAME TO "payment_method_enum"`);

        await queryRunner.query(`ALTER TABLE drivers ADD COLUMN "hasCardOnDelivery" boolean DEFAULT false`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE drivers DROP COLUMN "hasCardOnDelivery"`)
    }

}
