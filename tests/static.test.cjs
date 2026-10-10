/* Pemeriksaan statis (static smoke tests) untuk index.html.
   Uji perilaku runtime ada di tests/runtime.test.cjs (Chrome headless via CDP). */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
function test(name, fn){
  try { fn(); console.log('PASS ' + name); pass++; }
  catch (e) { console.error('FAIL ' + name + '\n     ' + e.message); fail++; }
}
const must = (re, msg) => { if (!re.test(html)) throw new Error(msg); };
const mustNot = (re, msg) => { if (re.test(html)) throw new Error(msg); };

test('beranda menawarkan sesi belajar singkat', () => must(/startSession/, 'missing guided session control'));
test('sesi belajar berisi kegiatan berhitung sentuh', () => must(/kind:'count'|tap-obj/, 'missing counting activity'));
test('ada pengaturan bisukan suara & volume', () => {
  must(/mute\s*:\s*false/, 'no mute default in settings');
  must(/S\.set\(\)\.mute/, 'mute not consulted when playing audio');
  must(/type="range" id="pVol"/, 'no volume slider');
});
test('hadiah tidak bisa ditukar bila daftar kosong', () => must(/!rw\.length|rw\.length\s*[<>=]/, 'missing empty reward guard'));
test('hadiah tidak bisa dihapus sampai kosong', () => must(/arr\.length\s*<=\s*1/, 'missing last-reward guard'));
test('tumbuh kembang menolak nilai tidak masuk akal', () => {
  must(/cmN\s*<=\s*0|kgN\s*<=\s*0/, 'missing positive-measurement validation');
  must(/d > todayKey\(\)/, 'missing future-date guard');
  must(/confirm\(/, 'missing overwrite confirmation');
});
test('zoom pengguna tidak dikunci (aksesibilitas)', () => mustNot(/user-scalable=no/, 'user zoom disabled'));
test('menghormati prefers-reduced-motion', () => must(/prefers-reduced-motion/, 'no reduced-motion handling'));
test('semua input pengguna di-escape', () => must(/const esc = /, 'missing esc helper'));
test('tidak ada klaim menyesatkan "Arab asli"', () => mustNot(/Arab asli/, 'misleading "Arab asli" wording'));
test('audio manifest diprobe sebelum memutar MP3', () => must(/audio\/manifest\.json/, 'missing manifest probe'));
test('timer dibatalkan saat berpindah halaman', () => {
  must(/function clearTimers/, 'missing clearTimers');
  must(/clearTimers\(\);\s*stopAudio\(\)/, 'render() does not clear timers');
});
test('data lama af_* tetap kompatibel', () => {
  ['af_name','af_routines','af_rewards','af_target','af_stars','af_today','af_history','af_growth','af_hij_mode','af_lastReward','af_kuis_total','af_kuis_benar']
    .forEach(k => must(new RegExp("'"+k+"'"), 'missing legacy key ' + k));
});
test('cadangan JSON dapat diekspor & divalidasi saat pulih', () => {
  must(/collectBackup|doExport/, 'missing export');
  must(/validateBackup/, 'missing import validation');
});
test('nama berkas audio lama tetap dipakai', () => {
  ['huruf_','angka_','hijaiyah_','hijaiyah_ar_','rutin_','hadiah_','frasa_'].forEach(p => must(new RegExp("'"+p), 'missing audio prefix ' + p));
});
test('pengingat istirahat dapat diatur orang tua', () => must(/breakMin/, 'missing break reminder setting'));
test('kunci orang tua tetap ada', () => must(/function parentGate/, 'missing parent gate'));
test('rentang kuis angka memakai 1..batas (tidak ada bug 0-19)', () => {
  must(/K\.target \+ 1/, 'number quiz still off by one (0-based)');
});
test('tidak ada aset eksternal (tetap offline)', () => mustNot(/https?:\/\/(?!www\.w3\.org)/, 'external URL found'));

/* ---------- Mode Cari Benda di Rumah (TDD: uji dulu, fitur menyusul) ---------- */
test('mode cari benda ada', () => must(/VIEWS\.cari\s*=/, 'missing VIEWS.cari'));
test('cari benda dapat dibuka dari Kegiatan Lain', () => must(/'cari'/, 'not reachable from menu'));
test('cari benda punya tombol "sudah ketemu" dan jalan keluar "ganti"', () => {
  must(/Sudah ketemu/i, 'missing found button');
  must(/Ganti/i, 'missing skip/change control (child must never be stuck)');
});
test('cari benda mencatat progres keterampilan', () => must(/record\(\s*'cari'/, 'no skill progress recorded'));
test('cari benda tidak memakai kata menghukum', () => mustNot(/Salah!|Bodoh/i, 'punitive wording found'));
test('tantangan cari benda mencakup warna, bentuk dan sifat benda', () => {
  must(/CARI_BANK/, 'missing challenge bank');
  ['merah','bulat','lembut'].forEach(w => must(new RegExp(w, 'i'), 'missing category word: ' + w));
});
test('jumlah tantangan cari benda dapat diatur orang tua', () => must(/cariN|cariJumlah/, 'no parent setting for challenge count'));
test('cari benda memakai frasa suara sendiri', () => must(/cari_intro/, 'missing audio phrase name'));
test('cari benda tidak meminta izin kamera/mikrofon', () => {
  mustNot(/getUserMedia|MediaDevices/, 'camera/mic access requested (privacy)');
});

/* ---------- Cerita Pendek dibaca bersama (TDD: uji dulu, fitur menyusul) ---------- */
const bagianCerita = () => {
  const m = html.match(/CERITA PENDEK \(dibaca bersama[\s\S]*?(?=\/\* =+ [A-Z])/);
  if (!m) throw new Error('bagian cerita tidak ditemukan');
  return m[0];
};
test('cerita pendek ada', () => must(/VIEWS\.cerita\s*=/, 'missing VIEWS.cerita'));
test('cerita dapat dibuka dari beranda', () => must(/'daftarcerita'/, 'not reachable from home'));
test('ada beberapa cerita', () => {
  must(/const CERITA = \[/, 'missing CERITA bank');
  const m = html.match(/const CERITA = \[([\s\S]*?)\n\];/);
  if (!m) throw new Error('CERITA bank tidak terbaca');
  const n = (m[1].match(/\bid\s*:/g) || []).length;
  if (n < 4) throw new Error('cerita terlalu sedikit: ' + n);
});
test('cerita memakai nama anak (personalisasi)', () => must(/\{nama\}/, 'no personalization token'));
test('cerita punya pertanyaan yang bisa disentuh', () => must(/pilihan\s*:/, 'no tappable question'));
test('jumlah pilihan mengikuti tingkat (2 untuk usia 3)', () => must(/function ceritaPilihan/, 'missing choice limiter'));
test('ada suasana tenang menjelang tidur', () => {
  must(/function modeTenang/, 'missing modeTenang');
  must(/body\.tenang/, 'no calm-mode CSS');
});
test('cerita tidak memakai perayaan ramai (menjelang tidur)', () => {
  const b = bagianCerita();
  if (/confetti\(/.test(b)) throw new Error('cerita memakai confetti');
  if (/fanfare\(/.test(b)) throw new Error('cerita memakai fanfare nyaring');
});
test('cerita mencatat progres & riwayat', () => {
  must(/record\('cerita'/, 'no skill progress');
  must(/'af_cerita'/, 'no story history key');
});
test('suara cerita memakai nama berkas sendiri', () => must(/cerita_/, 'missing story audio prefix'));
test('cerita tidak memakai kata menghukum', () => {
  const b = bagianCerita();
  if (/Salah!|Bodoh/i.test(b)) throw new Error('punitive wording in stories');
});
test('progres cerita muncul di panel orang tua', () => must(/cerita:'Cerita'/, 'skill label missing'));

/* ---------- Papan Nama (orang dikenal) + cerita baru (TDD: uji dulu) ---------- */
test('papan nama ada', () => must(/VIEWS\.nama\s*=/, 'missing VIEWS.nama'));
test('papan nama bisa dibuka', () => must(/'nama'\]|'nama',/, 'not reachable'));
test('daftar nama berisi orang yang diminta', () => {
  const m = html.match(/const NAMA = \[([\s\S]*?)\n\];/);
  if (!m) throw new Error('NAMA list tidak ada');
  const wajib = ['Fatimah','Ibrahim','Zainab','Mikail','Al Fatih','Aina','Miss Iis','Mami','Dady',
    'Mama Hamzy','Puang Mama','Puang PP','Ayag','Ibu','Puang Cali','Alsya','Onty Tety','Tante Raoda'];
  wajib.forEach(n => { if (m[1].indexOf("'" + n + "'") < 0) throw new Error('nama hilang: ' + n); });
});
test('nama punya kategori (keluarga/teman/guru)', () => {
  must(/k:'keluarga'/, 'no keluarga category');
  must(/k:'teman'/, 'no teman category');
  must(/k:'guru'/, 'no guru category');
});
test('setiap nama dapat dibunyikan (berkas suara sendiri)', () => {
  must(/nama:\(s\) => 'nama_' \+ s \+ '\.mp3'/, 'missing name audio mapping');
  must(/function slugNama/, 'missing slug helper');
});
test('slug nama unik (tidak ada suara yang tertukar)', () => {
  const m = html.match(/const NAMA = \[([\s\S]*?)\n\];/);
  if (!m) throw new Error('NAMA list tidak ada');
  const names = (m[1].match(/t:'([^']+)'/g) || []).map(s => s.slice(3, -1));
  const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const seen = {};
  names.forEach(n => { const s = slug(n); if (seen[s]) throw new Error('slug bentrok: ' + s); seen[s] = 1; });
  if (Object.keys(seen).length < 18) throw new Error('nama kurang: ' + Object.keys(seen).length);
});
test('papan nama mencatat progres', () => must(/record\('nama'/, 'no skill progress for names'));
test('cerita bertambah (minimal 10)', () => {
  const m = html.match(/const CERITA = \[([\s\S]*?)\n\];/);
  if (!m) throw new Error('CERITA tidak ada');
  const n = (m[1].match(/\bid:'/g) || []).length;
  if (n < 10) throw new Error('cerita masih ' + n);
});
test('cerita baru memakai nama teman & keluarga', () => {
  const m = html.match(/const CERITA = \[([\s\S]*?)\n\];/);
  if (!m) throw new Error('CERITA tidak ada');
  const c = m[1];
  ['Fatimah','Ibrahim','Zainab','Mikail','Aina','Alsya','Miss Iis','Mami','Dady','Puang Mama','Puang PP','Ayag','Ibu','Puang Cali','Onty Tety','Tante Raoda','Mama Hamzy']
    .forEach(n => { if (c.indexOf(n) < 0) throw new Error('nama belum dipakai di cerita: ' + n); });
});
test('cerita tetap tanpa perayaan ramai', () => {
  const m = html.match(/const CERITA = \[([\s\S]*?)\n\];/);
  if (/confetti|fanfare/.test(m[1])) throw new Error('cerita memakai confetti/fanfare');
});
test('label progres nama muncul di panel orang tua', () => must(/nama:'Nama'/, 'skill label missing'));

console.log('\n' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
