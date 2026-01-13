import { MigrationInterface, QueryRunner } from "typeorm";

export class IsDeleted1768301026518 implements MigrationInterface {
    name = 'IsDeleted1768301026518'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "generator"."relations" ADD "is_deleted" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "generator"."relations" DROP COLUMN "is_deleted"`);
    }

}
