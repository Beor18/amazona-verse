/* Juego · secretos (CG-12). Un módulo para todos los capítulos.
   Lee pack.secretos: { id, tipo: 'perchas'|'seguir'|'llevar'|'fondo'|'rasante'|'gesto', premio }.
   El hallazgo va en S.secretos (migración vacía). Premios por las API que ya existen:
   aviso, sección del Diario y viñeta del cómic. Sin castigo y sin azar.
   Prueba: AV.secretosTest(). */
AVE.module('secretos', function (G) {
  'use strict';
  const S = G.S;
  const lista = () => (G.pack && G.pack.secretos) || [];
  const H = (x, z) => G.terreno.height(x, z);
  const agua = (x, z) => { const y = G.agua.levelAt(x, z); return y > -Infinity ? y : null; };
  const en = () => G.aula && G.aula.aj && G.aula.aj.idioma === 'en';
  const ingles = () => en() || !!(G.idioma && G.idioma.activo && G.idioma.activo()) || document.documentElement.lang === 'en';
  const tx = (o, k) => (o && (en() ? o.en : o.es)) || (o && o.es) || k || '';
  // El aviso sale en el idioma de verdad: el diccionario (idioma.tr) y, si no alcanzó, el texto EN del dato.
  const aviso = (es, enText) => {
    if (G.idioma && G.idioma.tr && G.idioma.activo && G.idioma.activo()) {
      const t = G.idioma.tr(es);
      if (t && t !== es) return t;
    }
    return ingles() ? (enText || es) : es;
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hechos = () => (Array.isArray(S.secretos) ? S.secretos : []);
  const tiene = id => hechos().includes(id);
  const dist2 = (a, x, z) => { const dx = S.pos.x - x, dz = S.pos.z - z; return dx * dx + dz * dz; };
  const dentro = (p, r) => p && dist2(p, p.x, p.z) <= (r || p.r || 3) * (r || p.r || 3);
  const ancla = s => s.punto || s.vuelta || s.desde || (s.puntos && s.puntos[0]) || null;

  const st = new Map();
  const estado = s => st.get(s.id) || st.set(s.id, {}).get(s.id);

  function nota(i) {
    try { if (G.audio) G.audio.play('pickup', 1 + (i || 0)); } catch (e) { /* sin muestra: el secreto sigue */ }
  }

  function conceder(s) {
    if (G.quiet || tiene(s.id)) return false;
    if (!Array.isArray(S.secretos)) S.secretos = [];
    S.secretos.push(s.id);
    const premio = s.premio || {};
    if (premio.evento && G.eventos && !G.eventos.had(premio.evento)) {
      G.eventos.log(premio.evento, { secreto: s.id });
      if (G.comic && G.comic.revisarEventos) G.comic.revisarEventos();
    }
    if (G.ui && G.ui.toastHTML) {
      const mapa = premio.fragmento ? (ingles() ? ' · Map ' + premio.fragmento + '/6' : ' · Mapa ' + premio.fragmento + '/6') : '';
      const titulo = aviso('Secreto', 'Secret');
      const nombre = aviso(s.nombre && s.nombre.es, s.nombre && s.nombre.en);
      G.ui.toastHTML('<b>' + esc(titulo) + '</b><br>' + esc(nombre) + esc(mapa), 4200);
    }
    if (G.guardado) G.guardado.autosave();
    return true;
  }

  function enPercha(p) {
    const r = p.r || 1.4;
    if (G.fisica.MOVE.flying || dist2(p, p.x, p.z) > r * r) return false;
    const suelo = H(p.x, p.z), meta = p.y != null ? p.y : suelo;
    // Vale la piedra (su y) o el suelo del mismo sitio: el mapa puede quedar un poco más bajo que la nota.
    return Math.abs(S.pos.y - meta) < 2.5 || Math.abs(S.pos.y - suelo) < 2.2;
  }

  function pasoPerchas(s) {
    const e = estado(s), pts = s.puntos || [];
    let cual = -1;
    pts.forEach((p, i) => { if (enPercha(p)) cual = i; });
    if (cual < 0) { e.encima = -1; return; }
    if (e.encima === cual) return;
    e.encima = cual;
    const quiero = e.i || 0;
    if (cual === quiero) {
      nota(cual);
      e.i = quiero + 1;
      if (e.i >= pts.length) conceder(s);
    } else if (cual === 0) { nota(0); e.i = 1; if (pts.length === 1) conceder(s); }
    else { e.i = 0; nota(0); }
  }

  function pasoSeguir(s) {
    if (s.vuelta) {
      const c = s.vuelta, rr = (c.r || 12) * (c.r || 12);
      if (dist2(c, c.x, c.z) > rr) { estado(s).prev = null; return; }
      const a = Math.atan2(S.pos.z - c.z, S.pos.x - c.x), e = estado(s);
      if (e.prev != null) {
        let d = a - e.prev;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        e.ang = (e.ang || 0) + d;
        if (Math.abs(e.ang) >= Math.PI * 1.85) conceder(s);
      }
      e.prev = a;
      return;
    }
    if (dentro(s.punto)) conceder(s);
  }

  function enDesde(p) {
    const r = p.r || 4;
    if (dist2(p, p.x, p.z) > r * r) return false;
    const w = agua(p.x, p.z), suelo = H(p.x, p.z);
    if (w != null && w > suelo + 0.3) return S.pos.y < w - 0.05 || !!G.fisica.MOVE.swimming;
    return Math.abs(S.pos.y - suelo) < 2.5;
  }

  function pasoLlevar(s) {
    if (s.hora != null && !(Number.isFinite(S.hora) && S.hora >= s.hora)) return;
    const e = estado(s);
    if (!e.lleva && enDesde(s.desde)) { e.lleva = true; nota(1); }
    if (e.lleva && dentro(s.hasta)) conceder(s);
  }

  // QA-98: el fondo se gana buceando o nadando. enDesde, en seco, acepta estar a menos de 2,5 m del suelo
  // y por eso «Lo que se llevó el río» se completaba en la orilla, a 6 m, sin meterse al agua.
  function enFondo(p) {
    if (!p) return false;
    const r = p.r || 4;
    if (dist2(p, p.x, p.z) > r * r) return false;
    const w = agua(S.pos.x, S.pos.z);
    if (w == null) return false;
    if (G.fisica && G.fisica.MOVE && G.fisica.MOVE.swimming) return true;
    return S.pos.y < w - 0.05;
  }
  function pasoFondo(s) { if (enFondo(s.punto || s.desde)) conceder(s); }

  function pasoRasante(s) {
    const p = s.punto;
    if (!p || !G.fisica.MOVE.flying || !dentro(p)) return;
    if (S.pos.y - H(p.x, p.z) <= (s.altura || 1.5)) conceder(s);
  }

  function pasoGesto(s) {
    if (!dentro(s.punto)) return;
    const act = G.actores && G.actores.emote;
    const nombre = typeof act === 'function' ? act() : act;
    if (nombre && s.gesto && nombre === s.gesto) conceder(s);
  }

  let pistaOjo = '', pistaLlama = '', avisados = {};
  function pistas(dt) {
    const d = G.dones && G.dones.activo && G.dones.activo();
    const falta = lista().filter(s => !tiene(s.id));
    const cerca = falta.map(s => ({ s, p: ancla(s) })).filter(o => o.p)
      .sort((a, b) => dist2(a.p, a.p.x, a.p.z) - dist2(b.p, b.p.x, b.p.z))[0];
    if (d === 'ojo' && cerca && pistaOjo !== cerca.s.id && G.ui && G.ui.toast) {
      pistaOjo = cerca.s.id;
      G.ui.toast((en() ? 'From the summit: ' : 'Desde la cumbre: ') + tx(cerca.s.nombre, cerca.s.id), 2800);
    }
    if (d !== 'ojo') pistaOjo = '';
    if (d === 'llamada' && cerca && pistaLlama !== cerca.s.id && G.ui && G.ui.toast) {
      pistaLlama = cerca.s.id;
      G.ui.toast((en() ? 'A parrot looks toward ' : 'Una cotorra mira hacia ') + tx(cerca.s.nombre, cerca.s.id), 2800);
    }
    if (d !== 'llamada') pistaLlama = '';
    if (!cerca || dist2(cerca.p, cerca.p.x, cerca.p.z) > 40 * 40) return;
    const e = estado(cerca.s);
    e.zona = (e.zona || 0) + dt;
    if (e.zona >= 600 && !avisados[cerca.s.id] && G.ui && G.ui.toast) {
      avisados[cerca.s.id] = true;
      G.ui.toast(en()
        ? 'Iguaca: something here still wants to be found. Take your time.'
        : 'Iguaca: aquí todavía hay algo por encontrar. Sin prisa.', 4200);
    }
  }

  if (G.fisica && G.fisica.addPercha) {
    for (const s of lista()) if (s.tipo === 'perchas') for (const q of s.puntos || []) {
      G.fisica.addPercha({ x: q.x, z: q.z, y: q.y != null ? q.y : H(q.x, q.z) + 1, r: q.r || 1.4 });
    }
  }

  if (G.diario && G.diario.seccion) G.diario.seccion({
    id: 'secretos',
    html: () => {
      const todos = lista(), n = todos.filter(s => tiene(s.id)).length;
      const fr = new Set(todos.filter(s => tiene(s.id) && s.premio && s.premio.fragmento).map(s => s.premio.fragmento));
      const titulo = en() ? 'Vittata’s legends' : 'Leyendas de Vittata';
      const mapa = en() ? 'Map in pieces' : 'Mapa en pedazos';
      const lineas = todos.filter(s => tiene(s.id) && s.leyenda).map(s => '<li>' + esc(tx(s.leyenda)) + '</li>').join('');
      return '<section class="diario-sec"><h3>' + esc(titulo) + ' · ' + n + '/' + todos.length + '</h3>'
        + '<p>' + esc(mapa) + ' ' + fr.size + '/6</p><ul>' + lineas + '</ul></section>';
    },
  });

  G.on('apply', () => { if (!Array.isArray(S.secretos)) S.secretos = []; });

  G.on('update', dt => {
    if (G.quiet) return;
    for (const s of lista()) if (!tiene(s.id)) {
      if (s.tipo === 'perchas') pasoPerchas(s);
      else if (s.tipo === 'seguir') pasoSeguir(s);
      else if (s.tipo === 'llevar') pasoLlevar(s);
      else if (s.tipo === 'fondo') pasoFondo(s);
      else if (s.tipo === 'rasante') pasoRasante(s);
      else if (s.tipo === 'gesto') pasoGesto(s);
    }
    pistas(dt);
  }, 64);

  function sitios(s) {
    if (s.tipo === 'perchas') return s.puntos || [];
    if (s.vuelta) return [{ x: s.vuelta.x, z: s.vuelta.z, y: s.vuelta.y }];
    return [s.punto, s.desde, s.hasta].filter(Boolean);
  }

  function test() {
    const P = G.pruebas, out = [];
    const check = (nombre, ok, extra) => out.push({ name: nombre, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const todos = lista();
    const sec0 = hechos().slice(), hora0 = S.hora, tieneHora = 'hora' in S;
    const ev0 = S.events.length, quiet0 = G.quiet;
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
    const vin0 = S.comic && S.comic.vinetas ? Object.keys(S.comic.vinetas) : [];
    try {
      check('El capítulo trae 5 secretos con premio fijo', todos.length === 5 && todos.every(s => s.id && s.premio && !s.premio.azar), todos.map(s => s.id).join());
      check('Ninguno pide un don para llegar', todos.every(s => !s.don));
      const mapa = todos.filter(s => s.premio && s.premio.fragmento === 1);
      check('El fragmento 1 del mapa está en la hacienda', mapa.length === 1 && mapa[0].id === 'hacienda');
      for (const s of todos) {
        const pts = sitios(s);
        const mal = pts.filter(q => {
          const h = H(q.x, q.z);
          if (!Number.isFinite(h)) return true;
          const w = agua(q.x, q.z);
          const mojado = w != null && h + 0.4 < w;
          if (!mojado) return false;
          return !(s.fondo || s.vuelta);
        });
        check(tx(s.nombre, s.id) + ' está en suelo real' + ((s.fondo || s.vuelta) ? ' (el agua vale)' : ''), mal.length === 0,
          mal.map(q => q.x.toFixed(0) + ',' + q.z.toFixed(0) + ' h=' + H(q.x, q.z).toFixed(1) + ' w=' + (agua(q.x, q.z) == null ? '—' : agua(q.x, q.z).toFixed(1))).join(' | ') || 'ok');
      }
      S.secretos = [];
      st.clear();
      G.quiet = false;
      if (G.input && G.input.keys) G.input.keys.clear();
      const quieto = () => { S.vy = 0; G.fisica.MOVE.vx = 0; G.fisica.MOVE.vz = 0; G.fisica.MOVE.flying = false; };
      const posar = p => {
        const suelo = H(p.x, p.z);
        S.pos.x = p.x; S.pos.z = p.z;
        S.pos.y = Math.abs((p.y != null ? p.y : suelo) - suelo) < 12 ? suelo + 0.25 : (p.y + 0.15);
        quieto(); P.tick(0.15);
      };
      const hac = todos.find(s => s.id === 'hacienda');
      hac.puntos.forEach(posar);
      check('Jugando: los tres pilares, en orden, guardan el secreto', tiene('hacienda'),
        'i=' + ((st.get('hacienda') || {}).i || 0) + ' y=' + S.pos.y.toFixed(1) + ' fly=' + G.fisica.MOVE.flying + ' ' + hechos().join());
      const cas = todos.find(s => s.id === 'cascada');
      S.pos.x = cas.punto.x; S.pos.z = cas.punto.z; S.pos.y = cas.punto.y; P.tick(0.2);
      check('Jugando: entrar en la gruta de la cascada', tiene('cascada'));
      posar(todos.find(s => s.id === 'picachos').puntos[0]);
      check('Jugando: posarse en Los Picachos', tiene('picachos'));
      const cu = todos.find(s => s.id === 'cueva');
      S.hora = 18; S.pos.x = cu.desde.x; S.pos.z = cu.desde.z; S.pos.y = 0; P.tick(0.2);
      check('De día la cueva no entrega la caracola', !tiene('cueva'));
      S.hora = 20;
      const wc = agua(cu.desde.x, cu.desde.z), hc = H(cu.desde.x, cu.desde.z);
      S.pos.x = cu.desde.x; S.pos.z = cu.desde.z;
      S.pos.y = (wc != null && wc > hc + 0.3) ? wc - 0.8 : hc + 0.3;
      quieto(); P.tick(0.2);
      S.pos.x = cu.hasta.x; S.pos.z = cu.hasta.z; S.pos.y = H(cu.hasta.x, cu.hasta.z) + 0.4; P.tick(0.2);
      check('Jugando: de noche la caracola llega al muelle', tiene('cueva'));
      const ba = todos.find(s => s.id === 'bahia'), c = ba.vuelta;
      for (let i = 0; i <= 16; i++) {
        const a = i / 8 * Math.PI;
        S.pos.x = c.x + Math.cos(a) * (c.r * 0.55);
        S.pos.z = c.z + Math.sin(a) * (c.r * 0.55);
        S.pos.y = (agua(c.x, c.z) || H(c.x, c.z)) + 0.2;
        quieto();
        P.tick(0.05);
      }
      check('Jugando: un círculo en la bahía', tiene('bahia'), 'ang');
      check('Los 5 quedan en S.secretos', todos.every(s => tiene(s.id)) && S.secretos.length === 5, S.secretos.join());
      const ser = G.guardado.serialize ? G.guardado.serialize(true) : '';
      check('S.secretos se guarda con la partida', typeof ser === 'string' && ser.includes('"secretos"') && G.guardado.KEYS.includes('secretos'));
      check('La hacienda abre su viñeta', !!(S.comic && S.comic.vinetas && S.comic.vinetas.sec_hacienda));
      const otra = conceder(hac);
      check('Encontrarlo otra vez no se duplica', otra === false && S.secretos.filter(id => id === 'hacienda').length === 1);
    } finally {
      S.secretos = sec0;
      if (tieneHora) S.hora = hora0; else delete S.hora;
      S.events.length = ev0;
      if (S.comic && S.comic.vinetas) for (const k of Object.keys(S.comic.vinetas)) if (!vin0.includes(k)) delete S.comic.vinetas[k];
      S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z;
      G.quiet = quiet0;
      st.clear();
    }
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }

  // QA-98: el fondo no se gana en seco, y el aviso EN no se queda en español. 16 comprobaciones.
  async function cg34() {
    const P = G.pruebas, out = [];
    const check = (name, ok, extra) => { if (out.length < 16) out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
    const sec0 = hechos().slice(), pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
    const quiet0 = G.quiet, fly0 = G.fisica.MOVE.flying, swim0 = G.fisica.MOVE.swimming;
    const idAntes = G.aula && G.aula.aj ? G.aula.aj.idioma : null;
    const lang0 = document.documentElement.lang;
    const auto = G.guardado && G.guardado.autosave;
    const toast0 = G.ui && G.ui.toastHTML;
    let html = '';
    const arr = G.pack.secretos || (G.pack.secretos = []);
    const puestos = [];
    const buscar = fn => {
      for (let dx = -80; dx <= 80; dx += 4) for (let dz = -80; dz <= 80; dz += 4) {
        const x = pos0.x + dx, z = pos0.z + dz, h = H(x, z), w = agua(x, z);
        if (!Number.isFinite(h)) continue;
        if (fn(h, w)) return { x, z, h, w };
      }
      return null;
    };
    const quieto = () => { S.vy = 0; G.fisica.MOVE.vx = 0; G.fisica.MOVE.vz = 0; };
    const meter = s => { arr.push(s); puestos.push(s); };
    try {
      if (auto) G.guardado.autosave = () => {};
      if (toast0) G.ui.toastHTML = function (h, ms) { html = String(h); return toast0.apply(this, arguments); };
      G.quiet = false;
      if (!Array.isArray(S.secretos)) S.secretos = [];
      const seco = buscar((h, w) => w == null || h > w + 1);
      const mojado = buscar((h, w) => w != null && w > h + 0.6);
      check('Hay suelo seco y agua para probar el fondo', !!seco && !!mojado, seco && mojado ? 'seco ' + seco.x.toFixed(0) + ' agua ' + mojado.x.toFixed(0) : 'no');
      const rio = { id: 'qa98_rio', tipo: 'fondo', nombre: { es: 'Lo que se llevó el río', en: 'What the river carried' }, punto: { x: seco.x + 6, z: seco.z, r: 6 }, premio: {} };
      meter(rio);
      const enSeco = () => { S.pos.x = seco.x; S.pos.z = seco.z; S.pos.y = seco.h + 0.2; G.fisica.MOVE.flying = false; G.fisica.MOVE.swimming = false; quieto(); };
      enSeco();
      const d6 = Math.hypot(S.pos.x - rio.punto.x, S.pos.z - rio.punto.z);
      P.tick(0.2);
      check('En seco, a 6,0 m del punto, no se gana', !tiene('qa98_rio') && d6.toFixed(1) === '6.0', d6.toFixed(2));
      for (let i = 0; i < 20; i++) { enSeco(); P.tick(0.2); }
      check('A los 4 s en seco sigue sin ganarse', !tiene('qa98_rio'));
      check('En seco no está nadando', G.fisica.MOVE.swimming === false && G.fisica.MOVE.flying === false);
      rio.punto.x = seco.x; rio.punto.z = seco.z;
      S.pos.x = seco.x; S.pos.z = seco.z; S.pos.y = seco.h + 0.2; G.fisica.MOVE.flying = false; G.fisica.MOVE.swimming = false; quieto(); P.tick(0.2);
      check('En seco, encima del punto y a menos de 2,5 m del suelo, no se gana', !tiene('qa98_rio') && Math.abs(S.pos.y - seco.h) < 2.5);
      rio.punto.x = mojado.x; rio.punto.z = mojado.z;
      S.pos.x = mojado.x; S.pos.z = mojado.z; S.pos.y = mojado.w + 4; G.fisica.MOVE.flying = true; G.fisica.MOVE.swimming = false; quieto(); P.tick(0.15);
      check('Volando sobre el agua no se gana', !tiene('qa98_rio'));
      S.pos.y = mojado.w - 0.5; G.fisica.MOVE.flying = false; quieto(); P.tick(0.25);
      check('Buceando, bajo el agua y dentro del radio, sí se gana', tiene('qa98_rio'), 'y=' + S.pos.y.toFixed(2) + ' w=' + mojado.w.toFixed(2));
      const lejos = { id: 'qa98_lejos', tipo: 'fondo', nombre: { es: 'Lejos', en: 'Far' }, punto: { x: mojado.x + 20, z: mojado.z, r: 6 }, premio: {} };
      meter(lejos);
      S.pos.x = mojado.x; S.pos.z = mojado.z; S.pos.y = mojado.w - 0.5; G.fisica.MOVE.flying = false; quieto(); P.tick(0.2);
      check('Buceando fuera del radio no se gana', !tiene('qa98_lejos'));
      G.quiet = true;
      const callado = { id: 'qa98_callado', tipo: 'fondo', nombre: { es: 'Callado', en: 'Quiet' }, punto: { x: mojado.x, z: mojado.z, r: 6 }, premio: {} };
      meter(callado); P.tick(0.2);
      check('En silencio de prueba no se concede', !tiene('qa98_callado'));
      G.quiet = false;
      check('Ganarlo otra vez no se duplica', conceder(rio) === false && S.secretos.filter(id => id === 'qa98_rio').length === 1);
      if (G.aula && G.aula.aj) G.aula.aj.idioma = 'es';
      const esToast = { id: 'qa98_es', tipo: 'fondo', nombre: { es: 'Lo que se llevó el río', en: 'What the river carried' }, punto: { x: mojado.x, z: mojado.z, r: 6 }, premio: {} };
      meter(esToast); html = ''; S.pos.y = mojado.w - 0.5; quieto(); P.tick(0.2);
      check('En español el aviso dice el nombre en español', /Lo que se llevó el río/.test(html) && /Secreto/.test(html), html.replace(/<[^>]+>/g, ' '));
      if (G.idioma && G.idioma.poner) await G.idioma.poner('en');
      const enToast = { id: 'qa98_en', tipo: 'fondo', nombre: { es: 'Lo que se llevó el río', en: 'What the river carried' }, punto: { x: mojado.x, z: mojado.z, r: 6 }, premio: {} };
      meter(enToast); html = ''; S.pos.y = mojado.w - 0.5; G.fisica.MOVE.flying = false; quieto(); P.tick(0.2);
      check('En inglés el aviso dice What the river carried', /What the river carried/.test(html), html.replace(/<[^>]+>/g, ' '));
      check('En inglés el aviso no se queda en español', !/Lo que se llevó el río/.test(html), html.replace(/<[^>]+>/g, ' '));
      check('En inglés el rótulo es Secret', /Secret/.test(html) && !/Secreto/.test(html), html.replace(/<[^>]+>/g, ' '));
      const tr = G.idioma && G.idioma.tr;
      check('El diccionario traduce el aviso', !!tr && tr('Lo que se llevó el río') === 'What the river carried' && tr('Secreto') === 'Secret', tr && tr('Lo que se llevó el río'));
      const llev = { id: 'qa98_lleva', tipo: 'llevar', nombre: { es: 'Llevar', en: 'Carry' }, desde: { x: seco.x, z: seco.z, r: 4 }, hasta: { x: seco.x + 30, z: seco.z, r: 3 }, premio: {} };
      meter(llev);
      S.pos.x = seco.x; S.pos.z = seco.z; S.pos.y = seco.h + 0.2; G.fisica.MOVE.flying = false; G.fisica.MOVE.swimming = false; quieto(); P.tick(0.2);
      check('En seco, llevar sigue usando el suelo: se recoge sin bucear', !!(st.get('qa98_lleva') || {}).lleva && !tiene('qa98_lleva'));
    } catch (e) {
      check('QA-98', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      for (const s of puestos) { const i = arr.indexOf(s); if (i >= 0) arr.splice(i, 1); st.delete(s.id); }
      S.secretos = sec0;
      S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z;
      G.quiet = quiet0; G.fisica.MOVE.flying = fly0; G.fisica.MOVE.swimming = swim0;
      if (G.aula && G.aula.aj && idAntes) G.aula.aj.idioma = idAntes;
      if (toast0) G.ui.toastHTML = toast0;
      if (auto) G.guardado.autosave = auto;
      if (G.idioma && G.idioma.poner) await G.idioma.poner(lang0 === 'en' ? 'en' : 'es');
      document.documentElement.lang = lang0 || 'es';
    }
    while (out.length < 16) check('QA-98 incompleto', false);
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }

  return { lista, tiene, conceder, test, cg34 };
});
