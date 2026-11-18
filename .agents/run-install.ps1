Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
Set-Location "D:\Anti-LinkedIn\apps\api"
$result = & npm install 2>&1
$result | Out-File "D:\Anti-LinkedIn\.agents\npm-install-output.txt" -Encoding utf8
$LASTEXITCODE | Out-File "D:\Anti-LinkedIn\.agents\npm-install-exitcode.txt" -Encoding utf8
