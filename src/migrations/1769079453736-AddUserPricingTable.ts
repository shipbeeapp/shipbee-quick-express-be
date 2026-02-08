import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserPricingTable1769079453736 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user_pricing" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "serviceSubcategory" "service_subcategory_name" NOT NULL,
                "vehicleType" vehicle_type_enum,
                "minDistance" decimal,
                "maxDistance" decimal,
                "baseCost" decimal,
                "thresholdDistance" decimal,
                "additionalPerKm" decimal,
                "fromCountry" varchar,
                "toCountry" varchar,
                "maxWeight" decimal,
                "firstKgCost" decimal,
                "additionalKgCost" decimal,
                "transitTime" varchar,
                "isCurrent" boolean NOT NULL DEFAULT true,
                "userId" uuid NOT NULL,
                CONSTRAINT "FK_user_pricing_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            );
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_user_pricing_user_service_vehicle"
            ON "user_pricing" ("userId", "serviceSubcategory", "vehicleType");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "IDX_user_pricing_user_service_vehicle";
        `);

        await queryRunner.query(`
            DROP TABLE "user_pricing";
        `);
    }
}
