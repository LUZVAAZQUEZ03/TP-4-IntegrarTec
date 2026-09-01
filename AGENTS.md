# AGENTS.md — Planify backend

Convenciones que cualquier IA debe respetar al trabajar en este repo:

- Stack: NestJS 11 + TypeScript + Prisma 7 + PostgreSQL 16.
- Cada módulo vive en `src/<nombre>` con `*.controller.ts`, `*.service.ts`, `dto/`, `guards/`, `strategies/` según necesidad.
- Toda ruta privada usa `JwtAuthGuard` (a partir de Fase 2).
- Los endpoints que reciben datos del cliente usan DTOs con `class-validator`.
- `ValidationPipe` global ya está activado en `src/main.ts` (whitelist + forbidNonWhitelisted + transform).
- No hardcodear secretos. Usar `ConfigService` para leer variables de entorno.
- Convencional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Antes de implementar una fase, leer `spec.md` y `spec-2.0.md` en la carpeta padre.
- No agregar dependencias innecesarias.
