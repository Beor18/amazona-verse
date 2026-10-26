/* Juego · Rareza y poderes de las crías del criadero (directiva P2). Dueño: game designer de huevos.
   Datos: window.AV_HUEVOS.rarezaCria (content/comun/huevos.js). Diseño: docs/equipo/HUEVOS_RAREZA.md.
   - Eje aparte de la cápsula: la cápsula se gana con un reto (sin azar); la cría recibe su rareza al tocar «Ver la eclosión»
     (criadero.js → asignar) y queda guardada al instante en `<almacen>.criadero` (c.rareza, contadores st.rz). Recargar no vuelve
     a tirar, no hay botón de repetir ni pantalla de tragamonedas: la sorpresa es la eclosión. Nada se compra.
   - La suerte no castiga (garantias): tras 2 comunes seguidas la siguiente es rara o mejor; tras 5 crías sin épica, épica o
     mejor; tras 7 sin legendaria, legendaria. Crías de partidas viejas sin `rareza` son comunes (de()).
   - Mismo modelo siempre: solo un marco en la cápsula, una etiqueta y un aura (sprite aditivo que late) bajo la cría; nunca se
     tocan pico, ojos, proporciones ni animaciones. Poderes suaves del compañero (la cría que sigue a Vittata): vista, vuelo e
     impulso como multiplicadores (mult) que leen fisica.js y banquete.js; estela de chispas al volar; canto que llama a la
     bandada (G.emit('canto'); bandada.js pide con en: 1) al despegar, cada 90 s. En el Modo Retos, en un duelo y en los retos
     del mundo (rescate, banquete) mult() es 1 y tiene() es false.
   - Carga perezosa: criadero.js lo trae al arrancar (no va en index.html). window.AVRareza(G) → G.rareza.
   API: G.rareza = { de, def, niveles, asignar, tirar, contar, mult, tiene, actual, enReto, aura, coleccion, canto, paso, test }.
   Prueba: AV.rarezaTest(). */
(function () {
  'use strict';
  window.AVRareza = function (G) {
    if (G.rareza) return G.rareza;
    const D = () => (window.AV_HUEVOS && window.AV_HUEVOS.rarezaCria) || null;
    const ORDEN = ['comun', 'rara', 'epica', 'legendaria'];
    const niveles = () => (D() ? D().niveles.map(n => n.id) : ORDEN.slice());
    const def = id => (D() && D().niveles.find(n => n.id === id)) || null;
    const idx = id => niveles().indexOf(id);
    const lang = () => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? 'en' : 'es');
    const t = v => (v == null ? '' : typeof v === 'string' ? v : v[lang()] != null ? v[lang()] : v.es || '');
    // Rareza de una cápsula guardada. Partidas viejas (sin campo) o valores desconocidos: común.
    const de = c => (c && typeof c.rareza === 'string' && def(c.rareza) ? c.rareza : 'comun');
    const nombre = id => { const n = def(id); return n ? t(n.nombre) : ''; };
    const color = id => { const n = def(id); return n ? n.color : '#9fcf8a'; };

    // ---------- Tirada con garantías ----------
    // Generador con semilla (mulberry32) para las pruebas; el juego usa Math.random
    function semilla(s) { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
    // Contadores de garantías; completa los que falten EN EL MISMO objeto (st.rz se guarda con el criadero)
    const normal = cont => { if (!cont || typeof cont !== 'object') cont = {}; for (const k of ['n', 'comunes', 'sinEpica', 'sinLegendaria']) if (typeof cont[k] !== 'number' || !isFinite(cont[k])) cont[k] = 0; return cont; };
    function pesosCon(cont) {
      const R = D(), p = Object.assign({}, R.pesos), g = R.garantias || {};
      if (g.comunesSeguidas && cont.comunes >= g.comunesSeguidas) p.comun = 0;
      if (g.sinEpica && cont.sinEpica >= g.sinEpica) { p.comun = 0; p.rara = 0; }
      if (g.sinLegendaria && cont.sinLegendaria >= g.sinLegendaria) { p.comun = 0; p.rara = 0; p.epica = 0; }
      return p;
    }
    function tirar(cont, rnd) {
      if (!D()) return 'comun';
      const p = pesosCon(normal(cont)), ids = niveles();
      let tot = 0; for (const id of ids) tot += Math.max(0, p[id] || 0);
      if (tot <= 0) return ids[ids.length - 1];
      let r = (rnd || Math.random)() * tot;
      for (const id of ids) { r -= Math.max(0, p[id] || 0); if (r < 0) return id; }
      return ids[ids.length - 1];
    }
    function contar(cont, id) {
      cont = normal(cont); cont.n++;
      cont.comunes = id === 'comun' ? cont.comunes + 1 : 0;
      cont.sinEpica = idx(id) >= 2 ? 0 : cont.sinEpica + 1;
      cont.sinLegendaria = id === 'legendaria' ? 0 : cont.sinLegendaria + 1;
      return cont;
    }
    // Asigna (una sola vez) la rareza a la cápsula c y actualiza los contadores st.rz. Devuelve la rareza.
    function asignar(c, st, rnd) {
      if (!c) return null;
      if (typeof c.rareza === 'string' && def(c.rareza)) return c.rareza;
      st.rz = normal(st.rz);
      const id = tirar(st.rz, rnd); c.rareza = id; contar(st.rz, id);
      return id;
    }

    // ---------- Poderes del compañero (fuera de los Retos) ----------
    let forzada = null; // pruebas: rareza del compañero sin tocar el criadero
    const enReto = () => document.body.classList.contains('retos-on') || document.body.classList.contains('duelo-on')
      || !!(G.retosApi && G.retosApi.activo)
      || !!(G.duelo && (typeof G.duelo.activo === 'function' ? G.duelo.activo() : G.duelo.activo))
      || !!(G.rescate && G.rescate.activo && G.rescate.activo()) || !!(G.banqueteApi && G.banqueteApi.activo && G.banqueteApi.activo());
    function actual() {
      if (forzada) return forzada;
      try {
        const info = G.criadero && G.criadero.companero ? G.criadero.companero() : null; if (!info) return null;
        return de(G.criadero.estado().capsulas[info.id]);
      } catch (e) { return null; }
    }
    function mult(poder) {
      if (!D() || enReto()) return 1;
      const n = def(actual()); const m = n && n.mult && n.mult[poder];
      return typeof m === 'number' && isFinite(m) && m > 0 ? m : 1;
    }
    function tiene(poder) { if (!D() || enReto()) return false; const n = def(actual()); return !!(n && n.poderes && n.poderes.includes(poder)); }

    // Aura: sprite aditivo que late, bajo la cría (criadero y mundo). Nunca toca el modelo.
    let texAura = null;
    function texturaAura() {
      if (texAura) return texAura;
      const cv = document.createElement('canvas'); cv.width = cv.height = 128; const k = cv.getContext('2d');
      const g = k.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.45, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      k.fillStyle = g; k.fillRect(0, 0, 128, 128);
      texAura = new THREE.CanvasTexture(cv); return texAura;
    }
    function aura(rareza, escala) {
      const n = def(rareza || 'comun'); if (!n || !n.aura || typeof THREE === 'undefined') return null;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaAura(), color: n.color, transparent: true, opacity: n.aura, depthWrite: false, blending: THREE.AdditiveBlending }));
      const s = (escala || 1) * (0.9 + 0.25 * idx(n.id));
      sp.scale.set(s, s * 0.45, 1); sp.position.y = 0.04; sp.renderOrder = 2;
      sp.userData.rareza = n.id; sp.userData.base = s; sp.name = 'aura';
      const fase = Math.random() * 6.28;
      sp.onBeforeRender = () => { const p = 1 + 0.08 * Math.sin(performance.now() / 420 + fase); sp.scale.set(s * p, s * 0.45 * p, 1); sp.material.opacity = n.aura * (0.85 + 0.15 * Math.sin(performance.now() / 300 + fase)); };
      return sp;
    }

    // Estela al volar (épica y legendaria) y canto que llama a la bandada (legendaria), solo en el mundo libre
    let estelaT = 0, cantoEn = -1e9;
    function paso(dt, o) {
      const volando = o && o.volando != null ? o.volando : !!(G.fisica && G.fisica.MOVE && G.fisica.MOVE.flying);
      if (!volando || !tiene('estela') || !G.fx || !G.S || !G.S.pos) { estelaT = 0; return false; }
      estelaT += dt; if (estelaT < 0.12) return false; estelaT = 0;
      const p = G.S.pos, f = G.S.facing || { x: 0, z: 1 };
      try { G.fx.burst(p.x - f.x * 0.6, p.y + 0.4, p.z - f.z * 0.6, 'stars', actual() === 'legendaria' ? 4 : 2); } catch (e) { /* sin fx */ }
      return true;
    }
    function canto(o) {
      if (!tiene('canto')) return false;
      const P = (D().poderes && D().poderes.canto) || {}, cada = P.cadaS || 90, reloj = G.S && typeof G.S.clock === 'number' ? G.S.clock : performance.now() / 1000;
      if (!(o && o.forzar) && reloj - cantoEn < cada) return false;
      cantoEn = reloj;
      try { if (G.fx && G.S && G.S.pos) G.fx.burst(G.S.pos.x, G.S.pos.y + 0.8, G.S.pos.z, 'stars', 18); } catch (e) { /* sin fx */ }
      try { if (G.audio && G.audio.play) G.audio.play('chorus'); } catch (e) { /* sin audio */ }
      G.emit('canto', { rareza: actual(), poder: 'canto' }); // bandada.js: pedir('canto', { en: 1 })
      if (!G.quiet && G.ui && G.ui.toast) { try { G.ui.toast(t({ es: '¡Tu cotorrita canta y llama a la bandada!', en: 'Your chick sings and calls the flock!' }), 2600); } catch (e) { /* sin HUD */ } }
      return true;
    }
    G.on('update', dt => { if (!G.quiet) paso(dt); }, 70);
    G.on('vuelo', on => { if (on && !G.quiet) canto(); });

    // Colección por rareza (crías nacidas o libres) de un criadero guardado: { comun: n, rara: n, epica: n, legendaria: n }
    function coleccion(capsulas) {
      const out = {}; for (const id of niveles()) out[id] = 0;
      for (const c of Object.values(capsulas && typeof capsulas === 'object' ? capsulas : {})) if (c && (c.estado === 'nacida' || c.estado === 'liberada')) out[de(c)]++;
      return out;
    }

    // =================================================================================================================
    // Prueba: AV.rarezaTest()
    // =================================================================================================================
    async function test() {
      const out = [], check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
      const errores0 = (window.__aveErrores || []).length, quieta = G.quiet, forz0 = forzada, clase0 = document.body.classList.contains('retos-on');
      G.quiet = true;
      try {
        if (!window.AV_HUEVOS) { try { await AVE.assets.script('content/comun/huevos.js'); } catch (e) { /* abajo falla */ } }
        const R = D();
        check('Datos: 4 rarezas con pesos que suman 100', R && niveles().join(',') === 'comun,rara,epica,legendaria' && Object.values(R.pesos).reduce((a, b) => a + b, 0) === 100, R && JSON.stringify(R.pesos));
        // Distribución con semilla (sin garantías: contadores en cero en cada tiro)
        const N = 20000, rnd = semilla(20261025), cnt = {}; for (let i = 0; i < N; i++) { const id = tirar(null, rnd); cnt[id] = (cnt[id] || 0) + 1; }
        const pct = id => +(100 * (cnt[id] || 0) / N).toFixed(2);
        check('Distribución 60/29/10/1 (±2 puntos, 20 000 tiros con semilla)', Math.abs(pct('comun') - 60) <= 2 && Math.abs(pct('rara') - 29) <= 2 && Math.abs(pct('epica') - 10) <= 1.5 && Math.abs(pct('legendaria') - 1) <= 0.6, `${pct('comun')}/${pct('rara')}/${pct('epica')}/${pct('legendaria')}`);
        const a1 = semilla(7), a2 = semilla(7), s1 = [], s2 = []; for (let i = 0; i < 50; i++) { s1.push(tirar(null, a1)); s2.push(tirar(null, a2)); }
        check('La misma semilla da la misma secuencia', s1.join() === s2.join());
        // Garantías: 3000 nacimientos seguidos con contadores
        const g = R.garantias; let cont = normal(null), maxCom = 0, com = 0, maxSinE = 0, sE = 0, maxSinL = 0, sL = 0; const r2 = semilla(99);
        for (let i = 0; i < 3000; i++) { const id = tirar(cont, r2); contar(cont, id); com = id === 'comun' ? com + 1 : 0; sE = idx(id) >= 2 ? 0 : sE + 1; sL = id === 'legendaria' ? 0 : sL + 1; maxCom = Math.max(maxCom, com); maxSinE = Math.max(maxSinE, sE); maxSinL = Math.max(maxSinL, sL); }
        check('Nunca más de 2 comunes seguidas, épica antes de 6 y legendaria antes de 8', maxCom <= g.comunesSeguidas && maxSinE <= g.sinEpica && maxSinL <= g.sinLegendaria, `${maxCom} · ${maxSinE} · ${maxSinL}`);
        const peor = normal(null), seqPeor = []; for (let i = 0; i < 8; i++) { const id = tirar(peor, () => 0); contar(peor, id); seqPeor.push(id); }
        check('Con la peor suerte, 8 crías traen rara, épica y legendaria', seqPeor.includes('rara') && seqPeor.includes('epica') && seqPeor.includes('legendaria'), seqPeor.join(','));
        const st = {}, c = { estado: 'lista', xp: 104 }; const r1 = asignar(c, st, () => 0.999), r1b = asignar(c, st, () => 0);
        check('asignar fija la rareza una sola vez y cuenta en st.rz', r1 === 'legendaria' && r1b === 'legendaria' && c.rareza === 'legendaria' && st.rz.n === 1 && st.rz.sinLegendaria === 0, JSON.stringify(st.rz));
        // Guardado viejo: sin campo o con valor raro → común; la colección lo lee igual
        check('Partidas viejas: crías sin rareza son comunes', de({ estado: 'nacida', xp: 200 }) === 'comun' && de({ estado: 'nacida', rareza: 'dorada' }) === 'comun' && de(null) === 'comun');
        const col = coleccion({ clasico: { estado: 'nacida', xp: 200 }, tropical: { estado: 'incubando', xp: 30, rareza: 'epica' }, playa: { estado: 'liberada', xp: 1500, rareza: 'rara' }, bosque: { estado: 'nacida', xp: 300, rareza: 'legendaria' } });
        check('Colección: cuenta solo crías nacidas o libres, por rareza', col.comun === 1 && col.rara === 1 && col.epica === 0 && col.legendaria === 1, JSON.stringify(col));
        // Poderes del compañero y Retos
        forzada = 'legendaria'; document.body.classList.remove('retos-on');
        const enRetoYa = enReto();
        check('Legendaria: vuelo ×1,12, vista ×1,5, impulso ×1,12, estela y canto', enRetoYa || (mult('vuelo') === 1.12 && mult('vista') === 1.5 && mult('impulso') === 1.12 && tiene('estela') && tiene('canto')), `${mult('vuelo')}/${mult('vista')}/${mult('impulso')}`);
        forzada = 'comun';
        check('Común: sin multiplicadores, con aura', enRetoYa || (mult('vuelo') === 1 && mult('vista') === 1 && tiene('aura') && !tiene('estela') && !tiene('canto')));
        forzada = 'epica'; const vivo0 = G.fx ? G.fx.live : 0; let estela = false; for (let i = 0; i < 4; i++) estela = paso(0.05, { volando: true }) || estela;
        // Con el cupo de partículas del mundo lleno (MAX_PARTICLES), burst no añade nada: basta con que la estela se haya pedido
        check('Épica: estela de chispas al volar (fx)', enRetoYa || (estela && (!G.fx || G.fx.live > vivo0 || vivo0 >= (G.fx.MAX_PARTICLES || Infinity) - 4)), `${vivo0} → ${G.fx ? G.fx.live : '-'}`);
        check('Sin volar no hay estela', !paso(0.5, { volando: false }));
        forzada = 'legendaria'; let cantos = 0; G.on('canto', d => { if (d && d.poder === 'canto') cantos++; });
        const c1 = canto({ forzar: true }), c2 = canto();
        check('Canto: emite «canto» (bandada) y respeta los 90 s', enRetoYa || (c1 && !c2 && cantos >= 1), `${c1}/${c2}/${cantos}`);
        document.body.classList.add('retos-on');
        check('En el Modo Retos los poderes no cuentan', mult('vuelo') === 1 && mult('vista') === 1 && !tiene('estela') && !tiene('canto') && !canto({ forzar: true }) && !paso(0.5, { volando: true }));
        if (!clase0) document.body.classList.remove('retos-on');
        const dueloPrev = G.duelo, dueloClase = document.body.classList.contains('duelo-on');
        try {
          forzada = 'legendaria';
          G.duelo = { activo: () => true };
          check('En un duelo los poderes no cuentan', mult('vuelo') === 1 && mult('vista') === 1 && mult('impulso') === 1 && !tiene('canto') && !canto({ forzar: true }));
          G.duelo = null;
          document.body.classList.add('duelo-on');
          check('Con la clase duelo-on los poderes no cuentan', mult('vuelo') === 1 && !tiene('estela') && !paso(0.5, { volando: true }));
        } finally {
          if (dueloPrev === undefined) delete G.duelo; else G.duelo = dueloPrev;
          document.body.classList.toggle('duelo-on', dueloClase);
        }
        // Ganchos en el motor: un paso de impulso y uno de crucero (fisica.js). Se restaura la posición.
        if (G.fisica && G.fisica.step && G.input && G.terreno) {
          const F = G.fisica, M = F.MOVE, Sf = G.S;
          const mImp = def('legendaria').mult.impulso, mVue = def('legendaria').mult.vuelo;
          const snap = { x: Sf.pos.x, y: Sf.pos.y, z: Sf.pos.z, vy: Sf.vy, flying: M.flying, landing: M.landing, takeoff: M.takeoff, swimming: M.swimming, grounded: M.grounded, vx: M.vx, vz: M.vz, speed: M.speed, jumping: M.jumping };
          const teniaW = G.input.keys.has('w'), sx = G.input.stick.x, sy = G.input.stick.y;
          const retosAhora = document.body.classList.contains('retos-on'), dueloAhora = document.body.classList.contains('duelo-on');
          const restaurar = () => {
            Sf.pos.x = snap.x; Sf.pos.y = snap.y; Sf.pos.z = snap.z; Sf.vy = snap.vy;
            Object.assign(M, { flying: snap.flying, landing: snap.landing, takeoff: snap.takeoff, swimming: snap.swimming, grounded: snap.grounded, vx: snap.vx, vz: snap.vz, speed: snap.speed, jumping: snap.jumping });
            if (teniaW) G.input.keys.add('w'); else G.input.keys.delete('w');
            G.input.stick.x = sx; G.input.stick.y = sy;
            document.body.classList.toggle('retos-on', retosAhora);
            document.body.classList.toggle('duelo-on', dueloAhora);
          };
          try {
            document.body.classList.remove('retos-on');
            document.body.classList.remove('duelo-on');
            if (enReto()) check('Física: hay un reto activo, los ganchos quedan en 1', mult('vuelo') === 1 && mult('impulso') === 1);
            else {
              const preparar = (id, yExtra) => {
                forzada = id;
                const spn = G.guardado && G.guardado.spawn;
                if (spn) { Sf.pos.x = spn.x; Sf.pos.z = spn.z; }
                Sf.pos.y = G.terreno.height(Sf.pos.x, Sf.pos.z) + yExtra; Sf.vy = 0;
                Object.assign(M, { flying: true, landing: false, takeoff: 0, swimming: false, grounded: false, vx: 0, vz: 0, jumping: false });
              };
              const impulso = id => { preparar(id, 8); M.takeoff = 0.3; F.step(1 / 60, true); return Sf.vy; };
              const vyC = impulso('comun'), vyL = impulso('legendaria');
              check('El impulso de despegue usa mult (legendaria sobre común)', vyC > 0.05 && Math.abs(vyL / vyC - mImp) < 1e-3, `${vyC.toFixed(3)} / ${vyL.toFixed(3)}`);
              const crucero = id => { preparar(id, 12); G.input.stick.x = G.input.stick.y = 0; G.input.keys.add('w'); F.step(1 / 60, false); return M.speed; };
              const spC = crucero('comun'), spL = crucero('legendaria');
              check('El crucero de vuelo usa mult (legendaria sobre común)', spC > 0.05 && Math.abs(spL / spC - mVue) < 1e-3, `${spC.toFixed(3)} / ${spL.toFixed(3)}`);
            }
          } finally { restaurar(); }
        } else check('Física disponible para los ganchos de rareza', false, 'sin fisica.step');
        forzada = null;
        // Aura: sprite por rareza, nunca el modelo
        const au = aura('epica', 1), ac = aura('comun', 1);
        check('Aura: sprite aditivo por rareza (épica más grande que común) y color del nivel', au && ac && au.isSprite && au.userData.base > ac.userData.base && au.material.color.getHexString() === def('epica').color.slice(1).toLowerCase() && au.material.blending === THREE.AdditiveBlending);
        if (au) au.material.dispose(); if (ac) ac.material.dispose();
        // Mis récords: colección por rareza desde la clave del criadero (clave .prueba)
        let Rc = null; try { if (!window.AVRecords) await AVE.assets.script('src/game/records.js'); Rc = window.AVRecords(G); } catch (e) { Rc = null; }
        if (Rc && Rc.CLAVE && Rc.leer) {
          const k0 = Rc.CLAVE.criadero, kp = k0 + '.prueba-rareza';
          try {
            localStorage.setItem(kp, JSON.stringify({ v: 1, capsulas: { clasico: { estado: 'nacida', xp: 200 }, playa: { estado: 'liberada', xp: 1500, rareza: 'rara' }, bosque: { estado: 'nacida', xp: 300, rareza: 'legendaria' } }, fuentes: { aprender: 0, explorar: 0, cuidar: 0 } }));
            Rc.CLAVE.criadero = kp; const d = Rc.leer();
            check('«Mis récords» muestra la colección por rareza (vieja = común)', d.criadero && d.criadero.rarezas && d.criadero.rarezas.comun === 1 && d.criadero.rarezas.rara === 1 && d.criadero.rarezas.legendaria === 1 && d.criadero.lista.every(x => x.rareza), JSON.stringify(d.criadero && d.criadero.rarezas));
          } finally { Rc.CLAVE.criadero = k0; try { localStorage.removeItem(kp); } catch (e) { /* */ } }
        } else check('«Mis récords» disponible para la colección', false, 'sin records.js');
        check('Sin errores de JavaScript nuevos', (window.__aveErrores || []).length === errores0, (window.__aveErrores || []).slice(errores0).join(' | '));
      } catch (e) {
        check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 400));
      } finally { forzada = forz0; G.quiet = quieta; if (!clase0) document.body.classList.remove('retos-on'); }
      const ok = out.every(o => o.ok);
      console[ok ? 'log' : 'warn']('rarezaTest', ok ? 'OK' : 'FALLA', out.filter(o => !o.ok));
      return { ok, passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    const api = G.rareza = { de, def, niveles, nombre, color, asignar, tirar, contar, semilla, mult, tiene, actual, enReto, aura, coleccion, canto, paso, test,
      get forzada() { return forzada; }, set forzada(v) { forzada = v; } };
    // boot.js es del coordinador: la prueba se expone aquí (como saveTest)
    const exponer = n => { const AV = window.AV; if (AV && AV.G === G) { if (!AV.rarezaTest) AV.rarezaTest = o => test(o); } else if (n > 0) setTimeout(() => exponer(n - 1), 500); };
    exponer(40);
    return api;
  };
})();
