import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterVehicleTypeEnum21761057209124 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        //add chiller van and freezer van back to enum
        // await queryRunner.query(`
        //     ALTER TYPE "vehicle_type_enum" ADD VALUE IF NOT EXISTS 'Chiller Van';
        // `);
        // await queryRunner.query(`
        //     ALTER TYPE "vehicle_type_enum" ADD VALUE IF NOT EXISTS 'Freezer Van';
        // `);
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
                'Freezer Truck',
                'Flat Bed Trailer',
                'Low Bed Trailer'
            )
        `);

        // 2️⃣ Alter the column to use the temporary enum
        await queryRunner.query(`
            ALTER TABLE "vehicles"
            ALTER COLUMN "type" TYPE "vehicle_type_enum_temp"
            USING type::text::vehicle_type_enum_temp
        `);

        // alter pricing table column as well
        await queryRunner.query(`
            ALTER TABLE "pricing"
            ALTER COLUMN "vehicleType" TYPE "vehicle_type_enum_temp"
            USING "vehicleType"::text::vehicle_type_enum_temp
        `);

        // 3️⃣ Normalize old data to final new values
        await queryRunner.query(`
            UPDATE vehicles SET type = 'Flat Bed Trailer' WHERE type = 'Flat Bed Truck';
            UPDATE vehicles SET type = 'Low Bed Trailer' WHERE type = 'Low Bed Truck';
        `);

        // normalize pricing table as well
        await queryRunner.query(`
            UPDATE pricing SET "vehicleType" = 'Flat Bed Trailer' WHERE "vehicleType" = 'Flat Bed Truck';
            UPDATE pricing SET "vehicleType" = 'Low Bed Trailer' WHERE "vehicleType" = 'Low Bed Truck';
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
                'Flat Bed Trailer',
                'Low Bed Trailer',
                'Garbage Removal Truck',
                'Chiller Van',
                'Freezer Van'
            )
        `);

        // 5️⃣ Switch the column to the final enum
        await queryRunner.query(`
            ALTER TABLE "vehicles"
            ALTER COLUMN "type" TYPE "vehicle_type_enum_new"
            USING type::text::vehicle_type_enum_new
        `);

        // alter pricing table column as well
        await queryRunner.query(`
            ALTER TABLE "pricing"
            ALTER COLUMN "vehicleType" TYPE "vehicle_type_enum_new"
            USING "vehicleType"::text::vehicle_type_enum_new
        `);

        // 6️⃣ Drop temporary enum
        await queryRunner.query(`DROP TYPE "vehicle_type_enum_temp"`);

        // 7️⃣ Drop old enum and rename final enum to original name
        await queryRunner.query(`DROP TYPE "vehicle_type_enum"`);
        await queryRunner.query(`ALTER TYPE "vehicle_type_enum_new" RENAME TO "vehicle_type_enum"`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No need to remove enum values in down migration
    }

}
