@echo off
chcp 65001 >nul
title KHOI DONG HE THONG TPBD THUY HA + AI VOICE STUDIO
color 0a

echo =======================================================
echo    TRANG PHUC BIEU DIEN THUY HA + AI VOICE STUDIO
echo =======================================================
echo.

set PYTHON_EXE=C:\Users\Admin\AppData\Local\Programs\Python\Python310\python.exe

echo [1/3] Dang khoi dong AI Voice Microservice (Port 5055)...
start "TPBD_AI_Voice_Service" /min cmd /c "cd /d %~dp0backend_ai && "%PYTHON_EXE%" voice_service.py"

echo [2/3] Dang khoi dong TPBD Web Server (Port 5050)...
start "TPBD_Web_Server" /min cmd /c "cd /d %~dp0backend && node server.js"

echo [3/3] Cho he thong san sang trong 4 giay...
timeout /t 4 /nobreak >nul

echo.
echo =======================================================
echo    HE THONG DA KHOI DONG THANH CONG!
echo    - Trang chu:       http://localhost:5050
echo    - AI Voice Studio: http://localhost:5050/#voice-ai
echo =======================================================
echo.

start http://localhost:5050/#voice-ai

echo Cua so nay co the dong lai, he thong dang chay ngam trong Taskbar.
timeout /t 5
