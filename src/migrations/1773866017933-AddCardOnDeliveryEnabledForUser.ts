import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCardOnDeliveryEnabledForUser1773866017933 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS "cardOnDeliveryEnabled" boolean DEFAULT false
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE users
            DROP COLUMN IF EXISTS "cardOnDeliveryEnabled"
        `);
    }

}
