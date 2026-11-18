Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
Set-Location "D:\Anti-LinkedIn"

# Stage all new/modified files for FEAT-001 (exclude .agents temp scripts and output files)
git add .env.example
git add docker-compose.yml
git add docker/nginx/default.conf
git add apps/api/package.json
git add apps/api/tsconfig.json
git add apps/api/Dockerfile
git add apps/api/nest-cli.json
git add apps/api/prisma/schema.prisma
git add apps/api/src/prisma/prisma.module.ts
git add apps/api/src/prisma/prisma.service.ts
git add apps/api/src/app.module.ts
git add apps/api/src/main.ts
git add apps/api/src/app.controller.ts
git add apps/api/src/prisma.service.ts
git add apps/api/src/worker/worker.module.ts
git add apps/api/src/worker/worker.ts
git add apps/api/src/common/decorators/public.decorator.ts
git add apps/api/src/common/decorators/current-user.decorator.ts
git add apps/api/src/common/guards/jwt-auth.guard.ts
git add apps/api/src/common/filters/http-exception.filter.ts
git add .agents/tasks/features/FEAT-001.json
git add TECHNICAL-BLUEPRINT.md
git add .gitignore

$status = & git status --short 2>&1
$status | Out-File "D:\Anti-LinkedIn\.agents\git-status-after-add.txt" -Encoding utf8

$commitResult = & git commit -m "feat(infra): FEAT-001 infrastructure, Prisma schema, Docker Compose" 2>&1
$commitResult | Out-File "D:\Anti-LinkedIn\.agents\git-commit-output.txt" -Encoding utf8
$LASTEXITCODE | Out-File "D:\Anti-LinkedIn\.agents\git-commit-exitcode.txt" -Encoding utf8
