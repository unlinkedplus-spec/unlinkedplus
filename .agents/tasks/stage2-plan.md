# Implementation Plan — unlinked+ Tahap 2: Social Core

> **Stack:** NestJS 10 (TypeScript) + Next.js 14 (TypeScript) + Tailwind CSS + PostgreSQL 17 + Redis 7 + BullMQ + Docker Compose + Prisma ORM + JWT + Nginx  
> **Target server:** Ubuntu 192.168.1.20 — `docker compose up` from `D:\Anti-LinkedIn`  
> **Rule:** Never touch `index.html`, `app.html`, `js/`, `styles/` at repo root — Tahap 1 stays live.

---

## Architecture Decisions

**Password hashing — bcryptjs (not argon2):** Argon2 requires native binaries that break in `node:20-alpine` Docker builds without extra build toolchain. bcryptjs is pure JS, works identically in Alpine, and rounds=12 is adequately secure for this use case.

**Global JWT guard with `@Public()` opt-out:** A single `APP_GUARD` applied in `AppModule` means every new route is protected by default. Routes that need to be public get `@Public()` decorator. This prevents accidentally shipping unprotected endpoints.

**NestJS global prefix:** Nginx strips `/api/` before proxying to the backend (`location /api/ { proxy_pass http://backend/; }`), so the NestJS app does NOT set a global prefix. All controller routes are relative (e.g., `@Controller('auth')` → `/auth`). Nginx adds the `/api` prefix externally.

**Next.js output: standalone:** Docker build uses `output: 'standalone'` in `next.config.ts` for a minimal production image. The runner stage copies only `.next/standalone`, `.next/static`, and `public/`.

**BullMQ worker as separate Docker service:** The `worker` service runs the same `apps/api` image but with a different command (`node dist/worker/worker.ts`). This keeps certificate generation out of the request path without needing a separate codebase.

**Prisma in `apps/api/prisma/`:** The schema and migrations live inside the API app (not at repo root) because only the backend uses Prisma. The Docker entrypoint runs `prisma migrate deploy` before `node dist/main` on every startup, ensuring the schema is always in sync.

---

## Dependency Order

```
FEAT-001 (Infrastructure + Prisma schema + Docker)
    └── FEAT-002 (Auth + Posts + Reactions + Users API)
            └── FEAT-003 (Store + Avatars + Certs API + Full Next.js Frontend)
                    └── FEAT-004 (Comments + Reports + Security hardening + Integration)
```

Each FEAT leaves `docker compose up --build` in a working state.

---

## Implementation Plan

### FEAT-001 — Infrastructure, Docker, Prisma Schema

- [ ] 1. **Create `.env.example`** at `D:\Anti-LinkedIn\.env.example`.
      All environment variables needed by the entire stack:
      ```
      DB_PASSWORD=changeme_strong_password
      REDIS_PASSWORD=changeme_redis_password
      JWT_SECRET=changeme_jwt_secret_min_32_chars
      JWT_EXPIRES_IN=7d
      NEXT_PUBLIC_API_URL=http://192.168.1.20/api
      FRONTEND_URL=http://192.168.1.20
      NODE_ENV=production
      STORAGE_PATH=/data
      THROTTLE_TTL=60000
      THROTTLE_LIMIT=100
      ```
      Files: `D:\Anti-LinkedIn\.env.example`  
      Verify: File exists with all keys. Operator copies to `.env` and fills real values before `docker compose up`.

- [ ] 2. **Create `docker-compose.yml`** at `D:\Anti-LinkedIn\docker-compose.yml`.  
      Seven services:
      - `postgres` — `postgres:17-alpine`, env `POSTGRES_DB/USER/PASSWORD`, volume `postgres_data:/var/lib/postgresql/data`, healthcheck `pg_isready -U unlinked -d unlinked` interval 10s retries 5.
      - `redis` — `redis:7-alpine`, command `redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}`, volume `redis_data:/data`, healthcheck `redis-cli -a ${REDIS_PASSWORD} ping` retries 5.
      - `backend` — `build: ./apps/api`, port not exposed externally (nginx proxies), `env_file: .env`, extra env `DATABASE_URL=postgresql://unlinked:${DB_PASSWORD}@postgres:5432/unlinked` and `REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379`, volume `app_storage:/data`, depends_on postgres+redis with `condition: service_healthy`, healthcheck `wget --quiet --tries=1 --spider http://localhost:3001/health`, restart `unless-stopped`, deploy resources limits memory 512m.
      - `worker` — same build as backend, command `node dist/worker/worker.js`, same env/volumes/depends_on, restart `unless-stopped`, memory 256m.
      - `frontend` — `build: ./apps/web`, build arg `NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}`, depends_on backend `condition: service_healthy`, healthcheck `wget --quiet --tries=1 --spider http://localhost:3000`, restart `unless-stopped`, memory 256m.
      - `nginx` — `nginx:alpine`, ports `80:80`, volumes `./docker/nginx:/etc/nginx/conf.d:ro`, depends_on frontend+backend, restart `unless-stopped`.
      - Named volumes: `postgres_data`, `redis_data`, `app_storage`.  
      Files: `D:\Anti-LinkedIn\docker-compose.yml`  
      Verify: `docker compose config` runs without errors (validates YAML syntax).

- [ ] 3. **Create Nginx config** at `D:\Anti-LinkedIn\docker\nginx\default.conf`.  
      Two upstreams: `frontend` → `frontend:3000`, `backend` → `backend:3001`.  
      Single `server` block port 80:
      - `location /api/ { proxy_pass http://backend/; proxy_set_header Host $host; X-Real-IP $remote_addr; X-Forwarded-For $proxy_add_x_forwarded_for; proxy_read_timeout 60s; }`
      - `location / { proxy_pass http://frontend; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; Connection 'upgrade'; Host $host; }`  
      Files: `D:\Anti-LinkedIn\docker\nginx\default.conf`  
      Verify: `nginx -t` inside the nginx container passes. `curl http://192.168.1.20/api/health` routes to backend.

- [ ] 4. **Create NestJS `package.json`** at `D:\Anti-LinkedIn\apps\api\package.json`.  
      Runtime deps: `@nestjs/core @nestjs/common @nestjs/platform-express @nestjs/jwt @nestjs/passport @nestjs/throttler @nestjs/bull @nestjs/config @prisma/client passport passport-jwt bcryptjs class-validator class-transformer helmet bullmq ioredis multer uuid`.  
      Dev deps: `@types/node @types/bcryptjs @types/passport-jwt @types/multer @types/uuid typescript ts-node @nestjs/cli @nestjs/schematics prisma rimraf`.  
      Scripts: `"start:dev": "nest start --watch"`, `"start:prod": "node dist/main"`, `"build": "nest build"`, `"prisma:generate": "prisma generate"`, `"prisma:migrate": "prisma migrate dev"`, `"test": "jest"`, `"test:e2e": "jest --config test/jest-e2e.json"`.  
      Prisma: `{"seed": "ts-node prisma/seed.ts"}`.  
      Files: `D:\Anti-LinkedIn\apps\api\package.json`  
      Verify: `cd apps/api && npm install` completes without errors.

- [ ] 5. **Create `tsconfig.json`** at `D:\Anti-LinkedIn\apps\api\tsconfig.json`.  
      `compilerOptions`: `target: ES2020`, `module: commonjs`, `strict: true`, `experimentalDecorators: true`, `emitDecoratorMetadata: true`, `outDir: ./dist`, `rootDir: ./src`, `skipLibCheck: true`, `paths: {}`.  
      Exclude `node_modules` and `dist`.  
      Files: `D:\Anti-LinkedIn\apps\api\tsconfig.json`  
      Verify: `cd apps/api && npx tsc --noEmit` passes after all source files are created (run at FEAT-002 completion).

- [ ] 6. **Create `apps/api/Dockerfile`** — multi-stage build.  
      Stage `builder` (`node:20-alpine`): `WORKDIR /app`, copy `package*.json`, `npm ci --only=production=false`, copy `src/` and `prisma/`, run `npm run build` and `npx prisma generate`.  
      Stage `runner` (`node:20-alpine`): `WORKDIR /app`, copy from builder `/app/dist`, `/app/node_modules`, `/app/prisma`. `ENV NODE_ENV=production`. `EXPOSE 3001`. `CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]`.  
      Files: `D:\Anti-LinkedIn\apps\api\Dockerfile`  
      Verify: `docker build -t unlinked-api ./apps/api` succeeds locally (after prisma schema exists).

- [ ] 7. **Create Prisma schema** at `D:\Anti-LinkedIn\apps\api\prisma\schema.prisma`.  
      Datasource: `provider = "postgresql"`, `url = env("DATABASE_URL")`.  
      Generator: `provider = "prisma-client-js"`.  
      Ten models matching TECHNICAL-BLUEPRINT.md exactly:
      - `User` — id UUID (default uuid()), username VarChar(50) unique, emailHash VarChar(255)? unique, passwordHash VarChar(255), createdAt @default(now()). Relations: profile (1-1), posts (1-many), reactions, comments, transactions, reports (reporter), inventoryItems.
      - `Profile` — userId (PK, FK→User cascade delete), avatarConfig Json?, mentalLevel Int @default(1), mentalXp Int @default(0), bio String?, isAnonymous Boolean @default(true).
      - `Post` — id UUID, userId? FK (SET NULL on delete), category VarChar(50), content String, createdAt @default(now()), status VarChar(20) @default("active"). Relations: user, reactions, comments, certificates.
      - `Reaction` — id UUID, postId FK (CASCADE), userId FK (CASCADE), reactionType VarChar(20). `@@unique([postId, userId, reactionType])`.
      - `Comment` — id UUID, postId FK (CASCADE), userId? FK (SET NULL), content String, createdAt.
      - `AvatarItem` — id UUID, name VarChar(100), itemType VarChar(50)?, price Int @default(0), isPremium Boolean @default(false).
      - `UserInventory` — userId FK (CASCADE), itemId FK (CASCADE), unlockedAt @default(now()). `@@id([userId, itemId])`.
      - `Certificate` — id UUID, postId FK (CASCADE), imagePath VarChar(500)?, createdAt.
      - `Transaction` — id UUID, userId? FK (SET NULL), itemId? FK, amount Int, paymentStatus VarChar(20) @default("pending"), createdAt.
      - `Report` — id UUID, reporterId? FK (SET NULL, relation name "reporter"), targetType VarChar(20), targetId String (UUID stored as string), reason String?, status VarChar(20) @default("pending"), createdAt.  
      Files: `D:\Anti-LinkedIn\apps\api\prisma\schema.prisma`  
      Verify: `cd apps/api && npx prisma validate` passes.

- [ ] 8. **Generate initial migration.**  
      With a local PostgreSQL running (or via docker compose with only postgres started), run `cd apps/api && npx prisma migrate dev --name init`.  
      This creates `apps/api/prisma/migrations/TIMESTAMP_init/migration.sql`.  
      Commit the migration files.  
      Files: `D:\Anti-LinkedIn\apps\api\prisma\migrations\` (generated)  
      Verify: `npx prisma migrate status` shows no pending migrations. Migration SQL file contains all 10 CREATE TABLE statements.

- [ ] 9. **Create PrismaModule and PrismaService.**  
      `apps/api/src/prisma/prisma.service.ts`: class `PrismaService extends PrismaClient`, implements `OnModuleInit` (`this.$connect()`) and `OnModuleDestroy` (`this.$disconnect()`).  
      `apps/api/src/prisma/prisma.module.ts`: `@Global() @Module({providers:[PrismaService], exports:[PrismaService]})`.  
      Files: `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/prisma/prisma.module.ts`  
      Verify: `npx tsc --noEmit` in apps/api passes. No type errors.

- [ ] 10. **Create `AppModule` skeleton and `main.ts`.**  
      `apps/api/src/app.module.ts`: imports `ConfigModule.forRoot({isGlobal:true})`, `ThrottlerModule.forRoot([{ttl:60000, limit:100}])`, `PrismaModule`. Provides `{provide: APP_GUARD, useClass: ThrottlerGuard}`. Feature modules added in FEAT-002/003.  
      `apps/api/src/main.ts`: `NestFactory.create(AppModule)` → `app.useGlobalPipes(new ValidationPipe({whitelist:true, forbidNonWhitelisted:true, transform:true}))` → `app.use(helmet())` → `app.enableCors({origin: process.env.FRONTEND_URL || 'http://192.168.1.20', credentials:true})` → `app.listen(3001)`.  
      Files: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`  
      Verify: `cd apps/api && npm run build` compiles without errors.

- [ ] 11. **Create common decorators and guards.**  
      `apps/api/src/common/decorators/public.decorator.ts`: `export const Public = () => SetMetadata('isPublic', true)`.  
      `apps/api/src/common/decorators/current-user.decorator.ts`: `createParamDecorator((_, ctx) => ctx.switchToHttp().getRequest().user)`.  
      `apps/api/src/common/guards/jwt-auth.guard.ts`: extends `AuthGuard('jwt')`, in `canActivate` checks reflector for `'isPublic'` metadata — if true, returns true (bypass JWT).  
      `apps/api/src/common/filters/http-exception.filter.ts`: `@Catch(HttpException)` filter returns `{statusCode, message, timestamp, path}`.  
      Register the exception filter globally in `main.ts`.  
      Files: `apps/api/src/common/decorators/public.decorator.ts`, `apps/api/src/common/decorators/current-user.decorator.ts`, `apps/api/src/common/guards/jwt-auth.guard.ts`, `apps/api/src/common/filters/http-exception.filter.ts`  
      Verify: `npm run build` passes.

---

### FEAT-002 — Auth + Posts + Reactions + Users API

- [ ] 12. **Create XP level helper.**  
      `apps/api/src/common/helpers/xp-level.helper.ts`:
      ```typescript
      export const LEVEL_THRESHOLDS = [
        { level: 1, minXp: 0,   name: 'Rapuh' },
        { level: 2, minXp: 50,  name: 'Tahan Banting' },
        { level: 3, minXp: 150, name: 'Kebal Revisi' },
        { level: 4, minXp: 300, name: 'Kebal PHP HRD' },
        { level: 5, minXp: 500, name: 'Suhu Spill' },
      ];
      export function calculateLevel(xp: number): number { ... }
      export function getLevelName(xp: number): string { ... }
      ```  
      Files: `apps/api/src/common/helpers/xp-level.helper.ts`  
      Verify: Unit test `calculateLevel(0)===1`, `calculateLevel(50)===2`, `calculateLevel(500)===5` all pass.

- [ ] 13. **Create Anti-Flex phrases constant.**  
      `apps/api/src/posts/anti-flex.const.ts`:
      ```typescript
      export const ANTI_FLEX_PHRASES = [
        'alhamdulillah diterima', 'gaji dua digit', 'promosi jabatan',
        'bangga mengumumkan', 'humbled and honored', 'excited to announce',
        'thrilled to share', 'bersyukur diterima', 'naik jabatan', 'diterima kerja',
      ];
      ```  
      Files: `apps/api/src/posts/anti-flex.const.ts`  
      Verify: File exists, exported array has exactly 10 strings.

- [ ] 14. **Create Health module.**  
      `apps/api/src/health/health.controller.ts`: `@Controller('health') @Get() @Public()` returns `{status:'ok', timestamp: new Date().toISOString()}`.  
      `apps/api/src/health/health.module.ts`: basic module with controller.  
      Register `HealthModule` in `AppModule` imports.  
      Files: `apps/api/src/health/health.controller.ts`, `apps/api/src/health/health.module.ts`  
      Verify: `curl http://localhost:3001/health` returns `{"status":"ok",...}` after server starts.

- [ ] 15. **Create Auth module.**  
      Files to create:
      - `apps/api/src/auth/dto/register.dto.ts` — `username: @IsString @MinLength(3) @MaxLength(50) @Matches(/^[a-zA-Z0-9_]+$/)`, `password: @IsString @MinLength(8) @MaxLength(100)`, `email: @IsEmail @IsOptional`.
      - `apps/api/src/auth/dto/login.dto.ts` — `username: @IsString @IsNotEmpty`, `password: @IsString @IsNotEmpty`.
      - `apps/api/src/auth/jwt.strategy.ts` — `PassportStrategy(Strategy)`, constructor sets `{jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: config.get('JWT_SECRET')}`. `validate({sub, username})` returns `{userId: sub, username}`.
      - `apps/api/src/auth/auth.service.ts`:
        - `register(dto)`: hash password with `bcrypt.hash(dto.password, 12)`, if username not provided generate `BudakKantor_${Math.random().toString(36).slice(2,6).toUpperCase()}`. Run `prisma.$transaction` to create User + Profile rows. Return user (omit passwordHash).
        - `login(dto)`: `findFirst` by username, `bcrypt.compare`, sign JWT `{sub: user.id, username: user.username}`, return `{accessToken, user}`.
        - `getMe(userId)`: `findUnique` user with profile included.
      - `apps/api/src/auth/auth.controller.ts`: `POST /auth/register (@Public())`, `POST /auth/login (@Public())`, `GET /auth/me (uses @CurrentUser())`.
      - `apps/api/src/auth/auth.module.ts`: imports `PassportModule`, `JwtModule.registerAsync(...)`, `UsersModule`, `PrismaModule`. Provides `JwtStrategy`. Adds `JwtAuthGuard` as `APP_GUARD` here (move it here from AppModule so auth guard uses JwtStrategy).  
      Register `AuthModule` in `AppModule`.  
      Files: (all 6 files listed above)  
      Verify: `POST /auth/register` returns 201 with user object. `POST /auth/login` returns `accessToken`. `GET /auth/me` with Bearer token returns user+profile.

- [ ] 16. **Create Users module.**  
      - `apps/api/src/users/dto/update-profile.dto.ts` — `bio @IsString @IsOptional @MaxLength(300)`, `avatarConfig @IsObject @IsOptional`, `username @IsString @IsOptional @MinLength(3) @MaxLength(50) @Matches(/^[a-zA-Z0-9_]+$/)`.
      - `apps/api/src/users/users.service.ts`:
        - `findByUsername(username)`: return user+profile, exclude passwordHash and emailHash.
        - `updateMe(userId, dto)`: update profile (bio, avatarConfig) and optionally user.username (check uniqueness first, throw ConflictException if taken).
        - `getInventory(userId)`: return `userInventory` rows with `item` relation included.
        - `getMyPosts(userId, page)`: paginated posts where userId matches and status='active'.
      - `apps/api/src/users/users.controller.ts`: `GET /users/:username (@Public())`, `PATCH /users/me (JWT)`, `GET /users/me/posts (JWT)`, `GET /users/me/inventory (JWT)`.
      - `apps/api/src/users/users.module.ts`: exports `UsersService`.  
      Register `UsersModule` in `AppModule`.  
      Files: (4 files above)  
      Verify: `GET /users/:username` returns profile without sensitive fields. `PATCH /users/me` with JWT updates bio.

- [ ] 17. **Create Posts module.**  
      - `apps/api/src/posts/dto/create-post.dto.ts` — `category @IsIn(['Ditolak HRD','Salah Kirim Chat','Dimarahi Bos','Bisnis Boncos','Salah Jurusan'])`, `content @IsString @MinLength(10) @MaxLength(280)`.
      - `apps/api/src/posts/posts.service.ts`:
        - `findAll(page=1, limit=20)`: `findMany` where status='active', include `{user:{include:{profile:true}}, _count:{select:{reactions:true,comments:true}}}`, orderBy `createdAt desc`, skip/take pagination. Return `{data, total, page, totalPages}`.
        - `create(userId, dto)`: check `dto.content.toLowerCase()` against `ANTI_FLEX_PHRASES` — throw `BadRequestException('Sensor Anti-Pamer aktif: konten tidak diizinkan')` if match found. Run `prisma.$transaction`: create Post, then `profile.update({where:{userId}, data:{mentalXp:{increment:10}}})`. After transaction, recalculate level and update if changed. Return created post.
        - `findOne(id)`: findUnique with relations.
        - `softDelete(id, userId)`: verify ownership (throw `ForbiddenException` if not owner), update status to `'deleted'`.
      - `apps/api/src/posts/posts.controller.ts`: `GET /posts (@Public())`, `POST /posts (JWT)`, `GET /posts/:id (@Public())`, `DELETE /posts/:id (JWT)`.
      - `apps/api/src/posts/posts.module.ts`.  
      Register `PostsModule` in `AppModule`.  
      Files: (4 files above)  
      Verify: `POST /posts` with banned phrase returns 400. Valid post returns 201. `GET /posts` returns `{data:[...], total, page, totalPages}`.

- [ ] 18. **Create Reactions module.**  
      - `apps/api/src/reactions/dto/toggle-reaction.dto.ts` — `type @IsIn(['pukpuk','ngakak','sama'])`.
      - `apps/api/src/reactions/reactions.service.ts`:
        - `toggle(postId, userId, type)`: `prisma.$transaction` — `findUnique` reaction by `@@unique`. If exists: delete it (un-react). If not: create it, find the post owner, add XP to owner's profile (+2 for pukpuk, +1 ngakak, +3 sama), recalculate owner's level. Return `{added: boolean, counts: {...}}`.
        - `getCounts(postId, requestingUserId?)`: group reactions by type, return `{pukpuk:N, ngakak:N, sama:N, userReactions:{pukpuk:bool, ngakak:bool, sama:bool}}`.
      - `apps/api/src/reactions/reactions.controller.ts`: `POST /posts/:id/reactions (JWT, body: {type})`, `GET /posts/:id/reactions (@Public())`.
      - `apps/api/src/reactions/reactions.module.ts`.  
      Register `ReactionsModule` in `AppModule`.  
      Files: (4 files above)  
      Verify: Toggle reaction returns `{added:true}` first call, `{added:false}` second call. Post owner's `mentalXp` increments correctly per reaction type.

- [ ] 19. **Create Prisma seed file.**  
      `apps/api/prisma/seed.ts`: upsert 5 `AvatarItem` rows:
      - `{id:'item-id-card', name:'ID Card Miring', itemType:'accessory', price:0, isPremium:false}`
      - `{id:'item-kardus', name:'Kardus Barang', itemType:'accessory', price:0, isPremium:false}`
      - `{id:'item-kopi', name:'Kopi Galon', itemType:'accessory', price:0, isPremium:false}`
      - `{id:'item-bendera', name:'Bendera Putih', itemType:'accessory', price:0, isPremium:false}`
      - `{id:'item-kacamata', name:'Kacamata Melorot', itemType:'accessory', price:10000, isPremium:true}`  
      Files: `apps/api/prisma/seed.ts`  
      Verify: `npx prisma db seed` inserts 5 rows in `avatar_items`.

---

### FEAT-003 — Store + Avatars + Certificates API + Full Next.js Frontend

- [ ] 20. **Create Avatars module.**  
      `apps/api/src/avatars/avatars.service.ts`: `findAll()` returns all avatar_items sorted by isPremium asc, price asc.  
      `apps/api/src/avatars/avatars.controller.ts`: `GET /avatar/items (@Public())`.  
      `apps/api/src/avatars/avatars.module.ts`.  
      Register in `AppModule`.  
      Files: 3 files above.  
      Verify: `curl http://localhost:3001/avatar/items` returns JSON array of 5 items.

- [ ] 21. **Create Store module.**  
      - `apps/api/src/store/dto/purchase.dto.ts` — `itemId @IsUUID @IsNotEmpty`.
      - `apps/api/src/store/store.service.ts`:
        - `purchase(userId, dto)`: find item (throw NotFoundException if missing), check not already in UserInventory (throw ConflictException 'Item sudah dimiliki' if owned). Create Transaction `{userId, itemId, amount:item.price, paymentStatus:'pending'}`. Return transaction + `{qrisPayload: 'SIMULATED_QRIS_'+transaction.id}`.
        - `confirmPurchase(transactionId, userId)`: findUnique transaction, verify `transaction.userId===userId` (ForbiddenException if not), verify status='pending' (BadRequestException if already processed). Run `prisma.$transaction`: update Transaction status='completed', upsert UserInventory. Return updated transaction.
        - `getTransactions(userId)`: findMany transactions for user, include item.
      - `apps/api/src/store/store.controller.ts`: `GET /store/transactions (JWT)`, `POST /store/purchase (JWT)`, `POST /store/purchase/confirm/:transactionId (JWT)`.
      - `apps/api/src/store/store.module.ts`.  
      Register in `AppModule`.  
      Files: 4 files above.  
      Verify: Full purchase flow — `POST /store/purchase` → pending transaction → `POST /store/purchase/confirm/:id` → completed + item in inventory.

- [ ] 22. **Create Certificates module + BullMQ worker.**  
      - `apps/api/src/certificates/certificates.service.ts`: `create(postId, userId)` — verify post owned by userId, create Certificate row `{postId, imagePath:null}`, enqueue BullMQ job `'certificates'` queue with `{certificateId, postContent, username}`. Return certificate.  `findOne(id)`: findUnique.
      - `apps/api/src/certificates/certificates.controller.ts`: `POST /certificates (JWT, body:{postId})`, `GET /certificates/:id (@Public())`.
      - `apps/api/src/certificates/certificates.module.ts`: imports `BullModule.registerQueue({name:'certificates'})`.
      - `apps/api/src/worker/certificate.processor.ts`: `@Processor('certificates')` with `@Process('generate')` — receives job, generates minimal SVG cert markup, writes to `${STORAGE_PATH}/certificates/${id}.svg`, updates Certificate.imagePath via PrismaService.
      - `apps/api/src/worker/worker.module.ts`: imports `BullModule.forRoot(...)`, `PrismaModule`, registers `CertificateProcessor`.
      - `apps/api/src/worker/worker.ts`: `NestFactory.createApplicationContext(WorkerModule)`.  
      Register `CertificatesModule` in `AppModule`.  
      Files: 6 files above.  
      Verify: `POST /certificates` creates row with `imagePath:null`. Worker logs show job processed. After processing, `GET /certificates/:id` returns non-null `imagePath`.

- [ ] 23. **Create Next.js app scaffold.**  
      - `apps/web/package.json` — deps: `next@14 react@18 react-dom@18 typescript tailwindcss postcss autoprefixer axios js-cookie html2canvas canvas-confetti lucide-react`. Dev: `@types/react @types/react-dom @types/node @types/js-cookie @types/canvas-confetti`.
      - `apps/web/tsconfig.json` — standard Next.js TS config, `strict:true`, paths `@/*` → `./src/*`.
      - `apps/web/next.config.ts` — `output:'standalone'`, `env:{NEXT_PUBLIC_API_URL:...}`.
      - `apps/web/tailwind.config.ts` — content `./src/**/*.{ts,tsx}`, extend colors: `primary:'#F5C542', accent:'#F57C00', navy:'#172B4D', background:'#FAFAFA'`, fontFamily display/body.
      - `apps/web/postcss.config.js` — `{plugins:{tailwindcss:{}, autoprefixer:{}}}`.
      - `apps/web/Dockerfile` — 3-stage: deps (`npm ci`), builder (`npm run build` with `NEXT_PUBLIC_API_URL` build arg), runner (copy `.next/standalone`, `.next/static`, `public/`, `CMD node server.js`).
      - `apps/web/src/app/globals.css` — `@tailwind base/components/utilities`, Google Fonts import.  
      Files: 7 files above.  
      Verify: `cd apps/web && npm install && npm run build` completes without errors.

- [ ] 24. **Create API client and types.**  
      - `apps/web/src/lib/types.ts` — TypeScript interfaces: `User{id,username,createdAt}`, `Profile{userId,avatarConfig,mentalLevel,mentalXp,bio,isAnonymous}`, `Post{id,userId,category,content,createdAt,status,user?}`, `Reaction{id,postId,userId,reactionType}`, `AvatarItem{id,name,itemType,price,isPremium}`, `Transaction{id,userId,itemId,amount,paymentStatus,createdAt}`, `Certificate{id,postId,imagePath,createdAt}`, `PaginatedResponse<T>{data:T[],total:number,page:number,totalPages:number}`, `AuthResponse{accessToken:string,user:User}`.
      - `apps/web/src/lib/api.ts` — axios instance `baseURL=process.env.NEXT_PUBLIC_API_URL`. Request interceptor reads `localStorage.getItem('unlinked_token')` and sets `Authorization: Bearer {token}`. Response interceptor catches 401 and clears token. Exports: `authRegister(data)`, `authLogin(data)`, `authMe()`, `getPosts(page?)`, `createPost(data)`, `getPost(id)`, `deletePost(id)`, `toggleReaction(postId, type)`, `getReactions(postId)`, `getProfile(username)`, `updateProfile(data)`, `getInventory()`, `getMyPosts(page?)`, `getAvatarItems()`, `purchase(itemId)`, `confirmPurchase(transactionId)`, `getTransactions()`, `createCertificate(postId)`, `getCertificate(id)`.  
      Files: `apps/web/src/lib/types.ts`, `apps/web/src/lib/api.ts`  
      Verify: `npx tsc --noEmit` in apps/web passes with no type errors.

- [ ] 25. **Create root layout and landing page.**  
      - `apps/web/src/app/layout.tsx` — Server Component. `<html lang="id">`, `<head>` with Google Fonts link (Nunito + Inter), `<body className="bg-background font-body">`, `{children}`. Metadata: `title:'unlinked+', description:'No Flex. Just Human.'`.
      - `apps/web/src/app/page.tsx` — Mostly server component, renders landing page sections directly ported from `index.html`: `<nav>` with logo, hero section (yellow gradient bg, headline, subheadline, character strip, waitlist form), cert preview section, features section (3 cards), manifesto section, footer. Waitlist form is a `'use client'` island component `<WaitlistForm />` that on submit calls `authRegister` with the entered username/email and stores the returned JWT.  
      Files: `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/components/WaitlistForm.tsx`  
      Verify: `http://192.168.1.20` renders landing page with correct branding, yellow hero, 3 feature cards.

- [ ] 26. **Create main app page and BottomNav.**  
      - `apps/web/src/app/app/page.tsx` — `'use client'`. On mount: check `localStorage.getItem('unlinked_token')`, call `authMe()` — if fails clear token and `router.push('/')`. State: `activeTab` ('feed'|'create'|'avatar'|'shop'|'profile'). Renders active tab content. Bottom nav fixed at bottom.
      - `apps/web/src/components/BottomNav.tsx` — `'use client'`. 5 nav buttons: 🏠 Beranda, ✍️ Spill, 🧑‍💼 Avatar, 🛒 Toko, 👤 Profil. Active tab highlighted with `text-primary font-bold border-t-2 border-primary`.  
      Files: `apps/web/src/app/app/page.tsx`, `apps/web/src/components/BottomNav.tsx`  
      Verify: `http://192.168.1.20/app` renders app shell with 5 nav items. Without JWT redirects to `/`.

- [ ] 27. **Create FailFeed and ReactionBar components.**  
      - `apps/web/src/components/FailFeed.tsx` — `'use client'`. `useEffect` fetches `getPosts(1)` on mount. IntersectionObserver on a sentinel div loads next page when it enters viewport. Maps posts to PostCard components. Each PostCard: inline SVG avatar (port SVG paths from `js/avatar-builder.js` using the `avatarConfig` JSON from the post's user profile), username, level badge (color-coded), category badge (colored by category), content text, relative timestamp helper, `<ReactionBar>`, 'Buat Sertifikat' button.
      - `apps/web/src/components/ReactionBar.tsx` — `'use client'`. Props: `{postId, initialCounts, initialUserReactions}`. State: local counts + which reactions user gave. On button click: optimistic update, then `toggleReaction(postId, type)`. Reverts on error. Buttons: `🫂 Puk-Puk (N)`, `😂 Ngakak Maaf (N)`, `🤝 Sama Banget (N)`.  
      Files: `apps/web/src/components/FailFeed.tsx`, `apps/web/src/components/ReactionBar.tsx`  
      Verify: Feed tab shows posts from API. Reacting toggles button state and updates count without reload.

- [ ] 28. **Create AvatarBuilder component.**  
      `apps/web/src/components/AvatarBuilder.tsx` — `'use client'`. Ports SVG rendering logic from `js/avatar-builder.js`: defines inline SVG path constants for all 4 characters and 5 accessories. State: `{character, accessories[]}` initialized from `authMe()` profile.avatarConfig. Left panel: `<svg viewBox="0 0 300 300">` renders current character + equipped accessories. Right panel: 4 character cards (click → update character), 5 accessory rows (click → toggle equipped; premium items check inventory — if not owned show 'Premium, beli dulu'). Save button calls `updateProfile({avatarConfig})`.  
      Files: `apps/web/src/components/AvatarBuilder.tsx`  
      Verify: Character cards change SVG preview. Free accessories toggle. Save updates backend.

- [ ] 29. **Create Shop, QRISModal, CertificateModal components.**  
      - `apps/web/src/components/ShopModal.tsx` — `'use client'`. Fetches `getAvatarItems()` and `getInventory()`. Renders 2-column grid on mobile, 3-column on `md:`. Each card: item name, type badge, price, 'Dimiliki' badge if in inventory else 'Beli' button. Clicking 'Beli' calls `purchase(itemId)` to get pending transaction, then opens QRISModal.
      - `apps/web/src/components/QRISModal.tsx` — `'use client'`. Props: `{transaction, item, onSuccess, onClose}`. Renders modal with item name, price, simulated QRIS SVG (10×10 grid of `<rect>` elements, deterministic black/white from transactionId hash). 'Konfirmasi Bayar' button calls `confirmPurchase(transaction.id)`, on success fires `canvas-confetti`, calls `onSuccess()`, closes modal.
      - `apps/web/src/components/CertificateModal.tsx` — `'use client'`. Props: `{post, onClose}`. Calls `createCertificate(post.id)`. Renders certificate card div (yellow bg, navy border, same layout as Tahap 1 cert modal). 'Download PNG' uses `html2canvas` on the cert div. 'Tutup' closes modal.  
      Files: 3 files above.  
      Verify: Shop loads items. Buy flow opens QRIS modal, confirm fires confetti. Certificate modal shows post data, download produces PNG.

- [ ] 30. **Create Auth modal and Create Post tab.**  
      - `apps/web/src/components/AuthModal.tsx` — `'use client'`. Tab toggle Register/Login. Register calls `authRegister`. Login calls `authLogin`. On success stores `accessToken` in localStorage, calls `onSuccess` callback. Shows validation errors from API.
      - Create Post tab content in `apps/web/src/app/app/page.tsx` (or extract to `components/CreatePost.tsx`) — `<select>` for 5 categories, `<textarea maxLength={280}>` with character counter, client-side Anti-Flex sensor (same 10 phrases, shows warning and disables button on match), submit calls `createPost(data)`, on success switches to feed tab.  
      Files: `apps/web/src/components/AuthModal.tsx`, `apps/web/src/components/CreatePost.tsx`  
      Verify: Register/login from landing page stores token. Creating a post with a banned phrase shows warning before submit. Valid post appears at top of feed.

---

### FEAT-004 — Comments + Reports + Security Hardening + Integration

- [ ] 31. **Create Comments module.**  
      - `apps/api/src/comments/dto/create-comment.dto.ts` — `content @IsString @MinLength(1) @MaxLength(500)`.
      - `apps/api/src/comments/comments.service.ts`: `create(postId, userId, dto)` — verify post exists and status='active', create Comment. `findByPost(postId)`: findMany where postId, include `{user:{include:{profile:true}}}`, orderBy createdAt asc.
      - `apps/api/src/comments/comments.controller.ts`: `POST /posts/:id/comments (JWT)`, `GET /posts/:id/comments (@Public())`.
      - `apps/api/src/comments/comments.module.ts`.  
      Register in `AppModule`.  
      Files: 4 files above.  
      Verify: `POST /posts/:id/comments` returns 201. `GET /posts/:id/comments` returns array.

- [ ] 32. **Create Reports module.**  
      - `apps/api/src/reports/dto/create-report.dto.ts` — `targetType @IsIn(['post','comment','user'])`, `targetId @IsUUID`, `reason @IsString @IsOptional @MaxLength(500)`.
      - `apps/api/src/reports/reports.service.ts`: `create(reporterId, dto)` — creates Report row.
      - `apps/api/src/reports/reports.controller.ts`: `POST /reports (JWT)`.
      - `apps/api/src/reports/reports.module.ts`.  
      Register in `AppModule`.  
      Files: 4 files above.  
      Verify: `POST /reports` with valid JWT and body returns 201 with report object.

- [ ] 33. **Harden rate limiting on auth routes.**  
      In `AuthController`, add `@Throttle({default:{ttl:60000, limit:10}})` on `POST /auth/login` and `POST /auth/register` to limit to 10 attempts per minute per IP. The global guard (100/min) applies to all other routes.  
      Files: `apps/api/src/auth/auth.controller.ts` (modify)  
      Verify: Sending 11 rapid POST requests to `/auth/login` results in HTTP 429 on the 11th.

- [ ] 34. **Add CommentSection to frontend.**  
      `apps/web/src/components/CommentSection.tsx` — `'use client'`. Props: `{postId}`. Collapsed by default. 'Lihat komentar' button fetches `GET /posts/:id/comments` and toggles visibility. Comment list renders each comment's username, content, relative timestamp. Text input + 'Kirim' button calls `POST /posts/:id/comments`, prepends new comment to local list.  
      Render `<CommentSection postId={post.id} />` inside each PostCard in FailFeed.  
      Files: `apps/web/src/components/CommentSection.tsx`, modify `apps/web/src/components/FailFeed.tsx`  
      Verify: PostCard shows 'Lihat komentar' button. Clicking it loads comments. Submitting adds comment without page reload.

- [ ] 35. **Polish Profile tab.**  
      In `apps/web/src/app/app/page.tsx` (or extract `components/ProfileTab.tsx`), render Profile tab content: avatar SVG (200×200) using current user's avatarConfig, username with edit button (opens inline edit using `updateProfile`), level name badge (color-coded), XP progress bar (compute % within current level band: `(xp - levelMinXp) / (nextLevelMinXp - levelMinXp) * 100`), stats row (total posts count, total reactions received), owned inventory items grid with item names.  
      Files: `apps/web/src/components/ProfileTab.tsx`  
      Verify: Profile tab shows all elements. XP bar percentage is correct for each level band. Logout button clears token and navigates to `/`.

- [ ] 36. **Final integration and clean-up.**  
      - Verify `.env.example` covers every `process.env.*` reference in the entire codebase (grep apps/api/src and apps/web/src).
      - Add `DATABASE_URL` construction comment in `.env.example` explaining it is auto-constructed by docker-compose from `DB_PASSWORD`.
      - Run `docker compose down -v && docker compose up --build` from scratch. Confirm all 7 services reach healthy/running state. Confirm seed data exists (`avatar_items` has 5 rows). Confirm Tahap 1 files at root are unmodified.  
      Files: `D:\Anti-LinkedIn\.env.example` (minor clarification edits only)  
      Verify: `docker compose ps` shows all services Up. `curl http://192.168.1.20/api/health` → `{"status":"ok"}`. `curl http://192.168.1.20/api/posts` → paginated JSON. `curl http://192.168.1.20` → HTML with `unlinked+`. `ls D:\Anti-LinkedIn\index.html` and `ls D:\Anti-LinkedIn\app.html` still exist and are unmodified.

---

## File Creation Order Summary

```
# Config & Infrastructure (FEAT-001)
D:\Anti-LinkedIn\.env.example
D:\Anti-LinkedIn\docker-compose.yml
D:\Anti-LinkedIn\docker\nginx\default.conf
D:\Anti-LinkedIn\apps\api\package.json
D:\Anti-LinkedIn\apps\api\tsconfig.json
D:\Anti-LinkedIn\apps\api\Dockerfile
D:\Anti-LinkedIn\apps\api\prisma\schema.prisma
D:\Anti-LinkedIn\apps\api\prisma\migrations\  (generated)
D:\Anti-LinkedIn\apps\api\src\prisma\prisma.service.ts
D:\Anti-LinkedIn\apps\api\src\prisma\prisma.module.ts
D:\Anti-LinkedIn\apps\api\src\app.module.ts
D:\Anti-LinkedIn\apps\api\src\main.ts
D:\Anti-LinkedIn\apps\api\src\common\decorators\public.decorator.ts
D:\Anti-LinkedIn\apps\api\src\common\decorators\current-user.decorator.ts
D:\Anti-LinkedIn\apps\api\src\common\guards\jwt-auth.guard.ts
D:\Anti-LinkedIn\apps\api\src\common\filters\http-exception.filter.ts

# Auth + Social API (FEAT-002)
D:\Anti-LinkedIn\apps\api\src\common\helpers\xp-level.helper.ts
D:\Anti-LinkedIn\apps\api\src\posts\anti-flex.const.ts
D:\Anti-LinkedIn\apps\api\src\health\health.controller.ts
D:\Anti-LinkedIn\apps\api\src\health\health.module.ts
D:\Anti-LinkedIn\apps\api\src\auth\dto\register.dto.ts
D:\Anti-LinkedIn\apps\api\src\auth\dto\login.dto.ts
D:\Anti-LinkedIn\apps\api\src\auth\jwt.strategy.ts
D:\Anti-LinkedIn\apps\api\src\auth\auth.service.ts
D:\Anti-LinkedIn\apps\api\src\auth\auth.controller.ts
D:\Anti-LinkedIn\apps\api\src\auth\auth.module.ts
D:\Anti-LinkedIn\apps\api\src\users\dto\update-profile.dto.ts
D:\Anti-LinkedIn\apps\api\src\users\users.service.ts
D:\Anti-LinkedIn\apps\api\src\users\users.controller.ts
D:\Anti-LinkedIn\apps\api\src\users\users.module.ts
D:\Anti-LinkedIn\apps\api\src\posts\dto\create-post.dto.ts
D:\Anti-LinkedIn\apps\api\src\posts\posts.service.ts
D:\Anti-LinkedIn\apps\api\src\posts\posts.controller.ts
D:\Anti-LinkedIn\apps\api\src\posts\posts.module.ts
D:\Anti-LinkedIn\apps\api\src\reactions\dto\toggle-reaction.dto.ts
D:\Anti-LinkedIn\apps\api\src\reactions\reactions.service.ts
D:\Anti-LinkedIn\apps\api\src\reactions\reactions.controller.ts
D:\Anti-LinkedIn\apps\api\src\reactions\reactions.module.ts
D:\Anti-LinkedIn\apps\api\prisma\seed.ts

# Store + Certs + Frontend (FEAT-003)
D:\Anti-LinkedIn\apps\api\src\avatars\  (3 files)
D:\Anti-LinkedIn\apps\api\src\store\    (4 files)
D:\Anti-LinkedIn\apps\api\src\certificates\  (3 files)
D:\Anti-LinkedIn\apps\api\src\worker\   (3 files)
D:\Anti-LinkedIn\apps\web\package.json
D:\Anti-LinkedIn\apps\web\tsconfig.json
D:\Anti-LinkedIn\apps\web\next.config.ts
D:\Anti-LinkedIn\apps\web\tailwind.config.ts
D:\Anti-LinkedIn\apps\web\postcss.config.js
D:\Anti-LinkedIn\apps\web\Dockerfile
D:\Anti-LinkedIn\apps\web\src\app\globals.css
D:\Anti-LinkedIn\apps\web\src\app\layout.tsx
D:\Anti-LinkedIn\apps\web\src\app\page.tsx
D:\Anti-LinkedIn\apps\web\src\app\app\page.tsx
D:\Anti-LinkedIn\apps\web\src\lib\types.ts
D:\Anti-LinkedIn\apps\web\src\lib\api.ts
D:\Anti-LinkedIn\apps\web\src\components\WaitlistForm.tsx
D:\Anti-LinkedIn\apps\web\src\components\BottomNav.tsx
D:\Anti-LinkedIn\apps\web\src\components\FailFeed.tsx
D:\Anti-LinkedIn\apps\web\src\components\ReactionBar.tsx
D:\Anti-LinkedIn\apps\web\src\components\AvatarBuilder.tsx
D:\Anti-LinkedIn\apps\web\src\components\CertificateModal.tsx
D:\Anti-LinkedIn\apps\web\src\components\ShopModal.tsx
D:\Anti-LinkedIn\apps\web\src\components\QRISModal.tsx
D:\Anti-LinkedIn\apps\web\src\components\AuthModal.tsx
D:\Anti-LinkedIn\apps\web\src\components\CreatePost.tsx

# Comments + Reports + Hardening (FEAT-004)
D:\Anti-LinkedIn\apps\api\src\comments\  (4 files)
D:\Anti-LinkedIn\apps\api\src\reports\   (4 files)
D:\Anti-LinkedIn\apps\web\src\components\CommentSection.tsx
D:\Anti-LinkedIn\apps\web\src\components\ProfileTab.tsx
```

---

## Environment Variables Reference

| Variable | Used By | Description |
|---|---|---|
| `DB_PASSWORD` | docker-compose | PostgreSQL password |
| `REDIS_PASSWORD` | docker-compose, backend | Redis auth password |
| `JWT_SECRET` | backend | Min 32 chars random string |
| `JWT_EXPIRES_IN` | backend | Default `7d` |
| `NEXT_PUBLIC_API_URL` | frontend build | Full URL to API, e.g. `http://192.168.1.20/api` |
| `FRONTEND_URL` | backend CORS | `http://192.168.1.20` |
| `NODE_ENV` | both | `production` |
| `STORAGE_PATH` | backend, worker | Docker volume mount `/data` |
| `THROTTLE_TTL` | backend | Milliseconds window (60000) |
| `THROTTLE_LIMIT` | backend | Max requests per window (100) |

---

## XP & Level System

| Level | Name | Min XP |
|---|---|---|
| 1 | Rapuh | 0 |
| 2 | Tahan Banting | 50 |
| 3 | Kebal Revisi | 150 |
| 4 | Kebal PHP HRD | 300 |
| 5 | Suhu Spill | 500 |

XP events: post created +10 (poster), pukpuk received +2 (post owner), ngakak received +1, sama received +3.

## Anti-Flex Phrases (Backend validation, all lowercase contains-check)

`alhamdulillah diterima` · `gaji dua digit` · `promosi jabatan` · `bangga mengumumkan` · `humbled and honored` · `excited to announce` · `thrilled to share` · `bersyukur diterima` · `naik jabatan` · `diterima kerja`

---

*unlinked+ Tahap 2 — Social Core. Less Flex, More Human.*
