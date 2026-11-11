/* CG-108 · Escuela de Vuelo del Guardián y show aéreo. CG-126: encendida al jugar.
   ?piloto=0 o G.piloto === false la apaga. ?piloto=1 sigue encendiéndola.
   Sin anillos: la marca es una hoja suave. No cambia el vuelo de fuera. No hay modelos ni edificios nuevos. */
window.AVV18Piloto = function (G) {
  'use strict';
  if (G.v18piloto) return G.v18piloto;
  const S = G.S, M = G.fisica.MOVE, H = (x, z) => G.terreno.height(x, z);
  const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' && en ? en : es);
  const encendido = () => {
    if (/[?&]piloto=0\b/.test(location.search)) return false;
    if (G.piloto === false) return false;
    return true;
  };
  const escuela = () => !!(G.renderer && G.renderer.calidad && G.renderer.calidad.escuela);
  const reducido = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const aguaEn = (x, z) => (G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -Infinity);
  const F = { fase: 'nada', i: 0, t: 0, aviso: false, hechas: [], plumas: {}, show: false, combo: [], puntos: 0, record: 0, veloz: false, planeo: 0 };
  const LEC = [
    { id: 'picada', es: 'Picada: baja en picado', en: 'Dive: drop straight down', plumas: 2, listo: () => M.flying && S.vy < -4 },
    { id: 'planeo', es: 'Planeo largo', en: 'A long glide', plumas: 2, listo: () => { if (M.flying && Math.abs(S.vy) < 1.2 && M.speed > 6) F.planeo += 0.1; else F.planeo = 0; return F.planeo >= 0.4; } },
    { id: 'rasante', es: 'Rasante sobre el agua', en: 'Skim the water', plumas: 3, listo: () => { const w = aguaEn(S.pos.x, S.pos.z), s = S.pos.y - H(S.pos.x, S.pos.z); const bajo = s > 0.3 && s < 3.2; const sobre = w > -Infinity && S.pos.y > w && S.pos.y - w < 4; return M.flying && M.speed > 4 && (bajo || sobre); } },
    { id: 'puente', es: 'Pasa bajo la marca del puente', en: 'Pass under the bridge mark', plumas: 2, listo: () => { const p = sitio().puente; return M.flying && Math.hypot(S.pos.x - p.x, S.pos.z - p.z) < 6 && S.pos.y < p.y; } },
    { id: 'rama', es: 'Pósate en la rama', en: 'Land on the branch', plumas: 3, listo: () => { const p = sitio().rama; return !M.flying && M.grounded && Math.hypot(S.pos.x - p.x, S.pos.z - p.z) < 4; } },
    { id: 'frenada', es: 'Frena en el aire', en: 'Brake in the air', plumas: 1, listo: () => { if (M.flying && M.speed > 8) F.veloz = true; return F.veloz && M.flying && M.speed < 2; } },
  ];
  function sitio() {
    const poi = G.terreno.poi && (G.terreno.poi('puente_villa') || G.terreno.poi('puente'));
    const base = poi ? { x: poi.x, z: poi.z, y: (poi.y || H(poi.x, poi.z)) + 4 } : { x: S.pos.x + 12, z: S.pos.z, y: H(S.pos.x + 12, S.pos.z) + 6 };
    return {
      puente: base,
      rama: { x: base.x + 8, z: base.z + 4 },
      fiesta: { x: 150, z: 170 },
    };
  }
  let hoja = null;
  function marca(p, ver) {
    if (escuela() || reducido() || !G.renderer) { if (hoja) hoja.visible = false; return; }
    if (!hoja) {
      hoja = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), new THREE.MeshBasicMaterial({ color: 0xc6e27a, transparent: true, opacity: 0.55, depthWrite: false }));
      hoja.name = 'piloto:hoja'; hoja.frustumCulled = false; hoja.userData.sinCulling = true;
      G.renderer.scene.add(hoja);
    }
    hoja.visible = !!ver;
    if (ver) hoja.position.set(p.x, (p.y != null ? p.y : H(p.x, p.z)) + 1.2, p.z);
  }
  let caja = null;
  function pista(txt) {
    if (!caja) { caja = document.createElement('div'); caja.id = 'piloto-pista'; caja.setAttribute('role', 'status'); caja.style.cssText = 'position:fixed;left:50%;bottom:18%;transform:translateX(-50%);z-index:30;max-width:90vw;padding:8px 14px;border-radius:12px;background:rgba(20,36,24,.86);color:#f4ffe8;font:700 16px/1.3 sans-serif;pointer-events:none'; document.body.appendChild(caja); }
    caja.hidden = !txt; caja.textContent = txt || '';
  }
  function toast(t) { if (G.quiet) return; try { G.ui.toast(t, 2800); } catch (e) { /* sin HUD */ } }
  const estado = () => ({ fase: F.fase, visible: encendido() && F.fase !== 'nada', hechas: F.hechas.slice(), plumas: Object.assign({}, F.plumas), show: F.show, puntos: F.puntos, record: F.record, combo: F.combo.slice() });
  function empezar() {
    if (!encendido()) return false;
    F.fase = 'escuela'; F.i = 0; F.t = 0; F.aviso = false; F.hechas = []; F.plumas = {}; F.show = false; F.combo = []; F.puntos = 0; F.veloz = false; F.planeo = 0;
    const lec = LEC[0]; pista(L(lec.es, lec.en)); marca(sitio().puente, lec.id === 'puente');
    return true;
  }
  function completar(lec) {
    if (F.hechas.includes(lec.id)) return;
    F.hechas.push(lec.id); F.plumas[lec.id] = lec.plumas; F.t = 0; F.aviso = false; F.planeo = 0; F.veloz = false;
    toast(L('Plumas de estilo: ' + lec.plumas, 'Style feathers: ' + lec.plumas));
    if (F.hechas.length >= 3) F.show = true;
    const sig = LEC.find(x => !F.hechas.includes(x.id));
    if (sig && F.fase === 'escuela') { F.i = LEC.indexOf(sig); pista(L(sig.es, sig.en)); marca(sitio()[sig.id === 'rama' ? 'rama' : 'puente'], sig.id === 'puente' || sig.id === 'rama'); }
    else if (F.fase === 'escuela') { F.fase = 'show'; pista(L('Show aéreo: encadena trucos', 'Air show: chain the tricks')); marca(null, false); }
  }
  const TRU = {
    tirabon: { es: 'Tirabuzón', en: 'Barrel roll', pts: 2 },
    rizo: { es: 'Rizo', en: 'Loop', pts: 3 },
    picada: { es: 'Picada y frenada', en: 'Dive and stop', pts: 3 },
    rasante: { es: 'Planeo rasante', en: 'Low glide', pts: 2 },
  };
  function anotar(id) {
    if (F.fase !== 'show' || !TRU[id] || F.combo.includes(id)) return 0;
    F.combo.push(id); F.puntos += TRU[id].pts;
    if (F.combo.length >= 4) F.puntos += 2;
    if (F.puntos > F.record) F.record = F.puntos;
    pista(L(TRU[id].es + ' · ' + F.puntos, TRU[id].en + ' · ' + F.puntos));
    return TRU[id].pts;
  }
  function pagar(prueba) {
    const ti = G.tienda; if (!ti || !ti.ganarLogro) return 0;
    const n = Math.max(1, Math.min(3, Math.round(F.puntos / 3) || 1));
    return ti.ganarLogro('piloto-show:' + F.record, n, { prueba: !!prueba, aviso: !prueba });
  }
  function paso(dt) {
    if (!encendido() || F.fase === 'nada') { if (caja) caja.hidden = true; if (hoja) hoja.visible = false; return; }
    dt = Math.min(0.1, dt || 0.05); F.t += dt;
    if (F.fase === 'escuela') {
      const lec = LEC[F.i];
      if (lec && !F.hechas.includes(lec.id)) {
        if (lec.listo()) completar(lec);
        else if (!F.aviso && F.t >= 20) { F.aviso = true; toast(L('Pista: ' + lec.es, 'Hint: ' + lec.en)); }
      }
    }
  }
  function salir() { F.fase = 'nada'; pista(''); marca(null, false); }
  G.on('update', dt => { if (encendido()) paso(dt); }, 64);

  async function test() {
    const out = [], ok = (n, pass, extra) => out.push({ name: n, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const quiet0 = G.quiet, piloto0 = G.piloto; G.quiet = true;
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fly0 = M.flying, sp0 = M.speed, vy0 = S.vy, g0 = M.grounded;
    try {
      G.piloto = undefined; salir();
      const abrirPanel = document.getElementById('b-que-hacer') || document.getElementById('b-que-hacer-title');
      if (abrirPanel) abrirPanel.click();
      const btnIr = document.querySelector('#que-hacer [data-qh="piloto"] .qh-ir');
      const antes = { x: S.pos.x, z: S.pos.z };
      if (btnIr && !btnIr.disabled) btnIr.click();
      const puenteIr = sitio().puente;
      const pistaIr = document.getElementById('piloto-pista');
      ok('QA-246 · Ir lleva al puente y arranca la escuela', !!G.v18piloto && G.v18piloto.empezar === empezar && !!btnIr && !btnIr.disabled && Math.hypot(S.pos.x - puenteIr.x, S.pos.z - puenteIr.z) < 1 && estado().fase === 'escuela' && !!pistaIr && !pistaIr.hidden, 'de ' + antes.x.toFixed(1) + ',' + antes.z.toFixed(1) + ' a ' + S.pos.x.toFixed(1) + ',' + S.pos.z.toFixed(1));
      S.pos.x = antes.x; S.pos.z = antes.z; salir();
      ok('CG-126 · sin bandera, la escuela empieza', encendido() && empezar() === true && estado().fase === 'escuela');
      salir();
      G.piloto = false; salir();
      ok('CG-126 · ?piloto=0 o piloto en false la apaga', !encendido() && empezar() === false && !estado().visible);
      G.piloto = true;
      ok('Con la bandera empieza la escuela', empezar() === true && estado().fase === 'escuela' && document.getElementById('piloto-pista') && !document.getElementById('piloto-pista').hidden);
      ok('La marca no es un anillo', !hoja || hoja.geometry.type !== 'RingGeometry');
      const ir = (x, z, y) => { S.pos.x = x; S.pos.z = z; S.pos.y = y; };
      M.flying = true; S.vy = -6; M.speed = 8; paso(0.1);
      ok('La picada se completa', estado().hechas.includes('picada') && estado().plumas.picada === 2);
      S.vy = 0; M.speed = 8; paso(0.1); paso(0.1); paso(0.1); paso(0.1); paso(0.1);
      ok('El planeo largo se completa', estado().hechas.includes('planeo'));
      ir(S.pos.x, S.pos.z, H(S.pos.x, S.pos.z) + 1.2); M.speed = 6; paso(0.1);
      ok('El rasante se completa', estado().hechas.includes('rasante'));
      ok('Con 3 lecciones se abre el show', estado().show === true);
      const p = sitio().puente; ir(p.x, p.z, p.y - 1); paso(0.1);
      ok('Pasar bajo la marca del puente completa esa lección', estado().hechas.includes('puente'));
      const r = sitio().rama; ir(r.x, r.z, H(r.x, r.z) + 0.2); M.flying = false; M.grounded = true; M.speed = 0; paso(0.1);
      ok('Posarse en la rama completa esa lección', estado().hechas.includes('rama'));
      M.flying = true; M.grounded = false; M.speed = 10; paso(0.1); M.speed = 1; paso(0.1);
      ok('La frenada en el aire completa esa lección', estado().hechas.includes('frenada') && estado().hechas.length === 6);
      F.fase = 'show'; F.combo = []; F.puntos = 0;
      ok('Tirabuzón, rizo, picada y rasante suman puntos', anotar('tirabon') === 2 && anotar('rizo') === 3 && anotar('picada') === 3 && anotar('rasante') === 2 && estado().puntos >= 10 && anotar('rizo') === 0);
      let pago = 0, tienda = G.tienda;
      if (!tienda && window.AVE && AVE.assets) { try { await AVE.assets.script('src/game/tienda.js'); tienda = window.AVTienda && window.AVTienda(G); } catch (e) { tienda = null; } }
      if (tienda && tienda.ganarLogro) {
        const antes = tienda.saldo();
        pago = pagar(true);
        const otra = pagar(true);
        let extra = 0; for (let k = 0; k < 8; k++) extra += tienda.ganarLogro('piloto-extra:' + k, 3, { prueba: true });
        ok('Las conchitas se pagan una vez y el tope diario las corta', pago > 0 && pago <= 3 && otra === 0 && tienda.saldo() - antes <= 12, 'pago ' + pago + ' · otra ' + otra + ' · extra ' + extra);
      } else ok('Las conchitas se pagan una vez y el tope diario las corta', false, 'sin tienda');
      salir();
      ok('Al salir no queda la pista', !estado().visible);
    } catch (e) { ok('La prueba terminó', false, String(e && e.message || e)); }
    finally { G.piloto = piloto0; G.quiet = quiet0; S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; S.vy = vy0; M.flying = fly0; M.speed = sp0; M.grounded = g0; salir(); }
    return { passed: out.filter(x => x.ok).length, total: out.length, results: out };
  }
  const api = { empezar, paso, salir, estado, anotar, pagar, sitio, test, LEC };
  G.v18piloto = api; // Ir de «¿Qué hay para hacer?» lee G.v18piloto; aDemanda no lo guarda (QA-246)
  return api;
};
