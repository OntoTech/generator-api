import { Test, TestingModule } from '@nestjs/testing';
import { ModelService } from './model.service';
import { HttpService } from '@nestjs/axios';
import { DataSource, Repository } from 'typeorm';
import { Model } from './entities/model.entity';

describe('ModelService', () => {
  let service: ModelService;
  let mockRepository: Partial<Repository<Model>>;

  beforeEach(async () => {
    mockRepository = {
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
      providers: [
        ModelService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ModelService>(ModelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateFromObject', () => {
    it('should generate model from simple object', () => {
      const sample = {
        name: 'Test Item',
        code: 'test-001',
        status: 'active',
      };

      const model = service.generateFromObject({
        sampleObject: sample,
        modelCode: 'test-model',
        modelName: 'Test Model',
      });

      expect(model.code).toBe('test-model');
      expect(model.name).toBe('Test Model');
      expect(model.items).toHaveLength(1);
      expect(model.items[0].props.code).toBe('test');
      expect(model.items[0].props.description).toBe('root');
      expect(model.relations).toHaveLength(0);
    });

    it('should generate model with nested array entities', () => {
      const sample = {
        name: 'Level 1',
        sections: [
          {
            name: 'Section A',
            code: 'sec-a',
          },
          {
            name: 'Section B',
            code: 'sec-b',
          },
        ],
      };

      const model = service.generateFromObject({
        sampleObject: sample,
        modelCode: 'level-model',
        modelName: 'Level Model',
      });

      expect(model.code).toBe('level-model');
      expect(model.items).toHaveLength(2);
      expect(model.relations).toHaveLength(2);

      const rootItem = model.items.find((i) => i.props.description === 'root');
      expect(rootItem).toBeDefined();
      expect(rootItem!.props.code).toBe('level');

      const childItem = model.items.find((i) => i.props.code === 'sections');
      expect(childItem).toBeDefined();

      expect(model.relations[0].from).toBe(rootItem!.id);
      expect(model.relations[0].to).toBe(childItem!.id);
      expect(model.relations[0].type).toBe('base:object--object');
    });

    it('should handle deeply nested structures', () => {
      const sample = {
        name: 'Project',
        phases: [
          {
            name: 'Phase 1',
            tasks: [{ name: 'Task 1' }, { name: 'Task 2' }],
          },
        ],
      };

      const model = service.generateFromObject({
        sampleObject: sample,
        modelCode: 'project-model',
      });

      expect(model.items).toHaveLength(3);
      expect(model.relations.length).toBeGreaterThanOrEqual(2);

      const codes = model.items.map((i) => i.props.code);
      expect(codes).toContain('project');
      expect(codes).toContain('phases');
      expect(codes).toContain('tasks');
    });

    it('should reuse existing types for same array keys', () => {
      const sample = {
        name: 'Root',
        children: [
          { name: 'Child 1', subChildren: [{ name: 'Sub 1' }] },
          { name: 'Child 2', subChildren: [{ name: 'Sub 2' }] },
        ],
      };

      const model = service.generateFromObject({
        sampleObject: sample,
        modelCode: 'tree-model',
      });

      expect(model.items).toHaveLength(3);
      expect(model.relations.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle empty arrays gracefully', () => {
      const sample = {
        name: 'Item',
        children: [],
      };

      const model = service.generateFromObject({
        sampleObject: sample,
        modelCode: 'empty-model',
      });

      expect(model.items).toHaveLength(1);
      expect(model.relations).toHaveLength(0);
    });

    it('should use custom options', () => {
      const sample = { name: 'Test' };

      const model = service.generateFromObject({
        sampleObject: sample,
        modelCode: 'custom-code',
        modelName: 'Custom Name',
        modelDescription: 'Custom Description',
        domain: 'custom-domain',
        baseTypePrefix: 'myapp',
      });

      expect(model.code).toBe('custom-code');
      expect(model.name).toBe('Custom Name');
      expect(model.description).toBe('Custom Description');
      expect(model.props.domain).toBe('custom-domain');
      expect(model.items[0].type).toBe('myapp:custom');
    });
  });
});
