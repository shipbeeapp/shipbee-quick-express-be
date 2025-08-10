import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProofOfOrder1754397946946 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "proofOfOrder" text;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "proofOfOrder";
        `);
    }

}
