@echo off
setlocal

cd /d "%~dp0"

set "HOST=127.0.0.1"
set "PORT=8001"

echo Clearing cache and config...
php artisan config:clear
php artisan cache:clear

echo.
echo Running migrations...
php artisan migrate --force

echo.
echo Starting Laravel backend at http://%HOST%:%PORT%/
echo Press Ctrl+C to stop the server.
echo.

php -S %HOST%:%PORT% -t public public\index.php
