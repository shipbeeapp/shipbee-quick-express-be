import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDriverTags1771078966854 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        //CREATE table tags
        await queryRunner.query(`
            CREATE TABLE tags (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "createdAt" timestamptz NOT NULL DEFAULT now(),
                "updatedAt" timestamptz NOT NULL DEFAULT now(),
                name varchar(255) NOT NULL UNIQUE
            )
        `);

        await queryRunner.query(`
            CREATE TABLE driver_tags (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "createdAt" timestamptz NOT NULL DEFAULT now(),
                "updatedAt" timestamptz NOT NULL DEFAULT now(),
                "driverId" uuid NOT NULL,
                "tagId" uuid NOT NULL,
                CONSTRAINT "FK_driver_tags_driver" FOREIGN KEY ("driverId") REFERENCES drivers(id) ON DELETE CASCADE,
                CONSTRAINT "FK_driver_tags_tag" FOREIGN KEY ("tagId") REFERENCES tags(id) ON DELETE CASCADE,
                UNIQUE ("driverId", "tagId")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE driver_tags`);
        await queryRunner.query(`DROP TABLE tags`);
    }

}
