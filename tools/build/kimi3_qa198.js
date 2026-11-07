#!/usr/bin/env node
/* QA-198: sonda del check de movementTest «La cámara no se mete en la pared… (sigue a más de 2,5 m)».
   Corre AV.movementTest() N veces en páginas frescas (móvil 375×812 dpr 3, CPU ×4, GPU real) y vuelca
   metricas.pared / metricas.camPared de cada ronda, más la lista de candidatos (edificio elegido y altos)
   para ver si la elección varía con el orden de carga. Uso: node tools/build/kimi3_qa198.js [--rondas 6] [--etiqueta x] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const RONDAS = parseInt(arg('--rondas', '6'), 10);
const ETIQUETA = arg('--etiqueta', 'r1');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi198');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const rondas = [];
  const guardar = () => fs.writeFileSync(path.join(SALIDA, `qa198_${ETIQUETA}.json`), JSON.stringify({ etiqueta: ETIQUETA, pantalla: 'movil 375x812@3 cpuX4 GPU real', rondas }, null, 1));
  let chrome = null, cdp = null, perf = null;
  const lanzar = async () => {
    perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3q198-'));
    chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1280,800'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; chrome.stderr.on('data', d => { err += d; });
    const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
    for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
    if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools ' + err.slice(0, 200)); }
    const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); cdp = new CDP(ws); await cdp.listo();
  };
  const cerrarNavegador = async () => { try { if (cdp) await cdp.call('Browser.close', {}, undefined, 3000); } catch (e) { } try { if (chrome) chrome.kill(); } catch (e) { } cdp = null; chrome = null; };
  await lanzar();
  for (let r = 1; r <= RONDAS; r++) {
    try {
      const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
      const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
      for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
      await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
      await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 3, mobile: true }, ses);
      await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
      await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
      const t0 = Date.now(); let ok = false;
      while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
      if (!ok) { rondas.push({ ronda: r, error: 'no arrancó' }); guardar(); continue; }
      const prep = await ev(cdp, ses, CFG.preparar_js, 300);
      if (process.argv.indexOf('--matriz') > 0) {
        // Replica exacta del tramo pared+cámara del check (movimiento.js:378-395) contra CADA candidato:
        // mismo reset, mismo toStick, mismos 150 cuadros, mismo yaw final y place(true).
        const matriz = await ev(cdp, ses, `(async () => {
          const G = window.AV.G, F = G.fisica, M = F.MOVE, S = G.S, I = G.input, K = I.keys, SO = G.solidos, DT = 1/60, H = G.terreno.height;
          G.quiet = true; G.camara.CAM.lazy = G.camara.CAM.lazyFly = 0;
          if (G.mundo && G.mundo.listo && G.mundo.listo.then) await G.mundo.listo;
          if (G.solidos && G.solidos.activo) G.solidos.terminar();
          const r2 = v => Math.round(v * 100) / 100;
          const frame = (fn, n) => { for (let i = 0; i < n; i++) { if (fn) fn(i); G.renderer.update(DT); } };
          const toStick = (dx, dz) => { const y = G.camara.yaw, fx = -Math.sin(y), fz = -Math.cos(y), rx = Math.cos(y), rz = -Math.sin(y), l = Math.hypot(dx, dz) || 1; return { x: (dx * rx + dz * rz) / l, y: -(dx * fx + dz * fz) / l }; };
          const reset = (x, z) => { K.clear(); I.stick.x = I.stick.y = 0; I.jumpHeld = false; F.endFlight(); M.flying = false; M.vx = M.vz = 0; M.dashT = M.dashCd = 0; M.buffer = 0; M.swimming = false; S.pos.x = x; S.pos.z = z; S.pos.y = F.suelo(x, z, H(x, z) + 0.5); S.vy = 0; M.grounded = true; M.wasAir = false; if (G.solidos && G.solidos.activo) G.solidos.terminar(); frame(null, 20); };
          const ACT = G.mundo.activos;
          const ids = Object.keys(ACT).filter(id => ACT[id].tipo === 'kelvin' && (ACT[id].alto || 0) > 3).sort((a, b) => ACT[b].alto - ACT[a].alto);
          const pick0 = ids.find(id => /casa_paja|bohio|caney/.test(id));
          const probar = [...new Set([...(pick0 ? [pick0] : []), ...ids.filter(id => /casa_paja|bohio|caney/.test(id)), ...ids.slice(0, 6)])];
          const out = [];
          for (const idT of probar) {
            const [bx, by, bz] = ACT[idT].pos;
            let dmin = 99, peor = 0, probadas = 0;
            G.camara.yaw = G.pack.jugador && G.pack.jugador.camara != null ? G.pack.jugador.camara : 0.35;
            for (const ang of [0.4, 2.0, 3.6, 5.2]) {
              const sx = bx + Math.cos(ang) * 10, sz = bz + Math.sin(ang) * 10, sy = F.suelo(sx, sz, H(sx, sz) + 0.3);
              if (SO.penetra(sx, sz, sy) || G.agua.levelAt(sx, sz) > sy - 0.2) continue;
              reset(sx, sz); probadas++;
              const st = toStick(bx - sx, bz - sz);
              frame(() => { I.stick.x = st.x; I.stick.y = st.y; peor = Math.max(peor, SO.penetra(S.pos.x, S.pos.z, S.pos.y, Math.min(SO.SO.cuerpo, (M.alto || SO.SO.cuerpo) - 0.01))); }, 150);
              I.stick.x = I.stick.y = 0; dmin = Math.min(dmin, Math.hypot(S.pos.x - bx, S.pos.z - bz));
            }
            const angCam = Math.atan2(bx - S.pos.x, bz - S.pos.z);
            G.camara.yaw = angCam; G.camara.place(true);
            const cp = G.renderer.camera.position, den = SO.dentro(cp.x, cp.z, cp.y);
            // distancia libre desde la cabeza hacia el edificio (mismo criterio que evitarMuros: pasos de 0,15 m)
            let libreH = 99; { const hy = S.pos.y + G.camara.CAM.look, n2 = Math.ceil((G.camara.CAM.dist + 1) / 0.15); for (let i = 1; i <= n2; i++) { const t = i * 0.15; if (SO.dentro(S.pos.x + Math.sin(angCam) * t, S.pos.z + Math.cos(angCam) * t, hy) > -Infinity) { libreH = t - 0.15; break; } } }
            out.push({ id: idT, alto: r2(ACT[idT].alto), probadas, dmin: r2(dmin), peor: r2(peor), den: den === -Infinity ? null : r2(den), dist: r2(Math.hypot(cp.x - S.pos.x, cp.z - S.pos.z)), libreH: r2(libreH) });
          }
          return out;
        })()`, 590);
        rondas.push({ ronda: r, matriz });
        console.log(`· ronda ${r} (matriz):`); for (const m of matriz || []) console.log(`   ${m.id} alto=${m.alto} dmin=${m.dmin} dist=${m.dist} den=${m.den} libreH=${m.libreH} peor=${m.peor}`);
        try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 5000); } catch (e) { }
        guardar(); continue;
      }
      // Candidatos reales del pick del check (misma lógica que movimiento.js:368-369)
      const candidatos = await ev(cdp, ses, `(() => { const G = window.AV.G, ACT = G.mundo && G.mundo.activos; if (!ACT) return null;
        const ids = Object.keys(ACT).filter(id => ACT[id].tipo === 'kelvin' && (ACT[id].alto || 0) > 3).sort((a, b) => ACT[b].alto - ACT[a].alto);
        const todos = ids.map(id => ({ id, alto: Math.round((ACT[id].alto || 0) * 100) / 100 }));
        return { total: ids.length, pick: (ids.find(id => /casa_paja|bohio|caney/.test(id)) || ids[0]), top6: todos.slice(0, 6) }; })()`);
      const res = await ev(cdp, ses, `window.AV.movementTest()`, 590);
      const m = (res && res.metricas) || {};
      const rojo = (res.results || []).find(x => /cámara no se mete/.test(x.name || '') && !x.ok);
      rondas.push({ ronda: r, prep, pick: candidatos && candidatos.pick, totalKelvin: candidatos && candidatos.total, top6: candidatos && candidatos.top6, edificio: m.pared && m.pared.edificio, distanciaMin: m.pared && m.pared.distanciaMin, penetraMax: m.pared && m.pared.penetraMax, camPared: m.camPared, checkCamara: rojo ? rojo.extra : 'verde', passed: res.passed, total: res.total });
      console.log(`· ronda ${r}: ed=${m.pared && m.pared.edificio} dmin=${m.pared && m.pared.distanciaMin} cam=${JSON.stringify(m.camPared)} check=${rojo ? 'ROJO ' + rojo.extra : 'verde'} (${res.passed}/${res.total})`);
      try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 5000); } catch (e) { }
    } catch (e) {
      rondas.push({ ronda: r, error: String(e && e.message || e).slice(0, 200) });
      console.log(`· ronda ${r}: ERROR ${String(e && e.message || e).slice(0, 120)} (reinicio navegador)`);
      await cerrarNavegador(); await lanzar();
    }
    guardar();
  }
  await cerrarNavegador();
  srv.close();
  const rojas = rondas.filter(x => x.checkCamara !== 'verde' && !x.error);
  console.log(`· resumen: ${rondas.length} rondas, check de cámara rojo en ${rojas.length}; evidencia docs/img/kimi198/qa198_${ETIQUETA}.json`);
  process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
