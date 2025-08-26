import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateModelDto } from './dto/update-model.dto';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { env } from '../util/env';
import { Service } from '../service/Service';
import { DataSource, Repository } from 'typeorm';
import { Model } from './entities/model.entity';
import { IModel } from '../util/types';
import { CreateModelDto } from './dto/create-model.dto';

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
}
