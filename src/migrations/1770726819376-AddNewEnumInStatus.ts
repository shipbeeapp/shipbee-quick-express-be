import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewEnumInStatus1770726819376 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "driver_status_enum" ADD VALUE 'Disconnected'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL does not support removing enum values directly.
    }

}
