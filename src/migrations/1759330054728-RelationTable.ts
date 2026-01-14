import { MigrationInterface, QueryRunner } from 'typeorm';

export class RelationTable1759330054728 implements MigrationInterface {
  name = 'RelationTable1759330054728';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "generator"."relations" ("id" character varying NOT NULL DEFAULT gen_random_uuid(), "from_id" character varying NOT NULL, "to_id" character varying NOT NULL, "base_type" character varying NOT NULL, "object_type" character varying NOT NULL, "relation_type" character varying NOT NULL, "related_base_type" character varying NOT NULL, "related_object_type" character varying NOT NULL, CONSTRAINT "PK_964096eb20c2a6dd4e4bb17546f" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "generator"."relations"`);
  }
}
