import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBankFeePercentageInUserAndOrder1772978362076 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE users ADD COLUMN "bankFeePercentage" decimal(5,2)`);
        await queryRunner.query(`ALTER TABLE orders ADD COLUMN "bankFeePercentage" decimal(5,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE users DROP COLUMN "bankFeePercentage"`);
        await queryRunner.query(`ALTER TABLE orders DROP COLUMN "bankFeePercentage"`);
    }

}
