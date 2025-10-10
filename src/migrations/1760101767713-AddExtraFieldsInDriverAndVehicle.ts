import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExtraFieldsInDriverAndVehicle1760101767713 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE "drivers" ADD "surname" text`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD "dateOfBirth" date NOT NULL DEFAULT '2000-01-01'`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD "qid" text NOT NULL DEFAULT '111'`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD "licenseExpirationDate" date NOT NULL DEFAULT '2030-01-01'`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD "licenseFront" text NOT NULL DEFAULT 'placeholder.jpg'`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD "licenseBack" text NOT NULL DEFAULT 'placeholder.jpg'`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "driverRegistrationFront"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "driverRegistrationBack"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "vehicleRegistrationFront"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "vehicleRegistrationBack"`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "registrationFront" text NOT NULL DEFAULT 'placeholder.jpg'`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "registrationBack" text NOT NULL DEFAULT 'placeholder.jpg'`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "frontPhoto" text NOT NULL DEFAULT 'placeholder.jpg'`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "backPhoto" text NOT NULL DEFAULT 'placeholder.jpg'`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "leftPhoto" text NOT NULL DEFAULT 'placeholder.jpg'`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "rightPhoto" text NOT NULL DEFAULT 'placeholder.jpg'`);

        await queryRunner.query(`
            UPDATE "drivers"
            SET
              "qidFront" = COALESCE("qidFront", 'placeholder.jpg'),
              "qidBack" = COALESCE("qidBack", 'placeholder.jpg'),
              "profilePicture" = COALESCE("profilePicture", 'placeholder.jpg')
        `);
        // ✅ Remove default for required driver docs
        await queryRunner.query(`
          ALTER TABLE "drivers"
          ALTER COLUMN "qidFront" DROP DEFAULT,
          ALTER COLUMN "qidFront" SET NOT NULL,
          ALTER COLUMN "qidBack" DROP DEFAULT,
          ALTER COLUMN "qidBack" SET NOT NULL,
          ALTER COLUMN "profilePicture" DROP DEFAULT,
          ALTER COLUMN "profilePicture" SET NOT NULL,
          ALTER COLUMN "licenseFront" DROP DEFAULT,
          ALTER COLUMN "licenseBack" DROP DEFAULT,
          ALTER COLUMN "dateOfBirth" DROP DEFAULT,
          ALTER COLUMN "qid" DROP DEFAULT,
          ALTER COLUMN "licenseExpirationDate" DROP DEFAULT
        `);

        // ✅ Remove defaults for vehicle photos and registration
        await queryRunner.query(`
          ALTER TABLE "vehicles"
          ALTER COLUMN "registrationFront" DROP DEFAULT,
          ALTER COLUMN "registrationBack" DROP DEFAULT,
          ALTER COLUMN "frontPhoto" DROP DEFAULT,
          ALTER COLUMN "backPhoto" DROP DEFAULT,
          ALTER COLUMN "leftPhoto" DROP DEFAULT,
          ALTER COLUMN "rightPhoto" DROP DEFAULT
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        // rollback NOT NULLs
        await queryRunner.query(`
          ALTER TABLE "drivers"
          ALTER COLUMN "qidFront" DROP NOT NULL,
          ALTER COLUMN "qidBack" DROP NOT NULL,
          ALTER COLUMN "profilePicture" DROP NOT NULL,
          ALTER COLUMN "licenseFront" DROP NOT NULL,
          ALTER COLUMN "licenseBack" DROP NOT NULL
        `);

        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "rightPhoto"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "leftPhoto"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "backPhoto"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "frontPhoto"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "registrationBack"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "registrationFront"`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD "vehicleRegistrationBack" text`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD "vehicleRegistrationFront" text`);
        await queryRunner.query(`ALTER TABLE "drivers" RENAME COLUMN "licenseBack" TO "driverRegistrationBack"`);
        await queryRunner.query(`ALTER TABLE "drivers" RENAME COLUMN "licenseFront" TO "driverRegistrationFront"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "licenseExpirationDate"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "qid"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "dateOfBirth"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "surname"`);
    }

}
