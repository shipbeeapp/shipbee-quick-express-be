import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDriverDocs1759746365678 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // add driver sign up status enum type
        await queryRunner.query(`CREATE TYPE "driver_sign_up_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD COLUMN "signUpStatus" driver_sign_up_status_enum DEFAULT 'PENDING',
            ADD COLUMN "qidFront" text,
            ADD COLUMN "qidBack" text,
            ADD COLUMN "driverRegistrationFront" text,
            ADD COLUMN "driverRegistrationBack" text,
            ADD COLUMN "vehicleRegistrationFront" text,
            ADD COLUMN "vehicleRegistrationBack" text;
        `);
        console.log("Added document columns to drivers table");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP COLUMN "signUpStatus",
            DROP COLUMN "qidFront",
            DROP COLUMN "qidBack",
            DROP COLUMN "driverRegistrationFront",
            DROP COLUMN "driverRegistrationBack",
            DROP COLUMN "vehicleRegistrationFront",
            DROP COLUMN "vehicleRegistrationBack";
        `);
        console.log("Removed document columns from drivers table");
    }

}
