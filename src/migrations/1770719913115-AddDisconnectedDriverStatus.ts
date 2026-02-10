import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDisconnectedDriverStatus1770719913115 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query(`ALTER TYPE "driver_status_enum" ADD VALUE 'Disconnected'`);
        await queryRunner.query(`ALTER TABLE drivers DROP COLUMN "lastKnownLocation"`);
        await queryRunner.query(`ALTER TABLE drivers DROP COLUMN "lastOnlineAt"`);
        // add lastKnownLocation and lastOnlineAt columns to drivers table
        // await queryRunner.query(`ALTER TABLE drivers ADD COLUMN "lastKnownLocation" text`);
        // await queryRunner.query(`ALTER TABLE drivers ADD COLUMN "lastOnlineAt" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL does not support removing enum values directly.
        // await queryRunner.query(`ALTER TABLE drivers DROP COLUMN "lastKnownLocation"`);
        // await queryRunner.query(`ALTER TABLE drivers DROP COLUMN "lastOnlineAt"`);
    }

}
