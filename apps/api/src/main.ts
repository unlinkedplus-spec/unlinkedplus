import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { json, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(json({ limit: '16kb' }));
  app.use(cookieParser());
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.get('origin') !== process.env.FRONTEND_URL) {
      response.status(403).json({ message: 'Origin permintaan tidak diizinkan' });
      return;
    }
    next();
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true, transform: true,
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true });
  app.enableShutdownHooks();
  await app.listen(3001, '0.0.0.0');
}

bootstrap().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
