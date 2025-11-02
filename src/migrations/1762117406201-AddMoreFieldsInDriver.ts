import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMoreFieldsInDriver1762117406201 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD COLUMN "businessPhoneNumber" TEXT,
            ADD COLUMN "companyLogo" TEXT
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP COLUMN "businessPhoneNumber",
            DROP COLUMN "companyLogo"
        `);
    }

}
