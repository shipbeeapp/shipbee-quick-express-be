import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDefaultDriverStatus1768297449812 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
         // 9️⃣ Restore default (optional, adjust if needed)
            await queryRunner.query(`
              ALTER TABLE "drivers"
              ALTER COLUMN "status"
              SET DEFAULT 'Offline';
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
