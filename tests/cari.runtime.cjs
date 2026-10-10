/* Uji perilaku Mode "Cari Benda di Rumah" lewat Chrome DevTools Protocol.
   Jalankan: node tests/cari.runtime.cjs <baseUrl>   (default http://127.0.0.1:8899/index.html)
   Perlu Chrome headless: --remote-debugging-port=9241
   Hasil: baris PASS/FAIL + ringkasan, keluar dengan kode 1 bila ada yang gagal. */
const fs = require('fs');
const path = require('path');

const CDP = '127.0.0.1:9241';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/index.html';
const ORIGIN = new URL(BASE).origin;
const SHOTS = path.join(__dirname, '..', 'screenshot', 'uji');
fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' :: ' + extra : '')); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function connect(url) {
  const ws = new WebSocket(url);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id);
      if (m.error) rej(new Error(JSON.stringify(m.error))); else res(m.result); } };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  return {
    send: (method, params) => new Promise((res, rej) => { const mid = ++id; pending.set(mid, { res, rej });
      ws.send(JSON.stringify({ id: mid, method, params: params || {} })); }),
    close: () => { try { ws.close(); } catch (e) {} }
  };
}

(async () => {
  const list = await (await fetch('http://' + CDP + '/json/list')).json();
  const page = list.find(t => t.type === 'page' && t.url.indexOf(ORIGIN) >= 0);
  if (!page) { console.error('NO_PAGE_TARGET', JSON.stringify(list.map(t => t.url))); process.exit(2); }
  const cdp = await connect(page.webSocketDebuggerUrl);
  const ev = async (expr, aw) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: !!aw });
    if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description));
    return r.result.value;
  };

  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(1200);
  await ev('localStorage.clear()');
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(2500);

  // ---- bisa dibuka dari menu Kegiatan Lain ----
  await ev('render("more")'); await sleep(500);
  const inMenu = await ev('Array.from(document.querySelectorAll("button")).some(b => b.textContent.indexOf("Cari Benda") >= 0)');
  ok('mode cari benda muncul di Kegiatan Lain', inMenu);
  await ev('Array.from(document.querySelectorAll("button")).find(b => b.textContent.indexOf("Cari Benda") >= 0).click()');
  await sleep(900);
  ok('halaman cari benda terbuka', (await ev('document.getElementById("ttl").textContent')).indexOf('Cari Benda') >= 0,
     await ev('document.getElementById("ttl").textContent'));

  // ---- tantangan tampil & sesuai setelan ----
  const jumlah = await ev('CARI.list.length');
  ok('jumlah tantangan mengikuti setelan orang tua (bawaan 3)', jumlah === 3, 'jumlah=' + jumlah);
  ok('kartu tantangan punya teks', String(await ev('document.getElementById("cariCard").textContent')).length > 10);
  ok('ada tombol "Sudah ketemu"', await ev('!!document.getElementById("cariKetemu")'));
  ok('ada jalan keluar "Ganti" (anak tidak pernah macet)', await ev('!!document.getElementById("cariGanti")'));
  ok('tantangan menyebut warna/bentuk/sifat', /MERAH|KUNING|HIJAU|BIRU|BULAT|PERSEGI|PANJANG|LEMBUT|KASAR|BESAR|KECIL|MINUM|TIDUR|MENULIS|benda/.test(String(await ev('document.getElementById("cariCard").textContent'))));

  // ---- "Ganti" berpindah tanpa bintang ----
  const t0 = await ev('document.getElementById("cariCard").textContent');
  await ev('document.getElementById("cariGanti").click()'); await sleep(700);
  const t1 = await ev('document.getElementById("cariCard").textContent');
  ok('tombol Ganti memindahkan ke tantangan lain', t0 !== t1);
  ok('Ganti tidak memberi bintang', (await ev('Number(localStorage.getItem("af_stars")||0)')) === 0);

  // ---- "Sudah ketemu" memberi bintang + progres ----
  const iBefore = await ev('CARI.i');
  await ev('document.getElementById("cariKetemu").click()'); await sleep(1800);
  ok('bintang bertambah setelah ketemu', (await ev('Number(localStorage.getItem("af_stars")||0)')) >= 1,
     'stars=' + await ev('localStorage.getItem("af_stars")'));
  const prog = await ev('JSON.stringify(JSON.parse(localStorage.getItem("af_progress")||"{}").cari||null)');
  ok('progres keterampilan "cari" tercatat', prog && prog.indexOf('attempts') >= 0, prog);
  ok('berpindah ke tantangan berikutnya', (await ev('CARI.i')) > iBefore, 'i=' + await ev('CARI.i'));

  // ---- selesaikan semua tantangan ----
  let guard = 0;
  while (guard++ < 8 && (await ev('CARI.i')) < (await ev('CARI.list.length'))) {
    const btn = await ev('!!document.getElementById("cariKetemu")');
    if (!btn) break;
    await ev('document.getElementById("cariKetemu").click()'); await sleep(1700);
  }
  ok('layar selesai muncul setelah semua tantangan', String(await ev('document.getElementById("ttl").textContent')).indexOf('Selesai') >= 0,
     await ev('document.getElementById("ttl").textContent'));
  ok('ringkasan menghitung yang ketemu', String(await ev('document.querySelector(".starcount") ? document.querySelector(".starcount").textContent : ""')).indexOf('/') >= 0);
  ok('ada tombol "Cari lagi"', await ev('Array.from(document.querySelectorAll("button")).some(b => /Cari lagi/.test(b.textContent))'));

  // ---- efek perayaan tidak boleh menumpuk selamanya (bug: clearTimers membatalkan pembersihan) ----
  await ev('render("cari")'); await sleep(400);
  await ev('confetti(); flyStar(null)'); await sleep(300);
  const fxSaat = await ev('document.querySelectorAll(".conf,.fly").length');
  ok('efek perayaan muncul saat dipicu', fxSaat > 0, 'fx=' + fxSaat);
  await ev('render("more")'); await sleep(300);
  const fxSetelah = await ev('document.querySelectorAll(".conf,.fly").length');
  ok('efek perayaan tersapu saat pindah halaman', fxSetelah === 0, 'sisa=' + fxSetelah);
  await ev('confetti()'); await sleep(3200);
  const fxLama = await ev('document.querySelectorAll(".conf,.fly").length');
  ok('efek perayaan hilang sendiri setelah selesai', fxLama === 0, 'sisa=' + fxLama);

  // ---- tidak ada error ----
  ok('tidak ada error tak tertangkap', (await ev('(window.__errs||[]).length')) === 0, JSON.stringify(await ev('window.__errs')));

  // ---- tangkapan layar ----
  await ev('render("more")'); await sleep(400);
  await ev('cariMulai()'); await sleep(900);
  const s = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync(path.join(SHOTS, 'cari-390x844.png'), Buffer.from(s.data, 'base64'));

  console.log('\n' + pass + ' lulus, ' + fail + ' gagal');
  cdp.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL ' + e.message); process.exit(2); });
