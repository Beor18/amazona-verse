/* Juego · CG-45. Sorpresas de la ciudad que cambian en cada visita.
   No toca ciudad_viva.js ni añade mallas: el momento es un aviso, un sonido y el juice que ya existe (G.fx).
   Hay 12 momentos. Cada visita a la ciudad (una vez por partida, al acercarte) enseña 1 o 2, y ninguno se repite
   respecto a la visita anterior. El primero de cada tipo avisa al cómic con G.emit('momento') y deja una notita.
   El contador vive en este dispositivo (localStorage), no en los textos educativos.
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
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const texto = m => (en() ? m.en : m.es);
  let memoria = { visitas: 0, ultima: [], vistos: [] };
  try { const d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (d && Array.isArray(d.ultima)) memoria = d; } catch (e) { /* sin almacén */ }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(memoria)); } catch (e) { /* sin almacén */ } }
  if (G.audio && G.audio.define) {
    try { G.audio.define('sorpresa', (t, a, X) => { X.tone(660, t, 0.12, { type: 'triangle', gain: 0.05 }); X.tone(880, t + 0.1, 0.18, { type: 'sine', gain: 0.04 }); }); } catch (e) { /* ya estaba */ }
  }
  const notas = [];
  let hecha = false, activas = [], enPrueba = false;

  function elegir(ultima) {
    const prohibidos = new Set(ultima || []);
    const bolsa = MOMENTOS.filter(m => !prohibidos.has(m.id));
    const n = 1 + ((memoria.visitas || 0) % 2);
    const out = [];
    let sem = (memoria.visitas * 17 + 3) % 997;
    while (out.length < n && out.length < bolsa.length) {
      sem = (sem * 13 + 7) % bolsa.length;
      const m = bolsa[sem % bolsa.length];
      if (!out.includes(m)) out.push(m);
      else break;
    }
    if (!out.length) out.push(MOMENTOS[(memoria.visitas || 0) % MOMENTOS.length]);
    return out;
  }
  function jugar(m, x, z) {
    const y = H(x, z) + 1.2;
    activas.push({ id: m.id, x, z, y });
    if (G.fx && G.fx.burst) G.fx.burst(x, y, z, 'leaves', 8);
    if (G.audio && G.audio.play) { try { G.audio.play('sorpresa'); } catch (e) { /* sin audio */ } }
    const nuevo = !memoria.vistos.includes(m.id);
    const linea = (nuevo ? (en() ? 'You saw something new in the city: ' : 'Viste algo nuevo en la ciudad: ') : '') + texto(m);
    if (G.ui && G.ui.toast) G.ui.toast(linea, 3200);
    if (nuevo) {
      memoria.vistos.push(m.id);
      notas.push(linea);
      G.emit('momento', { id: m.id, texto: linea });
    }
    return { id: m.id, x, y, z };
  }
  function visitar(x, z) {
    if (hecha) return activas;
    hecha = true;
    memoria.visitas = (memoria.visitas || 0) + 1;
    const lista = elegir(memoria.ultima);
    memoria.ultima = lista.map(m => m.id);
    guardar();
    lista.forEach((m, i) => jugar(m, x + i * 1.4, z));
    return lista;
  }
  G.on('update', () => {
    if (hecha || G.quiet || enPrueba) return;
    if (Math.hypot(S.pos.x - 11, S.pos.z + 76) < 40) visitar(S.pos.x, S.pos.z);
  });

  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    let crudo = null; try { crudo = localStorage.getItem(CLAVE); } catch (e) { /* */ }
    const antes = { x: S.pos.x, z: S.pos.z, quiet: G.quiet };
    const oidos = [];
    const oyente = d => oidos.push(d.id);
    G.on('momento', oyente);
    try {
      ok('Hay al menos 12 momentos', MOMENTOS.length >= 12, String(MOMENTOS.length));
      enPrueba = true;
      memoria = { visitas: 0, ultima: [], vistos: [] }; hecha = false; activas = [];
      const a = elegir([]);
      memoria.ultima = a.map(m => m.id); memoria.visitas = 1;
      const b = elegir(memoria.ultima);
      ok('La visita siguiente no repite el momento anterior', b.length >= 1 && b.every(m => !a.some(x => x.id === m.id)), a.map(m => m.id) + ' → ' + b.map(m => m.id));
      G.quiet = false;
      const p = jugar(MOMENTOS[0], 11, -76);
      ok('El momento queda sobre el suelo', p.y >= H(p.x, p.z) - 0.02, p.y.toFixed(2));
      ok('La primera vez avisa al cómic y deja notita', oidos.includes('fruta') && notas.some(n => /fruta|fruit/i.test(n)), oidos.join(','));
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
      hecha = false;
      const v0 = memoria.visitas;
      visitar(11, -76);
      ok('El contador de visitas sube', memoria.visitas === v0 + 1, String(memoria.visitas));
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    try { if (crudo == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, crudo); } catch (e) { /* */ }
    S.pos.x = antes.x; S.pos.z = antes.z; G.quiet = antes.quiet; hecha = true; enPrueba = false;
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  G.sorpresas = { test, MOMENTOS, elegir, jugar, visitar, estado: () => ({ visitas: memoria.visitas, ultima: memoria.ultima.slice(), notas: notas.slice() }) };
  return G.sorpresas;
};
