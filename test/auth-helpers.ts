import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootstrapTestApp, teardownTestApp, uniqueEmail } from './test-app';

interface AuthResult {
  user: { id: string; name: string; email: string };
  tokens: { accessToken: string; refreshToken: string };
}

export interface AuthHandle {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  bearer: string;
}

export async function registerUser(
  app: INestApplication,
  prefix: string,
  password = 'Planify2026!',
): Promise<AuthHandle> {
  const email = uniqueEmail(prefix);
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ name: `Test ${prefix}`, email, password })
    .expect(201);
  const body = res.body as AuthResult;
  return {
    accessToken: body.tokens.accessToken,
    refreshToken: body.tokens.refreshToken,
    userId: body.user.id,
    email,
    bearer: `Bearer ${body.tokens.accessToken}`,
  };
}

export async function cleanDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.reminder.deleteMany();
  await prisma.task.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

export const globalTeardown = teardownTestApp;
