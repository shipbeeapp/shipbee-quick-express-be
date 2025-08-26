import { MigrationInterface, QueryRunner,Table, TableForeignKey } from "typeorm";

export class AddShipmentTable1756200923757 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "shipments",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()",
                    },
                    {
                        name: "createdAt",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        onUpdate: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updatedAt",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        onUpdate: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "weight",
                        type: "numeric",
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: "itemCount",
                        type: "int",
                        isNullable: true,
                    },
                    {
                        name: "totalValue",
                        type: "numeric",
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: "length",
                        type: "numeric",
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: "width",
                        type: "numeric",
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: "height",
                        type: "numeric",
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                    },
                ],
            }),
            true
        );

        // 2. Add shipmentId column in orders
        await queryRunner.query(`ALTER TABLE "orders" ADD "shipmentId" uuid NULL;`);

        await queryRunner.createForeignKey(
            "orders",
            new TableForeignKey({
                columnNames: ["shipmentId"],
                referencedTableName: "shipments",
                referencedColumnNames: ["id"],
                onDelete: "SET NULL",
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop FK shipmentId from orders
        const orderTable = await queryRunner.getTable("orders");
        const shipmentFk = orderTable.foreignKeys.find(fk => fk.columnNames.indexOf("shipmentId") !== -1);
        if (shipmentFk) {
            await queryRunner.dropForeignKey("orders", shipmentFk);
        }

        // Drop column
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "shipmentId"`);
        
        // Drop shipments table
        await queryRunner.dropTable("shipments");
    }

}
