import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewItemTypes1752141261233 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new item types to the enum
        await queryRunner.query(`
            ALTER TYPE "itemType" ADD VALUE 'Furniture & Decor';
        `);
        await queryRunner.query(`
            ALTER TYPE "itemType" ADD VALUE 'Office Essentials';
        `);
        await queryRunner.query(`
            ALTER TYPE "itemType" ADD VALUE 'Toys';
        `);
        await queryRunner.query(`
            ALTER TYPE "itemType" ADD VALUE 'Home Appliances';
        `);
        await queryRunner.query(`
            ALTER TYPE "itemType" ADD VALUE 'Pet Items';
        `);
        await queryRunner.query(`
            ALTER TYPE "itemType" ADD VALUE 'Business Industrial';
        `);
        await queryRunner.query(`
            ALTER TYPE "itemType" ADD VALUE 'Construction Items';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the new item types from the enum
        // Note: TypeORM does not support removing values from enums directly.
        // You may need to recreate the enum without the removed values if necessary.
        // This is a placeholder for down migration, as removing enum values is not straightforward.
        console.warn("Down migration for removing item types is not implemented, manual intervention may be required.");
    }

}
