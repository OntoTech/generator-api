import { Controller, Get, Post, Body, Param, Delete, Put, Patch, Query } from '@nestjs/common';
import { GeneratorService } from './generator.service';
import { CreateGeneratorDto } from './dto/create-generator.dto';
import { UpdateGeneratorDto } from './dto/update-generator.dto';
import { SearchGeneratorDto } from './dto/search-generator.dto';
import { ApiQuery } from '@nestjs/swagger';

@Controller('object')
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

  @Post(':modelCode')
  create(@Param('modelCode') modelCode: string, @Body() createGeneratorDto: CreateGeneratorDto) {
    return this.generatorService.create(modelCode, createGeneratorDto);
  }

  @Get(':modelCode/list')
  @ApiQuery({ name: 'nested', required: false, type: String })
  findAll(@Param('modelCode') modelCode: string, @Query('nested') nested?: string) {
    return this.generatorService.findAll(modelCode, nested === 'true');
  }

  @Post(':modelCode/search')
  search(
    @Param('modelCode') modelCode: string,
    @Body()
    searchGeneratorDto: SearchGeneratorDto[],
  ) {
    return this.generatorService.search(modelCode, searchGeneratorDto);
  }

  @Get(':modelCode/:objectCode')
  @ApiQuery({ name: 'nested', required: false, type: String })
  findOne(
    @Param('modelCode') modelCode: string,
    @Param('objectCode') objectCode: string,
    @Query('nested') nested?: string,
  ) {
    return this.generatorService.findOne(modelCode, objectCode, nested === 'true');
  }

  @Put(':modelCode/:objectCode')
  update(
    @Param('modelCode') modelCode: string,
    @Param('objectCode') objectCode: string,
    @Body() updateGeneratorDto: UpdateGeneratorDto,
  ) {
    return this.generatorService.update(modelCode, objectCode, updateGeneratorDto);
  }

  @Patch(':modelCode/:objectCode')
  patch(
    @Param('modelCode') modelCode: string,
    @Param('objectCode') objectCode: string,
    @Body() updateGeneratorDto: UpdateGeneratorDto,
  ) {
    return this.generatorService.patch(modelCode, objectCode, updateGeneratorDto);
  }

  @Delete(':modelCode/:objectCode')
  remove(@Param('modelCode') modelCode: string, @Param('objectCode') objectCode: string) {
    return this.generatorService.remove(modelCode, objectCode);
  }
}
