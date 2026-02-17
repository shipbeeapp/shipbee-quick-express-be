import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMonthlyBill1771365542054 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "monthlyBillingEnabled" boolean DEFAULT false`);
        // Create a sequence for driverNo
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS driver_no_seq START 10000`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD COLUMN "driverNo" int UNIQUE DEFAULT nextval('driver_no_seq')`);
        await queryRunner.query(`ALTER TYPE "public"."payment_method_enum" ADD VALUE 'MONTHLY_BILL'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "monthlyBillingEnabled"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "driverNo"`);
    }

}
