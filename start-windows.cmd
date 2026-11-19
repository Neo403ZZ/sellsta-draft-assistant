@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or later is required.
  pause
  exit /b 1
)
node build.mjs
if errorlevel 1 exit /b 1
if exist .env (
  node --env-file=.env server.mjs
) else (
  node server.mjs
)
pause
