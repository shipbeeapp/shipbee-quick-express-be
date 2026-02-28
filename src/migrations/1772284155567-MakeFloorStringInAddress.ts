import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeFloorStringInAddress1772284155567 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "addresses" ALTER COLUMN "floor" TYPE text USING "floor"::text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "addresses" ALTER COLUMN "floor" TYPE integer USING "floor"::integer`);
    }

}
