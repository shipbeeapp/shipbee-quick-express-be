import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBroadcastMessageAndDriverBroadcast1764238643026 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "broadcast_messages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "message" TEXT NOT NULL,
                "title" TEXT,
                "isActive" BOOLEAN NOT NULL DEFAULT true,
                CONSTRAINT "PK_broadcast_messages_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "driver_broadcast_messages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "driverId" uuid NOT NULL,
                "broadcastMessageId" uuid NOT NULL,
                "isRead" BOOLEAN NOT NULL DEFAULT false,
                CONSTRAINT "PK_driver_broadcast_messages_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_driver_broadcast_messages_driver" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_driver_broadcast_messages_broadcast_message" FOREIGN KEY ("broadcastMessageId") REFERENCES "broadcast_messages"("id") ON DELETE CASCADE
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "driver_broadcast_messages"
        `);
        await queryRunner.query(`
            DROP TABLE "broadcast_messages"
        `);
    }

}
