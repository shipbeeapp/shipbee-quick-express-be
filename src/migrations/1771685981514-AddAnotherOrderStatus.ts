import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAnotherOrderStatus1771685981514 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE order_status_enum ADD VALUE 'Returning'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

    }

}
