import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReasonInOrderCancellationRequest1759958006098 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_cancellation_requests" ADD "reason" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_cancellation_requests" DROP COLUMN "reason"`);
    }

}
