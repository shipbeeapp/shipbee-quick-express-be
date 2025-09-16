import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDriverAndCancellationToOrderStatusHistory1758021504299 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE order_status_history
            ADD COLUMN "driverId" uuid,
            ADD COLUMN "cancellationReason" text
        `);

        await queryRunner.query(`
            ALTER TABLE order_status_history
            ADD CONSTRAINT FK_driver
            FOREIGN KEY ("driverId") REFERENCES drivers(id)
            ON DELETE SET NULL
        `);

        console.log("Added driverId and cancellationReason columns to order_status_history table");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`
            ALTER TABLE order_status_history
            DROP CONSTRAINT IF EXISTS FK_driver
        `);
        await queryRunner.query(`
            ALTER TABLE order_status_history
            DROP COLUMN "driverId",
            DROP COLUMN "cancellationReason"
        `);

    }

}
