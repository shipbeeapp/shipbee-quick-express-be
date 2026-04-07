import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHistoricalIncome1770059204107 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drivers" ADD "historicalIncome" bigint NOT NULL DEFAULT 0`);
        await queryRunner.query(`UPDATE "drivers" SET "historicalIncome" = "income"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "historicalIncome"`);
    }

}
