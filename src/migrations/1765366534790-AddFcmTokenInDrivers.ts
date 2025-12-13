import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFcmTokenInDrivers1765366534790 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drivers" ADD COLUMN "fcmToken" TEXT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "fcmToken"`);
    }

}
