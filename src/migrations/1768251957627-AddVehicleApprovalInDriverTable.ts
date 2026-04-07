import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddVehicleApprovalInDriverTable1768251957627 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drivers" 
            ADD COLUMN "vehicleInfoApprovalStatus" "approval_status_enum" DEFAULT 'PENDING',
            ADD COLUMN "vehicleInfoRejectionReason" TEXT;
            `
        )

        await queryRunner.query(`
            UPDATE drivers d
            SET
              "vehicleInfoApprovalStatus" = v."infoApprovalStatus",
              "vehicleInfoRejectionReason" = v."infoRejectionReason"
            FROM vehicles v
            WHERE d."vehicleId" = v.id;
            `
        )
        console.log("fesyat")
        // 3️⃣ Drop columns from vehicle
        await queryRunner.query(`ALTER TABLE vehicles DROP COLUMN "infoApprovalStatus"`)
        console.log("heehejekekek")
        await queryRunner.query(`ALTER TABLE vehicles DROP COLUMN "infoRejectionReason"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1️⃣ Add columns back to vehicle
        await queryRunner.addColumns("vehicles", [
          new TableColumn({
            name: "infoApprovalStatus",
            type: "varchar",
            isNullable: true,
          }),
          new TableColumn({
            name: "infoRejectionReason",
            type: "text",
            isNullable: true,
          }),
        ]);

        // 2️⃣ Copy data back from drivers to vehicle
        await queryRunner.query(`
          UPDATE vehicles v
          SET
            "infoApprovalStatus" = d."vehicleInfoApprovalStatus",
            "infoRejectionReason" = d."vehicleInfoRejectionReason"
          FROM drivers d
          WHERE d."vehicleId" = v.id;
        `);

        // 3️⃣ Drop columns from drivers
        await queryRunner.query(`ALTER TABLE drivers DROP COLUMN "vehicleInfoApprovalStatus"`);
        await queryRunner.query(`ALTER TABLE drivers DROP COLUMN "vehicleInfoRejectionReason"`)
      
    }

}
