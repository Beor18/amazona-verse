/* Juego · V18.1 «El mundo que cambia contigo» (Kelvin 5-nov) · progreso compartido (frente D).
   UN solo dueño del progreso del ciclo V18.1: los frentes A (combate), B (reparar) y C (especies) leen y escriben aquí, nunca
   en un almacén propio. Contrato en docs/equipo/V18_CONTRATOS.md.
   - Solo existe con la bandera V18 (encendida por defecto desde el 6-nov; se apaga con ?v18=0 o localStorage `<almacen>.v18on` = '0'; QA-164: la bandera tiene su propia clave,
     no la del progreso): la versión estable no cambia.
   - Almacén `<almacen>.v18` = { v: 1, especies: { <speciesId>: estado }, inv: { <itemId>: n }, otorgados: { <rewardKey>: true },
     mundo: { <worldChangeId>: estado }, sel: <speciesId|null>, evo: { ... } }.
   - v2 (V18.2, evolución): solo añade `evo` (niveles, XP y alianzas; dueño del formato: evolucion.js). Una partida v1 migra
     sin perder nada; una build anterior que lea un v2 lo vuelve a marcar v1 y conserva `evo` intacto (Object.assign).
   - Estados de especie: no_descubierta < descubierta < desbloqueada < seleccionable < seleccionada (solo una seleccionada).
     Una especie ya disponible en partidas viejas (la del perfil) entra como seleccionable: nada se bloquea por migrar.
   - otorgar(rewardKey, itemId, n) es idempotente: la misma recompensa no se da dos veces (protección contra duplicados).
   - Eventos: G.emit('v18', { tipo: 'especie'|'inv'|'mundo'|'recompensa', ... }).
   Prueba: AV.v18Test(). */
window.AVV18Progreso = function (G) {
  'use strict';
  if (G.v18) return G.v18;
  const ESTADOS = ['no_descubierta', 'descubierta', 'desbloqueada', 'seleccionable', 'seleccionada'];
  const V = 2;
  const clave = () => ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.v18';
  const vacio = () => ({ v: V, especies: {}, inv: {}, otorgados: {}, mundo: {}, sel: null, evo: {} });
  let D = null;
  function leer() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(clave()) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || d.v !== V) d = Object.assign(vacio(), d && typeof d === 'object' ? migrar(d) : {});
    for (const k of ['especies', 'inv', 'otorgados', 'mundo', 'evo']) if (!d[k] || typeof d[k] !== 'object') d[k] = {};
    perfilVisto = null;
    return conPerfil(d);
  }
  // La especie del perfil entra como seleccionable. QA-165: con un jugador nuevo los módulos V18 se cargan al primer gesto
  // (portada), antes de que el creador haga el perfil; por eso se mira también después de leer, en cada acceso.
  let perfilVisto = null;
  const perfilActual = () => (G.S && G.S.profile && ((G.S.profile.look && G.S.profile.look.species) || G.S.profile.species)) || null;
  function conPerfil(d) {
    const perfil = perfilActual();
    if (!perfil || perfil === perfilVisto) return d;
    perfilVisto = perfil;
    if (rango(d.especies[perfil]) < rango('seleccionable')) d.especies[perfil] = 'seleccionable';
    if (!d.sel) d.sel = perfil;
    return d;
  }
  // Cada cambio de esquema sube V y migra aquí. v1 → v2: solo se añade `evo` (vacío; evolucion.js pone los valores por defecto)
  function migrar(d) { if (!d.evo || typeof d.evo !== 'object' || Array.isArray(d.evo)) d.evo = {}; d.v = V; return d; }
  function guardar() { try { localStorage.setItem(clave(), JSON.stringify(D)); return true; } catch (e) { return false; } }
  const datos = () => conPerfil(D || (D = leer()));
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
  const otorgado = rewardKey => !!datos().otorgados[rewardKey]; // solo lectura: ¿esa recompensa ya se dio?
  const cuantos = itemId => datos().inv[itemId] || 0;
  function gastar(itemId, n) {
    const d = datos(); n = n || 1; if ((d.inv[itemId] || 0) < n) return false;
    d.inv[itemId] -= n; guardar(); emit({ tipo: 'inv', itemId, n: -n }); return true;
  }
  const mundo = id => datos().mundo[id] || null;
  function cambiarMundo(id, e) { const d = datos(); if (d.mundo[id] === e) return false; d.mundo[id] = e; guardar(); emit({ tipo: 'mundo', id, estado: e }); return true; }
  // V18.2: datos de evolución (formato y saneado en evolucion.js). cambiarEvo(fn) muta, guarda y avisa.
  const evo = () => datos().evo;
  const copia = () => JSON.parse(JSON.stringify(datos())); // instantánea de solo lectura (hitos retroactivos, pruebas)
  function cambiarEvo(fn) { const d = datos(); const r = fn(d.evo); guardar(); emit({ tipo: 'evo' }); return r; }
  function recargar() { D = null; return datos(); } // relee del almacén (lo usan las pruebas de recarga)
  function borrar() { D = vacio(); perfilVisto = perfilActual(); try { localStorage.removeItem(clave()); } catch (e) { /* sin almacenamiento */ } }

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
      // QA-165: jugador nuevo, V18 se lee antes de que el creador haga el perfil; al crearlo, su especie entra elegible
      const prof0 = G.S && G.S.profile;
      if (G.S) {
        try {
          borrar(); D = null; G.S.profile = null; estado('arausiaca');
          G.S.profile = prof0 || { look: { species: 'vittata' } };
          const sp = perfilActual();
          check('Perfil creado después de leer el progreso: su especie entra elegible (QA-165)', rango(estado(sp)) >= rango('seleccionable') && seleccionada() === sp, sp + ' ' + estado(sp));
        } finally { G.S.profile = prof0; }
      }
      // QA-164: la bandera de arranque (boot.js) vive en <almacen>.v18on, NO en la clave del progreso: guardar no la apaga
      {
        const claveBandera = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.v18on';
        let b0 = null; try { b0 = localStorage.getItem(claveBandera); } catch (e) { /* sin almacenamiento */ }
        try {
          localStorage.setItem(claveBandera, '1');
          otorgar('qa164_bandera', 'pluma_rival', 1);
          let b1 = null; try { b1 = localStorage.getItem(claveBandera); } catch (e) { /* sin almacenamiento */ }
          check('QA-164: guardar el progreso no borra la bandera de arranque (claves distintas)', clave() !== claveBandera && b1 === '1',
            clave() + ' vs ' + claveBandera + ' · bandera=' + b1);
        } catch (e) { check('QA-164: guardar el progreso no borra la bandera de arranque (claves distintas)', false, e && e.message); }
        try { if (b0 == null) localStorage.removeItem(claveBandera); else localStorage.setItem(claveBandera, b0); } catch (e) { /* sin almacenamiento */ }
      }
      // Kelvin 6-nov: la V18 va encendida por defecto; ?v18=0 o la clave '0' la apagan (versión estable anterior); ?v18=1 / '1' la encienden
      {
        const B = window.AV && window.AV.v18Bandera, k = v => () => v, roto = () => { throw new Error('sin almacenamiento'); };
        const casos = B ? [['', k(null), true], ['', k('1'), true], ['', k('0'), false], ['?v18=0', k(null), false], ['?pack=cap1&v18=0', k('1'), false],
          ['?v18=1', k('0'), true], ['?v18=10', k('0'), false], ['', roto, true]].map(([q, c, esp]) => [q, B(q, c) === esp]) : [];
        check('Bandera V18 por defecto encendida; ?v18=0 y la clave «0» la apagan; ?v18=1 la enciende (boot.js)', !!B && casos.every(c => c[1]),
          B ? casos.filter(c => !c[1]).map(c => c[0] || '(sin query)').join(',') || 'ok' : 'AV.v18Bandera no existe');
      }
    } catch (e) { check('Sin excepciones', false, e && e.message); }
    try { if (crudo == null) localStorage.removeItem(clave()); else localStorage.setItem(clave(), crudo); } catch (e) { /* sin almacenamiento */ }
    D = null;
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.on('apply', () => { D = null; }, 30);
  G.v18 = { ESTADOS, clave, estado, descubrir, desbloquear, seleccionar, seleccionada, otorgar, otorgado, cuantos, gastar, mundo, cambiarMundo, evo, cambiarEvo, copia, recargar, borrar, test };
  return G.v18;
};
