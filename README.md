# IntegrarTec Agenda

Aplicación de planificación personal construida con Next.js, Prisma y PostgreSQL.

## Requisitos

- Node.js 20 o superior
- pnpm 11
- Docker Desktop (recomendado para PostgreSQL local)

## Inicio local

1. Copiá `.env.example` a `.env`.
2. Levantá PostgreSQL con `docker compose up -d`.
3. Instalá las dependencias con `pnpm install`.
4. Cuando el modelo de datos esté definido, aplicá la primera migración con `pnpm prisma migrate dev --name init`.
5. Iniciá el proyecto con `pnpm dev`.

La base local queda disponible en `localhost:5432`; la cadena de conexión de Prisma está definida en `DATABASE_URL`.

## Estructura

- `src/`: aplicación Next.js.
- `prisma/schema.prisma`: modelos y proveedor PostgreSQL.
- `prisma.config.ts`: configuración de Prisma y migraciones.
- `docker-compose.yml`: base de datos PostgreSQL local.

## Endpoints

### `POST /api/auth/register`

Crea un usuario. Recibe JSON con `name`, `email` y `password`; la contraseña debe tener entre 8 y 128 caracteres. La respuesta no incluye la contraseña ni su hash.
