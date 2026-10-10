@echo off
chcp 65001 >nul
title Al Fatih - Buat Suara ElevenLabs
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0buat_suara.ps1"
echo.
pause
