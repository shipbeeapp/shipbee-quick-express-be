import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeDriverDOBnullable1760367798785 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          ALTER TABLE "drivers"
          ALTER COLUMN "dateOfBirth" DROP NOT NULL
        `);
        console.log("Made driver dateOfBirth column nullable");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          ALTER TABLE "drivers"
          ALTER COLUMN "dateOfBirth" SET NOT NULL
        `);
        console.log("Reverted driver dateOfBirth column to NOT NULL");
    }

}
