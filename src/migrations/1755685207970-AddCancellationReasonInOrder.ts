import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCancellationReasonInOrder1755685207970 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "cancellationReason" text NULL;
        `);
        console.log("Added cancellationReason column to orders table");

        // add startedAt and completedAt columns to orders table
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "startedAt" TIMESTAMP WITH TIME ZONE NULL,
            ADD COLUMN "completedAt" TIMESTAMP WITH TIME ZONE NULL;
        `);
        console.log("Added startedAt and completedAt columns to orders table");

        // await queryRunner.query(`
        //     ALTER TABLE "orders"
        //     ALTER COLUMN "startedAt" TYPE TIMESTAMP WITH TIME ZONE USING "startedAt" AT TIME ZONE 'UTC',
        //     ALTER COLUMN "completedAt" TYPE TIMESTAMP WITH TIME ZONE USING "completedAt" AT TIME ZONE 'UTC';
        // `);
        // console.log("Converted startedAt and completedAt columns to TIMESTAMP WITH TIME ZONE in orders table");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "cancellationReason";
        `);
        console.log("Removed cancellationReason column from orders table");
        // remove startedAt and completedAt columns from orders table
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "startedAt",
            DROP COLUMN "completedAt";
        `);
        console.log("Removed startedAt and completedAt columns from orders table");
    }

}
