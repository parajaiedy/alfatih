/* Uji perilaku Al Fatih lewat Chrome DevTools Protocol (headless, port 9241).
   Jalankan: node af_cdp_test.cjs <baseUrl>
   Menulis hasil ke af_cdp_result.txt dan tangkapan layar ke folder screenshot uji. */
const fs = require('fs');
const path = require('path');
const CDP_HOST = '127.0.0.1:9241';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/index.html';
const OUT = path.join(__dirname, '..', 'screenshot', 'uji');
const SHOTS = path.join(__dirname, '..', 'screenshot', 'uji');
fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0;
const log = [];
function ok(name, cond, extra){
  if (cond) { pass++; log.push('PASS ' + name); }
  else { fail++; log.push('FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}

async function targets(){
  const r = await fetch('http://' + CDP_HOST + '/json/list');
  return r.json();
}

function connect(url){
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0; const pending = new Map();
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id);
        if (m.error) rej(new Error(JSON.stringify(m.error))); else res(m.result); }
    };
    ws.onerror = (e) => reject(new Error('ws error'));
    ws.onopen = () => resolve({
      send(method, params){
        return new Promise((res, rej) => { const mid = ++id; pending.set(mid, { res, rej });
          ws.send(JSON.stringify({ id: mid, method, params: params || {} })); });
      },
      close(){ try { ws.close(); } catch (e) {} }
    });
  });
}

async function evalJs(cdp, expr, awaitPromise){
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: !!awaitPromise });
  if (r.exceptionDetails) throw new Error('eval error: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
  return r.result.value;
}

async function waitFor(cdp, expr, ms){
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 8000)) {
    try { if (await evalJs(cdp, expr)) return true; } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

async function shot(cdp, name, w, h){
  await cdp.send('Emulation.setDeviceMetricsOverride', { width:w, height:h, deviceScaleFactor:1, mobile: w < 500 });
  // buang elemen efek sementara (toast, bintang terbang, konfeti) supaya tangkapan layar bersih
  try { await evalJs(cdp, '(() => { document.querySelectorAll(".fly,.conf").forEach(e=>e.remove()); const t=document.getElementById("toast"); if(t){ t.classList.remove("on"); t.textContent=""; } return true; })()'); } catch (e) {}
  await new Promise(r => setTimeout(r, 500));
  const s = await cdp.send('Page.captureScreenshot', { format:'png', captureBeyondViewport:true });
  fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(s.data, 'base64'));
}

(async () => {
  const list = await targets();
  let page = list.find(t => t.type === 'page' && t.url.indexOf('127.0.0.1:8899') >= 0);
  if (!page) { console.error('NO_PAGE_TARGET', JSON.stringify(list.map(t => t.url))); process.exit(2); }
  const cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable');

  // selalu mulai dari keadaan bersih
  await cdp.send('Page.navigate', { url: BASE });
  await new Promise(r => setTimeout(r, 800));
  await evalJs(cdp, '(() => { try { localStorage.clear(); } catch(e){} return true; })()');
  await cdp.send('Page.reload', { ignoreCache:false });
  await new Promise(r => setTimeout(r, 800));

  const ready = await waitFor(cdp, 'window.__APP_READY === true', 10000);
  ok('aplikasi siap dimuat (window.__APP_READY)', ready);
  ok('tidak ada error saat memuat', (await evalJs(cdp, '(window.__errs||[]).length')) === 0,
     JSON.stringify(await evalJs(cdp, 'window.__errs')));

  // beranda
  ok('beranda menampilkan sesi belajar singkat', await evalJs(cdp, '!!document.querySelector(".primary-session")'));
  ok('beranda menampilkan maskot SVG asli', await evalJs(cdp, '!!document.querySelector(".hello svg.mascot")'));
  const tiles = await evalJs(cdp, 'document.querySelectorAll(".tiles .tile").length');
  ok('beranda hanya 2 pilihan utama (tidak membanjiri anak)', tiles === 2, 'tiles=' + tiles);
  ok('palet bukan navy-default', await evalJs(cdp, 'getComputedStyle(document.body).backgroundColor !== "rgb(11, 37, 69)"'));

  // keterbatasan materi tingkat 1
  const lim = await evalJs(cdp, 'JSON.stringify([LIMITS().letters, LIMITS().numbers, LIMITS().hijaiyah])');
  ok('usia 3 (tingkat 1) hanya huruf 5 / angka 5 / hijaiyah 5', lim === '[5,5,5]', lim);

  // navigasi ke huruf: cek batas 5
  await evalJs(cdp, 'render("huruf")');
  const nL = await evalJs(cdp, 'document.querySelectorAll(".grid-letters .lbtn").length');
  ok('halaman huruf menampilkan 5 huruf di tingkat 1', nL === 5, 'n=' + nL);

  // sesi belajar
  await evalJs(cdp, 'goHome(); startSession()');
  const inSesi = await waitFor(cdp, 'document.querySelector("#ttl").textContent.indexOf("Sesi") >= 0', 6000);
  ok('sesi belajar dimulai', inSesi);
  await evalJs(cdp, '(() => { const b=[...document.querySelectorAll("#view .btn")].find(x=>/Mulai/.test(x.textContent)); if(b) b.click(); return true; })()');
  const step2 = await waitFor(cdp, 'document.querySelectorAll(".opts .opt").length >= 2', 6000);
  ok('sesi sampai ke soal pilihan', step2);

  // jawab benar untuk satu soal huruf dalam sesi
  const starsBefore = await evalJs(cdp, 'S.stars()');
  await evalJs(cdp, `(() => {
    const L = LETTERS; const step = SES.steps[SES.i];
    if (step.kind === 'letter') { const t = step.i; const b=[...document.querySelectorAll('.opts .opt')].find(x=>x.textContent===L[t][0]); if(b){b.click(); return 'clicked';} }
    return 'skip:'+step.kind;
  })()`);
  await new Promise(r => setTimeout(r, 400));
  const starsAfter = await evalJs(cdp, 'S.stars()');
  ok('jawaban benar menambah bintang', starsAfter > starsBefore, starsBefore + ' -> ' + starsAfter);
  const prog = await evalJs(cdp, 'JSON.stringify(S.prog())');
  ok('progres keterampilan tercatat', /"huruf":\{"attempts":[1-9]/.test(prog), prog);

  // berhitung sentuh
  await evalJs(cdp, 'render("hitung")');
  const tapN = await evalJs(cdp, 'document.querySelectorAll(".tap-obj").length');
  ok('kegiatan berhitung menampilkan objek untuk disentuh', tapN >= 3, 'n=' + tapN);
  await evalJs(cdp, '[...document.querySelectorAll(".tap-obj")].forEach(b=>b.click())');
  await new Promise(r => setTimeout(r, 500));
  const countTxt = await evalJs(cdp, '(document.querySelector("#countNow")||{}).textContent || ""');
  ok('hitungan selesai dengan angka benar (' + tapN + ')', countTxt.indexOf(tapN + ' / ' + tapN) >= 0, countTxt);

  // mencocokkan
  await evalJs(cdp, 'render("cocok")');
  const cards = await evalJs(cdp, 'document.querySelectorAll("#board .mcard").length');
  ok('papan mencocokkan punya 8 kartu (4 pasang)', cards === 8, 'n=' + cards);
  await evalJs(cdp, `(() => {
    const ks = {}; [...document.querySelectorAll('#board .mcard')].forEach(c => { (ks[c.dataset.k]=ks[c.dataset.k]||[]).push(c); });
    Object.values(ks).forEach(([a,b]) => { a.click(); b.click(); });
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 600));
  const matched = await evalJs(cdp, 'document.querySelectorAll("#board .mcard.matched").length');
  ok('semua pasangan cocok terbuka', matched === 8, 'matched=' + matched);

  // menggambar: canvas + event pointer
  await evalJs(cdp, 'render("gambar")');
  await new Promise(r => setTimeout(r, 400));
  const padOk = await evalJs(cdp, '(() => { const c=document.getElementById("pad"); return !!c && c.width>0 && c.height>0; })()');
  ok('kanvas menggambar siap (ukuran > 0)', padOk);
  const drew = await evalJs(cdp, `(() => {
    const c = document.getElementById('pad'); const r = c.getBoundingClientRect();
    const opt = { bubbles:true, cancelable:true, pointerId:1, pointerType:'mouse', isPrimary:true,
      clientX:r.left+20, clientY:r.top+20 };
    c.dispatchEvent(new PointerEvent('pointerdown', opt));
    c.dispatchEvent(new PointerEvent('pointermove', Object.assign({}, opt, {clientX:r.left+80, clientY:r.top+70})));
    c.dispatchEvent(new PointerEvent('pointerup', opt));
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0,0,c.width,c.height).data;
    let ink = 0; for (let i=3;i<d.length;i+=4) if (d[i] > 0) ink++;
    return ink;
  })()`);
  ok('coretan pointer benar-benar tergambar di kanvas', drew > 0, 'ink pixels=' + drew);
  const cleared = await evalJs(cdp, '(() => { document.getElementById("padClear").click(); const c=document.getElementById("pad"); const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data; let ink=0; for(let i=3;i<d.length;i+=4) if(d[i]>0) ink++; return ink; })()');
  ok('tombol Bersihkan menghapus coretan', cleared === 0, 'ink=' + cleared);

  // hadiah kosong tidak bisa ditukar
  await evalJs(cdp, `(() => { const save = LS.get('af_rewards', null); LS.set('af_rewards', []); const st = S.stars(); LS.set('af_stars', 999); LS.set('__test_rewards_backup', save); LS.set('__test_before', st); return true; })()`);
  await evalJs(cdp, 'render("bintang")');
  await evalJs(cdp, '(() => { const b=[...document.querySelectorAll("#view .btn")].find(x=>/Tukar/.test(x.textContent)); if(b) b.click(); return true; })()');
  await new Promise(r => setTimeout(r, 300));
  const starsKept = await evalJs(cdp, 'S.stars()');
  ok('hadiah kosong tidak mengurangi bintang (tidak bisa ditukar)', starsKept === 999, 'stars=' + starsKept);
  ok('ada notifikasi ketika daftar hadiah kosong', await evalJs(cdp, 'document.getElementById("toast").classList.contains("on")'));
  await evalJs(cdp, '(() => { LS.set("af_rewards", LS.get("__test_rewards_backup", null) || []); LS.set("af_stars", LS.get("__test_before", 0)); return true; })()');

  // peluk selalu tersedia (afeksi tidak bersyarat)
  await evalJs(cdp, 'render("bintang")');
  ok('tombol peluk selalu ada tanpa syarat bintang', await evalJs(cdp, 'Array.from(document.querySelectorAll("#view .btn")).some(b=>/peluk/i.test(b.textContent))'));

  // validasi tumbuh kembang
  await evalJs(cdp, 'parentPanel("tumbuh")');
  await new Promise(r => setTimeout(r, 300));
  const before = await evalJs(cdp, 'S.growth().length');
  await evalJs(cdp, `(() => { document.getElementById('gCm').value = '-5'; document.getElementById('gKg').value = ''; document.getElementById('gKata').value=''; document.getElementById('gNote').value=''; document.getElementById('gAdd').click(); return true; })()`);
  await new Promise(r => setTimeout(r, 200));
  const afterNeg = await evalJs(cdp, 'S.growth().length');
  ok('tinggi negatif ditolak', afterNeg === before, 'before=' + before + ' after=' + afterNeg);
  await evalJs(cdp, `(() => { document.getElementById('gCm').value='95'; document.getElementById('gKg').value='14'; document.getElementById('gKata').value='bismillah'; document.getElementById('gDate').value = todayKey(); document.getElementById('gAdd').click(); return true; })()`);
  await new Promise(r => setTimeout(r, 300));
  const added = await evalJs(cdp, 'S.growth().length');
  ok('catatan tumbuh kembang yang sah tersimpan', added === before + 1, 'n=' + added);
  await evalJs(cdp, 'parentPanel("tumbuh"); document.getElementById("gAdd") && null');
  // hindari dialog confirm: ganti bawaan
  await evalJs(cdp, 'window.confirm = () => true');

  // validasi cadangan
  const badBackup = await evalJs(cdp, 'validateBackup({ data: { af_stars: "bukan angka" } })');
  ok('cadangan tidak sah ditolak', !!badBackup, String(badBackup));
  const goodBackup = await evalJs(cdp, 'validateBackup(collectBackup())');
  ok('cadangan yang dibuat aplikasi lolos validasi', goodBackup === null, String(goodBackup));

  // bisukan suara
  const muteSaved = await evalJs(cdp, '(() => { const s=S.set(); s.mute = true; S.saveSet(s); return S.set().mute; })()');
  ok('preferensi bisukan tersimpan', muteSaved === true);
  await evalJs(cdp, '(() => { const s=S.set(); s.mute = false; S.saveSet(s); return true; })()');

  // kartu hijaiyah: catatan AI
  await evalJs(cdp, 'LS.set("af_hij_mode","arab"); render("hijaiyah")');
  ok('catatan bahwa suara Arab adalah AI (perlu diperiksa) muncul', await evalJs(cdp, '/suara buatan|diperiksa|tajwid/.test(document.body.innerText)'));

  // tangkapan layar
  await evalJs(cdp, 'closeModal(); closeOverlay(); goHome()');
  await new Promise(r => setTimeout(r, 300));
  await shot(cdp, 'home-390x844', 390, 844);
  await evalJs(cdp, 'startSession()');
  await new Promise(r => setTimeout(r, 900));
  await shot(cdp, 'sesi-390x844', 390, 844);
  await evalJs(cdp, 'render("gambar")');
  await new Promise(r => setTimeout(r, 600));
  await shot(cdp, 'gambar-390x844', 390, 844);
  await evalJs(cdp, 'render("hitung")');
  await new Promise(r => setTimeout(r, 500));
  await shot(cdp, 'hitung-390x844', 390, 844);
  await evalJs(cdp, 'goHome()');
  await shot(cdp, 'home-desktop', 1280, 900);
  await evalJs(cdp, 'parentPanel("umum")');
  await new Promise(r => setTimeout(r, 400));
  await shot(cdp, 'orangtua-desktop', 1280, 900);
  await evalJs(cdp, 'closeModal()');

  // muat ulang offline
  await cdp.send('Network.emulateNetworkConditions', { offline:true, latency:0, downloadThroughput:0, uploadThroughput:0 });
  await cdp.send('Page.reload', { ignoreCache:false });
  const offlineReady = await waitFor(cdp, 'window.__APP_READY === true', 12000);
  ok('muat ulang saat offline tetap berhasil (service worker)', offlineReady);
  if (offlineReady) {
    const offErrs = await evalJs(cdp, '(window.__errs||[]).length');
    ok('tidak ada error saat offline', offErrs === 0, JSON.stringify(await evalJs(cdp, 'window.__errs')));
    await shot(cdp, 'offline-390x844', 390, 844);
    await cdp.send('Network.emulateNetworkConditions', { offline:false, latency:0, downloadThroughput:-1, uploadThroughput:-1 });
  }

  fs.writeFileSync(path.join(OUT, 'af_cdp_result.txt'), log.join('\n') + '\n\n' + pass + ' lulus, ' + fail + ' gagal\n');
  console.log(log.join('\n'));
  console.log('\n' + pass + ' lulus, ' + fail + ' gagal');
  cdp.close();
  // tutup instance Chrome kita sendiri lewat CDP
  try { const v = await (await fetch('http://' + CDP_HOST + '/json/version')).json();
    const b = await connect(v.webSocketDebuggerUrl); await b.send('Browser.close'); } catch (e) {}
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS_ERROR', e && e.stack || e); process.exit(3); });
