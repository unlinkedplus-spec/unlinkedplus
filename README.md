# unlinked+ — MVP foundation

A Dockerized, local-first starter for the Indonesian social platform unlinked+.

## Stack
- Web: Next.js + TypeScript
- API: NestJS + TypeScript
- Database: PostgreSQL + Prisma
- Redis: Redis 7 (AOF enabled)
- File storage: Docker named volume (mounted at `/data` in API)

## Requirements
- Docker Desktop or Docker Engine + Docker Compose plugin
- Ports 3000 and 3001 available

## Run locally
1. Copy `.env.example` to `.env`.
2. Replace both passwords in `.env` with long random values.
3. From this folder run:

   ```bash
   docker compose up --build -d
   ```

4. Open the web app at http://localhost:3000
5. API health check: http://localhost:3001/api/health

The API container runs `prisma db push` on startup to create/update the initial local schema. For production, replace this with reviewed Prisma migrations and a controlled release process.

## Useful commands

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f web
docker compose down
```

To stop containers without deleting data:

```bash
docker compose down
```

To delete all local database/cache/file data (DESTRUCTIVE):

```bash
docker compose down -v
```

## Current MVP scope
- Responsive landing/feed shell and bottom navigation
- Anonymous-style username field (not full identity-protection/auth yet)
- Create and list spill posts
- Required category selection
- Anti-flex phrase validation in frontend and API
- Three reaction types
- PostgreSQL persistence
- Redis connectivity and health reporting

## Important limitations before public launch
- Authentication, account recovery, email verification and robust anonymity are not implemented yet.
- Redis is connected and health-checked; production rate limiting and BullMQ workers are next.
- Avatar builder, comments, certificates/PNG export, real payment gateway, store inventory, admin moderation and report/block flows are not implemented yet.
- QRIS is not connected. Never treat a client-side simulation as a real payment.
- Configure HTTPS, strict CORS, secrets, backups, upload validation, moderation, logging and monitoring before internet exposure.
