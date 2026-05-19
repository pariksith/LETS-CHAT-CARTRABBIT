@echo off
setlocal

cd /d "%~dp0"

echo Starting backend...
start "chat_app_backend" cmd /k "cd /d backend && start-backend.bat"

echo Starting frontend...
start "chat_app_frontend" cmd /k "cd /d frontend && npm run dev"

echo.
echo Frontend: http://localhost:5173
echo Backend API: http://127.0.0.1:8001/api
echo.
echo Use the frontend URL in your browser. Do not open the backend URL directly.

