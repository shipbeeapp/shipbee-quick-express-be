import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMoreFieldsForEcommerce1762772511358 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE users
            ADD COLUMN industry TEXT,
            ADD COLUMN "numOfDrivers" TEXT,
            ADD COLUMN "numOfVehicles" TEXT,
            ADD COLUMN password TEXT;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE users
            DROP COLUMN industry,
            DROP COLUMN "numOfDrivers",
            DROP COLUMN "numOfVehicles";
            DROP COLUMN password;
        `);
    }

}
