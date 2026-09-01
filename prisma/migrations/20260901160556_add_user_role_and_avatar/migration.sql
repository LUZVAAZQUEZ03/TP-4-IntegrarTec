-- Migracion incremental: agregar enum Role y columnas avatar + role
-- a la tabla users ya creada por 20260828054406_create_user.

-- CreateEnum
CREATE TYPE "roles" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "avatar" TEXT,
  ADD COLUMN "role" "roles" NOT NULL DEFAULT 'USER';
