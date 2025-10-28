import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewDriverFields1761645175717 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "driver_type_enum" AS ENUM ('INDIVIDUAL', 'BUSINESS')`);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD COLUMN type "driver_type_enum" NOT NULL DEFAULT 'INDIVIDUAL'
        `);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD COLUMN "businessName" varchar
        `);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD COLUMN "businessLocation" varchar
        `);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD COLUMN "companyRepresentativeName" varchar
        `);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD COLUMN "crPhoto" text
        `);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD COLUMN "taxId" varchar
        `);

        // SELF REFERENCING RELATION
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD COLUMN "businessOwnerId" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD CONSTRAINT "FK_businessOwner_driver" FOREIGN KEY ("businessOwnerId") REFERENCES "drivers"("id") ON DELETE SET NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP CONSTRAINT "FK_businessOwner_driver"
        `);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP COLUMN "businessOwnerId"
        `);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP COLUMN "taxId"
        `);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP COLUMN "crPhoto"
        `);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP COLUMN "companyRepresentativeName"
        `);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP COLUMN "businessLocation"
        `);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP COLUMN "businessName"
        `);
        await queryRunner.query(`
            ALTER TABLE "drivers"
            DROP COLUMN type
        `);
        await queryRunner.query(`DROP TYPE "driver_type_enum"`);
    }

}
