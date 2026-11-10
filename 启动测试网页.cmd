@echo off
cd /d "%~dp0"
set "CONFIG=.env"
if not exist "%CONFIG%" set "CONFIG=%USERPROFILE%\WorkBuddy\2026-11-09-13-38-48\poi-agent-demo\.env"
if not exist "%CONFIG%" (echo Configure .env first. & pause & exit /b 1)
start "" /b node --env-file="%CONFIG%" web.mjs
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8789/"
echo Close this window to stop the local server.
pause >nul
