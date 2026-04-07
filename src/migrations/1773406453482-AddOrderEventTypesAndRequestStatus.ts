import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderEventTypesAndRequestStatus1773406453482 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE order_status_history
            ADD COLUMN "requestStatus" "cancel_request_status_enum" NULL
        `);

        await queryRunner.query(`ALTER TYPE "order_event_type_enum" ADD VALUE IF NOT EXISTS 'STOP_CANCELLATION_REQUESTED'`);
        await queryRunner.query(`ALTER TYPE "order_event_type_enum" ADD VALUE IF NOT EXISTS 'STOP_CANCELLATION_APPROVED'`);
        await queryRunner.query(`ALTER TYPE "order_event_type_enum" ADD VALUE IF NOT EXISTS 'STOP_CANCELLATION_REJECTED'`);
        await queryRunner.query(`ALTER TYPE "order_event_type_enum" ADD VALUE IF NOT EXISTS 'STOP_RETURN_REQUESTED'`);
        await queryRunner.query(`ALTER TYPE "order_event_type_enum" ADD VALUE IF NOT EXISTS 'STOP_RETURN_APPROVED'`);
        await queryRunner.query(`ALTER TYPE "order_event_type_enum" ADD VALUE IF NOT EXISTS 'STOP_RETURN_REJECTED'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE order_status_history
            DROP COLUMN "requestStatus"
        `);
    }

}
