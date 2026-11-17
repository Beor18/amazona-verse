/* Juego · E19 · Logros visibles en «Mis récords» (TAREAS_WEB, bloque E, punto 19: «10 nuevos, ganados jugando, con icono»).
   Diez logros que se ganan jugando (nunca comprando), cada uno con su icono (SVG en la página, sin descargas), su estado
   (ganado o pendiente) y una pista de cómo conseguirlo. Nada de relojes, rachas ni presión: se ganan cuando se ganan.
   - Solo leen datos que ya existen (no cambian ningún formato):
     · «Más juegos»: <almacen>.canto / .semillas / .compas / .sigueme / .foto / .sembradora ({ mejor, perfecto… }).
     · Duelos: progreso V18 (<almacen>.v18: mundo.duelos_ganados, otorgados.combate_1 y otorgados.duelo_gana_<especie>).
     · Construir y obras: G.S.construir.piezas (la partida) y <almacen>.obras ({ explicadas, libro }, obras.js).
     · Álbum de las 36: G.S.album (sin las 2 extintas, que no se «ven»).
     · Poderes: mundo.poder_rafaga / poder_ojo / poder_planeo y mundo.superplaneo (E18, poderes_extra.js).
   - Guardado aparte, en el dispositivo: <almacen>.logros = { v: 1, ganados: { <id>: fecha (ms) } }. Uno dañado se lee como vacío.
     Lo ganado queda ganado aunque luego cambien los datos. La primera vez (sin clave, o dañada) se apuntan en silencio los que ya
     se tenían, para no llenar la pantalla de avisos. «Nuevo estudiante» borra la clave (boot.js).
   - Aviso al ganar uno: «¡Logro: {}! Míralo en «Mis récords».» con el sonido «logro» (ya existe). Varios a la vez: un solo aviso.
   - Sin trabajo por cuadro: se revisa cada 4 s (y enseguida tras los eventos v18poder, v18superplaneo, album, construirCambio y
     retosResultado); con G.quiet (las baterías) no se revisa.
   - Textos en español aquí; el inglés en content/cap1/en.js (G.idioma.tr; «Mis récords» usa su t18 con el mismo diccionario).
   boot.js lo carga en el primer gesto y antes de records.js. API: G.logros = { DEF, CLAVE, estado, revisar, libro, html, test }.
   Prueba: dentro de AV.recordsTest() (y AV.logrosTest()). */
(function () {
  'use strict';
  window.AVLogros = function (G) {
    if (G.logros) return G.logros;
    const ALM = (G.pack && G.pack.meta && G.pack.meta.almacen) || (G.pack && G.pack.id) || 'amazonaverse';
    const CLAVE = { logros: ALM + '.logros', v18: ALM + '.v18', obras: ALM + '.obras', canto: ALM + '.canto', semillas: ALM + '.semillas',
      compas: ALM + '.compas', sigueme: ALM + '.sigueme', foto: ALM + '.foto', sembradora: ALM + '.sembradora' };
    const JUEGOS = ['canto', 'semillas', 'compas', 'sigueme', 'foto', 'sembradora'];
    const EXTINTAS = ['martinicana', 'violacea'];
    const CADA = 4;
    const esObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
    const ent = (v, max) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max || 1e6) : 0; };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const T = s => { try { return G.idioma && G.idioma.tr ? G.idioma.tr(s) : s; } catch (e) { return s; } };
    const mem = {};
    function leerRaw(k) { try { const v = localStorage.getItem(k); if (v != null) return v; } catch (e) { /* sin almacén */ } return mem[k] == null ? null : mem[k]; }
    function escribir(k, v) { try { localStorage.setItem(k, v); delete mem[k]; } catch (e) { mem[k] = v; } }
    function leer(k) { try { const d = JSON.parse(leerRaw(k) || 'null'); return esObj(d) ? d : null; } catch (e) { return null; } }

    // Iconos: trazos sencillos en un SVG de 24×24 que toma el color del texto (currentColor)
    const svg = d => `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
    const DEF = [
      { id: 'juegos', meta: 3, nombre: 'Probador de juegos', pista: 'Consigue récord en 3 juegos de «Más juegos»', v: d => d.juegos,
        icono: svg('<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="15.5" cy="11.5" r="1"/><circle cx="18" cy="14" r="1"/>') },
      { id: 'semillas', meta: 25, nombre: 'Lluvia de semillas', pista: 'Atrapa 25 semillas en «Semillas al vuelo»', v: d => d.semillas,
        icono: svg('<path d="M12 3c4 4 6 7.5 6 10.5a6 6 0 0 1-12 0C6 10.5 8 7 12 3z"/><path d="M12 9.5v7"/>') },
      { id: 'foto', meta: 1, nombre: 'Rollo perfecto', pista: 'Haz un rollo perfecto en «Foto relámpago»', v: d => d.fotoPerfecto,
        icono: svg('<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8 7l1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="3.5"/>') },
      { id: 'duelo', meta: 1, nombre: 'Primera victoria', pista: 'Gana tu primer duelo', v: d => d.duelos,
        icono: svg('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8"/>') },
      { id: 'bandada', meta: 3, nombre: 'Bandada campeona', pista: 'Gana duelos con 3 cotorras distintas', v: d => d.duelosCon,
        icono: svg('<path d="M2 8c2-2 4-2 5 0c1-2 3-2 5 0M12 14c2-2 4-2 5 0c1-2 3-2 5 0M4 19c1.5-1.5 3-1.5 4 0c1-1.5 2.5-1.5 4 0"/>') },
      { id: 'constructor', meta: 10, nombre: 'Manos a la obra', pista: 'Pon 10 piezas en tu rincón de Construir', v: d => d.piezas,
        icono: svg('<rect x="3" y="13" width="8" height="6" rx="1"/><rect x="13" y="13" width="8" height="6" rx="1"/><rect x="8" y="6" width="8" height="6" rx="1"/>') },
      { id: 'obra', meta: 1, nombre: 'Obra con vida', pista: 'Construye un comedero o un jardín de 3 flores', v: d => d.obras,
        icono: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M12 18c-3-2-4-3.5-4-5a2 2 0 0 1 4-.5a2 2 0 0 1 4 .5c0 1.5-1 3-4 5z"/>') },
      { id: 'album', meta: 5, nombre: 'Ojo de pajarero', pista: 'Ve de cerca 5 especies para el Álbum de las 36', v: d => d.album,
        icono: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 8h6M9 12h6"/>') },
      { id: 'poderes', meta: 3, nombre: 'Tres poderes', pista: 'Gana la Ráfaga, el Ojo de cotorra y el Planeo largo', v: d => d.poderes,
        icono: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>') },
      { id: 'super', meta: 1, nombre: 'Súper planeo', pista: 'Usa la Ráfaga durante un Planeo largo', v: d => d.superplaneo,
        icono: svg('<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>') },
    ];
    const IDS = DEF.map(l => l.id);

    // Lo que ya existe, leído sin escribir nada. o.S: una partida simulada (pruebas y «Mis récords» de prueba)
    function datos(o) {
      const s = (o && o.S) || simS || G.S || {};
      const v = leer(CLAVE.v18), mu = v && esObj(v.mundo) ? v.mundo : {}, ot = v && esObj(v.otorgados) ? v.otorgados : {};
      const rec = k => { const d = leer(CLAVE[k]); return d && Number.isInteger(d.mejor) && d.mejor > 0 ? d : null; };
      const se = rec('semillas'), fo = rec('foto'), ob = leer(CLAVE.obras);
      const album = Array.isArray(s.album) ? s.album.filter((id, i, a) => typeof id === 'string' && !EXTINTAS.includes(id) && a.indexOf(id) === i).length : 0;
      return {
        juegos: JUEGOS.filter(rec).length,
        semillas: se ? ent(se.mejor, 9999) : 0,
        fotoPerfecto: fo ? ent(fo.perfecto, 9999) : 0,
        duelos: ent(mu.duelos_ganados, 9999) || (ot.combate_1 === true ? 1 : 0),
        duelosCon: Object.keys(ot).filter(k => ot[k] === true && /^duelo_gana_[a-z]{3,24}$/.test(k)).length,
        piezas: esObj(s.construir) && Array.isArray(s.construir.piezas) ? Math.min(s.construir.piezas.length, 9999) : 0,
        obras: ob ? Math.max(Array.isArray(ob.explicadas) ? ob.explicadas.filter(t => typeof t === 'string').length : 0, Array.isArray(ob.libro) && ob.libro.length ? 1 : 0) : 0,
        album,
        poderes: ['rafaga', 'ojo', 'planeo'].filter(id => ent(mu['poder_' + id]) > 0).length,
        superplaneo: ent(mu.superplaneo, 9999),
      };
    }
    // El libro de logros (dañado = vacío; solo ids conocidos con fecha válida)
    function libro() {
      const d = leer(CLAVE.logros), ok = !!d && d.v === 1 && esObj(d.ganados), ganados = Object.create(null); // sin prototipo: «constructor» es un id
      if (ok) for (const id of IDS) { const t = Object.prototype.hasOwnProperty.call(d.ganados, id) ? Number(d.ganados[id]) : 0; if (Number.isFinite(t) && t > 0) ganados[id] = t; }
      return { valido: ok, ganados };
    }
    // Cada logro con su estado para «Mis récords»: ganado si está en el libro o si ya se cumple
    function estado(o) {
      const d = datos(o), g = libro().ganados;
      return DEF.map(l => { const val = Math.max(0, Math.min(l.v(d) || 0, l.meta)); return { id: l.id, nombre: l.nombre, pista: l.pista, icono: l.icono, meta: l.meta, valor: val, ganado: !!g[l.id] || val >= l.meta }; });
    }
    function avisar(nuevos) {
      if (G.quiet || !nuevos.length) return;
      const txt = nuevos.length === 1 ? T('¡Logro: {}! Míralo en «Mis récords».').replace('{}', T(nuevos[0].nombre)) : T('¡{} logros nuevos! Míralos en «Mis récords».').replace('{}', nuevos.length);
      try { if (G.ui && G.ui.toast) G.ui.toast(txt, 4200); } catch (e) { /* sin ui */ }
      try { if (G.audio && (!G.audio.has || G.audio.has('logro'))) G.audio.play('logro'); } catch (e) { /* sin audio */ }
    }
    // Apunta los que ya se cumplen y no estaban; devuelve los nuevos. Sin libro válido: los apunta en silencio (primera vez)
    function revisar(o) {
      const d = datos(o), lb = libro(), nuevos = DEF.filter(l => !lb.ganados[l.id] && (l.v(d) || 0) >= l.meta);
      if (nuevos.length || !lb.valido) {
        const ahora = Date.now();
        for (const l of nuevos) lb.ganados[l.id] = ahora;
        escribir(CLAVE.logros, JSON.stringify({ v: 1, ganados: lb.ganados }));
        if (lb.valido && !(o && o.callado)) avisar(nuevos);
      }
      return nuevos.map(l => l.id);
    }
    // La sección de «Mis récords» (tr: el traductor de records.js, t18)
    function html(o) {
      const tr = (o && o.tr) || T, lista = estado(o), n = lista.filter(l => l.ganado).length;
      const item = l => `<li class="rec-logro${l.ganado ? ' ganado' : ''}" data-logro="${l.id}"><span class="rl-ico">${l.icono}</span><span class="rl-txt"><b>${esc(tr(l.nombre))}</b>` +
        `<small>${l.ganado ? esc(tr('¡Ganado!')) : esc(tr(l.pista)) + (l.meta > 1 ? ` <span class="rl-n">${l.valor}/${l.meta}</span>` : '')}</small></span>` +
        `<span class="rl-estado">${esc(tr(l.ganado ? 'Ganado' : 'Pendiente'))}</span></li>`;
      return `<section class="rec-sec" id="rec-logros" aria-labelledby="rec-h-logros"><h3 id="rec-h-logros">${esc(tr('Mis logros'))} <small>${esc(tr('{} de {}').replace('{}', n).replace('{}', lista.length))} · ${esc(tr('Se ganan jugando.'))}</small></h3>` +
        `<ul class="rec-logros">${lista.map(item).join('')}</ul></section>`;
    }
    const CSS = `#records .rec-logros { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr)); gap: var(--sp-2); }
#records .rec-logro { display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; align-items: center; gap: var(--sp-2); min-height: 64px; padding: var(--sp-2) var(--sp-3); background: #f3efe6; border: 2px dashed #cfc7b4; border-radius: var(--r-md); }
#records .rec-logro .rl-ico { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; background: #e6e0d2; color: #8a8270; }
#records .rec-logro .rl-txt { display: grid; gap: 2px; min-width: 0; } #records .rec-logro b { font: 700 var(--fs-sm)/1.2 var(--font-display); color: var(--c-ink); overflow-wrap: anywhere; }
#records .rec-logro small { font: 500 var(--fs-xs)/1.3 var(--font-body); color: var(--c-ink-muted); overflow-wrap: anywhere; } #records .rec-logro .rl-n { font-weight: 700; font-variant-numeric: tabular-nums; }
#records .rec-logro .rl-estado { font: 700 var(--fs-xs)/1 var(--font-display); color: var(--c-ink); border: 1px solid #cfc7b4; padding: 4px 8px; border-radius: var(--r-pill); background: #fff; white-space: nowrap; }
#records .rec-logro.ganado { background: #fff8e0; border: 2px solid #e2b84a; } #records .rec-logro.ganado .rl-ico { background: radial-gradient(circle at 35% 30%, #fff8d8, #ffd24a 50%, #c98a10); color: #4a2a05; box-shadow: 0 0 0 3px #fff; }
#records .rec-logro.ganado .rl-estado { color: #fff; background: #17572a; border-color: #17572a; }
@media (max-width: 400px) { #records .rec-logro { grid-template-columns: 44px minmax(0, 1fr); } #records .rec-logro .rl-ico { width: 44px; height: 44px; } #records .rec-logro .rl-estado { grid-column: 2; justify-self: start; } }`;

    // Revisión cada CADA s (sin asignaciones por cuadro) y enseguida tras los eventos que pueden dar un logro
    let espera = CADA, enPrueba = false, simS = null; // simS: partida simulada solo durante la prueba
    function paso(dt) { if ((espera -= dt || 0) > 0) return; espera = CADA; if (G.quiet || enPrueba) return; try { revisar(); } catch (e) { /* datos raros: la próxima vez */ } }
    const pronto = () => { if (espera > 0.8) espera = 0.8; };
    if (G.on) { G.on('update', paso); for (const ev of ['v18poder', 'v18superplaneo', 'album', 'construirCambio', 'retosResultado', 'v18']) G.on(ev, pronto); }

    // ---------- Prueba (también la llama AV.recordsTest) ----------
    async function test() {
      const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
      const orig = Object.assign({}, CLAVE), q0 = G.quiet, ui0 = G.ui && G.ui.toast, au = G.audio, play0 = au && au.play, avisos = [], sonidos = [];
      const quitar = () => { for (const k of Object.keys(orig)) { try { localStorage.removeItem(orig[k] + '.prueba'); } catch (e) { /* */ } delete mem[orig[k] + '.prueba']; } };
      const pon = (k, v) => escribir(CLAVE[k], typeof v === 'string' ? v : JSON.stringify(v));
      const realAntes = leerRaw(orig.logros);
      enPrueba = true;
      try {
        quitar(); for (const k of Object.keys(orig)) CLAVE[k] = orig[k] + '.prueba';
        G.quiet = false; if (G.ui) G.ui.toast = t => { avisos.push(String(t)); }; if (au && play0) au.play = n => { sonidos.push(n); };
        const sim = { S: { construir: null, album: [] } };
        check('E19 · Hay 10 logros, cada uno con icono SVG en la página (sin descargas), nombre y pista', DEF.length === 10 && new Set(IDS).size === 10 && DEF.every(l => /^<svg [^>]*viewBox="0 0 24 24"/.test(l.icono) && !/https?:|xlink:href|<image/.test(l.icono) && l.nombre && l.pista && l.meta >= 1));
        check('E19 · Nada se compra: sin precio, tienda ni dinero', DEF.every(l => !('precio' in l)) && !/compra|tienda|precio|\$|€|conchita/i.test(DEF.map(l => l.nombre + ' ' + l.pista).join(' ')));
        // Guardado dañado = vacío; la primera vez apunta en silencio lo que ya se tenía
        pon('logros', 'basura{');
        check('E19 · Guardado dañado (no es JSON) se lee vacío', !libro().valido && !Object.keys(libro().ganados).length && estado(sim).every(l => !l.ganado));
        pon('logros', { v: 1, ganados: { juegos: 'x', inventado: 5, semillas: -3 } });
        check('E19 · Guardado con datos raros: solo cuentan ids conocidos con fecha válida', libro().valido && !Object.keys(libro().ganados).length);
        pon('logros', { v: 7, ganados: { juegos: 5 } });
        check('E19 · Otra versión del guardado se lee vacía', !libro().valido && !libro().ganados.juegos);
        pon('v18', { v: 2, mundo: { poder_rafaga: 1, poder_ojo: 1, poder_planeo: 1 }, otorgados: {} });
        avisos.length = 0; const prim = revisar(sim);
        check('E19 · Sin libro válido, lo que ya se tenía se apunta en silencio (sin llenar la pantalla de avisos)', prim.join() === 'poderes' && !avisos.length && libro().valido && libro().ganados.poderes > 0, prim.join() + ' · ' + avisos.join('|'));
        // Cada logro por su camino (y su aviso, uno cada vez)
        pon('logros', { v: 1, ganados: {} }); pon('v18', { v: 2, mundo: {}, otorgados: {} });
        const caminos = [
          ['juegos', () => { pon('canto', { v: 1, mejor: 4 }); pon('compas', { v: 1, mejor: 80 }); }, () => pon('sigueme', { v: 1, mejor: 12 })],
          ['semillas', () => pon('semillas', { v: 1, mejor: 24 }), () => pon('semillas', { v: 1, mejor: 25 })],
          ['foto', () => pon('foto', { v: 1, mejor: 9, perfecto: 0 }), () => pon('foto', { v: 1, mejor: 12, perfecto: 1 })],
          ['duelo', null, () => pon('v18', { v: 2, mundo: { duelos_ganados: 1 }, otorgados: { duelo_gana_vittata: true } })],
          ['bandada', () => pon('v18', { v: 2, mundo: { duelos_ganados: 3 }, otorgados: { duelo_gana_vittata: true, duelo_gana_oratrix: true, duelo_gana_x: true } }),
            () => pon('v18', { v: 2, mundo: { duelos_ganados: 3 }, otorgados: { duelo_gana_vittata: true, duelo_gana_oratrix: true, duelo_gana_agilis: true } })],
          ['constructor', () => { sim.S.construir = { v: 1, piezas: new Array(9).fill({ t: 'piso', x: 0, z: 0, r: 0 }) }; }, () => { sim.S.construir.piezas.push({ t: 'techo', x: 0, z: 0, r: 0 }); }],
          ['obra', () => pon('obras', { v: 1, explicadas: [], libro: [] }), () => pon('obras', { v: 1, explicadas: ['comedero'], libro: [] })],
          ['album', () => { sim.S.album = ['vittata', 'oratrix', 'agilis', 'martinicana', 'violacea', 'oratrix']; }, () => { sim.S.album.push('leucocephala', 'ventralis'); }],
          ['poderes', () => pon('v18', Object.assign(leer(CLAVE.v18), { mundo: { duelos_ganados: 3, poder_rafaga: 1, poder_ojo: 1 } })),
            () => { const v = leer(CLAVE.v18); v.mundo.poder_planeo = 1; pon('v18', v); }],
          ['super', null, () => { const v = leer(CLAVE.v18); v.mundo.superplaneo = 1; pon('v18', v); }],
        ];
        for (const [id, casi, ya] of caminos) {
          const l = DEF.find(x => x.id === id);
          avisos.length = 0; sonidos.length = 0;
          let antes = [];
          if (casi) { casi(); antes = revisar(sim); }
          ya(); const r = revisar(sim), otra = revisar(sim);
          check(`E19 · «${l.nombre}» se gana por su camino (${l.pista}) y avisa una vez`, !antes.length && r.join() === id && !otra.length && avisos.length === 1 && avisos[0].includes(l.nombre) && /Mis récords/.test(avisos[0]) && sonidos.filter(n => n === 'logro').length === (!au || !au.has || au.has('logro') ? 1 : 0),
            `antes ${antes.join()} · ${r.join()} · ${avisos.join('|')}`);
        }
        const todos = estado(sim);
        check('E19 · Los 10 quedan ganados y guardados en su clave aparte', todos.every(l => l.ganado) && Object.keys(libro().ganados).length === 10 && orig.logros === ALM + '.logros' && orig.logros !== (G.guardado && G.guardado.KEY));
        // Lo ganado queda ganado aunque cambien los datos
        sim.S.construir = null; pon('semillas', 'basura');
        check('E19 · Lo ganado no se pierde aunque luego cambien los datos', estado(sim).find(l => l.id === 'constructor').ganado && estado(sim).find(l => l.id === 'semillas').ganado);
        // Varios a la vez: un solo aviso
        pon('logros', { v: 1, ganados: {} }); avisos.length = 0; const varios = revisar(sim);
        check('E19 · Varios logros a la vez dan un solo aviso', varios.length >= 2 && avisos.length === 1 && new RegExp('¡' + varios.length + ' logros nuevos!').test(avisos[0]), avisos.join('|'));
        // Pendientes: la pista y cuánto falta
        pon('logros', { v: 1, ganados: {} }); for (const k of JUEGOS) pon(k, '{}'); pon('v18', { v: 2, mundo: {}, otorgados: {} }); pon('obras', 'x'); sim.S = { construir: { v: 1, piezas: [{ t: 'piso' }, { t: 'piso' }, { t: 'piso' }] }, album: [] };
        const pend = estado(sim), cons = pend.find(l => l.id === 'constructor');
        check('E19 · Pendientes: sin ganar y con su pista y lo que llevan (3/10 piezas)', pend.every(l => !l.ganado) && cons.valor === 3 && cons.meta === 10, JSON.stringify(cons && { v: cons.valor, m: cons.meta }));
        // Con G.quiet (las baterías) no se revisa en segundo plano
        sim.S.construir.piezas = new Array(12).fill({ t: 'piso' }); enPrueba = false; G.quiet = true; simS = sim.S; espera = 0;
        try { paso(0.1); } finally { simS = null; G.quiet = false; enPrueba = true; }
        check('E19 · Con G.quiet no se revisa en segundo plano (no escribe ni avisa)', !libro().ganados.constructor);
        espera = 0; enPrueba = false; simS = sim.S; avisos.length = 0;
        try { paso(0.1); } finally { simS = null; enPrueba = true; }
        check('E19 · Jugando, la revisión de cada 4 s da el logro y su aviso', !!libro().ganados.constructor && avisos.length === 1 && espera > 3.9, avisos.join('|'));
        // HTML de la sección
        const h = html(sim);
        check('E19 · La sección «Mis logros» pinta 10 logros con icono y estado', (h.match(/<li class="rec-logro/g) || []).length === 10 && (h.match(/<svg /g) || []).length === 10 && /Mis logros/.test(h) && /1 de 10/.test(h) && /¡Ganado!/.test(h) && /Pendiente/.test(h), h.length);
      } catch (e) { check('E19 · La prueba de logros terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300)); }
      finally {
        Object.assign(CLAVE, orig); quitar(); G.quiet = q0; if (ui0) G.ui.toast = ui0; if (au && play0) au.play = play0; enPrueba = false; simS = null; espera = CADA;
      }
      check('E19 · El libro de logros real queda intacto', leerRaw(orig.logros) === realAntes);
      return { results: out, passed: out.filter(x => x.ok).length, total: out.length };
    }

    G.logros = { DEF, CLAVE, IDS, estado, revisar, libro, datos, html, CSS, test };
    return G.logros;
  };
})();
