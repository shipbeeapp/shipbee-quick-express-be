import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeVehicleNumberNotNull1760391271327 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          ALTER TABLE "vehicles"
          ALTER COLUMN "number" SET NOT NULL
        `);
        console.log("Made vehicle number column NOT NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          ALTER TABLE "vehicles"
          ALTER COLUMN "number" DROP NOT NULL
        `);
        console.log("Reverted vehicle number column to NULLABLE");
    }


}
