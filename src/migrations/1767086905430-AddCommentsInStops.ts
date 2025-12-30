import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommentsInStops1767086905430 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_stops"
            ADD COLUMN "comments" text
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_stops"
            DROP COLUMN "comments"
        `);
    }

}
