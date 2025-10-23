import { MigrationInterface, QueryRunner } from "typeorm";

export class AddModificationsToPromoCode1761207892348 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "promo_codes" ADD "isActive" boolean DEFAULT true`);
        //Add enum for PromoCodeType with default PROMOTIONAL
        await queryRunner.query(`
            CREATE TYPE "discount_type_enum" AS ENUM ('fixed', 'percentage');
        `);
            
        await queryRunner.query(`
          ALTER TABLE "promo_codes" ADD COLUMN "discountType" "discount_type_enum" NOT NULL;
        `);
        await queryRunner.query(`ALTER TABLE "promo_codes" RENAME COLUMN "discount" TO "discountValue"`);
        await queryRunner.query(`ALTER TABLE "promo_codes" ADD COLUMN "maxDiscount" decimal(10,2)`);
        await queryRunner.query(`ALTER TABLE "promo_codes" ADD COLUMN "minOrderAmount" decimal(10,2)`);
        await queryRunner.query(`ALTER TABLE "promo_codes" ADD COLUMN "usageLimit" integer`);
        await queryRunner.query(`CREATE TYPE "promo_code_type_enum" AS ENUM('Signup', 'Referral', 'Seasonal', 'Promotional')`);
        await queryRunner.query(`ALTER TABLE "promo_codes" ADD "type" "promo_code_type_enum" DEFAULT 'Promotional'`);
        await queryRunner.query(`ALTER TABLE "user_promo_codes" ADD "usageCount" integer DEFAULT 0`);
        //remove not null constraints from validFrom and validTo
        await queryRunner.query(`ALTER TABLE "promo_codes" ALTER COLUMN "validFrom" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "promo_codes" ALTER COLUMN "validTo" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "promo_codes" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "promo_codes" DROP COLUMN "discountType"`);
        await queryRunner.query(`ALTER TABLE "promo_codes" RENAME COLUMN "discountValue" TO "discount"`);
        await queryRunner.query(`ALTER TABLE "promo_codes" DROP COLUMN "maxDiscount"`);
        await queryRunner.query(`ALTER TABLE "promo_codes" DROP COLUMN "minOrderAmount"`);
        await queryRunner.query(`ALTER TABLE "promo_codes" DROP COLUMN "usageLimit"`);
        await queryRunner.query(`ALTER TABLE "promo_codes" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "promo_code_type_enum"`);
        await queryRunner.query(`ALTER TABLE "user_promo_codes" DROP COLUMN "usageCount"`);
        await queryRunner.query(`ALTER TABLE "promo_codes" ALTER COLUMN "validFrom" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "promo_codes" ALTER COLUMN "validTo" SET NOT NULL`);
        await queryRunner.query(`DROP TYPE "discount_type_enum"`);
    }

}
