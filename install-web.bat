@echo off
cd /d D:\Anti-LinkedIn\apps\web
"C:\Program Files\nodejs\npm.cmd" install --no-audit --no-fund
echo EXIT_CODE=%ERRORLEVEL%
