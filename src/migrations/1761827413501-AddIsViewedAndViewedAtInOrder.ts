import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsViewedAndViewedAtInOrder1761827413501 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "isViewed" BOOLEAN DEFAULT false,
            ADD COLUMN "viewedAt" TIMESTAMPTZ;
        `);

        await queryRunner.query(`
            UPDATE "orders"
            SET "isViewed" = true;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "isViewed",
            DROP COLUMN "viewedAt";
        `);
    }

}
