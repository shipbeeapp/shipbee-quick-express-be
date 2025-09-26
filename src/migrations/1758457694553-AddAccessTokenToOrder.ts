import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccessTokenToOrder1758457694553 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "accessToken" text NULL;
        `);
        console.log("Added accessToken column to orders table");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "accessToken";
        `);
        console.log("Removed accessToken column from orders table");
    }

}
