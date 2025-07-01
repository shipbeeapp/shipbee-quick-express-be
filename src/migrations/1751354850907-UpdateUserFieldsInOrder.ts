import { MigrationInterface, QueryRunner, TableForeignKey, TableColumn } from "typeorm";

export class UpdateUserFieldsInOrder1751354850907 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("orders");
        const userForeignKey = table!.foreignKeys.find(fk => fk.columnNames.includes("userId"));
        if (userForeignKey) {
            await queryRunner.dropForeignKey("orders", userForeignKey);
          }
      
          // Drop userId column
          await queryRunner.dropColumn("orders", "userId");
      
          // Add senderUserId column
          await queryRunner.addColumn(
            "orders",
            new TableColumn({
              name: "senderUserId",
              type: "uuid",
              isNullable: true,
            })
          );
      
          // Add receiverUserId column
          await queryRunner.addColumn(
            "orders",
            new TableColumn({
              name: "receiverUserId",
              type: "uuid",
              isNullable: true,
            })
          );
      
          // Add foreign key for senderUserId
          await queryRunner.createForeignKey(
            "orders",
            new TableForeignKey({
              columnNames: ["senderUserId"],
              referencedColumnNames: ["id"],
              referencedTableName: "users",
            })
          );
      
          // Add foreign key for receiverUserId
          await queryRunner.createForeignKey(
            "orders",
            new TableForeignKey({
              columnNames: ["receiverUserId"],
              referencedColumnNames: ["id"],
              referencedTableName: "users",
            })
          );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys
    const table = await queryRunner.getTable("orders");
    const senderFK = table!.foreignKeys.find(fk => fk.columnNames.includes("senderUserId"));
    const receiverFK = table!.foreignKeys.find(fk => fk.columnNames.includes("receiverUserId"));

     if (senderFK) {
       await queryRunner.dropForeignKey("orders", senderFK);
     }
 
     if (receiverFK) {
       await queryRunner.dropForeignKey("orders", receiverFK);
     }
 
     // Drop columns
     await queryRunner.dropColumn("orders", "senderUserId");
     await queryRunner.dropColumn("orders", "receiverUserId");
 
     // Re-add userId column
     await queryRunner.addColumn(
       "orders",
       new TableColumn({
         name: "userId",
         type: "uuid",
         isNullable: true,
       })
     );
 
     // Re-add foreign key for userId
     await queryRunner.createForeignKey(
       "orders",
       new TableForeignKey({
         columnNames: ["userId"],
         referencedColumnNames: ["id"],
         referencedTableName: "users",
       })
     )
    }

}
