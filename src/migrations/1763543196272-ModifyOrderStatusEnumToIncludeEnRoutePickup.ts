import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifyOrderStatusEnumToIncludeEnRoutePickup1763543196272 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop defaults on dependent columns
    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "order_stops" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "order_status_history" ALTER COLUMN "status" DROP DEFAULT`);

    // 2. Rename the existing enum type
    await queryRunner.query(`ALTER TYPE "orderStatus" RENAME TO "order_status_enum_old"`);

    // 3. Create the new enum type with the additional value
    await queryRunner.query(`
      CREATE TYPE "order_status_enum" AS ENUM(
        'Pending',
        'Assigned',
        'En Route to Pickup',
        'Active',
        'Completed',
        'Canceled'
      )
    `);

    // 4. Update the columns to use the new enum type
    await queryRunner.query(`
      ALTER TABLE "orders"
      ALTER COLUMN "status" TYPE "order_status_enum"
      USING "status"::text::"order_status_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "order_stops"
      ALTER COLUMN "status" TYPE "order_status_enum"
      USING "status"::text::"order_status_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "order_status_history"
      ALTER COLUMN "status" TYPE "order_status_enum"
      USING "status"::text::"order_status_enum"
    `);

    // 5. Drop the old enum type
    await queryRunner.query(`DROP TYPE "order_status_enum_old"`);

    // 6. (Optional) Restore defaults if required
    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'Pending'`);
    await queryRunner.query(`ALTER TABLE "order_stops" ALTER COLUMN "status" SET DEFAULT 'Pending'`);
    await queryRunner.query(`ALTER TABLE "order_status_history" ALTER COLUMN "status" SET DEFAULT 'Pending'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop defaults on dependent columns
    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "order_stops" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "order_status_history" ALTER COLUMN "status" DROP DEFAULT`);

    // 2. Rename the existing enum type
    await queryRunner.query(`ALTER TYPE "order_status_enum" RENAME TO "order_status_enum_new"`);

    // 3. Recreate the old enum type without the additional value
    await queryRunner.query(`
      CREATE TYPE "orderStatus" AS ENUM(
        'Pending',
        'Assigned',
        'Active',
        'Completed',
        'Canceled'
      )
    `);

    // 4. Update the columns to use the old enum type
    await queryRunner.query(`
      ALTER TABLE "orders"
      ALTER COLUMN "status" TYPE "orderStatus"
      USING "status"::text::"orderStatus"
    `);
    await queryRunner.query(`
      ALTER TABLE "order_stops"
      ALTER COLUMN "status" TYPE "orderStatus"
      USING "status"::text::"orderStatus"
    `);
    await queryRunner.query(`
      ALTER TABLE "order_status_history"
      ALTER COLUMN "status" TYPE "orderStatus"
      USING "status"::text::"orderStatus"
    `);

    // 5. Drop the new enum type
    await queryRunner.query(`DROP TYPE "order_status_enum_new"`);

    // 6. (Optional) Restore defaults if required
    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'Pending'`);
    await queryRunner.query(`ALTER TABLE "order_stops" ALTER COLUMN "status" SET DEFAULT 'Pending'`);
    await queryRunner.query(`ALTER TABLE "order_status_history" ALTER COLUMN "status" SET DEFAULT 'Pending'`);
  }
}