import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique } from "typeorm";

export class InitialMigration1739286971657 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
              name: "users",
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
                  type: "varchar",
                  isNullable: false,
                },
                {
                  name: "phoneNumber",
                  type: "varchar",
                  isNullable: true,
                  isUnique: true,
                },
                {
                  name: "email",
                  type: "varchar",
                  isUnique: true,
                  isNullable: false,
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
            })
          );

          await queryRunner.createTable(
            new Table({
                name: "addresses",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "country",
                        type: "text",
                        isNullable: false
                    },
                    {
                        name: "city",
                        type: "text",
                        isNullable: false
                    },
                    {
                        name: "district",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "street",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "buildingNumber",
                        type: "text",
                        isNullable: false
                    },
                    {
                        name: "floor",
                        type: "integer",
                        isNullable: false
                    },
                    {
                        name: "apartmentNumber",
                        type: "text",
                        isNullable: false
                    },
                    {
                        name: "zone",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "landmarks",
                        type: "text",
                        isNullable: true
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
                ]
            })
        );

         // Create ENUM type for service category names (PostgreSQL)
    await queryRunner.query(`
        CREATE TYPE "service_category_name" AS ENUM (
          'Services', 
          'Vehicles', 
          'Drivers',
          'Express'
        )
      `);
  
      // Create the `service_categories` table
      await queryRunner.createTable(
        new Table({
          name: "service_categories",
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
              type: "enum",
              enumName: "service_category_name",
              isUnique: true,
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
        })
      );

      // Create ENUM type for service subcategory names (PostgreSQL)
    await queryRunner.query(`
        CREATE TYPE "service_subcategory_name" AS ENUM (
          'Personal - Quick', 
          'Furniture Moving', 
          'Commercial / Retail',
          'Construction',
          'International'
        )
      `);

      await queryRunner.query(`
        CREATE TYPE "furnitureRequests" AS ENUM (
            'Move Your Home', 
            'Move Specific Furniture', 
            'Request Visit'
        )
    `);
  
      // Create the `service_subcategories` table
      await queryRunner.createTable(
        new Table({
          name: "service_subcategories",
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
              type: "enum",
              enumName: "service_subcategory_name",
            },
            {
              name: "type",
              type: "enum",
              enumName: "furnitureRequests",
              isNullable: true,
            },
            {
              name: "serviceCategoryId",
              type: "uuid",
              isNullable: false,
            },
            {
              name: "baseCost",
              type: "decimal",
              precision: 10,
              scale: 2,
              isNullable: true,
            },
            {
              name: "perLifterCost",
              type: "decimal",
              precision: 10,
              scale: 2,
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
        })
      );

      await queryRunner.createUniqueConstraint(
        "service_subcategories",
        new TableUnique({
          name: "UQ_service_subcategories_name_type",
          columnNames: ["name", "type"],
        })
      );
      // Add foreign key constraint for `serviceCategoryId`
      await queryRunner.createForeignKey(
        "service_subcategories",
        new TableForeignKey({
          columnNames: ["serviceCategoryId"],
          referencedColumnNames: ["id"],
          referencedTableName: "service_categories",
        })
      );

      //CREATE itemType ENUM
        await queryRunner.query(`
            CREATE TYPE "itemType" AS ENUM (
                'Clothing & Accessories',
                'Personal Electronics',
                'Books & Documents',
                'Gifts',
                'Hobby Items',
                'Food Items',
                'Electronics',
                'Apparel',
                'Furniture',
                'Packaged Goods',
                'Cosmetics',
                'Stationery',
                'Household Appliances',
                'Apartment',
                'Staff Accomodation',
                'Townhouse',
                'Villa',
                'Penthouse',
                'Bulk Unit',
                'Duplex',
                'Compound',
                'Hotel Apartment'
            )
        `);

      // Create status ENUM type for orders
        await queryRunner.query(`
            CREATE TYPE "orderStatus" AS ENUM (
                'pending_payment',
                'confirmed',
                'preparing',
                'en_route',
                'delivered',
                'cancelled',
                'failed'
            )
        `);

        // Create the `orders` table
      //Migration for creating the orders table
        await queryRunner.createTable(
            new Table({
                name: "orders",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "userId",
                        type: "uuid",
                        isNullable: false
                    },
                    {
                        name: "serviceSubcategoryId",
                        type: "uuid",
                        isNullable: false
                    },
                    {
                        name: "fromAddressId",
                        type: "uuid",
                        isNullable: false
                    },
                    {
                        name: "toAddressId",
                        type: "uuid",
                        isNullable: true
                    },
                    {
                        name: "pickUpDate",
                        type: "timestamp",
                        isNullable: false
                    },
                    {
                        name: "itemType",
                        type: "enum",
                        enumName: "itemType",
                        isNullable: true
                    },
                    {
                        name: "itemDescription",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "lifters",
                        type: "integer",
                        isNullable: true
                    },
                    {
                        name: "totalCost",
                        type: "decimal",
                        precision: 10,
                        scale: 2,
                        isNullable: true
                    },
                    {
                        name: "status",
                        type: "enum",
                        enumName: "orderStatus",
                        isNullable: false
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
                    }
                ]
            })
        );

        // Add foreign key constraint for `userId`
        await queryRunner.createForeignKey(
            "orders",
            new TableForeignKey({
                columnNames: ["userId"],
                referencedColumnNames: ["id"],
                referencedTableName: "users"
            })
        );

        // Add foreign key constraint for `serviceSubcategoryId`
        await queryRunner.createForeignKey(
            "orders",
            new TableForeignKey({
                columnNames: ["serviceSubcategoryId"],
                referencedColumnNames: ["id"],
                referencedTableName: "service_subcategories"
            })
        );

        // Add foreign key constraint for `fromAddressId`
        await queryRunner.createForeignKey(
            "orders",
            new TableForeignKey({
                columnNames: ["fromAddressId"],
                referencedColumnNames: ["id"],
                referencedTableName: "addresses"
            })
        );

        // Add foreign key constraint for `toAddressId`
        await queryRunner.createForeignKey(
            "orders",
            new TableForeignKey({
                columnNames: ["toAddressId"],
                referencedColumnNames: ["id"],
                referencedTableName: "addresses"
            })
        );

        // Create the `order_status_history` table
        await queryRunner.createTable(
            new Table({
                name: "order_status_history",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "orderId",
                        type: "uuid",
                        isNullable: false
                    },
                    {
                        name: "status",
                        type: "enum",
                        enumName: "orderStatus",
                        isNullable: false
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
                    }
                ]
            })
        );

        // Add foreign key constraint for `orderId`
        await queryRunner.createForeignKey(
            "order_status_history",
            new TableForeignKey({
                columnNames: ["orderId"],
                referencedColumnNames: ["id"],
                referencedTableName: "orders"
            })
        );

        // Create ENUM type for payment methods
        await queryRunner.query(`
            CREATE TYPE "paymentMethod" AS ENUM (
                'CASH_ON_DELIVERY',
                'CREDIT_DEBIT',
                'WALLET'
            )
        `);

        // Create ENUM type for payment statuses
        await queryRunner.query(`
            CREATE TYPE "paymentStatus" AS ENUM (
                'pending',
                'successful',
                'failed',
                'refunded',
                'cancelled'
            )
        `);

        // Add migration for creating the promo_codes table
        await queryRunner.createTable(
            new Table({
                name: "promo_codes",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "code",
                        type: "text",
                        isUnique: true,
                        isNullable: false
                    },
                    {
                        name: "discount",
                        type: "decimal",
                        precision: 10,
                        scale: 2,
                        isNullable: false
                    },
                    {
                        name: "validFrom",
                        type: "timestamp",
                        isNullable: false
                    },
                    {
                        name: "validTo",
                        type: "timestamp",
                        isNullable: false
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
                    }
                ]
            })
        );

        // Create the `payments` table
        await queryRunner.createTable(
            new Table({
                name: "payments",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "orderId",
                        type: "uuid",
                        isNullable: false
                    },
                    {
                        name: "promoCodeId",
                        type: "uuid",
                        isNullable: true
                    },
                    {
                        name: "paymentMethod",
                        type: "enum",
                        enumName: "paymentMethod",
                        isNullable: false
                    },
                    {
                        name: "totalAmount",
                        type: "decimal",
                        precision: 10,
                        scale: 2,
                        isNullable: false
                    },
                    {
                        name: "discountAmount",
                        type: "decimal",
                        precision: 10,
                        scale: 2,
                        isNullable: false
                    },
                    {
                        name: "finalAmount",
                        type: "decimal",
                        precision: 10,
                        scale: 2,
                        isNullable: false
                    },
                    {
                        name: "paymentStatus",
                        type: "enum",
                        enumName: "paymentStatus",
                        isNullable: false
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
                    }
                ]
            })
        );

        // Add foreign key constraint for `orderId`
        await queryRunner.createForeignKey(
            "payments",
            new TableForeignKey({
                columnNames: ["orderId"],
                referencedColumnNames: ["id"],
                referencedTableName: "orders"
            })
        );

        //Add foreign key constraint for `promoCodeId`
        await queryRunner.createForeignKey(
            "payments",
            new TableForeignKey({
                columnNames: ["promoCodeId"],
                referencedColumnNames: ["id"],
                referencedTableName: "promo_codes"
            })
        );

        // Create the `payment_status_history` table
        await queryRunner.createTable(
            new Table({
                name: "payment_status_history",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "paymentId",
                        type: "uuid",
                        isNullable: false
                    },
                    {
                        name: "status",
                        type: "enum",
                        enumName: "paymentStatus",
                        isNullable: false
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
                    }
                ]
            })
        );

        // Add foreign key constraint for `paymentId`
        await queryRunner.createForeignKey(
            "payment_status_history",
            new TableForeignKey({
                columnNames: ["paymentId"],
                referencedColumnNames: ["id"],
                referencedTableName: "payments"
            })
        );

        // Add migration for creating the user_promo_codes table
        await queryRunner.createTable(
            new Table({
                name: "user_promo_codes",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "userId",
                        type: "uuid",
                        isNullable: false
                    },
                    {
                        name: "promoCodeId",
                        type: "uuid",
                        isNullable: false
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
                    }
                ]
            })
        );

        // Add foreign key constraint for `userId`
        await queryRunner.createForeignKey(
            "user_promo_codes",
            new TableForeignKey({
                columnNames: ["userId"],
                referencedColumnNames: ["id"],
                referencedTableName: "users"
            })
        );

        // Add foreign key constraint for `promoCodeId`
        await queryRunner.createForeignKey(
            "user_promo_codes",
            new TableForeignKey({
                columnNames: ["promoCodeId"],
                referencedColumnNames: ["id"],
                referencedTableName: "promo_codes"
            })
        );


    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("payment_status_history");
        await queryRunner.dropTable("payments");
        await queryRunner.query(`DROP TYPE "paymentMethod"`);
        await queryRunner.query(`DROP TYPE "paymentStatus"`);
        
        await queryRunner.dropTable("order_status_history");
        await queryRunner.dropTable("orders");
        await queryRunner.query(`DROP TYPE "itemType"`);
        await queryRunner.query(`DROP TYPE "orderStatus"`);
        
        await queryRunner.dropTable("user_promo_codes");
        await queryRunner.dropTable("promo_codes");
        
        await queryRunner.dropUniqueConstraint("service_subcategories", "UQ_service_subcategories_name_type");
        await queryRunner.dropTable("service_subcategories");
        await queryRunner.query(`DROP TYPE "service_subcategory_name"`);
        await queryRunner.query(`DROP TYPE "furnitureRequests"`);
        
        await queryRunner.dropTable("service_categories");
        await queryRunner.query(`DROP TYPE "service_category_name"`);
        
        await queryRunner.dropTable("addresses");
        
        await queryRunner.dropTable("users");        
    }

}
