#!/usr/bin/env node
/* KIMI-353 · auditoría en vivo del sitio publicado: build 63c7d914 (anunciada por la coordinadora
   9-nov 02:07 UTC) = IPH-1 (710dfbee: DPR_IPHONE + perfil iphone) + prefetch a pie (5141d2ae,
   KIMI-348) + atlas escuela no-4096 (808937dc, KIMI-346) + QA-220 c6786974 (calentado sRGB lienzo)
   + arrastre KTX2 (925101b5). Comprueba la meta ave:build del index servido y el byte-identidad de
   los archivos tocados contra `git show 63c7d914:<ruta>` (no contra el worktree).
   Copia del método de kimi2_k347_sitio.js (KIMI-347, carril Kimi 2, intacto).
   Evidencia: docs/img/kimi353/k353_http_audit.json
   Uso: node tools/build/kimi3_353_sitio.js [--url https://www.amazonaverse.com/juego/] [--ref 63c7d914] */
'use strict';
const http = require('http'); const https = require('https');
const { execSync } = require('child_process');
const BASE = (process.argv.indexOf('--url') > 0 ? process.argv[process.argv.indexOf('--url') + 1] : 'https://www.amazonaverse.com/juego/').replace(/\/$/, '');
const REF = process.argv.indexOf('--ref') > 0 ? process.argv[process.argv.indexOf('--ref') + 1] : '63c7d914';
function get(u) { return new Promise((re, mal) => { const m = u.startsWith('https') ? https : http; const r = m.get(u, { headers: { 'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache' } }, res => { if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return get(new URL(res.headers.location, u).href).then(re, mal); const b = []; res.on('data', d => b.push(d)); res.on('end', () => re({ codigo: res.statusCode, cuerpo: Buffer.concat(b), tipo: res.headers['content-type'] || '' })); }); r.on('error', mal); r.setTimeout(60000, () => { r.destroy(new Error('timeout ' + u)); }); }); }
const ARCHIVOS = [
  // IPH-1 (710dfbee): perfil iPhone, DPR 1,25–1,75, sin Modo Escuela automático
  // QA-220 (c6786974, calentado de la variante sRGB del lienzo; calentarPresupuesto)
  ['src/engine/renderer.js', ['DPR_IPHONE = { max: 1.75, min: 1.25 }', 'IPH-1: el iPhone en «bajo» no baja de DPR_MIN', 'calentarPresupuesto']],
  // KIMI-348 (prefetch a pie, 5141d2ae): CFG.precargaPie + rama en vueloAnticipo
  // KIMI-346 (atlas escuela, 808937dc): tope LQ también con comprimidaModo()
  ['src/engine/streaming.js', ['precargaPie', 'precargaPieMin', 'comprimidaModo() || (MOVIL && nivelCal()']],
  // KTX2 (925101b5, arrastre): cargador + ganchos del atlas
  ['src/engine/assets.js', ['function ktx2De(url)', 'function texKTX2(url, ok, falla)']],
  // QA-220 (eventos eef133a0, arrastre)
  ['src/game/eventos.js', ['pedirCaptura', 'fenceSync']],
  // KTX2 binarios Basis ETC1S
  ['assets/models/edificios/tex_hd/hd_ancient_lq.ktx2', []],
  ['assets/models/edificios/tex_hd/hd_savage_lq.ktx2', []],
  ['assets/models/edificios/tex_hd/hd_ancient_lq1024.ktx2', []],
  ['assets/models/edificios/tex_hd/hd_savage_lq1024.ktx2', []],
  ['assets/vendor/three/examples/js/libs/basis/basis_transcoder.wasm', []],
  ['assets/vendor/three/examples/js/libs/basis/basis_transcoder.js', []],
  ['sw.js', ['ktx2']],
];
(async () => {
  const out = { base: BASE, hora_utc: new Date().toISOString(), ref: REF, indice: {}, archivos: {}, ok: true };
  const idx = await get(BASE + '/index.html?v=' + Date.now()).catch(e => ({ codigo: 0, cuerpo: Buffer.alloc(0), error: String(e) }));
  const txt = idx.cuerpo.toString('utf8');
  const mb = txt.match(/ave:build[^>]*content="([^"]+)"/i);
  const mk = txt.match(/ave:ktx2[^>]*content="([^"]+)"/i);
  out.indice = { codigo: idx.codigo, bytes: idx.cuerpo.length, build_meta: mb ? mb[1] : '(no encontrado)', ktx2_meta: mk ? mk[1] : '(no encontrado)' };
  if (idx.codigo !== 200 || !mb || !mb[1].includes(REF.slice(0, 7))) out.ok = false;
  for (const [ruta, marks] of ARCHIVOS) {
    const r = await get(BASE + '/' + ruta + '?v=' + Date.now()).catch(e => ({ codigo: 0, cuerpo: Buffer.alloc(0), error: String(e) }));
    const cuerpo = r.cuerpo.toString('utf8');
    const faltan = marks.filter(m => !cuerpo.includes(m));
    let ref = null;
    try { const rb = execSync(`git show ${REF}:${ruta}`, { maxBuffer: 128 * 1024 * 1024 }); ref = { bytes: rb.length, identico: rb.equals(r.cuerpo) }; }
    catch (e) { ref = { error: String(e).slice(0, 120) }; }
    out.archivos[ruta] = { codigo: r.codigo, bytes: r.cuerpo.length, marcadores_ok: marks.length - faltan.length, marcadores_total: marks.length, faltan, ref };
    if (r.codigo !== 200 || faltan.length || !ref.identico) out.ok = false;
  }
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
