import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ModelService } from './model.service';
import { CreateModelDto } from './dto/create-model.dto';
import { GenerateModelDto } from './dto/generate-model.dto';
import { IModel } from '../util/types';

@Controller('model')
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  @Post()
  create(@Body() createModelDto: CreateModelDto) {
    return this.modelService.create(createModelDto);
  }

  @Post('generate')
  generate(@Body() generateDto: GenerateModelDto): IModel {
    return this.modelService.generateFromObject(generateDto);
  }

  @Post('generate-and-save')
  generateAndSave(@Body() generateDto: GenerateModelDto) {
    return this.modelService.generateAndSave(generateDto);
  }

  @Get('list')
  findAll() {
    return this.modelService.findAll();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.modelService.findOne(code);
  }
}
