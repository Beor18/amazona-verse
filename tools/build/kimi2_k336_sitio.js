#!/usr/bin/env node
/* KIMI-336 · auditoría en vivo del sitio publicado: build servida + byte-identidad de los
   archivos del parche b3eb1ee (QA-218 en equipos.js + pul4 avisos descubrir en lugares.js /
   sorpresas.js / descubrir.js / fx.js / input.js), publicado en 277ec3b0 (21:30 UTC).
   Compara byte a byte contra `git show b3eb1ee:<ruta>` (no contra el worktree: HEAD ya trae
   235c3572, que la build servida NO lleva).
   Uso: node tools/build/kimi2_k336_sitio.js [--url https://www.amazonaverse.com/juego/] */
'use strict';
const http = require('http'); const https = require('https');
const { execSync } = require('child_process');
const BASE = (process.argv.indexOf('--url') > 0 ? process.argv[process.argv.indexOf('--url') + 1] : 'https://www.amazonaverse.com/juego/').replace(/\/$/, '');
const REF = 'b3eb1ee';
function get(u) { return new Promise((re, mal) => { const m = u.startsWith('https') ? https : http; const r = m.get(u, { headers: { 'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache' } }, res => { if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return get(new URL(res.headers.location, u).href).then(re, mal); const b = []; res.on('data', d => b.push(d)); res.on('end', () => re({ codigo: res.statusCode, cuerpo: Buffer.concat(b) })); }); r.on('error', mal); r.setTimeout(30000, () => { r.destroy(new Error('timeout ' + u)); }); }); }
const ARCHIVOS = [
  ['src/game/equipos.js', ['function cerrarCapa', 'Al cerrar la viñeta no queda su texto oculto', 'Listo cierra la pantalla de relevo y no deja su texto oculto']],
  ['src/engine/fx.js', ['pul4']],
  ['src/engine/input.js', ['pul4 · la barra de abajo: 4 chips']],
  ['src/game/lugares.js', ['const enV18 = () =>', 'pul4 (8-nov): el aviso']],
  ['src/game/sorpresas.js', ['pul4']],
  ['src/game/v18/descubrir.js', ['otraCosa']],
];
(async () => {
  const out = { base: BASE, hora_utc: new Date().toISOString(), ref: REF, indice: {}, archivos: {}, ok: true };
  const idx = await get(BASE + '/index.html?v=' + Date.now()).catch(e => ({ codigo: 0, cuerpo: Buffer.alloc(0), error: String(e) }));
  const txt = idx.cuerpo.toString('utf8');
  out.indice = { codigo: idx.codigo, bytes: idx.cuerpo.length };
  const mb = txt.match(/ave:build[^>]*content="([^"]+)"/i);
  out.indice.build_meta = mb ? mb[1] : '(no encontrado)';
  for (const [ruta, marks] of ARCHIVOS) {
    const r = await get(BASE + '/' + ruta + '?v=' + Date.now()).catch(e => ({ codigo: 0, cuerpo: Buffer.alloc(0), error: String(e) }));
    const cuerpo = r.cuerpo.toString('utf8');
    const faltan = marks.filter(m => !cuerpo.includes(m));
    let ref = null;
    try { const rb = execSync(`git show ${REF}:${ruta}`, { maxBuffer: 64 * 1024 * 1024 }); ref = { bytes: rb.length, identico: rb.equals(r.cuerpo) }; }
    catch (e) { ref = { error: String(e).slice(0, 120) }; }
    out.archivos[ruta] = { codigo: r.codigo, bytes: r.cuerpo.length, marcadores_ok: marks.length - faltan.length, marcadores_total: marks.length, faltan, ref };
    if (r.codigo !== 200 || faltan.length || !ref.identico) out.ok = false;
  }
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
