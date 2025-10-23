import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDescriptionInPromocode1761240108086 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "promo_codes" ADD "description" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "promo_codes" DROP COLUMN "description"`);
    }

}
