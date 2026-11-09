#!/usr/bin/env node
/* KIMI-351 · auditoría en vivo del sitio publicado: build servida + byte-identidad de los
   archivos de la publicación 63c7d914 (02:07 UTC: IPH-1 «iPhone sin pixelado» 710dfbee en
   renderer.js + arreglos de Kimi 3). La precarga a pie KIMI-348 (5141d2ae) aún NO está publicada:
   el streaming.js servido debe ser byte-idéntico a 63c7d914 y NO contener «precargaPie».
   Compara byte a byte contra `git show <ref>:<ruta>` (no contra el worktree).
   Uso: node tools/build/kimi2_k351_sitio.js [--url https://www.amazonaverse.com/juego/] [--ref 63c7d914] */
'use strict';
const http = require('http'); const https = require('https');
const { execSync } = require('child_process');
const BASE = (process.argv.indexOf('--url') > 0 ? process.argv[process.argv.indexOf('--url') + 1] : 'https://www.amazonaverse.com/juego/').replace(/\/$/, '');
const REF = process.argv.indexOf('--ref') > 0 ? process.argv[process.argv.indexOf('--ref') + 1] : '63c7d914';
function get(u) { return new Promise((re, mal) => { const m = u.startsWith('https') ? https : http; const r = m.get(u, { headers: { 'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache' } }, res => { if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return get(new URL(res.headers.location, u).href).then(re, mal); const b = []; res.on('data', d => b.push(d)); res.on('end', () => re({ codigo: res.statusCode, cuerpo: Buffer.concat(b) })); }); r.on('error', mal); r.setTimeout(30000, () => { r.destroy(new Error('timeout ' + u)); }); }); }
const ARCHIVOS = [
  // IPH-1 (710dfbee): perfil iPhone propio en renderer.js
  ['src/engine/renderer.js', ['DPR_IPHONE', 'IPH-1', "perfil: 'iphone'", 'escuelaAuto: false'], []],
  // KIMI-348 NO publicado todavía: el servido debe ser el de 63c7d914, sin precargaPie
  ['src/engine/streaming.js', ['precargaVuelo'], ['precargaPie']],
  // spot-check del núcleo que ya venía de publicaciones anteriores (KTX2 925101b5, etc.)
  ['src/engine/assets.js', ['ktx2De', 'texKTX2'], []],
  ['sw.js', ['ave:build'], []],
];
(async () => {
  const out = { base: BASE, hora_utc: new Date().toISOString(), ref: REF, indice: {}, archivos: {}, ok: true };
  const idx = await get(BASE + '/index.html?v=' + Date.now()).catch(e => ({ codigo: 0, cuerpo: Buffer.alloc(0), error: String(e) }));
  const txt = idx.cuerpo.toString('utf8');
  out.indice = { codigo: idx.codigo, bytes: idx.cuerpo.length };
  const mb = txt.match(/ave:build[^>]*content="([^"]+)"/i);
  out.indice.build_meta = mb ? mb[1] : '(no encontrado)';
  for (const [ruta, marks, ausentes] of ARCHIVOS) {
    const r = await get(BASE + '/' + ruta + '?v=' + Date.now()).catch(e => ({ codigo: 0, cuerpo: Buffer.alloc(0), error: String(e) }));
    const cuerpo = r.cuerpo.toString('utf8');
    const faltan = marks.filter(m => !cuerpo.includes(m));
    const sobran = ausentes.filter(m => cuerpo.includes(m));
    let ref = null;
    try { const rb = execSync(`git show ${REF}:${ruta}`, { maxBuffer: 64 * 1024 * 1024 }); ref = { bytes: rb.length, identico: rb.equals(r.cuerpo) }; }
    catch (e) { ref = { error: String(e).slice(0, 120) }; }
    out.archivos[ruta] = { codigo: r.codigo, bytes: r.cuerpo.length, marcadores_ok: marks.length - faltan.length, marcadores_total: marks.length, faltan, presentes_no_deseados: sobran, ref };
    if (r.codigo !== 200 || faltan.length || sobran.length || !ref.identico) out.ok = false;
  }
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
