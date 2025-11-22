import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessDocsApprovalAndReason1763817948893 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drivers" ADD "businessDocsApprovalStatus" approval_status_enum`);
        // Set default value for existing records
        await queryRunner.query(`UPDATE "drivers" SET "businessDocsApprovalStatus" = 'PENDING' WHERE type = 'BUSINESS'`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD "businessDocsRejectionReason" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "businessDocsRejectionReason"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "businessDocsApprovalStatus"`);
    }

}
