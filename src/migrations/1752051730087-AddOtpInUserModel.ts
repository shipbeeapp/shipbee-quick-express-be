import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOtpInUserModel1752051730087 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add the 'otp' column to the 'users' table
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "otp" text;
        `);
         
        // make name in users table nullable
        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "name" DROP NOT NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the 'otp' column from the 'users' table
        await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN "otp";
        `);
        
        // make name in users table not nullable
        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "name" SET NOT NULL;
        `);
    }

}
