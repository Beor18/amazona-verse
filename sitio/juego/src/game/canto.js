/* Juego · T43 · «Sigue el canto» (minijuego corto de «Más juegos», 1–3 minutos).
   Cuatro cotorras de colores cantan una secuencia; el niño la repite tocándolas (o con 1-4 / las flechas). Cada ronda suma
   una nota. Al fallar no se castiga: «¡Casi!», la ronda a la que llegó y el récord, con «Otra vez» y «Salir» a la vista.
   Cantos sintetizados (G.audio.define, sin descargas). El mundo queda en pausa mientras se juega (G.pausa 'canto').
   Récord en este dispositivo (localStorage, clave <almacen>.canto); sin cuentas ni datos personales.
   API: window.AVCanto(G) → G.cantoApi = { empezar, salir, activo, pulsar, estado, test }. Lo abre menu_modos.js («Más juegos»).
   Prueba: AV.cantoTest(). */
window.AVCanto = function (G) {
  'use strict';
  if (G.cantoApi) return G.cantoApi;
  const ALM = (((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse')) + '.canto';
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const L = (es, eng) => (en() ? eng : es);
  // Las cuatro cotorras: color, nota (pentatónica, se distinguen bien) y tecla
  const AVES = [
    // retrato: los de la V18 que ya están en el repo (assets/retratos/v18), uno de cada color
    { id: 'verde', col: '#3fae4f', luz: '#9df0a2', f: 392.0, n: ['Verde', 'Green'], r: 'agilis' },
    { id: 'roja', col: '#d6403a', luz: '#ffa79e', f: 523.25, n: ['Roja', 'Red'], r: 'brasiliensis' },
    { id: 'azul', col: '#2f78c4', luz: '#9ed0ff', f: 659.25, n: ['Azul', 'Blue'], r: 'versicolor' },
    { id: 'amarilla', col: '#e0a31a', luz: '#ffe39a', f: 783.99, n: ['Amarilla', 'Yellow'], r: 'tresmariae' }
  ];
  const A = G.audio;
  if (A && A.define) AVES.forEach((a, i) => A.define('canto' + i, (t, x, X) => {
    X.tone(a.f, t, 0.26, { type: 'triangle', to: a.f * 1.18, gain: 0.16 });
    X.tone(a.f * 2, t + 0.02, 0.16, { type: 'sine', to: a.f * 2.3, gain: 0.05 });
  }));
  const sonar = n => { try { if (!G.quiet && A && A.play) A.play(n); } catch (e) { /* sin audio */ } };
  // PULIR 4: el sonido del final sale de la tabla común (src/game/menu_modos.js, window.AVFinJuego): victoria, casi o récord (logro a los 500 ms)
  const finSon = (tipo, sigue) => { const F = window.AVFinJuego; if (!F) return 0; if (tipo === 'record') return F.record(G, 'canto', sigue); F.sonar(G, 'canto', tipo); return 0; };
  const leerRec = () => { try { const d = JSON.parse(localStorage.getItem(ALM) || 'null'); return d && d.v === 1 && Number.isInteger(d.mejor) && d.mejor >= 0 && d.mejor < 1000 ? d.mejor : 0; } catch (e) { return 0; } };
  const guardarRec = n => { try { localStorage.setItem(ALM, JSON.stringify({ v: 1, mejor: n })); } catch (e) { /* sin almacén */ } };

  // Estado: 'nada' | 'escucha' (canta la secuencia) | 'turno' (repite el niño) | 'fin'
  const E = { fase: 'nada', sec: [], pos: 0, ronda: 0, mejor: leerRec(), nuevo: false, timers: [], vel: 1, semilla: 0 };
  let azarS = 1; const azar = () => { azarS = (azarS * 16807) % 2147483647; return (azarS - 1) / 2147483646; };
  const sig = () => (E.semilla ? Math.floor(azar() * 4) : Math.floor(Math.random() * 4));
  const espera = (ms, fn) => { const id = setTimeout(() => { E.timers = E.timers.filter(x => x !== id); fn(); }, ms / E.vel); E.timers.push(id); };
  const limpiar = () => { E.timers.forEach(clearTimeout); E.timers = []; };

  // ---------- Panel ----------
  let el = null;
  function css() {
    if (document.getElementById('canto-css')) return;
    const st = document.createElement('style'); st.id = 'canto-css';
    st.textContent = '#canto{position:fixed;inset:0;z-index:80;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,rgba(16,48,32,.94),rgba(8,20,14,.98));font-family:Fredoka,system-ui,sans-serif;color:#fff8ea;padding:16px;box-sizing:border-box}' +
      '#canto[hidden]{display:none}#canto .c-caja{width:min(440px,100%);display:flex;flex-direction:column;align-items:center;gap:14px}' +
      '#canto h2{margin:0;font-size:26px;text-shadow:0 2px 6px #0008}#canto .c-info{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;font-weight:600;font-size:16px}' +
      '#canto .c-info span{background:rgba(255,255,255,.14);border-radius:999px;padding:4px 12px}#canto .c-msg{min-height:1.4em;margin:0;font-size:17px;font-weight:600;text-align:center;max-width:100%}#canto.c-turno .c-msg{animation:c-respira 1.2s ease-in-out infinite}' +
      '#canto .c-notas{display:flex;gap:8px;min-height:16px;justify-content:center;align-items:center}#canto .c-notas[hidden]{display:none}#canto .c-notas i{width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.22);box-shadow:inset 0 0 0 2px rgba(255,255,255,.75)}#canto .c-notas i.va{background:#ffd27a;transform:scale(1.3)}#canto .c-notas i.hecha{background:#9df0a2}' +
      '#canto .c-aves{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;width:100%}' +
      '#canto .c-ave{all:unset;box-sizing:border-box;aspect-ratio:1;border-radius:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;background:var(--c);border:4px solid rgba(255,255,255,.35);box-shadow:0 6px 0 rgba(0,0,0,.25),0 8px 18px rgba(0,0,0,.35);transition:transform .08s,filter .08s;touch-action:manipulation;color:#fff;font-weight:700;font-size:18px;text-shadow:0 1px 3px #0009}' +
      '#canto .c-ave img{width:62%;height:auto;border-radius:50%;background:rgba(255,255,255,.22);box-shadow:inset 0 0 0 3px rgba(255,255,255,.35);pointer-events:none}#canto .c-ave:focus-visible{outline:4px solid #ffd27a;outline-offset:3px}' +
      '#canto .c-ave.luz{background:var(--l);transform:scale(1.05);box-shadow:0 0 0 6px rgba(255,255,255,.65),0 0 30px var(--l)}#canto .c-ave[aria-disabled="true"]{cursor:default}#canto .c-ave[aria-disabled="true"]:not(.luz){filter:saturate(.8) brightness(.92)}' +
      '#canto .c-bots{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}#canto .c-bots button{min-height:54px;padding:4px 22px;font:700 18px Fredoka,system-ui,sans-serif;border-radius:22px;border:0;background:#fff3d6;color:#3b2a14;box-shadow:0 3px 0 rgba(0,0,0,.25);cursor:pointer}' +
      '#canto .c-bots button[hidden]{display:none}#canto .c-bots .c-salir{background:#ffd0c4}#canto .c-bots button:focus-visible{outline:4px solid #ffd27a;outline-offset:2px}' + // PULIR 4: botones como el panel común (.av-bot, ui.css)
      // PULIR 3 (niño de 7 años): tras fallar, «Otra vez» era una píldora crema igual de visible que «Salir»: ahora grande, naranja y respira
      '#canto .c-bots [data-a="otra"]{min-height:60px;padding:8px 28px;font-size:21px;background:#f2a03d;color:#2b1a05;box-shadow:0 4px 0 #b86f1c;animation:c-respira 1.6s ease-in-out infinite}#canto .c-bots [data-a="otra"]::before{content:"\\21BB\\00a0" / "";font-weight:800}' +
      '@keyframes c-respira{50%{transform:scale(1.06)}}@media (prefers-reduced-motion:reduce){#canto .c-bots [data-a="otra"]{animation:none}}' +
      'body.canto-on :is(#stick,#acts,#v18-exp-poder,#v18-extra,#prompt,#toast,#modo-salir,#quest,#inv,#b-diary,#b-emotes,#b-menu,#b-construir,#b-nido,#minimapa,#marcador,#top,#sys,#guia-hud,#title,#creator,#card){visibility:hidden!important}' + // el juego tapa todo: sin HUD, portada ni creador detrás (F22: tampoco «Controles»)
      // T51: en horizontal (teléfono tumbado) las cuatro en una fila, del tamaño que deja el alto; «Salir» siempre a la vista
      '@media (orientation:landscape) and (max-height:560px){#canto .c-caja{width:min(900px,100%);gap:8px}#canto h2{font-size:21px}#canto .c-msg{min-height:1.2em;margin:0}' +
      '#canto .c-aves{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;width:min(100%,calc((100dvh - 170px) * 4 + 30px))}#canto .c-ave{border-radius:20px;font-size:15px}#canto .c-bots button{min-height:44px}}' +
      '@media (prefers-reduced-motion:reduce){#canto .c-ave{transition:none}#canto .c-ave.luz{transform:none}#canto.c-turno .c-msg{animation:none}#canto .c-notas i.va{transform:none}}' +
      // PULIR 4 (revisión): título 26 px (21 en horizontal bajo) y mensaje 17 px como el panel común; al terminar, número grande, botones de 54 px y sin las cuatro aves debajo
      '#canto .c-caja:focus{outline:none}#canto.c-fin .c-aves{display:none}#canto.c-fin .c-bots button{min-height:54px}';
    document.head.appendChild(st);
  }
  function montar() {
    if (el) return el;
    css();
    el = document.createElement('div'); el.id = 'canto'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'canto-t'); // F22: el lector dice «Sigue el canto»
    el.innerHTML = '<div class="c-caja av-fin" tabindex="-1"><h2 id="canto-t" data-k="t"></h2><div class="av-num" data-k="num" hidden></div><div class="c-info"><span data-k="ronda"></span><span data-k="mejor"></span></div><p class="c-msg av-msg" data-k="msg" aria-live="polite"></p><div class="c-notas" data-k="notas" aria-hidden="true"></div>' +
      '<div class="c-aves">' + AVES.map((a, i) => `<button type="button" class="c-ave" data-i="${i}" style="--c:${a.col};--l:${a.luz}"><img src="assets/retratos/v18/${a.r}.png" alt="" width="128" height="128" draggable="false"><span data-k="n${i}"></span></button>`).join('') + '</div>' +
      '<div class="c-bots av-bots"><button type="button" class="av-bot" data-a="otra" hidden></button><button type="button" class="c-salir av-bot salir" data-a="salir"></button></div></div>';
    el.addEventListener('pointerdown', e => {
      const b = e.target.closest && e.target.closest('button'); if (!b) return;
      e.preventDefault();
      if (b.dataset.i != null) pulsar(+b.dataset.i); else if (b.dataset.a === 'otra') nueva(); else if (b.dataset.a === 'salir') salir();
    });
    el.addEventListener('click', e => { // Enter/Espacio con el foco (F22: también sobre una cotorra)
      const b = e.target.closest && e.target.closest('button'); if (!b || e.detail !== 0) return;
      if (b.dataset.i != null) pulsar(+b.dataset.i); else if (b.dataset.a === 'otra') nueva(); else if (b.dataset.a === 'salir') salir();
    });
    document.body.appendChild(el);
    return el;
  }
  const q = k => el.querySelector('[data-k="' + k + '"]');
  function pintar(msg) {
    if (!el) return;
    q('t').textContent = L('Sigue el canto', 'Follow the song');
    q('ronda').textContent = L('Ronda ', 'Round ') + Math.max(1, E.ronda);
    q('mejor').textContent = L('Récord: ', 'Best: ') + E.mejor; q('mejor').hidden = !E.mejor; // sin «Récord: 0» antes del primer récord (como los demás)
    el.classList.toggle('c-fin', E.fase === 'fin'); el.classList.toggle('c-turno', E.fase === 'turno');
    q('num').hidden = E.fase !== 'fin'; q('num').textContent = E.fase === 'fin' ? String(Math.max(0, E.ronda - 1)) : '';
    notas();
    AVES.forEach((a, i) => { q('n' + i).textContent = L(a.n[0], a.n[1]); });
    if (msg != null) q('msg').textContent = msg;
    const turno = E.fase === 'turno';
    el.querySelectorAll('.c-ave').forEach(b => b.setAttribute('aria-disabled', String(!turno)));
    const otra = el.querySelector('[data-a="otra"]'); otra.hidden = E.fase !== 'fin'; otra.textContent = L('Otra vez', 'Play again');
    el.querySelector('[data-a="salir"]').textContent = L('Salir', 'Exit');
  }
  function notas(va) {
    const box = el && el.querySelector('[data-k="notas"]'); if (!box) return;
    const n = E.sec.length, fin = E.fase === 'fin';
    box.hidden = fin || !n;
    box.innerHTML = fin ? '' : Array.from({ length: n }, (_, i) => `<i class="${E.fase === 'turno' && i < E.pos ? 'hecha' : ''}${i === va ? ' va' : ''}"></i>`).join('');
  }
  function luz(i, ms, k) {
    const b = el && el.querySelector(`.c-ave[data-i="${i}"]`); if (!b) return;
    b.classList.add('luz'); sonar('canto' + i); if (k != null) notas(k);
    espera(ms, () => { b.classList.remove('luz'); if (k != null && E.fase === 'escucha') notas(); });
  }

  // ---------- Juego ----------
  function cantar() {
    E.fase = 'escucha'; E.pos = 0; pintar(L('Escucha y luego toca las mismas', 'Listen, then tap the same ones'));
    const paso = Math.max(330, 620 - E.ronda * 18); // un poco más rápido cada ronda, sin pasarse
    E.sec.forEach((i, k) => espera(500 + k * paso, () => luz(i, paso * 0.65, k)));
    espera(500 + E.sec.length * paso, () => { if (E.fase !== 'escucha') return; E.fase = 'turno'; pintar(L('¡Tu turno! Toca las mismas', 'Your turn! Tap the same ones')); });
  }
  function ronda() { E.ronda++; E.sec.push(sig()); pintar(); cantar(); }
  function nueva() { limpiar(); E.sec = []; E.ronda = 0; E.nuevo = false; ronda(); }
  function pulsar(i) {
    if (E.fase !== 'turno' || !(i >= 0 && i < 4)) return false;
    luz(i, 220);
    if (i !== E.sec[E.pos]) { fin(); return false; }
    E.pos++; notas();
    if (E.pos >= E.sec.length) {
      E.fase = 'escucha'; sonar('ring'); pintar(L('¡Bien!', 'Nice!'));
      espera(650, ronda);
    }
    return true;
  }
  function fin() {
    E.fase = 'fin'; limpiar();
    const hechas = Math.max(0, E.ronda - 1);
    E.nuevo = hechas > E.mejor; if (E.nuevo) { E.mejor = hechas; guardarRec(hechas); }
    finSon(E.nuevo ? 'victoria' : 'casi'); if (E.nuevo) E.timers.push(finSon('record', () => E.fase === 'fin')); // PULIR 4: tabla común (antes unlock/wrong); limpiar() cancela el logro
    pintar(E.nuevo ? L(`¡Nuevo récord: ${hechas}!`, `New record: ${hechas}!`) : L(`¡Casi! Repetiste ${hechas} ${hechas === 1 ? 'canto' : 'cantos'}.`, `So close! You repeated ${hechas} ${hechas === 1 ? 'song' : 'songs'}.`));
    const caja = el && el.querySelector('.c-caja'); if (caja) setTimeout(() => { try { if (E.fase === 'fin') caja.focus({ preventScroll: true }); } catch (e) { /* */ } }, 0); // PULIR 4 (revisión): el foco va al panel, como en los demás
  }
  function tecla(e) {
    if (!activo() || e.repeat) return;
    const k = e.key;
    const i = { 1: 0, 2: 1, 3: 2, 4: 3, ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[k];
    if (i != null) { e.preventDefault(); e.stopImmediatePropagation(); pulsar(i); return; }
    if (k === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); salir(); return; }
    if (k === 'Tab' && el && !el.hidden) { // F22: el diálogo es modal: el foco da la vuelta entre sus botones a la vista
      e.preventDefault(); e.stopImmediatePropagation();
      const bs = [...el.querySelectorAll('button')].filter(b => !b.hidden && b.getClientRects().length), j0 = bs.indexOf(document.activeElement), n = bs.length;
      if (!n) return;
      const j = e.shiftKey ? (j0 <= 0 ? n - 1 : j0 - 1) : (j0 < 0 || j0 >= n - 1 ? 0 : j0 + 1);
      try { bs[j].focus({ preventScroll: true }); } catch (er) { /* */ }
    }
  }
  addEventListener('keydown', tecla, true);
  const activo = () => E.fase !== 'nada';
  function empezar(o) {
    o = o || {};
    E.vel = o.vel || 1; E.semilla = o.semilla || 0; azarS = E.semilla || 1;
    montar(); el.hidden = false; document.body.classList.add('canto-on');
    try { if (G.pausa && G.pausa.set) G.pausa.set('canto', true); } catch (e) { /* sin pausa */ }
    nueva();
    const b0 = el.querySelector('.c-ave'); if (b0) setTimeout(() => { try { b0.focus({ preventScroll: true }); } catch (e) { /* */ } }, 0);
    return true;
  }
  function salir() {
    if (!activo()) return false;
    limpiar(); E.fase = 'nada';
    if (el) { el.hidden = true; q('msg').textContent = ''; } document.body.classList.remove('canto-on'); // sin texto viejo (ni en otro idioma) mientras no se juega
    try { if (G.pausa && G.pausa.set) G.pausa.set('canto', false); } catch (e) { /* sin pausa */ }
    return true;
  }

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const q0 = G.quiet, rec0 = (() => { try { return localStorage.getItem(ALM); } catch (e) { return null; } })();
    const hasta = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (f()) return true; await new Promise(r => setTimeout(r, 20)); } return f(); };
    G.quiet = true;
    try {
      try { localStorage.removeItem(ALM); } catch (e) { /* */ } E.mejor = 0;
      empezar({ vel: 8, semilla: 7 });
      check('Se abre con 4 cotorras grandes (≥ 64 px), su nombre, la ronda, el récord y «Salir»', !el.hidden && el.querySelectorAll('.c-ave').length === 4 && [...el.querySelectorAll('.c-ave')].every(b => b.getBoundingClientRect().width >= 64 && b.textContent.trim()) && /Ronda 1/.test(q('ronda').textContent) && /Récord: 0/.test(q('mejor').textContent) && !!el.querySelector('[data-a="salir"]'),
        q('ronda').textContent + ' · ' + q('mejor').textContent);
      check('El mundo queda en pausa mientras se juega', !G.pausa || !G.pausa.motivos || G.pausa.motivos.has('canto'));
      check('Primero canta (no se puede tocar mientras escucha)', E.fase === 'escucha' && pulsar(0) === false && E.fase === 'escucha');
      await hasta(() => E.fase === 'turno', 3000);
      const s1 = E.sec.slice(); const ok1 = s1.every(i => pulsar(i));
      check('Repetir bien la secuencia pasa a la ronda 2 (una nota más)', ok1 && await hasta(() => E.ronda === 2 && E.sec.length === 2, 3000), JSON.stringify(E.sec));
      await hasta(() => E.fase === 'turno', 3000);
      const mal = (E.sec[0] + 1) % 4; pulsar(mal);
      check('Un fallo termina sin castigo: «¡Nuevo récord: 1!», «Otra vez» y «Salir»', E.fase === 'fin' && E.mejor === 1 && /récord: 1/i.test(q('msg').textContent) && !el.querySelector('[data-a="otra"]').hidden, q('msg').textContent);
      check('El récord se guarda en este dispositivo', leerRec() === 1);
      { const lg = (window.AVFinJuego ? window.AVFinJuego.log : []).filter(x => x.juego === 'canto').slice(-2).map(x => x.tipo).join(','), bs = [...el.querySelectorAll('.av-bots .av-bot')];
        check('PULIR 4 · «Otra vez» y «Salir» como mínimo como el panel común (54 px y 18 px; «Otra vez», más grande y naranja por PULIR 3) y sonido de la tabla común (victoria y récord)', bs.length === 2 && bs.every(b => b.offsetHeight >= 54 && parseFloat(getComputedStyle(b).fontSize) >= 18) && lg === 'victoria,record', lg); }
      nueva();
      check('«Otra vez» empieza de nuevo en la ronda 1', E.ronda === 1 && E.sec.length === 1 && E.fase === 'escucha');
      await hasta(() => E.fase === 'turno', 3000);
      dispatchEvent(new KeyboardEvent('keydown', { key: String(E.sec[0] + 1), bubbles: true }));
      check('Con el teclado (1-4) también se juega', await hasta(() => E.ronda === 2, 3000));
      { // F22: con el foco en la cotorra correcta, Enter (un click de teclado, detail 0) también juega
        await hasta(() => E.fase === 'turno', 3000); const r0 = E.ronda, b = el.querySelector(`.c-ave[data-i="${E.sec[0]}"]`);
        b.focus(); b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
        check('Enter o Espacio sobre la cotorra enfocada también juegan (no solo 1-4 y flechas)', await hasta(() => E.ronda === r0 + 1 || E.pos > 0, 3000), E.ronda + '/' + E.pos); }
      { // F22: nombre accesible y foco atrapado en el diálogo
        const tit = document.getElementById(el.getAttribute('aria-labelledby') || '-'), sal = [];
        for (let i = 0; i < 6; i++) { const t = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }); dispatchEvent(t); sal.push(t.defaultPrevented && el.contains(document.activeElement)); }
        const tS = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }); dispatchEvent(tS); sal.push(el.contains(document.activeElement));
        check('El diálogo se llama «Sigue el canto» y Tab no saca el foco de él', !!tit && /Sigue el canto|Follow the song/.test(tit.textContent) && sal.every(Boolean), (tit ? tit.textContent : '-') + ' · ' + sal.join(',')); }
      const ae = G.aula && G.aula.aj, idi0 = ae ? ae.idioma : null;
      if (ae) { ae.idioma = 'en'; pintar(); check('En inglés: «Follow the song», «Round», «Best» y «Exit»', q('t').textContent === 'Follow the song' && /Round/.test(q('ronda').textContent) && /Best/.test(q('mejor').textContent) && el.querySelector('[data-a="salir"]').textContent === 'Exit'); ae.idioma = idi0; pintar(); }
      dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      check('Esc (o «Salir») cierra y quita la pausa', !activo() && el.hidden && !document.body.classList.contains('canto-on') && (!G.pausa || !G.pausa.motivos || !G.pausa.motivos.has('canto')));
      check('Los 4 cantos suenan (sintetizados)', !A || !A.has || AVES.every((a, i) => A.has('canto' + i)));
    } catch (e) { check('Sin errores', false, e && e.message); }
    finally {
      salir(); G.quiet = q0; E.vel = 1;
      try { if (rec0 == null) localStorage.removeItem(ALM); else localStorage.setItem(ALM, rec0); } catch (e) { /* */ } E.mejor = leerRec();
    }
    return { results: out, passed: out.filter(x => x.ok).length, total: out.length };
  }

  G.cantoApi = { empezar, salir, activo, pulsar, estado: () => ({ fase: E.fase, ronda: E.ronda, mejor: E.mejor, sec: E.sec.slice() }), test };
  return G.cantoApi;
};
