import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsSandboxInUser1767088062249 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"
            ADD COLUMN "isSandboxUser" boolean DEFAULT true
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"
            DROP COLUMN "isSandboxUser"
        `);
    }

}
