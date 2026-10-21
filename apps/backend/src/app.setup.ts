import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { EnvironmentVariables } from './config/env.validation';

export const API_PREFIX = 'api/v1';
const DOCS_PATH = 'docs';

/** Shared by main.ts and the e2e tests so both run the exact same pipeline. */
export function configureApp(app: INestApplication, options: { enableDocs: boolean }): void {
  const config: ConfigService<EnvironmentVariables, true> = app.get(ConfigService);
  const proxyHops = config.get('TRUST_PROXY_HOPS', { infer: true }) ?? 0;
  if (proxyHops > 0) {
    // Behind a proxy every request would otherwise share the proxy's IP (and one rate-limit bucket).
    app.getHttpAdapter().getInstance().set('trust proxy', proxyHops);
  }

  app.use(helmet());
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter));
  app.enableShutdownHooks();

  if (options.enableDocs) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('MoniWatch API')
        .setDescription('Backend for the MoniWatch mobile and Wear OS apps')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup(DOCS_PATH, app, document);
  }
}
