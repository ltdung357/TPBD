@echo off
title 1. CHAY / RESTART SERVER TPBD LOCALHOST
color 0A
echo ========================================================
echo   [1] DANG KHOI DONG SERVER TPBD THUY HA (PORT 5050)
echo ========================================================
echo.

cd /d "C:\xampp\htdocs\TPBD"

echo [*] Dang giai phong server cu neu co...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5050 ^| findstr LISTENING') do (
    echo [x] Da dung process PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 1 /nobreak >nul

echo [*] Dang bat Server Node.js...
start "" node backend/server.js

timeout /t 2 /nobreak >nul
echo [*] Dang mo trang web http://localhost:5050 ...
start http://localhost:5050

echo.
echo ========================================================
echo   [OK] SERVER DANG CHAY THANH CONG! (HTTP://LOCALHOST:5050)
echo ========================================================
