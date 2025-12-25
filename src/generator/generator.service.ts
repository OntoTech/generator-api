import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, QueryFailedError, Repository, Table } from 'typeorm';
import { Service } from '../service/Service';
import { env } from '../util/env';
import { ModelService } from '../model/model.service';
import { IModel, ModelItem, ValidationResult } from '../util/types';
import { CreateGeneratorDto } from './dto/create-generator.dto';
import { UpdateGeneratorDto } from './dto/update-generator.dto';
import { SearchGeneratorDto } from './dto/search-generator.dto';
import { RelationService } from '../relation/relation.service';
import { Relation } from '../relation/entities/relation.entity';
import { Model } from '../model/entities/model.entity';

@Injectable()
export class GeneratorService extends Service {
  private relationRepository: Repository<Relation>;

  constructor(
    private dataSource: DataSource,
    private readonly modelService: ModelService,
    private readonly relationService: RelationService,
  ) {
    super();
    this.relationRepository = this.dataSource.getRepository(Relation);
  }

  async create(modelCode: string, createGeneratorDto: CreateGeneratorDto) {
    const modelData = await this.modelService.findOne(modelCode);
    const plainObject = {};

    for (const [key, value] of Object.entries(createGeneratorDto)) {
      if (typeof value === 'object') {
        continue;
      }

      plainObject[key] = value;
    }

    const rootModelItem = modelData.data.items.find((item) => item.props.description.includes('root'));

    await this.createTable(rootModelItem.props.code);

    const rootObject = await this.createRecord(rootModelItem.props.code, plainObject);

    const walkObject = async (data: any, parentId: string) => {
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          const targetModelItem = modelData.data.items.find((item) => item.props.code === key);

          const modelRelation = modelData.data.relations.find(
            ({ type, to }) => type === 'base:object--object' && to === targetModelItem.id,
          );

          await this.createTable(targetModelItem.props.code);

          const sourceModelItem = modelData.data.items.find((item) => item.id === modelRelation.from);

          for (const item of value) {
            const newRecord = await this.createRecord(targetModelItem.props.code, item);

            await this.relationService.create({
              fromId: parentId,
              toId: newRecord.id,
              baseType: sourceModelItem.baseModelItemId,
              objectType: sourceModelItem.type,
              relationType: modelRelation.type,
              relatedBaseType: targetModelItem.baseModelItemId,
              relatedObjectType: targetModelItem.type,
            });

            await walkObject(item, newRecord.id);
          }
        } else if (typeof value === 'object') {
          await walkObject(value, parentId);
        }
      }
    };

    await walkObject(createGeneratorDto, rootObject.id);
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

  async findOne(modelCode: string, code: string, nested?: boolean) {
    const modelData = await this.modelService.findOne(modelCode);

    try {
      const res = await this.dataSource.manager.query(
        `SELECT * FROM ${env.DATABASE_SCHEMA}."${modelCode}" WHERE code = $1`,
        [code],
      );

      if (!res.length) {
        throw new NotFoundException();
      }

      const rootObject = res[0];

      if (nested) {
        return this.findNested(rootObject, modelData);
      }

      return rootObject;
    } catch (err) {
      this.log.error({ error: err.message }, 'Error during select record');

      if (err instanceof NotFoundException) {
        throw err;
      }

      throw new HttpException(`Error during select record: ${err.message}`, 500);
    }
  }

  async findNested(root: any, modelData: Model) {
    const result = { ...root };

    const _findNested = async (object: any) => {
      const objectId = object.id;
      const relations = await this.relationRepository.find({ where: { fromId: objectId } });

      for (const relation of relations) {
        const modelItem = modelData.data.items.find(
          (item) => item.type === relation.relatedObjectType && item.baseModelItemId === relation.relatedBaseType,
        );

        const relatedRecords = await this.dataSource.manager.query(
          `SELECT * FROM ${env.DATABASE_SCHEMA}."${modelItem.props.code}" WHERE id = $1`,
          [relation.toId],
        );

        if (!Array.isArray(result[modelItem.props.code])) {
          result.data[modelItem.props.code] = [];
        }

        const relatedRecord = { ...relatedRecords[0].data, id: relatedRecords[0].id };

        result.data[modelItem.props.code].push(relatedRecord);

        await _findNested(relatedRecord);
      }
    };

    await _findNested(root);

    return result;
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

  async createTable(tableName: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

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
              isNullable: true,
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
      await queryRunner.release();
    } catch (e) {
      await queryRunner.release();
      this.log.error({ error: e.message }, `Error during create table ${tableName}`);
      throw new HttpException(`Error during create table ${tableName}: ${e.message}`, 500);
    }
  }

  private async createRecord(tableName: string, createGeneratorDto: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const result = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(`${env.DATABASE_SCHEMA}.${tableName}`)
        .values({ data: createGeneratorDto, code: createGeneratorDto.code || null })
        .returning('*')
        .execute();

      await queryRunner.release();

      return {
        ...result.raw[0],
      };
    } catch (err) {
      await queryRunner.release();
      this.log.error({ error: err.message }, 'Error during insert record');

      if (err instanceof QueryFailedError && err.driverError.code === '23505') {
        throw new HttpException(err.driverError.detail, 400);
      }

      throw new HttpException(err.message, 500);
    }
  }
}
