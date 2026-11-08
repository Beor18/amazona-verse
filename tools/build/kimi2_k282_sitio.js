#!/usr/bin/env node
/* KIMI-282 · auditoría en vivo del sitio publicado: build servida + marcadores del parche
   «3 hallazgos del arco V18.3» (publicación 0389d94) + confirmación de la tanda anterior
   (c360a2e: «Salir vuelve al menú» + «duelos por etapa»).
   Compara byte a byte los archivos servidos contra sitio/juego local.
   Uso: node tools/build/kimi2_k282_sitio.js [--url https://www.amazonaverse.com/juego/] */
'use strict';
const http = require('http'); const https = require('https'); const fs = require('fs'); const path = require('path');
const BASE = (process.argv.indexOf('--url') > 0 ? process.argv[process.argv.indexOf('--url') + 1] : 'https://www.amazonaverse.com/juego/').replace(/\/$/, '');
const LOCAL = path.resolve(__dirname, '..', '..', 'sitio', 'juego');
function get(u) { return new Promise((re, mal) => { const m = u.startsWith('https') ? https : http; const r = m.get(u, { headers: { 'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache' } }, res => { if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return get(new URL(res.headers.location, u).href).then(re, mal); const b = []; res.on('data', d => b.push(d)); res.on('end', () => re({ codigo: res.statusCode, cuerpo: Buffer.concat(b), cab: res.headers })); }); r.on('error', mal); r.setTimeout(30000, () => { r.destroy(new Error('timeout ' + u)); }); }); }
const MARCADORES = [
  ['src/game/v18/evolucion.js', ['const ARCO_RE = /^v18_(muelle|puerto|arco|fiesta)_/', "m[k] === 'recogida' && !ARCO_RE.test(k)"]],
  ['src/game/v18/arco.js', ['v18_arco_aciertos', 'function libreAviso()', 'restaurarAciertos()', '9e · Tras recargar siguen los 2 aciertos']],
  ['src/game/v18/puerto.js', ['v18_puerto_pista_', 'v18_puerto_aciertos', 'function libreAviso()', 'restaurarPaso()', '10e · Tras recargar siguen las 3 pistas']],
  ['src/game/v18/muelle.js', ['function libreAviso()']],
  ['src/game/v18/fiesta.js', ['function libreAviso()']],
  ['src/game/records.js', ['duelos_ganados_e']],
  ['src/game/v18/combate.js', ['duelos_ganados_e']],
  ['src/game/menu_modos.js', ['desdeMenu', 'marcarMenu']],
];
(async () => {
  const out = { base: BASE, hora_utc: new Date().toISOString(), indice: {}, archivos: {}, ok: true };
  const idx = await get(BASE + '/index.html').catch(e => ({ codigo: 0, cuerpo: Buffer.alloc(0), error: String(e) }));
  const txt = idx.cuerpo.toString('utf8');
  out.indice = { codigo: idx.codigo, bytes: idx.cuerpo.length };
  const mb = txt.match(/ave:build[^>]*content="([^"]+)"/) || txt.match(/build[^>]*content="([0-9a-f]{7,40})"/i);
  out.indice.build_meta = mb ? mb[1] : '(no encontrado)';
  for (const [ruta, marks] of MARCADORES) {
    const r = await get(BASE + '/' + ruta).catch(e => ({ codigo: 0, cuerpo: Buffer.alloc(0), error: String(e) }));
    const cuerpo = r.cuerpo.toString('utf8');
    const faltan = []; for (const m of marks) { const re = m instanceof RegExp ? m : new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, c => '\\' + c)); if (!re.test(cuerpo)) faltan.push(String(m)); }
    let local = null; const lp = path.join(LOCAL, ruta); if (fs.existsSync(lp)) { const lb = fs.readFileSync(lp); local = { bytes: lb.length, identico: lb.equals(r.cuerpo) }; }
    out.archivos[ruta] = { codigo: r.codigo, bytes: r.cuerpo.length, marcadores_ok: marks.length - faltan.length, marcadores_total: marks.length, faltan, local };
    if (r.codigo !== 200 || faltan.length || (local && !local.identico)) out.ok = false;
  }
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
