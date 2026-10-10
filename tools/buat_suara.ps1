# Buat suara ElevenLabs untuk aplikasi Al Fatih.
# Kunci API TIDAK lewat chat: diambil dari tools\kunci.txt, atau papan klip, atau diketik tersembunyi.
$ErrorActionPreference = "Continue"
$OutputEncoding = [System.Text.Encoding]::UTF8

$here     = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir   = Split-Path -Parent $here
$envFile  = if ($env:ALFATIH_ENVFILE) { $env:ALFATIH_ENVFILE } else { Join-Path $env:LOCALAPPDATA "hermes\.env" }
$audioDir = Join-Path $appDir "audio"
$keyFile  = Join-Path $here "kunci.txt"
$logFile  = Join-Path $here "riwayat_suara.txt"

# catat semua keluaran supaya bisa diperiksa bila ada masalah
try { Start-Transcript -LiteralPath $logFile -Force | Out-Null } catch {}

function Garis { Write-Host "============================================================" }

Garis
Write-Host "   BUAT SUARA AL FATIH (ElevenLabs)" -ForegroundColor Cyan
Garis
Write-Host ""

# ---------- 1. cari Python (tahan-banting: cari di lokasi yang pasti dulu) ----------
$kandidat = @()
$kandidat += (Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA "hermes\tools") -Filter "python.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
$kandidat += @(
  (Join-Path $env:USERPROFILE "bin\python3.exe"),
  "C:\laragon\bin\python\python-3.13\python.exe",
  "C:\laragon\bin\python\python-3.12\python.exe"
)
$kandidat += (Get-ChildItem -Path "C:\Users\$env:USERNAME\AppData\Local\Programs\Python" -Filter "python.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)

$py = $null
foreach ($k in $kandidat) { if ($k -and (Test-Path -LiteralPath $k)) { $py = $k; break } }
if (-not $py) {
  foreach ($n in @("python","python3","py")) {
    $c = Get-Command $n -ErrorAction SilentlyContinue
    if ($c) { $py = $c.Source; break }
  }
}
if (-not $py) {
  Write-Host "Python tidak ditemukan di komputer ini." -ForegroundColor Red
  Write-Host "Kirimkan pesan ini ke Hermes: PYTHON_TIDAK_ADA" -ForegroundColor Yellow
  try { Stop-Transcript | Out-Null } catch {}
  exit 1
}
Write-Host "Python  : $py" -ForegroundColor DarkGray

# ---------- 2. ambil kunci ----------
$key = ""
$sumber = ""

# (a) berkas kunci.txt - cara paling pasti
if (Test-Path -LiteralPath $keyFile) {
  $isi = (Get-Content -LiteralPath $keyFile -Raw -ErrorAction SilentlyContinue)
  if ($isi) { $isi = $isi.Trim() }
  if ($isi -match '^sk_[A-Za-z0-9_\-]{20,}$') { $key = $isi; $sumber = "kunci.txt" }
  else { Write-Host "Berkas kunci.txt ada, tetapi isinya bukan kunci ElevenLabs yang sah." -ForegroundColor Yellow }
}

# (b) papan klip
if (-not $key) {
  try {
    $clip = (Get-Clipboard -Raw -ErrorAction SilentlyContinue)
    if ($clip) { $clip = $clip.Trim() }
    if ($clip -match '^sk_[A-Za-z0-9_\-]{20,}$') {
      $tampil = $clip.Substring(0,6) + "..." + $clip.Substring($clip.Length-4)
      Write-Host "Kunci ditemukan di papan klip: $tampil" -ForegroundColor Green
      $jawab = Read-Host "Pakai kunci ini? (Enter = ya, t = tidak)"
      if ($jawab -notmatch '^[tT]') { $key = $clip; $sumber = "papan klip" }
    }
  } catch {}
}

# (c) ketik tersembunyi
if (-not $key) {
  Write-Host ""
  Write-Host "Tempel kunci di sini (klik kanan = tempel), lalu Enter." -ForegroundColor Cyan
  Write-Host "Kunci tidak akan tampil di layar - itu memang disengaja." -ForegroundColor DarkGray
  $secure = Read-Host "Kunci ElevenLabs" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $key  = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  if ($key) { $key = $key.Trim() }
  if ($key) { $sumber = "diketik" }
}

if ([string]::IsNullOrWhiteSpace($key)) {
  Write-Host ""
  Write-Host "Kunci kosong - tidak ada yang diubah." -ForegroundColor Yellow
  Write-Host "Kirimkan pesan ini ke Hermes: KUNCI_KOSONG" -ForegroundColor Yellow
  try { Stop-Transcript | Out-Null } catch {}
  exit 1
}
if ($key.Length -lt 20 -or $key -notmatch '^sk_') {
  Write-Host "Bentuk kunci tidak seperti kunci ElevenLabs (harus mulai sk_)." -ForegroundColor Yellow
  Write-Host "Kirimkan pesan ini ke Hermes: KUNCI_BENTUK_SALAH" -ForegroundColor Yellow
  try { Stop-Transcript | Out-Null } catch {}
  exit 1
}
Write-Host "Sumber  : $sumber" -ForegroundColor DarkGray

# ---------- 3. simpan ke .env (sunting per baris; aman dari karakter khusus) ----------
if (-not (Test-Path -LiteralPath $envFile)) { New-Item -ItemType File -Path $envFile -Force | Out-Null }
$lines = @(Get-Content -LiteralPath $envFile)
$found = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match '^\s*#?\s*ELEVENLABS_API_KEY\s*=') { $lines[$i] = "ELEVENLABS_API_KEY=$key"; $found = $true }
}
if (-not $found) { $lines += "ELEVENLABS_API_KEY=$key" }
[System.IO.File]::WriteAllLines($envFile, $lines, (New-Object System.Text.UTF8Encoding($false)))
$env:ELEVENLABS_API_KEY = $key
Write-Host "Kunci tersimpan di:" -ForegroundColor Green
Write-Host "   $envFile" -ForegroundColor DarkGray

# berkas kunci.txt tidak diperlukan lagi
if (Test-Path -LiteralPath $keyFile) {
  Remove-Item -LiteralPath $keyFile -Force -ErrorAction SilentlyContinue
  Write-Host "Berkas kunci.txt sudah dihapus (isinya sudah tersimpan)." -ForegroundColor DarkGray
}
Write-Host ""

# ---------- 4. periksa kunci & kuota sebelum membuat 141 klip ----------
Write-Host "Memeriksa kunci..." -ForegroundColor Cyan
& $py (Join-Path $here "generate_voice.py") --check
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Kunci belum bisa dipakai." -ForegroundColor Red
  Write-Host "Kirimkan pesan ini ke Hermes: KUNCI_DITOLAK" -ForegroundColor Yellow
  try { Stop-Transcript | Out-Null } catch {}
  exit 1
}

# ---------- 5. buat semua klip ----------
Write-Host ""
Write-Host "Membuat file suara (beberapa menit - jangan tutup jendela ini)..." -ForegroundColor Cyan
Write-Host ""
& $py (Join-Path $here "generate_voice.py")
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Ada yang gagal saat membuat suara." -ForegroundColor Red
  Write-Host "Kirimkan pesan ini ke Hermes: GAGAL_MEMBUAT" -ForegroundColor Yellow
  try { Stop-Transcript | Out-Null } catch {}
  exit 1
}

# ---------- 6. ringkasan ----------
$mp3 = @(Get-ChildItem -LiteralPath $audioDir -Filter *.mp3 -ErrorAction SilentlyContinue)
$total = 0
if ($mp3.Count -gt 0) { $total = ($mp3 | Measure-Object -Property Length -Sum).Sum }

Write-Host ""
Garis
Write-Host "   SELESAI" -ForegroundColor Green
Garis
Write-Host ("File suara : {0} berkas ({1:N1} MB)" -f $mp3.Count, ($total / 1MB))
Write-Host "Lokasi     : $audioDir"
Write-Host ""
Write-Host "Sekarang tulis di chat Hermes:  suara sudah dibuat" -ForegroundColor Yellow
Write-Host ""
try { Stop-Transcript | Out-Null } catch {}
