/* Juego · Ríos vivos (carril T, T1; V9_BOSQUE_VIVO punto 5)
   Tres peces nativos nadan en el río, la quebrada y las pozas del mapa (mapa.agua): sirajo (Sicydium spp.), dajao (Agonostomus
   monticola) y guabina (Gobiomorus dormitor). Vittata no bucea como un pez: los mira con un «visor» que se enciende solo al volar
   bajo sobre el agua (menos de 4 m) o al quedarse quieta, de pie o posada, junto a la orilla. El buceo del capítulo 1 sigue igual:
   nadando, el visor se apaga y los peces se apartan.
   - Bancos: puntos fijos sacados de mapa.agua al cargar (río cada ~110 m, quebrada cada ~45 m y las 4 pozas), cada uno con su
     especie según el tramo (sirajo arriba y en la quebrada, dajao en el medio y las pozas, guabina abajo y en la Poza Honda).
     Solo se mueven los bancos a menos de 55 m. Peces por banco según la calidad: bajo 2, medio 4, alto 6 (G.on('calidad')).
   - Observar = con el visor puesto, tener un pez a menos de 7 m durante 1,5 s. La primera vez da su tarjeta del álbum «Peces del
     río» (sección del Diario) con un dato verificado y su fuente (USGS o DRNA, con URL), S.peces (se guarda con la partida) y
     G.emit('aprendizaje', { tipo: 'pez', id }). Nada de pesca: los peces solo se miran.
   - Rendimiento: 3 InstancedMesh (una por especie, 3 draw calls como mucho), sin sombras, el nado va en el vertex shader.
     Sin el visor se dibujan antes del agua (se ven turbios); con el visor, después y opacos. Nada se ve en las baterías (G.quiet).
   - Se carga sola tras el mundo (boot.js): window.AVRioVivo(G) → G.rioVivo = { estado, visor, observar, test, … }. Un pack puede cambiar
     los textos con pack.rioVivo.especies.
   Prueba: AV.rioVivoTest(). */
window.AVRioVivo = function (G) {
  'use strict';
  const S = G.S, scene = G.renderer.scene, M = G.fisica.MOVE;
  const H = (x, z) => G.terreno.height(x, z);
  const nivelAgua = (x, z) => (G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -Infinity);
  const MAPA = G.terreno.mapa || window.AV_MAPA_CAP1 || null, AG = MAPA && MAPA.agua;
  const POR_BANCO = { bajo: 2, medio: 4, alto: 6 }, MAXI = 48;
  const ACTIVO = 55, VUELO_BAJO = 4, ORILLA = 4.5, OBS_R = 7, OBS_T = 1.5, HUYE_R = 3.5, VIS = 1.6;
  const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' && en ? en : es);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const nivel = () => (G.renderer.calidad && G.renderer.calidad.nivel) || 'medio';
  const hash = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };

  // ---------- Especies: datos verificados (docs: TAREAS_API T1). Lo que no se pudo verificar va en porVerificar y no se muestra ----------
  const USGS_OTOLITOS = 'https://pubs.usgs.gov/publication/70148668';
  const DRNA_RIOS = 'https://www.drna.pr.gov/wp-content/uploads/2015/04/Fishery-Population-and-Habitat-Assessment-in-Puerto-Rico-Streams.pdf';
  const ESPECIES = (G.pack.rioVivo && G.pack.rioVivo.especies) || [
    { id: 'sirajo', nombre: 'Sirajo', nombreEn: 'Sirajo goby', cientifico: 'Sicydium spp.', largo: 0.11, lomo: '#5d5a44', vientre: '#bdb69a', aleta: '#6e6a4b', ancho: 0.17, alto: 0.15,
      texto: 'Gobio nativo de nuestros ríos. Un estudio del USGS en Puerto Rico halló que la mayoría pasa su primera etapa en el mar o en el estuario y después vuelve a vivir en el río.',
      textoEn: 'A native goby of our rivers. A USGS study in Puerto Rico found that most spend their earliest life stage in the sea or an estuary and then return to live in the river.',
      fuente: 'Smith y Kwak (2014), USGS · Journal of Fish Biology', url: USGS_OTOLITOS,
      porVerificar: 'Que trepa cascadas agarrado a las rocas con una ventosa formada por sus aletas (sin fuente USGS o DRNA leída).' },
    { id: 'dajao', nombre: 'Dajao', nombreEn: 'Mountain mullet', cientifico: 'Agonostomus monticola', largo: 0.24, lomo: '#4c6758', vientre: '#d9ddd0', aleta: '#b9a85e', ancho: 0.15, alto: 0.2,
      texto: 'Pez nativo de nuestros ríos. Viaja entre el mar y el río: el USGS estudió sus otolitos (huesecillos del oído) en Puerto Rico y halló que casi todos pasan sus primeros días en el mar o en el estuario.',
      textoEn: 'A native fish of our rivers. It travels between the sea and the river: the USGS studied its otoliths (tiny ear bones) in Puerto Rico and found that almost all spend their first days in the sea or an estuary.',
      fuente: 'Smith y Kwak (2014), USGS · Journal of Fish Biology', url: USGS_OTOLITOS,
      porVerificar: 'Que de adulto sube contra la corriente hasta los tramos altos (Kwak, Cooney y Brown 2007, DRNA: ' + DRNA_RIOS + '; PDF sin leer).' },
    { id: 'guabina', nombre: 'Guabina', nombreEn: 'Bigmouth sleeper', cientifico: 'Gobiomorus dormitor', largo: 0.3, lomo: '#5b4a2e', vientre: '#c9b68c', aleta: '#6a5634', ancho: 0.17, alto: 0.18, cabezona: true,
      texto: 'Pez nativo de boca grande. Casi siempre vive en el río, pero el USGS halló que unos pocos adultos (el 4 %) pasan temporadas en el estuario o en el mar.',
      textoEn: 'A native fish with a big mouth. It usually lives in the river, but the USGS found that a few adults (4%) spend periods in estuaries or the sea.',
      fuente: 'Smith y Kwak (2014), USGS · Journal of Fish Biology', url: USGS_OTOLITOS },
  ];
  const espDe = id => ESPECIES.find(e => e.id === id);
  const vistos = () => (Array.isArray(S.peces) ? S.peces : (S.peces = []));
  const F = { prueba: false, t: 0, quieta: 0, visor: 0, visorOn: false, obs: {}, mirando: '', avisado: false };
  let oyenteTest = null;
  G.on('aprendizaje', d => { if (oyenteTest) oyenteTest(d); });

  // ---------- Geometría: pez con la cabeza al +Z (largo 1), aletas en el lomo y cola; color del lomo al vientre ----------
  function geoPez(e) {
    const pos = [], col = [];
    const c = h => new THREE.Color(h), lomo = c(e.lomo), vientre = c(e.vientre), aleta = c(e.aleta), k = new THREE.Color();
    const g = new THREE.SphereGeometry(0.5, 12, 8).toNonIndexed(), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i) * e.ancho * 2, y = p.getY(i) * e.alto * 2, z = p.getZ(i);
      const afina = z < 0 ? 1 + z * 1.35 : 1 - Math.max(0, z - 0.3) * (e.cabezona ? 0.4 : 1.2);
      x *= afina; y *= afina;
      if (e.cabezona && z > 0.15) { x *= 1.12; y *= 1.08; }
      pos.push(x, y, z);
      k.copy(vientre).lerp(lomo, Math.min(1, Math.max(0, (y / (e.alto + 1e-6)) * 0.9 + 0.55)));
      col.push(k.r, k.g, k.b);
    }
    const tri = (a, b, d, kk) => { pos.push(...a, ...b, ...d); for (let i = 0; i < 3; i++) col.push(kk.r, kk.g, kk.b); };
    const ac = e.alto;
    tri([0, 0, -0.42], [0, ac * 1.5, -0.68], [0, -ac * 1.5, -0.68], aleta);   // cola
    tri([0, ac * 0.85, 0.12], [0, ac * 1.7, -0.06], [0, ac * 0.8, -0.2], aleta); // aleta del lomo
    tri([0, ac * 0.7, -0.22], [0, ac * 1.25, -0.3], [0, ac * 0.5, -0.38], aleta);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    geo.setAttribute('iFase', new THREE.InstancedBufferAttribute(new Float32Array(MAXI), 1));
    return geo;
  }
  const uT = { value: 0 };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.5, depthWrite: false });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uT = uT;
    sh.vertexShader = 'uniform float uT;\nattribute float iFase;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      'vec3 transformed = vec3(position);\n float cola = clamp(0.25 - position.z, 0.0, 1.0);\n transformed.x += sin(uT * 9.0 + iFase - position.z * 5.0) * 0.12 * cola * cola;');
  };
  const mallas = {};
  for (const e of ESPECIES) {
    const im = new THREE.InstancedMesh(geoPez(e), mat, MAXI);
    im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.count = 0; im.visible = false;
    im.name = 'peces_' + e.id; im.userData.sinCulling = true; // renderer.js cullPequenos: la caja de la malla no sigue a las instancias
    scene.add(im); mallas[e.id] = im;
  }

  // ---------- Bancos sacados del mapa ----------
  const bancos = [];
  function mojado(x, z, min) { const l = nivelAgua(x, z); return l > -Infinity && l - H(x, z) >= min; }
  function nuevoBanco(id, x, z, dx, dz, ra, rb, donde) {
    // encoge el óvalo hasta que sus 8 puntos queden en agua de 0,25 m o más
    const h = Math.hypot(dx, dz) || 1; dx /= h; dz /= h;
    for (let f = 1; f >= 0.3; f -= 0.15) {
      let bien = mojado(x, z, 0.25);
      for (let i = 0; i < 8 && bien; i++) { const a = i / 8 * Math.PI * 2, u = Math.cos(a) * ra * f, v = Math.sin(a) * rb * f; bien = mojado(x + dx * u - dz * v, z + dz * u + dx * v, 0.25); }
      if (bien) { bancos.push({ id, x, z, dx, dz, ra: ra * f, rb: rb * f, donde, peces: [], huye: { x: 0, z: 0 } }); return true; }
    }
    return false;
  }
  function crearBancos() {
    if (!AG) return;
    const linea = (P, cada, especieEn, donde) => {
      if (!P || P.length < 2) return;
      let acc = cada * 0.5, total = 0; for (let i = 1; i < P.length; i++) total += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      let rec = 0, n = 0;
      for (let i = 1; i < P.length; i++) {
        const a = P[i - 1], b = P[i], s = Math.hypot(b[0] - a[0], b[1] - a[1]); rec += s; acc += s;
        if (acc < cada) continue;
        acc = 0; const hw = b[3] || 2;
        if (nuevoBanco(especieEn(rec / total, n), b[0], b[1], b[0] - a[0], b[1] - a[1], Math.min(4, hw * 1.2), Math.max(0.5, Math.min(1.6, hw * 0.45)), donde)) n++;
      }
    };
    linea(AG.rio && AG.rio.puntos, 110, (f, n) => (f < 0.4 ? (n % 2 ? 'dajao' : 'sirajo') : f < 0.75 ? 'dajao' : (n % 2 ? 'dajao' : 'guabina')), 'rio');
    linea(AG.quebrada && AG.quebrada.puntos, 45, () => 'sirajo', 'quebrada');
    const dePoza = { charca_nubes: 'sirajo', poza_la_mina: 'dajao', poza_dajao: 'dajao', poza_honda: 'guabina' };
    for (const p of AG.pozas || []) nuevoBanco(dePoza[p.id] || 'dajao', p.x, p.z, 1, 0.3, p.r * 0.55, p.r * 0.4, p.id);
  }
  function poblar() {
    const n = POR_BANCO[nivel()] != null ? POR_BANCO[nivel()] : 4;
    for (const b of bancos) {
      b.peces = [];
      for (let i = 0; i < n; i++) {
        const r = hash(b.x + i, b.z - i);
        b.peces.push({ a: r * 6.28, va: (0.25 + hash(b.z, i) * 0.25) * (i % 2 ? 1 : -1), fase: hash(i, b.x) * 6.28, prof: 0.3 + hash(b.x, i + 3) * 0.5,
          esc: 0.85 + hash(i, b.z) * 0.3, x: b.x, y: 0, z: b.z, yaw: 0 });
      }
    }
  }
  crearBancos(); poblar();

  // ---------- Visor ----------
  const OFF8 = [[0, 0]].concat(Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]));
  function aguaCerca(r) { // nivel del agua más alto a r metros o menos de Vittata (centro y 8 puntos a r/2 y a r), o -Infinity
    let best = -Infinity;
    for (const f of [0.5, 1]) for (const [u, v] of OFF8) {
      const x = S.pos.x + u * r * f, z = S.pos.z + v * r * f, l = nivelAgua(x, z);
      if (l > best && l - H(x, z) > 0.15) best = l;
    }
    return best;
  }
  function visorPosible() {
    if (M.swimming) return false;
    if (M.flying) { const l = aguaCerca(2.5); return l > -Infinity && S.pos.y - l > -0.3 && S.pos.y - l < VUELO_BAJO; }
    const l = aguaCerca(ORILLA);
    return l > -Infinity && S.pos.y - l < 3.5 && F.quieta > 0.4;
  }

  // ---------- HUD del visor (DOM; el CSS va aquí porque ui.css es de otro carril) ----------
  if (!document.getElementById('rio-vivo-css')) {
    const st = document.createElement('style'); st.id = 'rio-vivo-css';
    st.textContent = '#rio-visor{position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;transition:opacity .35s}' +
      '#rio-visor.on{opacity:1}#rio-visor .rv-lente{position:absolute;inset:0;background:radial-gradient(circle at 50% 55%,rgba(0,0,0,0) 0 34vmin,rgba(4,40,52,.35) 40vmin,rgba(2,18,26,.72) 62vmin)}' +
      '#rio-visor .rv-aro{position:absolute;left:50%;top:55%;width:70vmin;height:70vmin;transform:translate(-50%,-50%);border-radius:50%;border:3px solid rgba(160,230,240,.55);box-shadow:inset 0 0 26px rgba(120,220,235,.25)}' +
      '#rio-visor .rv-txt{position:absolute;left:50%;bottom:calc(45% - 37vmin);transform:translateX(-50%);padding:.35em .8em;border-radius:999px;background:rgba(2,24,32,.78);color:#e8fbff;font-size:var(--fs-s,15px);white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis}' +
      '#rio-visor .rv-barra{display:block;height:3px;margin-top:.25em;border-radius:2px;background:#7fe3f0;transform-origin:left;transform:scaleX(0)}' +
      '@media (prefers-reduced-motion: reduce){#rio-visor{transition:none}}' +
      '.peces-album{list-style:none;margin:.3em 0 .4em;padding:0;display:grid;gap:.45em}' +
      '.pez-tarjeta{display:flex;gap:.6em;align-items:flex-start;padding:.45em .55em;border-radius:10px;background:rgba(255,255,255,.07)}' +
      '.pez-tarjeta svg{flex:none}.pez-tarjeta span{display:flex;flex-direction:column;gap:.15em;min-width:0}' +
      '.pez-tarjeta small{opacity:.9;line-height:1.35}.pez-tarjeta i{opacity:.8;font-size:.9em}.pez-fuente a{color:inherit;text-decoration:underline;word-break:break-word}' +
      '.pez-falta{opacity:.6}.peces-nota{display:block;opacity:.8;margin-bottom:.8em}';
    document.head.appendChild(st);
  }
  const hud = document.createElement('div'); hud.id = 'rio-visor'; hud.setAttribute('aria-hidden', 'true');
  hud.innerHTML = '<div class="rv-lente"></div><div class="rv-aro"></div><div class="rv-txt"><span class="rv-nombre"></span><i class="rv-barra"></i></div>';
  document.body.appendChild(hud);
  const hudNombre = hud.querySelector('.rv-nombre'), hudBarra = hud.querySelector('.rv-barra');

  // ---------- Observar y álbum ----------
  function observar(id) {
    const v = vistos(); if (v.includes(id) || !espDe(id)) return false;
    v.push(id);
    G.emit('aprendizaje', { tipo: 'pez', id });
    if (!G.quiet) {
      const e = espDe(id);
      try { G.ui.toastHTML(`<b>${esc(L('Peces del río', 'River fish'))}</b> · ${esc(L(e.nombre, e.nombreEn))}`, 3200); } catch (err) { /* sin HUD */ }
      try { G.guardado.autosave(); } catch (err) { /* sin guardado */ }
    }
    return true;
  }
  const SILUETA = '<path d="M6 20 Q22 6 42 14 L56 8 L52 20 L56 32 L42 26 Q22 34 6 20 Z"/><circle cx="14" cy="18" r="1.8" fill="#fff"/>';
  function htmlAlbum() {
    const v = vistos();
    const cards = ESPECIES.map(e => {
      const ok = v.includes(e.id), col = esc(ok ? e.lomo : '#555');
      const svg = `<svg viewBox="0 0 60 40" width="60" height="40" aria-hidden="true" fill="${col}">${SILUETA}</svg>`;
      if (!ok) return `<li class="pez-tarjeta pez-falta">${svg}<span><b>???</b><small>${esc(L('Vuela bajo sobre el río o quédate quieta en la orilla y mira con el visor.', 'Fly low over the river or stay still on the bank and look through the viewer.'))}</small></span></li>`;
      return `<li class="pez-tarjeta">${svg}<span><b>${esc(L(e.nombre, e.nombreEn))}</b> <i>${esc(e.cientifico)}</i><small>${esc(L(e.texto, e.textoEn))}</small>` +
        `<small class="pez-fuente">${esc(L('Fuente', 'Source'))}: <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.fuente)}</a></small></span></li>`;
    }).join('');
    return `<span class="lbl">${esc(L('Peces del río', 'River fish'))} (${ESPECIES.filter(e => v.includes(e.id)).length}/${ESPECIES.length})</span><ul class="peces-album">${cards}</ul>` +
      `<small class="peces-nota">${esc(L('Solo se observan: ningún pez se saca del agua ni se molesta.', 'Watch only: no fish is taken out of the water or disturbed.'))}</small>`;
  }
  if (G.diario && G.diario.seccion) G.diario.seccion({ id: 'peces', html: htmlAlbum });

  // ---------- Nado ----------
  const dummy = new THREE.Object3D(); dummy.rotation.order = 'YXZ';
  const verDe = () => !G.quiet || F.prueba;
  function nadar(dt) {
    const cuenta = {}; for (const e of ESPECIES) cuenta[e.id] = 0;
    const nadando = M.swimming;
    let cerca = null, dCerca = Infinity;
    for (const b of bancos) {
      const db = Math.hypot(b.x - S.pos.x, b.z - S.pos.z);
      if (db > ACTIVO + 6) continue;
      // nadando cerca, el banco se aparta de Vittata; si no, vuelve a su sitio
      if (nadando && db < HUYE_R + b.ra) { const h = db || 1; b.huye.x += (b.x - S.pos.x) / h * dt * 3; b.huye.z += (b.z - S.pos.z) / h * dt * 3; }
      else { b.huye.x *= Math.max(0, 1 - dt * 0.8); b.huye.z *= Math.max(0, 1 - dt * 0.8); }
      const hh = Math.hypot(b.huye.x, b.huye.z), lim = b.ra + 2; if (hh > lim) { b.huye.x *= lim / hh; b.huye.z *= lim / hh; }
      const e = espDe(b.id), im = mallas[b.id]; if (!e || !im) continue;
      for (const p of b.peces) {
        p.a += p.va * dt * (nadando && db < HUYE_R + b.ra ? 3 : 1);
        const u = Math.cos(p.a) * b.ra + Math.sin(p.a * 1.7 + p.fase) * 0.3, v = Math.sin(p.a) * b.rb;
        let x = b.x + b.dx * u - b.dz * v + b.huye.x, z = b.z + b.dz * u + b.dx * v + b.huye.z;
        if (!mojado(x, z, 0.12)) { x = b.x + b.huye.x * 0.3; z = b.z + b.huye.z * 0.3; }
        const lvl = nivelAgua(x, z), fondo = H(x, z);
        const y = Math.max(fondo + 0.1, Math.min(lvl - 0.12, lvl - p.prof * Math.min(1, (lvl - fondo) / 1.2)));
        const vx = x - p.x, vz = z - p.z; if (vx * vx + vz * vz > 1e-6) p.yaw = Math.atan2(vx, vz);
        p.x = x; p.y = y; p.z = z;
        const d = Math.hypot(x - S.pos.x, z - S.pos.z);
        if (d < dCerca) { dCerca = d; cerca = b.id; }
        if (db > ACTIVO || cuenta[b.id] >= MAXI) continue;
        const i = cuenta[b.id]++, s = e.largo * VIS * p.esc;
        dummy.position.set(x, y, z); dummy.rotation.set(0, p.yaw, 0); dummy.scale.set(s, s, s); dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix); im.geometry.attributes.iFase.setX(i, p.fase);
      }
    }
    const ver = verDe();
    for (const e of ESPECIES) {
      const im = mallas[e.id]; im.count = cuenta[e.id]; im.visible = ver && cuenta[e.id] > 0;
      im.instanceMatrix.needsUpdate = true; im.geometry.attributes.iFase.needsUpdate = true;
    }
    return { cerca, dCerca };
  }

  // ---------- Bucle ----------
  function paso(dt, busy) {
    dt = Math.min(dt, 0.1); F.t += dt; uT.value += dt;
    const quieta = M.posado ? M.speed < 0.6 : !M.flying && !M.swimming && M.speed < 0.4;
    F.quieta = quieta && !busy ? F.quieta + dt : 0;
    const n = nadar(dt);
    const quiere = !busy && visorPosible();
    F.visor = Math.max(0, Math.min(1, F.visor + (quiere ? dt : -dt) * 3));
    F.visorOn = F.visor > 0.5;
    mat.opacity = 0.5 + F.visor * 0.5; mat.depthWrite = F.visorOn;
    const orden = F.visorOn ? 10 : -1; for (const id in mallas) mallas[id].renderOrder = orden;
    F.mirando = '';
    if (F.visorOn && n.cerca && n.dCerca < OBS_R) {
      const id = n.cerca; F.mirando = id;
      if (!vistos().includes(id)) { F.obs[id] = (F.obs[id] || 0) + dt; if (F.obs[id] >= OBS_T) observar(id); }
    }
    for (const id in F.obs) if (id !== F.mirando) F.obs[id] = Math.max(0, F.obs[id] - dt * 0.5);
    // HUD
    const mostrar = F.visorOn && !G.quiet && !busy;
    hud.classList.toggle('on', mostrar);
    if (mostrar) {
      const e = F.mirando && espDe(F.mirando), visto = e && vistos().includes(e.id);
      hudNombre.textContent = !e ? L('Visor · busca peces bajo el agua', 'Viewer · look for fish under the water') :
        visto ? L('Visor · ', 'Viewer · ') + L(e.nombre, e.nombreEn) + ' (' + e.cientifico + ')' : L('Visor · observando un pez…', 'Viewer · watching a fish…');
      hudBarra.style.transform = 'scaleX(' + (e && !visto ? Math.min(1, (F.obs[e.id] || 0) / OBS_T) : 0) + ')';
      if (!F.avisado) { F.avisado = true; try { G.ui.toast(L('Visor: quédate cerca del pez para observarlo.', 'Viewer: stay near a fish to watch it.'), 2600); } catch (err) { /* sin HUD */ } }
    }
  }
  G.on('update', (dt, busy) => { if (!F.prueba) paso(dt, busy); }, 86);
  G.on('apply', () => { vistos(); F.obs = {}; });
  G.on('calidad', () => poblar());
  const contar = () => { const c = {}; for (const b of bancos) c[b.id] = (c[b.id] || 0) + 1; return c; };
  const estado = () => ({ bancos: bancos.length, porEspecie: contar(), porBanco: bancos[0] ? bancos[0].peces.length : 0, visor: F.visorOn, mirando: F.mirando, vistos: vistos().slice(),
    draw: Object.values(mallas).filter(m => m.visible).length });

  // =====================================================================================================================
  // Prueba (AV.rioVivoTest)
  // =====================================================================================================================
  async function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const g0 = { pos: Object.assign({}, S.pos), vy: S.vy, peces: vistos().slice(), posado: M.posado, speed: M.speed, flying: M.flying, swimming: M.swimming, obs: F.obs, avisado: F.avisado };
    const aprend = []; oyenteTest = d => { if (d && d.tipo === 'pez') aprend.push(d.id); };
    const simular = (s, fn) => { for (let t = 0; t < s; t += 0.1) { if (fn) fn(); paso(0.1, false); } };
    const ponEn = (x, y, z, o) => { S.pos.x = x; S.pos.y = y; S.pos.z = z; S.vy = 0; M.speed = 0; M.flying = false; M.swimming = false; M.posado = ''; Object.assign(M, o || {}); };
    F.prueba = true; F.avisado = true;
    try {
      S.peces = []; F.obs = {};
      // 1. Datos
      ok('3 especies nativas: sirajo, dajao y guabina', ESPECIES.map(e => e.id).join() === 'sirajo,dajao,guabina' &&
        /Sicydium/.test(espDe('sirajo').cientifico) && espDe('dajao').cientifico === 'Agonostomus monticola' && espDe('guabina').cientifico === 'Gobiomorus dormitor');
      ok('Cada especie lleva texto ES y EN, fuente y URL de USGS o DRNA', ESPECIES.every(e => e.texto && e.textoEn && e.fuente && /^https:\/\/([a-z]+\.)?(usgs\.gov|drna\.pr\.gov)\//.test(e.url)));
      ok('Nada de pesca: los textos no hablan de pescar ni de comer peces', ESPECIES.every(e => !/pesc|comer|cocin|fishing|\beat|catch/i.test(e.texto + ' ' + e.textoEn)));
      // 2. Bancos en el río, la quebrada y las pozas, con las 3 especies
      const c = contar(), donde = new Set(bancos.map(b => b.donde === 'rio' || b.donde === 'quebrada' ? b.donde : 'poza'));
      ok('Hay bancos en el río, la quebrada y las pozas', donde.has('rio') && donde.has('quebrada') && donde.has('poza'), bancos.length + ' bancos · ' + JSON.stringify(c));
      ok('Las 3 especies tienen bancos', ESPECIES.every(e => c[e.id] > 0));
      // 3. Nadan bajo el agua y sobre el fondo, sin NaN (cada banco simulado 3 s con Vittata encima)
      let bien = true, malos = 0;
      for (const b of bancos) {
        ponEn(b.x, H(b.x, b.z) + 30, b.z); simular(0.6);
        for (const p of b.peces) { const l = nivelAgua(p.x, p.z), f = H(p.x, p.z); if (!isFinite(p.x + p.y + p.z) || !(p.y < l - 0.05) || p.y < f + 0.05) { bien = false; malos++; } }
      }
      ok('Todos los peces nadan bajo la superficie y sobre el fondo', bien, malos + ' fuera');
      // 4. Instancias: 3 mallas, una por especie, y cantidad según la calidad
      const ims = Object.values(mallas);
      ok('3 InstancedMesh (una por especie), sin sombras', ims.length === 3 && ims.every(m => m.isInstancedMesh && !m.castShadow));
      const qn = G.renderer.calidad.nivel, cuenta = {};
      for (const n of ['bajo', 'medio', 'alto']) { G.renderer.calidad.nivel = n; poblar(); cuenta[n] = bancos[0].peces.length; }
      G.renderer.calidad.nivel = qn; poblar();
      ok('Peces por banco según la calidad (bajo 2, medio 4, alto 6)', cuenta.bajo === 2 && cuenta.medio === 4 && cuenta.alto === 6, JSON.stringify(cuenta));
      // 5. Visor: banco de dajao del río (o el primero)
      const b = bancos.find(x => x.id === 'dajao' && x.donde === 'rio') || bancos[0], lvl = nivelAgua(b.x, b.z);
      ponEn(b.x, lvl + 1.8, b.z, { flying: true, speed: 4 }); simular(0.6);
      ok('Volando bajo sobre el río (1,8 m), el visor se enciende', F.visorOn, 'visor ' + F.visor.toFixed(2));
      ponEn(b.x, lvl + 12, b.z, { flying: true, speed: 4 }); simular(0.6);
      ok('Volando alto (12 m), el visor se apaga', !F.visorOn);
      // orilla: el punto seco más cercano al banco, de pie y quieta
      let orilla = null;
      for (let r = 1; r < 8 && !orilla; r += 0.5) for (const [u, v] of OFF8.slice(1)) { const x = b.x + u * r, z = b.z + v * r; if (!mojado(x, z, 0.01) && H(x, z) - lvl < 2.5) { orilla = { x, z }; break; } }
      if (orilla) {
        ponEn(orilla.x, H(orilla.x, orilla.z), orilla.z, { speed: 1.5 }); simular(0.6);
        const andando = F.visorOn;
        ponEn(orilla.x, H(orilla.x, orilla.z), orilla.z); simular(0.8);
        ok('En la orilla, quieta: visor encendido (andando, no)', F.visorOn && !andando, (orilla.x - b.x).toFixed(1) + ', ' + (orilla.z - b.z).toFixed(1));
        ponEn(orilla.x, H(orilla.x, orilla.z), orilla.z, { posado: 'alto' }); F.quieta = 0; simular(0.8);
        ok('Posada junto al agua: visor encendido', F.visorOn);
      } else ok('Hay orilla junto al banco de prueba', false);
      let lejos = false;
      for (let r = 15; r < 200 && !lejos; r += 5) for (const [u, v] of OFF8.slice(1)) { const x = b.x + u * r, z = b.z + v * r; ponEn(x, H(x, z), z); if (aguaCerca(ORILLA) === -Infinity) { lejos = true; break; } }
      simular(0.8);
      ok('Lejos del agua el visor no sale', lejos && !F.visorOn);
      // el buceo del capítulo sigue: nadando, el visor se apaga y el banco se aparta
      ponEn(b.x, lvl, b.z, { swimming: true, speed: 1 }); b.huye.x = b.huye.z = 0; simular(1.5);
      ok('Nadando (buceo del capítulo): visor apagado y los peces se apartan', !F.visorOn && Math.hypot(b.huye.x, b.huye.z) > 0.5, Math.hypot(b.huye.x, b.huye.z).toFixed(2) + ' m');
      // 6. Observar
      S.peces = []; F.obs = {}; aprend.length = 0;
      ponEn(b.x, lvl + 1.5, b.z, { flying: true, speed: 3 }); simular(0.6);
      const antes = vistos().includes(b.id);
      simular(2);
      ok('Con el visor, 1,5 s junto a un pez lo observa (S.peces y un «aprendizaje» tipo pez)', !antes && vistos().includes(b.id) && aprend.filter(i => i === b.id).length === 1, aprend.join(','));
      simular(3);
      ok('Quedarse más tiempo no lo cuenta otra vez', aprend.filter(i => i === b.id).length === 1);
      ponEn(b.x, lvl + 12, b.z, { flying: true, speed: 3 }); S.peces = []; F.obs = {}; simular(3);
      ok('Sin visor (volando alto) no se observa nada', vistos().length === 0);
      // 7. Álbum
      S.peces = [];
      const div = document.createElement('div'); div.innerHTML = htmlAlbum();
      ok('Sin observar: 3 tarjetas con pista, sin texto ni enlace', div.querySelectorAll('.pez-falta').length === 3 && !div.querySelector('a'));
      S.peces = ['sirajo', 'dajao', 'guabina']; div.innerHTML = htmlAlbum();
      const tarjetas = Array.from(div.querySelectorAll('.pez-tarjeta'));
      ok('Observados: 3 tarjetas con dato, «Fuente» y enlace https', tarjetas.length === 3 && !div.querySelector('.pez-falta') &&
        tarjetas.every(t => /Fuente|Source/.test(t.textContent) && t.querySelector('a[href^="https://"]')), tarjetas.length + ' tarjetas');
      ok('Lo no verificado no se muestra', ESPECIES.every(e => !e.porVerificar || !div.textContent.includes(e.porVerificar)));
      ok('El álbum es una sección del Diario', !!(G.diario && G.diario.seccion));
      // 8. Rendimiento y baterías
      ponEn(b.x, lvl + 1.5, b.z, { flying: true }); simular(0.2);
      ok('3 draw calls como mucho', estado().draw <= 3, estado().draw);
      const q = G.quiet; G.quiet = true; F.prueba = false; paso(0.05, false); const nada = ims.every(m => !m.visible) && !hud.classList.contains('on'); F.prueba = true; G.quiet = q;
      ok('En las baterías (G.quiet) no se ve ningún pez ni el visor', nada);
    } finally {
      oyenteTest = null; F.prueba = false; F.obs = g0.obs; F.avisado = g0.avisado; S.peces = g0.peces;
      Object.assign(S.pos, g0.pos); S.vy = g0.vy; M.posado = g0.posado; M.speed = g0.speed; M.flying = g0.flying; M.swimming = g0.swimming;
      F.visor = 0; F.visorOn = false; hud.classList.remove('on'); for (const b of bancos) b.huye.x = b.huye.z = 0;
    }
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  return (G.rioVivo = { estado, observar, test, paso, bancos, F, especies: ESPECIES, get visor() { return F.visorOn; }, get meshes() { return Object.values(mallas); } });
};
