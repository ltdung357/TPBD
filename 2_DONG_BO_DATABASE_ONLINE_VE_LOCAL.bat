@echo off
title 2. DONG BO DATABASE ONLINE VE LOCALHOST
color 0B
echo ========================================================
echo   [2] DANG DONG BO DATABASE TU ONLINE (NEON) VE LOCALHOST
echo ========================================================
echo.

cd /d "C:\xampp\htdocs\TPBD"

echo [*] Dang keo tat ca du lieu DATABASE moi nhat tu Online ve may local...
node backend/scratch/sync_online_to_local.js

echo.
echo ========================================================
echo   [OK] DA DONG BO HOAN TAT DATABASE TU ONLINE VE LOCAL!
echo ========================================================
pause
