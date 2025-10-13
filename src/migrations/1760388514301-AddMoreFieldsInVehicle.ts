import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMoreFieldsInVehicle1760388514301 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          ALTER TABLE "vehicles"
          ADD COLUMN "productionYear" text,
          ADD COLUMN color text;
        `);
        console.log("Added productionYear and color columns to vehicles table");

        // Add check constraint for productionYear to be a valid year and not more than current year + 1
        await queryRunner.query(`
          ALTER TABLE "vehicles"
          ADD CONSTRAINT production_year_check CHECK (
            "productionYear" ~ '^(19|20)\\d{2}$' AND
            CAST("productionYear" AS INTEGER) <= EXTRACT(YEAR FROM CURRENT_DATE) + 1
            OR "productionYear" IS NULL
          )
        `);
        console.log("Added check constraint to productionYear column in vehicles table");

        // Add check constraint for number to be all digits and max 6 characters
        await queryRunner.query(`
          ALTER TABLE "vehicles"
          ADD CONSTRAINT number_check CHECK ("number" ~ '^[0-9]{0,6}$' OR "number" IS NULL)
        `);
        console.log("Added check constraint to number column in vehicles table");

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          ALTER TABLE "vehicles"
          DROP CONSTRAINT production_year_check,
          DROP CONSTRAINT number_check,
          DROP COLUMN "productionYear",
          DROP COLUMN "color";
        `);
        console.log("Removed productionYear and color columns from vehicles table");
    }

}
