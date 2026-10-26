/* Juego · Maravillas de la costa (tablero G5, GDD §6)
   Dos momentos baratos, un draw call cada uno. Con calidad baja no hay luciérnagas y las chispas son pocas.
   - Atardecer, en un ciclo de 10 min de juego: luciérnagas y un coquí junto a la caleta.
   - Noche: la caleta del suroeste (mapa lugares.bahiaBio) enciende una estela azul si Vittata está cerca.
     El brillo lo producen dinoflagelados, Pyrodinium bahamense, como en Puerto Mosquito (Vieques).
     Fuente: NOAA Office for Coastal Management, «Mangrove, Seagrass, and Coral Restoration in the
     Vieques Bioluminescent Bay Natural Reserve»,
     https://coast.noaa.gov/states/stories/vieques-bioluminescent-bay.html (consultada el 26-oct-2026).
   El cielo global sigue de día (lo lleva el clima). Aquí solo cambia la caleta, y solo de cerca.
   Carga perezosa desde boot.js. window.AVMaravillas(G) → { fase, bahia, dato, test }.
   Prueba: AV.maravillasTest(). */
window.AVMaravillas = function (G) {
  'use strict';
  if (G.maravillas) return G.maravillas;
  const S = G.S, scene = G.renderer.scene;
  const mapa = (G.terreno.mapa && G.terreno.mapa.lugares && G.terreno.mapa.lugares.bahiaBio) || { x: -160, z: 207, r: 24 };
  const B = { x: mapa.x, z: mapa.z, r: mapa.r || 24 };
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
  const chispas = puntos('bahia_bio', 0x3ec6ff, 0.55);
  const luces = puntos('luciernagas', 0xd6ff6a, 0.28);
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
  const cercaDe = () => Math.hypot(S.pos.x - B.x, S.pos.z - B.z) < B.r + 36;
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
    canto -= dt;
    if (fase === 'atardecer' && cercaDe() && canto <= 0 && !G.quiet && G.audio && G.audio.has && G.audio.has('co')) {
      canto = 3.2; G.audio.play('co');
    }
    if (ver) aviso(fase);
  }, 48);
  G.on('calidad', () => { ultima = ''; }, 40);
  G.on('apply', () => { vistos = { noche: false, atardecer: false }; ultima = ''; }, 40);

  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const guardado = { quiet: G.quiet, pos: Object.assign({}, S.pos), clock: S.clock, nivel: nivel() };
    try {
      ok('La caleta está en el mapa (suroeste)', isFinite(B.x + B.z) && B.r >= 8, Math.round(B.x) + ',' + Math.round(B.z));
      ok('El ciclo separa día, atardecer y noche', faseDe(0) === 'dia' && faseDe(380) === 'atardecer' && faseDe(450) === 'noche' && faseDe(560) === 'dia');
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
    } finally {
      G.quiet = guardado.quiet;
      if (G.renderer.calidad) G.renderer.calidad.nivel = guardado.nivel;
      Object.assign(S.pos, guardado.pos); S.clock = guardado.clock;
      chispas.visible = false; luces.visible = false; ultima = '';
      const toast = document.getElementById('toast'); if (toast) toast.hidden = true;
    }
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  return (G.maravillas = { fase: faseDe, bahia: B, dato: DATO, aplicar, test });
};
