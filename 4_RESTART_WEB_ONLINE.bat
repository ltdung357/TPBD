@echo off
title 4. RESTART WEB ONLINE (RENDER)
color 0A
echo ========================================================
echo   [4] KICH HOAT RESTART / DEPLOY LAI WEB ONLINE (RENDER)
echo ========================================================
echo.

cd /d "%~dp0"

node backend/scratch/trigger_render_restart.js

echo.
pause
