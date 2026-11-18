@echo off
cd /d D:\Anti-LinkedIn
docker compose up --build --wait --timeout 300 > D:\Anti-LinkedIn\docker-build.log 2>&1
echo DOCKER_EXIT=%ERRORLEVEL% >> D:\Anti-LinkedIn\docker-build.log
