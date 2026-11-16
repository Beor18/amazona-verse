/* Juego · Obras que traen vida (Construir 2.0, fase 1; docs/diseno/F3_CONSTRUIR_2.md §§ 3, 4, 5, 8 y 9)
   Kelvin (15-nov): «que las construcciones sean mejores y no tan sencillas». Una obra es una pieza o un grupo de piezas del rincón
   (src/game/construir.js) que el juego reconoce y que desde ese momento hace que el mundo responda:
   - Comedero con visitas: 1 comedero. Al rato (tiempo de juego, nunca reloj real) baja una pareja de cotorras DEL HÁBITAT de ese
     lugar (G.residentes.invitar: especiesEn, nunca las 2 extintas), come y se va. «Mejor» con flores o una bromelia a menos de 3 m:
     vienen antes y se quedan más. Verlas a menos de 8 m durante 2 s las apunta en el Álbum de las 36, como a cualquier residente.
   - Jardín de mariposas: 3 o más flores, bromelias o macetas juntas (cada una a menos de 3 m de otra). Llega una nube de mariposas
     cebra (G.fauna.nube); si Vittata se queda quieta al lado, una se le posa en el pico (ya existe en fauna.js).
   - Caja nido (pieza nueva, solo con la bandera G.F3PIEZAS): una pareja viene a posarse en ella. «Mejor» bajo un techo o junto a un
     árbol (vienen antes); con un comedero a menos de 8 m se quedan más. Es una pieza de juego: no añade ningún dato de naturaleza.
   Reglas: como mucho 2 visitas a la vez por rincón (1 en calidad «bajo» y Modo Escuela; lo cuenta residentes.js), nada si el rincón
   está a más de 130 m. Quitar la pieza apaga la obra: las aves se van volando y las mariposas se van. Nada se pierde ni se muere.
   Al completarse: acorde que ya existe (G.audio «descubrir»), aviso «¡Obra lista: {nombre}!» y, la primera de cada tipo, una frase
   corta con su efecto. «Libro de visitas» (sección del Diario): quién vino y qué lo trajo, sin puntos, sin relojes, sin «vuelve mañana».
   - Se carga a demanda (boot.js) cuando el rincón tiene una pieza que puede formar una obra; escucha G.emit('construirCambio')
     de construir.js. Sin mallas propias: las visitas son aves de residentes.js (2 llamadas de dibujo con la bandada) y mariposas
     de fauna.js. Sin trabajo por cuadro: el detector corre al cambiar el rincón y las visitas se revisan dos veces por segundo.
   - Guardado: aparte de la partida, en el dispositivo (<almacen>.obras = { v: 1, explicadas: [tipo], libro: [{ q, o, n }] });
     el de construir no cambia. Un guardado dañado se lee como vacío.
   - Textos en español; el inglés en content/cap1/en.js (los nombres de las obras y las aves se traducen aquí con G.idioma.tr).
   API (G.obras): lista(), recalcular(motivo), libro(), html(), estado(), piezasNuevas (bandera), test. Prueba: AV.obrasTest(). */
(function () {
  'use strict';
  window.AVObras = function (G) {
    if (G.obras) return G.obras;
    const S = G.S;
    const ALMACEN = (G.pack && G.pack.meta && G.pack.meta.almacen) || (G.pack && G.pack.id) || 'amazonaverse';
    const CLAVE = ALMACEN + '.obras';
    const LEJOS = 130, LEJOS_FUERA = 150, JUNTAS = 3, MEJOR_R = 3, LIBRO_MAX = 80, CADA = 0.5;
    const PASO = Math.PI / 4;
    const esObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
    const finito = v => typeof v === 'number' && isFinite(v);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const H = (x, z) => G.terreno.height(x, z);
    const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const T = s => { try { return G.idioma && G.idioma.tr ? G.idioma.tr(s) : s; } catch (e) { return s; } };
    const enIngles = () => !!((G.idioma && G.idioma.actual && G.idioma.actual() === 'en') || (G.aula && G.aula.aj && G.aula.aj.idioma === 'en'));
    const nuevas = () => G.F3PIEZAS === true;

    // ---------- Tipos de obra ----------
    const OBRAS = {
      comedero: { nombre: 'Comedero con visitas', frase: 'Al rato bajarán cotorras de por aquí a comer. Con flores cerca, vienen antes.' },
      jardin: { nombre: 'Jardín de mariposas', frase: 'Vendrán mariposas cebra. Quédate quieta a su lado y una se te posará en el pico.' },
      cajanido: { nombre: 'Caja nido', frase: 'Una pareja de cotorras vendrá a posarse en ella. Con un comedero cerca, se quedan más.' },
    };
    const FLORES = ['flores', 'bromelia', 'maceta'], TECHOS = ['techo', 'tejado', 'dosaguas'];

    // ---------- Guardado aparte (robusto: lo que no se entiende es vacío) ----------
    let datos = { v: 1, explicadas: [], libro: [] };
    function leerDatos(d) {
      const out = { v: 1, explicadas: [], libro: [] };
      if (!esObj(d) || d.v !== 1) return out;
      if (Array.isArray(d.explicadas)) for (const t of d.explicadas) if (OBRAS[t] && !out.explicadas.includes(t)) out.explicadas.push(t);
      if (Array.isArray(d.libro)) for (const e of d.libro) {
        if (out.libro.length >= LIBRO_MAX) break;
        if (!esObj(e) || typeof e.q !== 'string' || !/^[a-z]{2,20}$/.test(e.q) || !OBRAS[e.o]) continue;
        if (e.q === 'martinicana' || e.q === 'violacea') continue; // las extintas no vienen nunca
        const n = Number.isInteger(e.n) && e.n > 0 && e.n < 1e6 ? e.n : 1;
        if (!out.libro.some(x => x.q === e.q && x.o === e.o)) out.libro.push({ q: e.q, o: e.o, n });
      }
      return out;
    }
    function cargar() {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { d = null; }
      datos = leerDatos(d);
      return datos;
    }
    function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(datos)); return true; } catch (e) { return false; } }
    function apuntar(q, o) {
      if (!q || !OBRAS[o]) return;
      const i = datos.libro.findIndex(x => x.q === q && x.o === o);
      let e;
      if (i >= 0) { e = datos.libro.splice(i, 1)[0]; e.n++; } else { e = { q, o, n: 1 }; if (datos.libro.length >= LIBRO_MAX) datos.libro.pop(); }
      datos.libro.unshift(e); // la última visita, primero
      guardar();
    }
    cargar();

    // ---------- Detector: las piezas del rincón de fuera → obras ----------
    function piezasRincon() {
      const d = S.construir, out = [];
      if (!esObj(d) || d.v !== 1 || !Array.isArray(d.piezas)) return out;
      for (const p of d.piezas) {
        if (!esObj(p) || typeof p.t !== 'string' || !finito(p.x) || !finito(p.z)) continue;
        if (p.t === 'cajanido' && !nuevas()) continue; // bandera apagada: la caja nido no hace nada
        out.push({ t: p.t, x: p.x, z: p.z, r: Number.isInteger(p.r) ? p.r : 0 });
      }
      return out;
    }
    const cerca = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;
    function detectar(ps) {
      const out = [];
      for (const p of ps) if (p.t === 'comedero') out.push({ tipo: 'comedero', x: p.x, z: p.z, r: p.r, mejor: ps.some(q => (q.t === 'flores' || q.t === 'bromelia') && cerca(p, q, MEJOR_R)) });
      // Jardín: grupos de flores, bromelias y macetas unidas (cada una a menos de 3 m de otra del grupo); 3 o más hacen un jardín
      const fl = ps.filter(p => FLORES.includes(p.t)), grupo = fl.map((_, i) => i);
      const raiz = i => { while (grupo[i] !== i) i = grupo[i] = grupo[grupo[i]]; return i; };
      for (let i = 0; i < fl.length; i++) for (let j = i + 1; j < fl.length; j++) if (cerca(fl[i], fl[j], JUNTAS)) grupo[raiz(i)] = raiz(j);
      const gr = {};
      fl.forEach((p, i) => { const k = raiz(i); (gr[k] = gr[k] || []).push(p); });
      for (const k of Object.keys(gr)) {
        const g = gr[k]; if (g.length < 3) continue;
        let x = 0, z = 0; for (const p of g) { x += p.x; z += p.z; }
        out.push({ tipo: 'jardin', x: x / g.length, z: z / g.length, n: g.length, mejor: g.length >= 5 });
      }
      for (const p of ps) if (p.t === 'cajanido') {
        const col = (G.fisica && G.fisica.colliders) || [];
        const arbol = col.some(c => c.r > 0 && c.r < 1.6 && Math.hypot(c.x - p.x, c.z - p.z) < 4);
        out.push({ tipo: 'cajanido', x: p.x, z: p.z, r: p.r, mejor: arbol || ps.some(q => TECHOS.includes(q.t) && cerca(p, q, MEJOR_R)), comedero: ps.some(q => q.t === 'comedero' && cerca(p, q, 8)) });
      }
      return out;
    }
    let obras = [], ultimoAviso = '', ultimaFrase = '';
    function recalcular(motivo) {
      const nuevasObras = detectar(piezasRincon()), usadas = new Set(), listas = [];
      for (const n of nuevasObras) {
        let m = null, bd = 2.5; // la misma obra si es del mismo tipo y está casi en el mismo sitio (el jardín crece y su centro se mueve)
        for (const o of obras) { if (usadas.has(o) || o.tipo !== n.tipo) continue; const d = Math.hypot(o.x - n.x, o.z - n.z); if (d < bd) { bd = d; m = o; } }
        if (m) { usadas.add(m); Object.assign(m, n); listas.push(m); }
        else { const o = Object.assign({ id: ++ids, visita: null, nube: null, espera: 0, vistaNube: false }, n); o.espera = primeraEspera(o); listas.push(o); if (motivo === 'guardar') anunciar(o); }
      }
      for (const o of obras) if (!usadas.has(o)) apagar(o); // la pieza ya no está: la obra se apaga
      obras = listas;
      return obras.length;
    }
    let ids = 0;
    // Tiempo de juego, nunca reloj real: la primera visita llega pronto para que se note; luego, cada un rato
    const primeraEspera = o => (o.mejor ? rnd(6, 10) : rnd(10, 16));
    const otraEspera = o => (o.mejor ? rnd(25, 45) : rnd(45, 80));
    function apagar(o) {
      if (o.visita) { try { o.visita.irse(); } catch (e) { /* ya se fue */ } o.visita = null; }
      if (o.nube) { try { o.nube.quitar(); } catch (e) { /* ya no está */ } o.nube = null; }
    }
    function anunciar(o) {
      const def = OBRAS[o.tipo]; if (!def) return;
      const primera = !datos.explicadas.includes(o.tipo);
      ultimoAviso = T('¡Obra lista: {}!').replace('{}', T(def.nombre));
      ultimaFrase = primera ? T(def.frase) : '';
      if (primera) { datos.explicadas.push(o.tipo); guardar(); }
      if (G.quiet) return;
      try { if (G.audio) G.audio.play('descubrir'); } catch (e) { /* sin audio */ }
      if (G.ui && G.ui.toastHTML) G.ui.toastHTML(`<span data-no-tr><b>${esc(ultimoAviso)}</b>${ultimaFrase ? '<br>' + esc(ultimaFrase) : ''}</span>`, primera ? 4600 : 2600);
    }

    // ---------- Visitas (dos veces por segundo; nada por cuadro) ----------
    const ROT = (r, lx, lz) => { const a = r * PASO, c = Math.cos(a), s = Math.sin(a); return { x: lx * c + lz * s, z: -lx * s + lz * c }; };
    function perchasDe(o) {
      const y0 = H(o.x, o.z), P = [];
      if (o.tipo === 'comedero') for (const lx of [-0.13, 0.13]) { const d = ROT(o.r, lx, 0); P.push({ x: o.x + d.x, z: o.z + d.z, y: y0 + 1.29, tipo: 'copa' }); }
      else if (o.tipo === 'cajanido') {
        const d = ROT(o.r, 0, 0.42), d2 = ROT(o.r, 0.18, 0.42);
        P.push({ x: o.x + d.x, z: o.z + d.z, y: y0 + 2.75, tipo: 'rama' }, { x: o.x + d2.x, z: o.z + d2.z, y: y0 + 2.75, tipo: 'rama' }, { x: o.x, z: o.z - 0.1, y: y0 + 3.4, tipo: 'techo' });
      }
      return P;
    }
    function invitar(o) {
      const R = G.residentes; if (!R || !R.invitar) return null;
      const dur = o.tipo === 'comedero' ? (o.mejor ? 34 : 22) : (o.comedero ? 40 : 26);
      return R.invitar({ x: o.x, z: o.z, perchas: perchasDe(o), dur, obra: o.tipo, alLlegar: sp => apuntar(sp, o.tipo) });
    }
    let acum = 0, prueba = false, faunaPedida = false;
    function paso(dt) {
      const px = S.pos.x, pz = S.pos.z;
      for (const o of obras) {
        const d = Math.hypot(o.x - px, o.z - pz);
        if (o.tipo === 'jardin') {
          if (o.nube && (!o.nube.activa() || d > LEJOS_FUERA)) { if (o.nube.activa()) o.nube.quitar(); o.nube = null; }
          if (!o.nube && d < LEJOS) {
            if (G.fauna && G.fauna.nube) o.nube = G.fauna.nube(o.x, o.z);
            else if (!faunaPedida && window.AV && typeof window.AV.fauna === 'function') { faunaPedida = true; try { window.AV.fauna().catch(() => {}); } catch (e) { /* sin fauna */ } }
          }
          if (o.nube && !o.vistaNube && d < 12) { o.vistaNube = true; apuntar('mariposa', 'jardin'); }
          continue;
        }
        if (o.visita && !o.visita.activa()) { o.visita = null; o.espera = otraEspera(o); }
        if (o.visita || d > LEJOS) continue;
        o.espera -= dt;
        if (o.espera <= 0) { o.visita = invitar(o); if (!o.visita) o.espera = 4; } // sin sitio (tope) o sin residentes: se prueba luego
      }
    }
    G.on('update', (dt, busy) => {
      if (busy || (G.quiet && !prueba) || !obras.length) return;
      acum += Math.min(dt, 0.1);
      if (acum < CADA) return;
      const t = acum; acum = 0; paso(t);
    }, 86);
    G.on('construirCambio', d => recalcular(d && d.motivo));
    G.on('apply', () => { cargar(); recalcular('cargar'); }, 61);
    recalcular('cargar');

    // ---------- Libro de visitas (sección del Diario) ----------
    function nombreDe(q) {
      if (q === 'mariposa') return T('Mariposas cebra');
      const E = window.AV_ESPECIES, e = E && Array.isArray(E.especies) ? E.especies.find(x => x.id === q) : null;
      if (!e || !(G.album && G.album.visto && G.album.visto(q))) return T('Una cotorra que aún no has visto de cerca');
      const l = enIngles() ? 'en' : 'es';
      return (e.comun && e.comun[l]) || e.cientifico || q;
    }
    function html() {
      const L = datos.libro;
      if (!L.length) return '<span class="lbl">Libro de visitas</span><p class="note">Aún no ha venido nadie. Construye un comedero o un jardín de flores y espera un ratito cerca.</p>';
      const filas = L.map(e => {
        const veces = e.n === 1 ? T('Vino 1 vez') : T('Vino {} veces').replace('{}', String(e.n));
        return `<li class="found"><div data-no-tr><b>${esc(nombreDe(e.q))}</b><small>${esc(T('Lo trajo: {}').replace('{}', T(OBRAS[e.o].nombre)))} · ${esc(veces)}</small></div></li>`;
      }).join('');
      return '<span class="lbl">Libro de visitas</span>' +
        `<p class="note" data-no-tr>${esc(T('Hoy vino: {}').replace('{}', nombreDe(L[0].q)))}</p><ul class="diary libro-visitas">${filas}</ul>`;
    }
    if (G.diario && G.diario.seccion) G.diario.seccion({ id: 'libroVisitas', html });

    const estado = () => ({ obras: obras.map(o => ({ id: o.id, tipo: o.tipo, x: o.x, z: o.z, mejor: !!o.mejor, visita: !!o.visita, nube: !!o.nube })),
      visitas: obras.filter(o => o.visita && o.visita.activa()).length, nubes: obras.filter(o => o.nube && o.nube.activa()).length, libro: datos.libro.length });

    // ---------- Prueba: AV.obrasTest() ----------
    async function test() {
      const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
      const C = G.construir, R = G.residentes;
      const cal = G.renderer && G.renderer.calidad;
      const antes = { construir: S.construir ? JSON.parse(JSON.stringify(S.construir)) : S.construir, album: Array.isArray(S.album) ? S.album.slice() : S.album,
        pos: Object.assign({}, S.pos), quiet: G.quiet, f3: G.F3PIEZAS, nivel: cal && cal.nivel, escuela: cal && cal.escuela, guardado: (() => { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } })(), datos: JSON.parse(JSON.stringify(datos)) };
      const ponPiezas = ps => { S.construir = ps.length ? { v: 1, piezas: ps } : null; if (C) C.aplicar(S.construir); recalcular('guardar'); };
      const tipos = () => obras.map(o => o.tipo).sort().join(',');
      try {
        G.quiet = true; prueba = true;
        if (cal) { cal.nivel = 'medio'; cal.escuela = false; }
        // Un sitio en tierra junto a Vittata (las obras no se validan: el detector solo lee las piezas)
        const x0 = Math.round(S.pos.x), z0 = Math.round(S.pos.z);
        const P = (t, dx, dz, r) => ({ t, x: x0 + dx, z: z0 + dz, r: r || 0 });
        datos = leerDatos(null); guardar();
        // 1. Reconoce cada obra
        ponPiezas([P('comedero', 3, 0)]);
        check('Comedero con visitas: 1 comedero es una obra', tipos() === 'comedero' && !obras[0].mejor, tipos());
        check('Aviso «¡Obra lista: Comedero con visitas!» y, la primera vez, su frase corta', ultimoAviso === '¡Obra lista: Comedero con visitas!' && ultimaFrase === OBRAS.comedero.frase, ultimoAviso + ' | ' + ultimaFrase);
        ponPiezas([P('comedero', 3, 0), P('flores', 5, 0)]);
        check('Comedero «mejor» con flores a menos de 3 m', tipos() === 'comedero' && obras[0].mejor);
        ponPiezas([P('comedero', 3, 0), P('flores', 7, 0)]);
        check('Flores a más de 3 m no lo mejoran', tipos() === 'comedero' && !obras[0].mejor);
        ponPiezas([P('flores', -3, 0), P('bromelia', -5, 0)]);
        check('Dos flores no son jardín', tipos() === '', tipos());
        ponPiezas([P('flores', -3, 0), P('bromelia', -5, 0), P('maceta', -4, 2)]);
        check('Jardín de mariposas: 3 flores, bromelias o macetas juntas', tipos() === 'jardin' && obras[0].n === 3, tipos());
        ponPiezas([P('flores', -3, 0), P('bromelia', -5, 0), P('maceta', -4, 2), P('flores', -3, -2)]);
        const unJardin = obras.length === 1 && obras[0].n === 4;
        ponPiezas([P('flores', -3, 0), P('bromelia', -5, 0), P('maceta', -14, 2)]);
        check('El jardín crece con más flores (sigue siendo uno) y se apaga si se separan', unJardin && tipos() === '', tipos());
        // 2. Anuncios: la segunda obra del mismo tipo ya no explica
        ponPiezas([]); ponPiezas([P('comedero', 3, 0)]);
        check('La segunda vez el aviso sale sin la frase (ya se explicó)', ultimoAviso === '¡Obra lista: Comedero con visitas!' && ultimaFrase === '' && datos.explicadas.includes('comedero'));
        ultimoAviso = ''; C.aplicar(S.construir); recalcular('cargar');
        check('Al cargar la partida no hay aviso (solo al construir)', ultimoAviso === '');
        // 3. Visitas reales: residentes.js invita a una pareja del hábitat
        const okR = !!(R && R.invitar);
        check('residentes.js tiene invitar({ x, z })', okR);
        if (okR) {
          R.prueba(true); R.reiniciar();
          ponPiezas([P('comedero', 3, 0), P('flores', 5, 0)]);
          const o = obras[0]; o.espera = 0; paso(CADA);
          const inv = R.invitados(), pool = R.especiesEn(o.x, o.z);
          check('Comedero: llega una pareja de una especie del hábitat del lugar', !!o.visita && inv.length === 1 && inv[0].aves === 2 && pool.includes(inv[0].sp), JSON.stringify(inv) + ' / ' + pool.join(','));
          // nunca una extinta y siempre del hábitat, en cada colonia del mapa
          const malas = [];
          for (const c of R.colonias()) {
            Object.assign(S.pos, { x: c.x + 2, z: c.z }); R.reiniciar();
            for (let k = 0; k < 6; k++) {
              const h = R.invitar({ x: c.x, z: c.z, perchas: [] });
              if (!h) { malas.push(c.id + ' sin visita'); break; }
              const pc = R.poolDe(c);
              if (R.EXTINTAS.includes(h.sp) || !(pc.includes(h.sp) || (pc.length === 0 && h.sp === 'vittata'))) malas.push(c.id + ':' + h.sp);
              R.reiniciar();
            }
          }
          check('En cada lugar del mapa la visita es de su hábitat (MUNDO_VIVO_ECOLOGIA) y nunca una de las 2 extintas', !malas.length && R.colonias().length > 0, malas.join(' ') || R.colonias().length + ' lugares');
          Object.assign(S.pos, antes.pos); R.reiniciar();
          // tope: 2 por rincón (1 en bajo y Modo Escuela), 3 en el mapa, nada a más de 130 m
          const xs = S.pos.x + 3, zs = S.pos.z;
          const a1 = R.invitar({ x: xs, z: zs }), a2 = R.invitar({ x: xs + 1, z: zs }), a3 = R.invitar({ x: xs, z: zs + 1 });
          check('Tope: 2 visitas a la vez por rincón', !!a1 && !!a2 && !a3);
          R.reiniciar(); cal.nivel = 'bajo';
          const b1 = R.invitar({ x: xs, z: zs }), b2 = R.invitar({ x: xs + 1, z: zs });
          cal.nivel = 'medio'; R.reiniciar(); cal.escuela = true;
          const e1 = R.invitar({ x: xs, z: zs }), e2 = R.invitar({ x: xs + 1, z: zs });
          cal.escuela = false; R.reiniciar();
          check('Tope: 1 en calidad «bajo» y 1 en Modo Escuela', !!b1 && !b2 && !!e1 && !e2);
          const lejos = R.invitar({ x: S.pos.x + 131, z: S.pos.z });
          check('Nada si el rincón está a más de 130 m', !lejos && R.invitados().length === 0);
          // llegan, comen, se apuntan en el Libro y en el Álbum (verlas a menos de 8 m durante 2 s), y se van
          S.album = (Array.isArray(S.album) ? S.album : []).slice(); S.pos.y = H(S.pos.x, S.pos.z);
          ponPiezas([P('comedero', 3, 0), P('flores', 5, 0)]);
          const ob = obras[0]; ob.espera = 0; paso(CADA);
          const sp = ob.visita && ob.visita.sp;
          S.album = S.album.filter(id => id !== sp); R.olvidar();
          let llego = false;
          for (let t = 0; t < 14; t += 0.1) { R.paso(0.1, 'sin-dibujo'); if (ob.visita && ob.visita.fase() === 'posada') { llego = true; break; } }
          for (let t = 0; t < 3; t += 0.1) R.paso(0.1, 'sin-dibujo');
          const enLibro = datos.libro.some(e => e.q === sp && e.o === 'comedero');
          check('La pareja llega volando, se posa en el comedero y queda en el Libro de visitas', llego && enLibro, JSON.stringify({ llego, sp, libro: datos.libro }));
          check('Verla de cerca la apunta en el Álbum como a cualquier residente', !!sp && G.album && G.album.visto(sp), sp);
          // 4. Quitar la pieza apaga la obra: las aves se van volando
          const h0 = ob.visita;
          ponPiezas([P('flores', 5, 0)]);
          check('Quitar el comedero apaga la obra y la visita se va volando', obras.length === 0 && !!h0 && h0.fase() === 'seva');
          for (let t = 0; t < 22; t += 0.25) R.paso(0.25, 'sin-dibujo');
          check('Al irse lejos, la visita se borra (no queda nada)', R.invitados().length === 0 && !h0.activa());
          R.reiniciar();
        }
        // 5. Jardín: nube de mariposas cebra en fauna.js, y se va al quitar las flores
        if (!G.fauna && window.AV && typeof window.AV.fauna === 'function') { try { await window.AV.fauna(); } catch (e) { /* sin fauna */ } }
        if (G.fauna && G.fauna.nube) {
          ponPiezas([P('flores', -3, 0), P('bromelia', -5, 0), P('maceta', -4, 2)]);
          paso(CADA);
          const conNube = obras[0] && obras[0].nube && G.fauna.MAR.nubes.some(n => n.obra);
          ponPiezas([P('flores', -3, 0)]);
          check('Jardín: llega una nube de mariposas cebra (fauna.js) y se va al quitar las flores', conNube && !G.fauna.MAR.nubes.some(n => n.obra), JSON.stringify({ conNube }));
          check('Las mariposas quedan en el Libro de visitas', datos.libro.some(e => e.q === 'mariposa' && e.o === 'jardin'));
          const n1 = G.fauna.nube(1e4, 1e4), n2 = G.fauna.nube(1e4 + 50, 1e4), n3 = G.fauna.nube(1e4 + 90, 1e4);
          check('fauna.nube: como mucho 2 nubes de jardín a la vez', !!n1 && !!n2 && !n3);
          if (n1) n1.quitar(); if (n2) n2.quitar();
        } else check('Jardín (fauna.js no está en este pack: no se prueba)', true, 'sin fauna');
        // 6. Bandera: las piezas nuevas (caja nido, Merendero) apagadas por defecto
        G.F3PIEZAS = false; C.refrescar();
        ponPiezas([P('cajanido', 0, 4)]);
        const apagada = !C.tiene('cajanido') && !C.disponibles().includes('cajanido') && !C.plantilla('merendero') && !C.piezas().some(p => p.t === 'cajanido') &&
          tipos() === '' && !!S.construir && S.construir.piezas.some(p => p.t === 'cajanido');
        C.contexto(null); // guarda (con la apartada) y vuelve a leer
        const sigue = !!S.construir && S.construir.piezas.some(p => p.t === 'cajanido');
        check('Bandera apagada (por defecto): sin caja nido ni Merendero, la caja nido no es obra y la de la partida se guarda tal cual', antes.f3 !== true && apagada && sigue, JSON.stringify({ f3: antes.f3, apagada, sigue }));
        G.F3PIEZAS = true; C.refrescar(); C.aplicar(S.construir); recalcular('guardar');
        check('Bandera encendida: la caja nido sale, es obra «Caja nido» y el Merendero está entre las plantillas', C.tiene('cajanido') && C.piezas().some(p => p.t === 'cajanido') && tipos() === 'cajanido' && C.PLANTILLAS_F3.includes('merendero') && ultimoAviso === '¡Obra lista: Caja nido!', tipos() + ' ' + ultimoAviso);
        if (R && R.invitar) {
          R.reiniciar(); const o = obras[0]; o.espera = 0; paso(CADA);
          const iv = R.invitados();
          check('Caja nido: viene una pareja del hábitat a posarse', iv.length === 1 && R.especiesEn(o.x, o.z).includes(iv[0].sp) && !R.EXTINTAS.includes(iv[0].sp));
          ponPiezas([]);
          check('Quitar la caja nido la apaga', obras.length === 0 && R.invitados().every(v => v.fase === 'seva'));
          R.reiniciar();
        }
        G.F3PIEZAS = antes.f3; C.refrescar();
        // 7. Guardado aparte y robusto
        localStorage.setItem(CLAVE, '{roto'); cargar();
        const roto = datos.libro.length === 0 && datos.explicadas.length === 0;
        localStorage.setItem(CLAVE, JSON.stringify({ v: 1, explicadas: ['nada', 'jardin'], libro: [{ q: 'violacea', o: 'comedero', n: 2 }, { q: 'vittata', o: 'otra' }, { q: 'vittata', o: 'comedero', n: -4 }, 7] })); cargar();
        const raro = datos.libro.length === 1 && datos.libro[0].q === 'vittata' && datos.libro[0].n === 1 && datos.explicadas.join() === 'jardin';
        localStorage.setItem(CLAVE, JSON.stringify({ v: 9, libro: [{ q: 'vittata', o: 'comedero', n: 1 }] })); cargar();
        check('Guardado dañado = vacío (y lo raro se descarta: nunca las extintas)', roto && raro && datos.libro.length === 0, JSON.stringify({ roto, raro }));
        check('El guardado de construir no cambia de formato ({ v: 1, piezas: [{ t, x, z, r }] })', !S.construir || (S.construir.v === 1 && S.construir.piezas.every(p => Object.keys(p).sort().join() === 'r,t,x,z')));
        // 8. Libro de visitas en el Diario: quién vino y qué lo trajo, sin puntos ni relojes
        datos = leerDatos({ v: 1, explicadas: [], libro: [{ q: 'mariposa', o: 'jardin', n: 3 }, { q: 'vittata', o: 'comedero', n: 1 }] });
        const div = document.createElement('div'); div.innerHTML = html();
        const txt = div.textContent;
        check('Libro de visitas: quién vino y qué lo trajo', /Libro de visitas/.test(txt) && /Mariposas cebra/.test(txt) && /Lo trajo: Jardín de mariposas/.test(txt) && /Lo trajo: Comedero con visitas/.test(txt) && /Hoy vino: Mariposas cebra/.test(txt), txt.slice(0, 200));
        check('Sin puntos, sin relojes, sin «vuelve mañana»', !/punto|\d{1,2}:\d{2}|mañana|reloj|vuelve/i.test(txt));
        datos = leerDatos(null); div.innerHTML = html();
        check('Libro vacío: dice cómo traer la primera visita', /Aún no ha venido nadie/.test(div.textContent));
        // 9. Inglés: cada texto nuevo tiene su entrada en content/cap1/en.js
        const EN = window.AV_EN;
        const textos = ['¡Obra lista: {}!', 'Libro de visitas', 'Hoy vino: {}', 'Lo trajo: {}', 'Vino 1 vez', 'Vino {} veces', 'Mariposas cebra', 'Una cotorra que aún no has visto de cerca', 'Merendero', 'Caja nido',
          'Aún no ha venido nadie. Construye un comedero o un jardín de flores y espera un ratito cerca.'].concat(...Object.keys(OBRAS).map(k => [OBRAS[k].nombre, OBRAS[k].frase]));
        if (EN) { const faltan = textos.filter(t => !EN[t]); check('Cada texto nuevo tiene su inglés en content/cap1/en.js', !faltan.length, faltan.join(' | ')); }
        else check('Inglés (el diccionario solo se baja en EN: no se comprueba aquí)', true, 'sin AV_EN');
        check('Sin mallas propias: las visitas usan las de residentes.js y fauna.js', !G.renderer.scene.getObjectByName('obras'));
      } catch (e) {
        check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 400));
      } finally {
        prueba = false;
        for (const o of obras) apagar(o);
        obras = [];
        if (R && R.reiniciar) { R.reiniciar(); R.prueba(false); }
        if (cal) { cal.nivel = antes.nivel; cal.escuela = antes.escuela; }
        G.F3PIEZAS = antes.f3; if (C) C.refrescar();
        S.album = antes.album; Object.assign(S.pos, antes.pos);
        S.construir = antes.construir; if (C) C.aplicar(S.construir);
        try { if (antes.guardado == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, antes.guardado); } catch (e) { /* */ }
        datos = leerDatos(antes.datos);
        recalcular('cargar');
        G.quiet = antes.quiet;
      }
      check('Limpieza: la partida queda como estaba', JSON.stringify(S.construir) === JSON.stringify(antes.construir));
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    G.obras = { lista: () => obras.map(o => ({ tipo: o.tipo, x: o.x, z: o.z, mejor: !!o.mejor })), recalcular, libro: () => datos.libro.map(e => Object.assign({}, e)), html, estado, OBRAS,
      get piezasNuevas() { return nuevas(); }, test };
    return G.obras;
  };
})();
