import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLiftersInOrderStop1765883228517 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_stops" ADD "lifters" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_stops" DROP COLUMN "lifters"`);
    }

}
