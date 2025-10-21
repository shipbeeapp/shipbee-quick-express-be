import { query } from "express";
import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterVehicleTypeEnum1761041771794 implements MigrationInterface {

    // public readonly transaction = false; // 🟢 disable transaction for this migration
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1️⃣ Create a temporary enum with old + new values
        await queryRunner.query(`
            CREATE TYPE "vehicle_type_enum_temp" AS ENUM(
                'Motorcycle',
                'Sedan Car',
                'Pickup Truck 2 Tons',
                'Chiller Truck',
                'Canter Truck',
                'Panel Van',
                'Chiller Van',
                'Flat Bed Truck',
                'Low Bed Truck',
                'Garbage Removal Truck',
                'Pickup Truck 3 Tons',
                'Van',
                'Freezer Van',
                'Freezer Truck'
            )
        `);

        // 2️⃣ Alter the column to use the temporary enum
        await queryRunner.query(`
            ALTER TABLE "vehicles"
            ALTER COLUMN "type" TYPE "vehicle_type_enum_temp"
            USING type::text::vehicle_type_enum_temp
        `);

        // 3️⃣ Normalize old data to final new values
        await queryRunner.query(`
            UPDATE vehicles SET type = 'Van' WHERE type = 'Panel Van';
            UPDATE vehicles SET type = 'Chiller Truck' WHERE type = 'Chiller Van';
            UPDATE vehicles SET type = 'Freezer Truck' WHERE type = 'Freezer Van';
        `);

        // 4️⃣ Create the final enum with only new values
        await queryRunner.query(`
            CREATE TYPE "vehicle_type_enum_new" AS ENUM(
                'Sedan Car',
                'Motorcycle',
                'Pickup Truck 2 Tons',
                'Pickup Truck 3 Tons',
                'Chiller Truck',
                'Canter Truck',
                'Van',
                'Freezer Truck',
                'Flat Bed Truck',
                'Low Bed Truck',
                'Garbage Removal Truck'
            )
        `);

        // 5️⃣ Switch the column to the final enum
        await queryRunner.query(`
            ALTER TABLE "vehicles"
            ALTER COLUMN "type" TYPE "vehicle_type_enum_new"
            USING type::text::vehicle_type_enum_new
        `);

        // 6️⃣ Drop temporary enum
        await queryRunner.query(`DROP TYPE "vehicle_type_enum_temp"`);

        // 7️⃣ Drop old enum and rename final enum to original name
        await queryRunner.query(`DROP TYPE "vehicle_type_enum"`);
        await queryRunner.query(`ALTER TYPE "vehicle_type_enum_new" RENAME TO "vehicle_type_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
