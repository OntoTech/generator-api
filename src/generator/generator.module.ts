import { Module } from '@nestjs/common';
import { GeneratorService } from './generator.service';
import { GeneratorController } from './generator.controller';
import { ModelModule } from '../model/model.module';

@Module({
  imports: [ModelModule],
  controllers: [GeneratorController],
  providers: [GeneratorService],
})
export class GeneratorModule {}
