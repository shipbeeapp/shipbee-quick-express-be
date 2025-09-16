import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPricingTable1758011273700 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "pricing" (
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
                "isCurrent" boolean NOT NULL DEFAULT true
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "pricing";`);
    }

}
