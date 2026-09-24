@echo off
chcp 65001 >nul
title TPBD - Python AI Voice Service (VieNeu-TTS)
color 0b

echo =======================================================
echo    TPBD THUY HA - AI VOICE MICROSERVICE (PORT 5055)
echo    Model: VieNeu-TTS v3 Turbo 48kHz (NSUT Le Chuc)
echo =======================================================
echo.

set PYTHON_EXE=C:\Users\Admin\AppData\Local\Programs\Python\Python310\python.exe

if not exist "%PYTHON_EXE%" (
    echo [LOI] Khong tim thay Python 3.10 tai: %PYTHON_EXE%
    pause
    exit /b 1
)

cd /d "%~dp0"
echo [1/2] Dang khoi dong AI Voice Microservice tren Port 5055...
echo [2/2] Nhan Ctrl + C de tat service neu can.
echo.

"%PYTHON_EXE%" voice_service.py

pause
