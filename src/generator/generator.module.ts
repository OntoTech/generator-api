import { Module } from '@nestjs/common';
import { GeneratorService } from './generator.service';
import { GeneratorController } from './generator.controller';
import { ModelModule } from '../model/model.module';
import { RelationModule } from '../relation/relation.module';

@Module({
  imports: [ModelModule, RelationModule],
  controllers: [GeneratorController],
  providers: [GeneratorService],
})
export class GeneratorModule {}
