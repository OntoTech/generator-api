import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const globalPrefix = '/swagger';
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: true }));
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Generator API')
    .setVersion('1.0')
    .addServer('/', 'main')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup(globalPrefix, app, document);

  await app.listen(process.env.PORT ?? 3000, '127.0.0.1');
}
bootstrap();
