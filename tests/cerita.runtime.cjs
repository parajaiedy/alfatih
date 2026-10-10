/* Uji perilaku Cerita Pendek (dibaca bersama) lewat Chrome DevTools Protocol.
   Jalankan: node tests/cerita.runtime.cjs <baseUrl>   (default http://127.0.0.1:8899/index.html)
   Perlu Chrome headless: --remote-debugging-port=9241
   Hasil ditulis ke file agar tidak kena batas waktu alat. */
const fs = require('fs');
const path = require('path');

const CDP = process.argv[3] || '127.0.0.1:9241';   // port CDP (agar lokal & live tidak tertukar)
const BASE = process.argv[2] || 'http://127.0.0.1:8899/index.html';   // alamat yang diuji
const ORIGIN = new URL(BASE).origin;
const SHOTS = path.join(__dirname, '..', 'screenshot', 'uji');
const OUT = path.join(SHOTS, 'cerita_result.txt');
fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0; const log = [];
const ok = (n, c, x) => { if (c) { pass++; log.push('PASS ' + n); } else { fail++; log.push('FAIL ' + n + (x ? ' :: ' + x : '')); } };
const flush = () => fs.writeFileSync(OUT, log.join('\n') + '\n\n' + pass + ' lulus, ' + fail + ' gagal\n');
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
  const click = async sel => { const r = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'NOTFOUND'; e.click(); return 'ok';})()`); await sleep(450); return r; };

  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: "window.__errs=[];window.addEventListener('error',e=>window.__errs.push(String(e.message)));" });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(1200);
  await ev('localStorage.clear(); localStorage.setItem("af_name", JSON.stringify("Fatih Uji"))');
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(2600);

  // ---- bisa dibuka dari beranda ----
  ok('tombol Cerita ada di beranda', await ev('!!document.querySelector(".strip button[data-go=\\"daftarcerita\\"], .strip button")'));
  await ev('render("daftarcerita")'); await sleep(500);
  const nCerita = await ev('document.querySelectorAll(".cerita-daftar button").length');
  ok('daftar cerita tampil', nCerita >= 4, 'jumlah=' + nCerita);
  ok('daftar menampilkan judul', String(await ev('document.querySelector(".cerita-daftar .ct").textContent')).length > 3);

  // ---- buka cerita pertama ----
  await click('.cerita-daftar button');
  ok('halaman cerita terbuka', (await ev('!!document.getElementById("ceritaKartu")')));
  ok('suasana tenang aktif saat membaca cerita', await ev('document.body.classList.contains("tenang")'));
  const teks1 = String(await ev('document.querySelector(".cerita-teks").textContent'));
  ok('nama anak dipakai (bukan token {nama})', teks1.indexOf('{nama}') < 0 && teks1.indexOf('Fatih Uji') >= 0, teks1);
  ok('ada tombol Bacakan', await ev('!!document.getElementById("ceritaBaca")'));
  ok('tidak ada confetti saat cerita', (await ev('document.querySelectorAll(".conf").length')) === 0);

  // ---- maju sampai halaman pertanyaan ----
  let guard = 0;
  while (guard++ < 12) {
    const adaTanya = await ev('!!document.getElementById("ceritaOpsi")');
    if (adaTanya) break;
    const lanjut = await ev('!!document.getElementById("ceritaLanjut")');
    if (!lanjut) break;
    await click('#ceritaLanjut');
  }
  ok('sampai ke halaman pertanyaan', await ev('!!document.getElementById("ceritaOpsi")'));
  const jmlOpsi = await ev('document.querySelectorAll("#ceritaOpsi button").length');
  ok('usia 3 (tingkat 1) hanya 2 pilihan jawaban', jmlOpsi === 2, 'opsi=' + jmlOpsi);

  // ---- jawaban SALAH: tidak boleh maju, tidak boleh dihukum ----
  const iSebelum = await ev('CER.i');
  const benar = await ev('(()=>{const c=CERITA.find(x=>x.id===CER.id); return c.halaman[CER.i].benar;})()');
  await ev(`(()=>{const b=Array.from(document.querySelectorAll("#ceritaOpsi button")).find(x=>x.textContent!==${JSON.stringify(benar)}); if(b) b.click();})()`);
  await sleep(1400);
  ok('jawaban salah TIDAK memajukan halaman', (await ev('CER.i')) === iSebelum, 'i=' + await ev('CER.i'));
  ok('jawaban salah tetap memberi kesempatan (tombol masih ada)', await ev('!!document.getElementById("ceritaOpsi")'));
  ok('jawaban salah tidak memberi bintang', (await ev('Number(localStorage.getItem("af_stars")||0)')) === 0);
  const progSalah = await ev('JSON.stringify(JSON.parse(localStorage.getItem("af_progress")||"{}").cerita||null)');
  ok('percobaan salah tetap tercatat', progSalah && progSalah.indexOf('"attempts":1') >= 0, progSalah);

  // ---- jawaban BENAR: maju ----
  await ev(`(()=>{const b=Array.from(document.querySelectorAll("#ceritaOpsi button")).find(x=>x.textContent===${JSON.stringify(benar)}); if(b) b.click();})()`);
  await sleep(1700);
  ok('jawaban benar memajukan halaman', (await ev('CER.i')) > iSebelum, 'i=' + await ev('CER.i'));

  // ---- selesaikan cerita ----
  guard = 0;
  while (guard++ < 14) {
    if (await ev('!!document.getElementById("ceritaLagi")')) break;
    if (await ev('!!document.getElementById("ceritaLanjut")')) { await click('#ceritaLanjut'); continue; }
    if (await ev('!!document.getElementById("ceritaOpsi")')) {
      const b = await ev('(()=>{const c=CERITA.find(x=>x.id===CER.id); return c.halaman[CER.i].benar;})()');
      await ev(`(()=>{const x=Array.from(document.querySelectorAll("#ceritaOpsi button")).find(e=>e.textContent===${JSON.stringify(b)}); if(x) x.click();})()`);
      await sleep(1700); continue;
    }
    break;
  }
  ok('layar penutup cerita muncul', await ev('!!document.getElementById("ceritaLagi")'), await ev('document.getElementById("ttl").textContent'));
  const penutup = String(await ev('document.body.textContent'));
  ok('penutup mengucapkan selamat tidur dengan nama anak', /Selamat tidur, Fatih Uji/.test(penutup), penutup.slice(0, 120));
  ok('total bintang cerita = 1 (bukan per halaman)', (await ev('Number(localStorage.getItem("af_stars")||0)')) === 1, 'stars=' + await ev('localStorage.getItem("af_stars")'));
  ok('cerita tercatat di riwayat', (await ev('Object.keys(JSON.parse(localStorage.getItem("af_cerita")||"{}")).length')) === 1);
  ok('masih suasana tenang di penutup', await ev('document.body.classList.contains("tenang")'));
  ok('tidak ada confetti di penutup', (await ev('document.querySelectorAll(".conf").length')) === 0);

  // ---- keluar: suasana tenang dimatikan ----
  await ev('goHome()'); await sleep(700);
  ok('suasana tenang dimatikan setelah keluar', (await ev('document.body.classList.contains("tenang")')) === false);
  ok('tidak ada error tak tertangkap', (await ev('(window.__errs||[]).length')) === 0, JSON.stringify(await ev('window.__errs')));
  flush();

  // ---- tangkapan layar: daftar + halaman cerita + penutup ----
  await ev('render("daftarcerita")'); await sleep(600);
  let s = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, 'cerita-daftar-390x844.png'), Buffer.from(s.data, 'base64'));
  await ev('ceritaBuka("bintang"); CER.i = 1; render("cerita", false)'); await sleep(900);
  s = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, 'cerita-halaman-390x844.png'), Buffer.from(s.data, 'base64'));
  await ev('CER.i = 2; render("cerita", false)'); await sleep(700);
  s = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, 'cerita-tanya-390x844.png'), Buffer.from(s.data, 'base64'));
  await ev('CER.i = 99; render("cerita", false)'); await sleep(800);
  s = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, 'cerita-penutup-390x844.png'), Buffer.from(s.data, 'base64'));

  console.log('DONE');
  cdp.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { log.push('FATAL ' + e.message); flush(); console.error('FATAL ' + e.message); process.exit(2); });
