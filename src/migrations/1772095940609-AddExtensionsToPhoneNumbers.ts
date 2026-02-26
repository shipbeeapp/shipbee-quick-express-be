import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExtensionsToPhoneNumbers1772095940609 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE users
            SET "phoneNumber" = '+974' || TRIM("phoneNumber")
            WHERE "phoneNumber" IS NOT NULL
              AND TRIM("phoneNumber") != ''
              AND TRIM("phoneNumber") NOT LIKE '+%';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE users
            SET "phoneNumber" = SUBSTRING("phoneNumber" FROM 5)
            WHERE "phoneNumber" LIKE '+974%';
        `);
    }

}
