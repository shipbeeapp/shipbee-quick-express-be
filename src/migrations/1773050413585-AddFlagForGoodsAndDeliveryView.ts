import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFlagForGoodsAndDeliveryView1773050413585 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE users ADD COLUMN "showGoodsAndDeliveryValues" boolean DEFAULT false`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE users DROP COLUMN "showGoodsAndDeliveryValues"`
        )
    }

}
