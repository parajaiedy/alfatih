# Al Fatih — Aplikasi Belajar & Rutinitas Anak

Aplikasi web (PWA) untuk Al Fatih: belajar huruf, angka, huruf hijaiyah, kuis
"belajar sendiri", rutinitas harian, papan bintang, hadiah, dan catatan tumbuh kembang.

**Alamat aplikasi:** https://parajaiedy.github.io/alfatih/

## Cara memasang di HP Android
1. Buka alamat di atas dengan **Chrome**.
2. Sentuh menu **titik tiga (⋮)** di kanan atas.
3. Pilih **"Tambahkan ke layar utama" / "Instal aplikasi"**.
4. Ikon ⭐ "Al Fatih" muncul di layar HP — bisa dibuka **tanpa internet**.

## Isi aplikasi
| Menu | Keterangan |
|---|---|
| Belajar Huruf | A–Z, contoh kata + gambar + suara |
| Belajar Angka | 1–20, dihitung dengan gambar, dibacakan |
| Huruf Hijaiyah | 28 huruf hijaiyah, ditampilkan besar + suara. Bisa dipilih: **nama huruf** (alif, ba, ta…) atau **Arab asli** |
| Belajar Sendiri | Kuis: aplikasi menyebut, anak memilih (dapat 1 bintang per jawaban benar) |
| Rutinitas Hari Ini | 12 kartu kegiatan; selesai = 1 bintang |
| Papan Bintang | Hitung bintang, target (bawaan 10), tombol tukar hadiah |
| Daftar Hadiah | Hadiah dipilih **acak** setiap tukar bintang |
| Pengaturan | Khusus Ayah/Ibu (dikunci soal hitung): nama, target, kegiatan, hadiah, tumbuh kembang |

## Suara (ElevenLabs)
Aplikasi memakai file MP3 yang sudah jadi (folder `audio/`), jadi tetap jalan tanpa internet.
Bila folder `audio/` masih kosong, aplikasi otomatis memakai suara bawaan perangkat.

**135 klip** (huruf A–Z, angka 1–20, 28 hijaiyah nama + 28 hijaiyah Arab asli, 12 kegiatan,
9 hadiah, 12 frasa pujian) — total hanya ~1.810 karakter, jadi biayanya sangat kecil.

Membuat file suara:
1. Klik dua kali `tools\ISI_KUNCI_dan_BUAT_SUARA.bat` (kunci ElevenLabs dimasukkan di situ, tidak lewat chat)
2. Berkas MP3 muncul di folder `audio\`
3. Minta Hermes mengunggah folder `audio/` ke GitHub (agar ikut terpasang di HP)

Pilihan lain: `python tools/generate_voice.py --list` untuk melihat daftar suara,
atau set `ELEVENLABS_VOICE_ID` untuk memilih suara tertentu.

## Berkas
- `index.html` — seluruh aplikasi (satu berkas)
- `manifest.json`, `sw.js`, `icon-*.png` — supaya bisa dipasang di HP & jalan offline
- `index_v1_backup.html` — versi pertama (cadangan)
- `tools/generate_voice.py` — pembuat suara ElevenLabs

## Catatan
Data anak (bintang, rutinitas, catatan tumbuh kembang) tersimpan **di perangkat** (localStorage),
tidak dikirim ke mana pun. Jangan hapus data browser bila tidak ingin catatan hilang.
