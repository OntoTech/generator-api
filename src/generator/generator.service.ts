import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, QueryFailedError, Repository, Table } from 'typeorm';
import { randomUUID } from 'crypto';
import { Service } from '../service/Service';
import { env } from '../util/env';
import { ModelService } from '../model/model.service';
import { IModel, ModelItem, SearchType, ValidationResult } from '../util/types';
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
      if (typeof value === 'object' && Array.isArray(value) && typeof value[0] === 'object') {
        continue;
      }

      plainObject[key] = value;
    }

    const rootModelItem = modelData.data.items.find((item) => item.props.description.includes('root'));

    await this.createTable(rootModelItem.props.code);

    const { code } = createGeneratorDto;

    const rootObject = await this.createRecord(rootModelItem.props.code, { ...plainObject, code });

    const walkObject = async (data: any, parentId: string) => {
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          const targetModelItem = modelData.data.items.find((item) => item.props.code === key);

          if (!targetModelItem) {
            this.log.info(`No target model item found for key: ${key}`);
            continue;
          }

          const modelRelation = modelData.data.relations.find(
            ({ type, to }) => type === 'base:object--object' && to === targetModelItem.id,
          );

          if (!modelRelation) {
            this.log.info(
              `No model relation found for key ${key} (id=${targetModelItem.id}) and type base:object--object`,
            );
            continue;
          }

          await this.createTable(targetModelItem.props.code);

          const sourceModelItem = modelData.data.items.find((item) => item.id === modelRelation.from);

          for (const item of value) {
            const plainItem = {};

            for (const [key, v] of Object.entries(item)) {
              if (typeof v === 'object' && Array.isArray(v) && (typeof v[0] === 'object' || !v.length)) {
                continue;
              }

              plainItem[key] = v;
            }

            const newRecord = await this.createRecord(targetModelItem.props.code, plainItem);

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
        } else if (typeof value === 'object' && value !== null) {
          await walkObject(value, parentId);
        }
      }
    };

    await walkObject(createGeneratorDto, rootObject.id);

    return rootObject;
  }

  async findAll(
    modelCode: string,
    nested?: boolean,
    page?: number,
    size?: number,
    sortColumn?: string,
    sortOrder?: 'ASC' | 'DESC',
    filters?: Record<string, any>,
  ) {
    const modelData = await this.modelService.findOne(modelCode);
    const rootModelItem = modelData.data.items.find((item) => item.props.description.includes('root'));
    const tableName = rootModelItem.props.code;

    const pageNum = page ?? 1;
    const pageSize = size ?? 10;
    const sortCol = sortColumn ?? 'created_at';
    const sortOrd = sortOrder ?? 'DESC';
    const offset = (pageNum - 1) * pageSize;

    try {
      let whereClause = '';
      const params: any[] = [];

      const buildCondition = (key: string, filterValue: any): { condition: string; params: any[] } => {
        const localParams: any[] = [];
        const isCondition = filterValue && typeof filterValue === 'object' && 'op' in filterValue;
        const op = isCondition ? filterValue.op : 'eq';
        const value = isCondition ? filterValue.value : filterValue;

        switch (op) {
          case 'eq':
            localParams.push(value);
            return { condition: `data->>'${key}' = $${localParams.length}`, params: localParams };
          case 'ne':
            localParams.push(value);
            return {
              condition: `(data->>'${key}' IS NULL OR data->>'${key}' != $${localParams.length})`,
              params: localParams,
            };
          case 'gt':
            localParams.push(value);
            return { condition: `(data->>'${key}')::numeric > $${localParams.length}`, params: localParams };
          case 'gte':
            localParams.push(value);
            return { condition: `(data->>'${key}')::numeric >= $${localParams.length}`, params: localParams };
          case 'lt':
            localParams.push(value);
            return { condition: `(data->>'${key}')::numeric < $${localParams.length}`, params: localParams };
          case 'lte':
            localParams.push(value);
            return { condition: `(data->>'${key}')::numeric <= $${localParams.length}`, params: localParams };
          case 'between':
            if (Array.isArray(value) && value.length === 2) {
              localParams.push(value[0]);
              localParams.push(value[1]);
              return {
                condition: `(data->>'${key}')::numeric BETWEEN $${localParams.length - 1} AND $${localParams.length}`,
                params: localParams,
              };
            }
            return { condition: '1=0', params: [] };
          case 'like':
            localParams.push(value);

            return { condition: `data->>'${key}' LIKE $${localParams.length}`, params: localParams };
          case 'ilike':
            localParams.push(value);
            return { condition: `data->>'${key}' ILIKE $${localParams.length}`, params: localParams };
          case 'in':
            if (Array.isArray(value)) {
              const placeholders = value.map((_, i) => `$${localParams.length + i + 1}`).join(',');
              return { condition: `data->>'${key}' IN (${placeholders})`, params: value };
            }
            return { condition: '1=0', params: [] };
          case 'contains':
            if (Array.isArray(value)) {
              return {
                condition: `data->'${key}' @> $${localParams.length + 1}::jsonb`,
                params: [JSON.stringify(value)],
              };
            }
            return { condition: '1=0', params: [] };
          case 'overlap':
            if (Array.isArray(value)) {
              return { condition: `data->'${key}' ?| $${localParams.length + 1}::text[]`, params: value };
            }
            return { condition: '1=0', params: [] };
          default:
            return { condition: '1=1', params: [] };
        }
      };

      const processFilters = (filterObj: Record<string, any>, conditions: string[], baseParamIndex: number): number => {
        let paramIndex = baseParamIndex;

        for (const [key, filterValue] of Object.entries(filterObj)) {
          if (key === '$and' && Array.isArray(filterValue)) {
            const groupConditions: string[] = [];
            for (const item of filterValue) {
              const groupResult = processFilters(item, groupConditions, paramIndex);
              paramIndex = groupResult;
            }
            if (groupConditions.length > 0) {
              conditions.push(`(${groupConditions.join(' AND ')})`);
            }
          } else if (key === '$or' && Array.isArray(filterValue)) {
            const groupConditions: string[] = [];
            for (const item of filterValue) {
              const groupResult = processFilters(item, groupConditions, paramIndex);
              paramIndex = groupResult;
            }
            if (groupConditions.length > 0) {
              conditions.push(`(${groupConditions.join(' OR ')})`);
            }
          } else if (key === '$not') {
            const notConditions: string[] = [];
            const notResult = processFilters(filterValue, notConditions, paramIndex);
            paramIndex = notResult;
            if (notConditions.length > 0) {
              conditions.push(`NOT (${notConditions.join(' AND ')})`);
            }
          } else if (filterValue && typeof filterValue === 'object' && !Array.isArray(filterValue)) {
            const result = buildCondition(key, filterValue);
            const offsetParams = result.params.map((_, i) => `$${paramIndex + i + 1}`);
            let condition = result.condition;
            for (let i = 0; i < offsetParams.length; i++) {
              condition = condition.replace(`$${i + 1}`, offsetParams[i]);
            }
            params.push(...result.params);
            paramIndex += result.params.length;
            conditions.push(condition);
          } else {
            const result = buildCondition(key, filterValue);
            const offsetParams = result.params.map((_, i) => `$${paramIndex + i + 1}`);
            let condition = result.condition;
            for (let i = 0; i < offsetParams.length; i++) {
              condition = condition.replace(`$${i + 1}`, offsetParams[i]);
            }
            params.push(...result.params);
            paramIndex += result.params.length;
            conditions.push(condition);
          }
        }

        return paramIndex;
      };

      if (filters && Object.keys(filters).length > 0) {
        const conditions: string[] = [];
        processFilters(filters, conditions, 0);
        whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      }

      const totalRes = await this.dataSource.manager.query(
        `SELECT COUNT(*) FROM ${env.DATABASE_SCHEMA}."${tableName}" ${whereClause}`,
        params,
      );

      const sortColumnName = ['created_at', 'updated_at', 'code'].includes(sortCol)
        ? `"${sortCol}"`
        : `data->>'${sortCol}'`;

      const query = `
        SELECT *
        FROM ${env.DATABASE_SCHEMA}."${tableName}"
        ${whereClause}
        ORDER BY ${sortColumnName} ${sortOrd}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      const queryParams = [...params, pageSize, offset];

      let objects = await this.dataSource.manager.query(query, queryParams);

      if (nested) {
        const fullObjects = [];

        for (const object of objects) {
          fullObjects.push(await this.findNested(object, modelData));
        }

        objects = fullObjects;
      }

      return {
        items: objects,
        total: +totalRes[0].count,
        page: pageNum,
        size: pageSize,
        totalPages: Math.ceil(+totalRes[0].count / pageSize),
      };
    } catch (err) {
      this.log.error({ error: err.message }, 'Error during select all records');
      throw new HttpException(`Error during select all records: ${err.message}`, 500);
    }
  }

  async search(modelCode: string, searchGeneratorDto: SearchGeneratorDto[]) {
    try {
      const records = await this.dataSource.manager.query(`SELECT * FROM ${env.DATABASE_SCHEMA}."${modelCode}"`);
      let searchItems = [];

      searchGeneratorDto.forEach((search) => {
        let foundItems: Record<string, any>[] = [];

        if (search.searchType === SearchType.Exact) {
          foundItems = records.filter(
            (item: Record<string, any>) => item.data[search.attributeName] === search.searchQuery,
          );
        } else if (search.searchType === SearchType.Fuzzy) {
          foundItems = records.filter((item: Record<string, any>) =>
            new RegExp(search.searchQuery, 'i').test(item.data[search.attributeName]),
          );
        }

        searchItems = [...searchItems, ...foundItems];
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

    const root = modelData.data.items.find((item) => item.props.description.includes('root'));

    try {
      const objects = await this.dataSource.manager.query(
        `SELECT * FROM ${env.DATABASE_SCHEMA}."${root.props.code}" WHERE code = $1`,
        [code],
      );

      if (!objects.length) {
        throw new NotFoundException();
      }

      const rootObject = objects[0];

      if (nested) {
        return this.findNested(rootObject, modelData);
      }

      const { data, ...rest } = rootObject;
      const resultObject = { ...rest, data: {} };

      for (const item of modelData.data.items) {
        if (item.props.code.includes('root')) continue;

        if (item.baseType === 'base:attribute' && data.hasOwnProperty(item.props.code)) {
          resultObject.data[item.props.code] = data[item.props.code];
        }
      }

      return resultObject;
    } catch (err) {
      this.log.error({ error: err.message }, 'Error during select record');

      if (err instanceof NotFoundException) {
        throw err;
      }

      throw new HttpException(`Error during select record: ${err.message}`, 500);
    }
  }

  async findOneById(modelCode: string, id: string, nested?: boolean) {
    const modelData = await this.modelService.findOne(modelCode);

    const root = modelData.data.items.find((item) => item.props.description.includes('root'));

    try {
      const objects = await this.dataSource.manager.query(
        `SELECT * FROM ${env.DATABASE_SCHEMA}."${root.props.code}" WHERE id = $1`,
        [id],
      );

      if (!objects.length) {
        throw new NotFoundException();
      }

      const rootObject = objects[0];

      if (nested) {
        return this.findNested(rootObject, modelData);
      }

      const { data, ...rest } = rootObject;
      const resultObject = { ...rest, data: {} };

      for (const item of modelData.data.items) {
        if (item.props.code.includes('root')) continue;

        if (item.baseType === 'base:attribute' && data.hasOwnProperty(item.props.code)) {
          resultObject.data[item.props.code] = data[item.props.code];
        }
      }

      return resultObject;
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

    const _findNested = async (parent: any) => {
      const objectId = parent.id;
      const relations = await this.relationRepository.find({ where: { fromId: objectId, isDeleted: false } });

      for (const relation of relations) {
        const modelItem = modelData.data.items.find(
          (item) => item.type === relation.relatedObjectType && item.baseModelItemId === relation.relatedBaseType,
        );

        if (!modelItem) continue;

        const relatedRecords = await this.dataSource.manager.query(
          `SELECT * FROM ${env.DATABASE_SCHEMA}."${modelItem.props.code}" WHERE id = $1`,
          [relation.toId],
        );

        if (!parent.data) {
          parent.data = {};
        }

        if (!Array.isArray(parent.data[modelItem.props.code])) {
          parent.data[modelItem.props.code] = [];
        }

        const relatedRecord = { ...relatedRecords[0].data, id: relatedRecords[0].id };

        parent.data[modelItem.props.code].push(relatedRecord);

        await _findNested(relatedRecord);
      }
    };

    await _findNested(result);

    return result;
  }

  async update(modelCode: string, objectCode: string, updateGeneratorDto: UpdateGeneratorDto) {
    const modelData = await this.modelService.findOne(modelCode);
    const plainObject = {};

    for (const [key, value] of Object.entries(updateGeneratorDto)) {
      if (typeof value === 'object') {
        continue;
      }

      plainObject[key] = value;
    }

    const rootModelItem = modelData.data.items.find((item) => item.props.description.includes('root'));

    const existingRoot = await this.dataSource.manager.query(
      `SELECT * FROM ${env.DATABASE_SCHEMA}."${rootModelItem.props.code}" WHERE code = $1`,
      [objectCode],
    );

    if (!existingRoot.length) {
      throw new NotFoundException();
    }

    const rootObject = existingRoot[0];

    await this.dataSource.manager
      .createQueryBuilder()
      .update(`${env.DATABASE_SCHEMA}.${rootModelItem.props.code}`)
      .set({ data: { ...rootObject.data, ...plainObject }, updated_at: new Date() })
      .where('code = :code', { code: objectCode })
      .execute();

    const walkAndUpdate = async (data: any, parentId: string) => {
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          const targetModelItem = modelData.data.items.find((item) => item.props.code === key);
          if (!targetModelItem) continue;

          const modelRelation = modelData.data.relations.find(
            ({ type, to }) => type === 'base:object--object' && to === targetModelItem.id,
          );
          if (!modelRelation) continue;

          const sourceModelItem = modelData.data.items.find((item) => item.id === modelRelation.from);
          const tableName = targetModelItem.props.code;
          const processedIds = new Set<string>();

          for (const item of value) {
            const plainItem = {};
            for (const [k, v] of Object.entries(item)) {
              if (k === 'id') continue;
              if (typeof v === 'object' && Array.isArray(v) && (typeof v[0] === 'object' || !v.length)) continue;
              if (typeof v === 'object' && !Array.isArray(v) && v !== null) continue;
              plainItem[k] = v;
            }

            let existingRecord: any = null;

            if (item.id) {
              const rows = await this.dataSource.manager.query(
                `SELECT * FROM ${env.DATABASE_SCHEMA}."${tableName}" WHERE id = $1`,
                [item.id],
              );
              if (rows.length) existingRecord = rows[0];
            }
            console.log('find record in', tableName, item, existingRecord);

            if (existingRecord) {
              processedIds.add(existingRecord.id);
              const { code: _code, ...dataFields } = plainItem as any;

              await this.dataSource.manager
                .createQueryBuilder()
                .update(`${env.DATABASE_SCHEMA}.${tableName}`)
                .set({ data: { ...existingRecord.data, ...dataFields }, updated_at: new Date() })
                .where('id = :id', { id: existingRecord.id })
                .execute();

              const existingRelation = await this.relationRepository.findOne({
                where: { fromId: parentId, toId: existingRecord.id, isDeleted: false },
              });
              if (!existingRelation) {
                const deletedRelation = await this.relationRepository.findOne({
                  where: { fromId: parentId, toId: existingRecord.id, isDeleted: true },
                });
                if (deletedRelation) {
                  await this.relationService.update(deletedRelation.id, { isDeleted: false });
                } else {
                  await this.relationService.create({
                    fromId: parentId,
                    toId: existingRecord.id,
                    baseType: sourceModelItem.baseModelItemId,
                    objectType: sourceModelItem.type,
                    relationType: modelRelation.type,
                    relatedBaseType: targetModelItem.baseModelItemId,
                    relatedObjectType: targetModelItem.type,
                  });
                }
              }

              await walkAndUpdate(item, existingRecord.id);
            } else {
              const newRecord = await this.createRecord(tableName, plainItem);
              processedIds.add(newRecord.id);

              await this.relationService.create({
                fromId: parentId,
                toId: newRecord.id,
                baseType: sourceModelItem.baseModelItemId,
                objectType: sourceModelItem.type,
                relationType: modelRelation.type,
                relatedBaseType: targetModelItem.baseModelItemId,
                relatedObjectType: targetModelItem.type,
              });

              await walkAndUpdate(item, newRecord.id);
            }
          }

          const parentRelations = await this.relationRepository.find({
            where: { fromId: parentId, isDeleted: false },
          });
          for (const rel of parentRelations) {
            if (processedIds.has(rel.toId)) continue;
            const inTable = await this.dataSource.manager.query(
              `SELECT id FROM ${env.DATABASE_SCHEMA}."${tableName}" WHERE id = $1`,
              [rel.toId],
            );
            if (inTable.length) {
              await this.relationService.update(rel.id, { isDeleted: true });
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          await walkAndUpdate(value, parentId);
        }
      }
    };

    await walkAndUpdate(updateGeneratorDto, rootObject.id);

    return rootObject;
  }

  async patch(modelCode: string, objectCode: string, updateGeneratorDto: UpdateGeneratorDto) {
    const modelData = await this.modelService.findOne(modelCode);
    const plainObject = {};

    for (const [key, value] of Object.entries(updateGeneratorDto)) {
      if (typeof value === 'object') {
        continue;
      }

      plainObject[key] = value;
    }

    const rootModelItem = modelData.data.items.find((item) => item.props.description.includes('root'));

    const existingRoot = await this.dataSource.manager.query(
      `SELECT * FROM ${env.DATABASE_SCHEMA}."${rootModelItem.props.code}" WHERE code = $1`,
      [objectCode],
    );

    if (!existingRoot.length) {
      throw new NotFoundException();
    }

    const rootObject = existingRoot[0];

    await this.dataSource.manager
      .createQueryBuilder()
      .update(`${env.DATABASE_SCHEMA}.${rootModelItem.props.code}`)
      .set({ data: { ...rootObject.data, ...plainObject }, updated_at: new Date() })
      .where('code = :code', { code: objectCode })
      .execute();

    const walkAndUpdate = async (data: any, parentId: string) => {
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          const targetModelItem = modelData.data.items.find((item) => item.props.code === key);
          if (!targetModelItem) continue;

          const modelRelation = modelData.data.relations.find(
            ({ type, to }) => type === 'base:object--object' && to === targetModelItem.id,
          );
          if (!modelRelation) continue;

          await this.createTable(targetModelItem.props.code);

          const sourceModelItem = modelData.data.items.find((item) => item.id === modelRelation.from);
          const tableName = targetModelItem.props.code;
          const processedIds = new Set<string>();

          for (const item of value) {
            const plainItem = {};
            for (const [k, v] of Object.entries(item)) {
              if (k === 'id') continue;
              if (typeof v === 'object' && Array.isArray(v) && (typeof v[0] === 'object' || !v.length)) continue;
              if (typeof v === 'object' && !Array.isArray(v) && v !== null) continue;
              plainItem[k] = v;
            }

            let existingRecord: any = null;

            if (item.id) {
              const rows = await this.dataSource.manager.query(
                `SELECT * FROM ${env.DATABASE_SCHEMA}."${tableName}" WHERE id = $1`,
                [item.id],
              );
              if (rows.length) existingRecord = rows[0];
            }

            if (existingRecord) {
              processedIds.add(existingRecord.id);
              const { code: _code, ...dataFields } = plainItem as any;

              await this.dataSource.manager
                .createQueryBuilder()
                .update(`${env.DATABASE_SCHEMA}.${tableName}`)
                .set({ data: { ...existingRecord.data, ...dataFields }, updated_at: new Date() })
                .where('id = :id', { id: existingRecord.id })
                .execute();

              const existingRelation = await this.relationRepository.findOne({
                where: { fromId: parentId, toId: existingRecord.id, isDeleted: false },
              });
              if (!existingRelation) {
                const deletedRelation = await this.relationRepository.findOne({
                  where: { fromId: parentId, toId: existingRecord.id, isDeleted: true },
                });
                if (deletedRelation) {
                  await this.relationService.update(deletedRelation.id, { isDeleted: false });
                } else {
                  await this.relationService.create({
                    fromId: parentId,
                    toId: existingRecord.id,
                    baseType: sourceModelItem.baseModelItemId,
                    objectType: sourceModelItem.type,
                    relationType: modelRelation.type,
                    relatedBaseType: targetModelItem.baseModelItemId,
                    relatedObjectType: targetModelItem.type,
                  });
                }
              }

              await walkAndUpdate(item, existingRecord.id);
            } else {
              const newRecord = await this.createRecord(tableName, plainItem);
              processedIds.add(newRecord.id);

              await this.relationService.create({
                fromId: parentId,
                toId: newRecord.id,
                baseType: sourceModelItem.baseModelItemId,
                objectType: sourceModelItem.type,
                relationType: modelRelation.type,
                relatedBaseType: targetModelItem.baseModelItemId,
                relatedObjectType: targetModelItem.type,
              });

              await walkAndUpdate(item, newRecord.id);
            }
          }

          const parentRelations = await this.relationRepository.find({
            where: { fromId: parentId, isDeleted: false },
          });
          for (const rel of parentRelations) {
            if (processedIds.has(rel.toId)) continue;
            const inTable = await this.dataSource.manager.query(
              `SELECT id FROM ${env.DATABASE_SCHEMA}."${tableName}" WHERE id = $1`,
              [rel.toId],
            );
            if (inTable.length) {
              await this.relationService.update(rel.id, { isDeleted: true });
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          await walkAndUpdate(value, parentId);
        }
      }
    };

    await walkAndUpdate(updateGeneratorDto, rootObject.id);
  }

  async remove(tableName: string, code: string) {
    try {
      const objects = await this.dataSource.manager.query(
        `SELECT * FROM ${env.DATABASE_SCHEMA}."${tableName}" WHERE code = $1`,
        [code],
      );

      if (!objects.length) {
        throw new NotFoundException();
      }

      const record = objects[0];

      const relation = await this.relationRepository.findOne({ where: { toId: record.id } });

      if (relation) {
        await this.relationRepository.update(relation.id, { isDeleted: true });
      }

      const deleteResult = await this.dataSource.manager
        .createQueryBuilder()
        .delete()
        .from(`${env.DATABASE_SCHEMA}.${tableName}`)
        .where('code = :code', { code })
        .execute();

      return deleteResult;
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

    const { code, ...data } = createGeneratorDto;

    let recordCode: string;

    if (code) {
      // check for duplicates
      const objects = await this.dataSource.manager.query(
        `SELECT * FROM ${env.DATABASE_SCHEMA}."${tableName}" WHERE code = $1`,
        [code],
      );

      if (objects.length > 0) {
        recordCode = `${code}_${randomUUID().toString()}`;
      } else {
        recordCode = code;
      }
    } else {
      recordCode = randomUUID().toString();
    }

    try {
      const result = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(`${env.DATABASE_SCHEMA}.${tableName}`)
        .values({ data, code: recordCode })
        .returning('*')
        .execute();

      await queryRunner.release();

      return {
        ...result.raw[0],
      };
    } catch (err) {
      await queryRunner.release();
      this.log.error({ error: err.message, data: createGeneratorDto }, `Error during insert record into ${tableName}`);

      if (err instanceof QueryFailedError && err.driverError.code === '23505') {
        throw new HttpException(err.driverError.detail, 400);
      }

      throw new HttpException(err.message, 500);
    }
  }
}
