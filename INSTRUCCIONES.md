# Cómo arrancar, probar y apagar Planify

Documento operativo (no forma parte del spec, es una guía práctica).

> **Importante**: este repo se construyó con 11 fases progresivas. Antes de probar, asegurate de tener todo commiteado y pusheado (`git status` limpio). Si modificaste algo local y no commiteaste, hacelo primero.

## 1. Requisitos previos

- **Node.js 20 o superior** (probado con 22)
- **pnpm 11** (`npm i -g pnpm` si no está)
- **Docker Desktop** instalado y corriendo (ícono en la bandeja sin triángulo amarillo)
- **Postman** (opcional, pero hay una colección lista en `docs/planify.postman_collection.json`)
- Git configurado con acceso al repo

## 2. Arrancar el backend (paso a paso)

### 2.1. Levantar Postgres

```bash
cd proyecto-4-integrartec-2026
docker compose up -d
```

Verificar:

```bash
docker ps --filter "name=planify-postgres"
```

Debe mostrar `Up` y el puerto `0.0.0.0:5432->5432/tcp`.

### 2.2. Crear la shadow DB (solo la primera vez)

Prisma 7 exige una shadow DB para `migrate diff --from-migrations`. La creás dentro del contenedor:

```bash
docker exec planify-postgres psql -U planify_user -d planify_db -c "CREATE DATABASE planify_shadow;"
```

(Si te dice "already exists", está bien — pasa siempre que el volumen de Postgres no haya sido borrado.)

### 2.3. Verificar variables de entorno

El archivo `.env` ya tiene todo configurado. Valores clave:

```env
DATABASE_URL=postgresql://planify_user:planify_password@localhost:5432/planify_db?schema=public
PORT=4000
JWT_SECRET=dev_jwt_secret_change_in_production_min_32_chars_xxxxxxxxx
JWT_REFRESH_SECRET=dev_jwt_refresh_secret_change_in_production_min_32_chars_yyyyyyyy
FRONTEND_URL=http://localhost:3001
SHADOW_DATABASE_URL=postgresql://planify_user:planify_password@localhost:5432/planify_shadow?schema=public
```

> ⚠️ Si tenés **otro servicio en el puerto 3000** (ej. el frontend de Vite/Next), dejá `PORT=4000`. Si no, podés cambiarlo a 3000.

### 2.4. Aplicar migraciones

```bash
pnpm exec prisma migrate deploy
```

Salida esperada:

```
3 migrations found in prisma/migrations
Applying migration `20260828054406_create_user`
Applying migration `20260901160556_add_user_role_and_avatar`
Applying migration `20260901182250_add_full_domain`
All migrations have been successfully applied.
```

Verificar tablas:

```bash
docker exec planify-postgres psql -U planify_user -d planify_db -c "\dt"
```

Debe listar `users`, `categories`, `tasks`, `reminders`, `_prisma_migrations`.

### 2.5. Generar el cliente Prisma

```bash
pnpm exec prisma generate
```

### 2.6. Compilar el backend

```bash
pnpm exec rimraf dist
pnpm exec nest build
```

Debe terminar sin errores. Genera `dist/main.js`.

### 2.7. Arrancar el backend

En una terminal, dejá corriendo:

```bash
pnpm start:prod
```

O directamente:

```bash
node dist/main.js
```

Salida esperada (en pocos segundos):

```
[Nest] LOG [PrismaService] Prisma connected
[Nest] LOG [Bootstrap] Planify backend listening on http://localhost:4000
[Nest] LOG [Bootstrap] Swagger UI:    http://localhost:4000/docs
[Nest] LOG [Bootstrap] CORS permitido para: http://localhost:3001
```

El scheduler de recordatorios va a loggear cada 5 minutos:

```
[Nest] DEBUG [RemindersScheduler] Sin recordatorios pendientes
```

> Si ves `[ExceptionHandler]` con "P1000: Authentication failed", significa que las credenciales de Postgres no coinciden con el `.env`. El usuario esperado es `planify_user` / `planify_password` / `planify_db` (definidas en `docker-compose.yml`).

## 3. Probar con Postman

### 3.1. Importar la colección

1. Abrí Postman.
2. **File → Import** → seleccioná `docs/planify.postman_collection.json`.
3. La colección **Planify API** aparece en el sidebar.

### 3.2. Variables de colección

La colección trae dos variables:

| Variable | Default | Para qué se usa |
|---|---|---|
| `baseUrl` | `http://localhost:4000` | Host del backend |
| `token` | _(vacía)_ | Access token devuelto por `/auth/login` o `/auth/register` |

Los requests protegidos usan `Authorization: Bearer {{token}}`. El token se setea **automáticamente** si abrís la pestaña **Tests** del request `/auth/login` o `/auth/register` y corrés el request — hay un script que captura `accessToken` y lo guarda en la variable.

### 3.3. Flujo mínimo de prueba

1. **POST /auth/register** → crea un usuario nuevo y guarda el token.
2. **GET /auth/me** → confirma que el token funciona.
3. **POST /categories** → crea una categoría (body: `{ "name": "Universidad", "color": "#4F46E5" }`).
4. **POST /tasks** → crea una tarea (body: `{ "title": "Estudiar algebra", "categoryId": "<id de la categoria>" }`).
5. **GET /tasks** → lista tareas; debería mostrar la recién creada.
6. **PATCH /tasks/:id/complete** → marca como completada.
7. **GET /statistics/summary** → debe mostrar `total: 1, completed: 1, completionRate: 1`.

### 3.4. Probar el throttler (rate limit)

`/auth/login`, `/auth/register` y `/auth/refresh` tienen un límite de **5 requests por minuto** por IP. Para verificarlo:

1. Hacé 6 veces POST a `/auth/login` con cualquier credencial.
2. La sexta request devuelve `429 Too Many Requests`.

(Si lo querés probar a fondo, esperá 60 segundos y se resetea.)

## 4. Probar con curl (alternativa a Postman)

```bash
# 1. Registrar
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@planify.dev","password":"Planify2026!"}'

# 2. Login (captura el accessToken de la respuesta)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@planify.dev","password":"Planify2026!"}'

# 3. Perfil autenticado
curl http://localhost:4000/auth/me -H "Authorization: Bearer <TOKEN>"

# 4. Crear categoría
curl -X POST http://localhost:4000/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"name":"Universidad","color":"#4F46E5"}'

# 5. Crear tarea
curl -X POST http://localhost:4000/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"Estudiar algebra","categoryId":"<ID>"}'

# 6. Marcar como completada
curl -X PATCH http://localhost:4000/tasks/<ID>/complete \
  -H "Authorization: Bearer <TOKEN>"

# 7. Estadísticas
curl http://localhost:4000/statistics/summary -H "Authorization: Bearer <TOKEN>"
```

## 5. Apagar todo

### 5.1. Detener el backend

En la terminal donde corre `node dist/main.js` (o `pnpm start:dev`), hacé `Ctrl+C`. O desde otra terminal:

```bash
# Windows (PowerShell)
Get-Process node | Where-Object { $_.StartTime -gt (Get-Date).AddHours(-1) } | Stop-Process -Force
```

### 5.2. Bajar Postgres (preservando datos)

```bash
docker compose down
```

El contenedor se elimina pero el volumen `proyecto-4-integrartec-2026_postgres_data` queda. La próxima vez que hagas `docker compose up -d`, vas a recuperar la DB tal cual estaba.

### 5.3. Bajar Postgres y borrar TODO (reset completo)

```bash
docker compose down -v
```

Esto elimina el contenedor **y** el volumen. La próxima vez que arranques, tenés que volver a aplicar las migraciones y a crear la shadow DB.

## 6. Troubleshooting

### El backend arranca pero el log dice "Authentication failed"

Las credenciales no coinciden. Verificá que `.env` tenga:

```
DATABASE_URL=postgresql://planify_user:planify_password@localhost:5432/planify_db?schema=public
```

Y que el contenedor use los mismos valores (definidos en `docker-compose.yml`).

### `migrate deploy` falla con "shadowDatabaseUrl is required"

Esto pasa cuando intentás correr `pnpm exec prisma migrate dev` (no `deploy`). Solo `migrate deploy` no necesita shadow. Si necesitás `migrate dev`, asegurate de que `SHADOW_DATABASE_URL` esté en el `.env` y que `planify_shadow` exista.

### El healthcheck devuelve HTML en vez de JSON

Probablemente tenés **otro servicio** corriendo en el mismo puerto (común: el frontend de Vite/Next). Cambiá `PORT=4000` en `.env` y reiniciá el backend.

### No veo los endpoints en Swagger

Refresheá `http://localhost:4000/docs` con cache desactivado (Ctrl+Shift+R). Si seguís sin verlos, verificá que `main.ts` tenga `SwaggerModule.setup('docs', ...)`.

### Throttler: el 429 sale "inmediato"

Verificá que estés usando el endpoint correcto (`/auth/login`, `/auth/register`, `/auth/refresh`). El resto de endpoints tienen el throttler global (5 req/s, 60/min, 600/h) pero no estricto.

## 7. Nota sobre las migraciones

Hubo un fix crítico en esta sesión: las migraciones 3, 4 y 5 que generamos durante las fases 3-6 tenían el SQL contaminado con la salida del wrapper de pnpm en PowerShell (aparecía `node.exe : ...` antes del SQL real). El fix fue:

1. Borrar las tres migraciones contaminadas.
2. Crear **una única migración** consolidada: `20260901182250_add_full_domain`.
3. Esa migración incluye todos los enums, tablas e índices del spec final.

Si alguna vez regenerás migraciones desde cero, usá:

```bash
pnpm exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script \
  > prisma/migrations/<timestamp>_init/migration.sql
```

Y revisá el archivo antes de commitear — debería empezar con `-- CreateEnum` o `-- CreateTable`, **nunca** con `node.exe`.

## 8. Si rompés algo

- **DB inconsistente**: `docker compose down -v` y volver a aplicar migraciones.
- **Build falla**: `pnpm exec rimraf dist && pnpm exec nest build` y revisá los errores de TypeScript.
- **Cambios en schema.prisma**: regenerá una migración nueva con `pnpm exec prisma migrate dev --name mi_cambio` (requiere shadow DB).

## 9. Deploy en Render

El repo ya tiene `render.yaml` configurado. Para desplegar:

1. Entrá a [render.com](https://render.com) → **New → Blueprint**.
2. Conectá el repo `LUZVAAZQUEZ03/TP-4-IntegrarTec`.
3. Render detecta el Blueprint y propone Web Service + Postgres.
4. En el Environment del Web Service, setear `FRONTEND_URL` con el origen real del frontend.
5. El `releaseCommand: pnpm exec prisma migrate deploy` aplica las migraciones automáticamente.

URLs esperadas:
- API: `https://planify-backend.onrender.com`
- Swagger: `https://planify-backend.onrender.com/docs`
