import { Injectable, NotFoundException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { env } from '../util/env';
import { Service } from '../service/Service';
import { DataSource, Repository } from 'typeorm';
import { Model } from './entities/model.entity';
import { IModel, ModelItem, ModelRelation } from '../util/types';
import { CreateModelDto } from './dto/create-model.dto';
import { randomUUID } from 'crypto';
import { GenerateModelDto } from './dto/generate-model.dto';

@Injectable()
export class ModelService extends Service {
  private modelRepository: Repository<Model>;

  constructor(
    private readonly httpService: HttpService,
    private dataSource: DataSource,
  ) {
    super();
    this.modelRepository = this.dataSource.getRepository(Model);
  }

  create(createModelDto: CreateModelDto) {
    const model = new Model();

    model.code = createModelDto.code;
    model.data = createModelDto;

    try {
      return this.modelRepository.save(model);
    } catch (e) {
      this.log.error({ error: e.message }, 'Error during creating model');
    }
  }

  async findAll() {
    try {
      const response = await this.modelRepository.find();

      return {
        list: response,
        total: response.length,
      };
    } catch (e) {
      this.log.error({ error: e.message }, 'Error during get all models');
    }
  }

  async findOne(code: string) {
    try {
      const res = await this.modelRepository.findOne({ where: { code } });

      if (!res) {
        throw new NotFoundException();
      }

      return res;
    } catch (e) {
      this.log.error({ error: e.message }, 'Error during finding model');

      if (e instanceof NotFoundException) {
        throw e;
      }
    }
  }

  getDataFromExternalApi(id: string): Observable<AxiosResponse<any>> {
    return this.httpService.get(`${env.MODEL_SERVICE_URL}/rest/models/${id}`);
  }

  generateFromObject(generateDto: GenerateModelDto): IModel {
    const {
      sampleObject,
      modelCode = 'generated-model',
      modelName = 'Generated Model',
      modelDescription = 'Auto-generated model from sample object',
      domain = 'default',
      baseTypePrefix = 'base',
    } = generateDto;

    const items: ModelItem[] = [];
    const relations: ModelRelation[] = [];
    const processedTypes = new Map<string, { code: string; id: string }>();

    const processObject = (
      obj: Record<string, any>,
      itemCode: string,
      parentItemId?: string,
      isRoot: boolean = false,
    ): string => {
      const normalizedCode = itemCode.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const typeKey = `${baseTypePrefix}:${normalizedCode}`;

      if (processedTypes.has(typeKey)) {
        const existing = processedTypes.get(typeKey)!;

        if (parentItemId) {
          const relationId = randomUUID();
          relations.push({
            id: relationId,
            from: parentItemId,
            to: existing.id,
            type: 'base:object--object',
            props: {},
          });
        }

        return existing.id;
      }

      const itemId = randomUUID();
      const baseModelItemId = `${baseTypePrefix}:${normalizedCode}`;

      const item: ModelItem = {
        id: itemId,
        type: typeKey,
        baseModelItemId: baseModelItemId,
        baseType: normalizedCode,
        props: {
          code: normalizedCode,
          name: itemCode.charAt(0).toUpperCase() + itemCode.slice(1),
          description: isRoot ? 'root' : '',
        },
      };

      items.push(item);
      processedTypes.set(typeKey, { code: normalizedCode, id: itemId });

      if (parentItemId) {
        const relationId = randomUUID();
        relations.push({
          id: relationId,
          from: parentItemId,
          to: itemId,
          type: 'base:object--object',
          props: {},
        });
      }

      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          for (const childObj of value) {
            processObject(childObj, key, itemId, false);
          }
        }
      }

      return itemId;
    };

    const rootCode = modelCode ? modelCode.split('-')[0] : 'root';
    processObject(sampleObject, rootCode, undefined, true);

    return {
      type: 'model',
      code: modelCode,
      name: modelName,
      description: modelDescription,
      props: {
        domain,
      },
      items,
      relations,
    };
  }

  async generateAndSave(generateDto: GenerateModelDto): Promise<Model> {
    const modelData = this.generateFromObject(generateDto);

    const model = new Model();
    model.code = modelData.code;
    model.data = modelData;

    try {
      return await this.modelRepository.save(model);
    } catch (e) {
      this.log.error({ error: e.message }, 'Error during generating and saving model');
      throw e;
    }
  }
}
