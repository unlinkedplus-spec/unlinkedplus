Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
Set-Location "D:\Anti-LinkedIn\apps\api"
$result = & npx prisma validate 2>&1
$result | Out-File "D:\Anti-LinkedIn\.agents\prisma-validate-output.txt" -Encoding utf8
$LASTEXITCODE | Out-File "D:\Anti-LinkedIn\.agents\prisma-validate-exitcode.txt" -Encoding utf8
