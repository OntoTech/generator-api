import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ModelService } from './model.service';
import { CreateModelDto } from './dto/create-model.dto';

@Controller('model')
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  @Post()
  create(@Body() createModelDto: CreateModelDto) {
    return this.modelService.create(createModelDto);
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
