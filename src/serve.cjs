/* Local preview server: node src/serve.cjs  ->  http://localhost:5180  (admin panel at /admin/) */
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const port = Number(process.env.PORT) || 5180;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.yml': 'text/yaml; charset=utf-8', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon'
};
http.createServer((req, res) => {
  if (req.url === '/api/contact' && req.method === 'POST') {
    let n = 0; req.on('data', c => { n += c.length; }); req.on('end', () => { console.log('contact form posted (dev stub, nothing sent), ' + n + ' bytes'); res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}'); });
    return;
  }
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
  let file = path.normalize(path.join(root, p));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (e, st) => {
    if (!e && st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    });
  });
}).listen(port, '127.0.0.1', () => console.log('http://localhost:' + port + '  (stop with Ctrl+C)'));
