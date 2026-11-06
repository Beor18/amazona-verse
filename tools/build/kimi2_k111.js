#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-111: QA-106 «parche blanco brillante de noche», arreglo.
   KIMI-093 (Kimi 1) atribuyó el disco crema de la pared (callejón de la Ciudad de los 36, NDC -0,122/0,712,
   muro_templo:cerca:AV_Restaurado_Base d=5,2): highlight de la luz en los muros restaurados, inflado por el
   bloom. Esta herramienta reproduce el encuadre (misma teleport que kimi1_091) y aplica atenuaciones en vivo,
   midiendo el píxel del disco en la salida REAL del composer (render del composer + readPixels en la misma
   tarea) y en un render directo sin post. El juego no se toca: herramienta + evidencia en docs/img/kimi111/.
   Uso: node tools/build/kimi2_k111.js --noche 1 --etiqueta r1 [--calidad medio] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const NOCHE = arg('--noche', '1');
const PACK = arg('--pack', 'cap1');
const ETIQUETA = arg('--etiqueta', 'r' + NOCHE);
const CALIDAD = arg('--calidad', 'medio');
const DPR = parseFloat(arg('--dpr', '1.5'));
const CPU = parseInt(arg('--cpu', '4'), 10);
const ANCHO = 820, ALTO = 1180;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi111'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2k111-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2k111-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 45000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// teleport al callejón + asentado, y al final FIJAR la posición exacta de la toma k091 (callejon:
// (2,6; 98,79; -119,6), yaw hacia (-20,-140)) justo antes de medir: el anti-atasco de física suele
// reubicar a Vittata unos metros y el disco (anclado en la pared) cambia de encuadre.
const IR_A_CALLEJON = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const px = 2, pz = -121, alt = 4, mx = -20, mz = -140;
  S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + alt; S.vy = 0;
  G.fisica.MOVE.flying = true;
  const yaw = Math.atan2(-(mx - px), -(mz - pz));
  G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(px, pz); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(1500);
  // fijar la posición exacta de la toma de referencia (KIMI-091 callejon) y recongelar la cámara
  S.pos.x = 2.6; S.pos.z = -119.6; S.pos.y = 98.79; S.vy = 0;
  G.fisica.MOVE.flying = true; G.fisica.MOVE.landing = false;
  G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
  await sleep(120);
  G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
  ${PACK === 'ep5' ? `
  // ep5: encuadrar la luna (el disco del cielo apunta a uSolDir): yaw hacia su azimut y vista arriba hasta su altura
  const sd = G.renderer.sunDir; if (sd) {
    G.camara.yaw = Math.atan2(-sd.x, -sd.z);
    const el = Math.asin(Math.max(-1, Math.min(1, sd.y))) * 180 / Math.PI;
    G.camara.inclina = Math.max(-25, Math.min(70, el + 25)) * Math.PI / 180;
    if (G.camara.place) G.camara.place(true);
    await sleep(150);
    G.camara.yaw = Math.atan2(-sd.x, -sd.z); if (G.camara.place) G.camara.place(true);
  }` : ''}
  return 'ok ' + JSON.stringify({ pos: [Math.round(S.pos.x * 100) / 100, Math.round(S.pos.y * 100) / 100, Math.round(S.pos.z * 100) / 100], yaw: G.camara.yaw, inclina: G.camara.inclina, hora: S.hora, post: G.renderer.post.activo });
})()`;

// Dos mediciones por render, con Y de arriba-abajo (como la captura) y traducción a fila GL:
//  - ref: luma máx en la ROI del disco de referencia (fracción 0,439/0,144 de KIMI-093, ±40 px)
//  - claro: píxel de MAYOR luma del cuadro (sin filtro de saturación) + raycast = candidato a disco
//  - claroBS: el de mayor luma con baja saturación (span<60), para comparar con paredes crema
// Caminos: composer (salida REAL) y directo (render sin post). Búfer entero leído una vez por render.
const MIDE_JS = `(() => { const AV = window.AV, G = AV.G, R = G.renderer, r = R.renderer, gl = r.getContext(), cam = R.camera, scene = R.scene;
  const fx = 0.439, fy = 0.144; // disco de referencia (NDC -0,122/0,712) en fracción de pantalla
  const medir = () => {
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const px = (x, yTop) => { const i = ((h - 1 - yTop) * w + x) * 4; return [buf[i], buf[i + 1], buf[i + 2]]; };
    const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    // ROI de referencia (coordenadas top-down)
    const cx = Math.round(fx * w), cy = Math.round(fy * h);
    let refMax = 0, refArg = null, refCentro = px(cx, cy);
    for (let dy = -40; dy <= 40; dy += 4) for (let dx = -40; dx <= 40; dx += 4) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const c = px(x, y), l = luma(c);
      if (l > refMax) { refMax = l; refArg = [x, y].concat(c); }
    }
    // barrido de cuadro entero (top-down)
    let claro = null, claroBS = null;
    for (let y = Math.floor(h * 0.28); y < h * 0.95; y += 2) {
      for (let x = Math.floor(w * 0.05); x < w * 0.95; x += 2) {
        const c = px(x, y), l = luma(c);
        if (!claro || l > claro.luma) claro = { px: [x, y], luma: Math.round(l), rgb: c, span: Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) };
        if ((Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2])) < 60 && (!claroBS || l > claroBS.luma)) claroBS = { px: [x, y], luma: Math.round(l), rgb: c };
      }
    }
    const ray = (objetivo) => {
      if (!objetivo) return null;
      try {
        cam.updateMatrixWorld(true);
        const T = window.THREE;
        const rr = new T.Raycaster(), v2 = new T.Vector2((objetivo.px[0] / w) * 2 - 1, -((objetivo.px[1] / h) * 2 - 1));
        rr.setFromCamera(v2, cam);
        const inter = [];
        for (const o of scene.children) {
          if (!o.visible) continue;
          if (o.isInstancedMesh && o.count > 4000) continue;
          try { const hh = rr.intersectObject(o, true); for (let i = 0; i < Math.min(2, hh.length); i++) inter.push(hh[i]); } catch (e) {}
        }
        inter.sort((a, b) => a.distance - b.distance);
        if (!inter[0]) return null;
        const o = inter[0].object, nombre = (x2) => { let n = x2.name || '(sin nombre)', p = x2.parent; while (p && p !== scene) { if (p.name) n = p.name + '/' + n; p = p.parent; } return n; };
        return { d: Math.round(inter[0].distance * 10) / 10, obj: nombre(o), mat: o.material ? (o.material.name || o.material.type) : null };
      } catch (e) { return null; }
    };
    const disco = Object.assign({}, claro, { ray: ray(claro) });
    const discoBS = Object.assign({}, claroBS, { ray: ray(claroBS) });
    const refRay = refArg ? ray({ px: [refArg[0], refArg[1]] }) : null;
    return { w, h, ref: { max: Math.round(refMax), arg: refArg, centro: refCentro, ray: refRay }, disco, discoBS };
  };
  const post = R.post, out = { postActivo: post.activo, bloomFuerza: post.bloom ? post.bloom.strength : null };
  try {
    if (post.activo && post.composer) { post.composer.render(); out.composer = medir(); }
  } catch (e) { out.composerErr = String(e && e.message || e).slice(0, 160); }
  try {
    r.render(scene, cam); out.directo = medir();
  } catch (e) { out.directoErr = String(e && e.message || e).slice(0, 160); }
  return JSON.stringify(out);
})()`;

// Aplicación de atenuaciones por nombre. Cada una devuelve un resumen de lo tocado.
const APLICA_JS = `((nombre) => { const AV = window.AV, G = AV.G, R = G.renderer, scene = R.scene, post = R.post;
  const mats = new Set();
  scene.traverse(o => { const m = o.material; if (m) for (const x of Array.isArray(m) ? m : [m]) if (x.name) mats.add(x); });
  const lista = [...mats];
  const restaurados = lista.filter(m => /^(AV_Restaurado_|KB3D_)/.test(m.name));
  const log = { nombre, restaurados: restaurados.length };
  if (nombre === 'base') { /* nada */ }
  else if (nombre === 'bloom0') { if (post.bloom) { window.__k111Bloom0 = post.bloom.strength; post.bloom.strength = 0; log.fuerza = window.__k111Bloom0; } }
  else if (nombre === 'bloomVuelve') { if (post.bloom && window.__k111Bloom0 != null) post.bloom.strength = window.__k111Bloom0; log.fuerza = post.bloom.strength; }
  else if (nombre === 'spec0') { for (const m of restaurados) { if (!m.userData.k111spec) m.userData.k111spec = m.specular.clone(); m.specular.setHex(0x000000); } log.spec0 = restaurados.length; }
  else if (nombre === 'specVuelve') { for (const m of restaurados) { if (m.userData.k111spec) m.specular.copy(m.userData.k111spec); } }
  else if (nombre === 'emis0') { let n = 0; scene.traverse(o => { const m = o.material; if (m) for (const x of Array.isArray(m) ? m : [m]) if (x.emissive && (x.emissive.r + x.emissive.g + x.emissive.b) > 0) { if (!x.userData.k111em) x.userData.k111em = x.emissive.clone(); x.emissive.setHex(0x000000); n++; } }); log.emis0 = n; }
  else if (nombre === 'skyOff') { if (R.sky) { R.sky.visible = false; log.sky = true; } }
  else if (nombre === 'skyOn') { if (R.sky) { R.sky.visible = true; log.sky = true; } }
  else if (nombre === 'discoAntes') { const u = R.sky && R.sky.material.uniforms; if (u && u.uDiscoRad) { u.uDiscoRad.value = 1; u.uDiscoInt.value = 1; log.disco = '1/1'; } }
  else if (nombre === 'discoNoche') { const u = R.sky && R.sky.material.uniforms; if (u && u.uDiscoRad) { u.uDiscoRad.value = 0.5; u.uDiscoInt.value = 0.45; log.disco = '0,5/0,45'; } }
  else if (nombre === 'quien') {
    // igual que hunt2 pero volcando TODOS los detalles del culpable: cadena de padres, material, posición, geometría
    const gl2 = R.renderer.getContext();
    const W2 = gl2.drawingBufferWidth, H2 = gl2.drawingBufferHeight;
    const RX = Math.max(0, Math.round(0.439 * W2) - 60), RY = Math.max(0, Math.round(0.144 * H2) - 60);
    const RW = Math.min(120, W2 - RX), RH = Math.min(120, H2 - RY);
    const medir = () => {
      if (post.activo && post.composer) post.composer.render();
      const buf = new Uint8Array(RW * RH * 4);
      gl2.readPixels(RX, H2 - RY - RH, RW, RH, gl2.RGBA, gl2.UNSIGNED_BYTE, buf);
      let max = 0;
      for (let i = 0; i < buf.length; i += 4) { const l = 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2]; if (l > max) max = l; }
      return max;
    };
    const base = medir();
    const todos = [];
    scene.traverse(o => { if ((o.isMesh || o.isPoints || o.isSprite) && o.visible) todos.push(o); });
    const culpables = [];
    const probar = (lista) => { for (const o of lista) o.visible = false; const m = medir(); for (const o of lista) o.visible = true; return m; };
    let pila = [todos], pasos = 0;
    while (pila.length && pasos < 4000) {
      const grupo = pila.pop();
      if (grupo.length === 1) { const o = grupo[0]; if (probar([o]) < base - 30) culpables.push(o); continue; }
      pasos++;
      const mitad = grupo.slice(0, Math.ceil(grupo.length / 2)), otra = grupo.slice(Math.ceil(grupo.length / 2));
      if (probar(mitad) < base - 30) pila.push(mitad);
      if (otra.length && probar(otra) < base - 30) pila.push(otra);
    }
    log.quien = culpables.map(o => {
      const cadena = []; let p = o;
      while (p && p !== scene) { cadena.push((p.name || '(' + p.type + ')')); p = p.parent; }
      const m = o.material;
      const wp = new THREE.Vector3(); o.getWorldPosition(wp);
      return {
        cadena: cadena.join(' < '),
        tipo: o.type, geometria: o.geometry && o.geometry.type,
        pos: wp.toArray().map(v => Math.round(v * 100) / 100),
        escala: o.scale.toArray().map(v => Math.round(v * 100) / 100),
        renderOrder: o.renderOrder, transparent: m && m.transparent, opacidad: m && m.opacity,
        mat: m ? { tipo: m.type, nombre: m.name, color: m.color && m.color.getHexString(), blending: m.blending, map: !!m.map, emisivo: m.emissive && m.emissive.getHexString(), lado: m.side } : null,
        radio: o.geometry && o.geometry.boundingSphere ? Math.round(o.geometry.boundingSphere.radius * 100) / 100 : null,
        userdata: o.userData ? Object.keys(o.userData).slice(0, 8) : [],
      };
    });
  }
  else if (nombre === 'hunt' || nombre === 'hunt2') {
    // bisección sobre TODOS los dibujables de la escena (no solo hijos de primer nivel): el disco sobrevivió
    // al hunt de hijos top-level → vive anidado (¿bajo el personaje/cámara?). Medición rápida: readPixels de solo la ROI.
    const gl2 = R.renderer.getContext(), cam2 = R.camera;
    const W2 = gl2.drawingBufferWidth, H2 = gl2.drawingBufferHeight;
    const RX = Math.max(0, Math.round(0.439 * W2) - 60), RY = Math.max(0, Math.round(0.144 * H2) - 60);
    const RW = Math.min(120, W2 - RX), RH = Math.min(120, H2 - RY);
    const medir = () => {
      if (post.activo && post.composer) post.composer.render();
      const buf = new Uint8Array(RW * RH * 4);
      gl2.readPixels(RX, H2 - RY - RH, RW, RH, gl2.RGBA, gl2.UNSIGNED_BYTE, buf);
      let max = 0;
      for (let i = 0; i < buf.length; i += 4) {
        const l = 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2];
        if (l > max) max = l;
      }
      return max;
    };
    const base = medir();
    const todos = [];
    scene.traverse(o => { if ((o.isMesh || o.isPoints || o.isSprite) && o.visible) todos.push(o); });
    const culpables = [];
    const probar = (lista) => { for (const o of lista) o.visible = false; const m = medir(); for (const o of lista) o.visible = true; return m; };
    let pila = [todos];
    let pasos = 0;
    while (pila.length && pasos < 4000) {
      const grupo = pila.pop();
      if (grupo.length === 1) {
        const o = grupo[0];
        if (probar([o]) < base - 30) culpables.push((o.name || '(sin nombre)') + ':' + o.type);
        continue;
      }
      pasos++;
      const mitad = grupo.slice(0, Math.ceil(grupo.length / 2)), otra = grupo.slice(Math.ceil(grupo.length / 2));
      if (probar(mitad) < base - 30) pila.push(mitad);
      if (otra.length && probar(otra) < base - 30) pila.push(otra);
    }
    log.hunt = { modo: nombre, base: Math.round(base), n: todos.length, culpables: culpables.slice(0, 12), pasos };
  }
  else if (nombre === 'edifOff') { const g = []; scene.traverse(o => { if (/^edificios(Inst|Zona)/.test(o.name || '') && o.visible) { o.visible = false; g.push(o.name); } }); log.ocultos = g.length; log.nombres = g.slice(0, 6); }
  else if (nombre === 'edifOn') { let n = 0; scene.traverse(o => { if (/^edificios(Inst|Zona)/.test(o.name || '')) { o.visible = true; n++; } }); log.mostrados = n; }
  else if (nombre === 'farolesOff') { let n = 0; scene.traverse(o => { if (/^faroles:/.test(o.name || '') && o.visible) { o.visible = false; n++; } }); log.faroles = n; }
  else if (nombre === 'farolesOn') { let n = 0; scene.traverse(o => { if (/^faroles:/.test(o.name || '')) { o.visible = true; n++; } }); log.faroles = n; }
  else if (nombre === 'flechaOff' || nombre === 'flechaOn') {
    const fx = G.fx;
    if (fx && fx.guideArrow) { fx.guideArrow.visible = nombre === 'flechaOn'; log.flecha = fx.guideArrow.visible; }
    // volcado de TODOS los MeshBasic #f2a03d (¿por qué guiasOff no lo quitó?)
    const lista = [];
    scene.traverse(o => { const m = o.material; if (m && m.isMeshBasicMaterial && m.color && m.color.getHexString() === 'f2a03d') { const wp = new THREE.Vector3(); o.getWorldPosition(wp); lista.push({ nombre: o.name || '(sin nombre)', geo: o.geometry && o.geometry.type, pos: wp.toArray().map(v => Math.round(v * 10) / 10), visible: o.visible }); } });
    log.basicF2a03d = lista;
  }
  else if (nombre === 'solBaja') { window.__k111sol = R.sun.intensity; R.sun.intensity = 0; log.sol = window.__k111sol; }
  else if (nombre === 'solVuelve') { if (window.__k111sol != null) R.sun.intensity = window.__k111sol; }
  return JSON.stringify(log);
})`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k111-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`, 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi2k111-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, atardecer: NOCHE, pantalla: `${ANCHO}x${ALTO}@${DPR} cpuX${CPU} ipad-emulado`, calidad: CALIDAD, estados: {} };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    try { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); } catch (e) { }
    try { await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses); } catch (e) { }
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    const extra = PACK === 'cap1' ? `&atardecer=${NOCHE}` : '';
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=${PACK}&mapa=real&calidad=${CALIDAD}${extra}` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    const ir = await evaluar(cdp, ses, IR_A_CALLEJON, 300);
    console.log('· callejón: ' + ir);
    res.callejon = ir;

    // secuencia de atenuaciones: [nombre, screenshot?]; --solo nombre1,nombre2 acorta
    const SEQ0 = [
      ['base', true],
      ['bloom0', true],
      ['bloomVuelve', false],
      ['spec0', true],
      ['solBaja', false],   // combo: ¿el disco es specular del sol? con spec0+sol0 debe desaparecer si lo es
      ['solVuelve', false],
      ['specVuelve', false],
      ['emis0', true],
      ['farolesOff', true],
      ['farolesOn', false],
      ['flechaOff', true],
      ['flechaOn', false],
      ['skyOff', true],
      ['skyOn', false],
      ['edifOff', true],
      ['edifOn', false],
    ];
    const solo = arg('--solo', '');
    const SEQ = solo ? solo.split(',').map(n => [n.trim(), true]) : SEQ0;
    for (const [nombre, foto] of SEQ) {
      const aplicado = JSON.parse(await evaluar(cdp, ses, `(${APLICA_JS})('${nombre}')`, 30));
      await cdp.bombear(0.4);
      const medida = JSON.parse(await evaluar(cdp, ses, MIDE_JS, 60));
      res.estados[nombre] = { aplicado, medida };
      const fmt = m => {
        if (!m) return '-';
        const d = m.disco, bs = m.discoBS;
        const ds = d ? `disco=${d.luma} span=${d.span} rgb(${d.rgb})${d.ray ? ' ' + d.ray.obj + '/' + d.ray.mat + ' d=' + d.ray.d : ''}@${d.px}` : 'disco=-';
        const bs2 = bs ? ` · BS=${bs.luma}${bs.ray ? ' ' + bs.ray.obj : ''}@${bs.px}` : '';
        return `ref=${m.ref.max}${m.ref.arg ? ' rgb(' + m.ref.arg.slice(2) + ')' : ''}${m.ref.ray ? ' ' + m.ref.ray.obj + '/' + m.ref.ray.mat + ' d=' + m.ref.ray.d : ''} · ${ds}${bs2}`;
      };
      console.log(`  ${nombre}: composer[${fmt(medida.composer)}] · directo[${fmt(medida.directo)}]`);
      if (foto) {
        await cdp.bombear(0.2);
        const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
        fs.writeFileSync(path.join(SALIDA, `k111_${ETIQUETA}_${nombre}.jpg`), Buffer.from(shot.data, 'base64'));
      }
    }
    const ambiente = await evaluar(cdp, ses, `(() => { try { return JSON.stringify({ hora: AV.G.S.hora, k: AV.G.atardecer ? AV.G.atardecer.k() : null }); } catch (e) { return 'ERR ' + e.message; } })()`, 15);
    res.ambiente = ambiente;
    const errores = await evaluar(cdp, ses, `(window.__aveErrores || []).length`, 10, false);
    res.erroresConsola = errores;
    console.log('· errores de consola: ' + errores);
  } catch (e) {
    res.error = String(e && e.message || e).slice(0, 400);
    console.error('ERROR: ' + res.error);
  } finally {
    fs.writeFileSync(path.join(SALIDA, `k111_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
    try { ws.close(); } catch (e) { }
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    srv.close();
  }
  console.log('evidencia en ' + SALIDA);
})();
