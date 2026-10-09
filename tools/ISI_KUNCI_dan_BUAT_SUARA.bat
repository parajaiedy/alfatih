@echo off
chcp 65001 >nul
title Isi Kunci ElevenLabs - Al Fatih
set "ENVFILE=%LOCALAPPDATA%\hermes\.env"

echo ============================================================
echo   MENYIMPAN KUNCI ELEVENLABS
echo ============================================================
echo.
echo  Kunci disimpan ke berkas:
echo    %ENVFILE%
echo.
echo  Kunci ini TIDAK dikirim ke mana pun, hanya dipakai di
echo  komputer ini untuk membuat file suara aplikasi Al Fatih.
echo.
set /p KEY=Tempel kunci ElevenLabs (biasanya mulai dengan sk_) lalu tekan Enter: 
if "%KEY%"=="" (
  echo.
  echo Kunci kosong - tidak ada yang diubah.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=$env:ENVFILE; $k=$env:KEY; $t=Get-Content -Raw -LiteralPath $p; if ($t -match '(?m)^#?\s*ELEVENLABS_API_KEY\s*=') { $t = $t -replace '(?m)^#?\s*ELEVENLABS_API_KEY\s*=.*$', ('ELEVENLABS_API_KEY = ' + $k) } else { $t = $t + \"`r`nELEVENLABS_API_KEY = \" + $k + \"`r`n\" }; Set-Content -LiteralPath $p -Value $t -Encoding UTF8; Write-Host 'Kunci sudah disimpan.' -ForegroundColor Green"

echo.
echo Sekarang menjalankan pembuat suara...
echo.
cd /d "%~dp0"
python generate_voice.py
echo.
pause
