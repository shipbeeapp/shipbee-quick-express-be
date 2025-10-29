import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApprovalColumnsForDriverAndVehicle1761729766887 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "approval_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        `);
        
        await queryRunner.query(`
            ALTER TABLE "drivers"
            ADD COLUMN "qidApprovalStatus" "approval_status_enum" DEFAULT 'PENDING',
            ADD COLUMN "qidRejectionReason" TEXT,
            ADD COLUMN "licenseApprovalStatus" "approval_status_enum" DEFAULT 'PENDING',
            ADD COLUMN "licenseRejectionReason" TEXT;
        `);

        // 3. Initialize driver approval statuses from existing signUpStatus
        await queryRunner.query(`
          UPDATE "drivers"
          SET 
            "qidApprovalStatus" = 
              CASE 
                WHEN "signUpStatus" = 'APPROVED' THEN 'APPROVED'::"approval_status_enum"
                WHEN "signUpStatus" = 'REJECTED' THEN 'REJECTED'::"approval_status_enum"
                ELSE 'PENDING'::"approval_status_enum"
              END,
            "licenseApprovalStatus" = 
              CASE 
                WHEN "signUpStatus" = 'APPROVED' THEN 'APPROVED'::"approval_status_enum"
                WHEN "signUpStatus" = 'REJECTED' THEN 'REJECTED'::"approval_status_enum"
                ELSE 'PENDING'::"approval_status_enum"
              END;
        `);

        await queryRunner.query(`
            ALTER TABLE "vehicles"
            ADD COLUMN "infoApprovalStatus" "approval_status_enum" DEFAULT 'PENDING',
            ADD COLUMN "infoRejectionReason" TEXT;
        `);

        // 5. Set vehicle infoApprovalStatus = driver.signUpStatus
        // We assume drivers.vehicleId is a foreign key to vehicles.id
        await queryRunner.query(`
          UPDATE "vehicles" v
          SET "infoApprovalStatus" =
            CASE 
              WHEN d."signUpStatus" = 'APPROVED' THEN 'APPROVED'::"approval_status_enum"
              WHEN d."signUpStatus" = 'REJECTED' THEN 'REJECTED'::"approval_status_enum"
              ELSE 'PENDING'::"approval_status_enum"
            END
          FROM "drivers" d
          WHERE d."vehicleId" = v."id";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
