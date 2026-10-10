# Buat suara ElevenLabs untuk aplikasi Al Fatih.
# Kunci API dimasukkan DI SINI (tidak pernah lewat chat), lalu disimpan ke berkas
# pengaturan Hermes di komputer ini saja.
$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.Encoding]::UTF8

$here     = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir   = Split-Path -Parent $here
$envFile  = Join-Path $env:LOCALAPPDATA "hermes\.env"
$audioDir = Join-Path $appDir "audio"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   BUAT SUARA AL FATIH (ElevenLabs)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Kunci disimpan ke berkas di komputer ini saja:"
Write-Host "   $envFile" -ForegroundColor DarkGray
Write-Host "Kunci TIDAK dikirim ke mana pun selain ElevenLabs." -ForegroundColor DarkGray
Write-Host ""

# ---- 1. minta kunci (masukan tersembunyi, aman untuk ditempel) ----
$secure = Read-Host "Tempel kunci ElevenLabs (biasanya mulai dengan sk_) lalu tekan Enter" -AsSecureString
$bstr   = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$key    = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

if ([string]::IsNullOrWhiteSpace($key)) {
  Write-Host ""
  Write-Host "Kunci kosong - tidak ada yang diubah." -ForegroundColor Yellow
  exit 1
}
$key = $key.Trim()

# ---- 2. simpan ke .env (sunting per baris, aman dari karakter khusus) ----
if (-not (Test-Path -LiteralPath $envFile)) {
  New-Item -ItemType File -Path $envFile -Force | Out-Null
}
$lines = @(Get-Content -LiteralPath $envFile)
$found = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match '^\s*#?\s*ELEVENLABS_API_KEY\s*=') {
    $lines[$i] = "ELEVENLABS_API_KEY=$key"
    $found = $true
  }
}
if (-not $found) { $lines += "ELEVENLABS_API_KEY=$key" }
[System.IO.File]::WriteAllLines($envFile, $lines, (New-Object System.Text.UTF8Encoding($false)))
$env:ELEVENLABS_API_KEY = $key
Write-Host "Kunci tersimpan." -ForegroundColor Green
Write-Host ""

# ---- 3. cari python ----
$py = $null
foreach ($c in @("python", "py", "python3")) {
  $cmd = Get-Command $c -ErrorAction SilentlyContinue
  if ($cmd) { $py = $cmd.Source; break }
}
if (-not $py) {
  Write-Host "Python tidak ditemukan. Pasang Python dulu, lalu jalankan berkas ini lagi." -ForegroundColor Red
  exit 1
}
Write-Host "Memakai Python: $py" -ForegroundColor DarkGray
Write-Host ""

# ---- 4. periksa kunci dulu (jangan langsung membuat 140+ klip) ----
Write-Host "Memeriksa kunci..." -ForegroundColor Cyan
& $py (Join-Path $here "generate_voice.py") --check
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Kunci belum bisa dipakai. Periksa lagi, lalu jalankan ulang berkas ini." -ForegroundColor Red
  exit 1
}

# ---- 5. buat semua klip suara ----
Write-Host ""
Write-Host "Membuat file suara (perlu beberapa menit, jangan tutup jendela ini)..." -ForegroundColor Cyan
Write-Host ""
& $py (Join-Path $here "generate_voice.py")
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Ada yang gagal. Buka chat Hermes dan kirimkan pesan di atas." -ForegroundColor Red
  exit 1
}

# ---- 6. ringkasan ----
$mp3 = @()
if (Test-Path -LiteralPath $audioDir) {
  $mp3 = @(Get-ChildItem -LiteralPath $audioDir -Filter *.mp3 -ErrorAction SilentlyContinue)
}
$total = 0
if ($mp3.Count -gt 0) { $total = ($mp3 | Measure-Object -Property Length -Sum).Sum }

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   SELESAI" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ("File suara: {0} berkas ({1:N1} MB)" -f $mp3.Count, ($total / 1MB))
Write-Host "Lokasi: $audioDir"
Write-Host ""
Write-Host "LANGKAH TERAKHIR:" -ForegroundColor Yellow
Write-Host "  Buka chat Hermes dan tulis:  suara sudah dibuat"
Write-Host "  Hermes akan mengunggahnya supaya ikut terpasang di HP." -ForegroundColor Yellow
Write-Host ""
