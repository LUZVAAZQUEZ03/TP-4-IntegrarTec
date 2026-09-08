import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

let appInstance: INestApplication | null = null;

export async function bootstrapTestApp(): Promise<INestApplication> {
  if (appInstance) return appInstance;

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  appInstance = app;
  return app;
}

export async function teardownTestApp(): Promise<void> {
  if (!appInstance) return;
  const prisma = appInstance.get(PrismaService);
  await prisma.$disconnect();
  await appInstance.close();
  appInstance = null;
}

export function uniqueEmail(prefix: string): string {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
  return `${prefix}-${stamp}@planify.dev`;
}
