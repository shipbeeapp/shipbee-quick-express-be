import { MigrationInterface, QueryRunner } from "typeorm";

export class AddShippingCompanyInShipment1764847815381 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shipments" ADD COLUMN "shippingCompany" VARCHAR(100)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shipments" DROP COLUMN "shippingCompany"`);
    }

}
