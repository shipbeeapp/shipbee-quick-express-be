import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVehiclesTable1751188463677 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "vehicle_type_enum" AS ENUM(
                'Motorcycle',
                'Sedan Car',
                'Pickup Truck',
                'Chiller Truck',
                'Canter Truck',
                'Panel Van',
                'Chiller Van',
                'Flat Bed Truck',
                'Low Bed Truck',
                'Garbage Removal Truck'
            );
        `);

        await queryRunner.query(`
            CREATE TABLE "vehicles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "type" "vehicle_type_enum" NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY ("id")
            );
        `);

        // add vehicle id in orders table
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "vehicleId" uuid,
            ADD CONSTRAINT "FK_vehicle_order" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // remove vehicle id from orders table
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP CONSTRAINT "FK_vehicle_order",
            DROP COLUMN "vehicleId";
        `);

        await queryRunner.query(`
            DROP TABLE "vehicles";
        `);

        await queryRunner.query(`
            DROP TYPE "vehicle_type_enum";
        `);

    }

}
