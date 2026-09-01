import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Planify API')
    .setDescription(
      'Backend REST de Planify: gestion de usuarios, tareas, categorias, recordatorios y estadisticas.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token devuelto por /auth/login o /auth/register',
      },
      'access-token',
    )
    .addTag('auth', 'Registro, login, refresh, logout y perfil')
    .addTag('users', 'Perfil del usuario autenticado')
    .addTag('categories', 'Categorias de tareas')
    .addTag('tasks', 'Tareas con recurrencia y filtros')
    .addTag('reminders', 'Recordatorios de tareas')
    .addTag('statistics', 'Estadisticas agregadas')
    .addTag('health', 'Healthcheck')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  Logger.log(`Planify backend listening on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Swagger UI:    http://localhost:${port}/docs`, 'Bootstrap');
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
