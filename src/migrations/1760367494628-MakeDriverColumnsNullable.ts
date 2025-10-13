import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeDriverColumnsNullable1760367494628 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          ALTER TABLE "drivers"
          ALTER COLUMN "profilePicture" DROP NOT NULL,
          ALTER COLUMN "qid" DROP NOT NULL,
          ALTER COLUMN "qidFront" DROP NOT NULL,
          ALTER COLUMN "qidBack" DROP NOT NULL,
          ALTER COLUMN "licenseFront" DROP NOT NULL,
          ALTER COLUMN "licenseBack" DROP NOT NULL,
          ALTER COLUMN "licenseExpirationDate" DROP NOT NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "vehicles"
            ALTER COLUMN "registrationFront" DROP NOT NULL,
            ALTER COLUMN "registrationBack" DROP NOT NULL,
            ALTER COLUMN "frontPhoto" DROP NOT NULL,
            ALTER COLUMN "backPhoto" DROP NOT NULL,
            ALTER COLUMN "leftPhoto" DROP NOT NULL,
            ALTER COLUMN "rightPhoto" DROP NOT NULL
        `);
        console.log("Made driver and vehicle document columns nullable");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          ALTER TABLE "drivers"
          ALTER COLUMN "profilePicture" SET NOT NULL,
          ALTER COLUMN "qid" SET NOT NULL,
          ALTER COLUMN "qidFront" SET NOT NULL,
          ALTER COLUMN "qidBack" SET NOT NULL,
          ALTER COLUMN "licenseFront" SET NOT NULL,
          ALTER COLUMN "licenseBack" SET NOT NULL,
          ALTER COLUMN "licenseExpirationDate" SET NOT NULL
        `);
        console.log("Reverted driver document columns to NOT NULL");

        await queryRunner.query(`
            ALTER TABLE "vehicles"
            ALTER COLUMN "registrationFront" SET NOT NULL,
            ALTER COLUMN "registrationBack" SET NOT NULL,
            ALTER COLUMN "frontPhoto" SET NOT NULL,
            ALTER COLUMN "backPhoto" SET NOT NULL,
            ALTER COLUMN "leftPhoto" SET NOT NULL,
            ALTER COLUMN "rightPhoto" SET NOT NULL
        `);
        console.log("Reverted vehicle document columns to NOT NULL");
    }

}
