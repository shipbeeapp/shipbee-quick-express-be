import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDriverStatus1754389046526 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "driver_status_enum" AS ENUM('Active', 'Offline', 'On Duty');
        `);

        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD "status" "driver_status_enum" NOT NULL DEFAULT 'Offline';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP COLUMN "status";
        `);

        await queryRunner.query(`
            DROP TYPE "driver_status_enum";
        `);
    }

}
