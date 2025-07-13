import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewVehicleTypes1752404858340 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TYPE vehicle_type_enum RENAME VALUE 'Pickup Truck' TO 'Pickup Truck 2 Tons';
            ALTER TYPE vehicle_type_enum ADD VALUE 'Pickup Truck 3 Tons';
            ALTER TYPE vehicle_type_enum ADD VALUE 'Van';
            ALTER TYPE vehicle_type_enum ADD VALUE 'Freezer Van';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TYPE vehicle_type_enum RENAME VALUE 'Pickup Truck 2 Tons' TO 'Pickup Truck';
        `);
    }

}
