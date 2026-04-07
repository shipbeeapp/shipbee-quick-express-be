import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifyDriverSignUpStatusEnumToIncludeDeactivated1763215698193 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ALTER COLUMN "signUpStatus" DROP DEFAULT;
        `);
        await queryRunner.query(`CREATE TYPE "driver_signup_status_enum_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DEACTIVATED');`);
        await queryRunner.query(`ALTER TABLE "drivers" ALTER COLUMN "signUpStatus" TYPE "driver_signup_status_enum_new" USING "signUpStatus"::text::"driver_signup_status_enum_new";`);
        await queryRunner.query(`DROP TYPE "driver_sign_up_status_enum";`);
        await queryRunner.query(`ALTER TYPE "driver_signup_status_enum_new" RENAME TO "driver_signup_status_enum";`);
        
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ALTER COLUMN "signUpStatus"
            SET DEFAULT 'PENDING';
        `);

        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "deletedDriverData" text
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ALTER COLUMN "signUpStatus" DROP DEFAULT;
        `);

        await queryRunner.query(`
            CREATE TYPE "driver_signup_status_enum_old" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        `);

        await queryRunner.query(`
            ALTER TABLE "drivers"
            ALTER COLUMN "signUpStatus" TYPE "driver_signup_status_enum_old"
            USING "signUpStatus"::text::"driver_signup_status_enum_old";
        `);

        await queryRunner.query(`DROP TYPE "driver_signup_status_enum";`);

        await queryRunner.query(`
            ALTER TYPE "driver_signup_status_enum_old"
            RENAME TO "driver_signup_status_enum";
        `);

        await queryRunner.query(`
            ALTER TABLE "drivers"
            ALTER COLUMN "signUpStatus" SET DEFAULT 'PENDING';
        `);

        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "deletedDriverData"
        `);
    }

}
