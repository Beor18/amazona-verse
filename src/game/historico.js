/* CG-118 · Casita del Guardián. Solo con ?interiores=1.
   La fachada casa_paja_a sigue en edificios: este módulo no la toca.
   Entra por transición a un cuarto aparte, dentro de esa caja.
   En pantalla solo hay marcadores: Entrar, Salir, Sala y Fogón. */
window.AVHistorico = function (G) {
  'use strict';
  if (G.historico && G.historico.iniciar) return G.historico;
  const T = window.THREE, S = G.S, H = (x, z) => G.terreno.height(x, z);
  const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' && en ? en : es);
  const encendido = () => G.interioresOn === true || /[?&]interiores=1\b/.test(location.search);
  const D = () => window.AV_CASITA;
  const lin = hex => new T.Color(hex).convertSRGBToLinear();
  const MADERA = '#a56b3c', BARRO = '#c4a574', PAJA = '#d7b15a', PIEDRA = '#8d8a82', TELA = '#e7d7c4';
  let grupo = null, activoId = null, arranque = false, mat = null;

  function velo(on) {
    let el = document.getElementById('historico-velo');
    if (!el) {
      el = document.createElement('div'); el.id = 'historico-velo';
      el.style.cssText = 'position:fixed;inset:0;background:#10241c;opacity:0;pointer-events:none;z-index:40;transition:opacity .2s';
      document.body.appendChild(el);
    }
    el.style.opacity = on ? '1' : '0';
  }
  const reducido = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function poner(x, z, y) {
    S.pos.x = x; S.pos.z = z; S.pos.y = y; S.vy = 0;
    const M = G.fisica && G.fisica.MOVE;
    if (M) { M.flying = false; M.vx = M.vz = 0; M.grounded = true; }
  }
  function volcar(geo, pos, col, color) {
    const c = lin(color), p = geo.attributes.position, idx = geo.index, n = idx ? idx.count : p.count;
    for (let i = 0; i < n; i++) {
      const vi = idx ? idx.getX(i) : i;
      pos.push(p.getX(vi), p.getY(vi), p.getZ(vi));
      col.push(c.r, c.g, c.b);
    }
    geo.dispose();
  }
  function caja(pos, col, w, h, d, x, y, z, color, rx) {
    const g = new T.BoxGeometry(w, h, d);
    const m = new T.Matrix4().makeTranslation(x, y, z);
    if (rx) m.multiply(new T.Matrix4().makeRotationX(rx));
    g.applyMatrix4(m);
    volcar(g, pos, col, color);
  }
  function malla(nombre, pos, col) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    if (!mat) { mat = new T.MeshLambertMaterial({ vertexColors: true }); mat.name = 'casita-historica'; }
    const m = new T.Mesh(g, mat);
    m.name = nombre;
    return m;
  }
  function rotulo(texto, x, y, z) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(16,36,28,0.72)'; ctx.fillRect(0, 8, 256, 48);
    ctx.fillStyle = '#f4efe4'; ctx.font = '600 28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(texto, 128, 32);
    const tex = new T.CanvasTexture(c);
    const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.position.set(x, y, z); s.scale.set(1.4, 0.35, 1);
    s.name = 'marca'; s.userData.marca = texto;
    return s;
  }
  function armar() {
    const d = D();
    const A = d.ancho, F = d.fondo, V = d.vano, P = d.piso;
    const sala = [], sc = [], fog = [], fc = [];
    const muro = (dest, col, w, x, z) => caja(dest, col, w, d.alto, 0.12, x, d.alto / 2, z, MADERA);
    caja(sala, sc, A, P, F / 2, 0, -P / 2, -F / 4, BARRO);
    caja(fog, fc, A, 0.06, F / 2, 0, 0.03, F / 4, PIEDRA);
    const lado = (A - V) / 2;
    muro(sala, sc, lado, -(V + lado) / 2, -F / 2 + 0.06);
    muro(sala, sc, lado, (V + lado) / 2, -F / 2 + 0.06);
    caja(sala, sc, V + 0.16, 0.16, 0.12, 0, d.alto - 0.08, -F / 2 + 0.06, MADERA);
    muro(sala, sc, A, 0, F / 2 - 0.06);
    caja(sala, sc, 0.12, d.alto, F, -A / 2 + 0.06, d.alto / 2, 0, MADERA);
    caja(sala, sc, 0.12, d.alto, F, A / 2 - 0.06, d.alto / 2, 0, MADERA);
    const hueco = 0.9, tab = (A - hueco) / 2;
    muro(fog, fc, tab, -(hueco + tab) / 2, 0);
    muro(fog, fc, tab, (hueco + tab) / 2, 0);
    caja(sala, sc, 0.9, 0.08, 0.06, A / 2 - 0.1, 1.5, -F / 4, MADERA);
    caja(sala, sc, 0.9, 0.08, 0.06, A / 2 - 0.1, 0.85, -F / 4, MADERA);
    caja(sala, sc, 0.08, 0.65, 0.06, A / 2 - 0.1 - 0.41, 1.17, -F / 4, MADERA);
    caja(sala, sc, 0.08, 0.65, 0.06, A / 2 - 0.1 + 0.41, 1.17, -F / 4, MADERA);
    caja(sala, sc, 1.1, 0.36, 0.34, 1.5, 0.18, -1.2, MADERA);
    caja(sala, sc, 0.08, 1.15, 0.08, -1.7, 0.58, -1.15, MADERA);
    caja(sala, sc, 0.08, 1.15, 0.08, -0.35, 0.58, -1.15, MADERA);
    caja(sala, sc, 1.35, 0.04, 0.55, -1.02, 0.72, -1.15, TELA);
    const olla = new T.CylinderGeometry(0.16, 0.2, 0.28, 8);
    olla.applyMatrix4(new T.Matrix4().makeTranslation(0.7, 0.14, 1.35));
    volcar(olla, fog, fc, BARRO);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      caja(fog, fc, 0.16, 0.1, 0.16, Math.cos(a) * 0.38, 0.05, 1.45 + Math.sin(a) * 0.38, PIEDRA);
    }
    const te = [], tc = [], sube = Math.atan2(d.cumbrera - d.alto, F / 2), largo = Math.hypot(F / 2, d.cumbrera - d.alto);
    caja(te, tc, A + 0.4, 0.08, largo, 0, (d.alto + d.cumbrera) / 2, -F / 4, PAJA, sube);
    caja(te, tc, A + 0.4, 0.08, largo, 0, (d.alto + d.cumbrera) / 2, F / 4, PAJA, -sube);
    const g = new T.Group(); g.name = 'casita-historica';
    g.add(malla('casita-sala', sala, sc));
    g.add(malla('casita-fogon', fog, fc));
    g.add(malla('casita-techo', te, tc));
    g.add(rotulo(L('Sala', 'Room'), 0, 1.7, -F / 4));
    g.add(rotulo(L('Fogón', 'Hearth'), 0, 1.7, F / 4));
    return g;
  }
  function descargar() {
    if (!grupo) return;
    G.renderer.scene.remove(grupo);
    grupo.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material.map) { o.material.map.dispose(); o.material.dispose(); }
    });
    grupo = null;
  }
  function dentro() {
    const d = D();
    return { x: d.cuarto.x, z: d.cuarto.z - d.fondo / 2 + 1.1, y: d.cuarto.y + 0.12 };
  }
  function cargar() {
    descargar();
    const d = D();
    grupo = armar();
    grupo.position.set(d.cuarto.x, d.cuarto.y, d.cuarto.z);
    G.renderer.scene.add(grupo);
    return dentro();
  }
  function entrar() {
    if (!encendido() || !D()) return false;
    const p = cargar();
    velo(true);
    poner(p.x, p.z, p.y);
    activoId = D().id;
    setTimeout(() => velo(false), reducido() ? 0 : 160);
    return true;
  }
  function salir() {
    if (!activoId) { descargar(); return false; }
    const d = D();
    descargar();
    poner(d.fuera.x, d.fuera.z, H(d.fuera.x, d.fuera.z) + 0.15);
    activoId = null;
    velo(false);
    return true;
  }
  function paso() {
    if (!activoId || !grupo) return;
    const d = D(), c = d.cuarto;
    if (Math.hypot(S.pos.x - c.x, S.pos.z - c.z) > 12) { salir(); return; }
    const hx = d.ancho / 2 - 0.35, hz = d.fondo / 2 - 0.35;
    const dx = S.pos.x - c.x, dz = S.pos.z - c.z;
    if (Math.abs(dx) > hx) S.pos.x = c.x + Math.sign(dx) * hx;
    if (Math.abs(dz) > hz) S.pos.z = c.z + Math.sign(dz) * hz;
    if (S.pos.y < c.y) S.pos.y = c.y + 0.12;
  }
  function iniciar() {
    if (!encendido() || !D()) return false;
    if (arranque) return true;
    arranque = true;
    const d = D(), p = dentro();
    G.interaccion.add({
      id: 'hist_' + d.id, x: d.puerta.x, z: d.puerta.z, r: d.puerta.r,
      visible: () => encendido() && activoId !== d.id,
      label: () => L('Entrar', 'Enter'),
      use: () => entrar(),
    });
    G.interaccion.add({
      id: 'hist_salir_' + d.id, x: p.x, z: p.z, r: 2.2,
      visible: () => activoId === d.id,
      label: () => L('Salir', 'Exit'),
      use: () => salir(),
    });
    return true;
  }
  function trisDe(g) {
    const p = g && g.attributes && g.attributes.position;
    return p ? p.count / 3 : 0;
  }
  function medidas() {
    if (!grupo) return null;
    let tris = 0, llamadas = 0;
    grupo.traverse(o => { if (o.isMesh) { llamadas++; tris += trisDe(o.geometry); } });
    const d = D();
    return { ancho: d.ancho, fondo: d.fondo, vano: d.vano, piso: d.piso, llamadas, tris, piezas: d.piezas.slice() };
  }
  G.on('update', () => { if (encendido() && arranque) paso(); }, 43);

  async function test() {
    const out = [], ok = (n, pass, extra) => out.push({ name: n, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
    const on0 = G.interioresOn;
    try {
      if (!window.AV_CASITA && window.AVE) await AVE.assets.script('content/cap1/casita_historica.js');
      const d = D();
      G.interioresOn = false;
      ok('Sin ?interiores=1 no arranca', iniciar() === false && !activoId);
      G.interioresOn = true;
      ok('iniciar() queda listo', iniciar() === true && iniciar() === true);
      const fachada = d.fachada;
      ok('El cuarto cabe en la fachada y ronda la sonda de 30,6 m²', d.ancho < fachada.ancho && d.fondo < fachada.fondo && d.cumbrera + d.piso < fachada.alto && Math.abs(d.ancho * d.fondo - 30.6) < 1, (d.ancho * d.fondo).toFixed(1));
      ok('El vano no pasa de 0,9 m', d.vano <= 0.9 && d.vano >= 0.75, d.vano);
      S.pos.x = d.puerta.x; S.pos.z = d.puerta.z;
      const entra = G.interaccion.find('hist_' + d.id);
      const cerca = G.interaccion.nearest();
      ok('En la puerta, Acción dice Entrar', !!(entra && entra.visible() && entra.label() === 'Entrar' && cerca && cerca.id === entra.id), cerca && cerca.label());
      ok('Entrar deja el cuarto cargado, con sala, fogón y techo', entra.use() === true && activoId === d.id && !!grupo && !!grupo.getObjectByName('casita-sala') && !!grupo.getObjectByName('casita-fogon') && !!grupo.getObjectByName('casita-techo'));
      const marcas = [];
      grupo.traverse(o => { if (o.userData && o.userData.marca) marcas.push(o.userData.marca); });
      ok('Los marcadores son Sala y Fogón', marcas.length === 2 && marcas.indexOf('Sala') >= 0 && marcas.indexOf('Fogón') >= 0, marcas.join(','));
      const med = medidas();
      ok('Cabe en 14 dibujos y en 12 mil triángulos', med.llamadas <= 14 && med.tris > 0 && med.tris < 12000, med.llamadas + ' · ' + med.tris);
      ok('Están el piso, la pared, el techo, el vano, el banco, la hamaca, la olla y el fogón', d.piezas.join(',') === 'piso,pared,techo,vano,banco,hamaca,olla,fogon');
      const sale = G.interaccion.find('hist_salir_' + d.id);
      S.pos.x = sale.x; S.pos.z = sale.z;
      ok('Dentro, Acción dice Salir', !!(sale && sale.visible() && sale.label() === 'Salir'));
      S.pos.x = d.cuarto.x + 3.2; paso();
      ok('El cuarto no deja salir por la pared', !!activoId && Math.abs(S.pos.x - d.cuarto.x) <= d.ancho / 2 - 0.3);
      S.pos.x = 0; S.pos.z = 0; paso();
      ok('Si se aleja, sale y el cuarto se descarga', !activoId && !grupo && Math.hypot(S.pos.x - d.fuera.x, S.pos.z - d.fuera.z) < 0.2);
      G.interaccion.find('hist_' + d.id).use();
      G.interaccion.find('hist_salir_' + d.id).use();
      ok('Salir vuelve junto a la casita', !activoId && !grupo && Math.hypot(S.pos.x - d.fuera.x, S.pos.z - d.fuera.z) < 0.2);
    } catch (e) { ok('La prueba terminó', false, String(e && e.message || e)); }
    finally {
      if (activoId) salir();
      G.interioresOn = on0;
      S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z;
    }
    return { passed: out.filter(x => x.ok).length, total: out.length, results: out };
  }
  const api = { iniciar, entrar, salir, paso, activo: () => activoId, medidas, test, encendido };
  G.historico = api;
  return api;
};
