import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeAllUsersNew1765029363063 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "users" SET "isNewUser" = true WHERE type IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
