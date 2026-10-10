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

console.log('\n' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
