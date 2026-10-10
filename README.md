# Kebun Belajar Al Fatih — Aplikasi Belajar & Bermain Anak

Aplikasi web (PWA) untuk Al Fatih (3 tahun): sesi belajar singkat, huruf, angka,
huruf hijaiyah, berhitung dengan sentuhan, mencocokkan kartu, menggambar/latihan,
rutinitas harian, papan bintang dan hadiah, serta catatan tumbuh kembang.

**Alamat aplikasi:** https://parajaiedy.github.io/alfatih/

## Cara memasang di HP Android
1. Buka alamat di atas dengan **Chrome**.
2. Sentuh menu **titik tiga (⋮)** di kanan atas.
3. Pilih **"Tambahkan ke layar utama" / "Instal aplikasi"**.
4. Ikon muncul di layar HP — bisa dibuka **tanpa internet**.

## Isi aplikasi
| Menu | Keterangan |
|---|---|
| 🌱 Ayo Belajar Sebentar | Sesi singkat (±5 menit): kenali huruf, kenali angka, berhitung, satu tebak-tebakan |
| Belajar Huruf | A–Z, contoh kata + gambar + suara (tingkat 1 mulai dari 5 huruf) |
| Belajar Angka | 1–20, dihitung dengan gambar, dibacakan |
| Kegiatan Lain → Huruf Hijaiyah | 28 huruf hijaiyah; pilihan **nama huruf** atau **bunyi Arab** (suara AI, perlu diperiksa) |
| Kegiatan Lain → Bentuk & Warna | 6 bentuk dasar dengan warna |
| Kegiatan Lain → Berhitung | Sentuh satu-satu gambar sambil menghitung |
| Kegiatan Lain → Cocokkan Kartu | Memori kecil 4 pasang |
| Kegiatan Lain → Menggambar & Latihan | Kanvas untuk mencoret/menjiplak huruf (latihan bermain, bukan penilaian tulisan) |
| Belajar Sendiri | Kuis: aplikasi menyebut, anak memilih (dapat 1 bintang per jawaban benar) |
| Cerita Pendek | 4 cerita dibaca bersama menjelang tidur: teks pendek, gambar besar, satu pertanyaan yang bisa disentuh (2 pilihan untuk usia 3), dan **layar otomatis jadi lebih redup/tenang**. Memakai nama anak di dalam cerita |
| Cari Benda di Rumah | Anak mencari benda **nyata** di rumah (warna, bentuk, sifat, fungsi). Layar hanya memberi tantangan — belajar sambil bergerak. Ada tombol "Ganti" agar anak tidak pernah macet |
| Rutinitas Hari Ini | 12 kartu kegiatan; selesai = 1 bintang |
| Papan Bintang | Hitung bintang, target (bawaan 10), tukar hadiah. Tombol peluk selalu tersedia tanpa bintang |
| Daftar Hadiah | Hadiah dipilih **acak** setiap tukar bintang |
| Pengaturan (Ayah/Ibu) | Dikunci soal hitung: nama, tingkat materi, target, kegiatan, hadiah, tumbuh kembang, suara, pengingat istirahat, cadangan data |

## Tingkat materi (anak 3 tahun)
- **Tingkat 1 (bawaan):** huruf 5, angka 5, hijaiyah 5 — pilihan paling sedikit.
- Tingkat 2: huruf 10, angka 10, hijaiyah 10.
- Tingkat 3: semua (huruf 26, angka 20, hijaiyah 28).

Naikkan tingkat di Pengaturan Ayah/Ibu setelah anak nyaman. Tidak ada tekanan waktu
dan tidak ada hukuman bila salah — hanya ajakan mencoba lagi.

## Suara
Aplikasi memakai file MP3 yang sudah jadi (folder `audio/`), jadi tetap jalan tanpa internet.
Bila `audio/` masih kosong, aplikasi otomatis memakai suara bawaan perangkat dan menjelaskannya
di beranda. Volume dan tombol **bisukan** ada di Pengaturan Ayah/Ibu.

**Status: 141 klip sudah dibuat** — huruf A–Z, angka 1–20, 28 hijaiyah (nama) + 28 hijaiyah
(Arab), 12 kegiatan, 9 hadiah, 18 frasa. Suara: **Jessica** (premade, hangat/ceria),
model `eleven_multilingual_v2`. Pemakaian ~2.044 karakter dari kuota.

Membuat ulang file suara:
1. Klik dua kali `tools\BUAT_SUARA.bat` — kunci diambil dari `tools\kunci.txt`, papan klip,
   atau diketik tersembunyi (tidak pernah lewat chat).
2. Skrip memeriksa kunci + sisa kuota dulu, baru membuat semua klip.
3. Minta Hermes mengunggah folder `audio/` ke GitHub.

### Batas paket ElevenLabs (penting)
Paket **Free tidak boleh memakai "library voice"** (suara komunitas) lewat API — ditolak
`402 payment_required`. Termasuk dua suara **Indonesia** (*Kanna*, *Maya*) yang berstatus
*professional*. Karena itu hanya kategori **premade** yang dipakai, dan suara premade
semuanya beraksen Inggris: pengucapan Bahasa Indonesia terdengar agak asing.
Ingin suara Indonesia asli? Perlu paket berbayar, lalu set `ELEVENLABS_VOICE_ID`
sebelum menjalankan pembuat suara. Lihat pilihan: `python tools/generate_voice.py --list`.

Catatan jujur: suara nama huruf/bunyi Arab dibuat oleh AI, bukan rekaman guru.
Mohon diperiksa Ayah/Ibu atau guru ngaji; aplikasi ini tidak mengklaim sudah sesuai tajwid.

## Berkas
- `index.html` — seluruh aplikasi
- `manifest.json`, `sw.js`, `icon-*.png` — agar bisa dipasang di HP & jalan offline
- `tests/` — uji statis & uji runtime (Chrome headless/CDP)
- `index_pre_redesign_backup.html` — versi sebelum tata ulang (cadangan aman)
- `index_v1_backup.html` — versi pertama (cadangan lama)
- `tools/generate_voice.py` — pembuat suara ElevenLabs (`--check` untuk memeriksa kunci & kuota, `--list` untuk melihat suara)
- `tests/static.test.cjs` — pemeriksaan statis
- `tests/cari.runtime.cjs` — uji perilaku mode Cari Benda (butuh Chrome headless port 9241)
- `tests/cerita.runtime.cjs` — uji perilaku Cerita Pendek (butuh Chrome headless port 9241)
- `REFERENCES.md` — sumber rujukan desain & apa yang diadaptasi

## Menjalankan uji
```sh
node tests/static.test.cjs          # 19 pemeriksaan statis
node tools/_serve_test.cjs . 8899   # server lokal untuk uji PWA
# lalu jalankan Chrome headless dengan --remote-debugging-port=9241
node af_cdp_test.cjs                # 30 pemeriksaan perilaku + tangkapan layar
```

## Catatan privasi
Data anak (bintang, rutinitas, catatan tumbuh kembang) tersimpan **di perangkat** (localStorage),
tidak dikirim ke mana pun. Tidak ada iklan dan tidak ada pelacak. Menghapus data browser
berarti menghapus catatan — pakai **Pengaturan → Data & Keamanan → Simpan cadangan**.
