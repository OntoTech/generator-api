import { MigrationInterface, QueryRunner } from 'typeorm';

export class RelationsDateColumns1774007668294 implements MigrationInterface {
  name = 'RelationsDateColumns1774007668294';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "generator"."relations" ADD "created_at" TIMESTAMP NOT NULL DEFAULT NOW()`);
    await queryRunner.query(`ALTER TABLE "generator"."relations" ADD "updated_at" TIMESTAMP DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "generator"."relations" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "generator"."relations" DROP COLUMN "created_at"`);
  }
}
