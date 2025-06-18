import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDistanceInOrder1750237696460 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "distance" float NOT NULL DEFAULT 0;
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "distance" SET DEFAULT 0;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "distance";
        `);
    }

}
