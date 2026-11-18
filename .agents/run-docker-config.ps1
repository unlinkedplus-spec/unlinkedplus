Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
Set-Location "D:\Anti-LinkedIn"
$env:DB_PASSWORD = "testpassword"
$env:REDIS_PASSWORD = "testredis"
$env:NEXT_PUBLIC_API_URL = "http://192.168.1.20/api"
$result = & docker compose -f "D:\Anti-LinkedIn\docker-compose.yml" config 2>&1
$result | Out-File "D:\Anti-LinkedIn\.agents\docker-config-output.txt" -Encoding utf8
$LASTEXITCODE | Out-File "D:\Anti-LinkedIn\.agents\docker-config-exitcode.txt" -Encoding utf8
