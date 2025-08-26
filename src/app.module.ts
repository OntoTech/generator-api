import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from './typeorm.module';
import { GeneratorModule } from './generator/generator.module';
import { ModelModule } from './model/model.module';

@Module({
  imports: [TypeOrmModule, GeneratorModule, ModelModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
