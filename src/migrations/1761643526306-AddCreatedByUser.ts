import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreatedByUser1761643526306 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        //add createdBy column to orders table
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "createdById" uuid
        `);

        //add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD CONSTRAINT "FK_createdBy_user" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
        `);

        await queryRunner.query(`
          UPDATE "orders"
          SET "createdById" = "senderUserId"
          WHERE "createdById" IS NULL;
        `);

        //set createdById to not null
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "createdById" SET NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        //remove foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP CONSTRAINT "FK_createdBy_user"
        `);

        //remove createdBy column from orders table
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "createdById"
        `);
    }

}
