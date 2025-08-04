import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVehicleModel1754297466425 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE vehicles
            ADD COLUMN model VARCHAR(255) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE vehicles
            DROP COLUMN model
        `);
    }

}
