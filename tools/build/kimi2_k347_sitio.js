#!/usr/bin/env node
/* KIMI-347 · auditoría en vivo del sitio publicado: build 0271ba1 (PUBLICADO 9-nov 01:11 UTC en
   284deb02) = KTX2 (925101b5) + Duelo con más vida (db54479a) + multitud adaptativa (f33c7a1e).
   Comprueba la meta ave:build/ave:ktx2 del index servido y el byte-identidad de los archivos de
   los 3 parches + los 4 .ktx2 Basis + el arrastre de los parches anteriores (equipos/fx/input/
   lugares/sorpresas/descubrir/eventos), contra `git show 0271ba1d:<ruta>` (no contra el worktree).
   Extensión de kimi2_k336_sitio.js (KIMI-336/338). Evidencia: docs/img/kimi347/k347_http_audit.json
   Uso: node tools/build/kimi2_k347_sitio.js [--url https://www.amazonaverse.com/juego/] [--ref 0271ba1d] */
'use strict';
const http = require('http'); const https = require('https');
const { execSync } = require('child_process');
const BASE = (process.argv.indexOf('--url') > 0 ? process.argv[process.argv.indexOf('--url') + 1] : 'https://www.amazonaverse.com/juego/').replace(/\/$/, '');
const REF = process.argv.indexOf('--ref') > 0 ? process.argv[process.argv.indexOf('--ref') + 1] : '0271ba1d';
function get(u) { return new Promise((re, mal) => { const m = u.startsWith('https') ? https : http; const r = m.get(u, { headers: { 'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache' } }, res => { if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return get(new URL(res.headers.location, u).href).then(re, mal); const b = []; res.on('data', d => b.push(d)); res.on('end', () => re({ codigo: res.statusCode, cuerpo: Buffer.concat(b), tipo: res.headers['content-type'] || '' })); }); r.on('error', mal); r.setTimeout(60000, () => { r.destroy(new Error('timeout ' + u)); }); }); }
const ARCHIVOS = [
  // KTX2 (925101b5): cargador + ganchos del atlas + medición de memoria de comprimidas
  ['src/engine/assets.js', ['function ktx2De(url)', 'function texKTX2(url, ok, falla)', 'planoKit']],
  ['src/engine/streaming.js', ['const comprimidaModo = ()', 'ajustarComprimida']],
  ['src/game/look.js', ['isCompressedTexture']],
  // Duelo con más vida (db54479a): capa procedural vida/vidaHuesos
  ['src/game/v18/combate.js', ['vidaHuesos(ch, V)', 'vidaApi']],
  ['src/game/v18/duelo2.js', ['Vi.huesos(ch, V)']],
  // Multitud adaptativa (f33c7a1e)
  ['src/game/ciudad_viva.js', ['multitudActiva', 'fpsPrueba']],
  // Arrastre de parches anteriores (sigue igual en 0271ba1)
  ['src/game/equipos.js', ['function cerrarCapa', 'Al cerrar la viñeta no queda su texto oculto', 'Listo cierra la pantalla de relevo y no deja su texto oculto']],
  ['src/engine/fx.js', ['pul4']],
  ['src/engine/input.js', ['pul4 · la barra de abajo: 4 chips']],
  ['src/game/lugares.js', ['const enV18 = () =>', 'pul4 (8-nov): el aviso']],
  ['src/game/sorpresas.js', ['pul4']],
  ['src/game/v18/descubrir.js', ['otraCosa']],
  ['src/game/eventos.js', ['pedirCaptura', 'CM (8-nov): sin render extra ni lectura síncrona', 'fenceSync']],
  // KTX2 binarios Basis ETC1S (al lado del JPEG, que sigue siendo la fuente)
  ['assets/models/edificios/tex_hd/hd_ancient_lq.ktx2', []],
  ['assets/models/edificios/tex_hd/hd_savage_lq.ktx2', []],
  ['assets/models/edificios/tex_hd/hd_ancient_lq1024.ktx2', []],
  ['assets/models/edificios/tex_hd/hd_savage_lq1024.ktx2', []],
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
    out.archivos[ruta] = { codigo: r.codigo, bytes: r.cuerpo.length, tipo: r.tipo, marcadores_ok: marks.length - faltan.length, marcadores_total: marks.length, faltan, ref };
    if (r.codigo !== 200 || faltan.length || !ref.identico) out.ok = false;
  }
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
