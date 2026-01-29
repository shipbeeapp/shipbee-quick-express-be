import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDriverCashAndOnlineIncome1769678429853 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD COLUMN "cashIncome" BIGINT DEFAULT 0,
            ADD COLUMN "onlineIncome" BIGINT DEFAULT 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP COLUMN "cashIncome",
            DROP COLUMN "onlineIncome"
        `);
    }

}
