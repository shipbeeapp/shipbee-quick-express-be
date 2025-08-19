import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompletionOtpInOrder1755363254865 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "completionOtp" text NULL;
        `);
        console.log("Added completionOtp column to orders table");

        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD COLUMN "profilePicture" text NULL;
        `);
        console.log("Added profilePicture column to drivers table");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "completionOtp";
        `);
        console.log("Removed completionOtp column from orders table");

        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP COLUMN "profilePicture";
        `);
    }

}
