import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEventTypeInOrderStatusHistory1772564281435 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
       //add another event type in order_event_type enum
       await queryRunner.query(`ALTER TYPE "public"."order_event_type_enum" ADD VALUE 'STOP_CANCELED'`);
       await queryRunner.query(`ALTER TYPE "public"."order_event_type_enum" ADD VALUE 'STOP_RETURNED'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: Removing enum values is not straightforward and can lead to data loss if there are existing records with those values.
    }

}
