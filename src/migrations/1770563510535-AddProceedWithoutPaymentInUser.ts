import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProceedWithoutPaymentInUser1770563510535 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE users ADD COLUMN "proceedWithoutPayment" boolean DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE users DROP COLUMN "proceedWithoutPayment"`);
    }

}
