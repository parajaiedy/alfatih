// Server statis kecil untuk menguji PWA Al Fatih secara lokal.
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(process.argv[2] || process.cwd());
const PORT = Number(process.argv[3] || 8899);
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.mp3':'audio/mpeg', '.txt':'text/plain; charset=utf-8', '.css':'text/css' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.resolve(path.join(ROOT, p));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404, {'Content-Type':'text/plain'}); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream',
      'Service-Worker-Allowed':'/', 'Cache-Control':'no-store' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => console.log('serving ' + ROOT + ' on ' + PORT));
