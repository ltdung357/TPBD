@echo off
title 3. DAY CODE LOCAL LEN ONLINE (RENDER)
color 0E
echo ========================================================
echo   [3] DANG DAY CODE TULOCAL LEN ONLINE (GITHUB / RENDER)
echo ========================================================
echo.

cd /d "C:\xampp\htdocs\TPBD"

echo [*] Dang dong goi tat ca thay doi code local...
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Cap nhat code TPBD local len web online"

echo.
echo [*] Dang day code len GitHub (main)...
"C:\Program Files\Git\cmd\git.exe" push origin main

echo.
echo ========================================================
echo   [OK] DA DAY CODE LEN GITHUB THANH CONG!
echo   Render se tu dong cap nhat web online trong 1-2 phut tai:
echo   https://tpbd-thuyha.onrender.com
echo ========================================================
pause
