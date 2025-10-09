import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from './typeorm.module';
import { GeneratorModule } from './generator/generator.module';
import { ModelModule } from './model/model.module';
import { RelationModule } from './relation/relation.module';

@Module({
  imports: [TypeOrmModule, GeneratorModule, ModelModule, RelationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
