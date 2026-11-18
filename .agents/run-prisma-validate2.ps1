Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
Set-Location "D:\Anti-LinkedIn\apps\api"
$env:DATABASE_URL = "postgresql://test:test@localhost:5432/test"
$result = & npx prisma validate 2>&1
$result | Out-File "D:\Anti-LinkedIn\.agents\prisma-validate2-output.txt" -Encoding utf8
$LASTEXITCODE | Out-File "D:\Anti-LinkedIn\.agents\prisma-validate2-exitcode.txt" -Encoding utf8
