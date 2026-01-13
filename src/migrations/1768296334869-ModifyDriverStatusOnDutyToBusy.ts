import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifyDriverStatusOnDutyToBusy1768296334869 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`
          ALTER TABLE "drivers"
          ALTER COLUMN "status" DROP DEFAULT;
        `);

        await queryRunner.query(`
            CREATE TYPE "driver_status_enum_temp" AS ENUM('Active', 'Offline', 'Busy', 'On Duty');
        `);

        await queryRunner.query(`
            ALTER TABLE "drivers"
            ALTER COLUMN "status" TYPE "driver_status_enum_temp"
            USING status::text::driver_status_enum_temp
        `);

        await queryRunner.query(`
          UPDATE drivers set status = 'Busy' where status = 'On Duty';  
        `)

        await queryRunner.query(`
            CREATE TYPE "driver_status_enum_new" AS ENUM('Active', 'Offline', 'Busy');
        `);

        await queryRunner.query(`
            ALTER TABLE "drivers"
            ALTER COLUMN "status" TYPE "driver_status_enum_new"
            USING status::text::driver_status_enum_new
        `);
        
        await queryRunner.query(`DROP TYPE "driver_status_enum_temp"`);
        await queryRunner.query(`DROP TYPE "driver_status_enum"`);

        await queryRunner.query(`ALTER TYPE "driver_status_enum_new" RENAME TO "driver_status_enum"`);



    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
