import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApiKeyInUser1762947817693 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "apiKey" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "apiKey"`);
    }

}
