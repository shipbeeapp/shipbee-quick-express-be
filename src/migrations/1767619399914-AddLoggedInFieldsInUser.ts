import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoggedInFieldsInUser1767619399914 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"
            ADD COLUMN "hasLoggedInQuick" boolean, 
            ADD COLUMN "hasLoggedInExpress" boolean
        `);

        await queryRunner.query(`UPDATE "users"
            SET "hasLoggedInQuick" = true
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"
            DROP COLUMN "hasLoggedInExpress",
            DROP COLUMN "hasLoggedInQuick"
        `);
    }

}
