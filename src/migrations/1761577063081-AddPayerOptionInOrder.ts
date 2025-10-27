import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPayerOptionInOrder1761577063081 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        //add payer type type
        await queryRunner.query(`CREATE TYPE "order_payer_enum" AS ENUM('SENDER', 'RECEIVER')`);

        //add payer column to orders table with default value SENDER
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "payer" "order_payer_enum" NOT NULL DEFAULT 'SENDER'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        //remove payer column from orders table
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "payer"
        `);

        //drop payer type
        await queryRunner.query(`DROP TYPE "order_payer_enum"`);
    }

}
