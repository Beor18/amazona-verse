//--- inicio
(async () => { const G = window.AV.G, R = G.renderer, S = G.S, C = G.camara;
 const esp = ms => new Promise(r => setTimeout(r, ms));
 const ST = G.mundo && G.mundo.streaming;
 // Muestrea cada cuadro real (rAF) durante `seg` s: distancia cámara→cabeza, FOV, cortes de muroEnMedio, altura de cámara
 window.__medir = (seg, stick) => new Promise(res => {
   const m = [], t0 = performance.now(), c0 = C.cortes; let k = 0;
   const f = () => { const t = (performance.now() - t0) / 1000; const p = R.camera.position;
     if (stick) { const a = stick(t); G.input.stick.x = a[0]; G.input.stick.y = a[1]; }
     m.push([+t.toFixed(3), +Math.hypot(p.x - S.pos.x, p.y - (S.pos.y + 1.2), p.z - S.pos.z).toFixed(3), +R.camera.fov.toFixed(2), +p.y.toFixed(2), +S.pos.x.toFixed(1), +S.pos.z.toFixed(1), C.cortes - c0]);
     if (t >= seg) { G.input.stick.x = G.input.stick.y = 0; res(m); } else requestAnimationFrame(f); };
   requestAnimationFrame(f); });
 window.__resumen = m => { const d = m.map(r => r[1]), n = m.length; let inv = 0, sg = 0, big = 0, dtMax = 0;
   for (let i = 1; i < n; i++) { const dd = d[i] - d[i - 1]; if (Math.abs(dd) > 0.02) { const s = Math.sign(dd); if (sg && s !== sg && Math.abs(dd) > 0.02) inv++; sg = s; } if (Math.abs(dd) > 0.5) big++; dtMax = Math.max(dtMax, m[i][0] - m[i - 1][0]); }
   const fv = m.map(r => r[2]);
   return { cuadros: n, fps: +(n / m[n - 1][0]).toFixed(1), dMin: Math.min(...d), dMax: Math.max(...d), fovMin: Math.min(...fv), fovMax: Math.max(...fv), saltos05: big, cambiosDeSentido: inv, cortes: m[n - 1][6], peorCuadroMs: Math.round(dtMax * 1000) }; };
 window.__ir = async (x, z) => { G.pruebas.teleport(x, z); G.pruebas.tick(0.1); if (ST && ST.alrededor) { await ST.alrededor(x, z); if (ST.terminar) await ST.terminar(); } if (G.solidos && G.solidos.terminar) G.solidos.terminar(); await esp(2500); };
 return JSON.stringify({ ok: 1, touch: navigator.maxTouchPoints, w: innerWidth, h: innerHeight, dist: C.CAM.dist, copaMin: C.CAM.copaMin, pos: [S.pos.x, S.pos.z] }); })()
//--- sitios
(async () => { const sitios = { pilar: [-59, -102], torre: [-50, -145], mirador: [-63, -146], taller: [-35, -125] }, out = {}, serie = {};
 for (const [k, [x, z]] of Object.entries(sitios)) {
   await window.__ir(x, z);
   const q = await window.__medir(10, null);
   // joystick: 3 s adelante (hacia la cámara→pared según yaw), 3 s a un lado, 4 s alternando, como un dedo en el iPad
   const j = await window.__medir(10, t => t < 3 ? [0, -1] : t < 6 ? [1, 0] : [Math.sin(t * 3), -Math.cos(t * 2)]);
   out[k] = { quieta: window.__resumen(q), joystick: window.__resumen(j) };
   serie[k] = { quieta: q.filter((_, i) => i % 6 === 0).map(r => r.slice(0, 2)), joystick: j.filter((_, i) => i % 6 === 0).map(r => r.slice(0, 4)) };
 }
 window.__serie = serie;
 return JSON.stringify({ resumen: out }); })()
//--- toques
(async () => { const G = window.AV.G, S = G.S, C = G.camara, M = G.fisica.MOVE, out = {};
 const esp = ms => new Promise(r => setTimeout(r, ms)), cv = G.renderer.canvas, st = document.getElementById('stick');
 const pe = (el, tipo, x, y, id) => el.dispatchEvent(new PointerEvent(tipo, { bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', clientX: x, clientY: y, isPrimary: id === 1 }));
 const r = st.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
 const sitios = { pilar: [-59, -102], torre: [-50, -145] };
 for (const [k, [x, z]] of Object.entries(sitios)) {
   await window.__ir(x, z);
   // a) dedo en el joystick (adelante) + otro dedo girando la cámara 1 vuelta en 10 s
   pe(st, 'pointerdown', cx, cy - r.height * 0.4, 1);
   pe(cv, 'pointerdown', 600, 400, 2); let px = 600;
   const a = await window.__medir(10, t => { px += 6; pe(cv, 'pointermove', px, 400, 2); return [G.input.stick.x, G.input.stick.y]; });
   pe(cv, 'pointerup', px, 400, 2); pe(st, 'pointerup', cx, cy, 1);
   // b) toques de volar/aterrizar cada 1,2 s (el modo cambia la distancia objetivo de la cámara)
   M.flying = false; const b = await window.__medir(12, t => { if (Math.floor(t / 1.2) !== (window.__u || -1)) { window.__u = Math.floor(t / 1.2); G.fisica.toggleFly(); } return [0, 0]; });
   M.flying = false;
   // c) saltos seguidos
   const c = await window.__medir(8, t => { if (Math.floor(t / 0.8) !== (window.__v || -1)) { window.__v = Math.floor(t / 0.8); G.fisica.tryJump(); } return [0, 0]; });
   out[k] = { dedoJoystick_y_giro: window.__resumen(a), toquesVolar: window.__resumen(b), saltos: window.__resumen(c), distVolar: C.CAM.distFly, distAndar: C.CAM.dist };
 }
 return JSON.stringify({ toques: out }); })()
