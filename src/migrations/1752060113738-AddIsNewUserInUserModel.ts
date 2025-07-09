import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsNewUserInUserModel1752060113738 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add the 'isNewUser' column to the 'users' table
        // make default value null
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "isNewUser" boolean DEFAULT true;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the 'isNewUser' column from the 'users' table
        await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN "isNewUser";
        `);
    }

}
