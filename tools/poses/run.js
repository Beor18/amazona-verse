// node run.js jobs.json outdir
const { chromium } = require('playwright'); const fs = require('fs'), http = require('http'), path = require('path');
const ROOT = '/home/user/amazona-verse', MINE = path.join(__dirname, 'srv');
const mime = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = decodeURIComponent(q.url.split('?')[0]); const f = p === '/poses.html' ? path.join(MINE, 'poses.html') : path.join(ROOT, p);
  fs.readFile(f, (e, d) => { if (e) { if (!/favicon/.test(p)) console.log('404', p); r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(0);
(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2])), out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--headless=new'] });
  const pg = await b.newPage(); let err = 0;
  pg.on('console', m => { if (m.type() === 'error') { err++; console.log('CONSOLE', m.text()); } }); pg.on('pageerror', e => { err++; console.log('PAGEERR', e.message); });
  await pg.goto(`http://127.0.0.1:${srv.address().port}/poses.html`); await pg.waitForFunction('window.READY', null, { timeout: 120000 });
  for (const j of jobs) { if (only && !only.includes(j.id)) continue;
    const res = await pg.evaluate(o => window.pose(o), j);
    res.forEach((f, i) => { fs.writeFileSync(path.join(out, `${j.id}_${i}.png`), Buffer.from(f.url.split(',')[1], 'base64')); });
    console.log('ok', j.id, res.map(f => f.t + ':' + f.mode).join(' '));
  }
  console.log('errores', err); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
