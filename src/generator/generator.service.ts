import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, QueryFailedError, QueryRunner, Table } from 'typeorm';
import { Service } from '../service/Service';
import { env } from '../util/env';
import { ModelService } from '../model/model.service';
import { IModel, ModelItem, ValidationResult } from '../util/types';
import { CreateGeneratorDto } from './dto/create-generator.dto';
import { UpdateGeneratorDto } from './dto/update-generator.dto';
import { SearchGeneratorDto } from './dto/search-generator.dto';

@Injectable()
export class GeneratorService extends Service {
  constructor(
    private dataSource: DataSource,
    private readonly modelService: ModelService,
  ) {
    super();
  }

  async create(modelCode: string, createGeneratorDto: CreateGeneratorDto) {
    const modelData = await this.modelService.findOne(modelCode);
    const validationResult = await this.validateModelData(modelData.data, createGeneratorDto);

    if (!validationResult.isValid) {
      throw new HttpException(
        {
          errors: validationResult.errors,
        },
        500,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await this.createTableIfNotExists(queryRunner, modelData.code);
      const result = await this.createRecord(queryRunner, modelData.data, createGeneratorDto);
      await queryRunner.release();
      return result;
    } catch (err) {
      await queryRunner.release();
      throw err;
    }
  }

  async findAll(tableName: string) {
    try {
      const totalRes = await this.dataSource.manager.query(
        `SELECT COUNT(*) FROM ${env.DATABASE_SCHEMA}."${tableName}"`,
      );

      const res = await this.dataSource.manager.query(`SELECT * FROM ${env.DATABASE_SCHEMA}."${tableName}"`);

      return {
        items: res,
        total: +totalRes[0].count,
      };
    } catch (err) {
      this.log.error({ error: err.message }, 'Error during select all records');
      throw new HttpException(`Error during select all records: ${err.message}`, 500);
    }
  }

  async search(modelCode: string, searchGeneratorDto: SearchGeneratorDto[]) {
    try {
      const res = await this.dataSource.manager.query(`SELECT * FROM ${env.DATABASE_SCHEMA}."${modelCode}"`);
      let searchItems = [];

      searchGeneratorDto.forEach((search) => {
        const found = res.filter((item: Record<string, any>) => item.data[search.attributeName] === search.searchQuery);

        searchItems = [...searchItems, ...found];
      });

      return {
        items: searchItems,
        total: searchItems.length,
      };
    } catch (err) {
      this.log.error({ error: err.message }, 'Error during select all records');
      throw new HttpException(`Error during select all records: ${err.message}`, 500);
    }
  }

  async findOne(tableName: string, code: string) {
    try {
      const res = await this.dataSource.manager.query(
        `SELECT * FROM ${env.DATABASE_SCHEMA}."${tableName}" WHERE code = $1`,
        [code],
      );

      if (!res.length) {
        throw new NotFoundException();
      }

      return res[0];
    } catch (err) {
      this.log.error({ error: err.message }, 'Error during select record');

      if (err instanceof NotFoundException) {
        throw err;
      }

      throw new HttpException(`Error during select record: ${err.message}`, 500);
    }
  }

  async update(tableName: string, code: string, updateGeneratorDto: UpdateGeneratorDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .update(`${env.DATABASE_SCHEMA}.${tableName}`)
        .set({ data: updateGeneratorDto, updated_at: new Date() })
        .where('code = :code', { code })
        .execute();
    } catch (err) {
      this.log.error({ error: err.message }, 'Error during update record');
      throw new HttpException(`Error during update record: ${err.message}`, 500);
    }
  }

  async patch(modelCode: string, objectCode: string, record: UpdateGeneratorDto) {
    const objectRecord = await this.findOne(modelCode, objectCode);

    for (const [key, value] of Object.entries(record)) {
      objectRecord.data[key] = value;
    }

    try {
      await this.dataSource.manager
        .createQueryBuilder()
        .update(`${process.env.DATABASE_SCHEMA}.${modelCode}`)
        .set({ data: objectRecord.data, updated_at: new Date() })
        .where('code = :code', { code: objectCode })
        .execute();
    } catch (err) {
      this.log.error({ error: err.message }, 'Error during patch record');
      throw new HttpException(`Error during patch record: ${err.message}`, 500);
    }
  }

  async remove(tableName: string, code: string) {
    try {
      await this.dataSource.manager
        .createQueryBuilder()
        .delete()
        .from(`${env.DATABASE_SCHEMA}.${tableName}`)
        .where('code = :code', { code })
        .execute();
    } catch (err) {
      this.log.error({ error: err.message }, 'Error during delete record');
      throw new HttpException(`Error during delete record: ${err.message}`, 500);
    }
  }

  async validateModelData(model: IModel, data: Record<string, any>): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
    };

    try {
      // Map item ID to its definition
      const itemMap = new Map<string, ModelItem>();
      for (const item of model.items) {
        itemMap.set(item.id, item);
      }

      // Build a map of item ID to code for quick lookup
      const idToCode = new Map<string, string>();
      for (const item of model.items) {
        idToCode.set(item.id, item.props.code);
      }

      // Collect required fields and their associated item IDs
      const requiredFields: Record<string, string> = {};
      for (const relation of model.relations) {
        if (relation.props?.isRequired === true) {
          const toItem = itemMap.get(relation.to);
          if (toItem && toItem.props.code) {
            requiredFields[toItem.props.code] = relation.to;
          }
        }
      }

      this.validateObject(model, data);

      return result;
    } catch (error) {
      return {
        isValid: false,
        errors: [`Error validating data: ${error.message}`],
      };
    }
  }

  validateObject(modelData: IModel, data: Record<string, any>) {
    for (const item of modelData.items) {
      if (item.type.endsWith('-root')) {
        if (item.type !== data.type || item.props.code !== data.objectTypeCode || item.id !== data.typeId) {
          throw new HttpException('Invalid type.', 500);
        }
      } else {
        if (data[item.props.code] === undefined || data[item.props.code] === null) {
          throw new HttpException(`Field "${item.props.code}" is missing.`, 500);
        }
      }
    }
  }

  private async createTableIfNotExists(queryRunner: QueryRunner, tableName: string) {
    try {
      await queryRunner.createTable(
        new Table({
          name: tableName,
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              isUnique: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            {
              name: 'code',
              type: 'varchar',
              isUnique: true,
            },
            {
              name: 'data',
              type: 'jsonb',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              isNullable: true,
            },
          ],
        }),
        true,
      );
    } catch (e) {
      this.log.error({ error: e.message }, `Error during create table ${tableName}`);
      throw new HttpException(`Error during create table ${tableName}: ${e.message}`, 500);
    }
  }

  private async createRecord(queryRunner: QueryRunner, modelData: IModel, createGeneratorDto: any) {
    try {
      const res = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(`${env.DATABASE_SCHEMA}.${modelData.code}`)
        .values({ data: createGeneratorDto, code: createGeneratorDto.code })
        .returning('*')
        .execute();

      return {
        ...res.raw[0],
      };
    } catch (err) {
      this.log.error({ error: err.message }, 'Error during insert record');

      if (err instanceof QueryFailedError && err.driverError.code === '23505') {
        throw new HttpException(err.driverError.detail, 400);
      }

      throw new HttpException(err.message, 500);
    }
  }
}
