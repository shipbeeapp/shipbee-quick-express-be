import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique, TableColumn } from "typeorm";
import { VehicleType } from "../utils/enums/vehicleType.enum.js";

export class AddDriverModel1753372238514 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the "drivers" table with vehcile relation
        await queryRunner.createTable(
            new Table({
                name: "drivers",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()",
                    },
                    {
                        name: "name",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "phoneNumber",
                        type: "text",
                        isUnique: true,
                        isNullable: true,
                    },
                    {
                        name: "password",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "otp",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "vehicleId",
                        type: "uuid",
                        isNullable: true,
                    },
                    {
                        name: "createdAt",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                      },
                      {
                        name: "updatedAt",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        onUpdate: "CURRENT_TIMESTAMP",
                      },
                ],
            }),
        );
        // Create foreign key for vehicle relation
        await queryRunner.createForeignKey(
            "drivers",
            new TableForeignKey({
                columnNames: ["vehicleId"],
                referencedColumnNames: ["id"],
                referencedTableName: "vehicles",
                onDelete: "SET NULL",
            }),
        );

        //remove relation with vehicle from orders
        const orderTable = await queryRunner.getTable("orders");
        const vehicleForeignKey = orderTable.foreignKeys.find(fk => fk.columnNames.indexOf("vehicleId") !== -1);
        if (vehicleForeignKey) {
            await queryRunner.dropForeignKey("orders", vehicleForeignKey);
        }
        // Remove vehicleId column from orders table
        await queryRunner.dropColumn("orders", "vehicleId");
        // Add vehicleType column to orders table
        await queryRunner.addColumn("orders", new TableColumn({
            name: "vehicleType",
            type: "enum",
            enum: [
                VehicleType.SEDAN_CAR,
                VehicleType.MOTORCYCLE,
                VehicleType.VAN,
                VehicleType.CHILLER_VAN,
                VehicleType.FREEZER_VAN,
                VehicleType.PICKUP_TRUCK_TWO_TONS,
                VehicleType.PICKUP_TRUCK_THREE_TONS,
                VehicleType.CANTER_TRUCK,
                VehicleType.FLAT_BED_TRUCK,
                VehicleType.LOW_BED_TRUCK,
                VehicleType.GARBAGE_REMOVAL_TRUCK,
                VehicleType.CHILLER_TRUCK,
            ], // Adjust this based on your VehicleType enum
            isNullable: true,
        }));

        //add driverId column to orders table
        await queryRunner.addColumn("orders", new TableColumn({
            name: "driverId",
            type: "uuid",
            isNullable: true,
        }));
        //add foreign key for driver relation in orders table
        await queryRunner.createForeignKey(
            "orders",
            new TableForeignKey({
                columnNames: ["driverId"],
                referencedColumnNames: ["id"],
                referencedTableName: "drivers",
                onDelete: "SET NULL",
            }),
        );

        // add number column to vehicle model
        const vehicleTable = await queryRunner.getTable("vehicles");
        const numberColumn = vehicleTable.columns.find(column => column.name === "number");
        if (!numberColumn) {
            await queryRunner.addColumn("vehicles", new TableColumn({
                name: "number",
                type: "text",
                isNullable: true,
            }));
        }
    }


    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key for vehicle relation
        const table = await queryRunner.getTable("drivers");
        const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("vehicleId") !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey("drivers", foreignKey);
        }
        // Add vehicleId column back to orders table
        await queryRunner.addColumn("orders", new TableColumn({
            name: "vehicleId",
            type: "uuid",
            isNullable: true,
        }));
        // Add foreign key for vehicle relation in orders table
        await queryRunner.createForeignKey(
            "orders",
            new TableForeignKey({
                columnNames: ["vehicleId"],
                referencedColumnNames: ["id"],
                referencedTableName: "vehicles",
                onDelete: "SET NULL",
            }),
        );
        // Remove vehicleType column from orders table
        await queryRunner.dropColumn("orders", "vehicleType");

        // Remove driverId column from orders table
        const orderTable = await queryRunner.getTable("orders");
        const driverForeignKey = orderTable.foreignKeys.find(fk => fk.columnNames.indexOf("driverId") !== -1);
        if (driverForeignKey) {
            await queryRunner.dropForeignKey("orders", driverForeignKey);
            await queryRunner.dropColumn("orders", "driverId");
        }

        // Drop the "drivers" table
        await queryRunner.dropTable("drivers");

        // Remove number column from vehicle model
        const vehicleTable = await queryRunner.getTable("vehicles");
        const numberColumn = vehicleTable.columns.find(column => column.name === "number");
        if (numberColumn) {
            await queryRunner.dropColumn("vehicles", "number");
        }
    }

}
