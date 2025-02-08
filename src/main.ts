import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true, // Allow all origins
  });
  app.use(
    '/videos',
    express.static(path.join(__dirname, '..', 'uploads', 'videos')),
  );

  await app.listen(3000);
}
bootstrap();
