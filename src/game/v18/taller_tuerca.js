/* CG-117 · Taller de Tuerca en la torre k300. Solo con ?interiores=1.
   El cuarto es la transición del núcleo. La reparación es G.v18arco.usarPoder (3 aciertos en arco.js).
   No hay un taller nuevo: máquina y tres herramientas, y la misma llamada. */
(function () {
  'use strict';
  window.AVTallerTuerca = function (G) {
    if (G.tallerTuerca) return G.tallerTuerca;
    const T = window.THREE;
    const ED = {
      id: 'taller_k300', modo: 'transicion', nombre: 'Taller de Tuerca',
      puerta: { x: -61.27, z: 85.6, r: 2.6 },
      cuarto: { x: 8, z: 8, y: 40 },
      fuera: { x: -61.27, z: 87.2 },
    };
    const encendido = () => G.interioresOn === true || /[?&]interiores=1\b/.test(location.search);
    let grupo = null, hechos = 0, puesto = false;
    function asegurarLista() {
      const eds = window.AV_INTERIORES && window.AV_INTERIORES.edificios;
      if (!eds || eds.some(e => e.id === ED.id)) return !!eds;
      eds.push(ED);
      return true;
    }
    function caja(w, h, d, color, x, y, z) {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshLambertMaterial({ color }));
      m.position.set(x, y, z);
      return m;
    }
    function montar() {
      if (grupo || !G.renderer) return;
      const p = ED.cuarto;
      grupo = new T.Group(); grupo.name = 'taller-tuerca';
      const maq = new T.Mesh(new T.CylinderGeometry(0.35, 0.42, 1.1, 8), new T.MeshLambertMaterial({ color: 0x8a5a32 }));
      maq.name = 'maquina'; maq.position.set(0.4, 0.55, -0.2); grupo.add(maq);
      for (let i = 0; i < 3; i++) {
        const h = caja(0.18, 0.08, 0.45, 0xc4a574, -0.8, 0.5, -0.6 + i * 0.45);
        h.name = 'herramienta-' + (i + 1); grupo.add(h);
      }
      grupo.position.set(p.x, p.y, p.z);
      G.renderer.scene.add(grupo);
    }
    function desmontar() {
      if (!grupo) return;
      G.renderer.scene.remove(grupo);
      grupo.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); });
      grupo = null;
    }
    function reparar() {
      if (!encendido() || !G.interiores || G.interiores.activo() !== ED.id) return { ok: false, motivo: 'fuera' };
      if (hechos >= 3) return { ok: false, motivo: 'listo' };
      const arco = G.v18arco;
      if (!arco || !arco.usarPoder) return { ok: false, motivo: 'sin arco' };
      const r = arco.usarPoder();
      if (r && r.ok) hechos++;
      return r;
    }
    function alSalir(sale) {
      if (!sale || sale._taller) return;
      const prev = sale.use;
      sale.use = () => { const r = prev ? prev() : G.interiores.salir(ED); desmontar(); return r; };
      sale._taller = true;
    }
    function preparar() {
      if (!encendido() || !G.interiores || !G.interaccion) return false;
      if (!asegurarLista()) return false;
      if (G.interiores.iniciar) G.interiores.iniciar();
      // iniciar() ya deja Entrar y Salir si el edificio está en la lista. Reparar es de este taller.
      if (!G.interaccion.find('int_taller_k300')) {
        G.interaccion.add({
          id: 'int_taller_k300', x: ED.puerta.x, z: ED.puerta.z, r: ED.puerta.r,
          visible: () => encendido() && G.interiores.activo() !== ED.id,
          label: () => 'Entrar',
          use: () => G.interiores.entrar(ED),
        });
        alSalir(G.interaccion.add({
          id: 'int_salir_taller_k300', x: ED.cuarto.x, z: ED.cuarto.z, r: 2.4,
          visible: () => G.interiores.activo() === ED.id,
          label: () => 'Salir',
          use: () => G.interiores.salir(ED),
        }));
      } else alSalir(G.interaccion.find('int_salir_taller_k300'));
      if (!G.interaccion.find('v18_taller_reparar')) {
        G.interaccion.add({
          id: 'v18_taller_reparar', x: ED.cuarto.x + 0.4, z: ED.cuarto.z - 0.2, r: 2.2,
          visible: () => encendido() && G.interiores.activo() === ED.id && hechos < 3,
          label: () => 'Reparar',
          use: () => reparar(),
        });
      }
      if (!puesto) {
        puesto = true;
        G.on('update', () => {
          if (!(G.interiores && G.interiores.activo && G.interiores.activo() === ED.id)) { desmontar(); return; }
          montar();
        }, 48);
      }
      return true;
    }
    async function test() {
      const out = [], ok = (n, pass, extra) => out.push({ name: n, ok: !!pass, extra: extra == null ? '' : String(extra) });
      const pos0 = { x: G.S.pos.x, y: G.S.pos.y, z: G.S.pos.z };
      const on0 = G.interioresOn, hechos0 = hechos;
      let poder0 = null, creeArco = false;
      try {
        if (!window.AV_INTERIORES && window.AVE) await AVE.assets.script('content/comun/interiores.js');
        if (!G.interiores && window.AVE) await AVE.assets.script('src/game/interiores.js').then(() => window.AVInteriores(G));
        G.interioresOn = false;
        ok('Sin ?interiores=1 el taller no se prepara', preparar() === false);
        G.interioresOn = true;
        ok('Con la bandera el taller queda en k300', preparar() === true && !!G.interaccion.find('int_taller_k300'));
        G.S.pos.x = ED.puerta.x; G.S.pos.z = ED.puerta.z;
        const puerta = G.interaccion.find('int_taller_k300');
        ok('En la torre, Acción dice Entrar', !!(puerta && puerta.visible() && puerta.label() === 'Entrar'));
        puerta.use();
        ok('La transición entra al cuarto de Tuerca', G.interiores.activo() === ED.id && Math.abs(G.S.pos.y - ED.cuarto.y) < 1);
        montar();
        const nombres = []; grupo.traverse(o => { if (o.name) nombres.push(o.name); });
        ok('Dentro están la máquina y las tres herramientas', nombres.includes('maquina') && nombres.filter(n => n.indexOf('herramienta-') === 0).length === 3, nombres.join(','));
        poder0 = G.v18arco && G.v18arco.usarPoder;
        let llamadas = 0;
        if (!G.v18arco) { G.v18arco = {}; creeArco = true; }
        G.v18arco.usarPoder = () => { llamadas++; return { ok: true }; };
        const r1 = G.interaccion.find('v18_taller_reparar');
        ok('Reparar llama al poder de arco.js', !!(r1 && r1.visible() && r1.use() && llamadas === 1), r1 ? '' : 'sin interacción');
        if (r1) { r1.use(); r1.use(); }
        ok('A los 3 aciertos ya no se ofrece otra reparación', !!(r1 && llamadas === 3 && hechos === 3 && r1.visible() === false));
        const sale = G.interaccion.find('int_salir_taller_k300');
        if (sale) sale.use();
        ok('Salir devuelve a la torre y quita el taller', !!(sale && !G.interiores.activo() && !grupo && Math.hypot(G.S.pos.x - ED.fuera.x, G.S.pos.z - ED.fuera.z) < 0.3));
      } catch (e) {
        ok('La prueba termina sin excepciones', false, String(e && e.message || e));
      } finally {
        hechos = hechos0;
        if (creeArco) delete G.v18arco; else if (poder0 && G.v18arco) G.v18arco.usarPoder = poder0;
        if (G.interiores && G.interiores.activo && G.interiores.activo() === ED.id) G.interiores.salir(ED);
        desmontar();
        G.interioresOn = on0;
        G.S.pos.x = pos0.x; G.S.pos.y = pos0.y; G.S.pos.z = pos0.z;
        const eds = window.AV_INTERIORES && window.AV_INTERIORES.edificios;
        if (eds) { const i = eds.findIndex(e => e.id === ED.id); if (i >= 0) eds.splice(i, 1); }
      }
      return { passed: out.filter(x => x.ok).length, total: out.length, results: out };
    }
    const api = { preparar, reparar, test, ED };
    G.tallerTuerca = api;
    return api;
  };
})();
