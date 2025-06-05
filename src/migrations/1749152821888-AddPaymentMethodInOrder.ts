import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentMethodInOrder1749152821888 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "paymentMethod" "paymentMethod" NOT NULL DEFAULT 'CASH_ON_DELIVERY';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "paymentMethod";
        `);
    }

}
