@echo off
cd /d D:\Anti-LinkedIn\apps\web
"C:\Program Files\nodejs\npm.cmd" run build > D:\Anti-LinkedIn\build-web.log 2>&1
echo BUILD_EXIT=%ERRORLEVEL% >> D:\Anti-LinkedIn\build-web.log
