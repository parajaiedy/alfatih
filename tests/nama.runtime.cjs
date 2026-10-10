/* Uji perilaku Papan Nama (orang dikenal) lewat Chrome DevTools Protocol.
   Jalankan: node tests/nama.runtime.cjs <baseUrl> <portCdp>
   Hasil ditulis ke file agar tidak kena batas waktu alat. */
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:8899/index.html';
const CDP = process.argv[3] || '127.0.0.1:9241';
const ORIGIN = new URL(BASE).origin;
const SHOTS = path.join(__dirname, '..', 'screenshot', 'uji');
const OUT = path.join(SHOTS, 'nama_result.txt');
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

  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: "window.__errs=[];window.addEventListener('error',e=>window.__errs.push(String(e.message)));" });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(1200);
  await ev('localStorage.clear()');
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(2600);

  // tunggu berkas suara terdeteksi
  let ready = false;
  for (let i = 0; i < 30; i++) { await sleep(600); if (await ev("typeof AUD!=='undefined' && AUD.ready===true")) { ready = true; break; } }
  ok('aplikasi memakai berkas suara', ready);

  // bisa dibuka dari beranda (tombol Nama di strip)
  await ev('render("nama")'); await sleep(600);
  const jml = await ev('document.querySelectorAll(".nama-grid button").length');
  ok('papan nama menampilkan 18 orang', jml === 18, 'jumlah=' + jml);
  const sec = await ev('Array.from(document.querySelectorAll(".nama-sec")).map(e=>e.textContent).join("|")');
  ok('dikelompokkan: Aku/Keluarga/Teman/Guru', /Aku/.test(sec) && /Keluarga/.test(sec) && /Teman/.test(sec) && /Guru/.test(sec), sec);

  // semua nama yang diminta ada
  const teks = await ev('document.querySelectorAll(".nama-grid .nt") ? Array.from(document.querySelectorAll(".nama-grid .nt")).map(e=>e.textContent).join("|") : ""');
  const wajib = ['Fatimah','Ibrahim','Zainab','Mikail','Al Fatih','Aina','Miss Iis','Mami','Dady','Mama Hamzy','Puang Mama','Puang PP','Ayag','Ibu','Puang Cali','Alsya','Onty Tety','Tante Raoda'];
  const hilang = wajib.filter(n => teks.indexOf(n) < 0);
  ok('semua nama yang diminta tampil', hilang.length === 0, 'hilang: ' + hilang.join(','));

  // sentuh satu nama -> kartu + suara benar-benar diputar
  await ev('(()=>{const b=Array.from(document.querySelectorAll(".nama-grid button")).find(x=>x.textContent.indexOf("Fatimah")>=0); b.click();})()');
  await sleep(1500);
  ok('kartu nama terbuka', (await ev('(document.querySelector("#overlay .word")||{}).textContent')) === 'Fatimah',
     await ev('(document.querySelector("#overlay .word")||{}).textContent'));
  const a1 = JSON.parse(await ev('JSON.stringify({t:AUD.el?Number(AUD.el.currentTime.toFixed(2)):null, src:AUD.el?AUD.el.src.split("/").pop():null, err:AUD.el&&AUD.el.error?AUD.el.error.code:null})'));
  ok('suara nama Fatimah diputar', a1.t > 0 && a1.err === null, JSON.stringify(a1));
  ok('berkas suara yang dipakai benar', a1.src === 'nama_fatimah.mp3', 'src=' + a1.src);
  ok('progres "nama" tercatat', (await ev('Number((JSON.parse(localStorage.getItem("af_progress")||"{}").nama||{}).attempts||0)')) >= 1);

  // nama dengan spasi & huruf besar (uji slug)
  await ev('closeOverlay(); render("nama", false)'); await sleep(500);
  await ev('(()=>{const b=Array.from(document.querySelectorAll(".nama-grid button")).find(x=>x.textContent.indexOf("Puang PP")>=0); b.click();})()');
  await sleep(1400);
  const a2 = JSON.parse(await ev('JSON.stringify({t:AUD.el?Number(AUD.el.currentTime.toFixed(2)):null, src:AUD.el?AUD.el.src.split("/").pop():null, err:AUD.el&&AUD.el.error?AUD.el.error.code:null})'));
  ok('nama berhuruf besar & berspasi berbunyi', a2.t > 0 && a2.err === null, JSON.stringify(a2));
  ok('slug benar untuk "Puang PP"', a2.src === 'nama_puang_pp.mp3', 'src=' + a2.src);

  await ev('closeOverlay(); render("nama", false)'); await sleep(400);
  ok('kembali ke papan nama setelah ditutup', (await ev('document.querySelectorAll(".nama-grid button").length')) === 18);

  // cerita baru memakai nama teman
  await ev('ceritaBuka("sekolah")'); await sleep(800);
  const t1 = String(await ev('document.querySelector(".cerita-teks").textContent'));
  ok('cerita baru "Di Sekolah" memakai nama anak', t1.indexOf('{nama}') < 0 && t1.length > 10, t1);
  await ev('CER.i = 1; render("cerita", false)'); await sleep(600);
  ok('cerita menyebut Miss Iis', String(await ev('document.querySelector(".cerita-teks").textContent')).indexOf('Miss Iis') >= 0);
  // halaman cerita berbunyi lewat tombol "Bacakan" (bukan otomatis) - itu perilaku yang diinginkan
  await ev('document.getElementById("ceritaBaca").click()');
  await sleep(1600);
  const a3 = JSON.parse(await ev('JSON.stringify({src:AUD.el?AUD.el.src.split("/").pop():null, t:AUD.el?Number(AUD.el.currentTime.toFixed(2)):null, err:AUD.el&&AUD.el.error?AUD.el.error.code:null})'));
  ok('suara halaman cerita baru tersedia (tombol Bacakan)', a3.src === 'cerita_sekolah_2.mp3' && a3.t > 0 && a3.err === null, JSON.stringify(a3));

  ok('tidak ada error tak tertangkap', (await ev('(window.__errs||[]).length')) === 0, JSON.stringify(await ev('window.__errs')));
  flush();

  // tangkapan layar
  await ev('goHome()'); await sleep(500);
  let s = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, 'nama-beranda-390x844.png'), Buffer.from(s.data, 'base64'));
  await ev('render("nama")'); await sleep(700);
  s = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync(path.join(SHOTS, 'nama-papan-390x844.png'), Buffer.from(s.data, 'base64'));
  await ev('(()=>{const b=Array.from(document.querySelectorAll(".nama-grid button")).find(x=>x.textContent.indexOf("Puang Mama")>=0); b.click();})()');
  await sleep(900);
  s = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, 'nama-kartu-390x844.png'), Buffer.from(s.data, 'base64'));

  console.log('DONE');
  cdp.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { log.push('FATAL ' + e.message); flush(); console.error('FATAL ' + e.message); process.exit(2); });
