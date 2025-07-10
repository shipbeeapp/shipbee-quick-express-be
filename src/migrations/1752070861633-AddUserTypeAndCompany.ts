import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserTypeAndCompany1752070861633 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        //add userType enum
        await queryRunner.query(`
            CREATE TYPE "user_type_enum" AS ENUM('REGULAR', 'BUSINESS');
        `);
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "type" "user_type_enum",
            ADD COLUMN "companyName" text;
        `);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the columns and enum type
        await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN "companyName",
            DROP COLUMN "type";
        `);
        await queryRunner.query(`
            DROP TYPE "user_type_enum";
        `);
    }

}
