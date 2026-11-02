/* Amazona Verse · dones de familia (CG-10, paso 1).
   Seis familias por geografía (PROPUESTA_PODERES_SECRETOS_BANDADAS.md §A.2 y §A.3).
   Los ejes son de fantasía: ±1 paso, suma cero, velocidad como mucho ±3 %.
   En Retos y duelos valen 1, salvo el modo «Con dones». El don activo es el paso 2 (CG-11).
   Lo carga src/engine/fisica.js. API: G.dones = { familia, ejes, paso, mult, conDones, test }. */
(function () {
  'use strict';
  const FAMILIAS = {
    islenas:      { nombre: 'Isleñas',            vel: 0,  giro: 0,  aguante: 0,  vista: 0,  sigilo: 0 },
    montaneras:   { nombre: 'Montañeras',         vel: -1, giro: -1, aguante: 2,  vista: 0,  sigilo: 0 },
    norte:        { nombre: 'Del norte',          vel: 1,  giro: 1,  aguante: -1, vista: 0,  sigilo: -1 },
    cordilleranas:{ nombre: 'Cordilleranas',      vel: 0,  giro: -1, aguante: 1,  vista: 1,  sigilo: -1 },
    gran_rio:     { nombre: 'Del gran río',       vel: 1,  giro: 0,  aguante: 0,  vista: -1, sigilo: 0 },
    bosque_sur:   { nombre: 'Del bosque del sur', vel: -1, giro: 0,  aguante: -1, vista: 1,  sigilo: 1 }
  };
  const DE = {
    vittata: 'islenas', ventralis: 'islenas', leucocephala: 'islenas', agilis: 'islenas', collaria: 'islenas', barbadensis: 'islenas',
    imperialis: 'montaneras', arausiaca: 'montaneras', guildingii: 'montaneras', versicolor: 'montaneras', martinicana: 'montaneras', violacea: 'montaneras',
    finschi: 'norte', oratrix: 'norte', tresmariae: 'norte', viridigenalis: 'norte', xantholora: 'norte', albifrons: 'norte',
    auropalliata: 'cordilleranas', guatemalae: 'cordilleranas', autumnalis: 'cordilleranas', lilacina: 'cordilleranas', mercenarius: 'cordilleranas',
    diadema: 'gran_rio', kawalli: 'gran_rio', festiva: 'gran_rio', dufresniana: 'gran_rio', ochrocephala: 'gran_rio', amazonica: 'gran_rio', farinosa: 'gran_rio',
    rhodocorytha: 'bosque_sur', vinacea: 'bosque_sur', brasiliensis: 'bosque_sur', pretrei: 'bosque_sur', tucumana: 'bosque_sur', aestiva: 'bosque_sur'
  };
  const CEROS = FAMILIAS.islenas;
  // 1 paso. Aguante: trepar ×1,05 y planeo ×0,90 (pierde menos altura).
  const PASO = { velocidad: 1.03, giro: 1.06, trepar: 1.05, planeo: 0.90, vista: 1.15, sigilo: 0.8 };

  window.AVDones = function (G) {
    if (G.dones) return G.dones;
    let conDonesFam = null, forzar = null;
    const enReto = () => document.body.classList.contains('retos-on') || document.body.classList.contains('duelo-on')
      || !!(G.retosApi && G.retosApi.activo);
    function especie() {
      const p = G.S && G.S.profile, look = p && p.look;
      return (look && look.species) || (p && p.species) || 'vittata';
    }
    function idFamilia() {
      if (enReto()) return conDonesFam || 'islenas';
      if (forzar) return forzar;
      return DE[especie()] || 'islenas';
    }
    function ficha() { return FAMILIAS[idFamilia()] || CEROS; }
    function paso(eje) {
      const f = ficha();
      if (eje === 'velocidad') return f.vel;
      if (eje === 'giro') return f.giro;
      if (eje === 'aguante' || eje === 'trepar' || eje === 'planeo') return f.aguante;
      if (eje === 'vista') return f.vista;
      if (eje === 'sigilo') return f.sigilo;
      return 0;
    }
    function mult(eje) {
      const n = paso(eje), k = PASO[eje] || (eje === 'aguante' ? PASO.trepar : 1);
      return Math.pow(k, n);
    }
    // Vuelta de prueba: crucero, giros, planeo que hay que recuperar, vista y sigilo.
    // Los pesos dejan a las 6 familias dentro de ±1,5 % de la media (CG-10).
    function tiempo(id) {
      const antes = forzar;
      forzar = id;
      const vel = mult('velocidad'), giro = mult('giro'), climb = mult('trepar'), sink = mult('planeo'), vista = mult('vista'), sig = mult('sigilo');
      forzar = antes;
      return 30 / vel + 15 / giro + 5 * (sink / climb) + 5 / vista + 5 * sig;
    }
    function test() {
      const P = G.pruebas, out = [];
      const check = (nombre, ok, extra) => out.push({ name: nombre, ok: !!ok, extra: extra == null ? '' : String(extra) });
      const clase0 = document.body.classList.contains('retos-on');
      const forz0 = forzar, con0 = conDonesFam;
      try {
        const ids = Object.keys(FAMILIAS);
        check('Hay 6 familias y 36 especies', ids.length === 6 && Object.keys(DE).length === 36, Object.keys(DE).length + ' especies');
        ids.forEach(id => {
          const f = FAMILIAS[id];
          const suma = f.vel + f.giro + f.aguante + f.vista + f.sigilo;
          check(f.nombre + ' suma cero', suma === 0, String(suma));
          check(f.nombre + ' no pasa de ±2 pasos', [f.vel, f.giro, f.aguante, f.vista, f.sigilo].every(n => n >= -2 && n <= 2));
        });
        check('La velocidad no pasa de ±3 %', ids.every(id => { forzar = id; const m = mult('velocidad'); return m >= 0.97 - 1e-9 && m <= 1.03 + 1e-9; }));
        forzar = null;
        const cat = window.AV_ESPECIES;
        const lista = cat ? (cat.especies || []).concat(cat.extintas || []) : null;
        if (lista) {
          const faltan = lista.filter(e => !DE[e.id]).map(e => e.id);
          const sobran = Object.keys(DE).filter(id => !lista.some(e => e.id === id));
          check('Cada especie del catálogo tiene familia', !faltan.length && !sobran.length, faltan.concat(sobran).join(', '));
        } else check('Hay catálogo de especies', false, 'sin AV_ESPECIES');
        forzar = 'islenas';
        check('Vittata es Isleña: ejes en 1', DE.vittata === 'islenas' && mult('velocidad') === 1 && mult('giro') === 1 && mult('trepar') === 1);
        forzar = null;
        document.body.classList.add('retos-on');
        forzar = 'norte';
        check('En Retos los ejes valen 1', mult('velocidad') === 1 && mult('giro') === 1 && mult('sigilo') === 1, String(mult('velocidad')));
        conDonesFam = 'norte';
        check('Con dones, Del norte va a ×1,03', Math.abs(mult('velocidad') - 1.03) < 1e-9, String(mult('velocidad')));
        conDonesFam = null; forzar = null;
        document.body.classList.remove('retos-on');
        const tiempos = ids.map(tiempo);
        const media = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
        const peor = Math.max(...tiempos.map(t => Math.abs(t / media - 1)));
        check('Cada familia queda a ±1,5 % del tiempo medio de la vuelta', peor <= 0.015, (peor * 100).toFixed(2) + ' %');
      } catch (e) {
        check('La prueba corre sin excepciones', false, String(e && e.stack || e).slice(0, 300));
      } finally {
        forzar = forz0; conDonesFam = con0;
        if (!clase0) document.body.classList.remove('retos-on');
      }
      const passed = out.filter(o => o.ok).length;
      return { ok: passed === out.length, passed, total: out.length, results: out };
    }
    const api = G.dones = {
      familias: FAMILIAS, de: DE, familia: idFamilia, ejes: ficha, paso, mult, tiempo,
      conDones(id) { conDonesFam = id || null; return api; },
      forzar(id) { forzar = id || null; return api; },
      test
    };
    const exponer = n => {
      const AV = window.AV;
      if (AV && AV.G === G) { if (!AV.donesTest) AV.donesTest = () => test(); }
      else if (n > 0) setTimeout(() => exponer(n - 1), 200);
    };
    exponer(40);
    return api;
  };
})();
