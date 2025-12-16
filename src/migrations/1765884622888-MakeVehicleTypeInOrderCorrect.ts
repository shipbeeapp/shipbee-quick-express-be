import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeVehicleTypeInOrderCorrect1765884622888 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update vehicleType in orders to correct enum
        // 5️⃣ Switch the column to the final enum
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "vehicleType" TYPE "vehicle_type_enum"
            USING "vehicleType"::text::vehicle_type_enum
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No need to revert the data correction
    }

}
