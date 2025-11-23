import { MigrationInterface, QueryRunner } from "typeorm";

export class AddShopSettingsTable1763899376760 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "shop_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "shopDomain" VARCHAR(100) NOT NULL UNIQUE,
                "pickupAddress" VARCHAR(255),
                "senderPhoneNumber" VARCHAR(20),
                "senderEmail" VARCHAR(30),
                "itemType" "itemType",
                "vehicleType" vehicle_type_enum,
                "latitude" TEXT NOT NULL,
                "longitude" TEXT NOT NULL,
                CONSTRAINT "PK_shop_settings_id" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "shop_settings"
        `);
    }

}
