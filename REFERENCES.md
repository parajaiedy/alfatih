# REFERENCES — Rujukan desain & apa yang diadaptasi

Dokumen ini mencatat prinsip desain yang kami pelajari dari aplikasi belajar anak
yang sudah terbukti di dunia, lalu **bagaimana prinsip itu diwujudkan secara orisinal**
di "Kebun Belajar Al Fatih". Kami **tidak meniru** merek, logo, atau karya visual
siapa pun, dan **tidak mengklaim** keunggulan efektivitas pendidikan yang tidak kami uji.

## Sumber

1. **Duolingo ABC — "How we teach"** — https://abc.duolingo.com/how-we-teach
   Prinsip yang diambil: pelajaran **singkat (≤ 5 menit)**, materi dibangun bertahap
   (*scaffolding*), anak belajar dengan **tempo sendiri**, belajar sambil melakukan
   (*learning by doing*), aplikasi tanpa iklan dan bisa dipakai offline.

2. **Lingokids — "Playlearning"** — https://lingokids.com/playlearning
   Prinsip yang diambil: rentang usia 2–8 tahun, belajar lewat **bermain dan rasa ingin tahu**,
   kegiatan berulang yang menumbuhkan keterampilan hidup (bukan sekadar kuis).

3. **Khan Academy Kids** — https://www.khanacademy.org/kids
   Prinsip yang diambil: gratis, untuk usia ~2–8 tahun, **pembelajaran adaptif**,
   ada **karakter pemandu** yang ramah.

Catatan: halaman-halaman di atas milik pihak masing-masing; hak cipta dan merek mereka
tetap milik mereka. Rujukan ini hanya untuk prinsip, bukan untuk materi atau aset.

## Apa yang diadaptasi, dan di mana wujudnya

| Prinsip dari rujukan | Wujud nyata di aplikasi ini |
|---|---|
| Pelajaran singkat ≤ 5 menit | Tombol utama **"Ayo Belajar Sebentar"**: 4 langkah kecil (kenali huruf, kenali angka, berhitung, satu tebak-tebakan) yang bisa dihentikan kapan saja lewat "Cukup dulu". |
| Belajar bertahap (*scaffolding*) | **Tingkat materi**: tingkat 1 hanya huruf 5 / angka 5 / hijaiyah 5 (bawaan untuk anak 3 tahun); naik ke tingkat 2 dan 3 setelah anak nyaman. |
| Anak belajar dengan tempo sendiri | Tidak ada **timer tekanan** dan tidak ada skor yang menghukum. Salah → hanya ajakan "coba lagi", tanpa pengurangan bintang. |
| Belajar sambil melakukan | Kegiatan **Berhitung** (sentuh objek satu-satu), **Cocokkan Kartu**, **Menggambar/latihan menjiplak** dengan kanvas dan *pointer events*. |
| Bermain & rasa ingin tahu | **Bentuk & Warna**, kartu memori, dan maskot **Kuncup** (tunas kecil) sebagai pemandu ramah — digambar sendiri sebagai SVG. |
| Karakter pemandu ramah | Maskot orisinal "Kuncup" (SVG buatan sendiri), bukan tokoh milik pihak lain. |
| Adaptif & minim gangguan | Progres dicatat **per keterampilan** (huruf, angka, hijaiyah, berhitung, mencocokkan, menggambar, bentuk) di Pengaturan → Progres; beranda hanya menampilkan **sedikit pilihan** agar anak tidak kewalahan. |
| Tanpa iklan, bisa offline | Tidak ada iklan/pelacak; **service worker** + `manifest.json` agar bisa dipasang dan dibuka tanpa internet. |

## Yang **tidak** kami lakukan

- Tidak menyalin merek, logo, maskot, ilustrasi, atau tata letak khas aplikasi mana pun.
- Tidak mengklaim aplikasi ini "lebih baik" secara pendidikan daripada rujukan — kami hanya
  menerapkan prinsip yang diterbitkan publik, lalu mengujinya secara teknis (lihat `tests/`).
- Tidak memakai aset jarak jauh (font, CDN) sehingga aplikasi tetap utuh saat offline.

## Pelengkap: desain & keamanan

- **Desain**: prinsip *surface-first* (beranda = peta "Explore" dengan sedikit pilihan, bukan
  dasbor penuh menu) dan larangan "AI design slop" (tanpa gradien navy default, tanpa
  kaca-blur berlebihan). Palet orisinal: krem hangat + teal + koral + emas.
- **Keamanan & privasi**: semua masukan pengguna di-escape; data anak hanya di perangkat;
  tidak ada pengiriman keluar. Penjelasan ada di Pengaturan → Data & Keamanan, dan di README.
