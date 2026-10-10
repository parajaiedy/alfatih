# -*- coding: utf-8 -*-
"""
Pembuat suara Al Fatih memakai ElevenLabs.
- Membaca kunci API dari C:\\Users\\ASUS\\AppData\\Local\\hermes\\.env  (ELEVENLABS_API_KEY)
- Menyimpan hasil ke folder audio\\  (mp3)
- Menulis audio\\manifest.json

Jalankan:  python generate_voice.py            (buat yang belum ada)
           python generate_voice.py --force    (buat ulang semua)
           python generate_voice.py --list     (lihat daftar suara yang tersedia)
"""
import json, os, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)              # folder aplikasi (alfatih)
OUT  = os.path.join(ROOT, "audio")
ENV  = r"C:\Users\ASUS\AppData\Local\hermes\.env"
API  = "https://api.elevenlabs.io/v1"
MODEL = os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2")
# suara: bisa diganti lewat variabel ELEVENLABS_VOICE_ID
VOICE_PREF = ["Jessica", "Alice", "Matilda", "Bella", "Lily", "Sarah", "Charlotte"]

LETTERS = [("a","A untuk Apel"),("b","B untuk Bola"),("c","C untuk Cicak"),("d","D untuk Domba"),
 ("e","E untuk Ember"),("f","F untuk Foto"),("g","G untuk Gajah"),("h","H untuk Harimau"),
 ("i","I untuk Ikan"),("j","J untuk Jeruk"),("k","K untuk Kucing"),("l","L untuk Lampu"),
 ("m","M untuk Mata"),("n","N untuk Nanas"),("o","O untuk Obat"),("p","P untuk Pisang"),
 ("q","Q untuk Quran"),("r","R untuk Rumah"),("s","S untuk Sepatu"),("t","T untuk Topi"),
 ("u","U untuk Ular"),("v","V untuk Vas"),("w","W untuk Wortel"),("x","X untuk Xilofon"),
 ("y","Y untuk Yoyo"),("z","Z untuk Zebra")]
ANGKA = ["nol","satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan","sepuluh",
 "sebelas","dua belas","tiga belas","empat belas","lima belas","enam belas","tujuh belas",
 "delapan belas","sembilan belas","dua puluh"]
HIJAIYAH = ["Alif","Ba","Ta","Tsa","Jim","Ha","Kha","Dal","Dzal","Ra","Zai","Sin","Syin","Shad",
 "Dhad","Tha","Zha","Ain","Ghain","Fa","Qaf","Kaf","Lam","Mim","Nun","Wau","Ha","Ya"]
# nama huruf hijaiyah dalam tulisan Arab (untuk varian bunyi Arab; hasilnya suara AI, perlu diperiksa guru)
HIJAIYAH_AR = ["أَلِف","بَاء","تَاء","ثَاء","جِيم","حَاء","خَاء","دَال","ذَال","رَاء","زَاي","سِين",
 "شِين","صَاد","ضَاد","طَاء","ظَاء","عَين","غَين","فَاء","قَاف","كَاف","لَام","مِيم","نُون","وَاو",
 "هَاء","يَاء"]
RUTIN = ["Bangun pagi","Peluk Ayah dan Ibu","Sikat gigi","Mandi","Sarapan","Ngaji dan belajar",
 "Makan siang","Tidur siang","Main dan rapikan mainan","Makan malam","Sikat gigi malam","Tidur malam"]
HADIAH = ["Pelukan hangat","Ciuman sayang","Peluk dan gelitik","Jalan-jalan sore",
 "Baca buku bersama","Es krim kecil","Main di taman","Nonton kartun lima belas menit","Naik motor keliling"]
FRASA = {
 "sapa_pagi":  "Selamat pagi, sayang",
 "sapa_siang": "Selamat siang, sayang",
 "sapa_sore":  "Selamat sore, sayang",
 "sapa_malam": "Selamat malam, sayang",
 "alhamdulillah": "Alhamdulillah!",
 "semua_selesai": "Alhamdulillah! Semua kegiatan hari ini selesai!",
 "coba_lagi":  "Coba lagi ya, sayang",
 "benar":      "Benar! Pintar!",
 "kuis_intro": "Ayo main tebak-tebakan. Dengarkan baik-baik, lalu sentuh yang benar.",
 "kuis_selesai": "Selesai! Kamu pintar sekali!",
 "ayo_rutinitas": "Ayo, kegiatan hari ini!",
 "kumpulkan":  "Ayo kumpulkan bintang lagi!",
 "sesi_intro": "Ayo belajar sebentar. Kita mulai dari yang mudah.",
 "sesi_selesai": "Sesi selesai. Hebat sekali hari ini!",
 "cari_intro": "Ayo cari benda di rumah! Ayah atau Ibu menemani ya.",
 "cari_ketemu": "Ketemu! Hebat!",
 "cari_lagi": "Ayo cari satu lagi!",
 "cari_selesai": "Semua sudah ketemu. Hebat sekali!",
}

def baca_kunci():
    k = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if k:
        return k
    if os.path.exists(ENV):
        for baris in open(ENV, encoding="utf-8-sig", errors="replace"):
            baris = baris.strip()
            if baris.startswith("#") or "=" not in baris:
                continue
            n, v = baris.split("=", 1)
            if n.strip() == "ELEVENLABS_API_KEY" and v.strip():
                return v.strip()
    return ""

def minta(url, kunci, data=None, metode=None):
    req = urllib.request.Request(url, method=metode)
    req.add_header("xi-api-key", kunci)
    if data is not None:
        req.add_header("Content-Type", "application/json")
        req.data = json.dumps(data).encode("utf-8")
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()

def daftar_suara(kunci):
    return json.loads(minta(API + "/voices", kunci).decode("utf-8")).get("voices", [])

def pilih_suara(kunci):
    """Pilih suara yang BOLEH dipakai lewat API.

    Penting: paket Free TIDAK boleh memakai 'library voice' (suara komunitas)
    lewat API -> error 402. Jadi hanya kategori 'premade' yang dipakai.
    """
    vid = os.environ.get("ELEVENLABS_VOICE_ID", "").strip()
    if vid:
        return vid
    daftar = daftar_suara(kunci)
    premade = [v for v in daftar if str(v.get("category", "")).lower() == "premade"]
    if not premade:
        raise SystemExit("Tidak ada suara 'premade' di akun ini. Buat/pilih suara bawaan dulu di elevenlabs.io.")
    # utamakan nama yang cocok, lalu yang berbahasa Indonesia, lalu yang pertama
    for nama in VOICE_PREF:
        for v in premade:
            # nama dari API berbentuk "Jessica - Playful, Bright, Warm"
            if v.get("name", "").lower().startswith(nama.lower()):
                return v["voice_id"]
    for v in premade:
        lbl = v.get("labels") or {}
        if str(lbl.get("language", "")).lower() in ("id", "indonesian"):
            return v["voice_id"]
    return premade[0]["voice_id"]

def tulis_mp3(teks, path, kunci, voice_id):
    body = {"text": teks, "model_id": MODEL,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.0,
                               "use_speaker_boost": True}}
    url = API + "/text-to-speech/" + voice_id + "?output_format=mp3_44100_128"
    for percobaan in range(4):
        try:
            data = minta(url, kunci, body)
            with open(path, "wb") as f:
                f.write(data)
            return len(data)
        except urllib.error.HTTPError as e:
            pesan = e.read().decode("utf-8", "replace")[:300]
            if e.code == 429 or e.code >= 500:
                time.sleep(4 * (percobaan + 1)); continue
            raise SystemExit("Gagal (%s): %s" % (e.code, pesan))
        except Exception as e:
            time.sleep(3 * (percobaan + 1))
    raise SystemExit("Gagal menghubungi ElevenLabs setelah beberapa percobaan.")

def daftar_klip():
    out = []
    for kode, teks in LETTERS:
        out.append(("huruf_%s.mp3" % kode, "%s. %s." % (kode.upper(), teks)))
    for i in range(1, 21):
        out.append(("angka_%d.mp3" % i, ANGKA[i].capitalize() + "."))
    for i, nama in enumerate(HIJAIYAH, start=1):
        out.append(("hijaiyah_%02d.mp3" % i, nama + "."))
    for i, nama_ar in enumerate(HIJAIYAH_AR, start=1):
        out.append(("hijaiyah_ar_%02d.mp3" % i, nama_ar))
    for i, nama in enumerate(RUTIN, start=1):
        out.append(("rutin_r%d.mp3" % i, "Hebat! %s selesai." % nama))
    for i, nama in enumerate(HADIAH, start=1):
        out.append(("hadiah_%d.mp3" % i, "Hadiah untukmu! %s." % nama))
    for kunci, teks in FRASA.items():
        out.append(("frasa_%s.mp3" % kunci, teks))
    return out

def cek_kunci(kunci):
    """Pastikan kunci benar dan lihat sisa kuota sebelum membuat banyak klip."""
    try:
        langganan = json.loads(minta(API + "/user/subscription", kunci).decode("utf-8"))
        pakai = langganan.get("character_count")
        batas = langganan.get("character_limit")
        print("Kunci ElevenLabs OK.")
        if pakai is not None and batas:
            print("Kuota karakter: %s / %s terpakai (sisa %s)" % (pakai, batas, batas - pakai))
        tier = langganan.get("tier")
        if tier:
            print("Paket:", tier)
        return True
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print("KUNCI DITOLAK (401). Periksa kembali kunci ElevenLabs-nya.")
        elif e.code == 403:
            print("Kunci diterima tetapi tidak punya izin (403).")
        else:
            print("Gagal memeriksa kunci: HTTP %s" % e.code)
        return False
    except Exception as e:
        print("Tidak bisa menghubungi ElevenLabs:", e)
        return False


def main():
    kunci = baca_kunci()
    if not kunci:
        print("KUNCI BELUM ADA. Isi baris ELEVENLABS_API_KEY di:")
        print("   " + ENV)
        return 1
    if "--check" in sys.argv:
        return 0 if cek_kunci(kunci) else 1
    if "--list" in sys.argv:
        for v in daftar_suara(kunci):
            kat = str(v.get("category", "")).lower()
            tanda = "BOLEH" if kat == "premade" else "tidak boleh (paket Free)"
            print("%-26s %-12s %-8s %-28s %s" % (v.get("voice_id"), v.get("name"), kat, tanda, (v.get("labels") or {})))
        return 0
    os.makedirs(OUT, exist_ok=True)
    voice_id = pilih_suara(kunci)
    print("Suara dipakai:", voice_id, "| model:", MODEL)
    klip = daftar_klip()
    paksa = "--force" in sys.argv
    dibuat = 0
    for i, (nama, teks) in enumerate(klip, start=1):
        path = os.path.join(OUT, nama)
        if os.path.exists(path) and not paksa:
            continue
        n = tulis_mp3(teks, path, kunci, voice_id)
        dibuat += 1
        print("[%d/%d] %s (%d byte)" % (i, len(klip), nama, n))
    berkas = sorted(f for f in os.listdir(OUT) if f.endswith(".mp3"))
    with open(os.path.join(OUT, "version.txt"), "w", encoding="utf-8") as vf:
        vf.write(str(int(__import__("time").time())))
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"version": str(int(__import__("time").time())), "dibuat": time.strftime("%Y-%m-%d %H:%M"),
                   "jumlah": len(berkas),
                   "suara": voice_id, "model": MODEL, "files": berkas}, f, indent=1)
    print("Selesai. %d klip baru, total %d klip di folder audio." % (dibuat, len(berkas)))
    return 0

if __name__ == "__main__":
    sys.exit(main())
