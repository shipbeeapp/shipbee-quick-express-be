import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifyMandatoryFieldsAndAddOrderNumber1750280063917 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
         // 1. Make fields nullable in addresses
        await queryRunner.query(`
            ALTER TABLE "addresses"
            ALTER COLUMN "country" DROP NOT NULL,
            ALTER COLUMN "city" DROP NOT NULL,
            ALTER COLUMN "buildingNumber" DROP NOT NULL,
            ALTER COLUMN "floor" DROP NOT NULL,
            ALTER COLUMN "apartmentNumber" DROP NOT NULL
        `);

        // 2. Make email nullable in users
        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "email" DROP NOT NULL
          `);

        // 3. Add orderNo column to orders
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "orderNo" integer UNIQUE
          `);
        
          // 4. Create a sequence and set it as default for orderNo
          await queryRunner.query(`
            CREATE SEQUENCE order_no_seq START 1;
            ALTER TABLE "orders"
            ALTER COLUMN "orderNo" SET DEFAULT nextval('order_no_seq')
          `);

          // 5. Backfill existing orders with sequential order numbers
          await queryRunner.query(`
              WITH numbered AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
                FROM orders
              )
              UPDATE orders
              SET "orderNo" = numbered.rn
              FROM numbered
              WHERE orders.id = numbered.id
            `);
          
            // 6. Advance the sequence to the next available number
            await queryRunner.query(`
              SELECT setval('order_no_seq', (SELECT MAX("orderNo") FROM orders))
            `);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes in down migration
    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "orderNo" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "orderNo"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS order_no_seq`);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "email" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "addresses"
      ALTER COLUMN "country" SET NOT NULL,
      ALTER COLUMN "city" SET NOT NULL,
      ALTER COLUMN "buildingNumber" SET NOT NULL,
      ALTER COLUMN "floor" SET NOT NULL,
      ALTER COLUMN "apartmentNumber" SET NOT NULL
    `);
    }

}
