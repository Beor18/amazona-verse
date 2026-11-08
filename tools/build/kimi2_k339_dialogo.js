#!/usr/bin/env node
/* KIMI-339 · mini-sonda: diálogo del Constructor con la API correcta (dialogo.activo/actual, no solo open).
   Uso: node tools/build/kimi2_k339_dialogo.js [--url https://www.amazonaverse.com/juego] */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const URLJ = String(arg('--url', 'https://www.amazonaverse.com/juego')).replace(/\/+$/, '');
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); const zas = m => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + m)); this.pend.clear(); }; ws.onerror = e => zas(e.message || 'error'); ws.onclose = () => zas('cerrado'); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, ts, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (ts || 30) * 1000); if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300)); return r.result ? r.result.value : undefined; }
async function espera(cdp, ses, exp, segs) { const t0 = Date.now(); while (Date.now() - t0 < segs * 1000) { const r = await evaluar(cdp, ses, exp, 8, false); if (r) return r; await cdp.bombear(0.5); } return false; }
(async () => {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2dlg-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--enable-precise-memory-info', '--window-size=1600,900'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const fin = (cod, extra) => { try { spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) {} if (extra) console.log(JSON.stringify(extra, null, 1)); process.exit(cod); };
  try {
    const pf = path.join(perf, 'DevToolsActivePort');
    let puerto = 0, wsPath = '';
    for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { try { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puerto = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } catch (e) {} } await new Promise(r => setTimeout(r, 200)); }
    const ws = new WebSocket(`ws://127.0.0.1:${puerto}${wsPath}`);
    const cdp = new CDP(ws); await cdp.listo();
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }, ses);
    await cdp.call('Page.navigate', { url: URLJ + '/?v18=1' }, ses);
    await espera(cdp, ses, `!!(document.getElementById('title') || document.getElementById('creator'))`, 90);
    await evaluar(cdp, ses, `(() => { const b = [...document.querySelectorAll('button')].find(x => /saltar/i.test(x.textContent) && !x.hidden); if (b) b.click(); return 1; })()`, 10, false);
    await espera(cdp, ses, `!!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.listo)`, 240);
    const r = await evaluar(cdp, ses, `(async () => { try {
      const G = AV.G, AVE = window.AVE;
      await AVE.assets.script('src/game/v18/progreso.js').then(() => window.AVV18Progreso(G));
      await AVE.assets.script('src/game/v18/habilidades.js').then(() => window.AVV18Habilidades(G));
      await AVE.assets.script('src/game/v18/fx_poderes.js').then(() => window.AVV18Fx(G));
      await AVE.assets.script('content/comun/personajes_v18.js');
      await AVE.assets.script('src/game/v18/npc.js').then(() => window.AVV18Npc(G));
      await AVE.assets.script('src/game/v18/puerto.js').then(() => window.AVV18Puerto(G));
      await AVE.assets.script('src/game/v18/arco.js').then(() => window.AVV18Arco(G));
      const A = G.v18arco;
      try { G.v18.cambiarMundo('puerto_mina', 'reparado'); } catch (e) {}
      try { A.avanzar('reunion'); } catch (e) {}
      A.aplicar(); if (G.v18puerto.aplicar) G.v18puerto.aplicar();
      return 'listo';
    } catch (e) { return 'err:' + e.message; } })()`, 120, true);
    // elenco se despierta con Vittata lejos (>160 m): esperarlo SIN teleportar
    await espera(cdp, ses, `(window.AV && AV.G.v18arco && AV.G.v18arco.elenco && AV.G.v18arco.elenco()) === true`, 40);
    await espera(cdp, ses, `(window.AV && AV.G.v18npc && AV.G.v18npc.activos().length > 0) === true`, 40);
    const pre = await evaluar(cdp, ses, `(() => { const A = AV.G.v18arco; return { estado: A.estado(), llegada: A.llegada === true, npcs: AV.G.v18npc.activos(), dialogoActivo: AV.G.dialogo.activo() }; })()`, 10, false);
    // AHORA la llegada: teleport a la plaza y muestrear el diálogo desde el primer instante
    await evaluar(cdp, ses, `(() => { const A = AV.G.v18arco; const s = A.SITIO && (A.SITIO.plaza || A.SITIO.maq); if (s) { AV.G.mundo.streaming.terminar(); AV.G.S.pos.x = s.x; AV.G.S.pos.z = s.z; AV.G.S.pos.y = 2; } return 1; })()`, 10, false);
    const out = { carga: r, pre, muestras: [], disparo: null };
    for (let i = 0; i < 70; i += 1) {
      const d = await evaluar(cdp, ses, `(() => { const D = AV.G.dialogo; return { t: Math.round(performance.now()), open: D.open(), activo: D.activo(), libre: D.libre ? !!D.libre() : null, actual: D.actual ? (D.actual() || {}).text || null : null, llegada: AV.G.v18arco.llegada === true, estado: AV.G.v18arco.estado() }; })()`, 8, false).catch(e => ({ err: String(e).slice(0, 100) }));
      out.muestras.push(d);
      if (d.activo) out.disparo = d;
      if (d.llegada && out.disparo) break;
      await cdp.bombear(0.4);
    }
    fin(out.disparo ? 0 : 2, out);
  } catch (e) { fin(1, { error: String(e && e.message || e) }); }
})();
