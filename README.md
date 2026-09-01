# Planify Backend

REST API para la aplicación de gestión de tareas y agenda personal **Planify**. Construida con NestJS 11, Prisma 7 y PostgreSQL 16. Toda la persistencia se realiza en PostgreSQL mediante Prisma; la autenticación usa JWT (access + refresh rotativo) y bcrypt para contraseñas.

## 1. Nombre del proyecto

**Planify Backend** — API REST del producto Planify.

## 2. Descripción

Backend modular que expone endpoints para:

- Registro, login, refresh y logout con JWT.
- Gestión de perfil de usuario.
- CRUD de categorías.
- CRUD de tareas con filtros, recurrencia (diaria / semanal) y marcado como completada.
- CRUD de recordatorios asociados a tareas, con un scheduler que los procesa cada 5 minutos.
- Estadísticas agregadas (resumen general, semanales y mensuales) siempre scoped al usuario autenticado.

Todos los datos están aislados por usuario: el `userId` siempre proviene del JWT y nunca se confía en un identificador enviado por el cliente.

## 3. Tecnologías

- **NestJS 11** + TypeScript 5
- **Prisma 7** con driver adapter `@prisma/adapter-pg`
- **PostgreSQL 16** (vía Docker Compose en local)
- **JWT** (`@nestjs/jwt` + `passport-jwt`) con access token (15 m) y refresh token (7 d)
- **bcrypt** (12 rounds) para hash de contraseñas y de refresh tokens
- **class-validator** + **class-transformer** para validación de DTOs
- **Helmet** para headers HTTP defensivos
- **CORS** restringido por `FRONTEND_URL`
- **@nestjs/throttler** con TTL estricto para `/auth/*` (5 req/min/IP)
- **@nestjs/schedule** (`@Cron`) para el scheduler de recordatorios
- **Swagger** (`@nestjs/swagger`) en `/docs`

## 4. Arquitectura

Arquitectura modular de NestJS. Estructura actual:

```
src/
├── auth/                Registro, login, refresh, logout, JWT strategy y guard
├── users/               Perfil del usuario autenticado
├── categories/          CRUD de categorías con ownership
├── tasks/               CRUD de tareas con filtros y recurrencia
├── reminders/           CRUD de recordatorios + scheduler (@Cron)
├── statistics/          Resumen, semanal y mensual
├── prisma/              PrismaService global + PrismaModule
├── health/              Healthcheck
├── main.ts              Bootstrap, helmet, CORS, Swagger, ValidationPipe
└── app.module.ts        Composition root
prisma/
├── schema.prisma        Modelos, enums y relaciones
└── migrations/          Migraciones versionadas
```

Capas: Controller → Service → PrismaService → PostgreSQL. La validación corre en un `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`).

## 5. Requisitos

- **Node.js 20 o superior** (probado con 22)
- **pnpm 11**
- **Docker Desktop** corriendo (recomendado para PostgreSQL local) — o un Postgres 16 accesible
- Git

## 6. Instalación

```bash
pnpm install
cp .env.example .env
# editar .env y reemplazar JWT_SECRET, JWT_REFRESH_SECRET por secretos fuertes
pnpm exec prisma generate
```

> En Windows los nombres largos que crea pnpm dentro de `node_modules/.pnpm` pueden bloquear `rmdir`; si pasa, mapeá un `subst X: <ruta>` y borrá desde ahí.

## 7. Variables de entorno

Definidas en `.env.example`. **Nunca** commitear un `.env` real.

| Variable | Descripción | Ejemplo |
|---|---|---|
| `POSTGRES_USER` | Usuario de Postgres | `planify_user` |
| `POSTGRES_PASSWORD` | Password de Postgres | `planify_password` |
| `POSTGRES_DB` | Nombre de la base | `planify_db` |
| `POSTGRES_PORT` | Puerto de Postgres | `5432` |
| `DATABASE_URL` | Cadena de conexión Prisma | `postgresql://planify_user:planify_password@localhost:5432/planify_db?schema=public` |
| `PORT` | Puerto del backend | `3000` |
| `JWT_SECRET` | Secreto del access token (mín. 32 chars) | _(random)_ |
| `JWT_REFRESH_SECRET` | Secreto del refresh token (mín. 32 chars) | _(random)_ |
| `JWT_ACCESS_TTL` | Duración del access token | `15m` |
| `JWT_REFRESH_TTL` | Duración del refresh token | `7d` |
| `FRONTEND_URL` | Origen permitido por CORS (soporta lista separada por comas) | `http://localhost:3001` |

## 8. Configuración de PostgreSQL

Con Docker Compose:

```bash
docker compose up -d
```

Levanta un contenedor `planify-postgres` con la imagen `postgres:16-alpine`, exponiendo `5432` y persistiendo datos en el volumen `postgres_data`.

Si preferís un Postgres externo, configurá `DATABASE_URL` apuntando a él.

## 9. Migraciones Prisma

Las migraciones viven en `prisma/migrations/` y están versionadas con timestamps.

```bash
# aplicar todas las migraciones pendientes
pnpm exec prisma migrate dev

# generar el cliente (ya lo hace migrate dev, pero útil para CI)
pnpm exec prisma generate

# crear una nueva migración tras un cambio en schema.prisma
pnpm exec prisma migrate dev --name mi_cambio
```

Si la base está vacía, las migraciones crean las tablas `users`, `categories`, `tasks`, `reminders`, los enums `roles`, `priorities`, `task_statuses`, `recurrences`, `reminder_types`, los índices correspondientes y las FK con `onDelete` apropiado.

## 10. Cómo ejecutar localmente

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar Postgres
docker compose up -d

# 3. Aplicar migraciones
pnpm exec prisma migrate dev

# 4. Iniciar el backend en modo desarrollo
pnpm start:dev
```

El servidor queda en `http://localhost:3000`. Swagger UI en `http://localhost:3000/docs`.

Comandos útiles:

```bash
pnpm build           # compila a dist/
pnpm start           # ejecuta dist/main.js (sin watch)
pnpm start:prod      # mismo que start pero pensado para NODE_ENV=production
pnpm lint            # eslint con la config de Nest
```

## 11. Endpoints

### Auth

| Método | Ruta | Auth | Body / Query | Descripción |
|---|---|---|---|---|
| `POST` | `/auth/register` | público | `{ name, email, password }` | Crea usuario. Devuelve perfil + tokens. |
| `POST` | `/auth/login` | público | `{ email, password }` | Devuelve perfil + tokens. |
| `POST` | `/auth/refresh` | público | `{ refreshToken }` | Rota refresh token. |
| `POST` | `/auth/logout` | JWT | — | Invalida el refresh token. |
| `GET` | `/auth/me` | JWT | — | Perfil del usuario autenticado. |

### Users

| Método | Ruta | Auth | Body | Descripción |
|---|---|---|---|---|
| `GET` | `/users/me` | JWT | — | Perfil (alias). |
| `PATCH` | `/users/me` | JWT | `{ name?, avatar? }` | Actualiza nombre y/o avatar. |

### Categories

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/categories` | JWT | Crear categoría. |
| `GET` | `/categories` | JWT | Listar categorías del usuario. |
| `GET` | `/categories/:id` | JWT | Obtener una categoría. |
| `PATCH` | `/categories/:id` | JWT | Actualizar categoría. |
| `DELETE` | `/categories/:id` | JWT | Eliminar (cascadea `categoryId=null` en tareas). |

### Tasks

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/tasks` | JWT | Crear tarea. |
| `GET` | `/tasks` | JWT | Listar tareas con filtros (priority, status, categoryId, dueDate, fromDate, toDate, completed) y expansión de recurrencias. |
| `GET` | `/tasks/:id` | JWT | Obtener una tarea. |
| `PATCH` | `/tasks/:id` | JWT | Actualizar tarea. |
| `DELETE` | `/tasks/:id` | JWT | Eliminar tarea. |
| `PATCH` | `/tasks/:id/complete` | JWT | Marcar como completada. |

### Reminders

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/reminders` | JWT | Crear recordatorio sobre una tarea propia. |
| `GET` | `/reminders?pending=true` | JWT | Listar (pendientes o todos). |
| `GET` | `/reminders/:id` | JWT | Obtener uno. |
| `PATCH` | `/reminders/:id` | JWT | Actualizar. |
| `DELETE` | `/reminders/:id` | JWT | Eliminar. |

### Statistics

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/statistics/summary` | JWT | Totales, completion rate, distribuciones por categoría y prioridad. |
| `GET` | `/statistics/weekly` | JWT | Productividad de los últimos 7 días. |
| `GET` | `/statistics/monthly` | JWT | Productividad del mes en curso. |

### Health

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | público | Healthcheck. |

## 12. Autenticación

El backend usa **JWT con dos tokens**:

- **Access Token**: 15 minutos, enviado en `Authorization: Bearer <token>`. Verifica identidad en cada request.
- **Refresh Token**: 7 días. Se persiste como hash bcrypt en `User.refreshTokenHash` y se **rota** en cada `POST /auth/refresh`. El endpoint `POST /auth/logout` lo invalida (limpia el hash en DB).

Algoritmo: **HS256** con secretos separados (`JWT_SECRET`, `JWT_REFRESH_SECRET`). Las contraseñas se hashean con **bcrypt (12 rounds)** y nunca se devuelven al cliente.

Para usar la API desde Swagger o desde un cliente HTTP, primero hay que llamar a `/auth/login` (o `/auth/register`) y copiar el `accessToken` en el botón **Authorize** de `/docs` (Swagger persiste el token para requests subsiguientes).

## 13. Link al repositorio

<https://github.com/LUZVAAZQUEZ03/TP-4-IntegrarTec>

## 14. Link al deploy

_(Pendiente — Fase 11)_

## 15. Link a Swagger

- Local: `http://localhost:3000/docs`
- Producción: _(Pendiente — Fase 11)_

---

## Decisiones técnicas relevantes

- **Recurrencia por metadatos, sin filas hijas**: una tarea recurrente vive como una sola fila en `tasks`; las ocurrencias se proyectan en una ventana (default ±7 días) al listar. Modificar `recurrence` o `dueDate` aplica a toda la serie.
- **Ownership estricto**: todas las queries filtran por `userId` del JWT. Un usuario nunca puede ver, editar o eliminar recursos ajenos (responde 404 para no leak de existencia).
- **`passwordHash` y `refreshTokenHash` nunca se exponen**: `PublicUser` solo expone campos seguros, el `UpdateUserDto` solo acepta `name` y `avatar` (el `ValidationPipe` global rechaza cualquier otro campo con 400).
- **CORS por variable de entorno**: el origen se lee de `FRONTEND_URL`. Si está vacío, se loggea una advertencia y se permite cualquier origen solo en desarrollo.
- **Rate limiting en auth**: `/auth/register`, `/auth/login` y `/auth/refresh` están limitados a 5 requests/min/IP por defecto.

## Convenciones

- Conventional Commits en cada cambio.
- DTOs con `class-validator` y `class-transformer`.
- Migraciones versionadas con timestamp (`YYYYMMDDHHMMSS_nombre`).
- `.env.example` se commitea; `.env` jamás.

## Licencia

Proyecto académico.
