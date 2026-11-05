/* Juego · V18.1 «El mundo que cambia contigo» (Kelvin 5-nov) · progreso compartido (frente D).
   UN solo dueño del progreso del ciclo V18.1: los frentes A (combate), B (reparar) y C (especies) leen y escriben aquí, nunca
   en un almacén propio. Contrato en docs/equipo/V18_CONTRATOS.md.
   - Solo existe con la bandera V18 (?v18=1, o localStorage `amazonaverse.v18` = '1'): la versión estable no cambia.
   - Almacén `<almacen>.v18` = { v: 1, especies: { <speciesId>: estado }, inv: { <itemId>: n }, otorgados: { <rewardKey>: true },
     mundo: { <worldChangeId>: estado }, sel: <speciesId|null> }.
   - Estados de especie: no_descubierta < descubierta < desbloqueada < seleccionable < seleccionada (solo una seleccionada).
     Una especie ya disponible en partidas viejas (la del perfil) entra como seleccionable: nada se bloquea por migrar.
   - otorgar(rewardKey, itemId, n) es idempotente: la misma recompensa no se da dos veces (protección contra duplicados).
   - Eventos: G.emit('v18', { tipo: 'especie'|'inv'|'mundo'|'recompensa', ... }).
   Prueba: AV.v18Test(). */
window.AVV18Progreso = function (G) {
  'use strict';
  if (G.v18) return G.v18;
  const ESTADOS = ['no_descubierta', 'descubierta', 'desbloqueada', 'seleccionable', 'seleccionada'];
  const V = 1;
  const clave = () => ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.v18';
  const vacio = () => ({ v: V, especies: {}, inv: {}, otorgados: {}, mundo: {}, sel: null });
  let D = null;
  function leer() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(clave()) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || d.v !== V) d = Object.assign(vacio(), d && typeof d === 'object' ? migrar(d) : {});
    for (const k of ['especies', 'inv', 'otorgados', 'mundo']) if (!d[k] || typeof d[k] !== 'object') d[k] = {};
    const perfil = G.S && G.S.profile && ((G.S.profile.look && G.S.profile.look.species) || G.S.profile.species);
    if (perfil && rango(d.especies[perfil]) < rango('seleccionable')) d.especies[perfil] = 'seleccionable';
    if (!d.sel && perfil) d.sel = perfil;
    return d;
  }
  function migrar(d) { d.v = V; return d; } // v1: sin migraciones todavía; cada cambio de esquema sube V y migra aquí
  function guardar() { try { localStorage.setItem(clave(), JSON.stringify(D)); return true; } catch (e) { return false; } }
  const datos = () => (D || (D = leer()));
  const rango = e => Math.max(0, ESTADOS.indexOf(e || 'no_descubierta'));
  const emit = ev => { try { G.emit('v18', ev); } catch (e) { /* sin oyentes */ } };

  function estado(id) { const d = datos(); return d.sel === id ? 'seleccionada' : (d.especies[id] || 'no_descubierta'); }
  // Solo sube de estado (descubrir una ya desbloqueada no la baja)
  function subir(id, e) {
    if (!id || ESTADOS.indexOf(e) < 0) return false;
    const d = datos(); if (rango(d.especies[id]) >= rango(e)) return false;
    d.especies[id] = e; guardar(); emit({ tipo: 'especie', id, estado: e }); return true;
  }
  const descubrir = id => subir(id, 'descubierta');
  const desbloquear = id => subir(id, 'seleccionable'); // desbloquear la deja lista para elegir
  function seleccionar(id) {
    const d = datos(); if (rango(d.especies[id]) < rango('seleccionable')) return false;
    d.sel = id; guardar(); emit({ tipo: 'especie', id, estado: 'seleccionada' }); return true;
  }
  const seleccionada = () => datos().sel;
  function otorgar(rewardKey, itemId, n) {
    const d = datos(); if (!rewardKey || d.otorgados[rewardKey]) return false;
    d.otorgados[rewardKey] = true; d.inv[itemId] = (d.inv[itemId] || 0) + (n || 1); guardar();
    emit({ tipo: 'recompensa', rewardKey, itemId, n: n || 1 }); return true;
  }
  const cuantos = itemId => datos().inv[itemId] || 0;
  function gastar(itemId, n) {
    const d = datos(); n = n || 1; if ((d.inv[itemId] || 0) < n) return false;
    d.inv[itemId] -= n; guardar(); emit({ tipo: 'inv', itemId, n: -n }); return true;
  }
  const mundo = id => datos().mundo[id] || null;
  function cambiarMundo(id, e) { const d = datos(); if (d.mundo[id] === e) return false; d.mundo[id] = e; guardar(); emit({ tipo: 'mundo', id, estado: e }); return true; }
  function recargar() { D = null; return datos(); } // relee del almacén (lo usan las pruebas de recarga)
  function borrar() { D = vacio(); try { localStorage.removeItem(clave()); } catch (e) { /* sin almacenamiento */ } }

  function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    let crudo = null; try { crudo = localStorage.getItem(clave()); } catch (e) { /* sin almacenamiento */ }
    try {
      borrar();
      check('Especie nueva empieza sin descubrir', estado('arausiaca') === 'no_descubierta');
      check('Descubrir y desbloquear suben el estado; no se puede elegir sin desbloquear',
        descubrir('arausiaca') && estado('arausiaca') === 'descubierta' && !seleccionar('arausiaca') && desbloquear('arausiaca') && seleccionar('arausiaca') && estado('arausiaca') === 'seleccionada');
      check('Descubrir otra vez no baja el estado', !descubrir('arausiaca') && seleccionada() === 'arausiaca');
      check('Recompensa idempotente: la misma no se da dos veces', otorgar('combate_1', 'pluma_rival', 1) && !otorgar('combate_1', 'pluma_rival', 1) && cuantos('pluma_rival') === 1);
      check('Gastar descuenta y no deja negativos', gastar('pluma_rival', 1) && !gastar('pluma_rival', 1) && cuantos('pluma_rival') === 0);
      cambiarMundo('puente_villa', 'reparado');
      recargar();
      check('Tras recargar siguen especie, inventario y mundo', seleccionada() === 'arausiaca' && cuantos('pluma_rival') === 0 && mundo('puente_villa') === 'reparado' && !otorgar('combate_1', 'pluma_rival', 1));
    } catch (e) { check('Sin excepciones', false, e && e.message); }
    try { if (crudo == null) localStorage.removeItem(clave()); else localStorage.setItem(clave(), crudo); } catch (e) { /* sin almacenamiento */ }
    D = null;
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.on('apply', () => { D = null; }, 30);
  G.v18 = { ESTADOS, clave, estado, descubrir, desbloquear, seleccionar, seleccionada, otorgar, cuantos, gastar, mundo, cambiarMundo, recargar, borrar, test };
  return G.v18;
};
