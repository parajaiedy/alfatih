@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Membuat suara ElevenLabs untuk aplikasi Al Fatih ===
python generate_voice.py %*
echo.
pause
