import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMoreFieldsInDriver1762085640369 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD COLUMN "email" TEXT,
            ADD COLUMN "businessType" TEXT,
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP COLUMN "email",
            DROP COLUMN "businessType",
        `);
    }

}
