@echo off
cd /d D:\Anti-LinkedIn\apps\api
"C:\Program Files\nodejs\npm.cmd" run test > D:\Anti-LinkedIn\test-api.log 2>&1
echo TEST_EXIT=%ERRORLEVEL% >> D:\Anti-LinkedIn\test-api.log
