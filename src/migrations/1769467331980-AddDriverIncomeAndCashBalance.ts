import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDriverIncomeAndCashBalance1769467331980 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE drivers ADD COLUMN income NUMERIC NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "cashBalance" NUMERIC NOT NULL DEFAULT 0`
        )

        // 2️⃣ Backfill income from completed orders
        await queryRunner.query(`
          UPDATE drivers d
          SET income = COALESCE((
            SELECT SUM(o."totalCost")
            FROM orders o
            WHERE o."driverId" = d.id
              AND o.status = 'Completed'
          ), 0)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
         await queryRunner.query(`
            ALTER TABLE drivers
            DROP COLUMN IF EXISTS income,
            DROP COLUMN IF EXISTS "cashBalance"
        `);

    }

}
