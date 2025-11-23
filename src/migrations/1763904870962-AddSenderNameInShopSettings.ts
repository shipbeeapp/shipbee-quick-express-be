import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSenderNameInShopSettings1763904870962 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "shop_settings"
            ADD COLUMN "senderName" VARCHAR(255)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "shop_settings"
            DROP COLUMN "senderName"
        `);
    }

}
