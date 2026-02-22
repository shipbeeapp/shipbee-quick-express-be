import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeIncomesDecimal1771754729406 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
            await queryRunner.query(`
            ALTER TABLE "drivers"
                ALTER COLUMN "historicalIncome" TYPE DECIMAL(15,2) USING "historicalIncome"::DECIMAL(15,2),
                ALTER COLUMN "income" TYPE DECIMAL(15,2) USING "income"::DECIMAL(15,2),
                ALTER COLUMN "cashIncome" TYPE DECIMAL(15,2) USING "cashIncome"::DECIMAL(15,2),
                ALTER COLUMN "onlineIncome" TYPE DECIMAL(15,2) USING "onlineIncome"::DECIMAL(15,2),
                ALTER COLUMN "cashBalance" TYPE DECIMAL(15,2) USING "cashBalance"::DECIMAL(15,2);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drivers"
                ALTER COLUMN "historicalIncome" TYPE bigint USING "historicalIncome"::bigint,
                ALTER COLUMN "income" TYPE bigint USING "income"::bigint,
                ALTER COLUMN "cashIncome" TYPE bigint USING "cashIncome"::bigint,
                ALTER COLUMN "onlineIncome" TYPE bigint USING "onlineIncome"::bigint,
                ALTER COLUMN "cashBalance" TYPE bigint USING "cashBalance"::bigint;
        `);
    }

}
