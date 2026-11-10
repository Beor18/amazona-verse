// Amazona Verse · servidor estático para kelving1.sg-host.com (sitio Node.js de SiteGround, sin Apache).
//
// En un sitio Node de SiteGround, nginx entrega directo (y con 180 días de caché) todo archivo que esté en public_html, y
// manda lo demás a esta app. Por eso sitio/ se sube fuera de public_html (~/www/kelving1.sg-host.com/amazona, con
// tools/build/siteground/publicar.sh kelving1) y esta app lo sirve todo con las reglas de sitio/vercel.json:
//   · /carpeta → 301 a /carpeta/ ; /carpeta/ → carpeta/index.html (trailingSlash: true)
//   · assets/ y juego/assets/: 1 h de caché; lo demás se revalida siempre (el código del juego no lleva hash en el nombre)
//   · nosniff y Referrer-Policy en todo; ETag, 304, rangos (audio y vídeo) y gzip/brotli del texto.
// Sin dependencias: se sube a mano en Site Tools > Node.js > Upload manually (preset Custom, npm, start = node server.js).
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');

const RAIZ = path.resolve(process.env.AMAZONA_RAIZ || path.join(os.homedir(), 'www', 'kelving1.sg-host.com', 'amazona'));
const PUERTO = Number(process.env.PORT) || 3000;

const TIPOS = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8', txt: 'text/plain; charset=utf-8',
  xml: 'application/xml; charset=utf-8', svg: 'image/svg+xml', vtt: 'text/vtt; charset=utf-8', map: 'application/json; charset=utf-8',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', ico: 'image/x-icon',
  ktx2: 'image/ktx2', glb: 'model/gltf-binary', gltf: 'model/gltf+json', bin: 'application/octet-stream', wasm: 'application/wasm',
  woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav', mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf',
};
const TEXTO = new Set(['html', 'js', 'mjs', 'css', 'json', 'txt', 'xml', 'svg', 'vtt', 'map', 'wasm', 'ico']);

// Texto comprimido en memoria, por archivo+versión (los ~500 js/css/html del sitio caben de sobra)
const COMPRIMIDOS = new Map(); let BYTES = 0; const TOPE = 96 * 1024 * 1024;
function comprimido(ruta, st, enc) {
  const k = `${enc}:${ruta}:${st.size}:${st.mtimeMs}`;
  let b = COMPRIMIDOS.get(k);
  if (b) { COMPRIMIDOS.delete(k); COMPRIMIDOS.set(k, b); return b; }
  const crudo = fs.readFileSync(ruta);
  b = enc === 'br'
    ? zlib.brotliCompressSync(crudo, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 6, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: crudo.length } })
    : zlib.gzipSync(crudo, { level: 6 });
  COMPRIMIDOS.set(k, b); BYTES += b.length;
  for (const [kk, bb] of COMPRIMIDOS) { if (BYTES <= TOPE) break; COMPRIMIDOS.delete(kk); BYTES -= bb.length; }
  return b;
}

function base(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}
function texto(res, codigo, cuerpo, extra) {
  base(res);
  res.writeHead(codigo, Object.assign({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {}));
  res.end(res.req.method === 'HEAD' ? undefined : cuerpo);
}
function noEncontrado(res) {
  const p404 = path.join(RAIZ, '404.html');
  fs.readFile(p404, (err, buf) => {
    if (err) return texto(res, 404, '404 · no existe esta página\n');
    base(res);
    res.writeHead(404, { 'Content-Type': TIPOS.html, 'Cache-Control': 'no-store' });
    res.end(res.req.method === 'HEAD' ? undefined : buf);
  });
}

function servir(req, res, ruta, st, urlPath) {
  const ext = path.extname(ruta).slice(1).toLowerCase();
  const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
  base(res);
  res.setHeader('Content-Type', TIPOS[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', /^\/(juego\/)?assets\//.test(urlPath)
    ? 'public, max-age=3600, stale-while-revalidate=86400' : 'public, max-age=0, must-revalidate');
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', st.mtime.toUTCString());
  res.setHeader('Accept-Ranges', 'bytes');
  if (TEXTO.has(ext)) res.setHeader('Vary', 'Accept-Encoding');

  const inm = req.headers['if-none-match'];
  const ims = req.headers['if-modified-since'];
  if ((inm && inm.split(/\s*,\s*/).includes(etag)) || (!inm && ims && Date.parse(ims) >= Math.floor(st.mtimeMs / 1000) * 1000)) {
    res.writeHead(304); return res.end();
  }

  // Rango simple (bytes=a-b, a-, -n): audio y vídeo los piden así
  const rango = req.headers.range;
  if (rango && st.size > 0) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(rango.trim());
    let ini, fin;
    if (m && (m[1] || m[2])) {
      if (m[1]) { ini = +m[1]; fin = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1; }
      else { ini = Math.max(0, st.size - +m[2]); fin = st.size - 1; }
    }
    if (ini === undefined || ini > fin || ini >= st.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end();
    }
    res.writeHead(206, { 'Content-Range': `bytes ${ini}-${fin}/${st.size}`, 'Content-Length': fin - ini + 1 });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(ruta, { start: ini, end: fin }).on('error', () => res.destroy()).pipe(res);
  }

  const acepta = String(req.headers['accept-encoding'] || '');
  const enc = TEXTO.has(ext) && st.size > 1024 ? (/\bbr\b/.test(acepta) ? 'br' : /\bgzip\b/.test(acepta) ? 'gzip' : '') : '';
  if (enc) {
    let buf;
    try { buf = comprimido(ruta, st, enc); } catch (e) { return texto(res, 500, 'error leyendo el archivo\n'); }
    res.writeHead(200, { 'Content-Encoding': enc, 'Content-Length': buf.length });
    return res.end(req.method === 'HEAD' ? undefined : buf);
  }
  res.writeHead(200, { 'Content-Length': st.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(ruta).on('error', () => res.destroy()).pipe(res);
}

const servidor = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return texto(res, 405, 'método no permitido\n', { Allow: 'GET, HEAD' });
  const q = req.url.indexOf('?');
  const crudo = q < 0 ? req.url : req.url.slice(0, q);
  const consulta = q < 0 ? '' : req.url.slice(q);
  let urlPath;
  try { urlPath = decodeURIComponent(crudo); } catch (e) { return texto(res, 400, 'dirección mal formada\n'); }
  if (!urlPath.startsWith('/') || urlPath.includes('\0')) return texto(res, 400, 'dirección mal formada\n');
  // Nada de archivos ocultos ni de vercel.json (solo los lee Vercel)
  if (/\/\./.test(urlPath) || /\/vercel\.json$/.test(urlPath)) return noEncontrado(res);
  const ruta = path.join(RAIZ, path.normalize(urlPath));
  if (ruta !== RAIZ && !ruta.startsWith(RAIZ + path.sep)) return noEncontrado(res);

  fs.stat(ruta, (err, st) => {
    if (err) return noEncontrado(res);
    if (st.isDirectory()) {
      if (!urlPath.endsWith('/')) {
        return texto(res, 301, '', { Location: crudo + '/' + consulta, 'Cache-Control': 'public, max-age=3600' });
      }
      const indice = path.join(ruta, 'index.html');
      return fs.stat(indice, (e2, st2) => (e2 || !st2.isFile()) ? noEncontrado(res) : servir(req, res, indice, st2, urlPath + 'index.html'));
    }
    if (!st.isFile()) return noEncontrado(res);
    servir(req, res, ruta, st, urlPath);
  });
});
servidor.keepAliveTimeout = 65000;
servidor.listen(PUERTO, () => console.log(`amazona-sitio: sirve ${RAIZ} en el puerto ${PUERTO}`));
