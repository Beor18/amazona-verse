/* Juego · Álbum de las 36 (DIVERSION_CAP1 § 3, mejora 10; «Mundo vivo», etapa 1)
   Sección del Diario con las 36 Amazonas de content/comun/especies.js: las 34 vivas y las 2 extintas del canon
   (martinicana y violacea). Cada tarjeta de una especie viva se abre la primera vez que el jugador la ve de cerca:
   - una cotorra residente o de la bandada a menos de 8 m durante 2 s (src/game/residentes.js y bandada.js llaman a ver());
   - una cría nacida en el criadero (huevos.js: especie de la cápsula; sin especie, Vittata), al cargar y al nacer;
   - los rivales de una carrera del Modo Retos (G.on('retosResultado'): rivales = especies; las de las pruebas no cuentan).
   Cerrada: silueta gris y «???», nunca datos inventados. Abierta: retrato con los colores de la piel de la especie, nombre ES y
   EN, nombre científico y el estado UICN solo si coincide con el catálogo de Kelvin (la misma regla que «Amazonas del mundo»
   en diario.js; si no, «por verificar»). Las 2 extintas salen siempre, como tarjetas históricas y con suavidad («ya no vuela;
   se conoce solo por relatos antiguos», de la nota de especies.js); no se «desbloquean» porque no hay ninguna que ver.
   Los nombres del canon de las extintas (ep5/ep6) no se dicen aquí: los revelan ellas al final del capítulo 5.
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

  // Ver una especie de cerca: la primera vez abre su tarjeta, avisa y guarda. Devuelve true si es nueva.
  function ver(id, fuente) {
    if (!id || !esViva(id) || !activo()) return false;
    const v = vistos(); if (v.includes(id)) return false;
    v.push(id);
    const e = vivas().find(x => x.id === id), c = cuenta();
    G.emit('album', { id, fuente: fuente || '' });
    if (!G.quiet) {
      try { G.ui.toastHTML(`<b data-no-tr>${esc(L('Álbum de las 36', 'Album of the 36'))} · ${esc(L('¡Nueva cotorra!', 'New parrot!'))}</b> <span data-no-tr>${esc(nombre(e, enIngles() ? 'en' : 'es'))} (${c.n}/${c.m})</span>`, 3600); } catch (err) { /* sin HUD */ }
      try { G.audio.play('descubrir'); } catch (err) { /* sin audio */ }
      try { G.guardado.autosave(); } catch (err) { /* sin guardado */ }
    }
    return true;
  }

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
  G.on('apply', () => { vistos(); setTimeout(revisarCrias, 0); }, 13);
  G.on('companero', () => revisarCrias());
  G.on('retosResultado', r => { if (r && !r.prueba && Array.isArray(r.rivales)) for (const id of r.rivales) ver(id, 'retos'); });

  // ---------- Retrato (SVG, de perfil mirando a la derecha) ----------
  function retrato(id, modo) { // modo: 'abierta' | 'cerrada' | 'historica'
    const p = colores(id) || { cuerpo: '#3b9f00', cabeza: '#3b9f00', cob: 0 };
    const gris = modo === 'cerrada', cu = gris ? '#8a8f94' : p.cuerpo, ca = gris ? '#8a8f94' : p.cabeza;
    const ala = gris ? '#767b80' : 'rgba(0,0,0,.22)', pico = gris ? '#9da2a6' : '#e9dcc0';
    // la parte de la cabeza con su color: de la frente hacia la nuca según cob
    const cob = gris ? 0 : Math.max(0, Math.min(1, p.cob));
    const capa = cob > 0 ? `<path d="M${(53 - cob * 14).toFixed(1)} ${(10 + cob * 2).toFixed(1)} Q50 ${(5 - cob).toFixed(1)} 58 9 Q63 13 61 ${(15 + cob * 6).toFixed(1)} Q${(54 - cob * 8).toFixed(1)} ${(16 + cob * 6).toFixed(1)} ${(53 - cob * 14).toFixed(1)} ${(10 + cob * 2).toFixed(1)}Z" fill="${ca}"/>` : '';
    const filtro = modo === 'historica' ? ' style="filter:sepia(.55) saturate(.7)"' : '';
    return `<svg viewBox="0 0 72 56" width="72" height="56" aria-hidden="true" focusable="false"${filtro}>` +
      `<path d="M14 44 L4 54 L10 54 L20 46Z" fill="${cu}"/>` +                                         // cola
      `<ellipse cx="32" cy="34" rx="18" ry="12" fill="${cu}" transform="rotate(-28 32 34)"/>` +          // cuerpo
      `<path d="M22 28 Q34 22 44 32 Q34 44 18 44 Q16 36 22 28Z" fill="${ala}"/>` +                     // ala plegada
      `<circle cx="52" cy="16" r="10" fill="${cu}"/>${capa}` +                                          // cabeza y su color
      `<path d="M60 12 Q69 13 66 22 Q63 19 59 19Z" fill="${pico}"/>` +                                  // pico
      `<circle cx="54" cy="14" r="2.6" fill="${gris ? '#6c7176' : '#f4f1e6'}"/><circle cx="54.4" cy="14" r="1.4" fill="#1d1d1d"/>` +
      `<path d="M30 46 l-2 6 M36 46 l0 6" stroke="#6b5a3e" stroke-width="2" stroke-linecap="round"/></svg>`;
  }

  // ---------- Diario ----------
  const ESTILO = '.album36{list-style:none;margin:4px 0 12px;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px}' +
    '.album36 li{display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:8px 6px;border-radius:12px;background:rgba(47,143,78,.10);border:1px solid rgba(47,143,78,.35);min-width:0}' +
    '.album36 li b{font-size:var(--fs-sm,14px);line-height:1.2;overflow-wrap:anywhere}.album36 li small{font-size:calc(12px * var(--fs-k,1));line-height:1.25;opacity:.85;overflow-wrap:anywhere}' +
    '.album36 li i{font-size:calc(11px * var(--fs-k,1));opacity:.8}.album36 li.cerrada{background:none;border-style:dashed;opacity:.75}' +
    '.album36 li.historica{background:rgba(160,120,60,.10);border-color:rgba(160,120,60,.45)}.album36 .uicn{font-weight:700}' +
    '.album-nota{margin:2px 0 6px;font-size:var(--fs-sm,14px);opacity:.85}' +
    ':root.a11y-contraste .album36 li{background:#000;border-color:#fff;color:#fff;opacity:1}';
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
    const hist = extintas().map(e => {
      const s = estado(e);
      return `<li class="historica" data-album="${esc(e.id)}" lang="${l}">${retrato(e.id, 'historica')}<b>${esc(nombre(e, l))}</b>` +
        `<small lang="${otro}">${esc(nombre(e, otro))}</small><i lang="la">${esc(e.cientifico)}</i>` +
        `<small class="uicn">${s ? `${esc(s[l])} (${esc(s.cat)})` : esc(L('Estado por verificar', 'Status to be verified'))}</small>` +
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
    SV.suspender(true); G.quiet = true;
    let B = null, R = null;
    try {
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
      const plaza = cols.find(c => c.id === 'plaza') || cols[0];
      const lejos = (c, d) => { S.pos.x = c.x + d; S.pos.z = c.z + d; S.pos.y = G.terreno.height(S.pos.x, S.pos.z); M.flying = false; M.posado = ''; M.grounded = true; M.speed = 0; };
      lejos(plaza, 40); R.reiniciar(); R.paso(0.05);
      const aves = () => R.aves().filter(a => a.colonia === plaza.id);
      check('Al llegar a la plaza aparecen sus cotorras, posadas', aves().length === N.medio && aves().every(a => a.est === 'posada'), aves().length + ' · ' + aves().map(a => a.est).join(','));
      check('De varias especies (3 o más pieles distintas) y ninguna extinta', new Set(R.aves().map(a => a.sp)).size >= 3 && !R.aves().some(a => !esViva(a.sp)), [...new Set(R.aves().map(a => a.sp))].join(','));
      check('En la plaza de Villa Raíz viven cotorras puertorriqueñas', aves().some(a => a.sp === 'vittata'));
      // ----- Comportamientos: 90 s simulados
      const vistosEst = new Set(), H = (x, z) => G.terreno.height(x, z);
      let bien = true, aterrizajes = 0;
      for (let i = 0; i < 900; i++) {
        const antes = R.aves().map(a => a.est);
        R.paso(0.1);
        R.aves().forEach((a, k) => { vistosEst.add(a.est); if (a.accion) vistosEst.add(a.accion); if (antes[k] === 'vuela' && a.est === 'posada') aterrizajes++;
          if (!isFinite(a.x + a.y + a.z) || a.y < H(a.x, a.z) - 0.2) bien = false; });
      }
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
      check('Diario: tarjeta abierta con nombre ES y EN, científico y estado', !!ab && ab.textContent.includes(nombre(eSp, 'es')) && ab.textContent.includes(nombre(eSp, 'en')) && ab.querySelector('i[lang=la]') && ab.querySelector('.uicn'), ab && ab.textContent);
      const nombresCerr = vivas().filter(e => !visto(e.id)).some(e => [...cerr].some(li => li.textContent.includes(nombre(e, 'es')) || li.textContent.includes(e.cientifico)));
      check('Las cerradas: silueta y «???», sin nombre ni datos', cerr.length === 34 - S.album.length && [...cerr].every(li => /\?\?\?/.test(li.textContent) && li.querySelector('svg')) && !nombresCerr, cerr.length + ' cerradas');
      const hi = d.querySelectorAll('li.historica');
      check('Las 2 extintas salen como históricas (EX), con suavidad', hi.length === 2 && [...hi].every(li => /Extinta \(EX\)/.test(li.textContent) && /relatos antiguos/.test(li.textContent)), [...hi].map(li => li.textContent.slice(0, 60)).join(' | '));
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
      // ----- Draw calls (mismo método que bandadaTest, QA-51): residentes + bandada en las 2 mallas de la bandada
      lejos(plaza, 6); R.paso(0.05);
      B.aparecer('prueba', { forzar: true, n: 12, dist: 60, ang: 0.4 }); B.mover(0.05);
      const meshes = B.meshes, info = G.renderer.renderer.info, sc = G.renderer.scene, cam = G.renderer.camera;
      const vis = meshes.map(m => m.visible);
      const una = () => { G.renderer.renderer.render(sc, cam); return info.render.calls; };
      meshes.forEach(m => { m.visible = false; }); const base = una();
      meshes.forEach((m, i) => { m.visible = vis[i]; }); const con = una();
      check('Residentes y bandada a la vez: 3 draw calls o menos en total', con - base >= 1 && con - base <= 3, `${base} → ${con} · ${R.aves().length} residentes + ${B.F.n} en bandada`);
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
      SV.restaurar(snap); SV.suspender(false); G.quiet = quiet;
    }
    check('G.S queda como estaba', JSON.stringify(SV.instantanea()) === JSON.stringify(snap));
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }
  setTimeout(() => { const AV = window.AV; if (AV && AV.G === G && !AV.vivoTest) AV.vivoTest = o => test(o); }, 0);

  return { ver, visto, cuenta, colores, especies: () => vivas().concat(extintas()), html, retrato, test, PALETA };
});
