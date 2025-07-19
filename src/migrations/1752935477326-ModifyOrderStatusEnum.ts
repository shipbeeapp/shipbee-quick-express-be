import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifyOrderStatusEnum1752935477326 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TYPE "orderStatus" RENAME TO "order_status_enum_old";
        `);

        await queryRunner.query(`
            CREATE TYPE "orderStatus" AS ENUM(
                'Pending',
                'Assigned',
                'Active',
                'Completed',
                'Canceled',
                'confirmed'
            );
        `);

        await queryRunner.query(`
            ALTER TABLE "order_status_history" ALTER COLUMN "status" TYPE "orderStatus" USING "status"::text::"orderStatus";
        `);

        await queryRunner.query(`
            ALTER TABLE "orders" ALTER COLUMN "status" TYPE "orderStatus" USING "status"::text::"orderStatus";
        `);

        await queryRunner.query(`
            DROP TYPE "order_status_enum_old";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TYPE "orderStatus" RENAME TO "order_status_enum_new";
        `);

        await queryRunner.query(`
            CREATE TYPE "orderStatus" AS ENUM(
                'pending_payment',
                'confirmed',
                'preparing',
                'en_route',
                'delivered',
                'canceled',
                'failed'
            );
        `);

        await queryRunner.query(`
            ALTER TABLE "order_status_history" ALTER COLUMN "status" TYPE "orderStatus" USING "status"::text::"orderStatus";
        `);

        await queryRunner.query(`
            ALTER TABLE "orders" ALTER COLUMN "status" TYPE "orderStatus" USING "status"::text::"orderStatus";
        `);

        await queryRunner.query(`
            DROP TYPE "order_status_enum_new";
        `);
    }

}
