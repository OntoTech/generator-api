import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTables1755792118993 implements MigrationInterface {
  name = 'CreateTables1755792118993';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "generator"."models" ("id" character varying NOT NULL DEFAULT gen_random_uuid(), "code" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP DEFAULT now(), "data" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "UQ_1a8ee94e24ab29d0552152eee25" UNIQUE ("code"), CONSTRAINT "PK_ef9ed7160ea69013636466bf2d5" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "generator"."models"`);
  }
}
