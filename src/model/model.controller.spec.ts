import { Test, TestingModule } from '@nestjs/testing';
import { ModelController } from './model.controller';
import { ModelService } from './model.service';
import { HttpService } from '@nestjs/axios';
import { DataSource, Repository } from 'typeorm';
import { Model } from './entities/model.entity';

describe('ModelController', () => {
  let controller: ModelController;

  beforeEach(async () => {
    const mockRepository: Partial<Repository<Model>> = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    };

    const mockHttpService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModelController],
      providers: [
        ModelService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    controller = module.get<ModelController>(ModelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
