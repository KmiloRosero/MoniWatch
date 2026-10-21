import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { EnvironmentVariables, NodeEnvironment } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config: ConfigService<EnvironmentVariables, true> = app.get(ConfigService);
  const isProduction = config.get('NODE_ENV', { infer: true }) === NodeEnvironment.Production;

  configureApp(app, { enableDocs: !isProduction });

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API ready on port ${port}${isProduction ? '' : ` · docs at /docs`}`, 'Bootstrap');
}

void bootstrap();
