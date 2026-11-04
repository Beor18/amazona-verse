/* Juego · Comunidades (CG-21, mundo vivo etapa 2).
   En Villa Raíz, en Villa Mangle y en la otra orilla, las cotorras que ya viven ahí
   hacen una rutina visible: cargar, construir, pescar con nasa, conversar o tocar música.
   El modelo es el de la bandada (sin personajes ni mallas nuevas). Se añaden a
   G.bandada.EXTRA en la prioridad 87.5, entre los residentes (87) y el dibujo (88):
   si esas dos mallas ya se dibujan, no suman draw calls. La nasa no toca a ningún pez.
   Villa Mangle es la comunidad de la otra orilla (Kelvin, 2-nov). Kelvin 4-nov (K1 A): el rótulo del mapa es «Villa Mangle · Mesa del Este».
   El embarcadero es la otra orilla del río, para que la tercera rutina no caiga en el mismo punto.
   G.quiet no las enciende. En calidad baja, versión mínima: las 2 primeras de cada sitio (QA-110: el iPhone arranca en bajo).
   Prueba: AV.comunidadesTest(). */
window.AVComunidades = function (G) {
  'use strict';
  if (G.comunidades) return G.comunidades;
  const S = G.S;
  const H = (x, z) => (G.terreno && G.terreno.height ? G.terreno.height(x, z) : 0);
  const reducido = () => !!(G.renderer && G.renderer.REDUCED);
  const bajo = () => !!(G.renderer && G.renderer.calidad && G.renderer.calidad.nivel === 'bajo');
  const R = { prueba: false, forzar: null, pausa: false, t: 0, sitios: null, gente: [] };
  const permitido = () => R.prueba || (!G.quiet && !!(S.profile && S.profile.created));
  const BAJO_N = 2; // por sitio, en calidad baja
  // Villa Mangle vive en kelvin_aldea_rio_este_2. Kelvin 4-nov (K1 A): el rótulo es «Villa Mangle · Mesa del Este».
  // La otra orilla del río es el embarcadero (kelvin_aldea_rio_oeste).
  const DEFS = [
    { id: 'villa', titulo: 'Villa Raíz', pois: ['kelvin_aldea_rio_este', 'plaza', 'flamboyan_plaza'], actos: ['cargar', 'construir', 'conversar', 'conversar'] },
    { id: 'mangle', titulo: 'Villa Mangle', pois: ['kelvin_aldea_rio_este_2'], actos: ['pescar', 'conversar', 'musica'] },
    { id: 'orilla', titulo: 'La otra orilla', pois: ['kelvin_aldea_rio_oeste'], actos: ['cargar', 'musica', 'pescar'] },
  ];
  const ESPECIES = ['vittata', 'ventralis', 'oratrix', 'lilacina'];

  function poi(id) {
    if (G.terreno && G.terreno.poi) { const p = G.terreno.poi(id); if (p && typeof p.x === 'number') return p; }
    const P = (G.terreno && G.terreno.pois) || {};
    return P[id] && typeof P[id].x === 'number' ? P[id] : null;
  }
  function resolver() {
    if (R.sitios) return R.sitios;
    const out = [];
    for (const d of DEFS) {
      let p = null;
      for (const id of d.pois) { p = poi(id); if (p) break; }
      if (p) out.push({ id: d.id, titulo: d.titulo, x: p.x, z: p.z, actos: d.actos });
    }
    R.sitios = out;
    return out;
  }
  function piel(sp) {
    try {
      const k = G.bandada && G.bandada.colorDe && G.bandada.colorDe(sp);
      if (k && k.c && k.a) return k;
    } catch (e) { /* paleta de reserva */ }
    return { id: sp, c: new THREE.Color(0.18, 0.42, 0.12), a: new THREE.Color(0.55, 0.22, 0.12), cob: 0.6 };
  }
  // Orilla: el suelo casi a la altura del agua. Si no hay agua cerca, el puesto queda en la plaza y la nasa no se mueve igual.
  function puestoPesca(x, z) {
    const agua = G.agua && G.agua.levelAt;
    if (!agua) return { x: x, z: z, y: H(x, z) + 0.2, agua: false, yaw: 0 };
    for (let r = 3; r <= 48; r += 3) {
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        const w = agua(px, pz);
        if (w == null || w === -Infinity || !isFinite(w)) continue;
        const h = H(px, pz);
        if (!isFinite(h) || h > w + 0.45 || h + 1.4 < w) continue;
        return { x: px, z: pz, y: Math.max(h, w) + 0.18, agua: true, yaw: a + Math.PI };
      }
    }
    return { x: x, z: z, y: H(x, z) + 0.2, agua: false, yaw: 0 };
  }
  function crear() {
    if (R.gente.length) return R.gente;
    let n = 0;
    for (const s of resolver()) {
      const pesca = puestoPesca(s.x, s.z), grupo = [];
      s.actos.forEach((acto, i) => {
        const ang = i * 1.7, radio = 2.4 + i * 0.8;
        const ax = s.x + Math.cos(ang) * radio, az = s.z + Math.sin(ang) * radio;
        const base = acto === 'pescar' ? pesca : { x: ax, z: az, y: H(ax, az) + 0.2, agua: false, yaw: ang };
        const p = {
          sitio: s.id, acto: acto, sp: ESPECIES[n % ESPECIES.length], k: null,
          ax: base.x, az: base.z, ay: base.y, agua: !!base.agua,
          bx: base.x + 5.2, bz: base.z + 1.4,
          x: base.x, z: base.z, y: base.y, yaw: base.yaw || ang,
          i, t: i * 0.45, fase: i * 0.9, ala: 0, cab: 0, gir: 0, roll: 0, pitch: -0.35, on: false,
        };
        p.k = piel(p.sp);
        grupo.push(p); n++;
      });
      const hablan = grupo.filter(p => p.acto === 'conversar');
      for (let i = 0; i + 1 < hablan.length; i += 2) {
        const a = hablan[i], b = hablan[i + 1];
        a.par = b; b.par = a;
        a.x = a.ax = s.x + 0.8; a.z = a.az = s.z; a.y = a.ay = H(a.x, a.z) + 0.2;
        b.x = b.ax = s.x - 0.8; b.z = b.az = s.z + 0.15; b.y = b.ay = H(b.x, b.z) + 0.2;
      }
      if (hablan.length % 2 === 1) { const u = hablan[hablan.length - 1]; u.par = { x: s.x, z: s.z }; }
      R.gente.push.apply(R.gente, grupo);
    }
    return R.gente;
  }
  function activos() {
    const sitios = resolver();
    if (!permitido() || !sitios.length) return [];
    if (R.forzar === 'todos') return sitios;
    if (R.forzar) return sitios.filter(s => s.id === R.forzar);
    let mejor = null, d0 = 150;
    for (const s of sitios) { const d = Math.hypot(s.x - S.pos.x, s.z - S.pos.z); if (d < d0) { d0 = d; mejor = s; } }
    return mejor ? [mejor] : [];
  }
  function paso(dt) {
    dt = Math.min(Math.max(dt || 0, 0), 0.1);
    R.t += dt;
    const gente = crear(), ids = {};
    for (const s of activos()) ids[s.id] = true;
    const k = reducido() ? 0.35 : 1;
    for (const p of gente) {
      p.on = !!ids[p.sitio] && (!bajo() || (R.prueba && !R.minima) || p.i < BAJO_N); // las pruebas, completas
      if (!p.on) continue;
      p.t += dt * k;
      if (p.acto === 'cargar') {
        const u = (Math.sin(p.t * 0.8) + 1) / 2, dir = Math.cos(p.t * 0.8) >= 0 ? 1 : -1;
        p.x = p.ax + (p.bx - p.ax) * u; p.z = p.az + (p.bz - p.az) * u; p.y = H(p.x, p.z) + 0.2;
        p.yaw = Math.atan2((p.bx - p.ax) * dir, (p.bz - p.az) * dir);
        p.ala = 0; p.cab = Math.abs(Math.sin(p.t * 6)) * 0.35; p.gir = 0; p.roll = 0; p.pitch = -0.2;
      } else if (p.acto === 'construir') {
        p.x = p.ax; p.z = p.az; p.y = H(p.x, p.z) + 0.2;
        p.ala = 0; p.cab = Math.max(0, Math.sin(p.t * 5)) * 0.8; p.gir = 0; p.roll = 0; p.pitch = -0.15;
      } else if (p.acto === 'pescar') {
        p.x = p.ax; p.z = p.az; p.y = p.ay;
        p.ala = 0; p.cab = 0.4; p.gir = Math.sin(p.t * 0.6) * 0.15; p.roll = 0; p.pitch = 0.15;
      } else if (p.acto === 'conversar') {
        const o = p.par || p;
        p.x = p.ax; p.z = p.az; p.y = p.ay;
        p.yaw = Math.atan2(o.x - p.x, o.z - p.z);
        p.ala = 0; p.cab = 0.1; p.gir = Math.sin(p.t * 2.2) * 0.45; p.roll = 0; p.pitch = -0.35;
      } else {
        p.x = p.ax; p.z = p.az; p.y = H(p.x, p.z) + 0.2;
        p.ala = reducido() ? 0 : 0.25; p.cab = Math.sin(p.t * 6) * 0.3; p.gir = 0;
        p.roll = Math.sin(p.t * 3) * (reducido() ? 0.05 : 0.4); p.pitch = -0.3;
      }
    }
    return gente;
  }
  function quitar() {
    const E = G.bandada && G.bandada.EXTRA;
    if (!E) return;
    for (let i = E.length - 1; i >= 0; i--) if (E[i].comunidad) E.splice(i, 1);
  }
  function pintar() {
    const B = G.bandada;
    if (!B || !B.EXTRA || !permitido()) return 0;
    quitar();
    let n = 0;
    for (const p of R.gente) {
      if (!p.on || !p.k) continue;
      B.EXTRA.push({
        comunidad: 1, x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, roll: p.roll || 0,
        esc: 1.35, c: p.k.c, a: p.k.a, cob: p.k.cob || 0, fase: p.fase, ala: p.ala, cab: p.cab, gir: p.gir,
      });
      n++;
    }
    return n;
  }
  G.on('update', dt => { if (R.pausa || !permitido()) return; paso(dt); pintar(); }, 87.5);

  function peces() {
    let n = 0;
    const sc = G.renderer && G.renderer.scene;
    if (sc) sc.traverse(o => { if (o.isInstancedMesh && o.name && String(o.name).indexOf('peces') === 0) n += o.count || 0; });
    return n;
  }
  function foto(id) {
    const s = resolver().find(x => x.id === id);
    if (!s || !G.renderer || !G.renderer.snapshot) return null;
    const guarda = { prueba: R.prueba, forzar: R.forzar, pausa: R.pausa, x: S.pos.x, y: S.pos.y, z: S.pos.z };
    R.prueba = true; R.forzar = id; R.pausa = true;
    S.pos.x = s.x + Math.sin(0.5) * 8; S.pos.z = s.z + Math.cos(0.5) * 8; S.pos.y = H(S.pos.x, S.pos.z) + 1.4;
    if (window.AV && AV.debug && AV.debug.camYaw) AV.debug.camYaw(0.5);
    paso(0.05); pintar();
    if (G.bandada && G.bandada.dibujar) G.bandada.dibujar();
    const jpg = G.renderer.snapshot(960, 540, 0.72);
    R.prueba = guarda.prueba; R.forzar = guarda.forzar; R.pausa = guarda.pausa;
    S.pos.x = guarda.x; S.pos.y = guarda.y; S.pos.z = guarda.z;
    return jpg;
  }

  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name: name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, quiet0 = G.quiet, cal0 = G.renderer.calidad.nivel;
    let B = null;
    R.pausa = true;
    try {
      if (!G.bandada) { await AVE.assets.script('src/game/bandada.js'); window.AVBandada(G); }
      B = G.bandada;
      if (B && B.residentes) await B.residentes;
      if (B && B.preparar) await B.preparar();
      check('La bandada está lista para prestar sus mallas', !!(B && B.EXTRA && B.meshes && B.meshes.length === 2));
      if (!B) throw new Error('sin bandada');
      R.prueba = true; R.forzar = 'todos'; R.sitios = null; R.gente = [];
      const sitios = resolver();
      check('Hay Villa Raíz, Villa Mangle y la otra orilla', sitios.length === 3 && sitios.map(s => s.id).join() === 'villa,mangle,orilla', sitios.map(s => s.id + '@' + Math.round(s.x) + ',' + Math.round(s.z)).join(' '));
      let separados = sitios.length === 3;
      for (let i = 0; i < sitios.length; i++) for (let j = i + 1; j < sitios.length; j++) if (Math.hypot(sitios[i].x - sitios[j].x, sitios[i].z - sitios[j].z) < 25) separados = false;
      check('Los tres lugares están separados', separados);
      const g = crear();
      check('Usan especies que ya existen', g.length >= 8 && g.every(p => ESPECIES.indexOf(p.sp) >= 0), g.map(p => p.sp).join(','));
      const actos = {};
      g.forEach(p => { actos[p.acto] = true; });
      check('Las rutinas son cargar, construir, pescar, conversar y música', ['cargar', 'construir', 'pescar', 'conversar', 'musica'].every(a => actos[a]), Object.keys(actos).join(','));
      const carga0 = g.filter(p => p.acto === 'cargar').map(p => ({ x: p.x, z: p.z }));
      const peces0 = peces(), vistos0 = Array.isArray(S.peces) ? S.peces.length : 0;
      let cabAlto = false, cabBajo = false, rollA = false, rollB = false, suelo = true;
      const umbral = reducido() ? 0.02 : 0.15;
      for (let i = 0; i < 90; i++) {
        paso(0.05);
        for (const p of g) {
          if (p.acto === 'construir') { if (p.cab > 0.5) cabAlto = true; if (p.cab < 0.05) cabBajo = true; }
          if (p.acto === 'musica' && p.on) { if (p.roll > umbral) rollA = true; if (p.roll < -umbral) rollB = true; }
          const h = H(p.x, p.z);
          if (!isFinite(p.x + p.y + p.z) || p.y < h - 0.25) suelo = false;
        }
      }
      const movio = g.filter(p => p.acto === 'cargar').some((p, i) => Math.hypot(p.x - carga0[i].x, p.z - carga0[i].z) > 1);
      check('Cargar camina con la carga', movio);
      check('Construir cabecea, como quien trabaja', cabAlto && cabBajo);
      check('Tocar música se ve en el balanceo', rollA && rollB);
      const pesca = g.filter(p => p.acto === 'pescar');
      check('Pescar con nasa se queda en el puesto', pesca.length >= 2 && pesca.every(p => Math.hypot(p.x - p.ax, p.z - p.az) < 0.05));
      check('La nasa no quita peces ni marca ninguno como visto', peces() === peces0 && (Array.isArray(S.peces) ? S.peces.length : 0) === vistos0, peces0 + ' peces');
      check('El puesto de la nasa cae junto al agua', pesca.filter(p => p.agua).length >= 1, pesca.map(p => (p.agua ? 'agua' : 'seco')).join(','));
      let miran = true, parejas = 0;
      for (const p of g) {
        if (p.acto !== 'conversar' || !p.par || p.par.acto !== 'conversar') continue;
        parejas++;
        const want = Math.atan2(p.par.x - p.x, p.par.z - p.z);
        const d = Math.atan2(Math.sin(p.yaw - want), Math.cos(p.yaw - want));
        if (Math.abs(d) > 0.35) miran = false;
      }
      check('Quien conversa mira a la otra cotorra', parejas >= 2 && miran, parejas + ' miradas');
      check('Nadie se hunde en el suelo', suelo);
      // Draw calls: una cotorra y varias, en la malla que ya existe.
      const sc = G.renderer.scene, cam = G.renderer.camera, info = G.renderer.renderer.info, nHijos = sc.children.length;
      const una = () => { G.renderer.renderer.render(sc, cam); return info.render.calls; };
      if (B.terminar) B.terminar();
      if (G.residentes && G.residentes.prueba) G.residentes.prueba(false);
      if (G.residentes && G.residentes.reiniciar) G.residentes.reiniciar();
      const villa = sitios.find(s => s.id === 'villa');
      S.pos.x = villa.x + 6; S.pos.z = villa.z + 4; S.pos.y = H(S.pos.x, S.pos.z) + 1.5;
      R.forzar = 'villa'; paso(0.05);
      const enVilla = g.filter(p => p.sitio === 'villa' && p.on);
      check('En Villa Raíz hay alguien cargando, construyendo o conversando', enVilla.length >= 3, enVilla.map(p => p.acto).join(','));
      enVilla.forEach((p, i) => { p.on = i === 0; });
      pintar(); B.dibujar(); const calls1 = una();
      enVilla.forEach(p => { p.on = true; });
      pintar(); B.dibujar(); const callsN = una();
      check('Varias cotorras de la comunidad no suman draw calls', callsN === calls1 && calls1 > 0, calls1 + ' → ' + callsN);
      check('No se crea ninguna malla nueva', sc.children.length === nHijos && B.meshes.every(m => m.isInstancedMesh && !m.castShadow));
      R.prueba = false; R.forzar = null; G.quiet = true; paso(0.05);
      check('Con G.quiet las comunidades no salen', g.every(p => !p.on));
      R.prueba = true; R.minima = true; R.forzar = 'todos'; G.renderer.calidad.nivel = 'bajo'; paso(0.05);
      const porSitio = {}; g.forEach(p => { if (p.on) porSitio[p.sitio] = (porSitio[p.sitio] || 0) + 1; });
      check('Con calidad baja, versión mínima: 1 o 2 por sitio (QA-110)', Object.keys(porSitio).length > 0 && Object.values(porSitio).every(n => n >= 1 && n <= BAJO_N), JSON.stringify(porSitio));
      R.prueba = false; R.minima = false; R.forzar = null;
      G.renderer.calidad.nivel = cal0; G.quiet = quiet0;
      const jpg = foto('villa');
      check('La captura de Villa Raíz sale', typeof jpg === 'string' && jpg.indexOf('data:image/jpeg') === 0 && jpg.length > 2000, jpg ? jpg.length : 0);
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 500));
    } finally {
      R.prueba = false; R.forzar = null; R.pausa = false; G.quiet = quiet0;
      if (G.renderer && G.renderer.calidad) G.renderer.calidad.nivel = cal0;
      S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z;
      quitar();
      if (B && B.dibujar) B.dibujar();
    }
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  const api = {
    paso: paso, pintar: pintar, sitios: resolver, gente: crear, foto: foto, test: test,
    prueba: on => { R.prueba = !!on; }, forzar: id => { R.forzar = id || null; },
    reiniciar: () => { R.sitios = null; R.gente = []; },
  };
  G.comunidades = api;
  if (window.AV) window.AV.comunidadesTest = o => Promise.resolve(api.test(o));
  return api;
};
