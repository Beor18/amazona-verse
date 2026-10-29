/* Content pack EP5 · «Las voces olvidadas» · jugable de principio a fin.
   Mismas piezas que content/ep2: misiones por datos, diálogos, Diario, aula y criadero.
   Ábrelo con index.html?pack=ep5. Diseño: docs/equipo/EP5_GDD.md, EP5_MISIONES.md y EP5_NARRATIVA.md.
   Los [KELVIN] de EP5_GDD §10 usan la opción por defecto y viven en window.AV_EP5.notasKelvin:
   el jugador no los lee. El mundo es el prototipo del episodio (como el del ep. 2), con las
   mismas ruinas del diseño: torre, mirador, pilar, portal y altar. No mueve el mapa del cap. 1. */
(function () {
  'use strict';
  const EP = () => window.AV_EP5;
  const IGUACA = { x: -4, z: 8 }, GUARDIAN = { x: 8, z: 10 }, APRENDIZ = { x: -10, z: 6 }, TRX = { x: 4, z: 8 }, PRUEBA = { x: 0, z: 2 };
  const IMG = { Iguaca: 'assets/luma.png', Vittata: 'assets/vittata.png', 'Guardián': 'assets/guardian.png', Aprendiz: 'assets/agilis.png' };
  function onda() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#243044'; g.fillRect(0, 0, 128, 128);
    g.lineWidth = 4; g.lineCap = 'round';
    g.strokeStyle = '#f2c21a'; g.beginPath();
    for (let x = 10; x <= 118; x++) { const y = 48 + Math.sin(x * 0.18) * 12; if (x === 10) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
    g.strokeStyle = '#8d7aee'; g.beginPath();
    for (let x = 10; x <= 118; x++) { const y = 84 + Math.sin(x * 0.31 + 1) * 10; if (x === 10) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
    return c.toDataURL('image/png');
  }
  IMG.Voz = onda();
  const di = (who, text) => ({ who, img: IMG[who] || IMG.Vittata, text });
  const Lu = t => di('Iguaca', t);

  const DIALOGOS = { escenas: [
    { id: 'e_inicio', disparador: 'inicio:ep5', personaje: 'Vittata', emocion: 'sorpresa', lineas: ['Dos voces a la vez. No es eco.', 'Esa voz es de ahora… y la otra también.'] },
    { id: 'e_fin_a', disparador: 'evento:VoicesRevealed', personaje: 'Voz', emocion: 'idea', lineas: [
      'Villa Raíz. Por fin.',
      'Nos conocían por otros nombres, en dos islas del sur.',
      'Ya no estamos donde estábamos. Pero hablamos desde ahora, igual que ustedes.',
      'El pacto no se rompió con el cielo. Se rompió cuando dejamos de hablarnos.',
      'Busquen a los que quedan. Los treinta y seis no eran treinta y seis por separado.',
    ] },
    { id: 'e_fin_g', disparador: 'evento:Chapter5Completed', personaje: 'Guardián', emocion: 'pensando', lineas: ['Eran dos. Las de las islas del sur.'] },
    { id: 'e_fin_i', disparador: 'evento:Chapter5Completed', personaje: 'Iguaca', emocion: 'feliz', lineas: ['Mira: otra luz, más allá. Y otra.', 'No los vas a poder juntar tú sola.'] },
    { id: 'e_fin_v', disparador: 'evento:Chapter5Completed', personaje: 'Vittata', emocion: 'feliz', lineas: ['No. Pero sí puedo ayudar a que se junten.'] },
  ] };

  const FRAG = ['frag_p', 'frag_s', 'frag_t', 'frag_n', 'frag_o'];
  const VOZ = ['voz_p', 'voz_s', 'voz_t', 'voz_n', 'voz_o'];
  const RUIN = ['ruina_torre', 'ruina_mirador', 'ruina_pilar', 'ruina_portal', 'ruina_altar'];
  const CLS = ['cls_torre', 'cls_mirador', 'cls_pilar', 'cls_portal', 'cls_altar'];

  AVE.registerPack({
    id: 'ep5',
    archivos: ['transmisor.js', 'relevo.js', 'historia.js', 'lecciones.js'],
    idioma: 'content/ep5/en.js',
    meta: {
      titulo: 'Las voces olvidadas', capitulo: 5, almacen: 'ep5',
      hud: {
        capitulo: 'Capítulo 5 · El taller', titulo: 'Las voces olvidadas', portada: 'Capítulo 5 · Las voces olvidadas',
        etiqueta: 'Capítulo 5 · Las voces olvidadas', fin: 'Las dos voces se oyeron',
        nota: 'Capítulo 5. No uses tu nombre real.', inventario: {},
      },
    },
    jugador: { nombre: 'Vittata', sprite: 'assets/vittata.png', especie: 'vittata', altura: 1.75, aparicion: { x: -4, z: 6 }, camara: 0.6 },
    guardado: { version: 1, claves: ['edu'], estado: () => ({ edu: { inicio: null, fin: null, fichas: [], formativa: {}, registro: null } }) },
    aula: { clave: 'amazonaverse.aula.ep5', estado: 'edu', archivo: 'amazonaverse_ep5', lecciones: () => window.AV_LECCIONES_EP5 },
    criadero: { desde: 'FragmentsOrdered', almacen: 'amazonaverse' },
    notasKelvin: [], // se rellenan al preparar, desde historia.js
    mundo: {
      tamano: 46, segmentos: 64,
      exposicion: 0.72,
      cielo: { color: '#6d84b0', cenit: '#24366e', sol: '#ffd7a8', niebla: [48, 720], nieblaAltura: [6, 48], permiso: 'noche' },
      luces: { cielo: '#9eb6e4', suelo: '#3a4a32', hemi: 0.62, sol: '#ffd0a0', solInt: 1.35, solPos: [-20, 28, 30] },
      post: { saturacion: 1.08, contraste: 1.04, bloom: 0.2, vineta: 0.2 },
      mar: { laguna: '#3d8f96', somero: '#1a7a86', hondo: '#0b3a62' },
      lugares: { inicio: { x: -4, z: 8, r: 6 } },
      terreno: { ondas: [], relieves: [], planos: [] },
      arboles: { cantidad: 28, semilla: 5, copaCada: 2, margenRio: 5, copaColor: '#2f7d43',
        evitar: [IGUACA, GUARDIAN, APRENDIZ, TRX, PRUEBA, { x: 0, z: 6 }, { x: 0, z: -6 }, { x: -14, z: -8 }, { x: 0, z: -18 }, { x: 0, z: -28 }, { x: 18, z: -6 }, { x: -18, z: -14 }, { x: 12, z: 12 }, { x: 0, z: -34 }] },
      oceano: { color: '#0b3a62', y: -2.6 },
    },
    npcs: [
      { id: 'iguaca', nombre: 'Iguaca', sprite: 'assets/luma.png', x: IGUACA.x, z: IGUACA.z, escala: 2.2, flota: true },
      { id: 'guardian', nombre: 'Guardián', sprite: 'assets/guardian.png', x: GUARDIAN.x, z: GUARDIAN.z, escala: 2.2 },
      { id: 'aprendiz', nombre: 'Aprendiz', sprite: 'assets/agilis.png', x: APRENDIZ.x, z: APRENDIZ.z, escala: 1.8 },
    ],
    objetos: {}, recursos: [],
    historia: {
      pasos: [
        { id: 'hablar', texto: 'Habla con Iguaca', guia: G => G.misiones.at('iguaca') },
        { id: 'sintonizar', texto: 'Sintoniza el transmisor', hasta: { recogido: FRAG }, guia: G => G.misiones.at('trx') },
        { id: 'ondas', texto: 'Separa las dos ondas', hasta: { recogido: VOZ }, guia: G => G.misiones.at('trx') },
        { id: 'patron', texto: 'Copia el patrón de la luz', hasta: { recogido: 'patron_ok' }, guia: G => G.misiones.at('trx') },
        { id: 'ordenar', texto: 'Ordena el mensaje', hasta: { evento: 'FragmentsOrdered' }, guia: G => G.misiones.at('trx') },
        { id: 'ruinas', texto: 'Lee las cinco ruinas', hasta: { recogido: RUIN.concat(CLS) }, guia: G => { const p = G.S.pos, r = (window.AV_EP5.ruinas || []).filter(x => !G.S.collected.includes('cls_' + x.id)).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; return r ? { x: r.x, z: r.z } : G.misiones.at('guardian'); } },
        { id: 'fichas', texto: 'Pregunta por las dos que faltan', hasta: { evento: 'GuardianRemembered' }, guia: G => G.misiones.at('guardian') },
        { id: 'antena', texto: 'Endereza la antena', hasta: { recogido: 'antena' }, guia: G => G.misiones.at('trx') },
        { id: 'codigo', texto: 'Elige cómo enviar la señal', hasta: { alguno: [{ recogido: 'codigo_luz' }, { recogido: 'codigo_sonido' }, { recogido: 'codigo_tela' }] }, guia: G => G.misiones.at('trx') },
        { id: 'estaciones', texto: 'Pon tres estaciones', hasta: { recogido: 'tres_estaciones' }, guia: G => G.misiones.at('loma') },
        { id: 'prueba1', texto: 'Prueba el relevo', hasta: { recogido: 'prueba1' }, guia: G => G.misiones.at('prueba') },
        { id: 'ayuda', texto: 'Pide ayuda para las estaciones', hasta: { evento: 'HelpAsked' }, guia: G => G.misiones.at('iguaca') },
        { id: 'prueba2', texto: 'Vuelve a probar hasta la niebla', guia: G => G.misiones.at('prueba') },
      ],
      fin: () => 'Las dos voces se oyeron enteras. Iguaca tiene unas preguntas, cuando quieras. Y el capítulo 6 espera: el pacto de los 36.',
    },
    misiones: [
      { id: 'mensajes', titulo: 'Mensajes en pedazos', hud: 'Transmisor',
        pasos: [
          { texto: 'Sintoniza cinco posiciones', hasta: { recogido: FRAG } },
          { texto: 'Marca las dos ondas', hasta: { recogido: VOZ } },
          { texto: 'Copia el patrón', hasta: { recogido: 'patron_ok' } },
          { texto: 'Ordena el mensaje', hasta: { evento: 'FragmentsOrdered' } },
        ],
        recompensa: { hito: 'mensajes' } },
      { id: 'piedras', titulo: 'Lo que recuerdan las piedras', hud: 'Ruinas',
        pasos: [
          { texto: 'Lee y clasifica las cinco marcas', hasta: { recogido: CLS } },
          { texto: 'Escucha al Guardián', hasta: { evento: 'GuardianRemembered' } },
        ],
        recompensa: { hito: 'piedras' } },
      { id: 'relevo', titulo: 'El relevo', hud: 'Señal',
        pasos: [
          { texto: 'Endereza la antena y elige un código', hasta: { todos: [{ recogido: 'antena' }, { alguno: [{ recogido: 'codigo_luz' }, { recogido: 'codigo_sonido' }, { recogido: 'codigo_tela' }] }] } },
          { texto: 'Pon tres estaciones', hasta: { recogido: 'tres_estaciones' } },
          { texto: 'Primera prueba', hasta: { recogido: 'prueba1' } },
          { texto: 'Pide ayuda', hasta: { evento: 'HelpAsked' } },
          { texto: 'La señal llega', hasta: { evento: 'Chapter5Completed' } },
        ],
        recompensa: { hito: 'relevo' } },
    ],
    diario: {
      titulo: 'Diario de las voces', corto: 'Diario', boton: 'Diario',
      categorias: {
        senal: { nombre: 'Señales', desconocido: 'Una señal', sonido: 'pickup', rafaga: 'gold' },
        memoria: { nombre: 'Memoria', desconocido: 'Una marca', sonido: 'pickup', rafaga: 'feathers' },
      },
      entradas: [
        { id: 'espejo', cat: 'senal', nombre: 'Espejo de señales', x: 6, z: 16, texto: 'Un espejo chico para mandar un destello. En el juego, la niebla lo apaga.' },
        { id: 'tambor', cat: 'senal', nombre: 'Tambor', x: -8, z: 16, texto: 'Un tambor. En el juego el golpe pasa la loma y se apaga si te alejas.' },
        { id: 'banderas', cat: 'senal', nombre: 'Bandera de tela', x: 10, z: -2, texto: 'Una tela para verla de día. De noche, en el juego, hace falta luz.' },
        { id: 'marcas', cat: 'memoria', nombre: 'Marcas en la piedra', x: 16, z: 14, texto: 'Cinco marcas: un 36, dos cotorras, un camino, un fuego y una mano. Lo que significan de verdad sigue abierto.' },
        { id: 'especies', cat: 'memoria', nombre: 'Dos de las islas del sur', x: -12, z: 14, texto: 'Amazona martinicana y Amazona violacea. La UICN las tiene por extintas. Las conocemos por Du Tertre (1654) y Labat (1742). No hay restos. No decimos cuándo ni por qué.' },
        { id: 'treinta', cat: 'memoria', nombre: 'El número 36', x: -2, z: -2, texto: 'En la piedra está el 36. En esta historia el pacto se llama así.' },
      ],
      hitos: [{ id: 'cuaderno', todos: true }],
    },
    ropa: [
      { clave: 'mano:linterna', hito: 'mensajes', nombre: 'Linterna', pista: 'ordenar el mensaje', viste: { slot: 'hand', id: 'mano', color: '#f2a03d', style: 'linterna' } },
      { clave: 'mano:lupa', hito: 'piedras', nombre: 'Lupa', pista: 'leer las piedras', viste: { slot: 'hand', id: 'mano', color: '#3d8fb0', style: 'lupa' } },
      { clave: 'mano:bandera', hito: 'relevo', nombre: 'Bandera de Puerto Rico', pista: 'llevar la señal hasta la niebla', viste: { slot: 'hand', id: 'mano', color: '#d6403a', style: 'bandera' } },
      { clave: 'mano:mapa', hito: 'cuaderno', nombre: 'Mapa de las torres', pista: 'el Diario completo', viste: { slot: 'hand', id: 'mano', color: '#c9a227', style: 'mapa' } },
    ],
    eventos: { defs: {
      PlayerCharacterCreated: { type: 'CharacterCreated', loc: 'taller', chars: ['player'], scene: 'portrait' },
      TwoVoicesHeard: { type: 'QuestAccepted', loc: 'taller', chars: ['vittata', 'iguaca'], scene: 'dialogue' },
      FragmentsOrdered: { type: 'DialogueChoiceMade', loc: 'taller', chars: ['vittata'], scene: 'dialogue' },
      RuinsRead: { type: 'LocationDiscovered', loc: 'ruinas', chars: ['vittata'], scene: null },
      GuardianRemembered: { type: 'DialogueChoiceMade', loc: 'ruinas', chars: ['guardian'], scene: 'dialogue' },
      CodeChosen: { type: 'DialogueChoiceMade', loc: 'taller', chars: ['vittata'], scene: 'dialogue' },
      RelayBuilt: { type: 'BuildingConstructed', loc: 'relevo', chars: ['vittata'], scene: null },
      HelpAsked: { type: 'CharacterMet', loc: 'relevo', chars: ['vittata', 'iguaca'], scene: 'dialogue' },
      VoicesRevealed: { type: 'DialogueChoiceMade', loc: 'niebla', chars: ['vittata'], scene: 'dialogue' },
      Chapter5Completed: { type: 'ChapterCompleted', loc: 'niebla', chars: ['vittata', 'iguaca'], scene: 'final' },
    } },
    dialogos: { datos: () => DIALOGOS, retratos: IMG, retratoDefecto: 'assets/vittata.png' },
    comic: {
      marca: 'CAPÍTULO 5 · LAS VOCES OLVIDADAS', tituloDefecto: 'Las voces olvidadas', archivo: 'ep5-mi-comic', pdfTitulo: 'Las voces olvidadas',
      capturas: ['taller', 'mensaje', 'ruina', 'relevo', 'niebla'], portadas: {},
      vinetas: [
        { id: 'intro', img: 'portrait', needs: 'PlayerCharacterCreated', texto: S => `Soy ${S.profile.name} y oí dos voces a la vez.` },
        { id: 'voces', img: 'taller', needs: 'TwoVoicesHeard', texto: 'En el transmisor había dos ondas, no un eco.' },
        { id: 'mensaje', img: 'mensaje', needs: 'FragmentsOrdered', texto: 'Ordené los pedazos: seguimos aquí, la torre que mira al mar, no lo hagas sola.' },
        { id: 'ruinas', img: 'ruina', needs: 'RuinsRead', texto: 'En las piedras había un 36, dos cotorras y un camino de torres.' },
        { id: 'relevo', img: 'relevo', needs: 'RelayBuilt', texto: 'Armé tres estaciones. La primera prueba se cortó donde no había nadie.' },
        { id: 'final', img: 'niebla', needs: 'Chapter5Completed', texto: 'Pedí ayuda. La señal cruzó hasta la niebla y las dos voces se oyeron enteras.' },
      ],
    },

    inicio(G) {
      G.dialogo.say(G.dialogo.L('inicio:ep5'), () => G.ui.toast('Habla con Iguaca', 3000));
    },

    preparar(G) {
      const S = G.S, H = G.terreno.height, D = EP();
      G.pack.notasKelvin = (D && D.notasKelvin) || [];
      const tiene = k => S.collected.includes(k);
      const poner = k => { if (!tiene(k)) S.collected.push(k); };
      const quitar = k => { const i = S.collected.indexOf(k); if (i >= 0) S.collected.splice(i, 1); };
      const elegir = (who, text, opciones, done) => {
        G.dialogo.choose(di(who, text), opciones, done);
        document.querySelectorAll('#card [id^="ch-"]').forEach(b => { b.style.minHeight = '56px'; b.style.minWidth = '56px'; b.style.boxSizing = 'border-box'; });
      };
      const nivel2 = () => !!(G.aula && G.aula.aj && G.aula.aj.grado === '5-6');
      const codigo = () => ['luz', 'sonido', 'tela'].find(k => tiene('codigo_' + k)) || '';
      const puestos = () => (D.estaciones || []).filter(e => tiene('est_' + e.id));

      if (!document.getElementById('ep5-css')) {
        const st = document.createElement('style'); st.id = 'ep5-css';
        st.textContent = '#card .btn{min-height:56px;min-width:56px}'
          + '#ep5-los{position:fixed;left:12px;right:12px;bottom:12px;z-index:6;margin:0;padding:8px 12px;background:#243044;color:#f6f1e4;border-radius:12px}'
          + '#ep5-pulsos{display:flex;gap:8px;align-items:flex-end;height:36px;margin-top:8px}'
          + '#ep5-pulsos i{display:block;width:16px;height:22px;border-radius:4px;background:#f2c21a;opacity:.3}'
          + '#ep5-pulsos i.largo{width:34px}#ep5-pulsos i.on{opacity:1}'
          + '@media (prefers-reduced-motion:reduce){#ep5-pulsos i{transition:opacity .4s}}';
        document.head.appendChild(st);
      }
      const nota = document.createElement('p'); nota.id = 'ep5-los'; nota.className = 'note'; nota.hidden = true; nota.setAttribute('role', 'status');
      document.body.appendChild(nota);

      // Ropa y cría del cap. 1, si existen. Solo se lee esa partida.
      try {
        if (!tiene('imp_cap1')) {
          const raw = localStorage.getItem('amazonaverse.save');
          const d = raw ? JSON.parse(raw) : null;
          if (d && Array.isArray(d.unlocked)) {
            for (const k of d.unlocked) if (!S.unlocked.includes(k) && !String(k).startsWith('mano:')) S.unlocked.push(k);
          }
          poner('imp_cap1');
        }
      } catch (e) { /* sin partida del capítulo 1 */ }

      const AU = G.aula, LEC = (AU.activo && AU.LEC) || {};
      const E = () => S.edu || (S.edu = { inicio: null, fin: null, fichas: [], formativa: {}, registro: null });
      const idsFormativa = () => ((LEC.formativa && LEC.formativa.seleccion && LEC.formativa.seleccion[AU.aj.grado]) || []).filter(id => AU.preguntaPublicable(AU.pregunta(id)));
      const todasPreguntadas = () => idsFormativa().every(id => (E().formativa || {})[id]);
      function objetivos() {
        const f = E().formativa || {}, ok = id => f[id] && f[id] <= 2, pre = id => f[id] != null;
        const res = [];
        if (G.eventos.had('FragmentsOrdered') && (!pre('q1') || ok('q1')) && (!pre('q2') || ok('q2'))) res.push('E1');
        if (G.eventos.had('GuardianRemembered') && (!pre('q3') || ok('q3')) && (!pre('q4') || ok('q4'))) res.push('E2');
        if (G.eventos.had('Chapter5Completed') && (!pre('q5') || ok('q5'))) res.push('E3');
        if (G.eventos.had('HelpAsked') && ok('q6')) res.push('E4');
        return res;
      }
      function registrar() {
        const e = E();
        if (!AU.activo || e.inicio == null) return;
        const pregs = {}; for (const id of idsFormativa()) pregs[id] = (e.formativa || {})[id] || '';
        const cls = CLS.filter(k => tiene(k + '_se') || tiene(k + '_supongo')).map(k => k.replace('cls_', '') + ':' + (tiene(k + '_se') ? 'se' : 'supongo')).join(' ');
        AU.registrar({
          misiones_completadas: ['mensajes', 'piedras', 'relevo'].filter(m => S.missions[m]),
          fragmentos: FRAG.filter(tiene).length, orden: tiene('ord_ok'), recuerdos: RUIN.filter(tiene).length,
          clasificacion: cls, codigo: codigo(), estaciones: puestos().map(p => p.id).join(' '),
          que_fallo: tiene('corte_loma') ? 'loma' : tiene('corte_niebla') ? 'niebla' : tiene('corte_corto') ? 'corto' : tiene('corte_noche') ? 'noche' : tiene('prueba1') ? 'vacia' : '',
          ayuda_pedida: G.eventos.had('HelpAsked'),
          preguntas: pregs, objetivos_logrados: objetivos(),
          minutos_mision: e.fin != null ? Math.max(1, Math.round((e.fin - e.inicio) / 60)) : '',
        });
      }
      function formativa() {
        const ids = idsFormativa(), esc = AU.esc;
        const cab = (i, n) => `<div class="edu-head"><img class="edu-cara" src="${IMG.Iguaca}" alt=""><div><span class="eyebrow">${esc(AU.t(LEC.meta && LEC.meta.titulo))}</span><h2>${esc(AU.t({ es: 'Iguaca te pregunta', en: 'Iguaca asks you' }))}</h2></div></div>`
          + `<div class="edu-dots" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<span class="${k < i ? 'ok' : k === i ? 'now' : ''}"></span>`).join('')}</div>`;
        AU.serie(ids, { cabecera: cab, alResponder: registrar, alTerminar: () => {
          G.ui.hideCard(); registrar();
          G.dialogo.say([Lu('Eso es escuchar de verdad: lo que se ve, lo que se supone y lo que se hace entre varios.')]);
        } });
      }

      if (AU.activo && AU.pestana) AU.pestana({ id: 'ep5', titulo: { es: 'Progreso ep. 5', en: 'Ep. 5 progress' }, html: () => {
        const esc = AU.esc, t = AU.t, P = AU.partidas;
        if (!P.length) return `<p class="note">${esc(t({ es: 'Todavía no hay partidas en este dispositivo.', en: 'No sessions on this device yet.' }))}</p>`;
        const C = t({ es: ['Fecha', 'Estación', 'Misiones', 'Código', 'Estaciones', 'Falló', 'Ayuda', 'Preguntas', 'Objetivos', 'Min'], en: ['Date', 'Station', 'Missions', 'Code', 'Stations', 'Stopped', 'Help', 'Questions', 'Objectives', 'Min'] });
        const yn = v => (v === true ? t({ es: 'sí', en: 'yes' }) : v === false ? t({ es: 'no', en: 'no' }) : '');
        const filas = P.slice().reverse().map(p => `<tr><td>${esc(p.fecha)}</td><td>${esc(p.estacion || AU.aj.estacion)}</td><td>${(p.misiones_completadas || []).length}/3</td><td>${esc(p.codigo || '')}</td><td>${esc(p.estaciones || '')}</td><td>${esc(p.que_fallo || '')}</td><td>${yn(p.ayuda_pedida)}</td><td>${esc(p.preguntas ? Object.entries(p.preguntas).filter(([, v]) => v).map(([k, v]) => k + ':' + v).join(' ') : '')}</td><td>${esc((p.objetivos_logrados || []).join(' '))}</td><td>${p.minutos_mision != null ? p.minutos_mision : ''}</td></tr>`).join('');
        return `<p class="note">${esc(t({ es: 'Solo lo guardado en este dispositivo. No se envía nada por la red.', en: 'Only what is stored on this device. Nothing is sent over the network.' }))}</p><div class="maestro-scroll"><table class="maestro-tabla"><thead><tr>${C.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></div>`;
      } });

      // ---------- Luces y rayos ----------
      const luces = new THREE.Group(); G.renderer.scene.add(luces);
      const rayos = new THREE.Group(); G.renderer.scene.add(rayos);
      const matLuz = new THREE.MeshBasicMaterial({ color: '#f2c21a' });
      function foco(x, z, color) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: color || '#f2c21a' }));
        m.position.set(x, H(x, z) + 2.4, z); luces.add(m); return m;
      }
      const luzNiebla = foco(D.niebla.x, D.niebla.z, '#f2c21a');
      let pulso = 0, fasePulso = 0;
      function pararPulso() { if (pulso) { clearInterval(pulso); pulso = 0; } }
      function arrancarPulso() {
        pararPulso();
        const suave = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
        const ms = D.pulsoMs || 400;
        const patron = [1, 0, 1, 0, 1, 0, 1, 1, 0, 0]; // tres cortos y un largo, nunca más de 3 por segundo
        fasePulso = 0;
        pulso = setInterval(() => {
          const on = patron[fasePulso % patron.length]; fasePulso++;
          luzNiebla.material.opacity = 1; luzNiebla.material.transparent = true;
          luzNiebla.visible = suave ? true : !!on;
          if (suave) luzNiebla.material.opacity = on ? 1 : 0.35;
        }, ms);
      }
      function limpiarRayos() {
        while (rayos.children.length) { const m = rayos.children.pop(); m.geometry.dispose(); m.material.dispose(); }
      }
      // El tramo es un tubo fino y no una línea de 1 px, para que se vea también en el móvil y desde lejos (BF5)
      function segmento(a, b, ok) {
        const pa = new THREE.Vector3(a.x, H(a.x, a.z) + 2.2, a.z), pb = new THREE.Vector3(b.x, H(b.x, b.z) + 2.2, b.z);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, pa.distanceTo(pb), 6, 1, true), new THREE.MeshBasicMaterial({ color: ok ? 0x3dcc7a : 0xd6403a }));
        m.position.copy(pa).add(pb).multiplyScalar(0.5);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pb.clone().sub(pa).normalize());
        rayos.add(m);
      }
      // Cada estación puesta se ve: un mástil con la pieza del código (espejo, tambor o bandera) a la altura del rayo
      function mastil(e, cod) {
        const x = e.x + (D.ruinas.some(r => r.id === e.id) ? 1.6 : 0), z = e.z, y = H(x, z);
        const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.3, 6), new THREE.MeshLambertMaterial({ color: '#6b4a2a' }));
        palo.position.set(x, y + 1.15, z); rayos.add(palo);
        const pieza = cod === 'sonido' ? new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.36, 12), new THREE.MeshLambertMaterial({ color: '#a0703c' }))
          : cod === 'tela' ? new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshLambertMaterial({ color: '#d6403a', side: THREE.DoubleSide }))
            : new THREE.Mesh(new THREE.CircleGeometry(0.26, 16), new THREE.MeshBasicMaterial({ color: '#f6e7b2', side: THREE.DoubleSide }));
        pieza.position.set(x + (cod === 'tela' ? 0.42 : 0), y + 2.2, z); pieza.rotation.y = Math.atan2(D.taller.x - x, D.taller.z - z); rayos.add(pieza);
      }
      function pintar() {
        const rel = !!(G.accesibilidad && G.accesibilidad.relajado && G.accesibilidad.relajado());
        nota.hidden = !rel || S.step < 9 || S.complete;
        if (!nota.hidden) nota.textContent = 'Con luz, la niebla se cruza desde el mirador. El sonido llega corto. La tela, de noche, necesita la linterna.';
        limpiarRayos();
        const lista = puestos(), cod = codigo() || 'luz';
        for (const e of lista) mastil(e, cod);
        if (lista.length < 2 && !(rel && S.step >= 9)) return;
        const cadena = [D.taller].concat(lista.slice().sort((a, b) => Math.hypot(a.x - D.taller.x, a.z - D.taller.z) - Math.hypot(b.x - D.taller.x, b.z - D.taller.z)), [D.niebla]);
        if (lista.length >= 1) for (let i = 0; i < cadena.length - 1; i++) {
          const r = cod === 'tela' ? { ok: tiene('linternas') } : D.lineaVista(H, cadena[i], cadena[i + 1], cod);
          const niebla = cod === 'luz' && cadena[i + 1].id === 'niebla' && cadena[i].id !== 'mirador';
          segmento(cadena[i], cadena[i + 1], r.ok && !niebla);
        }
      }
      G.on('apply', pintar, 80);

      function poste(x, z, color, alto) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, alto || 3.2, 6), new THREE.MeshLambertMaterial({ color }));
        m.position.set(x, H(x, z) + (alto || 3.2) / 2, z); G.renderer.scene.add(m);
        G.fisica.colliders.push({ x, z, r: 0.7, h: alto || 3.2, kind: 'obj' });
      }
      poste(D.niebla.x, D.niebla.z, '#d9d3c5', 1.2);

      // ---------- Piezas del kit de edificios (assets/models/edificios, propio): las cinco ruinas son las del kit con su
      // mismo nombre y el taller lleva un toldo. Mientras cargan (o sin el modelo) queda el poste de piedra de siempre (BF5) ----------
      const KIT = 'assets/models/edificios/', scene = G.renderer.scene;
      // El modelo con su lado largo medido a `largo`, centrado y apoyado en y = 0
      function kit(nombre, largo) {
        return G.assets.loadGLB(KIT + nombre + '.glb', { b64: () => (window.AV_EDIFICIOS_B64 || {})[nombre], script: KIT + nombre + '_glb.js', base: KIT, error: nombre + ' no disponible' }).then(g => {
          const m = g.scene || (g.scenes && g.scenes[0]); if (!m) throw new Error(nombre);
          const b = new THREE.Box3().setFromObject(m), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = largo / (Math.max(sz.x, sz.z) || 1);
          const w = new THREE.Group(); w.add(m);
          m.scale.setScalar(k); m.position.set(-c.x * k, -b.min.y * k, -c.z * k);
          m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.castShadow = true; } });
          return w;
        });
      }
      // Ancho de cada ruina y hacia dónde mira (la marca, hacia el taller)
      const RUINA_KIT = { torre: 2.8, mirador: 3.4, pilar: 1.8, portal: 3.4, altar: 2.6 };
      for (const r of D.ruinas) {
        const alto = r.id === 'torre' || r.id === 'mirador' ? 4.2 : 2.4;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, alto, 6), new THREE.MeshLambertMaterial({ color: '#8a8178' }));
        p.position.set(r.x, H(r.x, r.z) + alto / 2, r.z); scene.add(p);
        G.fisica.colliders.push({ x: r.x, z: r.z, r: 0.7, h: alto, kind: 'obj' });
        kit('ruina_' + r.id, RUINA_KIT[r.id]).then(w => {
          // Se hunde un poco para que no quede un borde al aire en la ladera
          w.position.set(r.x, H(r.x, r.z) - 0.25, r.z); w.rotation.y = Math.atan2(D.taller.x - r.x, D.taller.z - r.z);
          scene.add(w); scene.remove(p); p.geometry.dispose(); p.material.dispose();
        }).catch(() => {});
      }

      // La otra loma: un bloque de piedra del kit (mientras carga, un poste bajo de piedra)
      { const x = -14, z = -8, p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.4, 6), new THREE.MeshLambertMaterial({ color: '#8a8178' }));
        p.position.set(x, H(x, z) + 0.7, z); G.renderer.scene.add(p); G.fisica.colliders.push({ x, z, r: 0.7, h: 1.4, kind: 'obj' });
        kit('bloque_piedra', 1.6).then(w => { w.position.set(x, H(x, z) - 0.1, z); w.rotation.y = 0.6; G.renderer.scene.add(w); G.renderer.scene.remove(p); }).catch(() => {}); }

      // El taller: una mesa con patas que bajan hasta el suelo (está en la ladera), el transmisor encima y un toldo
      const mat = c => new THREE.MeshLambertMaterial({ color: c });
      const yMesa = Math.max(H(TRX.x - 0.5, TRX.z), H(TRX.x + 0.5, TRX.z), H(TRX.x, TRX.z - 0.3), H(TRX.x, TRX.z + 0.3)) + 0.72;
      { const tab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.7), mat('#7a5634')); tab.position.set(TRX.x, yMesa, TRX.z); scene.add(tab);
        for (const [dx, dz] of [[-0.55, -0.27], [0.55, -0.27], [-0.55, 0.27], [0.55, 0.27]]) {
          const x = TRX.x + dx, z = TRX.z + dz, l = yMesa - H(x, z) + 0.1, pata = new THREE.Mesh(new THREE.BoxGeometry(0.08, l, 0.08), mat('#5a3d22'));
          pata.position.set(x, yMesa - l / 2, z); scene.add(pata);
        }
        const caja = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.36, 0.4), mat('#3c4654')); caja.position.set(TRX.x - 0.1, yMesa + 0.22, TRX.z); scene.add(caja);
        const rueda = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 14), mat('#c9a227'));
        rueda.position.set(TRX.x - 0.1, yMesa + 0.22, TRX.z + 0.21); rueda.rotation.set(Math.PI / 2, 0, 0); scene.add(rueda);
        G.fisica.colliders.push({ x: TRX.x, z: TRX.z, r: 0.7, h: yMesa + 0.4 - H(TRX.x, TRX.z), kind: 'obj' }); }
      kit('toldo_pequeno', 3.4).then(w => { const x = TRX.x + 1.7, z = TRX.z - 0.9; w.position.set(x, H(x, z) - 0.15, z); w.rotation.y = -0.5; scene.add(w); }).catch(() => {});
      const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), new THREE.MeshLambertMaterial({ color: '#c5ccd6' }));
      const ponerAntena = () => { antena.rotation.z = tiene('antena') ? 0 : 1.05; antena.position.set(TRX.x + 0.4, yMesa + (tiene('antena') ? 0.85 : 0.35), TRX.z); };
      ponerAntena(); scene.add(antena);

      // ---------- M1 · transmisor ----------
      function sintonizar() {
        const faltan = D.fragmentos.filter(f => !tiene('frag_' + f.id));
        if (!faltan.length) { separar(); return; }
        elegir('Vittata', 'Gira la rueda del transmisor.', faltan.map(f => ({ label: 'Posición ' + f.pos, f })), o => {
          poner('frag_' + o.f.id);
          const caja = document.getElementById('card');
          G.dialogo.say([
            di('Voz', o.f.texto),
            Lu(o.f.voz === 'b' ? 'Esa onda es violeta y lleva otro ritmo.' : 'Esa onda es dorada.'),
          ], () => { G.misiones.check(); sintonizar(); });
          if (caja) caja.dataset.onda = o.f.onda;
        });
      }
      function separar() {
        const f = D.fragmentos.find(x => !tiene('voz_' + x.id));
        if (!f) { G.misiones.check(); copiar([]); return; }
        elegir('Iguaca', '«' + f.texto + '» ¿De qué onda es?', [
          { label: 'Onda dorada', v: 'a' }, { label: 'Onda violeta', v: 'b' },
        ], o => {
          if (o.v !== f.voz) {
            G.audio.play('wrong');
            G.dialogo.say([Lu(f.voz === 'b' ? 'Mira el color: esa es la violeta.' : 'Mira el color: esa es la dorada.')], separar);
            return;
          }
          poner('voz_' + f.id); G.audio.play('tick'); G.misiones.check(); separar();
        });
        ondaEnCarta(f);
      }
      // La onda del fragmento en la tarjeta (EP5_MISIONES t3: otro color y otro ritmo): dorada lenta y redonda, violeta corta y en
      // pico, para que «mira el color» se pueda mirar y se distinga también sin ver colores
      function ondaEnCarta(f) {
        const b = document.querySelector('#card [id^="ch-"]'); if (!b) return;
        const lenta = f.voz !== 'b', paso = lenta ? 40 : 14, alto = lenta ? 9 : 11; let d = 'M0 16';
        for (let x = 0; x < 240; x += paso) d += lenta ? ` q${paso / 4} ${-alto} ${paso / 2} 0 t${paso / 2} 0` : ` l${paso / 2} ${-alto} l${paso / 2} ${alto}`;
        const fig = document.createElement('div'); fig.className = 'ep5-onda'; fig.setAttribute('aria-hidden', 'true');
        fig.innerHTML = `<svg viewBox="0 0 240 32" width="240" height="32"><path d="${d}" fill="none" stroke="${lenta ? '#d9a21b' : '#8b5bd6'}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        fig.style.cssText = 'display:flex;justify-content:center;margin:2px 0 10px';
        b.parentNode.parentNode.insertBefore(fig, b.parentNode);
      }
      function copiar(tocados) {
        if (!pulso && !tiene('patron_ok')) arrancarPulso();
        if (tocados.length >= D.patron.length) {
          pararPulso(); poner('patron_ok'); G.misiones.check();
          G.dialogo.say([Lu('La luz contesta igual. Alguien escucha.')], () => preguntaPatron());
          return;
        }
        elegir('Vittata', 'La luz hace tres cortos y uno largo. Cópialo.', [
          { label: 'Corto', v: 'c' }, { label: 'Largo', v: 'l' },
        ], o => {
          if (o.v !== D.patron[tocados.length]) {
            G.audio.play('wrong');
            G.dialogo.say([Lu('Ese destello no iba ahí. Otra vez: tres cortos y después uno largo.')], () => copiar([]));
            return;
          }
          tocados.push(o.v); G.audio.play('tick'); copiar(tocados);
        });
      }
      function preguntaPatron() {
        if (!nivel2() || tiene('n2_patron')) { ordenar([]); return; }
        elegir('Iguaca', '¿Por qué el patrón de destellos se entiende aunque la señal llegue débil y la voz no?', [
          { label: 'Porque va en pasos: encendido o apagado', v: 1 },
          { label: 'Porque la niebla la traduce', v: 0 },
          { label: 'Porque gritar más fuerte arregla el ruido', v: 0 },
        ], o => {
          if (!o.v) { G.dialogo.say([Lu('Pista: un paso solo puede estar encendido o apagado. Una voz se deshace poco a poco.')], preguntaPatron); return; }
          poner('n2_patron');
          G.dialogo.say([Lu('Eso es. El patrón se recupera aunque llegue flojo. En el juego lo acabas de ver.')], () => ordenar([]));
        });
      }
      function ordenar(puestosIds) {
        const ids = D.ordenMensaje;
        if (puestosIds.length === ids.length) {
          const bien = puestosIds.every((id, i) => id === ids[i]);
          if (!bien) {
            const rara = puestosIds.map(id => D.tarjeta[id]).join('. ') + '.';
            G.dialogo.say([Lu('«' + rara + '» Eso no se entiende: suena a que ya te fuiste y después llegaste. Prueba otro orden.')], () => ordenar([]));
            return;
          }
          poner('ord_ok');
          G.eventos.log('FragmentsOrdered'); G.comic.capture('mensaje'); G.misiones.check(); registrar();
          G.dialogo.say([di('Voz', D.mensaje), di('Vittata', '¿Cómo saben que iba a hacerlo sola?'), Lu('Todos lo sabemos.')]);
          return;
        }
        const quedan = ids.filter(id => puestosIds.indexOf(id) < 0).map(id => ({ label: D.tarjeta[id], id }));
        elegir('Iguaca', puestosIds.length ? '¿Qué tarjeta sigue?' : 'Pon las tarjetas en un orden que se entienda.', quedan, o => ordenar(puestosIds.concat(o.id)));
      }

      // ---------- M2 · ruinas ----------
      function leerRuina(r) {
        if (S.step < 5) { G.dialogo.say([di('Vittata', 'Desde aquí se ve ' + r.nombre + '.')]); return; }
        if (S.step > 5) { usarEstacion(D.estaciones.find(e => e.id === r.id) || null, r); return; }
        if (tiene('cls_' + r.id)) { G.dialogo.say([di('Vittata', 'Ya leí esta marca: ' + r.marca + '.')]); return; }
        poner('ruina_' + r.id);
        G.dialogo.say([di('Vittata', 'En ' + r.nombre + ' la marca es ' + r.marca + '.'), Lu('¿Eso lo ves o lo supones?')], () => {
          elegir('Iguaca', '«' + r.se + '»', [
            { label: 'Lo sé: lo veo en la marca', v: 'se' },
            { label: 'Lo supongo: lo deduzco', v: 'supongo' },
          ], o => {
            poner('cls_' + r.id); poner('cls_' + r.id + '_' + o.v); G.audio.play('tick');
            const linea = o.v === 'se' ? '¿Cómo lo sabes? Si lo ves en la piedra, es un sé.' : 'Eso no está dibujado. Es un supongo, y está bien decirlo.';
            G.dialogo.say([Lu(linea)], () => {
              if (D.ruinas.every(x => tiene('cls_' + x.id))) { G.eventos.log('RuinsRead'); G.comic.capture('ruina'); G.misiones.check(); }
            });
          });
        });
      }
      function fichas() {
        if (S.step < 6) { G.dialogo.say([di('Guardián', 'Antes éramos treinta y… Las torres hablaban de isla en isla con…')]); return; }
        if (G.eventos.had('GuardianRemembered')) { G.dialogo.say([di('Guardián', 'Eran dos. Las de las islas del sur.')]); return; }
        G.dialogo.say([
          di('Guardián', 'Antes éramos treinta y seis. Las torres hablaban de isla en isla con luz, con voz o con tela.'),
          di('Guardián', 'Eran dos. Las de las islas del sur. Hace mucho que no…'),
          di('Vittata', 'Me poso a su lado. El Guardián toca la medalla y no dice más.'),
          Lu('Son ellas. El loro de Martinica, Amazona martinicana, y la amazona de Guadalupe, Amazona violacea.'),
          Lu('La UICN las tiene por extintas. De la de Guadalupe escribió Du Tertre en 1654. De la de Martinica, Labat en 1742. No hay restos: solo esos relatos. No decimos cuándo ni por qué dejaron de existir.'),
          di('Vittata', 'Entonces lo que sabemos de ellas también está a pedazos.'),
        ], () => {
          poner('ficha_especies');
          G.eventos.log('GuardianRemembered'); G.misiones.check(); registrar();
          if (nivel2() && !tiene('n2_evidencia')) {
            elegir('Iguaca', '¿Qué evidencia nueva haría falta para pasar un supongo a sé?', [
              { label: 'Un hueso', v: 'hueso' }, { label: 'Un dibujo de la época', v: 'dibujo' }, { label: 'Una pluma en un museo', v: 'pluma' },
            ], o => { poner('n2_evidencia'); G.dialogo.say([Lu('Cualquiera sería evidencia nueva. Hoy no la tenemos, así que sigue siendo un supongo.')]); });
          }
        });
      }

      // ---------- M3 · relevo ----------
      function enderezar() {
        poner('antena'); ponerAntena();
        if (!G.quiet && G.agarre) {
          try {
            if (G.agarre.agarrar(antena, { id: 'antena', enganche: 'mano' })) {
              G.agarre.usar();
              setTimeout(() => { try { G.agarre.soltar({ instantaneo: true }); } catch (e) { /* ya suelta */ } }, 500);
            }
          } catch (e) { /* sin modelo: el poste ya quedó derecho */ }
        }
        poner('antena'); G.audio.play('tick'); G.misiones.check();
        G.dialogo.say([di('Vittata', 'La antena ya está derecha. Ahora se oye la mitad. No basta para cruzar la niebla.'), Lu('Hace falta un relevo. Elige cómo enviar la señal.')]);
      }
      function elegirCodigo() {
        const cs = D.codigos;
        elegir('Iguaca', 'Ninguno lo hace todo. ¿Con qué mandas la señal?', [
          { label: 'Luz: ' + cs.luz.ventaja, v: 'luz' },
          { label: 'Sonido: ' + cs.sonido.ventaja, v: 'sonido' },
          { label: 'Tela: ' + cs.tela.ventaja, v: 'tela' },
        ], o => {
          poner('codigo_' + o.v);
          G.eventos.log('CodeChosen', { choice: o.v }); G.misiones.check(); registrar();
          G.dialogo.say([Lu(cs[o.v].nombre + '. ' + cs[o.v].ventaja + ' ' + cs[o.v].costo), di('Vittata', 'Llevo ' + cs[o.v].pieza + ' a tres alturas.')]);
        });
      }
      function usarEstacion(est) {
        if (!est || S.step < 9) return false;
        const id = 'est_' + est.id;
        if (tiene(id)) {
          quitar(id); quitar('tres_estaciones'); pintar();
          G.dialogo.say([di('Vittata', 'Quito la estación de ' + est.nombre + '. Puedo ponerla en otro sitio.')]);
          return true;
        }
        if (puestos().length >= 3) { G.ui.toast('Ya hay tres. Quita una si quieres moverla.', 2500); return true; }
        poner(id); // el mástil con la pieza lo dibuja pintar()
        if (puestos().length === 3) {
          poner('tres_estaciones');
          if (!G.eventos.had('RelayBuilt')) { G.eventos.log('RelayBuilt'); G.comic.capture('relevo'); }
        }
        G.audio.play('pickup'); G.misiones.check(); pintar();
        return true;
      }
      function motivoTexto(m) {
        if (m === 'loma') return 'La línea choca con una loma. El trazo rojo marca dónde.';
        if (m === 'niebla') return 'La luz no cruza la niebla desde aquí. Desde el mirador sí.';
        if (m === 'corto') return 'El sonido no llega: esos dos puestos están demasiado lejos.';
        if (m === 'noche') return 'De noche la tela no se ve. Enciende las estaciones con la linterna.';
        return 'La señal se corta.';
      }
      function probar() {
        const lista = puestos();
        if (!codigo()) { G.ui.toast('Primero elige luz, sonido o tela.', 2500); return; }
        if (lista.length < 3) { G.ui.toast('Faltan estaciones: hacen falta tres.', 2500); return; }
        const corte = D.corte(H, codigo(), lista, { linternas: tiene('linternas') });
        pintar(); encuadrar();
        if (corte.motivo !== 'vacia') {
          poner('corte_' + corte.motivo);
          G.dialogo.say([di('Vittata', motivoTexto(corte.motivo)), Lu('No pasa nada: por eso se prueba. Mueve una estación, o cambia lo que haga falta.')]);
          return;
        }
        if (!G.eventos.had('HelpAsked')) {
          if (!tiene('prueba1')) { poner('prueba1'); G.misiones.check(); registrar(); }
          if (nivel2() && !tiene('n2_fallo')) {
            elegir('Iguaca', '¿Por qué se cortó la primera prueba, si la línea ya estaba libre?', [
              { label: 'Porque no había nadie en una estación', v: 1 },
              { label: 'Porque la luz se cansó', v: 0 },
              { label: 'Porque el mapa estaba mal', v: 0 },
            ], o => {
              if (!o.v) { G.dialogo.say([Lu('Pista: no puedes estar en tres torres a la vez.')], probar); return; }
              poner('n2_fallo');
              G.dialogo.say([Lu('Eso es. La línea estaba libre y faltaba quien la sostuviera.')]);
            });
            return;
          }
          G.dialogo.say([di('Vittata', 'La línea está libre… y se corta igual. No puedo estar en tres sitios a la vez.'), Lu('Alguien tiene que quedarse en cada estación.')]);
          return;
        }
        pararPulso();
        G.eventos.log('VoicesRevealed'); G.comic.capture('niebla');
        G.fx.burst(D.niebla.x, H(D.niebla.x, D.niebla.z) + 3, D.niebla.z, 'gold', 28);
        for (const e of lista) foco(e.x, e.z, codigo() === 'sonido' ? '#7ec8e3' : codigo() === 'tela' ? '#d6403a' : '#f2c21a');
        foco(D.niebla.x + 4, D.niebla.z - 2, '#f6e7b2');
        S.complete = true;
        G.eventos.log('Chapter5Completed');
        E().fin = S.clock;
        G.misiones.advanceTo(G.misiones.DONE); registrar();
        G.dialogo.say(G.dialogo.L('evento:VoicesRevealed').concat(G.dialogo.L('evento:Chapter5Completed')), () => G.misiones.showEnd());
      }
      const ordenTaller = () => puestos().slice().sort((a, b) => Math.hypot(a.x - D.taller.x, a.z - D.taller.z) - Math.hypot(b.x - D.taller.x, b.z - D.taller.z));
      function pedirAyuda() {
        elegir('Vittata', 'No puedo sostener las tres. ¿Qué hago?', [
          { label: 'Lo hago yo', v: 'sola' },
          { label: 'Pide ayuda a Iguaca y al aprendiz', v: 'ayuda' },
        ], o => {
          if (o.v === 'sola') { G.dialogo.say([Lu('No lo hagas sola. El último fragmento lo decía.')], pedirAyuda); return; }
          G.eventos.log('HelpAsked', { choice: 'iguaca-aprendiz' }); G.misiones.check(); registrar();
          colocarAyudantes();
          G.dialogo.say([di('Vittata', '¿Me ayudas a sostener esta?'), Lu('Yo me quedo en ' + ordenTaller()[0].nombre + '.'), di('Aprendiz', 'Yo, en ' + ordenTaller()[1].nombre + '. Tú, en ' + ordenTaller()[2].nombre + '.')]);
        });
      }
      function hablarIguaca() {
        if (S.step === 0) {
          E().inicio = S.clock;
          elegir('Iguaca', '¿Es una voz con eco o son dos?', [
            { label: 'Una voz con eco', v: 'eco' }, { label: 'Son dos', v: 'dos' },
          ], o => {
            poner('pred_' + o.v);
            G.eventos.log('TwoVoicesHeard', { choice: o.v }); G.comic.capture('taller');
            G.dialogo.say([Lu(o.v === 'dos' ? 'Puede ser. Vamos a mirar las ondas.' : 'Puede ser un eco. Vamos a mirar las ondas.'), di('Vittata', 'Giro la rueda.')], () => G.misiones.advanceTo(1));
          });
          return;
        }
        if (S.complete && AU.activo && !todasPreguntadas()) {
          elegir('Iguaca', 'Cuando quieras, te hago unas preguntas sobre lo que oímos. Sin prisa y sin nota.', [
            { label: 'Sí, pregúntame', v: 1 }, { label: 'Ahora no', v: 0 },
          ], o => { if (o.v) formativa(); else G.dialogo.say([Lu('Cuando quieras. Aquí estaré.')]); });
          return;
        }
        if (S.step === 11 && !G.eventos.had('HelpAsked')) { pedirAyuda(); return; }
        const pistas = {
          1: 'Gira la rueda. Cada posición suelta un pedazo.',
          2: 'Dos fragmentos llevan la onda violeta.',
          3: 'Tres cortos y uno largo.',
          4: 'Ordena las tarjetas hasta que la frase se entienda.',
          5: 'La torre que mira al mar es la primera marca.',
          6: 'El Guardián recuerda a pedazos. Escúchalo.',
          7: 'La antena sigue doblada.',
          8: 'Elige luz, sonido o tela. Ninguno lo hace todo.',
          9: 'Hay cinco alturas. Usa tres.',
          10: 'Prueba el relevo. Si se corta, se ve dónde.',
          12: 'Vuelve a probar. Ahora hay alguien en cada estación.',
        };
        G.dialogo.say([Lu(S.complete ? 'Puedes seguir explorando. Las luces siguen encendidas.' : (pistas[S.step] || 'Sigue la señal.'))]);
      }
      function usarTrx() {
        if (S.step === 1) { sintonizar(); return; }
        if (S.step === 2) { separar(); return; }
        if (S.step === 3) { copiar([]); return; }
        if (S.step === 4) { ordenar([]); return; }
        if (S.step === 7) { enderezar(); return; }
        if (S.step === 8) { elegirCodigo(); return; }
        if (S.step >= 9 && codigo() === 'tela' && !tiene('linternas')) {
          poner('linternas'); pintar();
          G.dialogo.say([di('Vittata', 'Enciendo las telas con la linterna. Ahora se ven de noche.')]);
          return;
        }
        G.dialogo.say([di('Vittata', S.complete ? 'El transmisor quedó en silencio. Las voces ya se oyeron.' : 'El transmisor espera.')]);
      }

      const itIguaca = G.interaccion.add({ id: 'iguaca', x: IGUACA.x, z: IGUACA.z, r: 2.4, label: () => S.step === 11 ? 'Pedir ayuda' : 'Hablar con Iguaca', use: hablarIguaca });
      G.interaccion.add({ id: 'guardian', x: GUARDIAN.x, z: GUARDIAN.z, r: 2.4, label: () => S.step === 6 ? 'Escuchar al Guardián' : 'Hablar con el Guardián', use: fichas });
      const itAprendiz = G.interaccion.add({ id: 'aprendiz', x: APRENDIZ.x, z: APRENDIZ.z, r: 2.2, label: () => 'Hablar con el aprendiz', use: () => G.dialogo.say([di('Aprendiz', G.eventos.had('HelpAsked') ? 'Yo sostengo mi estación. Tú sigue.' : 'Si hace falta otra persona, aquí estoy.')]) });
      G.interaccion.add({ id: 'trx', x: TRX.x, z: TRX.z, r: 2.4, label: () => ({ 1: 'Sintonizar', 2: 'Separar las ondas', 3: 'Copiar el patrón', 4: 'Ordenar el mensaje', 7: 'Enderezar la antena', 8: 'Elegir el código' })[S.step] || 'Mirar el transmisor', use: usarTrx });
      G.interaccion.add({ id: 'prueba', x: PRUEBA.x, z: PRUEBA.z, r: 2.4, visible: () => S.step >= 9, label: () => S.complete ? 'Mirar la cadena' : 'Probar el relevo', use: () => { if (S.complete) G.dialogo.say([di('Vittata', 'La cadena sigue encendida, hasta la niebla.')]); else probar(); } });
      for (const est of D.estaciones) {
        const ruina = D.ruinas.find(r => r.id === est.id);
        G.interaccion.add({ id: est.id, x: est.x, z: est.z, r: 2.3,
          label: () => S.step === 5 && ruina ? 'Leer ' + ruina.nombre : (tiene('est_' + est.id) ? 'Quitar estación' : 'Poner estación en ' + est.nombre),
          use: () => { if (S.step === 5 && ruina) leerRuina(ruina); else if (!usarEstacion(est) && ruina) leerRuina(ruina); else if (!ruina && S.step < 9) G.dialogo.say([di('Vittata', 'Una altura despejada. Servirá para el relevo.')]); } });
      }
      for (const r of D.ruinas) if (!D.estaciones.some(e => e.id === r.id)) {
        G.interaccion.add({ id: r.id, x: r.x, z: r.z, r: 2.3, label: () => 'Leer ' + r.nombre, use: () => leerRuina(r) });
      }

      // Tras pedir ayuda, Iguaca y el aprendiz sostienen las dos estaciones más cercanas al taller (como lo dicen) y Vittata la
      // última; antes, cada quien en su sitio. Se rehace al cargar la partida (BF5)
      function colocarAyudantes() {
        const orden = ordenTaller(), ayuda = G.eventos.had('HelpAsked') && orden.length === 3;
        [['iguaca', IGUACA, itIguaca, 0], ['aprendiz', APRENDIZ, itAprendiz, 1]].forEach(([id, casa, it, i]) => {
          const n = G.actores && G.actores.npc(id); if (!n) return;
          const e = ayuda ? orden[i] : null, x = e ? e.x - 1.4 : casa.x, z = e ? e.z + 1.2 : casa.z;
          n.def.x = x; n.def.z = z; n.sp.position.set(x, H(x, z) + 1.0, z); n.sh.position.set(x, H(x, z) + 0.03, z); n.collider.x = x; n.collider.z = z;
          if (it) { it.x = x; it.z = z; }
        });
      }
      G.on('apply', colocarAyudantes, 81);
      G.on('apply', ponerAntena, 81);
      // Encuadre de la prueba: la cámara detrás de Vittata, mirando la cadena hacia la niebla (al sur)
      function encuadrar() {
        if (!G.camara) return;
        G.camara.yaw = Math.atan2(S.pos.x - D.niebla.x, S.pos.z - D.niebla.z); G.camara.manual();
      }

      const api = { pintar, pararPulso, nivel2, exigeNivel2: nivel2, colocarAyudantes };
      G.c.ep5 = api;
      pintar();
    },

    pruebas: {
      async selfTest(G, T) {
        const S = G.S, $ = G.util.$, D = window.AV_EP5, { check, result } = T.runner(), { tick, drain, useAt, teleport } = T;
        const keep = T.keepSave();
        const criaderoRaw = (() => { try { return localStorage.getItem(G.criadero.KEY); } catch (e) { return null; } })();
        const aulaKey = G.aula && G.aula.KEY;
        const aulaRaw = (() => { try { return aulaKey ? localStorage.getItem(aulaKey) : null; } catch (e) { return null; } })();
        const pick = txt => { const b = [...document.querySelectorAll('#card [id^="ch-"]')].find(x => x.textContent.includes(txt)); if (b) b.click(); return !!b; };
        const opciones = () => [...document.querySelectorAll('#card [id^="ch-"]')].map(b => b.textContent);
        const grado0 = G.aula.aj.grado;
        G.quiet = true; G.guardado.reset(true);
        try {
          check('Crea el personaje', G.creador.saveCharacter({ name: 'Prueba', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' }) === null);
          check('Empieza en el paso 1 de 13', S.step === 0 && $('steps').children.length === 13, $('steps').children.length);
          check('Las notas [KELVIN] no salen en los diálogos', !(JSON.stringify(G.pack.dialogos.datos()).includes('[KELVIN')) && (D.notasKelvin || []).length >= 8 && D.notasKelvin.every(n => n.includes('[KELVIN')));
          check('Retrato de las voces: neutro, dos ondas', typeof D.retratoVoz === 'string' && D.retratoVoz.indexOf('data:image/png') === 0);
          check('Nivel 1 no exige la pregunta extra', grado0 === '3-4' && !G.c.ep5.exigeNivel2());
          G.aula.aj.grado = '5-6';
          check('Nivel 2 añade preguntas y no una misión', G.c.ep5.exigeNivel2() && G.pack.misiones.length === 3);

          useAt('iguaca');
          check('La predicción no juzga: hay eco y hay dos', opciones().some(t => t.includes('eco')) && opciones().some(t => t.includes('Son dos')));
          pick('Son dos'); drain();
          check('M1 · Dos voces: sigue sintonizar, sin castigo si era eco', G.eventos.had('TwoVoicesHeard') && S.collected.includes('pred_dos') && S.step === 1, 'paso ' + S.step);

          useAt('trx');
          for (const n of [1, 2, 3, 4, 5]) { check('M1 · Rueda, posición ' + n, pick('Posición ' + n), opciones().join(' | ')); drain(); }
          check('M1 · Cinco fragmentos y la onda violeta marcada en la charla', FRAGOK(S) && S.step === 2, S.collected.filter(k => k.startsWith('frag_')).join(','));
          const boton = document.querySelector('#card [id^="ch-"]');
          check('M1 · Los botones de la rueda miden al menos 56 px', boton && boton.offsetHeight >= 56, boton && boton.offsetHeight);
          for (const lab of ['Onda dorada', 'Onda violeta', 'Onda dorada', 'Onda violeta', 'Onda dorada']) { pick(lab); }
          check('M1 · Las dos ondas quedan separadas', VOZOK(S) && S.step === 3, 'paso ' + S.step);
          pick('Largo'); drain();
          check('M1 · Un destello mal puesto no bloquea', !S.collected.includes('patron_ok') && opciones().some(t => t === 'Corto'));
          pick('Corto'); pick('Corto'); pick('Corto'); pick('Largo'); drain();
          check('M1 · Patrón tres cortos y uno largo', S.collected.includes('patron_ok') && S.step === 4, 'paso ' + S.step);
          pick('Porque va en pasos'); drain();
          check('Nivel 2 · El patrón en pasos', S.collected.includes('n2_patron'));
          pick('No lo hagas sola'); pick('Seguimos aquí'); pick('La torre que mira al mar'); drain();
          check('M1 · Un orden sin sentido se puede rehacer', !G.eventos.had('FragmentsOrdered') && opciones().length === 3, opciones().join(' | '));
          pick('Seguimos aquí'); pick('La torre que mira al mar'); pick('No lo hagas sola'); drain();
          check('M1 · Mensaje ordenado y linterna', G.eventos.had('FragmentsOrdered') && S.missions.mensajes && S.unlocked.includes('mano:linterna') && S.step === 5, S.unlocked.join(','));

          const visitas = [['torre', 'Lo sé'], ['mirador', 'Lo supongo'], ['pilar', 'Lo sé'], ['portal', 'Lo sé'], ['altar', 'Lo sé']];
          for (const [id, cual] of visitas) { useAt(id); drain(); pick(cual); drain(); }
          check('M2 · Cinco marcas, sé y supongo, sin corrección', G.eventos.had('RuinsRead') && S.collected.includes('cls_mirador_supongo') && S.collected.includes('cls_torre_se') && S.step === 6, 'paso ' + S.step);
          useAt('guardian'); drain();
          check('M2 · La ficha no da fecha ni causa', G.eventos.had('GuardianRemembered') && !/1779|caza|hurricane|deforest/i.test(ultimoTexto()));
          pick('Un dibujo de la época'); drain();
          check('M2 · Lupa y Nivel 2 de la evidencia', S.missions.piedras && S.unlocked.includes('mano:lupa') && S.collected.includes('n2_evidencia') && S.step === 7, 'paso ' + S.step);

          const h = G.terreno.height, est = id => D.estaciones.find(e => e.id === id);
          check('Luz: taller, loma, torre y mirador se ven', D.lineaVista(h, D.taller, est('loma'), 'luz').ok && D.lineaVista(h, est('loma'), est('torre'), 'luz').ok && D.lineaVista(h, est('torre'), est('mirador'), 'luz').ok && D.lineaVista(h, est('mirador'), D.niebla, 'luz').ok);
          check('Luz: el pilar queda detrás de la loma', D.lineaVista(h, D.taller, est('pilar'), 'luz').motivo === 'loma');
          check('Sonido: el pilar queda corto y la loma sí alcanza', D.lineaVista(h, D.taller, est('pilar'), 'sonido').motivo === 'corto' && D.lineaVista(h, est('loma'), est('torre'), 'sonido').ok);
          check('La luz sin mirador no cruza la niebla', D.corte(h, 'luz', [est('loma'), est('torre')], {}).motivo === 'niebla');
          check('La tela de noche se corta y con linterna sigue', D.corte(h, 'tela', [est('loma'), est('torre'), est('mirador')], {}).motivo === 'noche' && D.corte(h, 'tela', [est('loma'), est('torre'), est('mirador')], { linternas: true }).motivo === 'vacia');
          check('El pulso no pasa de tres por segundo', D.pulsoMs >= 334);

          useAt('trx'); drain();
          check('M3 · Antena derecha', S.collected.includes('antena') && S.step === 8, 'paso ' + S.step);
          useAt('trx'); pick('Luz:'); drain();
          check('M3 · Código de luz, con su costo', G.eventos.had('CodeChosen') && S.collected.includes('codigo_luz') && S.step === 9);
          useAt('pilar'); useAt('torre'); useAt('mirador');
          check('M3 · Tres estaciones, una de ellas tapada', S.collected.includes('tres_estaciones') && S.collected.includes('est_pilar') && S.step === 10, S.collected.filter(k => k.startsWith('est_')).join(','));
          useAt('prueba'); drain();
          check('M3 · La prueba muestra el choque y no castiga', S.collected.includes('corte_loma') && !S.collected.includes('prueba1') && S.step === 10);
          useAt('pilar'); drain(); useAt('loma');
          check('M3 · Mover la estación deja la cadena libre', !S.collected.includes('est_pilar') && S.collected.includes('est_loma') && D.corte(h, 'luz', [est('loma'), est('torre'), est('mirador')], {}).motivo === 'vacia');
          const rel0 = G.accesibilidad.relajado;
          G.accesibilidad.relajado = () => true; G.c.ep5.pintar();
          check('Modo relajado: la línea de vista se indica desde el principio', $('ep5-los') && !$('ep5-los').hidden && /mirador/.test($('ep5-los').textContent));
          G.accesibilidad.relajado = rel0; G.c.ep5.pintar();
          useAt('prueba');
          pick('Porque no había nadie'); drain();
          check('M3 · Nivel 2 explica el corte y pasa a pedir ayuda', S.collected.includes('n2_fallo') && S.collected.includes('prueba1') && S.step === 11, 'paso ' + S.step);
          useAt('iguaca'); pick('Lo hago yo'); drain();
          check('M3 · Hacerlo sola no castiga y recuerda el fragmento', !G.eventos.had('HelpAsked') && opciones().some(t => t.includes('Pide ayuda')));
          pick('Pide ayuda'); drain();
          check('M3 · Iguaca y el aprendiz toman estaciones', G.eventos.had('HelpAsked') && S.step === 12, 'paso ' + S.step);
          const cerca = (id, e) => { const n = G.actores.npc(id); return n && Math.hypot(n.def.x - e.x, n.def.z - e.z) < 3 && Math.hypot(G.interaccion.find(id).x - e.x, G.interaccion.find(id).z - e.z) < 3; };
          check('M3 · Se van a su estación: Iguaca a la loma y el aprendiz a la torre', cerca('iguaca', est('loma')) && cerca('aprendiz', est('torre')));
          useAt('prueba'); drain();
          check('Final: las voces, la bandera y la pantalla', S.complete && S.step === G.misiones.DONE && G.eventos.had('VoicesRevealed') && G.eventos.had('Chapter5Completed') && S.missions.relevo && S.unlocked.includes('mano:bandera') && !$('end').hidden);
          check('El cómic sale de los eventos', G.comic.comicPanels().length === 6, G.comic.comicPanels().length);
          check('El mensaje no nombra una causa de extinción', !/1779/.test(document.body.innerText));

          const AU = G.aula, LEC = AU.LEC || {}, MM = LEC.modo_maestro || {}, QS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
          check('Aula del ep. 5 con su clave', AU.activo && AU.KEY === 'amazonaverse.aula.ep5', AU.KEY);
          const g45 = MM.guia_45_min || {};
          check('Esquema del Aula: 4 objetivos, 6 preguntas, 6 fichas, 45 min, 3 sin pantalla y rúbrica de 5',
            (LEC.objetivos || []).length === 4 && (LEC.preguntas || []).length === 6 && (LEC.diario || []).length === 6 && g45.antes && g45.antes.minutos + g45.durante.minutos + g45.despues.minutos === 45 && (MM.actividades_sin_pantalla || []).length === 3 && MM.rubrica && MM.rubrica.criterios.length === 5 && MM.reporte_progreso.almacenamiento.clave === AU.KEY);
          check('Solo la ficha de las dos especies está verificada', LEC.diario.filter(f => f.verificacion === 'verificado').map(f => f.id).join(',') === 'especies' && AU.fichas().length === 1);
          check('Las preguntas se pueden hacer', QS.every(id => AU.preguntaPublicable(AU.pregunta(id))));
          check('Nunca «grados» en lo que ve el maestro ni el niño', !/grado/i.test(JSON.stringify([g45, (MM.actividades_sin_pantalla || []).map(a => [a.titulo, a.materiales, a.pasos]), MM.rubrica, LEC.objetivos.map(o => o.enunciado), LEC.preguntas.map(q => [q.enunciado, q.opciones, q.retro])])));
          G.misiones.seguirExplorando();
          check('Tras el final, el mundo queda libre', $('end').hidden && !G.ui.busy());
          useAt('iguaca');
          check('Iguaca ofrece las preguntas', opciones().some(x => x.includes('Ahora no')));
          pick('Ahora no');
          check('«Ahora no» no anota nada', !Object.keys(S.edu.formativa).length);
          drain(); useAt('iguaca'); pick('Sí, pregúntame');
          const card = $('card'), opt = i => card.querySelector(`.edu-opt[data-i="${i}"]`), correcta = id => AU.pregunta(id).correcta;
          check('Tarjeta formativa, sin puntaje', G.ui.cardOpen && card.querySelector('.edu-cara') && !/punt|score|\d+\s*\/\s*\d+|%/i.test(card.textContent));
          // QA-76: con la máquina cargada la tarjeta tarda en pintar; se espera hasta 5 s a que exista el botón
          const hasta5 = async f => { const t0 = performance.now(); while (!f() && performance.now() - t0 < 5000) { drain(); await new Promise(r => setTimeout(r, 100)); } return f(); };
          await hasta5(() => opt(0));
          opt(correcta('q1') === 0 ? 1 : 0).click();
          check('Fallo en q1: pista, sin registro', card.querySelector('.edu-retro.pista') && S.edu.formativa.q1 == null);
          await hasta5(() => opt(correcta('q1'))); opt(correcta('q1')).click(); await hasta5(() => $('edu-seguir')); $('edu-seguir').click();
          for (const id of QS.slice(1)) { await hasta5(() => opt(correcta(id))); opt(correcta(id)).click(); const sg = $('edu-seguir'); if (sg) sg.click(); }
          drain();
          check('Las 6 respondidas', QS.every(id => S.edu.formativa[id]) && !G.ui.cardOpen, JSON.stringify(S.edu.formativa));
          const p = AU.partida();
          check('Reporte local sin el nombre del jugador', p && p.preguntas.q1 === 2 && p.misiones_completadas.length === 3 && ['E1', 'E2', 'E3', 'E4'].every(o => p.objetivos_logrados.includes(o)) && p.codigo === 'luz' && !JSON.stringify(p).includes('Prueba'));
          check('CSV con el código y la ayuda', AU.reporteCSV().includes('codigo') && AU.reporteCSV().includes('luz') && AU.reporteCSV().includes('ayuda_pedida'));
          check('Pestaña del episodio', AU.pestanas().includes('ep5') && (AU.abrirMaestro(), AU.maestroAbierto()) && (AU.cerrarMaestro(), !AU.maestroAbierto()));

          for (const f of G.diario.entries) { teleport(f.x + 0.3, f.z); tick(0.2); }
          check('Diario: 6 hallazgos y el mapa de las torres', S.field.length === 6 && S.unlocked.includes('mano:mapa'), S.field.join(','));
          check('Criadero compartido con el cap. 1, desde el mensaje ordenado', G.pack.criadero.desde === 'FragmentsOrdered' && G.pack.criadero.almacen === 'amazonaverse' && G.criadero.KEY === 'amazonaverse.criadero' && G.guardado.KEY.startsWith('ep5.'));
          check('Ninguna cápsula se compra', ((window.AV_HUEVOS && window.AV_HUEVOS.huevos) || []).every(h => !/precio|price|compra|buy/i.test(JSON.stringify(h.obtener))));

          await G.idioma.poner('en');
          const sin = G.idioma.faltan((G.dialogo.escenas || []).flatMap(s => s.lineas || []));
          check('Las escenas del episodio tienen inglés', sin.length === 0, sin.slice(0, 4).join(' | '));
          const leidos = [D.mensaje, ...Object.values(D.tarjeta), ...D.fragmentos.map(f => f.texto), ...D.ruinas.flatMap(r => [r.nombre, r.marca, r.se]),
            ...D.estaciones.map(e => e.nombre), ...G.diario.entries.flatMap(f => [f.nombre, f.texto]), 'Onda dorada', 'Lo sé: lo veo en la marca',
            'Pide ayuda a Iguaca y al aprendiz', 'Probar el relevo', 'La línea choca con una loma. El trazo rojo marca dónde.'];
          const sinEn = G.idioma.faltan(leidos);
          check('Lo que se lee en el capítulo tiene inglés', sinEn.length === 0, sinEn.slice(0, 4).join(' | '));
          check('El título pasa a inglés', $('quest').querySelector('h1').textContent === 'The Forgotten Voices', $('quest').querySelector('h1').textContent);
          await G.idioma.poner('es');

          G.guardado.save(true); const snap = G.guardado.serialize(); G.guardado.reset(true);
          try { localStorage.setItem(G.guardado.KEY, snap); } catch (e) { /* sin almacenamiento */ }
          check('Guardar y cargar', G.guardado.load(true) && S.complete && S.collected.includes('codigo_luz') && S.collected.includes('est_loma') && S.edu.formativa.q1 === 2 && S.field.length === 6);
        } finally {
          if (G.c.ep5) G.c.ep5.pararPulso();
          G.aula.aj.grado = grado0;
          try { if (criaderoRaw == null) localStorage.removeItem(G.criadero.KEY); else localStorage.setItem(G.criadero.KEY, criaderoRaw); } catch (e) { /* sin almacenamiento */ }
          try { if (aulaKey) { if (aulaRaw == null) localStorage.removeItem(aulaKey); else localStorage.setItem(aulaKey, aulaRaw); } } catch (e) { /* sin almacenamiento */ }
          G.guardado.reset(true);
          if (G.aula.recargar) G.aula.recargar();
          T.restoreSave(keep);
          G.quiet = false;
        }
        return result();
      },
    },
  });

  window.AV_EP5 = window.AV_EP5 || {};
  window.AV_EP5.retratoVoz = IMG.Voz;
  function FRAGOK(S) { return ['frag_p', 'frag_s', 'frag_t', 'frag_n', 'frag_o'].every(k => S.collected.includes(k)); }
  function VOZOK(S) { return ['voz_p', 'voz_s', 'voz_t', 'voz_n', 'voz_o'].every(k => S.collected.includes(k)); }
  function ultimoTexto() {
    const t = document.getElementById('d-text');
    return (t && t.textContent) || '';
  }
})();
