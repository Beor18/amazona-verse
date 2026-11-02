/* Juego · Maravillas de la costa (tablero G5, GDD §6)
   Dos momentos baratos, un draw call cada uno. Con calidad baja no hay luciérnagas y las chispas son pocas.
   - Atardecer: luciérnagas y un coquí junto a la caleta.
   - Noche: la caleta del suroeste (mapa agua.bahiaBio; el mapa no la guarda en lugares) enciende una estela azul si Vittata está cerca.
     El brillo lo producen dinoflagelados, Pyrodinium bahamense, como en Puerto Mosquito (Vieques).
     Fuente: NOAA Office for Coastal Management, «Mangrove, Seagrass, and Coral Restoration in the
     Vieques Bioluminescent Bay Natural Reserve»,
     https://coast.noaa.gov/states/stories/vieques-bioluminescent-bay.html (consultada el 26-oct-2026).
   La fase sigue S.hora si el mundo la tiene (C9: 17,5–19 atardecer, desde las 19 o antes de las 5 noche).
   Sin S.hora queda el ciclo de 10 min, solo en la caleta y solo de cerca. El coquí no canta a pleno sol.
   Carga perezosa desde boot.js. window.AVMaravillas(G) → { fase, bahia, dato, test }.
   Prueba: AV.maravillasTest(). */
window.AVMaravillas = function (G) {
  'use strict';
  if (G.maravillas) return G.maravillas;
  const S = G.S, scene = G.renderer.scene;
  const mapa = (G.terreno.mapa && ((G.terreno.mapa.agua && G.terreno.mapa.agua.bahiaBio) || (G.terreno.mapa.lugares && G.terreno.mapa.lugares.bahiaBio))) || null;
  const B = mapa ? { x: mapa.x, z: mapa.z, r: mapa.r || 24 } : { x: -160, z: 207, r: 24 };
  const CICLO = 600, ATARDECER = 360, NOCHE = 420, AMANECER = 520;
  const NCHI = { bajo: 24, medio: 80, alto: 140 };
  const NLUC = { bajo: 0, medio: 8, alto: 16 };
  const DATO = {
    texto: 'De noche esta caleta brilla azul. Lo hacen unos seres diminutos del agua, los dinoflagelados Pyrodinium bahamense, los mismos de la bahía Puerto Mosquito, en Vieques.',
    fuente: 'NOAA Office for Coastal Management: Vieques Bioluminescent Bay (coast.noaa.gov), consultada el 26 de octubre de 2026',
    url: 'https://coast.noaa.gov/states/stories/vieques-bioluminescent-bay.html',
  };
  const nivel = () => (G.renderer.calidad && G.renderer.calidad.nivel) || 'medio';
  function faseDe(t) {
    const h = Number.isFinite(S.hora) ? S.hora : null;
    if (h != null) {
      if (h >= 19 || h < 5) return 'noche';
      if (h >= 17.5 && h < 19) return 'atardecer';
      return 'dia';
    }
    const x = ((t % CICLO) + CICLO) % CICLO;
    if (x >= NOCHE && x < AMANECER) return 'noche';
    if (x >= ATARDECER && x < NOCHE) return 'atardecer';
    return 'dia';
  }
  function aguaEn(x, z) {
    const h = G.terreno.height(x, z);
    const w0 = G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : 0;
    return { h: h, w: w0 > -1e8 ? w0 : 0 };
  }
  // Puntos dentro de la caleta. Si el relieve no deja agua, se quedan sobre el nivel del agua igual.
  function sembrar(n, enAgua) {
    const pos = new Float32Array(n * 3);
    let k = 0, intentos = 0;
    while (k < n && intentos < n * 40) {
      intentos++;
      const ang = Math.random() * 6.2832, rad = Math.sqrt(Math.random()) * B.r * 0.92;
      const x = B.x + Math.cos(ang) * rad, z = B.z + Math.sin(ang) * rad, a = aguaEn(x, z);
      if (enAgua) {
        if (a.h > a.w + 0.35) continue;
        pos[k * 3] = x; pos[k * 3 + 1] = a.w + 0.12; pos[k * 3 + 2] = z;
      } else if (a.h >= a.w + 0.4 && a.h <= a.w + 8) {
        pos[k * 3] = x; pos[k * 3 + 1] = a.h + 1.2; pos[k * 3 + 2] = z;
      } else continue;
      k++;
    }
    while (k < n) {
      const ang = k / n * 6.2832, rad = B.r * (enAgua ? 0.45 : 0.85);
      const x = B.x + Math.cos(ang) * rad, z = B.z + Math.sin(ang) * rad, a = aguaEn(x, z);
      pos[k * 3] = x; pos[k * 3 + 1] = (enAgua ? a.w : Math.max(a.h, a.w)) + (enAgua ? 0.12 : 1.4); pos[k * 3 + 2] = z;
      k++;
    }
    return pos;
  }
  function puntos(nombre, color, tam) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    geo.setDrawRange(0, 0);
    const mat = G.renderer.linMat(new THREE.PointsMaterial({
      color: color, size: tam, transparent: true, opacity: 0.85, depthWrite: false, fog: true, sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    }));
    const pts = new THREE.Points(geo, mat);
    pts.name = nombre; pts.frustumCulled = false; pts.visible = false; pts.renderOrder = 2;
    scene.add(pts);
    return pts;
  }
  const chispas = puntos('bahia_bio', 0x7af6ff, 1.6);
  const luces = puntos('luciernagas', 0xeeff66, 0.85);
  let mallaChi = null, mallaLuc = null, baseY = null, vistos = { noche: false, atardecer: false }, canto = 0, ultima = '';

  function poner(pts, src, n) {
    const haceFalta = pts.geometry.attributes.position.array.length < n * 3;
    if (haceFalta) pts.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const a = pts.geometry.attributes.position;
    if (n) a.array.set(src.subarray(0, n * 3));
    a.needsUpdate = true;
    pts.geometry.setDrawRange(0, n);
    pts.visible = n > 0;
  }
  function aplicar(fase) {
    const nv = nivel();
    const nC = fase === 'noche' ? (NCHI[nv] || 0) : 0;
    const nL = fase === 'atardecer' ? (NLUC[nv] || 0) : (fase === 'noche' ? Math.floor((NLUC[nv] || 0) / 2) : 0);
    if (!mallaChi) mallaChi = sembrar(NCHI.alto, true);
    if (!mallaLuc) mallaLuc = sembrar(Math.max(NLUC.alto, 1), false);
    poner(chispas, mallaChi, nC);
    poner(luces, mallaLuc, nL);
    baseY = null;
    if (nC) {
      baseY = new Float32Array(nC);
      const a = chispas.geometry.attributes.position;
      for (let i = 0; i < nC; i++) baseY[i] = a.getY(i);
    }
  }
  // BM21: destellos donde Vittata toca el agua de la caleta o vuela a ras (< 1,5 m). Cada toque tiñe 6 m de agua (agua.uniforms.uBio) y se apaga en 2 s.
  if (G.fx && G.fx.PALETTE && !G.fx.PALETTE.bio) G.fx.PALETTE.bio = ['#5ff3ff', '#2fe0c0', '#9fffe8', '#3aa8ff'];
  const TOQUES = [], APAGA = 2, RASO = 1.5; let ultToque = -9, ultX = 1e9, ultZ = 1e9, tToque = 0;
  function toca(x, z, n) {
    const U = G.agua && G.agua.uniforms && G.agua.uniforms.uBio; if (!U) return false;
    let k = TOQUES.length < 4 ? TOQUES.length : TOQUES.indexOf(TOQUES.reduce((a, b) => (b.t > a.t ? b : a)));
    if (k === TOQUES.length) TOQUES.push({ x: 0, z: 0, t: 0 });
    TOQUES[k].x = x; TOQUES[k].z = z; TOQUES[k].t = 0;
    if (G.fx) G.fx.burst(x, aguaEn(x, z).w + 0.1, z, 'bio', n || 10);
    return true;
  }
  function pasoToques(dt, noche) {
    const U = G.agua && G.agua.uniforms && G.agua.uniforms.uBio; if (!U) return;
    tToque += dt;
    if (noche && !G.quiet && Math.hypot(S.pos.x - B.x, S.pos.z - B.z) < B.r) {
      const a = aguaEn(S.pos.x, S.pos.z);
      if (a.w > a.h && S.pos.y - a.w < RASO && (tToque - ultToque > 0.45 || Math.hypot(S.pos.x - ultX, S.pos.z - ultZ) > 1.2)) {
        ultToque = tToque; ultX = S.pos.x; ultZ = S.pos.z; toca(ultX, ultZ, nivel() === 'bajo' ? 5 : 10);
      }
    }
    for (let i = 0; i < 4; i++) {
      const T = TOQUES[i]; if (T) T.t += dt;
      U.value[i].set(T ? T.x : 0, T ? T.z : 0, T ? Math.max(0, 1 - T.t / APAGA) : 0, 0);
    }
  }
  const cercaDe = () => Math.hypot(S.pos.x - B.x, S.pos.z - B.z) < B.r + 36;
  // El «co» de esta fase solo con atardecer de verdad: el global activo, o S.hora entre 17,5 y 19.
  function coquiConTarde() {
    const h = Number.isFinite(S.hora) ? S.hora : null;
    if (h != null && h >= 17.5 && h < 19) return true;
    return !!(G.atardecer && typeof G.atardecer.activo === 'function' && G.atardecer.activo());
  }
  function intentarCanto(fase, dt) {
    canto -= dt || 0;
    if (fase === 'atardecer' && coquiConTarde() && cercaDe() && canto <= 0 && !G.quiet && G.audio && G.audio.has && G.audio.has('co')) {
      canto = 3.2; G.audio.play('co'); return true;
    }
    return false;
  }
  function aviso(fase) {
    if (G.quiet || !cercaDe() || vistos[fase]) return;
    vistos[fase] = true;
    if (fase === 'noche') G.ui.toastHTML('<b>' + DATO.texto + '</b><br><small>' + DATO.fuente + '</small>', 7000);
    else G.ui.toast('Atardecer en la caleta: salen las luciérnagas y canta un coquí.', 4000);
  }
  G.on('update', dt => {
    const fase = faseDe(S.clock || 0), ver = cercaDe() && fase !== 'dia';
    const clave = (ver ? fase : 'off') + '|' + nivel();
    if (clave !== ultima) { ultima = clave; if (!ver) { chispas.visible = false; luces.visible = false; } else aplicar(fase); }
    if (chispas.visible && baseY) {
      const a = chispas.geometry.attributes.position, t = performance.now() / 1000;
      for (let i = 0; i < baseY.length; i++) a.setY(i, baseY[i] + Math.sin(t * 1.7 + i) * 0.06);
      a.needsUpdate = true;
    }
    intentarCanto(fase, dt);
    pasoToques(dt, fase === 'noche');
    if (ver) aviso(fase);
  }, 48);
  G.on('calidad', () => { ultima = ''; }, 40);
  G.on('apply', () => { vistos = { noche: false, atardecer: false }; ultima = ''; }, 40);

  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const guardado = {
      quiet: G.quiet, pos: Object.assign({}, S.pos), clock: S.clock, nivel: nivel(),
      hora: S.hora, teniaHora: Object.prototype.hasOwnProperty.call(S, 'hora'),
      atardecer: G.atardecer, audio: G.audio,
    };
    try {
      ok('La caleta está en el mapa (agua.bahiaBio, suroeste)', !!mapa && mapa.x < -40 && mapa.z > 40 && B.r >= 8, mapa ? Math.round(mapa.x) + ',' + Math.round(mapa.z) : 'no está');
      delete S.hora;
      ok('Sin S.hora el ciclo separa día, atardecer y noche', faseDe(0) === 'dia' && faseDe(380) === 'atardecer' && faseDe(450) === 'noche' && faseDe(560) === 'dia');
      S.hora = 18;
      ok('S.hora de tarde es atardecer aunque el ciclo sea de día', faseDe(0) === 'atardecer' && faseDe(450) === 'atardecer');
      S.hora = 12;
      ok('Con sol (S.hora 12) es de día aunque el ciclo sea atardecer o noche', faseDe(380) === 'dia' && faseDe(450) === 'dia');
      S.hora = 17.4;
      ok('A las 17,4, antes del umbral, sigue siendo de día', faseDe(380) === 'dia');
      S.hora = 17.5;
      ok('Desde las 17,5 es atardecer', faseDe(0) === 'atardecer');
      S.hora = 19;
      ok('Desde las 19 es noche', faseDe(0) === 'noche');
      S.hora = 3;
      ok('Antes de las 5 es noche', faseDe(560) === 'noche');
      S.hora = 5;
      ok('A las 5 vuelve el día', faseDe(380) === 'dia');
      ok('El dato nombra a Pyrodinium bahamense y cita a NOAA', /Pyrodinium bahamense/.test(DATO.texto) && /coast\.noaa\.gov/.test(DATO.url) && /NOAA/.test(DATO.fuente));
      G.renderer.calidad.nivel = 'bajo';
      aplicar('noche');
      ok('Calidad baja: pocas chispas y ninguna luciérnaga', chispas.visible && chispas.geometry.drawRange.count === NCHI.bajo && luces.geometry.drawRange.count === Math.floor(NLUC.bajo / 2), chispas.geometry.drawRange.count + '/' + luces.geometry.drawRange.count);
      G.renderer.calidad.nivel = 'alto';
      aplicar('noche');
      ok('Calidad alta: más chispas que en baja', chispas.geometry.drawRange.count === NCHI.alto && NCHI.alto > NCHI.bajo, String(chispas.geometry.drawRange.count));
      let bien = true;
      const a = chispas.geometry.attributes.position, n = chispas.geometry.drawRange.count;
      for (let i = 0; i < n; i++) {
        const x = a.getX(i), y = a.getY(i), z = a.getZ(i), ag = aguaEn(x, z);
        if (!isFinite(x + y + z) || y < ag.w || Math.hypot(x - B.x, z - B.z) > B.r + 1) bien = false;
      }
      ok('Las chispas quedan en la caleta y sobre el agua', n > 0 && bien);
      aplicar('dia');
      ok('De día no se dibujan', !chispas.visible && !luces.visible);
      G.quiet = true; S.pos.x = B.x; S.pos.z = B.z; vistos.noche = false;
      aviso('noche');
      ok('En las baterías no sale el aviso', vistos.noche === false);
      G.quiet = false; vistos.noche = false; aviso('noche');
      const toast = document.getElementById('toast');
      ok('Cerca y de noche, el aviso cuenta el dato y la fuente', !!(toast && !toast.hidden && /Pyrodinium bahamense/.test(toast.textContent) && /NOAA/.test(toast.textContent)));
      // BM21: toques en el agua
      const Ub = G.agua && G.agua.uniforms && G.agua.uniforms.uBio;
      ok('El agua tiene el tinte de la caleta (uBio, 4 toques)', !!Ub && Ub.value.length === 4);
      if (Ub) {
        const px = B.x, pz = B.z, w = aguaEn(px, pz).w;
        TOQUES.length = 0; pasoToques(0, false);
        S.pos.x = px; S.pos.z = pz; S.pos.y = w + 0.8; G.quiet = false; tToque = 100; ultToque = -9; ultX = ultZ = 1e9;
        const vivas0 = G.fx ? G.fx.live : 0;
        pasoToques(0.016, false);
        ok('De día el agua no destella', TOQUES.length === 0);
        pasoToques(0.016, true);
        const aguaOk = aguaEn(px, pz).w > aguaEn(px, pz).h;
        ok('De noche, a ras del agua (< 1,5 m) destella: tinte y partículas', !aguaOk || (TOQUES.length === 1 && Ub.value[0].z > 0.9 && (!G.fx || G.fx.live > vivas0)), TOQUES.length + ' toque, intensidad ' + Ub.value[0].z.toFixed(2));
        if (!aguaOk) { toca(px, pz, 10); pasoToques(0, false); }
        for (let i = 0; i < 60; i++) pasoToques(1 / 60, false);
        ok('El tinte se apaga en 2 s (a 1 s sigue a media luz)', Ub.value[0].z > 0.4 && Ub.value[0].z < 0.6, Ub.value[0].z.toFixed(2));
        for (let i = 0; i < 70; i++) pasoToques(1 / 60, false);
        ok('A los 2 s el tinte está apagado', Ub.value[0].z === 0);
        S.pos.y = w + 3; TOQUES.length = 0; ultToque = -9; ultX = ultZ = 1e9; pasoToques(0.016, true);
        ok('Volando alto (3 m) no destella', TOQUES.length === 0);
        // coste en CPU del paso (la parte del shader son 4 muestras por píxel del mar, solo con toques vivos)
        S.pos.y = w + 0.8; const t0 = performance.now(); let N = 2000;
        for (let i = 0; i < N; i++) { ultToque = -9; pasoToques(0.016, true); }
        const ms = (performance.now() - t0) / N;
        ok('El paso de los toques cuesta menos de 0,3 ms por cuadro', ms < 0.3, ms.toFixed(4) + ' ms');
        TOQUES.length = 0; pasoToques(0, false);
      }
      delete S.hora;
      G.atardecer = { activo: () => false };
      let cantos = 0;
      G.audio = { has: n => n === 'co', play: n => { if (n === 'co') cantos++; } };
      G.quiet = false; S.pos.x = B.x; S.pos.z = B.z; S.clock = 380;
      ok('Sin atardecer global y sin S.hora, el ciclo de atardecer no hace cantar al coquí', intentarCanto(faseDe(S.clock), 10) === false && cantos === 0);
      S.hora = 18;
      ok('Con S.hora de tarde el coquí de la caleta canta', intentarCanto(faseDe(S.clock), 10) === true && cantos === 1);
      delete S.hora;
      G.atardecer = { activo: () => true };
      ok('Con el atardecer global activo el coquí canta en la fase del ciclo', intentarCanto(faseDe(380), 10) === true && cantos === 2);
      S.hora = 12;
      ok('A pleno sol no canta aunque el atardecer global esté activo', faseDe(380) === 'dia' && intentarCanto(faseDe(380), 10) === false && cantos === 2);
    } finally {
      G.quiet = guardado.quiet;
      G.audio = guardado.audio;
      G.atardecer = guardado.atardecer;
      if (guardado.teniaHora) S.hora = guardado.hora; else delete S.hora;
      if (G.renderer.calidad) G.renderer.calidad.nivel = guardado.nivel;
      Object.assign(S.pos, guardado.pos); S.clock = guardado.clock;
      chispas.visible = false; luces.visible = false; ultima = '';
      const toast = document.getElementById('toast'); if (toast) toast.hidden = true;
    }
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  return (G.maravillas = { fase: faseDe, bahia: B, dato: DATO, aplicar, toca, pasoToques, test });
};
