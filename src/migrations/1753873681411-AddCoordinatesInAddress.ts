import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCoordinatesInAddress1753873681411 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        //nullable coordinates column added to Address table
        await queryRunner.query(`
            ALTER TABLE "addresses"
            ADD "coordinates" text NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "addresses"
            DROP COLUMN "coordinates";
        `);
    }

}
