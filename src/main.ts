import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const port = Number(config.get<number>('PORT') ?? 3000);

  app.use(helmet());

  const frontendUrl = config.get<string>('FRONTEND_URL');
  const allowedOrigins = (frontendUrl ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS bloqueado para origen: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(port);
  Logger.log(`Planify backend listening on http://localhost:${port}`, 'Bootstrap');
  if (allowedOrigins.length === 0) {
    Logger.warn(
      'FRONTEND_URL no configurado: CORS aceptara cualquier origen en desarrollo',
      'Bootstrap',
    );
  } else {
    Logger.log(`CORS permitido para: ${allowedOrigins.join(', ')}`, 'Bootstrap');
  }
}

void bootstrap();
