import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsDisconnectedColumn1771064017511 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE drivers
            ADD COLUMN "isDisconnected" boolean NOT NULL DEFAULT false
        `);

        await queryRunner.query(`
            ALTER TABLE orders
            ADD COLUMN "proofOfPickup" text
        `);

        await queryRunner.query(`
            ALTER TABLE order_stops
            ADD COLUMN "proofOfReturn" text
        `);

        await queryRunner.query(`
            ALTER TABLE order_stops
            ADD COLUMN "isReturned" boolean NOT NULL DEFAULT false
        `);

        await queryRunner.query(`
            CREATE TYPE "order_event_type_enum" AS ENUM ('STOP_COMPLETED', 'STOP_STARTED', 'STOP_ARRIVED')
        `);

        await queryRunner.query(`
            ALTER TABLE order_status_history
            ADD COLUMN "hasArrived" boolean NOT NULL DEFAULT false,
            ADD COLUMN "returnedStartedAt" timestamptz,
            ADD COLUMN "returnedCompletedAt" timestamptz,
            ADD COLUMN "triggeredByAdmin" boolean NOT NULL DEFAULT false,
            ADD COLUMN "event" "order_event_type_enum",
            ADD COLUMN "orderStopId" uuid,
            ADD CONSTRAINT "FK_order_status_history_order_stop" FOREIGN KEY ("orderStopId") REFERENCES order_stops(id) ON DELETE SET NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE drivers
            DROP COLUMN "isDisconnected"
        `);

        await queryRunner.query(`
            ALTER TABLE orders
            DROP COLUMN "proofOfPickup"
         `);

        await queryRunner.query(`
            ALTER TABLE order_stops
            DROP COLUMN "proofOfReturn"
        `);

        await queryRunner.query(`
            ALTER TABLE order_stops
            DROP COLUMN "isReturned"
        `);

        await queryRunner.query(`
            ALTER TABLE order_status_history
            DROP COLUMN "hasArrived",
            DROP COLUMN "returnedStartedAt",
            DROP COLUMN "returnedCompletedAt",
            DROP COLUMN "triggeredByAdmin",
            DROP COLUMN "event",
            DROP CONSTRAINT "FK_order_status_history_order_stop",
            DROP COLUMN "orderStopId"
        `);

        await queryRunner.query(`
            DROP TYPE "order_event_type_enum"
        `);
    }

}
