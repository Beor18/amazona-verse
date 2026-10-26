/* Juego · Fauna que reacciona (carril N, N1; BOSQUE_VIVO_DISENO ficha 2)
   Cuatro animales de El Yunque; cada uno hace una cosa cuando Vittata se acerca y otra si se queda quieta:
   - Lagartijo (Anolis cristatellus): en los 2 m bajos de los troncos cercanos (los colliders de árbol de vegetacion.js), quieto;
     cada 6–12 s hace 3 flexiones y despliega el abanico. A menos de 6 m se esconde al otro lado del tronco (se le ve la cola);
     si Vittata se queda quieta cerca, vuelve a asomar y hace las flexiones «para ella». Con el gesto «Saludar» cerca: viñeta.
   - Mariposa cebra (Heliconius charithonia): 3 nubes junto a la plaza, el claro y la Poza del Dajao, en ochos a 1–3 m. Al pasar
     volando cerca se dispersan unos 2 s y vuelven; si Vittata se queda quieta junto a ellas, una se le posa en el pico.
   - Coquí (Eleutherodactylus coqui): en los 3 arbustos de M3 y 5 hojas del Bosque enano; solo se ve con neblina o llovizna
     (G.clima, si está cargado) o con M3 terminada. Cerca infla el saco vocal y canta. Tres fotos seguidas a su lado: coro.
   - Boa puertorriqueña (Chilabothrus inornatus), opcional (pack.fauna.boa): duerme en una rama alta cerca de la Cueva del Río;
     no persigue ni se mueve. Si Vittata se posa en su rama, levanta la cabeza 2 s, la mira y vuelve a dormir.
   Observar = estar a menos de 4 m, quieta o posada, 2 s. La primera vez da la tarjeta del álbum «Fauna de El Yunque» (sección del
   Diario), S.fauna (ids, se guarda con la partida) y G.emit('aprendizaje', { tipo: 'fauna', id }).
   - Se carga al pedirlo (boot.js, tras el mundo): window.AVFauna(G) → Promise de { estado, observar, test, … }. Los datos (textos,
     fuentes, zonas) están en el pack (cap1: content/cap1/fauna.js, que se baja aquí mismo).
   - Rendimiento: 4 InstancedMesh (lagartijos, mariposas cerca y lejos, coquíes) + 1 malla de la boa: 5 draw calls como mucho.
     Sin sombras, nada a más de 70 m; G.on('calidad') cambia los count sin recrear nada. Nada se ve en las baterías (G.quiet).
   Prueba: AV.faunaTest(). */
(function () {
  'use strict';
  window.AVFauna = function (G) {
    const archivo = G.pack.faunaDatos;
    const datos = archivo && !G.pack.fauna ? window.AVE.assets.script(archivo) : Promise.resolve();
    return datos.then(() => crear(G));
  };

  function crear(G) {
    const S = G.S, scene = G.renderer.scene, M = G.fisica.MOVE, D = G.pack.fauna || { especies: [], zonas: {} };
    const H = (x, z) => G.terreno.height(x, z);
    const N_LAG = { bajo: 6, medio: 12, alto: 20 }, N_MAR = { bajo: 4, medio: 8, alto: 12 };
    const OBS_R = 4, OBS_T = 2, LAG_HUYE = 6, APAGA = 70, RECOLOCA = 40, RADIO_ARB = 60, LOD_MAR = 25;
    const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' && en ? en : es);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const nivel = () => (G.renderer.calidad && G.renderer.calidad.nivel) || 'medio';
    const hash = (x, z, k) => { const s = Math.sin(x * 12.9898 + z * 78.233 + (k || 0) * 37.719) * 43758.5453; return s - Math.floor(s); };
    const conBoa = D.boa !== false;
    const especies = () => (D.especies || []).filter(e => e.id !== 'boa' || conBoa);
    const vistos = () => (Array.isArray(S.fauna) ? S.fauna : (S.fauna = []));
    const F = { prueba: false, quieta: 0, t: 0, gestos: [] };
    const uT = { value: 0 };
    let oyenteTest = null; // la prueba cuenta los «aprendizaje» de fauna (G no tiene off)
    G.on('aprendizaje', d => { if (oyenteTest) oyenteTest(d); });

    // ---------- Utilidades de geometría (no indexada, con color por vértice y una marca por vértice) ----------
    function Constructor() {
      const pos = [], col = [], mk = [];
      const c3 = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
      const api = {
        geo(g, color, marca, fn) { // g: BufferGeometry; fn(x, y, z) → [x, y, z]
          g = g.index ? g.toNonIndexed() : g; const p = g.attributes.position, c = typeof color === 'function' ? null : c3(color);
          for (let i = 0; i < p.count; i++) {
            const v = fn ? fn(p.getX(i), p.getY(i), p.getZ(i)) : [p.getX(i), p.getY(i), p.getZ(i)];
            pos.push(v[0], v[1], v[2]); const k = c || c3(color(v, i, g)); col.push(k[0], k[1], k[2]); mk.push(marca || 0);
          }
          return api;
        },
        tri(a, b, c, color, marca) { const k = c3(color); for (const v of [a, b, c]) { pos.push(...v); col.push(...k); mk.push(marca || 0); } return api; },
        fin() {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
          g.setAttribute('aMarca', new THREE.Float32BufferAttribute(mk, 1));
          g.computeVertexNormals(); return g;
        },
      };
      return api;
    }
    const elip = (sx, sy, sz, x, y, z, w, h) => (px, py, pz) => [px * sx + x, py * sy + y, pz * sz + z];
    const esfera = (w, h) => new THREE.SphereGeometry(1, w, h);
    // Material con un trozo de vertex shader propio. attrs: atributos por instancia (float) que lee el trozo
    function material(attrs, trozo, extra) {
      const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
      m.onBeforeCompile = sh => {
        sh.uniforms.uT = uT; if (extra) Object.assign(sh.uniforms, extra);
        sh.vertexShader = 'uniform float uT;\nattribute float aMarca;\n' + attrs.map(a => 'attribute float ' + a + ';\n').join('') + Object.keys(extra || {}).map(u => 'uniform float ' + u + ';\n').join('') +
          sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = vec3(position);\n' + trozo);
      };
      m.customProgramCacheKey = () => 'fauna:' + attrs.join() + trozo;
      return m;
    }
    function instanciada(geo, mat, max, nombre, attrs) {
      for (const a of attrs) geo.setAttribute(a, new THREE.InstancedBufferAttribute(new Float32Array(max), 1));
      const im = new THREE.InstancedMesh(geo, mat, max);
      im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.count = 0; im.visible = false; im.name = 'fauna:' + nombre;
      im.userData.sinCulling = true; im.userData.sinSolido = true; // la caja de la malla no sigue a las instancias; no son suelo
      scene.add(im); return im;
    }
    const dummy = new THREE.Object3D(), _v = new THREE.Vector3();
    const verDe = () => !G.quiet || F.prueba;

    // =====================================================================================================================
    // Lagartijos. Espacio local: +Y hacia arriba por el tronco, +Z hacia fuera del tronco (el vientre en z = 0).
    // Marca 1: el abanico (gira desde la garganta con iAb).
    // =====================================================================================================================
    const GARGANTA = [0, 0.085, 0.03];
    const geoLag = (() => {
      const b = Constructor(), piel = '#7d6c45', vientre = '#9c8a5c';
      b.geo(esfera(8, 6), piel, 0, elip(0.034, 0.085, 0.024, 0, 0, 0.026));
      b.geo(esfera(7, 5), piel, 0, elip(0.026, 0.042, 0.022, 0, 0.11, 0.03));
      b.geo(esfera(4, 3), '#141414', 0, elip(0.006, 0.006, 0.006, 0.02, 0.125, 0.04)).geo(esfera(4, 3), '#141414', 0, elip(0.006, 0.006, 0.006, -0.02, 0.125, 0.04));
      b.geo(new THREE.ConeGeometry(0.016, 0.26, 6), vientre, 0, (x, y, z) => [x, -y - 0.2, z + 0.018]);
      for (const [sx, sy] of [[1, 0.05], [-1, 0.05], [1, -0.05], [-1, -0.05]]) b.geo(new THREE.BoxGeometry(0.05, 0.012, 0.012), piel, 0, (x, y, z) => [x + sx * 0.04, y + sy, z + 0.012]);
      // abanico: medio disco en el plano YZ, de la garganta hacia fuera y abajo; amarillo con borde anaranjado
      const R = 0.055, n = 8;
      for (let i = 0; i < n; i++) {
        const a0 = -Math.PI / 2 + (i / n) * Math.PI * 0.9, a1 = -Math.PI / 2 + ((i + 1) / n) * Math.PI * 0.9;
        const p = (a, r) => [0, GARGANTA[1] + Math.sin(a) * r * 0.9, GARGANTA[2] + Math.cos(a) * r];
        b.tri(GARGANTA, p(a0, R * 0.78), p(a1, R * 0.78), '#f2c428', 1);
        b.tri(p(a0, R * 0.78), p(a0, R), p(a1, R), '#e8742a', 1).tri(p(a0, R * 0.78), p(a1, R), p(a1, R * 0.78), '#e8742a', 1);
      }
      return b.fin();
    })();
    const matLag = material(['iAb'], `if (aMarca > 0.5) { vec3 g = vec3(${GARGANTA.join(', ')}); transformed = g + (position - g) * max(0.04, iAb); }`);
    const lagMesh = instanciada(geoLag, matLag, N_LAG.alto, 'lagartijos', ['iAb']);
    const LAG = { lista: [], centro: { x: 1e9, z: 1e9 }, n: 0, revisar: 0, arboles: 0 };

    function arbolesCerca(px, pz, radio) {
      const out = [], vistosA = new Set();
      for (const c of G.fisica.colliders || []) {
        if (c.kind !== 'arbol' || !(c.r > 0)) continue;
        const k = Math.round(c.x * 10) + ':' + Math.round(c.z * 10);
        if (vistosA.has(k) || Math.hypot(c.x - px, c.z - pz) > radio) continue;
        vistosA.add(k); out.push({ x: c.x, z: c.z, r: c.r });
      }
      if (!out.length && !G.vegetacion) for (const t of G.terreno.trees || []) if (Math.hypot(t.x - px, t.z - pz) < radio) out.push({ x: t.x, z: t.z, r: 0.25 * (t.s || 1) });
      return out;
    }
    function recolocarLagartijos() {
      const n = N_LAG[nivel()] != null ? N_LAG[nivel()] : 12;
      const arb = arbolesCerca(S.pos.x, S.pos.z, RADIO_ARB).sort((a, b) => hash(a.x, a.z) - hash(b.x, b.z)).slice(0, n);
      LAG.lista = arb.map((t, i) => {
        const casa = hash(t.x, t.z, 1) * Math.PI * 2;
        return { t, casa, ang: casa, angObj: casa, h: 0.55 + hash(t.x, t.z, 2) * 1.45, lado: hash(t.x, t.z, 3) < 0.5 ? -1 : 1,
          prox: 1 + hash(t.x, t.z, 4) * 8, flex: 0, ab: 0, calmo: false, i };
      });
      LAG.centro = { x: S.pos.x, z: S.pos.z }; LAG.n = n; LAG.arboles = arb.length;
    }
    const posLag = (l, out) => {
      const r = l.t.r + 0.005 + (l.flex > 0 ? Math.abs(Math.sin(l.flex * Math.PI * 2.5)) * 0.03 : 0);
      out.x = l.t.x + Math.cos(l.ang) * r; out.z = l.t.z + Math.sin(l.ang) * r; out.y = H(out.x, out.z) + l.h; return out;
    };
    const flexiones = l => { l.flex = 1.2; };
    function pasoLagartijos(dt, libre) {
      const px = S.pos.x, pz = S.pos.z;
      LAG.revisar -= dt;
      if (Math.hypot(px - LAG.centro.x, pz - LAG.centro.z) > RECOLOCA || LAG.n !== N_LAG[nivel()] ||
        (LAG.revisar <= 0 && LAG.arboles < LAG.n && arbolesCerca(px, pz, RADIO_ARB).length > LAG.arboles)) recolocarLagartijos();
      if (LAG.revisar <= 0) LAG.revisar = 2;
      let n = 0; const ver = verDe(), ab = lagMesh.geometry.attributes.iAb, p = {};
      for (const l of LAG.lista) {
        posLag(l, p);
        const dx = px - l.t.x, dz = pz - l.t.z, d = Math.hypot(dx, dz), d3 = Math.hypot(px - p.x, S.pos.y - p.y, pz - p.z);
        const haciaV = Math.atan2(dz, dx);
        if (l.calmo && d > LAG_HUYE + 2) l.calmo = false;
        if (!l.calmo && libre && F.quieta >= OBS_T && d3 < OBS_R) { l.calmo = true; flexiones(l); observar('lagartijo'); }
        if (l.calmo) l.angObj = haciaV;
        else if (d < LAG_HUYE) l.angObj = haciaV + Math.PI * 0.82 * l.lado;
        else { l.angObj = l.casa; if ((l.prox -= dt) <= 0) { l.prox = 6 + Math.random() * 6; flexiones(l); } }
        let da = ((l.angObj - l.ang) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; l.ang += da * Math.min(1, dt * 4);
        if (l.flex > 0) { l.flex = Math.max(0, l.flex - dt); l.ab = Math.min(1, l.ab + dt * 5); } else l.ab = Math.max(0, l.ab - dt * 3);
        if (!ver || Math.hypot(p.x - G.renderer.camera.position.x, p.z - G.renderer.camera.position.z) > APAGA) continue;
        dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, Math.atan2(Math.cos(l.ang), Math.sin(l.ang)), 0); dummy.scale.setScalar(1); dummy.updateMatrix();
        lagMesh.setMatrixAt(n, dummy.matrix); ab.setX(n, l.ab); n++;
      }
      lagMesh.count = n; lagMesh.visible = n > 0; lagMesh.instanceMatrix.needsUpdate = true; ab.needsUpdate = true;
    }

    // =====================================================================================================================
    // Mariposas: dos LOD; las alas (|x| > 0.006) baten en el vertex shader.
    // =====================================================================================================================
    const geoMarCerca = (() => {
      const b = Constructor(), negro = '#1a1712', amarillo = '#f2cf3a';
      b.geo(new THREE.BoxGeometry(0.008, 0.008, 0.07), negro);
      for (const s of [-1, 1]) {
        const tiras = [[0.006, 0.03], [0.03, 0.05], [0.05, 0.075], [0.075, 0.095]];
        tiras.forEach(([x0, x1], i) => {
          const k = i % 2 ? amarillo : negro, A = [s * x0, 0, 0.03], B = [s * x1, 0, 0.036], C = [s * x1, 0, -0.03], Dd = [s * x0, 0, -0.022];
          b.tri(A, B, C, k).tri(A, C, Dd, k);
        });
      }
      return b.fin();
    })();
    const geoMarLejos = (() => {
      const b = Constructor(), k = '#6e5d22';
      for (const s of [-1, 1]) b.tri([s * 0.007, 0, 0.03], [s * 0.095, 0, 0.02], [s * 0.007, 0, -0.025], k);
      return b.fin();
    })();
    const trozoAla = 'float ax = abs(position.x); if (ax > 0.006) { float a = sin(uT * 16.0 + iFase) * 0.9; transformed.x = sign(position.x) * ax * cos(a); transformed.y = ax * sin(a); }';
    const matMar = material(['iFase'], trozoAla);
    const marCerca = instanciada(geoMarCerca, matMar, 36, 'mariposas', ['iFase']), marLejos = instanciada(geoMarLejos, matMar, 36, 'mariposas-lejos', ['iFase']);
    const MAR = { nubes: [] };
    function lugar(id) {
      const p = id && G.terreno.poi ? G.terreno.poi(id) : null;
      if (p) return p;
      const a = (G.pack.jugador && G.pack.jugador.aparicion) || { x: 0, z: 0 };
      return { x: a.x, y: H(a.x, a.z), z: a.z };
    }
    // Junto a un sitio, en tierra firme: el primer punto de un anillo que no esté por debajo del sitio (la poza es agua)
    function orilla(p, r0) {
      for (let r = r0; r <= r0 + 8; r += 2) for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, h = H(x, z);
        if (h > p.y + 0.3 && Math.abs(H(x + 1, z) - h) < 0.6 && Math.abs(H(x, z + 1) - h) < 0.6) return { x, z };
      }
      return { x: p.x + r0, z: p.z };
    }
    function crearNubes() {
      const ids = (D.zonas && D.zonas.mariposas) || ['plaza'];
      MAR.nubes = ids.map((id, k) => {
        const p = lugar(id), c = id === 'poza_dajao' ? orilla(p, 9) : orilla(p, 4);
        const aves = [];
        for (let i = 0; i < 12; i++) aves.push({ fase: hash(k, i, 5) * 6.28, w: 0.35 + hash(k, i, 6) * 0.25, A: 1.4 + hash(k, i, 7) * 1.4, rot: hash(k, i, 8) * 6.28,
          dir: hash(k, i, 9) * 6.28, hb: 1 + hash(k, i, 10) * 2, x: c.x, y: 0, z: c.z });
        return { id, x: c.x, z: c.z, aves, disp: 0, dispT: 0, pico: null };
      });
    }
    function picoMundo(out) {
      const p3 = G.actores && G.actores.player3D, a = p3 && p3.anchors && p3.anchors.pico;
      if (a) { a.getWorldPosition(out); return out; }
      return out.set(S.pos.x, S.pos.y + 0.95, S.pos.z);
    }
    function pasoMariposas(dt, libre) {
      const n = N_MAR[nivel()] != null ? N_MAR[nivel()] : 8, px = S.pos.x, py = S.pos.y, pz = S.pos.z, rapido = M.flying || M.speed > 2.5;
      const cam = G.renderer.camera.position, ver = verDe();
      let nc = 0, nl = 0; const fc = marCerca.geometry.attributes.iFase, fl = marLejos.geometry.attributes.iFase;
      for (const nb of MAR.nubes) {
        const g = H(nb.x, nb.z), dC = Math.hypot(px - nb.x, pz - nb.z);
        if (rapido && dC < 4.5 && py < g + 5) { nb.dispT = 1.6; }
        if (nb.dispT > 0) { nb.dispT -= dt; nb.disp += (1 - nb.disp) * Math.min(1, dt * 5); } else nb.disp += (0 - nb.disp) * Math.min(1, dt * 3.5);
        // Una se posa en el pico: Vittata quieta junto a las flores
        if (!nb.pico && libre && F.quieta >= OBS_T && dC < 3.5 && Math.abs(py - g) < 3 && nb.disp < 0.2) nb.pico = { t: 0, i: 0, llego: false };
        if (nb.pico && (nb.pico.t += dt) > 7) nb.pico = null;
        for (let i = 0; i < n; i++) {
          const a = nb.aves[i], s = F.t * a.w + a.fase;
          let x = Math.sin(s) * a.A, z = Math.sin(s * 2) * a.A * 0.5;
          const cr = Math.cos(a.rot), sr = Math.sin(a.rot); const rx = x * cr - z * sr, rz = x * sr + z * cr;
          let tx = nb.x + rx + Math.cos(a.dir) * nb.disp * 5, tz = nb.z + rz + Math.sin(a.dir) * nb.disp * 5;
          let ty = g + a.hb + Math.sin(s * 1.7) * 0.35 + nb.disp * 1.5;
          if (nb.pico && i === nb.pico.i) {
            picoMundo(_v); const k = Math.min(1, nb.pico.t / 1.2), sale = nb.pico.t > 6 ? (nb.pico.t - 6) : 0, e = k * k * (3 - 2 * k) * (1 - sale);
            tx += (_v.x - tx) * e; ty += (_v.y + 0.06 - ty) * e; tz += (_v.z - tz) * e;
            if (k >= 1 && !nb.pico.llego) { nb.pico.llego = true; observar('mariposa'); evento('ButterflyOnBeak', { nube: nb.id }); }
          }
          a.vx = (tx - a.x) / Math.max(dt, 1e-3); a.vz = (tz - a.z) / Math.max(dt, 1e-3);
          a.x = tx; a.y = Math.max(ty, H(tx, tz) + 0.4); a.z = tz;
          if (!ver) continue;
          const dd = Math.hypot(a.x - cam.x, a.y - cam.y, a.z - cam.z); if (dd > APAGA) continue;
          dummy.position.set(a.x, a.y, a.z); dummy.rotation.set(0, Math.atan2(a.vx, a.vz) || 0, 0); dummy.scale.setScalar(1.6); dummy.updateMatrix();
          if (dd < LOD_MAR) { marCerca.setMatrixAt(nc, dummy.matrix); fc.setX(nc++, a.fase); } else { marLejos.setMatrixAt(nl, dummy.matrix); fl.setX(nl++, a.fase); }
        }
      }
      for (const [im, k, f] of [[marCerca, nc, fc], [marLejos, nl, fl]]) { im.count = k; im.visible = k > 0; im.instanceMatrix.needsUpdate = true; f.needsUpdate = true; }
    }

    // =====================================================================================================================
    // Coquíes: hoja + ranita; marca 1 = saco vocal (se infla con iSaco desde la garganta).
    // =====================================================================================================================
    const SACO = [0, 0.03, 0.05];
    const geoCoq = (() => {
      const b = Constructor();
      b.geo(esfera(10, 3), '#3f7d34', 0, elip(0.13, 0.008, 0.2, 0, 0, 0));
      b.geo(esfera(8, 6), '#b0773a', 0, elip(0.035, 0.028, 0.045, 0, 0.03, 0));
      for (const s of [-1, 1]) b.geo(esfera(5, 4), '#1b1b1b', 0, elip(0.01, 0.01, 0.01, s * 0.018, 0.052, 0.03)).geo(esfera(4, 3), '#9a6230', 0, elip(0.012, 0.008, 0.03, s * 0.035, 0.012, -0.015));
      b.geo(esfera(7, 5), '#e9dcae', 1, elip(0.022, 0.02, 0.02, SACO[0], SACO[1], SACO[2]));
      return b.fin();
    })();
    const matCoq = material(['iSaco'], `if (aMarca > 0.5) { vec3 g = vec3(${SACO.join(', ')}); transformed = g + (position - g) * iSaco; }`);
    const coqMesh = instanciada(geoCoq, matCoq, 8, 'coquies', ['iSaco']);
    const COQ = { lista: [] };
    function crearCoquies() {
      const bushes = (G.c && G.c.BUSHES) || G.pack.coquies || [];
      const ls = bushes.map(b => ({ id: b.id, x: b.x + 0.7, z: b.z + 0.3, alto: 0.55 }));
      const z = (D.zonas && D.zonas.coquiHojas) || { x: -10, z: -185, n: 5 };
      for (let i = 0; i < (z.n || 5); i++) { const a = i * 2.4, r = 6 + i * 3.5; ls.push({ id: 'hoja' + i, x: z.x + Math.cos(a) * r, z: z.z + Math.sin(a) * r, alto: 0.4 }); }
      COQ.lista = ls.slice(0, 8).map((c, i) => Object.assign(c, { rot: hash(c.x, c.z, 11) * 6.28, saco: 0.25, canta: 0, espera: 0, i }));
    }
    function climaNombre() {
      const c = G.clima; if (!c || typeof c.estado !== 'function') return null;
      try { const e = c.estado(); return typeof e === 'string' ? { nombre: e } : e || null; } catch (err) { return null; }
    }
    function coquiVisible() {
      const e = climaNombre();
      if (e) { const nom = e.nombre || e.estado || e.actual || e.objetivo; if (nom === 'neblina' || nom === 'llovizna' || e.niebla > 0.5 || e.llovizna > 0.5) return true; }
      return !!(S.missions && S.missions.m3);
    }
    const cantar = (c, primero) => { c.canta = 1.1; if (!G.quiet) { G.audio.play(primero ? 'qui' : 'co'); setTimeout(() => G.audio.play(primero ? 'co' : 'qui'), 260); } };
    function pasoCoquies(dt, libre) {
      const vis = coquiVisible(), ver = verDe() && vis, sc = coqMesh.geometry.attributes.iSaco, cam = G.renderer.camera.position;
      let n = 0;
      for (const c of COQ.lista) {
        c.y = H(c.x, c.z) + c.alto;
        const d = Math.hypot(S.pos.x - c.x, S.pos.y - c.y, S.pos.z - c.z);
        c.espera -= dt;
        if (vis && d < 3 && c.espera <= 0) { cantar(c); c.espera = 3.2; }
        if (vis && libre && F.quieta >= OBS_T && d < OBS_R) observar('coqui');
        if (c.canta > 0) c.canta = Math.max(0, c.canta - dt);
        const objetivo = c.canta > 0 ? 1.1 + Math.abs(Math.sin(c.canta * 9)) * 0.4 : 0.25;
        c.saco += (objetivo - c.saco) * Math.min(1, dt * 10);
        if (!ver || Math.hypot(c.x - cam.x, c.z - cam.z) > APAGA) continue;
        dummy.position.set(c.x, c.y, c.z); dummy.rotation.set(0, c.rot, 0); dummy.scale.setScalar(2); dummy.updateMatrix();
        coqMesh.setMatrixAt(n, dummy.matrix); sc.setX(n++, c.saco);
      }
      coqMesh.count = n; coqMesh.visible = n > 0; coqMesh.instanceMatrix.needsUpdate = true; sc.needsUpdate = true;
    }
    function coro() {
      const cerca = COQ.lista.filter(c => Math.hypot(S.pos.x - c.x, S.pos.z - c.z) < 30);
      cerca.forEach((c, i) => setTimeout(() => cantar(c, i % 2), i * 140));
      evento('CoquiChorusWild', { coquies: cerca.length });
    }

    // =====================================================================================================================
    // Boa: rama (marca 0, la única parte que es suelo), cuerpo enrollado (marca 1, respira) y cabeza (marca 2, se levanta).
    // =====================================================================================================================
    const BOA = { mesh: null, x: 0, y: 0, z: 0, cab: 0, t: -1, visto: false, rama: null, max: 0 };
    const uCab = { value: 0 };
    function crearBoa() {
      if (!conBoa) return;
      const p = lugar((D.zonas && D.zonas.boa) || 'cueva_rio');
      // a unos 10 m de la boca de la cueva, en el sitio menos empinado
      let mejor = null;
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, x = p.x + Math.cos(a) * 10, z = p.z + Math.sin(a) * 10, h = H(x, z);
        const pend = Math.abs(H(x + 1.5, z) - h) + Math.abs(H(x, z + 1.5) - h) + Math.abs(h - p.y) * 0.3;
        if (!mejor || pend < mejor.pend) mejor = { x, z, h, pend, a };
      }
      const g = mejor.h, ALTO = 3.2, LARGO = 2.6;
      BOA.x = mejor.x; BOA.z = mejor.z; BOA.y = g + ALTO + 0.12;
      const b = Constructor(), corteza = '#5a4632';
      const tronco = new THREE.CylinderGeometry(0.11, 0.16, ALTO + 0.2, 7), rama = new THREE.CylinderGeometry(0.08, 0.1, LARGO, 7);
      b.geo(tronco, corteza, 0, (x, y, z) => [x - LARGO * 0.4, y + (ALTO + 0.2) / 2 - 0.2, z]);
      b.geo(rama, corteza, 0, (x, y, z) => [-y, x + ALTO, z]); // a lo largo de X
      // cuerpo: hélice alrededor de la rama (2,6 vueltas) y la cola colgando
      const pts = [];
      for (let i = 0; i <= 40; i++) { const u = i / 40, a = u * Math.PI * 2 * 2.6; pts.push(new THREE.Vector3(-0.45 + u * 0.9, ALTO + Math.cos(a) * 0.15, Math.sin(a) * 0.15)); }
      pts.push(new THREE.Vector3(0.6, ALTO - 0.25, 0.08), new THREE.Vector3(0.62, ALTO - 0.55, 0.05));
      const curva = new THREE.CatmullRomCurve3(pts.reverse()), tubo = new THREE.TubeGeometry(curva, 120, 0.045, 7, false);
      const mancha = (v, i, g) => (Math.sin(g.attributes.uv.getX(i) * 140) > 0.35 ? '#2e261c' : '#7a6646');
      b.geo(tubo, mancha, 1);
      const cuello = pts[pts.length - 1];
      b.geo(esfera(8, 6), '#6b5a3e', 2, elip(0.05, 0.035, 0.075, cuello.x, cuello.y + 0.01, cuello.z - 0.03));
      for (const s of [-1, 1]) b.geo(esfera(4, 3), '#d9b23a', 2, elip(0.009, 0.009, 0.009, cuello.x + s * 0.035, cuello.y + 0.025, cuello.z - 0.06));
      BOA.cuello = cuello;
      const mat = material([], `if (aMarca > 0.5 && aMarca < 1.5) { transformed.yz = vec2(${ALTO.toFixed(2)}, 0.0) + (position.yz - vec2(${ALTO.toFixed(2)}, 0.0)) * (1.0 + 0.012 * sin(uT * 1.3)); }
        if (aMarca > 1.5) { vec3 c = vec3(${cuello.x.toFixed(3)}, ${cuello.y.toFixed(3)}, ${cuello.z.toFixed(3)}); vec3 q = position - c; float a = -uCab * 0.6;
          q = vec3(q.x, q.y * cos(a) - q.z * sin(a), q.y * sin(a) + q.z * cos(a)); transformed = c + q + vec3(0.0, uCab * 0.16, uCab * 0.04); }`, { uCab });
      const m = new THREE.Mesh(b.fin(), mat);
      m.position.set(mejor.x, g, mejor.z); m.rotation.y = -mejor.a; m.name = 'fauna:boa'; m.castShadow = false; m.receiveShadow = false;
      m.userData.sinSolido = true; m.visible = false; scene.add(m); BOA.mesh = m;
      // La rama y el tronco sí son suelo (para posarse): una malla aparte, fuera de la escena, solo para G.solidos
      const solida = new THREE.Group(); solida.position.copy(m.position); solida.rotation.copy(m.rotation);
      solida.add(new THREE.Mesh(tronco.translate(-LARGO * 0.4, (ALTO + 0.2) / 2 - 0.2, 0), new THREE.MeshLambertMaterial()));
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(LARGO, 0.2, 0.6), new THREE.MeshLambertMaterial()); r2.position.y = ALTO; solida.add(r2); // caja ancha: la rejilla de sólidos no pierde una rama fina
      BOA.rama = solida;
      try { if (G.solidos && G.solidos.agregar) G.solidos.agregar(solida); } catch (e) { /* sin sólidos: se mira igual */ }
      m.updateMatrixWorld(true); BOA.centro = new THREE.Vector3(0, ALTO, 0).applyMatrix4(m.matrixWorld);
    }
    function pasoBoa(dt, libre) {
      if (!BOA.mesh) return;
      const c = BOA.centro, d = Math.hypot(S.pos.x - c.x, S.pos.y - c.y, S.pos.z - c.z);
      if (BOA.t < 0 && libre && F.quieta >= OBS_T && d < 2.6 && S.pos.y > c.y - 0.8) BOA.t = 0;
      if (BOA.t >= 0) {
        BOA.t += dt;
        const sube = Math.min(1, BOA.t / 0.6), baja = BOA.t > 2.6 ? Math.min(1, (BOA.t - 2.6) / 0.8) : 0;
        BOA.cab = sube * (1 - baja);
        if (BOA.t > 0.6 && !BOA.visto) { BOA.visto = true; observar('boa'); evento('BoaMet', {}); }
        if (BOA.t > 3.4 && d > 4) { BOA.t = -1; BOA.visto = false; } // vuelve a dormir; si Vittata se va y vuelve, la mira otra vez
        if (BOA.t > 3.4) BOA.cab = 0;
      }
      uCab.value = BOA.cab; BOA.max = Math.max(BOA.max, BOA.cab);
      BOA.mesh.visible = verDe() && Math.hypot(c.x - G.renderer.camera.position.x, c.z - G.renderer.camera.position.z) < APAGA;
    }

    // =====================================================================================================================
    // Observar, álbum y viñetas
    // =====================================================================================================================
    const espDe = id => especies().find(e => e.id === id);
    function observar(id) {
      const v = vistos(); if (v.includes(id) || !espDe(id)) return false;
      v.push(id);
      G.emit('aprendizaje', { tipo: 'fauna', id });
      if (!G.quiet) {
        const e = espDe(id);
        try { G.ui.toastHTML(`<b>${esc(L(D.album && D.album.titulo || 'Fauna de El Yunque', D.album && D.album.tituloEn))}</b> · ${esc(L(e.nombre, e.nombreEn))}`, 3200); } catch (err) { /* sin HUD */ }
        try { G.guardado.autosave(); } catch (err) { /* sin guardado */ }
      }
      return true;
    }
    function evento(key, datos) {
      if (G.quiet || !G.eventos || G.eventos.had(key)) return false;
      G.eventos.log(key, datos || {});
      if (G.comic && G.comic.revisarEventos) G.comic.revisarEventos();
      return true;
    }
    const SILUETA = {
      lagartijo: '<ellipse cx="30" cy="20" rx="13" ry="6"/><ellipse cx="45" cy="18" rx="7" ry="5"/><path d="M18 20 Q8 22 2 30" stroke-width="3" fill="none"/><path d="M44 23 q4 9 -2 12" fill="#f2c428" stroke="#e8742a" stroke-width="1.5"/>',
      mariposa: '<path d="M30 20 L8 6 Q2 18 12 24 Q4 32 14 36 Z"/><path d="M30 20 L52 6 Q58 18 48 24 Q56 32 46 36 Z"/><path d="M30 10 V34" stroke-width="2"/>',
      coqui: '<ellipse cx="30" cy="24" rx="14" ry="10"/><circle cx="24" cy="15" r="4"/><circle cx="36" cy="15" r="4"/><path d="M16 30 q-6 4 -8 8 M44 30 q6 4 8 8" stroke-width="3" fill="none"/>',
      boa: '<path d="M6 30 Q14 10 24 26 T42 24 T54 14" stroke-width="7" fill="none"/><ellipse cx="55" cy="13" rx="5" ry="3.5"/>',
    };
    function htmlAlbum() {
      const v = vistos(), lista = especies(), A = D.album || {};
      const cards = lista.map(e => {
        const ok = v.includes(e.id), col = esc(e.color || '#6b5a3e');
        const svg = `<svg viewBox="0 0 60 40" width="60" height="40" aria-hidden="true" fill="${ok ? col : '#555'}" stroke="${ok ? col : '#555'}">${SILUETA[e.silueta] || ''}</svg>`;
        if (!ok) return `<li class="fauna-tarjeta fauna-falta">${svg}<span><b>???</b><small>${esc(L(A.pista || '', A.pistaEn))}</small></span></li>`;
        return `<li class="fauna-tarjeta">${svg}<span><b>${esc(L(e.nombre, e.nombreEn))}</b> <i>${esc(e.cientifico)}</i><small>${esc(L(e.texto, e.textoEn))}</small>` +
          `<small class="fauna-fuente">${esc(L('Fuente', 'Source'))}: <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.fuente)}</a></small></span></li>`;
      }).join('');
      return `<span class="lbl">${esc(L(A.titulo || 'Fauna de El Yunque', A.tituloEn))} (${lista.filter(e => v.includes(e.id)).length}/${lista.length})</span><ul class="fauna-album">${cards}</ul>`;
    }
    if (!document.getElementById('fauna-css')) {
      const st = document.createElement('style'); st.id = 'fauna-css';
      st.textContent = '.fauna-album{list-style:none;margin:.3em 0 .8em;padding:0;display:grid;gap:.45em}' +
        '.fauna-tarjeta{display:flex;gap:.6em;align-items:flex-start;padding:.45em .55em;border-radius:10px;background:rgba(255,255,255,.07)}' +
        '.fauna-tarjeta svg{flex:none}.fauna-tarjeta span{display:flex;flex-direction:column;gap:.15em;min-width:0}' +
        '.fauna-tarjeta small{opacity:.9;line-height:1.35}.fauna-tarjeta i{opacity:.8;font-size:.9em}.fauna-fuente a{color:inherit;text-decoration:underline;word-break:break-word}' +
        '.fauna-falta{opacity:.6}';
      document.head.appendChild(st);
    }
    if (G.diario && G.diario.seccion) G.diario.seccion({ id: 'fauna', html: htmlAlbum });

    // Gestos (Foto → pose): «Saludar» junto a un lagartijo → concurso de flexiones; tres fotos seguidas junto a un coquí → coro
    G.on('foto', d => {
      const g = d && d.gesto; F.gestos = F.gestos.filter(t => F.t - t < 20); F.gestos.push(F.t);
      const p = {};
      if (g === 'saludar') for (const l of LAG.lista) if (Math.hypot(S.pos.x - posLag(l, p).x, S.pos.z - p.z) < LAG_HUYE) { l.calmo = true; flexiones(l); evento('AnoleContest', {}); break; }
      if (coquiVisible() && F.gestos.length >= 3 && COQ.lista.some(c => Math.hypot(S.pos.x - c.x, S.pos.z - c.z) < 5)) { F.gestos = []; coro(); }
    });

    // ---------- Bucle ----------
    function paso(dt, busy) {
      dt = Math.min(dt, 0.1); F.t += dt; uT.value += dt;
      const quieta = M.posado ? true : !M.swimming && M.speed < 0.4 && !(M.flying && Math.abs(S.vy || 0) > 0.5);
      F.quieta = quieta && !busy ? F.quieta + dt : 0;
      const libre = !busy;
      pasoLagartijos(dt, libre); pasoMariposas(dt, libre); pasoCoquies(dt, libre); pasoBoa(dt, libre);
    }
    crearNubes(); crearCoquies(); crearBoa(); recolocarLagartijos();
    G.on('update', (dt, busy) => { if (!F.prueba) paso(dt, busy); }, 87);
    G.on('apply', () => { vistos(); recolocarLagartijos(); BOA.t = -1; BOA.visto = false; });
    G.on('calidad', () => { recolocarLagartijos(); });
    const estado = () => ({ lagartijos: LAG.lista.length, mariposas: MAR.nubes.length * (N_MAR[nivel()] || 0), coquies: COQ.lista.length, coquiVisible: coquiVisible(),
      boa: !!BOA.mesh, vistos: vistos().slice(), draw: [lagMesh, marCerca, marLejos, coqMesh, BOA.mesh].filter(m => m && m.visible).length });

    // =====================================================================================================================
    // Prueba (AV.faunaTest)
    // =====================================================================================================================
    async function test() {
      const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
      const cuadros = n => new Promise(r => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const g0 = { pos: Object.assign({}, S.pos), vy: S.vy, fauna: vistos().slice(), m3: S.missions && S.missions.m3, posado: M.posado, speed: M.speed, flying: M.flying,
        nivel: nivel(), clima: null };
      const simular = (seg, antes) => { for (let t = 0; t < seg - 1e-6; t += 0.1) { if (antes) antes(); paso(0.1, false); } };
      const quietaEn = (x, y, z) => { S.pos.x = x; S.pos.y = y; S.pos.z = z; S.vy = 0; M.speed = 0; M.flying = false; M.posado = ''; };
      const aprend = []; oyenteTest = d => { if (d && d.tipo === 'fauna') aprend.push(d.id); };
      F.prueba = true;
      try {
        S.fauna = [];
        // 1. Lagartijos: cantidad por calidad, en los 2 m bajos y pegados a un tronco
        const nv = nivel(); recolocarLagartijos();
        const arb = arbolesCerca(S.pos.x, S.pos.z, RADIO_ARB);
        const p = {}, enTronco = LAG.lista.every(l => { posLag(l, p); return p.y - H(p.x, p.z) <= 2.2 && arb.some(t => Math.abs(Math.hypot(p.x - t.x, p.z - t.z) - t.r) <= 0.5); });
        ok('Lagartijos según la calidad (bajo 6, medio 12, alto 20; o los troncos que haya cerca)', N_LAG.bajo === 6 && N_LAG.medio === 12 && N_LAG.alto === 20 &&
          LAG.lista.length === Math.min(N_LAG[nv], arb.length) && LAG.lista.length > 0, LAG.lista.length + ' en ' + arb.length + ' troncos (' + nv + ')');
        ok('Todos a 2,2 m o menos del suelo y a 0,5 m o menos de un tronco', enTronco);
        // 2. Observar: a 2 m, quieta, 2,2 s → observado y una sola vez aprendizaje
        const l0 = LAG.lista[0]; posLag(l0, p);
        const dir = Math.atan2(p.z - l0.t.z, p.x - l0.t.x), ox = l0.t.x + Math.cos(dir) * (l0.t.r + 1.4), oz = l0.t.z + Math.sin(dir) * (l0.t.r + 1.4);
        quietaEn(ox, H(ox, oz), oz); F.quieta = 0; aprend.length = 0;
        const angEscondido = (simular(0.3), Math.abs(((l0.ang - Math.atan2(oz - l0.t.z, ox - l0.t.x)) % 6.283 + 9.425) % 6.283 - 3.142));
        simular(1.9);
        ok('Al acercarse, el lagartijo se esconde al otro lado del tronco', angEscondido > 1.2, angEscondido.toFixed(2) + ' rad');
        simular(0.1);
        ok('Quieta a 2 m durante 2,2 s: observado (S.fauna) y un solo «aprendizaje» tipo fauna', vistos().includes('lagartijo') && aprend.filter(i => i === 'lagartijo').length === 1, aprend.join(','));
        ok('Al observarlo vuelve a asomar y hace flexiones para ella', l0.calmo && (l0.flex > 0 || l0.ab > 0));
        simular(2);
        ok('Quedarse más tiempo no lo cuenta otra vez', aprend.filter(i => i === 'lagartijo').length === 1);
        // 3. Mariposas: volar por la nube → se dispersan y vuelven en menos de 3 s
        const nb = MAR.nubes[0], varz = () => { const n = N_MAR[nivel()]; let s = 0; for (let i = 0; i < n; i++) s += (nb.aves[i].x - nb.x) ** 2 + (nb.aves[i].z - nb.z) ** 2; return s / n; };
        quietaEn(nb.x + 200, H(nb.x + 200, nb.z), nb.z); nb.disp = 0; nb.dispT = 0; nb.pico = null; simular(0.5); const v0 = varz();
        const volar = () => { S.pos.x = nb.x; S.pos.z = nb.z; S.pos.y = H(nb.x, nb.z) + 2; M.flying = true; M.speed = 8; };
        simular(0.6, volar); const v1 = varz();
        ok('Al pasar volando por una nube, las mariposas se dispersan (varianza ×2 o más)', v1 >= v0 * 2, v0.toFixed(1) + ' → ' + v1.toFixed(1));
        quietaEn(nb.x + 200, H(nb.x + 200, nb.z), nb.z); let tR = 0; while (tR < 5 && !(varz() < Math.max(v0 * 1.3, v1 * 0.5) && nb.disp < 0.1)) { simular(0.1); tR += 0.1; } // v0 es una foto del ocho: vale también con la dispersión a la mitad
        ok('Y vuelven en menos de 3 s', tR < 3, tR.toFixed(1) + ' s');
        // Una se posa en el pico
        aprend.length = 0; quietaEn(nb.x + 1.5, H(nb.x + 1.5, nb.z), nb.z); F.quieta = 0; simular(3.8);
        const ave = nb.aves[0]; picoMundo(_v);
        ok('Quieta junto a las flores, una mariposa se le posa en el pico (observada)', vistos().includes('mariposa') && nb.pico && nb.pico.llego && Math.hypot(ave.x - _v.x, ave.y - _v.y - 0.06, ave.z - _v.z) < 0.15);
        nb.pico = null;
        // 4. Coquíes: ocultos con sol, visibles con neblina (o con M3 si no hay clima)
        const C = G.clima && typeof G.clima.fijar === 'function' ? G.clima : null;
        if (C) {
          C.fijar('sol'); const oculto = !coquiVisible(); C.fijar('neblina'); const visto = coquiVisible(); C.fijar(null);
          ok('Coquíes: ocultos con sol y visibles con neblina (G.clima)', oculto && visto);
        } else {
          S.missions = S.missions || {}; S.missions.m3 = false; const oculto = !coquiVisible(); S.missions.m3 = true; const visto = coquiVisible();
          ok('Coquíes: sin clima cargado, ocultos hasta terminar M3 y visibles después', oculto && visto);
        }
        S.missions = S.missions || {}; S.missions.m3 = true;
        const c0 = COQ.lista[0]; quietaEn(c0.x + 1.5, H(c0.x + 1.5, c0.z), c0.z); F.quieta = 0; c0.espera = 0; simular(0.3);
        ok('A menos de 3 m infla el saco vocal y canta', c0.saco > 0.9, c0.saco.toFixed(2));
        simular(2); ok('Quieta junto a un coquí visible: observado', vistos().includes('coqui'));
        S.missions.m3 = g0.m3;
        // 5. Boa: posada en su rama → levanta la cabeza unos 2 s, nunca se desplaza, observada
        if (conBoa) {
          const pos0 = BOA.mesh.position.clone(), c = BOA.centro;
          quietaEn(c.x + 0.6, c.y + 0.12, c.z); M.posado = 'fino'; F.quieta = 0; BOA.t = -1; BOA.visto = false; BOA.max = 0;
          let arriba = 0; for (let t = 0; t < 6; t += 0.1) { paso(0.1, false); M.posado = 'fino'; if (BOA.cab > 0.95) arriba += 0.1; }
          ok('Boa: posada en su rama, levanta la cabeza unos 2 s y vuelve a dormir', BOA.max > 0.95 && arriba >= 1.6 && arriba <= 2.6 && BOA.cab < 0.05, arriba.toFixed(1) + ' s arriba');
          ok('La boa nunca se desplaza y queda observada', BOA.mesh.position.distanceTo(pos0) < 1e-6 && vistos().includes('boa'));
          ok('Hay dónde posarse junto a la boa (su rama o la copa del árbol, G.solidos; la rejilla funde la rama con la copa)', !G.solidos || !G.solidos.altoEn || G.solidos.altoEn(c.x, c.z, c.y + 3) > c.y - 0.5, G.solidos && G.solidos.altoEn ? (G.solidos.altoEn(c.x, c.z, c.y + 3) - c.y).toFixed(2) : 'sin sólidos');
        }
        // 6. Calidad: bajo reduce los count; draw calls de fauna ≤ 5
        G.renderer.setCalidad('bajo'); await cuadros(2); recolocarLagartijos(); paso(0.05, false);
        ok('Con calidad baja: 6 lagartijos como mucho y 4 mariposas por nube', LAG.lista.length <= 6 && estado().mariposas === MAR.nubes.length * 4, LAG.lista.length + ' lagartijos');
        G.renderer.setCalidad(g0.nivel); await cuadros(2); recolocarLagartijos();
        S.missions.m3 = true;
        const mallas = [lagMesh, marCerca, marLejos, coqMesh, BOA.mesh].filter(Boolean);
        quietaEn(MAR.nubes[0].x + 3, H(MAR.nubes[0].x + 3, MAR.nubes[0].z), MAR.nubes[0].z); paso(0.05, false);
        let dif = Infinity, nota = '';
        await cuadros(20); // la flora y las partículas se asientan tras el cambio de calidad
        for (let i = 0; i < 3; i++) { // en los dos órdenes: lo que cambie en la escena entre medidas (flora, partículas, bandada) no cuenta
          for (const m of mallas) m.material.visible = true; await cuadros(2); const con = G.renderer.stats().calls;
          for (const m of mallas) m.material.visible = false; await cuadros(2); const base = G.renderer.stats().calls;
          await cuadros(2); const base2 = G.renderer.stats().calls;
          for (const m of mallas) m.material.visible = true; await cuadros(2); const con2 = G.renderer.stats().calls;
          for (const [c, b] of [[con, base], [con2, base2]]) if (c - b < dif) { dif = c - b; nota = b + ' → ' + c; }
        }
        for (const m of mallas) m.material.visible = true;
        ok('La fauna suma 5 draw calls o menos', dif <= 5 && mallas.length <= 5, nota);
        // 7. Álbum: 4 tarjetas con «Fuente» y enlace
        S.fauna = especies().map(e => e.id);
        const div = document.createElement('div'); div.innerHTML = htmlAlbum();
        const tarjetas = Array.from(div.querySelectorAll('.fauna-tarjeta'));
        ok('El álbum muestra 4 tarjetas con «Fuente» y enlace', tarjetas.length === especies().length && especies().length === (conBoa ? 4 : 3) &&
          tarjetas.every(t => /Fuente|Source/.test(t.textContent) && t.querySelector('a[href^="https://"]')), tarjetas.length + ' tarjetas');
        ok('Cada especie lleva texto, nombre científico, fuente y URL', especies().every(e => e.texto && e.cientifico && e.fuente && /^https:\/\//.test(e.url)));
        S.fauna = [];
        div.innerHTML = htmlAlbum();
        ok('Sin observar, las tarjetas no muestran el texto (solo la pista)', div.querySelectorAll('.fauna-falta').length === especies().length && !div.querySelector('a'));
        ok('El álbum está en el Diario como sección propia', !!(G.diario && G.diario.seccion));
        ok('En las baterías (G.quiet) no se ve ningún animal', (() => { const q = G.quiet; G.quiet = true; F.prueba = false; paso(0.05, false); const n = [lagMesh, marCerca, marLejos, coqMesh].every(m => !m.visible) && !(BOA.mesh && BOA.mesh.visible); F.prueba = true; G.quiet = q; return n; })());
      } finally {
        oyenteTest = null;
        F.prueba = false; Object.assign(S.pos, g0.pos); S.vy = g0.vy; S.fauna = g0.fauna; if (S.missions) S.missions.m3 = g0.m3;
        M.posado = g0.posado; M.speed = g0.speed; M.flying = g0.flying; F.quieta = 0; BOA.t = -1; BOA.visto = false;
        for (const nb of MAR.nubes) { nb.pico = null; nb.disp = 0; nb.dispT = 0; }
        recolocarLagartijos();
      }
      return { passed: results.filter(r => r.ok).length, total: results.length, results };
    }

    return { estado, observar, paso, test, F, LAG, MAR, COQ, BOA, get meshes() { return [lagMesh, marCerca, marLejos, coqMesh, BOA.mesh].filter(Boolean); } };
  }
})();
