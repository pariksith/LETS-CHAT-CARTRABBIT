@echo off
setlocal

cd /d "%~dp0"

set "HOST=127.0.0.1"
set "PORT=8081"

echo Starting call signaling server at ws://%HOST%:%PORT%/
echo Press Ctrl+C to stop the server.
echo.

php realtime\call_signal_server.php %HOST% %PORT%
