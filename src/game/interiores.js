/* CG-110 · Núcleo de interiores. Solo con ?interiores=1.
   En el sitio se ocultan el techo y el muro registrados. Por transición hay un velo y un cuarto aparte.
   G.interiores.iniciar() queda listo: la línea de boot.js la pone la coordinadora. */
window.AVInteriores = function (G) {
  'use strict';
  if (G.interiores && G.interiores.iniciar) return G.interiores;
  const S = G.S, H = (x, z) => G.terreno.height(x, z);
  const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' && en ? en : es);
  const encendido = () => {
    if (/[?&]interiores=0\b/.test(location.search)) return false;
    if (G.interioresOn === false) return false;
    return true;
  };
  const lista = () => (window.AV_INTERIORES && window.AV_INTERIORES.edificios) || [];
  const porId = id => lista().find(e => e.id === id);
  let activoId = null, grupo = null, arranque = false;
  const partes = {};

  function velo(on) {
    let el = document.getElementById('interiores-velo');
    if (!el) {
      el = document.createElement('div'); el.id = 'interiores-velo';
      el.style.cssText = 'position:fixed;inset:0;background:#10241c;opacity:0;pointer-events:none;z-index:40;transition:opacity .2s';
      document.body.appendChild(el);
    }
    el.style.opacity = on ? '1' : '0';
  }
  function puntoDentro(ed) {
    if (ed.modo === 'transicion') return { x: ed.cuarto.x, z: ed.cuarto.z, y: ed.cuarto.y };
    return { x: ed.dentro.x, z: ed.dentro.z, y: H(ed.dentro.x, ed.dentro.z) + 0.05 };
  }
  function cargar(ed) {
    descargar();
    const p = puntoDentro(ed);
    grupo = new THREE.Group(); grupo.name = 'interiores:' + ed.id;
    const piso = new THREE.Mesh(new THREE.CircleGeometry(2.2, 8), new THREE.MeshLambertMaterial({ color: 0xc4a574 }));
    piso.rotation.x = -Math.PI / 2; piso.position.y = 0.02; grupo.add(piso);
    grupo.position.set(p.x, p.y, p.z);
    G.renderer.scene.add(grupo);
    return p;
  }
  function descargar() {
    if (!grupo) return;
    G.renderer.scene.remove(grupo);
    grupo.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); });
    grupo = null;
  }
  function poner(x, z, y) {
    S.pos.x = x; S.pos.z = z; S.pos.y = y; S.vy = 0;
    const M = G.fisica && G.fisica.MOVE;
    if (M) { M.flying = false; M.vx = M.vz = 0; M.grounded = true; }
  }
  function ocultar(ed, on) {
    const r = partes[ed.id]; if (!r) return;
    if (r.techo) r.techo.visible = !on;
    if (r.muro) r.muro.visible = !on;
  }
  function entrar(ed) {
    if (!encendido() || !ed) return false;
    const p = cargar(ed);
    ocultar(ed, true);
    if (ed.modo === 'transicion') velo(true);
    poner(p.x, p.z, p.y + 0.15);
    activoId = ed.id;
    if (ed.modo === 'transicion') setTimeout(() => velo(false), reducido() ? 0 : 160);
    return true;
  }
  function salir(ed) {
    ed = ed || porId(activoId); if (!ed) { activoId = null; descargar(); return false; }
    ocultar(ed, false);
    descargar();
    const f = ed.fuera;
    poner(f.x, f.z, H(f.x, f.z) + 0.15);
    activoId = null;
    velo(false);
    return true;
  }
  const reducido = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function registrar(id, obj) { partes[id] = obj || {}; }
  function iniciar() {
    if (!encendido()) return false;
    if (arranque) return true;
    arranque = true;
    for (const ed of lista()) {
      G.interaccion.add({
        id: 'int_' + ed.id, x: ed.puerta.x, z: ed.puerta.z, r: ed.puerta.r || 2.2,
        visible: () => encendido() && activoId !== ed.id,
        label: () => L('Entrar', 'Enter'),
        use: () => entrar(ed),
      });
      const d = puntoDentro(ed);
      G.interaccion.add({
        id: 'int_salir_' + ed.id, x: d.x, z: d.z, r: 2.4,
        visible: () => activoId === ed.id,
        label: () => L('Salir', 'Exit'),
        use: () => salir(ed),
      });
    }
    return true;
  }
  function activo() { return activoId; }
  function paso() {
    if (!activoId) return;
    const ed = porId(activoId); if (!ed) { activoId = null; descargar(); return; }
    const d = puntoDentro(ed);
    if (Math.hypot(S.pos.x - d.x, S.pos.z - d.z) > 24) salir(ed);
  }
  G.on('update', () => { if (encendido() && arranque) paso(); }, 42);

  async function test() {
    const out = [], ok = (n, pass, extra) => out.push({ name: n, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
    const on0 = G.interioresOn;
    try {
      if (!window.AV_INTERIORES && window.AVE) await AVE.assets.script('content/comun/interiores.js');
      G.interioresOn = false;
      ok('Sin ?interiores=1 no arranca', iniciar() === false && !activo());
      G.interioresOn = true;
      const eds = window.AV_INTERIORES.edificios;
      eds.push({ id: 'quieto', modo: 'sitio', puerta: { x: 420, z: -420, r: 2.2 }, dentro: { x: 420, z: -418 }, fuera: { x: 420, z: -423 } });
      ok('iniciar() queda listo', iniciar() === true && iniciar() === true);
      S.pos.x = 420; S.pos.z = -420;
      const quieto = G.interaccion.find('int_quieto');
      const cercaQ = G.interaccion.nearest();
      ok('En la puerta, Acción dice Entrar', !!(quieto && quieto.visible() && quieto.label() === 'Entrar' && cercaQ && cercaQ.id === 'int_quieto'), cercaQ && (cercaQ.id + ' · ' + cercaQ.label()));
      const villa = porId('bohio_villa'), taller = porId('taller_tuerca');
      ok('Hay un edificio en el sitio y otro por transición', !!(villa && villa.modo === 'sitio' && taller && taller.modo === 'transicion'));
      const techo = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      const muro = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
      techo.visible = muro.visible = true;
      registrar('bohio_villa', { techo, muro });
      const entra = G.interaccion.find('int_bohio_villa');
      ok('El bohío también ofrece Entrar', !!(entra && entra.visible() && entra.label() === 'Entrar'));
      entra.use();
      ok('En el sitio se entra, se ocultan techo y muro y el cuarto está cargado', activo() === 'bohio_villa' && techo.visible === false && muro.visible === false && !!grupo && grupo.parent === G.renderer.scene);
      const sale = G.interaccion.find('int_salir_bohio_villa');
      ok('Dentro, Acción dice Salir', !!(sale && sale.visible() && sale.label() === 'Salir'));
      sale.use();
      ok('Al salir vuelven el techo y el muro y el cuarto se descarga', !activo() && techo.visible === true && muro.visible === true && !grupo && Math.hypot(S.pos.x - villa.fuera.x, S.pos.z - villa.fuera.z) < 0.2);
      G.interaccion.find('int_taller_tuerca').use();
      ok('La transición deja a Vittata en el cuarto aparte', activo() === 'taller_tuerca' && Math.abs(S.pos.y - taller.cuarto.y) < 1 && !!document.getElementById('interiores-velo'));
      S.pos.x = 400; S.pos.z = 400; paso();
      ok('Si se aleja, sale: no se queda atrapada', !activo() && Math.hypot(S.pos.x - taller.fuera.x, S.pos.z - taller.fuera.z) < 0.2);
    } catch (e) { ok('La prueba terminó', false, String(e && e.message || e)); }
    finally {
      G.interioresOn = on0; if (activo()) salir();
      const eds = window.AV_INTERIORES && window.AV_INTERIORES.edificios;
      if (eds) { const i = eds.findIndex(e => e.id === 'quieto'); if (i >= 0) eds.splice(i, 1); }
      S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z;
    }
    return { passed: out.filter(x => x.ok).length, total: out.length, results: out };
  }
  const api = { iniciar, activo, registrar, entrar, salir, paso, test, encendido };
  G.interiores = api;
  return api;
};
