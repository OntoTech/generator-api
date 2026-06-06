import { Controller, Get, Post, Body, Param, Delete, Put, Patch, Query, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { GeneratorService } from './generator.service';
import { CreateGeneratorDto } from './dto/create-generator.dto';
import { UpdateGeneratorDto } from './dto/update-generator.dto';
import { SearchGeneratorDto } from './dto/search-generator.dto';
import { ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';

@Controller('object')
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

  @Post(':modelCode')
  @ApiParam({
    name: 'modelCode',
    description: 'Model code',
  })
  create(
    @Param('modelCode') modelCode: string,
    @Body() createGeneratorDto: CreateGeneratorDto,
    @Req() request: FastifyRequest,
  ) {
    return this.generatorService.create(modelCode, createGeneratorDto);
  }

  @Post(':modelCode/list')
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        page: { type: 'number', default: 1 },
        size: { type: 'number', default: 10 },
        sortColumn: { type: 'string', enum: ['created_at', 'updated_at', 'code'] },
        sortOrder: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' },
        filters: {
          type: 'object',
          description: 'Advanced filters for data JSONB column',
          example: {
            name: { op: 'ilike', value: 'john%' },
            age: { op: 'gte', value: 18 },
            tags: { op: 'contains', value: ['admin'] },
            status: { op: 'in', value: ['active', 'pending'] },
          },
        },
      },
    },
  })
  findAll(
    @Param('modelCode') modelCode: string,
    @Req() request: FastifyRequest,
    @Body()
    body: {
      nested?: boolean;
      page?: number;
      size?: number;
      sortColumn?: 'created_at' | 'updated_at' | 'code';
      sortOrder?: 'ASC' | 'DESC';
      filters?: Record<string, any>;
    },
  ) {
    return this.generatorService.findAll(
      modelCode,
      body.nested === true,
      body.page,
      body.size,
      body.sortColumn,
      body.sortOrder,
      body.filters,
    );
  }

  @Post(':modelCode/search')
  @ApiBody({ type: [SearchGeneratorDto] })
  search(
    @Param('modelCode') modelCode: string,
    @Body()
    searchGeneratorDto: SearchGeneratorDto[],
    @Req() request: FastifyRequest,
  ) {
    return this.generatorService.search(modelCode, searchGeneratorDto);
  }

  @Get(':modelCode/:objectCode')
  @ApiQuery({ name: 'nested', required: false, type: String })
  findOne(
    @Req() request: FastifyRequest,
    @Param('modelCode') modelCode: string,
    @Param('objectCode') objectCode: string,
    @Query('nested') nested?: string,
  ) {
    return this.generatorService.findOne(modelCode, objectCode, nested === 'true');
  }

  @Get(':modelCode/byId/:id')
  @ApiQuery({ name: 'nested', required: false, type: String })
  findOneById(
    @Req() request: FastifyRequest,
    @Param('modelCode') modelCode: string,
    @Param('id') id: string,
    @Query('nested') nested?: string,
  ) {
    return this.generatorService.findOneById(modelCode, id, nested === 'true');
  }

  @Put(':modelCode/:objectCode')
  update(
    @Param('modelCode') modelCode: string,
    @Param('objectCode') objectCode: string,
    @Body() updateGeneratorDto: UpdateGeneratorDto,
    @Req() request: FastifyRequest,
  ) {
    return this.generatorService.update(modelCode, objectCode, updateGeneratorDto);
  }

  @Patch(':modelCode/:objectCode')
  patch(
    @Param('modelCode') modelCode: string,
    @Param('objectCode') objectCode: string,
    @Body() updateGeneratorDto: UpdateGeneratorDto,
    @Req() request: FastifyRequest,
  ) {
    return this.generatorService.patch(modelCode, objectCode, updateGeneratorDto);
  }

  @Delete(':modelCode/:objectCode')
  remove(
    @Param('modelCode') modelCode: string,
    @Param('objectCode') objectCode: string,
    @Req() request: FastifyRequest,
  ) {
    return this.generatorService.remove(modelCode, objectCode);
  }
}
