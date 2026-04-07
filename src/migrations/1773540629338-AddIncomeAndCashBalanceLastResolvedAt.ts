import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIncomeAndCashBalanceLastResolvedAt1773540629338 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE drivers
            ADD COLUMN "incomeLastResolvedAt" timestamptz NULL,
            ADD COLUMN "cashBalanceLastResolvedAt" timestamptz NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE drivers
            DROP COLUMN "incomeLastResolvedAt",
            DROP COLUMN "cashBalanceLastResolvedAt"
        `);
    }

}
