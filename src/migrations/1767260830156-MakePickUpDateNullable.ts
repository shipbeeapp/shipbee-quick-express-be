import { MigrationInterface, QueryRunner } from "typeorm";

export class MakePickUpDateNullable1767260830156 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders"
            ALTER COLUMN "pickUpDate" DROP NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders"
            ALTER COLUMN "pickUpDate" SET NOT NULL
        `);
    }

}
