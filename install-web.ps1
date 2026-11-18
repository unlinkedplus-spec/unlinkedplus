Set-Location "D:\Anti-LinkedIn\apps\web"
$node = "C:\Program Files\nodejs\node.exe"
$npm = "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"
& $node $npm install --no-audit --no-fund
Write-Host "EXIT:$LASTEXITCODE"
