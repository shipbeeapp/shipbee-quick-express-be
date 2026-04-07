import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMaxOrderTimePerBusiness1769696374021 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "maxOrderDuration" FLOAT
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN "maxOrderDuration"
        `);
    }

}
