/* Juego · CG-45. Sorpresas de la ciudad que rotan en cada visita.
   No edita ciudad_viva.js, vecinos.js ni musica.js. El coquí y la mariposa se anuncian aquí;
   mover sus instancias pediría vecinos.js (CG-44) y queda anotado.
   Hay 12 momentos. Al entrar en la ciudad salen 1 o 2, junto al jugador, y ninguno se repite
   en la visita siguiente. Hay que salir para que la próxima entrada cuente como otra visita.
   El primero de cada tipo entra al cómic (G.emit('momento')) y al Diario. G.emit('sorpresa')
   avisa a la música que ya está en musica.js.
   El contador y las notitas viven en este dispositivo (localStorage).
   window.AVSorpresas(G) → { test, estado }. Prueba: AV.sorpresasTest(). */
window.AVSorpresas = function (G) {
  'use strict';
  if (G.sorpresas) return G.sorpresas;
  const S = G.S;
  const H = (x, z) => G.terreno.height(x, z);
  const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.ciudadVisitas';
  const MOMENTOS = [
    { id: 'fruta', es: 'Dos cotorras se pelean por una fruta y se les cae.', en: 'Two parrots argue over a fruit and drop it.' },
    { id: 'cuerda', es: 'Una hace equilibrio en una cuerda y resbala.', en: 'One balances on a rope and slips.' },
    { id: 'coqui', es: 'Un coquí salta a la cabeza de una cotorra.', en: 'A coquí hops onto a parrot’s head.' },
    { id: 'mariposa', es: 'Una mariposa persigue a un pichón.', en: 'A butterfly chases a chick.' },
    { id: 'imita', es: 'Una cotorra imita el pío de Vittata y se va.', en: 'A parrot copies Vittata’s peep and leaves.' },
    { id: 'baile', es: 'Un grupo baila cuando suena la música.', en: 'A group dances when the music plays.' },
    { id: 'sonambula', es: 'De noche, una sonámbula se cae de la percha y vuelve.', en: 'At night, a sleepwalker falls off the perch and climbs back.' },
    { id: 'hoja', es: 'Una hoja se le posa en la cabeza a una cotorra.', en: 'A leaf lands on a parrot’s head.' },
    { id: 'charco', es: 'Una se inclina ante su reflejo en un charco.', en: 'One bows to its reflection in a puddle.' },
    { id: 'carrera', es: 'Dos echan una carrera y una tropieza.', en: 'Two race and one trips.' },
    { id: 'siesta', es: 'Una se queda dormida y ronca bajito.', en: 'One falls asleep and snores softly.' },
    { id: 'flor', es: 'Una deja caer una flor al pasar.', en: 'One drops a flower as it passes.' }
  ];
  const en = () => (G.idioma && G.idioma.actual && G.idioma.actual() === 'en') || !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const texto = m => (en() ? m.en : m.es);
  let memoria = { visitas: 0, ultima: [], vistos: [], notas: [] };
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (d && Array.isArray(d.ultima)) {
      memoria = { visitas: d.visitas || 0, ultima: d.ultima, vistos: Array.isArray(d.vistos) ? d.vistos : [], notas: Array.isArray(d.notas) ? d.notas : [] };
    }
  } catch (e) { /* sin almacén */ }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(memoria)); } catch (e) { /* sin almacén */ } }
  if (G.audio && G.audio.define) {
    try { G.audio.define('sorpresa', (t, a, X) => { X.tone(660, t, 0.12, { type: 'triangle', gain: 0.05 }); X.tone(880, t + 0.1, 0.18, { type: 'sine', gain: 0.04 }); }); } catch (e) { /* ya estaba */ }
  }
  let enPrueba = false, fuera = true;

  function deNoche() {
    const C = G.ciudadViva;
    if (C && typeof C.noche === 'function') return !!C.noche();
    const h = S.hora;
    return typeof h === 'number' && (h >= 19 || h < 5.5);
  }
  let centroCache = null, centroCacheSrc = null; // el sitio de la ciudad cambia en raras ocasiones: caché por identidad (CG-67)
  function centro() {
    const C = G.ciudadViva;
    if (C && typeof C.sitio === 'function') {
      try {
        const s = C.sitio();
        if (s && typeof s.x === 'number') {
          if (centroCacheSrc !== s) { centroCacheSrc = s; centroCache = { x: s.x, z: s.z, r: s.r || 40 }; }
          return centroCache;
        }
      } catch (e) { /* sin ciudad cargada */ }
    }
    if (!centroCache) centroCache = { x: 11, z: -76, r: 40 };
    return centroCache;
  }
  // Por encima del suelo y del sólido. Si el punto sigue dentro, sube hasta salir.
  function piso(x, z) {
    const suelo = H(x, z);
    const so = G.solidos && G.solidos.activo ? G.solidos : null;
    let y = suelo;
    if (so && so.altoEn) {
      const t = so.altoEn(x, z, 1e4);
      if (isFinite(t)) y = Math.max(y, t);
    }
    y += 0.45;
    if (so && so.dentro) {
      const techo = so.dentro(x, z, y);
      if (typeof techo === 'number' && techo > y) y = techo + 0.45;
    }
    if (!(y >= suelo)) y = suelo + 0.45;
    return y;
  }
  function elegir(ultima) {
    const prohibidos = new Set(ultima || []);
    let bolsa = MOMENTOS.filter(m => !prohibidos.has(m.id));
    if (!deNoche()) bolsa = bolsa.filter(m => m.id !== 'sonambula');
    if (!bolsa.length) bolsa = MOMENTOS.filter(m => !prohibidos.has(m.id));
    if (!bolsa.length) bolsa = MOMENTOS.filter(m => m.id !== 'sonambula');
    const n = 1 + ((memoria.visitas || 0) % 2);
    const copia = bolsa.slice();
    const out = [];
    let sem = ((memoria.visitas || 0) * 17 + 3) >>> 0;
    while (out.length < n && copia.length) {
      sem = (Math.imul(sem, 1103515245) + 12345) >>> 0;
      out.push(copia.splice(sem % copia.length, 1)[0]);
    }
    return out;
  }
  function jugar(m, x, z) {
    const y = piso(x, z);
    const nuevo = !memoria.vistos.includes(m.id);
    const pref = en() ? 'You saw something new in the city: ' : 'Viste algo nuevo en la ciudad: ';
    const linea = (nuevo ? pref : '') + texto(m);
    if (G.fx && G.fx.burst) G.fx.burst(x, y, z, 'leaves', 8);
    G.emit('sorpresa');
    if (G.audio && G.audio.play) { try { G.audio.play('sorpresa'); } catch (e) { /* sin audio */ } }
    if (G.ui && G.ui.toast && !enPrueba) G.ui.toast(linea, 3200);
    if (nuevo) {
      memoria.vistos.push(m.id);
      memoria.notas.push(linea);
      guardar();
      G.emit('momento', { id: m.id, texto: linea, prueba: enPrueba });
    }
    return { id: m.id, x, y, z };
  }
  function visitar(x, z) {
    memoria.visitas = (memoria.visitas || 0) + 1;
    const lista = elegir(memoria.ultima);
    memoria.ultima = lista.map(m => m.id);
    guardar();
    return lista.map((m, i) => jugar(m, x + i * 1.6, z));
  }
  // pul4 (8-nov): «Viste algo nuevo en la ciudad: …» salía al empezar un duelo, el minigolf o un reto V18 y tapaba la meta.
  // Mismo criterio que lugares.js (G.lugares.enV18, el de la guía de controles): mientras dura la visita espera y, si sigue
  // en la ciudad al terminar, el momento sale entonces (no se pierde: fuera sigue en true).
  const enV18 = () => { try { return !!(G.lugares && G.lugares.enV18 && G.lugares.enV18()); } catch (e) { return false; } };
  function alMover() {
    if ((G.quiet || enPrueba) && !alMover.forzar) return;
    if (enV18()) return;
    const c = centro();
    const d = Math.hypot(S.pos.x - c.x, S.pos.z - c.z);
    const r = c.r || 40;
    if (d > r + 22) fuera = true;
    else if (fuera && d < r) { fuera = false; visitar(S.pos.x, S.pos.z); }
  }
  G.on('update', () => { if (!alMover.forzar) alMover(); });

  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    let crudo = null; try { crudo = localStorage.getItem(CLAVE); } catch (e) { /* */ }
    const antes = { x: S.pos.x, z: S.pos.z, quiet: G.quiet, hora: S.hora, solidos: G.solidos };
    const oidos = [];
    const oyente = d => oidos.push(d && d.id);
    G.on('momento', oyente);
    const mem0 = JSON.parse(JSON.stringify(memoria));
    try {
      ok('Hay al menos 12 momentos', MOMENTOS.length >= 12, String(MOMENTOS.length));
      enPrueba = true;
      memoria = { visitas: 0, ultima: [], vistos: [], notas: [] };
      S.hora = 12;
      let prev = [], rotan = true;
      for (let i = 0; i < 12; i++) {
        memoria.visitas = i + 1;
        const lista = elegir(prev);
        const ids = lista.map(m => m.id);
        if (lista.length < 1 || lista.length > 2 || new Set(ids).size !== ids.length || ids.some(id => prev.includes(id)) || ids.includes('sonambula')) rotan = false;
        prev = ids;
      }
      ok('Doce visitas de día: 1 o 2 momentos, sin repetir el anterior ni la sonámbula', rotan, prev.join(','));
      memoria.visitas = 1;
      const a = elegir([]);
      memoria.ultima = a.map(m => m.id);
      const b = elegir(memoria.ultima);
      ok('La visita siguiente no repite el momento anterior', b.length >= 1 && b.every(m => !a.some(x => x.id === m.id)), a.map(m => m.id) + ' → ' + b.map(m => m.id));
      G.quiet = false;
      const p = jugar(MOMENTOS[0], 11, -76);
      ok('El momento queda sobre el suelo', p.y >= H(p.x, p.z) - 0.02, p.y.toFixed(2));
      G.solidos = { activo: true, altoEn: () => 4, dentro: (x, z, y) => y < 6 ? 8 : 0 };
      const alto = piso(3, 4);
      ok('No atraviesa un sólido: queda por encima del techo', alto >= 8.4, alto.toFixed(2));
      G.solidos = antes.solidos;
      ok('La primera vez avisa al cómic y deja notita', oidos.includes('fruta') && memoria.notas.some(n => n.indexOf('Viste algo nuevo en la ciudad:') === 0 || n.indexOf('You saw something new in the city:') === 0), oidos.join(','));
      const n0 = oidos.length;
      jugar(MOMENTOS[0], 12, -76);
      ok('La segunda vez del mismo tipo no vuelve a avisar', oidos.length === n0, String(oidos.length));
      const burst = G.fx && G.fx.burst;
      if (G.fx) G.fx.burst = () => {};
      const info = G.renderer.renderer.info;
      const una = () => { G.renderer.renderer.render(G.renderer.scene, G.renderer.camera); return info.render.calls; };
      const c0 = una();
      const c1 = una();
      if (G.fx) G.fx.burst = burst;
      ok('No suma draw calls nuevos (no hay malla propia)', c1 - c0 <= 0 && !G.renderer.scene.children.some(o => o && o.name === 'sorpresas'), c0 + ' → ' + c1);
      {
        // pul4: con una actividad V18 en marcha, entrar en la ciudad no suelta el momento; al terminar, sí
        const c = centro(), px = S.pos.x, pz = S.pos.z, v1 = memoria.visitas, fueraBk = fuera;
        alMover.forzar = true; fuera = true; S.pos.x = c.x; S.pos.z = c.z;
        document.body.classList.add('v18-golf-on');
        let durante = -1, despues = -1;
        try { alMover(); durante = memoria.visitas - v1; document.body.classList.remove('v18-golf-on'); alMover(); despues = memoria.visitas - v1; }
        finally { document.body.classList.remove('v18-golf-on'); alMover.forzar = false; S.pos.x = px; S.pos.z = pz; fuera = fueraBk; }
        ok('pul4 · con un duelo, el minigolf o un reto V18 en marcha «Viste algo nuevo» espera y sale al terminar', !G.lugares || (durante === 0 && despues === 1), 'durante ' + durante + ' · después ' + despues);
      }
      const v0 = memoria.visitas;
      visitar(11, -76);
      ok('El contador de visitas sube', memoria.visitas === v0 + 1, String(memoria.visitas));
      ok('La notita queda guardada para el Diario', memoria.notas.length >= 1 && JSON.parse(localStorage.getItem(CLAVE) || '{}').notas.length >= 1, String(memoria.notas.length));
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    try { if (crudo == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, crudo); } catch (e) { /* */ }
    memoria = mem0;
    S.pos.x = antes.x; S.pos.z = antes.z; S.hora = antes.hora; G.quiet = antes.quiet; G.solidos = antes.solidos;
    enPrueba = false; fuera = true;
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  G.sorpresas = { test, paso: alMover, MOMENTOS, elegir, jugar, visitar, estado: () => ({ visitas: memoria.visitas, ultima: memoria.ultima.slice(), notas: memoria.notas.slice() }) };
  return G.sorpresas;
};
