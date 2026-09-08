import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp, teardownTestApp, uniqueEmail } from './test-app';
import { AuthHandle, cleanDatabase, registerUser } from './auth-helpers';

const PASSWORD = 'Planify2026!';

describe('Planify API (e2e)', () => {
  let app: INestApplication;
  let alice: AuthHandle;
  let bob: AuthHandle;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    await cleanDatabase(app);
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await teardownTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);
    alice = await registerUser(app, 'alice', PASSWORD);
    bob = await registerUser(app, 'bob', PASSWORD);
  });

  // -------------------- HEALTH --------------------
  describe('Health', () => {
    it('GET /health -> ok', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', service: 'planify-backend' });
    });
  });

  // -------------------- AUTH --------------------
  describe('Auth', () => {
    it('rechaza register con email duplicado (409)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Dup', email: alice.email, password: PASSWORD })
        .expect(409);
    });

    it('rechaza register con password corta (400)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Short', email: uniqueEmail('short'), password: 'short' })
        .expect(400);
    });

    it('rechaza login con password incorrecta (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: alice.email, password: 'wrong-pass' })
        .expect(401);
    });

    it('login devuelve tokens y perfil', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: alice.email, password: PASSWORD })
        .expect(200);
      expect(res.body).toHaveProperty('tokens.accessToken');
      expect(res.body).toHaveProperty('tokens.refreshToken');
      expect(res.body.user.email).toBe(alice.email);
    });

    it('refresh rota y devuelve nuevo par', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: alice.refreshToken })
        .expect(200);
      expect(res.body.accessToken).not.toBe(alice.accessToken);
      expect(res.body.refreshToken).not.toBe(alice.refreshToken);
    });

    it('logout invalida refresh posterior', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', alice.bearer)
        .expect(204);
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: alice.refreshToken })
        .expect(401);
    });

    it('GET /auth/me devuelve perfil sin passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', alice.bearer)
        .expect(200);
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(res.body.email).toBe(alice.email);
    });

    it('endpoint protegido sin token -> 401', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  // -------------------- USERS --------------------
  describe('Users', () => {
    it('GET /users/me devuelve perfil del token', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', alice.bearer)
        .expect(200);
      expect(res.body.id).toBe(alice.userId);
    });

    it('PATCH /users/me actualiza name y avatar, ignora otros campos', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', alice.bearer)
        .send({ name: 'Alice New', avatar: 'https://cdn/avatar.png', role: 'ADMIN' })
        .expect(200);
      expect(res.body.name).toBe('Alice New');
      expect(res.body.avatar).toBe('https://cdn/avatar.png');
      expect(res.body.role).toBe('USER');
    });
  });

  // -------------------- CATEGORIES --------------------
  describe('Categories', () => {
    it('CRUD completo + ownership', async () => {
      const created = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', alice.bearer)
        .send({ name: 'Universidad', color: '#4F46E5' })
        .expect(201);
      const catId = created.body.id as string;

      const list = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', alice.bearer)
        .expect(200);
      expect(list.body).toHaveLength(1);

      await request(app.getHttpServer())
        .patch(`/categories/${catId}`)
        .set('Authorization', alice.bearer)
        .send({ name: 'Universidad Updated' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/categories/${catId}`)
        .set('Authorization', alice.bearer)
        .expect(204);
    });

    it('otra persona no puede ver la categoria (404)', async () => {
      const created = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', alice.bearer)
        .send({ name: 'Privada' })
        .expect(201);
      await request(app.getHttpServer())
        .get(`/categories/${created.body.id}`)
        .set('Authorization', bob.bearer)
        .expect(404);
    });

    it('rechaza nombre duplicado del mismo usuario (409)', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', alice.bearer)
        .send({ name: 'Trabajo' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', alice.bearer)
        .send({ name: 'Trabajo' })
        .expect(409);
    });

    it('rechaza color invalido (400)', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', alice.bearer)
        .send({ name: 'Color', color: 'rojo' })
        .expect(400);
    });
  });

  // -------------------- TASKS --------------------
  describe('Tasks', () => {
    let categoryId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', alice.bearer)
        .send({ name: 'Estudio' })
        .expect(201);
      categoryId = res.body.id;
    });

    it('crear tarea con categoria del usuario', async () => {
      const res = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', alice.bearer)
        .send({ title: 'Estudiar algebra', priority: 'HIGH', categoryId })
        .expect(201);
      expect(res.body.title).toBe('Estudiar algebra');
      expect(res.body.priority).toBe('HIGH');
      expect(res.body.status).toBe('PENDING');
      expect(res.body.categoryId).toBe(categoryId);
    });

    it('rechaza tarea con categoria ajena (403)', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', bob.bearer)
        .send({ title: 'X', categoryId })
        .expect(403);
    });

    it('filtra por estado y prioridad', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', alice.bearer)
        .send({ title: 'T1', priority: 'HIGH' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', alice.bearer)
        .send({ title: 'T2', priority: 'LOW' })
        .expect(201);

      const high = await request(app.getHttpServer())
        .get('/tasks?priority=HIGH')
        .set('Authorization', alice.bearer)
        .expect(200);
      expect(high.body).toHaveLength(1);
      expect(high.body[0].title).toBe('T1');
    });

    it('lista solo tareas del usuario autenticado', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', alice.bearer)
        .send({ title: 'A1' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', bob.bearer)
        .send({ title: 'B1' })
        .expect(201);

      const list = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', alice.bearer)
        .expect(200);
      expect(list.body.every((t: { userId: string }) => t.userId === alice.userId)).toBe(true);
      expect(list.body).toHaveLength(1);
    });

    it('PATCH /:id/complete marca completada y setea completedAt', async () => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', alice.bearer)
        .send({ title: 'Completar' })
        .expect(201);
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${created.body.id}/complete`)
        .set('Authorization', alice.bearer)
        .expect(200);
      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.completedAt).not.toBeNull();
    });

    it('DELETE /:id elimina la tarea', async () => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', alice.bearer)
        .send({ title: 'Borrar' })
        .expect(201);
      await request(app.getHttpServer())
        .delete(`/tasks/${created.body.id}`)
        .set('Authorization', alice.bearer)
        .expect(204);
    });
  });

  // -------------------- REMINDERS --------------------
  describe('Reminders', () => {
    let taskId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', alice.bearer)
        .send({ title: 'Con recordatorio' })
        .expect(201);
      taskId = res.body.id;
    });

    it('CRUD completo', async () => {
      const remindAt = new Date(Date.now() + 60_000).toISOString();
      const created = await request(app.getHttpServer())
        .post('/reminders')
        .set('Authorization', alice.bearer)
        .send({ taskId, remindAt, type: 'FIVE_MINUTES' })
        .expect(201);
      expect(created.body.isSent).toBe(false);

      await request(app.getHttpServer())
        .get('/reminders')
        .set('Authorization', alice.bearer)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/reminders/${created.body.id}`)
        .set('Authorization', alice.bearer)
        .send({ type: 'ONE_HOUR' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/reminders/${created.body.id}`)
        .set('Authorization', alice.bearer)
        .expect(204);
    });

    it('rechaza reminder sobre tarea ajena (403)', async () => {
      const remindAt = new Date(Date.now() + 60_000).toISOString();
      await request(app.getHttpServer())
        .post('/reminders')
        .set('Authorization', bob.bearer)
        .send({ taskId, remindAt })
        .expect(403);
    });
  });

  // -------------------- STATISTICS --------------------
  describe('Statistics', () => {
    beforeEach(async () => {
      const t1 = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', alice.bearer)
        .send({ title: 'S1', priority: 'HIGH' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', alice.bearer)
        .send({ title: 'S2', priority: 'LOW' })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/tasks/${t1.body.id}/complete`)
        .set('Authorization', alice.bearer)
        .expect(200);
    });

    it('GET /statistics/summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/statistics/summary')
        .set('Authorization', alice.bearer)
        .expect(200);
      expect(res.body).toHaveProperty('totals');
      expect(res.body.totals.total).toBeGreaterThanOrEqual(2);
    });

    it('GET /statistics/weekly', async () => {
      const res = await request(app.getHttpServer())
        .get('/statistics/weekly')
        .set('Authorization', alice.bearer)
        .expect(200);
      expect(res.body).toHaveProperty('days');
    });

    it('GET /statistics/monthly', async () => {
      const res = await request(app.getHttpServer())
        .get('/statistics/monthly')
        .set('Authorization', alice.bearer)
        .expect(200);
      expect(res.body).toHaveProperty('weeks');
    });
  });
});
