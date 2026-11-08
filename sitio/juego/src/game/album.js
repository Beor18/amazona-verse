/* Juego · Álbum de las 36 (DIVERSION_CAP1 § 3, mejora 10; «Mundo vivo», etapa 1)
   Sección del Diario con las 36 Amazonas de content/comun/especies.js: las 34 vivas y las 2 extintas del canon
   (martinicana y violacea). Cada tarjeta de una especie viva se abre la primera vez que el jugador la ve de cerca:
   - una cotorra residente o de la bandada a menos de 8 m durante 2 s (src/game/residentes.js y bandada.js llaman a ver());
   - una cría nacida en el criadero (huevos.js: especie de la cápsula; sin especie, Vittata), al cargar y al nacer;
   - los rivales de una carrera del Modo Retos (G.on('retosResultado'): rivales = especies; las de las pruebas no cuentan).
   Cerrada: silueta gris y «???», nunca datos inventados. Abierta: retrato 3D de la especie (assets/retratos_album/, hechos con
   tools/album: el modelo de Vittata con la piel de la especie; se cargan al abrir el Diario, no al arrancar), nombre ES y
   EN, nombre científico y el estado UICN solo si coincide con el catálogo de Kelvin (la misma regla que «Amazonas del mundo»
   en diario.js; si no, «por verificar»). Las 2 extintas no se «desbloquean» viéndolas (no hay ninguna que ver: nunca salen vivas
   en el mundo). Su tarjeta queda oculta (silueta gris y «???», «Una historia por descubrir») hasta que el jugador conoce su
   historia en el cap. 5: el evento VoicesRevealed (content/ep5, la escena e_fin_a en la que Mara y Vela se presentan). Entonces
   se abren con el nombre del canon (CANON_REGISTRY, Kelvin 2-nov: Mara = martinicana, Vela = violacea), la especie ES y EN, el
   nombre científico, Extinta (EX), «una de las dos voces del transmisor» y la nota suave («ya no vuela; se conoce solo por
   relatos antiguos»). Cómo se recuerda: el evento apunta { voces: true } en el registro de temporada (AVTemporada, capítulo 5,
   común a los 6 packs) y, en la partida del cap. 1, mete 'martinicana' y 'violacea' en S.album (no cuentan en las 34); al cargar
   el cap. 1 se sincroniza con el registro (también si el cap. 5 está terminado). Nada de esto en las baterías (G.quiet).
   - Guardado: S.album (ids de especie, clave del pack cap1; las partidas viejas la reciben vacía). Sin la clave en el pack
     (otros capítulos) el álbum no se muestra.
   - Colores del retrato y de las cotorras 3D (PALETA): el verde del cuerpo y el color propio de la cabeza, medidos sobre las
     pieles assets/textures/pieles/<piel>.jpg (k-medias, tools/build/paleta_pieles.py) y elegidos según el rasgo con fuente de
     especies.js (p. ej. vittata: «frente roja»). cob = cuánto de la cabeza lleva ese color (0 nada, 1 toda).
   Textos ES y EN, data-no-tr, sin animaciones (nada que quitar con «reducir movimiento»). API: G.album = { ver, visto, cuenta,
   colores, especies, html, test }. Prueba: AV.vivoTest() (residentes, bandada entre zonas, draw calls, álbum y guardado). */
AVE.module('album', function (G) {
  'use strict';
  const S = G.S;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const enIngles = () => !!((G.idioma && G.idioma.actual && G.idioma.actual() === 'en') || (G.aula && G.aula.aj && G.aula.aj.idioma === 'en'));
  const L = (es, en) => (enIngles() ? en : es);
  const activo = () => !!(G.guardado && G.guardado.KEYS && G.guardado.KEYS.includes('album'));

  // especie → [cuerpo, cabeza, cob] (de la piel; ver la cabecera)
  const PALETA = {
    vittata: ['#3b9f00', '#d40904', 0.3], diadema: ['#339803', '#e3160f', 0.35], finschi: ['#369806', '#7287a6', 0.8],
    imperialis: ['#349f02', '#3c3461', 0.9], lilacina: ['#369906', '#b34f20', 0.3], oratrix: ['#359b02', '#dbc043', 1],
    tresmariae: ['#399b03', '#eca325', 1], rhodocorytha: ['#339a02', '#c00703', 0.55], vinacea: ['#349804', '#c5682f', 0.35],
    viridigenalis: ['#339903', '#e50809', 0.5], agilis: ['#339702', '#495563', 0.5], arausiaca: ['#359a04', '#446eb8', 0.7],
    auropalliata: ['#339b02', '#e1ac24', 0.25], barbadensis: ['#257307', '#f4df09', 0.6], brasiliensis: ['#2f8f03', '#ac1909', 0.4],
    collaria: ['#369709', '#3c7b8f', 0.5], guildingii: ['#379d02', '#aa9707', 0.8], pretrei: ['#349605', '#bf4e1d', 0.5],
    tucumana: ['#329602', '#c1551c', 0.3], ventralis: ['#349605', '#ede8dc', 0.35], versicolor: ['#32900f', '#08658e', 0.4],
    dufresniana: ['#329b02', '#d59a09', 0.4], farinosa: ['#398c05', '#fb9a03', 0.25], festiva: ['#329802', '#3e4d66', 0.5],
    guatemalae: ['#3c9c08', '#6792c5', 0.8], kawalli: ['#349d02', '#efeee4', 0.25], leucocephala: ['#359a05', '#f7f5f2', 0.35],
    aestiva: ['#359e03', '#e0ac27', 0.6], albifrons: ['#349804', '#c5bea8', 0.35], amazonica: ['#239360', '#c49825', 0.5],
    autumnalis: ['#359906', '#808894', 0.6], mercenarius: ['#329504', '#286d10', 0], ochrocephala: ['#308813', '#dfa827', 0.45],
    xantholora: ['#329b02', '#e79807', 0.35], martinicana: ['#359a04', '#697373', 0.9], violacea: ['#369c04', '#5b5c86', 1],
  };
  const colores = id => { const p = PALETA[id]; return p ? { cuerpo: p[0], cabeza: p[1], cob: p[2] } : null; };
  const EXT = ['martinicana', 'violacea'], CANON = { martinicana: 'Mara', violacea: 'Vela' }; // CANON_REGISTRY (Kelvin, 2-nov)

  // ---------- Especies ----------
  const E = () => window.AV_ESPECIES || { especies: [], extintas: [], categorias: {} };
  const vivas = () => E().especies || [];
  const extintas = () => E().extintas || [];
  const esViva = id => vivas().some(e => e.id === id);
  const nombre = (e, l) => (e.comun && e.comun[l]) || (l === 'es' && e.catalogo && e.catalogo.nombre) || e.cientifico;
  const estado = e => {
    const ok = !!(e.uicn && e.uicn.categoria && e.catalogo && e.catalogo.uicn === e.uicn.categoria);
    const c = ok ? (E().categorias || {})[e.uicn.categoria] : null;
    return c ? { cat: e.uicn.categoria, es: c.es, en: c.en } : null;
  };
  const vistos = () => (Array.isArray(S.album) ? S.album : (S.album = []));
  const visto = id => Array.isArray(S.album) && S.album.includes(id);
  function cuenta() { const v = Array.isArray(S.album) ? S.album : []; const n = vivas().filter(e => v.includes(e.id)).length; return { n, m: vivas().length }; }

  // Juego en familia (5-nov): en mitad de un duelo o frente a la Sombra (V18) el aviso tapaba el marcador; espera a que acabe.
  // (el patrón es de módulo: un literal dentro de la flecha crea un RegExp nuevo cada vez, y con un aviso en espera es cada cuadro)
  const RE_DUELO = /\bv18-(duelo|amenaza)-on\b/;
  const enDuelo = () => !!document.body && RE_DUELO.test(document.body.className);
  let diferido = null;
  const avisar = (html, ms) => { if (enDuelo()) { diferido = [html, ms]; return; } G.ui.toastHTML(html, ms); };
  function soltarDiferido() { if (diferido && !enDuelo() && !G.quiet) { const d = diferido; diferido = null; try { G.ui.toastHTML(d[0], d[1]); } catch (err) { /* sin HUD */ } } }
  G.on('update', soltarDiferido, 86);

  // Ver una especie de cerca: la primera vez abre su tarjeta, avisa y guarda. Devuelve true si es nueva.
  function ver(id, fuente) {
    if (!id || !esViva(id) || !activo()) return false;
    const v = vistos(); if (v.includes(id)) return false;
    v.push(id);
    const e = vivas().find(x => x.id === id), c = cuenta();
    G.emit('album', { id, fuente: fuente || '' });
    if (!G.quiet) {
      try { avisar(`<b data-no-tr>${esc(L('Álbum de las 36', 'Album of the 36'))} · ${esc(L('¡Nueva cotorra!', 'New parrot!'))}</b> <span data-no-tr>${esc(nombre(e, enIngles() ? 'en' : 'es'))} (${c.n}/${c.m})</span>`, 3600); } catch (err) { /* sin HUD */ }
      try { G.audio.play('descubrir'); } catch (err) { /* sin audio */ }
      try { G.guardado.autosave(); } catch (err) { /* sin guardado */ }
    }
    return true;
  }

  // ---------- Mara y Vela: se revelan con su historia en el cap. 5 (VoicesRevealed) ----------
  let pruebaVoces = false;
  const T = () => window.AVTemporada;
  function vocesReveladas() {
    if (Array.isArray(S.album) && EXT.every(id => S.album.includes(id))) return true;
    try { if (G.eventos && G.eventos.had && G.eventos.had('VoicesRevealed')) return true; } catch (e) { /* sin eventos */ }
    try { const t = T(); if (t && (t.dato(5, 'voces') || (t.leer().terminados || {})[5])) return true; } catch (e) { /* sin registro */ }
    return false;
  }
  function revelarVoces(aviso) {
    try { const t = T(); if (t && !t.dato(5, 'voces')) t.apuntar(5, { voces: true }); } catch (e) { /* sin registro */ }
    if (!activo()) return false;
    const v = vistos(); let nueva = false;
    for (const id of EXT) if (!v.includes(id)) { v.push(id); nueva = true; }
    if (nueva) G.emit('album', { id: 'voces', fuente: 'cap5' });
    if (nueva && aviso && !G.quiet) {
      try { G.ui.toastHTML(`<b data-no-tr>${esc(L('Álbum de las 36', 'Album of the 36'))}</b> <span data-no-tr>${esc(L('Dos tarjetas nuevas: Mara y Vela', 'Two new cards: Mara and Vela'))}</span>`, 4200); } catch (err) { /* sin HUD */ }
      try { G.guardado.autosave(); } catch (err) { /* sin guardado */ }
    }
    return nueva;
  }
  const sincronizarVoces = aviso => (activo() && vocesReveladas() ? revelarVoces(aviso) : false);
  (function enganchar() { // el evento del cap. 5, venga de donde venga (ep5/pack.js lo apunta con G.eventos.log)
    const Ev = G.eventos; if (!Ev || !Ev.log || Ev.log.album36) return;
    const log0 = Ev.log, log = function (k) { const r = log0.apply(this, arguments); if (k === 'VoicesRevealed' && (!G.quiet || pruebaVoces)) revelarVoces(false); return r; };
    log.album36 = true; Ev.log = log;
  })();

  // ---------- Otros encuentros: crías del criadero y rivales de Retos ----------
  function criasNacidas() {
    const C = G.criadero, H = window.AV_HUEVOS;
    if (!C || !C.estado || !H || !Array.isArray(H.huevos)) return [];
    const st = C.estado() || {}, out = [];
    for (const [cap, c] of Object.entries(st.capsulas || {})) {
      if (!c || c.estado !== 'nacida') continue;
      const h = H.huevos.find(x => x.id === cap); out.push((h && h.especie) || 'vittata');
    }
    return out;
  }
  const revisarCrias = () => { for (const id of criasNacidas()) ver(id, 'criadero'); };
  G.on('apply', () => { vistos(); setTimeout(() => { revisarCrias(); if (!G.quiet) sincronizarVoces(true); }, 0); }, 13);
  G.on('companero', () => revisarCrias());
  G.on('retosResultado', r => { if (r && !r.prueba && Array.isArray(r.rivales)) for (const id of r.rivales) ver(id, 'retos'); });

  // ---------- Retrato 3D (tools/album/README.md: el modelo de Vittata con la piel de la especie, fondo de su región) ----------
  // 256×320 (+ 2x/ a 512×640), ≈ 12 KB + 28 KB cada uno. Solo se piden al abrir el Diario (html() se llama entonces) y con
  // loading="lazy": nada en la carga inicial. Cerradas (y Mara y Vela antes del cap. 5): la silueta, igual para las 36.
  const DIR_RET = 'assets/retratos_album/', DIR_RET2 = 'assets/retratos_album/2x/', SILUETA = 'silueta';
  function retrato(id, modo) { // modo: 'abierta' | 'cerrada' | 'historica'
    const f = modo === 'cerrada' || !PALETA[id] ? SILUETA : id;
    const filtro = modo === 'historica' ? ' style="filter:sepia(.55) saturate(.7)"' : '';
    return `<img class="retrato" src="${DIR_RET}${f}.webp" srcset="${DIR_RET}${f}.webp 1x, ${DIR_RET2}${f}.webp 2x" width="256" height="320" alt="" loading="lazy" decoding="async"${filtro}>`;
  }

  // ---------- Diario ----------
  const ESTILO = '.album36{list-style:none;margin:4px 0 12px;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}' +
    '.album36 li{display:flex;flex-direction:column;align-items:center;text-align:center;gap:3px;padding:0 0 10px;overflow:hidden;border-radius:14px;background:#fffaf0;border:2px solid rgba(107,82,54,.22);box-shadow:0 2px 0 rgba(107,82,54,.12),0 6px 14px rgba(60,40,20,.10);min-width:0}' +
    '.album36 li img.retrato{display:block;width:100%;height:auto;aspect-ratio:4/5;margin:0 0 6px;border-bottom:2px solid rgba(107,82,54,.18);background:#e4ddd0}' +
    '.album36 li b,.album36 li small,.album36 li i{padding:0 8px}' +
    '.album36 li b{font-size:var(--fs-sm,14px);line-height:1.2;overflow-wrap:anywhere}.album36 li small{font-size:calc(12px * var(--fs-k,1));line-height:1.25;opacity:.85;overflow-wrap:anywhere}' +
    '.album36 li i{font-size:calc(11px * var(--fs-k,1));opacity:.8}.album36 li.cerrada{background:#f4efe6;border-style:dashed;box-shadow:none}.album36 li.cerrada img.retrato{opacity:.9}' +
    '.album36 li.historica{background:#f6ecdc;border-color:rgba(160,120,60,.45)}.album36 li.historica.oculta{background:#f4efe6;border-style:dashed;box-shadow:none}.album36 li b.canon{font-size:calc(17px * var(--fs-k,1))}.album36 .uicn{font-weight:700}' +
    '.album-nota{margin:2px 0 6px;font-size:var(--fs-sm,14px);opacity:.85}' +
    ':root.a11y-contraste .album36 li{background:#000;border-color:#fff;color:#fff;opacity:1;box-shadow:none}:root.a11y-contraste .album36 li img.retrato{border-color:#fff}';
  if (!document.getElementById('estilo-album36')) { const st = document.createElement('style'); st.id = 'estilo-album36'; st.textContent = ESTILO; document.head.appendChild(st); }

  function html() {
    if (!activo() || !vivas().length) return '';
    const en = enIngles(), l = en ? 'en' : 'es', otro = en ? 'es' : 'en', c = cuenta();
    const tarjetas = vivas().map(e => {
      if (!visto(e.id)) {
        return `<li class="cerrada" data-album="${esc(e.id)}" aria-label="${esc(L('Cotorra por descubrir', 'Parrot still to find'))}">${retrato(e.id, 'cerrada')}<b>???</b><small>${esc(L('Por descubrir', 'Still to find'))}</small></li>`;
      }
      const s = estado(e);
      return `<li class="abierta" data-album="${esc(e.id)}" lang="${l}">${retrato(e.id, 'abierta')}<b>${esc(nombre(e, l))}</b>` +
        `<small lang="${otro}">${esc(nombre(e, otro))}</small><i lang="la">${esc(e.cientifico)}</i>` +
        `<small class="uicn">${s ? `${esc(s[l])} (${esc(s.cat)})` : esc(L('Estado por verificar', 'Status to be verified'))}</small></li>`;
    }).join('');
    const reveladas = vocesReveladas();
    const hist = extintas().map(e => {
      if (!reveladas || !CANON[e.id]) { // antes del cap. 5: ni nombre ni retrato (ver la cabecera)
        return `<li class="historica oculta" data-album="${esc(e.id)}" aria-label="${esc(L('Historia por descubrir', 'Story still to discover'))}">${retrato(e.id, 'cerrada')}<b>???</b>` +
          `<small>${esc(L('Una historia por descubrir', 'A story still to discover'))}</small></li>`;
      }
      const s = estado(e);
      return `<li class="historica" data-album="${esc(e.id)}" lang="${l}">${retrato(e.id, 'historica')}<b class="canon">${esc(CANON[e.id])}</b>` +
        `<small>${esc(nombre(e, l))}</small><small lang="${otro}">${esc(nombre(e, otro))}</small><i lang="la">${esc(e.cientifico)}</i>` +
        `<small class="uicn">${s ? `${esc(s[l])} (${esc(s.cat)})` : esc(L('Estado por verificar', 'Status to be verified'))}</small>` +
        `<small>${esc(L('Una de las dos voces del transmisor.', 'One of the two voices of the transmitter.'))}</small>` +
        `<small>${esc(L('Ya no vuela. Se conoce solo por relatos antiguos.', 'It no longer flies. It is known only from old accounts.'))}</small></li>`;
    }).join('');
    return `<div class="album-sec" data-no-tr><span class="lbl">${esc(L('Álbum de las 36', 'Album of the 36'))} ${c.n}/${c.m}</span>` +
      `<p class="album-nota">${esc(L('Acércate a una cotorra y mírala un momento para guardarla en el álbum.', 'Get close to a parrot and watch it for a moment to add it to the album.'))}</p>` +
      `<ul class="album36" aria-label="${esc(L('Especies vivas', 'Living species'))}">${tarjetas}</ul>` +
      (hist ? `<span class="lbl lbl-historicas">${esc(L('Las que ya no vuelan', 'The ones that no longer fly'))}</span><ul class="album36" aria-label="${esc(L('Especies extintas', 'Extinct species'))}">${hist}</ul>` : '') + '</div>';
  }
  if (G.diario && G.diario.seccion) G.diario.seccion({ id: 'album36', html });

  // =====================================================================================================================
  // AV.vivoTest(): cotorras residentes, bandada entre zonas, draw calls, CPU, Álbum de las 36 y su guardado
  // =====================================================================================================================
  async function cargarVivo() {
    if (!G.bandada) { await AVE.assets.script('src/game/bandada.js'); window.AVBandada(G); }
    if (G.bandada && G.bandada.residentes) await G.bandada.residentes;
    return G.bandada;
  }
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const SV = G.guardado, snap = SV.instantanea(), quiet = G.quiet, posBk = Object.assign({}, S.pos);
    const aj = G.aula && G.aula.aj, idiomaBk = aj && aj.idioma, M = G.fisica.MOVE, movBk = { flying: M.flying, posado: M.posado, grounded: M.grounded, speed: M.speed };
    const calBk = G.renderer.calidad.nivel, emote = G.actores && G.actores.emote;
    const TP = window.AVTemporada, leerReg = () => { try { return localStorage.getItem(TP.KEY); } catch (e) { return null; } };
    const regBk = TP ? leerReg() : null; // el registro de temporada se devuelve intacto
    const regVacio = () => { try { localStorage.removeItem(TP.KEY); } catch (e) { /* sin almacén */ } };
    SV.suspender(true); G.quiet = true;
    let B = null, R = null;
    try {
      if (TP) regVacio();
      B = await cargarVivo(); R = G.residentes;
      check('Bandada y residentes cargados (src/game/bandada.js, residentes.js)', !!(B && R && R.paso));
      if (!B || !R) throw new Error('sin bandada o sin residentes');
      // ----- Álbum: datos
      check('Álbum: 34 especies vivas y 2 extintas (martinicana y violacea), con su paleta', vivas().length === 34 && extintas().length === 2 &&
        extintas().map(e => e.id).sort().join() === 'martinicana,violacea' && vivas().concat(extintas()).every(e => colores(e.id)), vivas().length + '+' + extintas().length);
      check('La clave album se guarda en la partida (claves del pack) y empieza vacía', SV.KEYS.includes('album') && Array.isArray(SV.freshState().album) && !SV.freshState().album.length);
      delete S.album;
      check('Partida vieja sin S.album: 0/34 y el Diario se dibuja', cuenta().n === 0 && /0\/34/.test(html()));
      // ----- Residentes por calidad
      const N = R.N;
      check('Residentes por calidad: bajo 0, medio y alto más (medio < alto)', N.bajo === 0 && N.medio > 0 && N.alto > N.medio, JSON.stringify(N));
      const cols = R.colonias();
      check('Colonias en los lugares del mapa (plaza de Villa Raíz, río, Poza, Ciudad de los 36)', ['plaza', 'rio', 'poza', 'ciudad36'].every(id => cols.some(c => c.id === id)), cols.map(c => c.id + '@' + Math.round(c.x) + ',' + Math.round(c.z)).join(' '));
      G.renderer.calidad.nivel = 'medio';
      R.prueba(true);
      // ----- Ecología (docs/equipo/MUNDO_VIVO_ECOLOGIA.md): cada colonia con las especies de su hábitat
      const HB = R.HAB, enHab = new Set();
      check('Los 9 lugares con colonia: plaza, río, Poza Honda, Dajao, Ciudad de los 36, Charca de las Nubes, Puerta del Yunque, Colina y Hacienda',
        ['plaza', 'rio', 'poza', 'dajao', 'ciudad36', 'nubes', 'puerta', 'colina', 'hacienda'].every(id => cols.some(c => c.id === id)), cols.map(c => c.id + ':' + c.hab).join(' '));
      check('El cap. 1 está antes del pacto (la Ciudad de los 36 no es aún la colonia mezclada)', R.pacto() === false);
      R.pactoPrueba(false);
      for (const c of cols) R.poblar(c, 6);
      const malas = cols.filter(c => !c.aves.every(a => HB[c.hab].sp.includes(a.sp))).map(c => c.id + ':' + c.aves.map(a => a.sp).join('/'));
      for (const c of cols) for (const a of c.aves) enHab.add(a.sp);
      check('Cada colonia solo tiene especies de su hábitat (nada al azar entre las 34)', !malas.length, malas.join(' ') || cols.map(c => c.id + ':' + [...new Set(c.aves.map(a => a.sp))].join('/')).join(' '));
      const cubre = new Set(); for (const c of cols) for (const id of R.poolDe(c)) cubre.add(id);
      check('Entre todas las colonias están las 34 vivas (el álbum se llena en el cap. 1)', vivas().every(e => cubre.has(e.id)), vivas().filter(e => !cubre.has(e.id)).map(e => e.id).join(','));
      check('Ninguna extinta en ningún hábitat ni colonia (no salen vivas en el mundo)', ![...cubre].concat([...enHab]).some(id => !esViva(id)) && !Object.values(HB).some(h => h.sp && h.sp.some(id => EXT.includes(id))));
      const cPlaza = cols.find(c => c.id === 'plaza'), cCiudad = cols.find(c => c.id === 'ciudad36');
      check('La plaza de Villa Raíz: solo cotorras puertorriqueñas', cPlaza.aves.length && cPlaza.aves.every(a => a.sp === 'vittata'));
      check('La Ciudad de los 36 antes del pacto: bosque nublado de las Antillas (con vittata)', cCiudad.aves.every(a => HB.nublado.sp.includes(a.sp)) && cCiudad.aves.some(a => a.sp === 'vittata'), cCiudad.aves.map(a => a.sp).join(','));
      R.pactoPrueba(true); R.poblar(cCiudad, 6);
      const mix = cCiudad.aves.map(a => a.sp);
      check('Tras el pacto (cap. 6): la Ciudad de los 36 es la colonia mezclada, sin repetir y sin extintas', new Set(mix).size === 6 && mix.some(id => !HB.nublado.sp.includes(id)) && mix.every(esViva) && R.habitatDe(cCiudad) === 'pacto', mix.join(','));
      R.pactoPrueba(false);
      check('La bandada lleva las especies del hábitat de su ruta: puertorriqueñas sobre la plaza, de río sobre el río', (() => {
        const cR = cols.find(c => c.id === 'rio'); B.mezclar(cPlaza.x, cPlaza.z); const a1 = B.especies(); B.mezclar(cR.x, cR.z); const a2 = B.especies();
        return a1.length && a1.every(id => id === 'vittata') && a2.length && a2.every(id => HB.rio.sp.includes(id));
      })(), B.especies().join(','));
      R.reiniciar();
      const plaza = cols.find(c => c.id === 'plaza') || cols[0];
      const lejos = (c, d) => { S.pos.x = c.x + d; S.pos.z = c.z + d; S.pos.y = G.terreno.height(S.pos.x, S.pos.z); M.flying = false; M.posado = ''; M.grounded = true; M.speed = 0; };
      lejos(plaza, 40); R.reiniciar(); R.paso(0.05);
      const aves = () => R.aves().filter(a => a.colonia === plaza.id);
      check('Al llegar a la plaza aparecen sus cotorras, posadas', aves().length === N.medio && aves().every(a => a.est === 'posada'), aves().length + ' · ' + aves().map(a => a.est).join(','));
      check('Alrededor de Villa Raíz (plaza, río y poza): 3 o más especies y ninguna extinta', new Set(R.aves().map(a => a.sp)).size >= 3 && !R.aves().some(a => !esViva(a.sp)), [...new Set(R.aves().map(a => a.sp))].join(','));
      check('En la plaza de Villa Raíz viven cotorras puertorriqueñas (todas)', aves().length && aves().every(a => a.sp === 'vittata'));
      // ----- Comportamientos: 90 s simulados
      const vistosEst = new Set(), H = (x, z) => G.terreno.height(x, z);
      let bien = true, aterrizajes = 0, despegues = 0, grupos = 0, parejas = 0;
      const enCasa = () => R.aves().filter(a => !a.vis);
      for (let i = 0; i < 900; i++) {
        const antes = enCasa().map(a => a.est);
        R.paso(0.1);
        const L = enCasa();
        L.forEach((a, k) => { vistosEst.add(a.est); if (a.accion) vistosEst.add(a.accion); if (antes[k] === 'vuela' && a.est === 'posada') aterrizajes++; if (antes[k] === 'posada' && a.est === 'vuela') despegues++;
          if (!isFinite(a.x + a.y + a.z) || a.y < H(a.x, a.z) - 0.2) bien = false; });
        if (L.some(a => a.est === 'posada' && a.accion === 'come' && a.perch && a.perch.tipo === 'suelo' && L.some(b => b !== a && b.colonia === a.colonia && b.est === 'posada' && b.accion === 'come' && b.perch && b.perch.tipo === 'suelo' && Math.hypot(a.x - b.x, a.z - b.z) < 2.5))) grupos++;
        if (L.some(a => a.est === 'posada' && a.accion === 'pareja' && a.compa && a.compa.est === 'posada' && Math.hypot(a.x - a.compa.x, a.z - a.compa.z) < 0.8)) parejas++;
      }
      check('Más vida: comen en el suelo en grupitos (2 o más juntas) y se posan en pareja a acicalarse', grupos > 0 && parejas > 0, `${(grupos / 10).toFixed(0)} s con grupito · ${(parejas / 10).toFixed(0)} s con pareja`);
      check('Más vida: muchos despegues y aterrizajes (más de 1 por ave y minuto)', despegues >= 12 && aterrizajes >= 12, `${despegues} despegues · ${aterrizajes} aterrizajes en 90 s`);
      check('Vuelan entre perchas y aterrizan', vistosEst.has('vuela') && aterrizajes >= 2, aterrizajes + ' aterrizajes');
      check('Comen (picotean fruta o el suelo), se acicalan y se llaman', vistosEst.has('come') && vistosEst.has('acicala') && vistosEst.has('llama'), [...vistosEst].join(','));
      check('Se persiguen en parejas (salvo con «reducir movimiento»)', vistosEst.has('persigue') || R.reducido());
      check('Sin posiciones inválidas ni bajo el suelo', bien);
      // ----- Reacciones a Vittata
      let a = aves().find(x => x.est === 'posada') || aves()[0];
      R.forzar(a, 'posada'); S.pos.x = a.x + 6; S.pos.z = a.z; S.pos.y = a.y;
      for (let i = 0; i < 10; i++) R.paso(0.1);
      const mira = Math.abs(R.giroHacia(a, S.pos)) < 0.5;
      check('A menos de 10 m la miran (giran la cabeza hacia Vittata)', mira, 'giro restante ' + R.giroHacia(a, S.pos).toFixed(2));
      a = aves()[0]; R.forzar(a, 'posada', 'suelo');
      S.pos.x = a.x + 1.2; S.pos.z = a.z; S.pos.y = a.y; M.grounded = true; M.flying = false;
      const d0 = Math.hypot(a.x - S.pos.x, a.z - S.pos.z);
      for (let i = 0; i < 25; i++) R.paso(0.1);
      const d1 = Math.hypot(a.x - S.pos.x, a.z - S.pos.z);
      check('Si Vittata se posa muy cerca, se aparta (salta o vuela)', d1 > 2.2 && d1 > d0, d0.toFixed(1) + ' → ' + d1.toFixed(1) + ' m');
      // Saludar: la siguen un rato y vuelven
      for (let i = 0; i < 40; i++) R.paso(0.1);
      lejos(plaza, 3);
      if (emote) { emote.name = 'saludar'; emote.until = performance.now() + 2000; }
      R.paso(0.1); if (emote) emote.name = '';
      const siguen = () => R.aves().filter(x => x.est === 'sigue');
      const nS = siguen().length;
      for (let i = 0; i < 40; i++) R.paso(0.1);
      const cerca = siguen().filter(x => Math.hypot(x.x - S.pos.x, x.z - S.pos.z) < 6).length;
      for (let i = 0; i < 200; i++) R.paso(0.1);
      check('«Saludar» cerca: 1 a 3 la siguen un rato (a menos de 6 m) y luego vuelven a su sitio', nS >= 1 && nS <= 3 && cerca >= 1 && siguen().length === 0, `${nS} siguen · ${cerca} cerca a los 4 s · ${siguen().length} tras 24 s`);
      // ----- Álbum: ver de cerca 2 s
      S.album = []; R.olvidar();
      lejos(plaza, 60); for (let i = 0; i < 5; i++) R.paso(0.1); R.olvidar();
      a = aves().find(x => x.sp !== 'vittata') || aves()[0];
      R.forzar(a, 'posada'); const sp = a.sp;
      S.pos.x = a.x + 5; S.pos.z = a.z; S.pos.y = a.y; M.grounded = true;
      for (let i = 0; i < 10; i++) R.paso(0.1);
      const aMitad = visto(sp);
      for (let i = 0; i < 14; i++) R.paso(0.1);
      check('Mirar una cotorra a 5 m durante 2 s abre su tarjeta del álbum (no antes)', !aMitad && visto(sp) && S.album.filter(x => x === sp).length === 1, sp + ' · ' + S.album.join(','));
      for (let i = 0; i < 30; i++) R.paso(0.1);
      check('Sin repetidas', S.album.length === new Set(S.album).size);
      // ----- Diario: ES / EN, cerradas sin datos, extintas históricas
      if (aj) aj.idioma = 'es';
      let d = document.createElement('div'); d.innerHTML = html();
      const ab = d.querySelector(`[data-album="${sp}"]`), cerr = d.querySelectorAll('li.cerrada');
      const eSp = vivas().find(e => e.id === sp);
      const esSilueta = li => { const im = li.querySelectorAll('img'); return im.length === 1 && im[0].getAttribute('src') === DIR_RET + SILUETA + '.webp' && !im[0].outerHTML.includes(li.dataset.album); };
      check('Diario: tarjeta abierta con nombre ES y EN, científico y estado', !!ab && ab.textContent.includes(nombre(eSp, 'es')) && ab.textContent.includes(nombre(eSp, 'en')) && ab.querySelector('i[lang=la]') && ab.querySelector('.uicn'), ab && ab.textContent);
      const nombresCerr = vivas().filter(e => !visto(e.id)).some(e => [...cerr].some(li => li.textContent.includes(nombre(e, 'es')) || li.textContent.includes(e.cientifico)));
      check('Las cerradas: silueta y «???», sin nombre ni datos (ni en la imagen: la silueta es la misma para las 36)', cerr.length === 34 - cuenta().n && [...cerr].every(li => /\?\?\?/.test(li.textContent) && esSilueta(li)) && !nombresCerr, cerr.length + ' cerradas');
      const img = ab && ab.querySelector('img.retrato');
      check('La abierta lleva su retrato 3D (1x y 2x), perezoso y sin texto alternativo repetido', !!img && img.getAttribute('src') === DIR_RET + sp + '.webp' && img.getAttribute('srcset').includes(DIR_RET2 + sp + '.webp 2x') && img.getAttribute('loading') === 'lazy' && img.getAttribute('alt') === '', img && img.outerHTML.slice(0, 200));
      const faltan = [];
      await Promise.all(vivas().concat(extintas()).map(e => e.id).concat([SILUETA]).flatMap(f => [DIR_RET, DIR_RET2].map(dd => fetch(dd + f + '.webp', { method: 'HEAD', cache: 'no-store' })
        .then(r => { if (!r.ok || !/webp/.test(r.headers.get('content-type') || 'image/webp')) faltan.push(dd + f); }).catch(() => faltan.push(dd + f)))));
      check('Están los 36 retratos y la silueta, en 1x y 2x (WebP)', !faltan.length, faltan.join(' ') || '74 archivos');
      const hi = d.querySelectorAll('li.historica');
      check('Antes del cap. 5, Mara y Vela están ocultas: silueta gris y «???», sin nombre del canon ni de especie', hi.length === 2 && [...hi].every(li => li.classList.contains('oculta') && /\?\?\?/.test(li.textContent) &&
        /historia por descubrir/i.test(li.textContent) && esSilueta(li) && !/Mara|Vela|Martini|Guadalup|martinicana|violacea|Extint/i.test(li.textContent)), [...hi].map(li => li.textContent).join(' | '));
      check(`Cuenta «Álbum de las 36 ${S.album.length}/34»`, d.textContent.includes(`Álbum de las 36 ${S.album.length}/34`));
      check('Sin «undefined» ni «null»', !/undefined|null|\[object/.test(d.textContent));
      if (aj) aj.idioma = 'en';
      d = document.createElement('div'); d.innerHTML = html();
      const sinLang = [...d.querySelectorAll('b, small, p, span.lbl, li')].filter(n => !n.closest('[lang=es]') && !n.closest('[lang=la]'));
      const esp = sinLang.map(n => n.childNodes).flatMap(ns => [...ns].filter(x => x.nodeType === 3).map(x => x.textContent)).join(' ');
      check('En inglés: «Album of the 36», sin textos en español fuera de lang="es"', d.textContent.includes('Album of the 36') && !/Álbum|Por descubrir|Cotorra|relatos|cotorra|Estado/.test(esp), esp.slice(0, 160));
      if (aj) aj.idioma = 'es';
      // ----- Guardado
      const ser = SV.serialize ? SV.serialize(true) : '';
      check('El álbum viaja con la partida (serialize)', typeof ser !== 'string' || (ser.includes('"album"') && ser.includes(sp)));
      // ----- Mara y Vela: el evento del cap. 5 (VoicesRevealed, la escena e_fin_a) las revela
      const n0 = cuenta().n, hist = () => { const x = document.createElement('div'); x.innerHTML = html(); return [...x.querySelectorAll('li.historica')]; };
      pruebaVoces = true; try { G.eventos.log('VoicesRevealed'); } finally { pruebaVoces = false; }
      check('VoicesRevealed (cap. 5) las revela: lo apunta en la partida (S.album) y en el registro de temporada', EXT.every(visto) && TP && TP.dato(5, 'voces') === true && cuenta().n === n0, S.album.join(','));
      let hv = hist();
      const tarjeta = (l, id) => l.find(li => li.dataset.album === id);
      const okCard = (li, canon, e, lang) => li && !li.classList.contains('oculta') && li.querySelector('b.canon') && li.querySelector('b.canon').textContent === canon &&
        li.textContent.includes(nombre(e, 'es')) && li.textContent.includes(nombre(e, 'en')) && li.textContent.includes(e.cientifico) &&
        (lang === 'en' ? /Extinct \(EX\)/.test(li.textContent) && /voices of the transmitter/.test(li.textContent) : /Extinta \(EX\)/.test(li.textContent) && /voces del transmisor/.test(li.textContent) && /relatos antiguos/.test(li.textContent));
      const eMar = extintas().find(e => e.id === 'martinicana'), eVio = extintas().find(e => e.id === 'violacea');
      check('Después: «Mara» (martinicana) y «Vela» (violacea), con la especie ES y EN, científico y Extinta (EX)', okCard(tarjeta(hv, 'martinicana'), 'Mara', eMar) && okCard(tarjeta(hv, 'violacea'), 'Vela', eVio), hv.map(li => li.textContent).join(' | '));
      if (aj) aj.idioma = 'en'; hv = hist(); if (aj) aj.idioma = 'es';
      check('En inglés también: Mara y Vela, Martinique / Guadeloupe amazon', okCard(tarjeta(hv, 'martinicana'), 'Mara', eMar, 'en') && okCard(tarjeta(hv, 'violacea'), 'Vela', eVio, 'en'), hv.map(li => li.textContent).join(' | '));
      { // Aviso en espera durante un duelo: cada cuadro solo mira la clase del body (sin RegExp nuevo, sin búsquedas en el DOM) y sale una vez al acabar
        const cl = document.body.classList, tenia = cl.contains('v18-duelo-on'), q0 = G.quiet, th0 = G.ui.toastHTML, avisos = [], gid0 = document.getElementById, qs0 = Document.prototype.querySelector;
        let dom = 0, reX = 0; const ex0 = RegExp.prototype.exec;
        try {
          G.quiet = false; G.ui.toastHTML = h => { avisos.push(h); }; cl.add('v18-duelo-on'); avisar('qa-perf', 100);
          document.getElementById = function () { dom++; return gid0.apply(this, arguments); }; Document.prototype.querySelector = function () { dom++; return qs0.apply(this, arguments); };
          for (let i = 0; i < 60; i++) soltarDiferido();
          const enEspera = avisos.length === 0 && !!diferido;
          cl.remove('v18-duelo-on'); soltarDiferido(); soltarDiferido();
          RegExp.prototype.exec = function () { reX += this === RE_DUELO ? 0 : 1; return ex0.apply(this, arguments); }; cl.add('v18-duelo-on'); diferido = ['qa-perf2', 100]; for (let i = 0; i < 30; i++) soltarDiferido();
          RegExp.prototype.exec = ex0;
          check('Aviso diferido en un duelo: espera sin búsquedas en el DOM ni RegExp nuevos por cuadro y sale una sola vez', enEspera && avisos.length === 1 && avisos[0] === 'qa-perf' && !dom && !reX, JSON.stringify({ avisos: avisos.length, dom, reX }));
        } finally {
          RegExp.prototype.exec = ex0; document.getElementById = gid0; Document.prototype.querySelector = qs0; diferido = null;
          if (!tenia) cl.remove('v18-duelo-on'); G.ui.toastHTML = th0; G.quiet = q0;
        }
      }
      check('Siguen sin poder «verse» vivas: ver() de una extinta no hace nada', ver('martinicana', 'x') === false && ver('violacea', 'x') === false);
      // guardar y recargar: lo revelado vive en la partida del cap. 1
      S.events = (S.events || []).filter(e => e.key !== 'VoicesRevealed'); regVacio();
      const d5 = JSON.parse(SV.serialize(true));
      const recargar = dd => { const o = Object.assign({}, dd); for (const k of ['formato', 'escrito', 'satelites', 'resumen']) delete o[k]; SV.restaurar(Object.assign(SV.instantanea(), o)); };
      const albumAntes = S.album.filter(id => !EXT.includes(id));
      recargar(Object.assign({}, d5, { album: albumAntes }));
      const ocultaSin = hist().every(li => li.classList.contains('oculta'));
      recargar(d5);
      check('Guardar y recargar: sin el evento ni el registro, la partida guardada las sigue mostrando (y una partida de antes, ocultas)', ocultaSin && EXT.every(visto) && hist().every(li => !li.classList.contains('oculta')) && Array.isArray(d5.album) && EXT.every(id => d5.album.includes(id)));
      // otra partida del cap. 1 en el mismo dispositivo: el registro de temporada (o el cap. 5 terminado) la sincroniza al cargar
      recargar(Object.assign({}, d5, { album: albumAntes }));
      TP.apuntar(5, { voces: true });
      const sinc = sincronizarVoces(false);
      check('Al cargar el cap. 1 con el cap. 5 ya jugado (registro de temporada), se abren y se guardan en la partida', sinc === true && EXT.every(visto) && sincronizarVoces(false) === false);
      regVacio(); S.album = albumAntes.slice();
      const d6 = TP.leer(); d6.terminados[5] = Date.now(); localStorage.setItem(TP.KEY, JSON.stringify(d6));
      check('…y también si solo consta el cap. 5 terminado', vocesReveladas() && sincronizarVoces(false) === true && EXT.every(visto));
      regVacio(); S.album = albumAntes.slice();
      check('Sin evento, sin registro y sin partida: vuelven a estar ocultas', !vocesReveladas() && hist().every(li => li.classList.contains('oculta')));
      // ----- Otros encuentros: Retos y criadero
      S.album = [];
      G.emit('retosResultado', { modo: 'carrera', rivales: ['oratrix', 'versicolor'], prueba: true });
      const trasPrueba = S.album.length;
      G.emit('retosResultado', { modo: 'carrera', rivales: ['oratrix', 'versicolor', 'albifrons'], prueba: false });
      check('Los rivales de una carrera de Retos abren sus tarjetas (las de prueba no)', trasPrueba === 0 && ['oratrix', 'versicolor', 'albifrons'].every(visto), S.album.join(','));
      check('Las extintas no se «desbloquean» (ni por error)', ver('martinicana', 'x') === false && ver('violacea', 'x') === false && !visto('martinicana'));
      revisarCrias();
      check('Las crías nacidas del criadero cuentan (si hay)', criasNacidas().every(visto), criasNacidas().join(',') || 'sin crías');
      // ----- Bandada entre zonas: viaja, se posa en árboles en grupo y se va
      const zonas = B.zonas();
      check('La bandada conoce zonas con nombre a las que viajar', zonas.length >= 4, zonas.length + ' zonas');
      lejos(plaza, 60);
      const conPerchas = z => B.perchas(z.x, z.z, 26, 16, { suelo: false }).length >= 8; // la playa o el muelle no tienen dónde posarse: pasan de largo
      const dest = zonas.slice().sort((p, q) => Math.hypot(p.x - S.pos.x, p.z - S.pos.z) - Math.hypot(q.x - S.pos.x, q.z - S.pos.z)).find(z => Math.hypot(z.x - S.pos.x, z.z - S.pos.z) > 45 && conPerchas(z)) || zonas.find(conPerchas) || zonas[0];
      B.terminar(); B.aparecer('viaje', { forzar: true, n: 12, destino: dest, posar: true });
      let posaron = 0, maxPos = 0, estados = new Set(), g = 0;
      for (; B.F.estado !== 'off' && g < 4000; g++) {
        B.mover(0.1); estados.add(B.F.estado);
        if (B.F.estado === 'posa') { posaron = B.F.aves.filter(x => x.posada).length; maxPos = Math.max(maxPos, posaron); }
        if (B.F.estado === 'posa' && g % 50 === 0) S.pos.x = S.pos.x; // Vittata quieta lejos
      }
      check('Viaja a una zona con nombre, se posa en grupo (árboles o techos) y luego se va', estados.has('viaja') && estados.has('posa') && maxPos >= 9 && B.F.estado === 'off', `${dest.nombre || dest.id}: ${[...estados].join('→')} · ${maxPos}/12 posadas · ${(g / 10).toFixed(0)} s`);
      check('La bandada no lleva especies extintas', B.especies().every(id => esViva(id)), B.especies().join(','));
      check('El horario pide viajes entre zonas (no solo cruzar el cielo)', B.motivoTarde && ['viaje', 'tarde'].includes(B.motivoTarde()) && (() => { let v = 0; for (let i = 0; i < 40; i++) if (B.motivoTarde() === 'viaje') v++; return v >= 10; })());
      // ----- Bandaditas de 4 a 8 entre colonias vecinas del mismo tipo de hábitat
      lejos(plaza, 40); R.reiniciar(); R.paso(0.05);
      const okVis = R.visitar() || !!R.visita(); // el horario puede haber sacado ya una
      const V = R.visita(), nV = V ? V.aves.length : 0, spV = V ? V.aves.map(a => a.sp) : [];
      const famOk = V && HB[R.habitatDe(V.de)].familia === HB[R.habitatDe(V.a)].familia;
      const fasesV = new Set(); let posadasEnB = 0, gV = 0, malV = '';
      for (; R.visita() === V && gV < 2400; gV++) {
        R.paso(0.1); if (V) { fasesV.add(V.fase); if (V.fase === 'posada') posadasEnB = Math.max(posadasEnB, V.aves.filter(a => a.est === 'posada' && Math.hypot(a.x - V.a.x, a.z - V.a.z) < V.a.r + 3).length); }
        for (const a of R.aves()) if (!isFinite(a.x + a.y + a.z) || a.y < H(a.x, a.z) - 0.2) { if (!malV) malV = `${a.colonia}${a.vis ? '(visita ' + a.vis.fase + ')' : ''} ${a.est}/${a.accion || '-'} ${a.perch ? a.perch.tipo : ''} y ${a.y.toFixed(2)} suelo ${H(a.x, a.z).toFixed(2)}`; }
      }
      check('Bandadita: 4 a 5 en medio vuelan a una colonia vecina de la misma familia de hábitat, se posan allí y vuelven a casa',
        okVis && nV >= 4 && nV <= 5 && famOk && spV.every(id => R.poolDe(V.de).includes(id)) && ['ida', 'posada', 'vuelta', 'llega'].every(f => fasesV.has(f)) && posadasEnB >= Math.ceil(nV / 2) && R.visita() !== V,
        V ? `${V.de.id}→${V.a.id} · ${nV} (${spV.join(',')}) · ${[...fasesV].join('→')} · ${posadasEnB} posadas · ${(gV / 10).toFixed(0)} s` : 'sin pares vecinos');
      check('Con la bandadita, ninguna bajo el suelo ni con posiciones inválidas', !malV, malV);
      check('En alto la bandadita es de 6 a 8; en bajo no hay', R.VIS_N.alto[0] === 6 && R.VIS_N.alto[1] === 8 && R.VIS_N.bajo[1] === 0);
      // ----- Draw calls (mismo método que bandadaTest, QA-51): residentes + bandada en las 2 mallas de la bandada
      lejos(plaza, 6); R.paso(0.05); R.visitar(); for (let i = 0; i < 30; i++) R.paso(0.1);
      B.aparecer('prueba', { forzar: true, n: 12, dist: 60, ang: 0.4 }); B.mover(0.05);
      const meshes = B.meshes, info = G.renderer.renderer.info, sc = G.renderer.scene, cam = G.renderer.camera;
      const vis = meshes.map(m => m.visible);
      const una = () => { G.renderer.renderer.render(sc, cam); return info.render.calls; };
      meshes.forEach(m => { m.visible = false; }); const base = una();
      meshes.forEach((m, i) => { m.visible = vis[i]; }); const con = una();
      check('Residentes, bandadita y bandada a la vez: 3 draw calls o menos en total (las 2 mallas de la etapa 1)', con - base >= 1 && con - base <= 3, `${base} → ${con} · ${R.aves().length} residentes (bandadita: ${R.estado().visita || 'no'}) + ${B.F.n} en bandada`);
      check('Las cotorras van en mallas instanciadas sin sombras', meshes.every(m => m.isInstancedMesh && !m.castShadow && !m.receiveShadow));
      B.terminar();
      // ----- CPU
      const t0 = performance.now(); for (let i = 0; i < 300; i++) R.paso(1 / 60); const ms = (performance.now() - t0) / 300;
      check('CPU: un paso de los residentes cuesta menos de 0,4 ms', ms < 0.4, ms.toFixed(3) + ' ms');
      // ----- Calidad baja y baterías
      G.renderer.calidad.nivel = 'bajo'; R.alCalidad(); R.paso(0.05);
      check('Con calidad baja no hay residentes', R.aves().length === 0);
      G.renderer.calidad.nivel = 'medio'; R.prueba(false); G.quiet = true; R.reiniciar(); R.paso(0.05);
      check('En las baterías (G.quiet) no hay residentes ni se dibujan', R.aves().length === 0 && !meshes.some(m => m.visible && m.count > 0));
      check('Sin animaciones CSS propias (respeta «reducir movimiento»)', !/animation|transition/.test(ESTILO) && typeof R.reducido === 'function');
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 400));
    } finally {
      if (R) { R.prueba(false); R.reiniciar(); }
      if (B) B.terminar();
      if (aj) aj.idioma = idiomaBk;
      if (emote) emote.name = '';
      G.renderer.calidad.nivel = calBk;
      Object.assign(M, movBk); Object.assign(S.pos, posBk);
      if (G.ui.hideToast) G.ui.hideToast();
      pruebaVoces = false;
      if (TP) { try { if (regBk == null) localStorage.removeItem(TP.KEY); else localStorage.setItem(TP.KEY, regBk); } catch (e) { /* sin almacén */ } }
      SV.restaurar(snap); SV.suspender(false); G.quiet = quiet;
    }
    check('El registro de temporada queda como estaba', !TP || leerReg() === regBk);
    check('G.S queda como estaba', JSON.stringify(SV.instantanea()) === JSON.stringify(snap));
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }
  setTimeout(() => { const AV = window.AV; if (AV && AV.G === G && !AV.vivoTest) AV.vivoTest = o => test(o); }, 0);

  return { ver, visto, cuenta, colores, especies: () => vivas().concat(extintas()), html, retrato, test, PALETA, vocesReveladas, sincronizarVoces, CANON };
});
