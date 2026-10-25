/* AVE · streaming de edificios por zona (rol Streaming de mundo; docs/ARQUITECTURA.md § Streaming de edificios)
   Los edificios de Kelvin se cargan por zonas según la distancia de Vittata y se liberan al alejarse; se dibujan con
   InstancedMesh por modelo con LOD cerca/lejos por instancia. mundo.js lo arranca (iniciar) y pone las colisiones.

   Niveles de una zona (distancia del jugador al borde de la zona, d; R = radios del preset de calidad):
   - cerca (d < R.cerca, ~120 m): modelo completo (texturas, sombras) y colisiones. La primera vez que una instancia llega
     aquí se le ponen sus colisiones (las de mundo.js y G.solidos.agregar) y ya no se quitan: siguen activas aunque la zona
     se libere (son pocas y pesan poco).
   - lejos (d < alcance = min(distancia de dibujo del preset, alcance de la niebla)): solo el LOD lejano.
   - fuera: nada en memoria.
   Histéresis: una zona baja de nivel con H m de más (40) y los modelos se sueltan tras 3 s sin uso (no hay vaivén en el borde).
   Por instancia, cerca/lejos se elige por la distancia a la cámara (CFG.lod ± CFG.lodH) y cada cuadro se descarta lo que
   queda fuera del frustum o de la distancia de dibujo (las de cerca a menos del radio de sombra se dibujan igual: su sombra
   puede caer en pantalla). Draw calls = pares modelo × material con alguna instancia visible, más una malla fundida por zona
   ('edificiosZona:<zona>:lejos', todos sus lejanos juntos) para las zonas que se ven enteras más allá de la distancia de LOD.
   Carga: antes de mundoListo entra el modelo completo de lo que el jugador tiene encima (CFG.precarga) y el LOD lejano de
   lo visible a menos de CFG.lejosQuieto; el resto espera a que el jugador se mueva (CFG.moverse) y llegan en segundo plano,
   más cerca primero, con una descarga a la vez y el trabajo de CPU troceado (requestIdleCallback, CFG.msCuadro por tanda). Liberar = quitar las mallas, geometry.dispose() y soltar materiales y texturas (conteo de
   referencias por nombre de material: el kit comparte su paleta). La cadena base64 la suelta AVE.assets.loadGLB al decodificar.
   El buffer de instancias de cada modelo×LOD se reutiliza (three r128 no lo libera al quitar la malla).

   Recursos del kit (assets/models/edificios/, mundo.edificios.base y .b64 del pack):
   - <modelo>.glb | <modelo>_glb.js (AV_EDIFICIOS_B64[modelo]): el de cerca. Materiales con nombre: mismo nombre = misma textura.
   - <modelo>_lejos.glb | _lejos_glb.js (AV_EDIFICIOS_B64[modelo + '_lejos']): el lejano, un material AV_Lejos con color de
     vértice, mismo pivote y escala. Solo se pide si el manifiesto lo declara; si no, se genera en tiempo de ejecución
     simplificando el de cerca (agrupado de vértices) con el color medio de cada textura.
   - Manifiesto opcional window.AV_EDIFICIOS_KIT = { <modelo>: { lejos: bool, radio, alto, tris, kb, kbLejos } } (se carga
     de mundo.edificios.kit si el pack lo pone). Con manifiesto, un modelo que no figura se salta con un aviso (sin pedir nada).

   Formato de datos en el mapa (compatible con el anterior; lo genera el level designer):
   - mapa.edificiosKelvin: [ entrada ] y mapa.escenaKelvin.compacto: [ entrada compacta ] (se leen las dos listas).
     · plana:    { id, glb | modelo, pos: [x, y, z], rotY, grupo, rol?, escala?, orientar?, yExacta?, escalaPack?, dim? }
     · compacta: { grupo, modelo, inst: [ [x, y, z, rotY, escala?] | [16 números: Matrix4 column-major], ... ], orientar?,
                   yExacta?, escalaPack? }  → ids "<modelo>@<grupo>#<i>". Sin modelo (modelo: null) se ignora.
     grupo = zona de carga (sin grupo, la zona es el propio id). escala multiplica la del pack (mundo.edificios.escala) salvo
     escalaPack: false. orientar: false respeta rotY (por defecto mundo.js gira el frente hacia el sendero más cercano).
     yExacta: true usa pos[1] tal cual (si no, min(pos[1], suelo), o el suelo si falta). Con matriz, la posición, el giro y la
     escala son los de la matriz (y exacta; la escala del pack se aplica después solo si escalaPack no es false).
   - mapa.zonasEdificios (opcional): { <grupo>: { centro: [x, z], radio, orientar?, yExacta?, escalaPack? } }: centro y radio de
     la zona (si faltan, salen de sus instancias) y valores por defecto de sus entradas (la entrada manda).

   API (G.streaming): iniciar(cfg) → gestor { arrancar(), listo, zonas, instancias, revisar(x, z), alrededor(x, z),
   cargarTodo(), soltarTodo(), liberarYa(), terminar(), stats() }; modelo(n) → Promise<{ partes, radio, alto }> fijo (piezas del
   contenido: no se libera nunca); material(src, fijo); test(opts) (AV.streamingTest). */
AVE.module('streaming', function (G) {
  'use strict';
  const R = G.renderer, scene = R.scene;
  const CFG = {
    cerca: { bajo: 50, medio: 60, alto: 75 },      // m al borde de la zona: modelo completo y colisiones (≥ distancia de LOD)
    precarga: { bajo: 20, medio: 25, alto: 30 },   // m: zonas cuyo modelo completo entra antes de mundoListo (lo demás visible, con su lejano)
    lejosQuieto: { bajo: 120, medio: 150, alto: 150 }, // m: hasta que el jugador se mueve, solo baja el lejano de las zonas a menos de esto
    dibujo: { bajo: 150, medio: 190, alto: 320 },  // m: distancia de dibujo de los edificios (la de antes en mundo.js)
    histeresis: 30,                                // m de más para bajar de nivel
    moverse: 2,                                    // m que anda el jugador antes de pedir modelos completos fuera de la precarga
    lod: { bajo: 35, medio: 50, alto: 60 },        // m del centro de la instancia a la cámara: cerca → lejos
    lodH: 8,                                       // histéresis del LOD (m)
    gracia: 3,                                     // s sin uso antes de soltar un modelo
    msCuadro: 4, msArranque: 24,                   // presupuesto de CPU por tanda (en juego / antes de mundoListo)
    descargas: 1, descargasArranque: 3,            // descargas a la vez
    revisar: 0.3,                                  // s entre revisiones de niveles
    margenSombra: 4,
  };
  const nivelCal = () => (R.calidad && R.calidad.nivel) || 'medio';
  function alcanceNiebla() {
    const f = scene.fog; if (!f) return Infinity;
    return f.near < 0 ? -f.near + f.far * 3.5 : f.far; // atmosférica (near negativo): por debajo de ~3 % de visibilidad
  }
  const alcance = () => Math.min(CFG.dibujo[nivelCal()] || 190, alcanceNiebla());
  const radioCerca = () => Math.min(CFG.cerca[nivelCal()] || 110, alcance());

  // ---------- Trabajo troceado ----------
  const trabajos = [];
  let programado = false, arrancando = true, quieto = true; // quieto: el jugador no se ha movido desde el inicio
  const ric = window.requestIdleCallback ? (fn => window.requestIdleCallback(fn, { timeout: 60 })) : (fn => setTimeout(fn, 16));
  function programar() { if (!programado && trabajos.length) { programado = true; ric(bombear); } }
  function bombear(dl) {
    programado = false;
    const libre = dl && dl.timeRemaining ? dl.timeRemaining() : CFG.msCuadro;
    const presupuesto = arrancando ? CFG.msArranque : Math.max(2, Math.min(CFG.msCuadro, libre));
    const t0 = performance.now();
    while (trabajos.length && (performance.now() - t0 < presupuesto || performance.now() === t0)) {
      const j = trabajos.shift(); try { j(); } catch (e) { console.warn('AVE streaming:', e && e.message || e); }
    }
    programar();
  }
  function encolar(fn) { trabajos.push(fn); programar(); }
  function drenar() { while (trabajos.length) { const j = trabajos.shift(); try { j(); } catch (e) { console.warn('AVE streaming:', e && e.message || e); } } }

  // ---------- Materiales compartidos por nombre, con conteo de referencias ----------
  const mats = {}; // nombre → { mat, refs, fijo }
  function crearMaterial(src, k) {
    const m = new THREE.MeshPhongMaterial({ map: src.map || null, color: src.map ? 0xffffff : src.color, side: src.side, shininess: 8,
      specular: new THREE.Color(0x101010), alphaTest: src.alphaTest || 0, transparent: false, vertexColors: !!src.vertexColors });
    if (!src.map && src.color) m.color.copy(src.color);
    m.name = k;
    return m;
  }
  function material(src, fijo) {
    const k = src.name || src.uuid;
    let it = mats[k];
    if (!it) it = mats[k] = { mat: crearMaterial(src, k), refs: 0, fijo: false };
    it.refs++; if (fijo) it.fijo = true;
    return it.mat;
  }
  function soltarMaterial(m) {
    const it = mats[m.name]; if (!it || it.mat !== m) return;
    if (--it.refs > 0 || it.fijo) return;
    delete mats[m.name];
    if (m.map) m.map.dispose();
    m.dispose();
  }
  // Texturas del parseo que no se adoptaron (otro modelo ya trajo esa textura con el mismo nombre de material)
  function soltarSobrantes(root, usados) {
    const vistas = new Set();
    root.traverse(o => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
          const t = m[k]; if (!t || vistas.has(t) || usados.has(t)) continue;
          vistas.add(t); t.dispose(); if (t.image && typeof t.image.close === 'function') t.image.close();
        }
        if (!usados.has(m)) m.dispose();
      }
    });
  }
  const matLejos = new THREE.MeshLambertMaterial({ vertexColors: true, name: 'AV_Lejos' });

  // ---------- Geometría: fundir partes, simplificar para el LOD lejano ----------
  // Factor de un atributo entero normalizado (COLOR_0 Uint16 del _lejos, cuantización): en r128 getX no desnormaliza (QA-25)
  const kNorm = a => !a || !a.normalized ? 1 : a.array instanceof Uint8Array ? 1 / 255 : a.array instanceof Uint16Array ? 1 / 65535
    : a.array instanceof Int8Array ? 1 / 127 : a.array instanceof Int16Array ? 1 / 32767 : 1;
  function fundir(geos, conColor) {
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const conUv = !conColor && geos.every(g => g.attributes.uv);
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = conUv ? new Float32Array(nv * 2) : null, col = conColor ? new Float32Array(nv * 3) : null;
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const g of geos) {
      const a = g.attributes, n = a.position.count, kp = kNorm(a.position), kn = kNorm(a.normal), ku = kNorm(a.uv), kc = kNorm(a.color);
      for (let i = 0; i < n; i++) {
        pos[(vo + i) * 3] = a.position.getX(i) * kp; pos[(vo + i) * 3 + 1] = a.position.getY(i) * kp; pos[(vo + i) * 3 + 2] = a.position.getZ(i) * kp;
        if (a.normal) { nor[(vo + i) * 3] = a.normal.getX(i) * kn; nor[(vo + i) * 3 + 1] = a.normal.getY(i) * kn; nor[(vo + i) * 3 + 2] = a.normal.getZ(i) * kn; }
        if (uv) { uv[(vo + i) * 2] = a.uv.getX(i) * ku; uv[(vo + i) * 2 + 1] = a.uv.getY(i) * ku; }
        if (col) { const c = a.color; col[(vo + i) * 3] = c ? c.getX(i) * kc : 1; col[(vo + i) * 3 + 1] = c ? c.getY(i) * kc : 1; col[(vo + i) * 3 + 2] = c ? c.getZ(i) * kc : 1; }
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo;
      else for (let i = 0; i < n; i++) idx[io + i] = i + vo;
      io += g.index ? g.index.count : n; vo += n;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere(); out.computeBoundingBox();
    return out;
  }
  // Color medio (lineal) de la textura de un material, para el LOD lejano generado
  const lienzo = document.createElement('canvas'); lienzo.width = lienzo.height = 8;
  function colorMedio(m) {
    const c = m.color ? m.color.clone() : new THREE.Color(1, 1, 1), img = m.map && m.map.image;
    if (!img || !(img.width > 0)) return c;
    try {
      const x = lienzo.getContext('2d'); x.clearRect(0, 0, 8, 8); x.drawImage(img, 0, 0, 8, 8);
      const d = x.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0;
      const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      for (let i = 0; i < d.length; i += 4) { r += lin(d[i]); g += lin(d[i + 1]); b += lin(d[i + 2]); }
      const n = d.length / 4; c.multiply(new THREE.Color(r / n, g / n, b / n));
    } catch (e) { /* lienzo no disponible: color del material */ }
    return c;
  }
  // Agrupado de vértices en una rejilla de lado `celda`: triángulos planos (sin índice), normales de cara y color fijo
  function agrupar(g, celda, color) {
    const p = g.attributes.position, n = p.count, I = g.index, nt = I ? I.count / 3 : n / 3;
    const id = new Int32Array(n), mapa = new Map(), suma = [];
    for (let i = 0; i < n; i++) {
      const k = Math.floor(p.getX(i) / celda) * 1e8 + Math.floor(p.getY(i) / celda) * 1e4 + Math.floor(p.getZ(i) / celda);
      let c = mapa.get(k); if (c === undefined) { c = suma.length / 4; mapa.set(k, c); suma.push(0, 0, 0, 0); }
      id[i] = c; suma[c * 4] += p.getX(i); suma[c * 4 + 1] += p.getY(i); suma[c * 4 + 2] += p.getZ(i); suma[c * 4 + 3]++;
    }
    const tris = [];
    const vistos = new Set();
    for (let t = 0; t < nt; t++) {
      const a = id[I ? I.getX(t * 3) : t * 3], b = id[I ? I.getX(t * 3 + 1) : t * 3 + 1], c = id[I ? I.getX(t * 3 + 2) : t * 3 + 2];
      if (a === b || b === c || a === c) continue;
      const lo = Math.min(a, b, c), hi = Math.max(a, b, c), k = lo * 4e10 + (a + b + c - lo - hi) * 2e5 + hi;
      if (vistos.has(k)) continue; vistos.add(k); tris.push(a, b, c);
    }
    const pos = new Float32Array(tris.length * 3), col = new Float32Array(tris.length * 3);
    for (let i = 0; i < tris.length; i++) {
      const c = tris[i], s = suma[c * 4 + 3];
      pos[i * 3] = suma[c * 4] / s; pos[i * 3 + 1] = suma[c * 4 + 1] / s; pos[i * 3 + 2] = suma[c * 4 + 2] / s;
      col[i * 3] = color.r; col[i * 3 + 1] = color.g; col[i * 3 + 2] = color.b;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.computeVertexNormals();
    return out;
  }
  // LOD lejano generado: ≤ ~20 % de los triángulos (150 a 900), una sola geometría con color de vértice
  function generarLejos(partes) {
    let tris = 0; const caja = new THREE.Box3();
    for (const p of partes) { tris += (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3; caja.union(p.geo.boundingBox); }
    const meta = Math.max(150, Math.min(900, tris * 0.2)), diag = caja.getSize(new THREE.Vector3()).length();
    const colores = partes.map(p => colorMedio(p.mat));
    let celda = diag / 28, geos = null;
    for (let intento = 0; intento < 7; intento++) {
      geos = partes.map((p, i) => agrupar(p.geo, celda, colores[i]));
      const n = geos.reduce((s, g) => s + g.attributes.position.count / 3, 0);
      if (n <= meta) break;
      for (const g of geos) g.dispose();
      celda *= 1.35;
    }
    const out = fundir(geos, true);
    for (const g of geos) g.dispose();
    return out;
  }
  const esIdentidad = m => m.elements.every((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) < 1e-9);

  // ---------- Gestor de una lista de edificios (uno por G: lo crea mundo.js) ----------
  let ST = null;
  function iniciar(cfg) {
    const T = G.terreno, MAPA = cfg.mapa, ED = cfg.ED, B64 = ED.b64 || 'AV_EDIFICIOS_B64', base = ED.base;
    const KIT = () => window[ED.kitGlobal || 'AV_EDIFICIOS_KIT'] || null;
    const nombreDe = url => String(url).split('/').pop().replace(/\.glb$/, '');
    const ZM = MAPA.zonasEdificios || {};

    // --- entradas → instancias (sin altura todavía: se calcula con el terreno listo) ---
    const crudas = [], omitidos = new Set();
    const elegir = (k, e, zm, def) => e[k] != null ? e[k] : zm[k] != null ? zm[k] : def;
    function leer(e) {
      const n = e.modelo || (e.glb ? nombreDe(e.glb) : null); if (!n) return;
      const zona = e.grupo || e.id, zm = ZM[zona] || {};
      const op = { orientar: elegir('orientar', e, zm, true), yExacta: elegir('yExacta', e, zm, false), escalaPack: elegir('escalaPack', e, zm, true) };
      if (Array.isArray(e.inst)) {
        e.inst.forEach((v, i) => {
          if (v.length >= 16) crudas.push({ id: n + '@' + zona + '#' + i, n, zona, e, mat: v.slice(0, 16), op, escala: 1 });
          else crudas.push({ id: n + '@' + zona + '#' + i, n, zona, e, pos: [v[0], v[1], v[2]], rotY: v[3] || 0, escala: v[4] || 1, op });
        });
      } else if (e.pos) crudas.push({ id: e.id || n + '@' + zona + '#' + crudas.length, n, zona, e, pos: e.pos, rotY: e.rotY || 0, escala: e.escala || 1, op });
    }
    for (const e of MAPA.edificiosKelvin || []) leer(e);
    for (const e of (MAPA.escenaKelvin && MAPA.escenaKelvin.compacto) || []) leer(e);

    const inst = [], zonas = {}, porModelo = {};
    const recursos = {}; // modelo → { cerca: Res, lejos: Res }
    const res = (n, tipo) => { const r = recursos[n] || (recursos[n] = {}); return r[tipo] || (r[tipo] = { n, tipo, refs: 0, estado: 'nada', promesa: null, partes: null, geo: null, mallas: [], soltarEn: 0, fijo: false }); };
    const analisis = {}; // modelo|escala → resultado de cfg.analizar
    const vecA = new THREE.Vector3(), quatA = new THREE.Quaternion(), escA = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

    function construir() {
      const kit = KIT();
      for (const c of crudas) {
        if (kit && !kit[c.n]) { omitidos.add(c.n); continue; }
        const I = { id: c.id, modelo: c.n, zona: c.zona, e: c.e, m: new THREE.Matrix4(), pos: null, rotY: 0, escala: 1, erguido: true,
          cx: 0, cy: 0, cz: 0, r: 10, lod: 1, colocado: false, i: inst.length };
        const pack = c.op.escalaPack !== false ? cfg.escalaDe(c.n) : 1;
        if (c.mat) {
          I.m.fromArray(c.mat);
          if (pack !== 1) I.m.multiply(new THREE.Matrix4().makeScale(pack, pack, pack));
          I.m.decompose(vecA, quatA, escA);
          I.pos = [vecA.x, vecA.y, vecA.z]; I.escala = (escA.x + escA.y + escA.z) / 3;
          const ey = new THREE.Vector3(0, 1, 0).applyQuaternion(quatA); I.erguido = ey.y > 0.95;
          const e = I.m.elements; I.rotY = Math.atan2(e[8], e[10]);
        } else {
          const x = c.pos[0], z = c.pos[2], suelo = T.height(x, z);
          const y = c.op.yExacta && c.pos[1] != null ? c.pos[1] : c.pos[1] != null ? Math.min(c.pos[1], suelo) : suelo;
          let rot = c.rotY;
          if (c.op.orientar !== false && cfg.orientar) { const a = cfg.orientar(Object.assign({}, c.e, { id: c.id, pos: [x, y, z] }), c.n); if (a != null) rot = a; }
          I.escala = pack * c.escala; I.rotY = rot; I.pos = [x, y, z];
          I.m.compose(vecA.set(x, y, z), quatA.setFromAxisAngle(up, rot), escA.set(I.escala, I.escala, I.escala));
        }
        const k = kit && kit[c.n], rad = k && k.radio ? k.radio : c.e.dim ? Math.hypot(c.e.dim[0], c.e.dim[1], c.e.dim[2]) / 2 : 10;
        I.r = rad * I.escala; I.cx = I.pos[0]; I.cy = I.pos[1] + I.r * 0.4; I.cz = I.pos[2];
        inst.push(I);
        (porModelo[c.n] || (porModelo[c.n] = [])).push(I);
        const Z = zonas[c.zona] || (zonas[c.zona] = { id: c.zona, inst: [], modelos: new Set(), cx: 0, cz: 0, r: 0, nivel: 0, forzada: false, d: Infinity });
        Z.inst.push(I); Z.modelos.add(c.n);
      }
      for (const id in zonas) {
        const Z = zonas[id], zm = ZM[id] || {};
        if (zm.centro) { Z.cx = zm.centro[0]; Z.cz = zm.centro[zm.centro.length > 2 ? 2 : 1]; }
        else { for (const I of Z.inst) { Z.cx += I.pos[0] / Z.inst.length; Z.cz += I.pos[2] / Z.inst.length; } }
        let r = 0; for (const I of Z.inst) r = Math.max(r, Math.hypot(I.pos[0] - Z.cx, I.pos[2] - Z.cz) + I.r);
        Z.r = Math.max(zm.radio || 0, r);
      }
      for (const n in recursos) for (const t in recursos[n]) if (recursos[n][t].estado === 'listo') crearLote(recursos[n][t]); // fijos ya cargados
      if (omitidos.size) console.warn('AVE streaming: modelos aún no están en el kit (se omiten):', [...omitidos].join(', '));
    }

    // --- lotes de dibujo: InstancedMesh por modelo × LOD × material, buffer de instancias compartido y reutilizado ---
    const buffers = {}; // modelo:tipo → InstancedBufferAttribute (persisten: r128 no libera el de una malla quitada)
    const lotes = {};   // modelo:tipo → { n, tipo, attr, mallas, lista, prev, cap }
    function crearLote(r) {
      const cap = (porModelo[r.n] || []).length, k = r.n + ':' + r.tipo;
      if (!cap || lotes[k]) return; // pieza solo del contenido (taller) o ya creado
      let attr = buffers[k];
      if (!attr || attr.count < cap) { attr = buffers[k] = new THREE.InstancedBufferAttribute(new Float32Array(cap * 16), 16); attr.setUsage(THREE.DynamicDrawUsage); }
      const partes = r.tipo === 'cerca' ? r.partes : [{ geo: r.geo, mat: matLejos }];
      const L = lotes[k] = { n: r.n, tipo: r.tipo, attr, mallas: [], lista: [], prev: [], sombra: false };
      for (const p of partes) {
        const m = new THREE.InstancedMesh(p.geo, p.mat, cap);
        m.instanceMatrix = attr; m.count = 0; m.visible = false; m.frustumCulled = false; m.matrixAutoUpdate = false;
        m.castShadow = m.receiveShadow = r.tipo === 'cerca';
        m.name = 'edificiosInst:' + r.n + ':' + r.tipo + ':' + p.mat.name; m.userData.sinSolido = true;
        scene.add(m); L.mallas.push(m);
      }
      r.mallas = L.mallas;
    }
    function quitarLote(r) {
      const k = r.n + ':' + r.tipo, L = lotes[k]; if (!L) return;
      for (const m of L.mallas) scene.remove(m);
      delete lotes[k]; r.mallas = [];
    }

    // --- carga y liberación de recursos (conteo de referencias por zonas) ---
    const cola = []; let enVuelo = 0;
    const cargarGLB = clave => G.assets.loadGLB(base + clave + '.glb', { b64: () => (window[B64] || {})[clave], script: base + clave + '_glb.js', base, error: 'edificio no disponible: ' + clave });
    const tieneLejos = n => { const k = KIT(); return !!(k && k[n] && k[n].lejos); };
    function pedir(r, prio) {
      r.refs++; r.soltarEn = 0;
      if (r.estado === 'nada') {
        r.estado = 'cola'; r.prio = prio;
        r.promesa = new Promise((ok, mal) => { r.ok = ok; r.mal = mal; });
        r.promesa.catch(() => {});
        if (r.tipo === 'lejos' && !tieneLejos(r.n)) generarDesdeCerca(r, prio);
        else { cola.push(r); siguiente(); }
      } else if (r.estado === 'cola') r.prio = Math.min(r.prio, prio);
      return r.promesa;
    }
    function soltar(r) {
      if (--r.refs > 0 || r.fijo) return;
      r.refs = 0; r.soltarEn = performance.now() + CFG.gracia * 1000;
    }
    function siguiente() {
      const max = arrancando ? CFG.descargasArranque : CFG.descargas, pre = CFG.precarga[nivelCal()] || 50;
      while (enVuelo < max && cola.length) {
        cola.sort((a, b) => a.prio - b.prio);
        // antes de mundoListo solo baja lo de precarga y los lejanos del kit (pesan poco); el resto espera
        // hasta que el jugador se mueve, igual: lejanos para todo y el modelo completo solo de lo que tiene encima
        const lq = CFG.lejosQuieto[nivelCal()] || 150;
        const i = arrancando || quieto ? cola.findIndex(q => (q.tipo === 'lejos' && q.prio < lq) || q.prio < pre) : 0;
        if (i < 0) break;
        const r = cola.splice(i, 1)[0];
        if (r.estado !== 'cola') continue;
        if (!r.refs && !r.fijo) { r.estado = 'nada'; continue; }
        r.estado = 'bajando'; enVuelo++;
        cargarGLB(r.tipo === 'lejos' ? r.n + '_lejos' : r.n)
          .then(gltf => encolar(() => procesar(r, gltf.scene)), err => { r.estado = 'error'; r.error = err; r.mal(err); })
          .then(() => { enVuelo--; siguiente(); });
      }
    }
    function procesar(r, root) {
      root.updateMatrixWorld(true);
      const grupos = new Map(), usados = new Set();
      root.traverse(o => {
        if (!o.isMesh) return;
        const geo = esIdentidad(o.matrixWorld) ? o.geometry : o.geometry.clone().applyMatrix4(o.matrixWorld);
        const k = r.tipo === 'lejos' ? 'AV_Lejos' : o.material.name || o.material.uuid;
        let gr = grupos.get(k); if (!gr) grupos.set(k, gr = { src: o.material, geos: [] });
        gr.geos.push(geo);
      });
      if (r.tipo === 'lejos') {
        const geos = [...grupos.values()].flatMap(g => g.geos.map(geo => {
          if (geo.attributes.color) return geo;
          const c = g.src.color || new THREE.Color(1, 1, 1), n = geo.attributes.position.count, a = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
          const out = geo.clone(); out.setAttribute('color', new THREE.BufferAttribute(a, 3)); return out;
        }));
        r.geo = fundir(geos, true);
      } else {
        r.partes = [];
        for (const [, gr] of grupos) {
          const mat = material(gr.src, r.fijo);
          usados.add(mat); if (mat.map) usados.add(mat.map);
          const geo = gr.geos.length === 1 ? gr.geos[0] : fundir(gr.geos, false);
          if (!geo.boundingBox) geo.computeBoundingBox();
          if (!geo.boundingSphere) geo.computeBoundingSphere();
          r.partes.push({ geo, mat });
        }
        const caja = new THREE.Box3(); for (const p of r.partes) caja.union(p.geo.boundingBox);
        const esf = caja.getBoundingSphere(new THREE.Sphere());
        r.radio = esf.radius; r.centro = esf.center; r.alto = caja.max.y;
        actualizarEsferas(r.n, esf);
      }
      soltarSobrantes(root, usados);
      root.traverse(o => { if (o.isMesh && r.tipo === 'cerca' && !r.partes.some(p => p.geo === o.geometry)) o.geometry.dispose(); });
      if (r.tipo === 'lejos') root.traverse(o => { if (o.isMesh && o.geometry !== r.geo) o.geometry.dispose(); });
      r.estado = 'listo';
      if (!r.refs && !r.fijo) r.soltarEn = performance.now() + CFG.gracia * 1000;
      crearLote(r);
      r.ok(r);
      if (r.tipo === 'lejos') zonasDe(r.n);
      if (r.tipo === 'cerca') for (const I of porModelo[r.n] || []) if (!I.colocado && zonas[I.zona].nivel === 2) encolar(() => colocar(I));
    }
    function actualizarEsferas(n, esf) {
      for (const I of porModelo[n] || []) {
        vecA.copy(esf.center).applyMatrix4(I.m);
        I.cx = vecA.x; I.cy = vecA.y; I.cz = vecA.z; I.r = esf.radius * I.m.getMaxScaleOnAxis();
      }
    }
    // LOD lejano sin archivo propio: se baja el de cerca (referencia temporal), se simplifica y se suelta
    function generarDesdeCerca(r, prio) {
      r.estado = 'bajando';
      const rc = res(r.n, 'cerca');
      pedir(rc, prio + 1000).then(() => encolar(() => {
        try { r.geo = generarLejos(rc.partes); r.estado = 'listo'; crearLote(r); if (!r.refs) r.soltarEn = performance.now() + CFG.gracia * 1000; r.ok(r); zonasDe(r.n); }
        catch (e) { r.estado = 'error'; r.mal(e); }
        soltar(rc);
      }), err => { r.estado = 'error'; r.mal(err); soltar(rc); });
    }
    function liberar(r) {
      quitarLote(r);
      if (r.tipo === 'cerca' && r.partes) { for (const p of r.partes) { p.geo.dispose(); soltarMaterial(p.mat); } r.partes = null; }
      if (r.tipo === 'lejos' && r.geo) { r.geo.dispose(); r.geo = null; }
      r.estado = 'nada'; r.promesa = null; r.soltarEn = 0;
    }
    function liberarVencidos(ahora) {
      for (const n in recursos) for (const t in recursos[n]) {
        const r = recursos[n][t];
        if (r.estado === 'listo' && !r.refs && !r.fijo && r.soltarEn && ahora >= r.soltarEn) liberar(r);
      }
    }

    // --- colocar una instancia: colisiones (una sola vez) ---
    function colocar(I) {
      if (I.colocado) return;
      const r = res(I.modelo, 'cerca'); if (r.estado !== 'listo') return;
      I.colocado = true;
      const kA = I.modelo + '|' + I.escala.toFixed(3);
      if (!analisis[kA] && cfg.analizar) {
        const g = new THREE.Group(); for (const p of r.partes) g.add(new THREE.Mesh(p.geo, p.mat));
        g.updateMatrixWorld(true);
        analisis[kA] = cfg.analizar(g, I.escala);
      }
      if (cfg.colocar) cfg.colocar(I, analisis[kA] || { sol: null, pisos: [], alto: r.alto * I.escala });
      if (G.solidos && G.solidos.agregar) {
        const g = new THREE.Group();
        for (const p of r.partes) { const m = new THREE.Mesh(p.geo, p.mat); m.matrixAutoUpdate = false; m.matrix.copy(I.m); g.add(m); }
        G.solidos.agregar(g);
      }
    }

    // --- niveles de las zonas ---
    let activas = [];
    function nivelZona(Z, quiere) {
      const antes = Z.nivel; if (quiere === antes) return;
      Z.nivel = quiere;
      for (const n of Z.modelos) {
        if (antes < 2 && quiere === 2) pedir(res(n, 'cerca'), Z.d).catch(err => respaldo(Z, n, err));
        if (antes === 2 && quiere < 2) soltar(res(n, 'cerca'));
        if (antes < 1 && quiere >= 1) pedir(res(n, 'lejos'), Z.d + 1).catch(() => {});
        if (antes >= 1 && quiere < 1) soltar(res(n, 'lejos'));
      }
      if (quiere === 2) for (const I of Z.inst) if (!I.colocado && res(I.modelo, 'cerca').estado === 'listo') encolar(() => colocar(I));
      if (quiere >= 1) encolar(() => fundirZona(Z)); else quitarZona(Z);
      activas = inst.filter(I => zonas[I.zona].nivel >= 1);
    }
    // Zona vista de lejos: todos sus lejanos fundidos en una malla (un draw call por zona; el frustum la descarta entera). Se
    // usa en nivel lejos y también en nivel cerca mientras toda la zona quede más allá de la distancia de LOD de la cámara.
    function fundirZona(Z) {
      if (Z.nivel < 1 || Z.malla) return;
      const rs = [...Z.modelos].map(n => res(n, 'lejos'));
      if (!rs.every(r => r.estado === 'listo' && r.geo)) return;
      const geos = Z.inst.map(I => res(I.modelo, 'lejos').geo.clone().applyMatrix4(I.m));
      const m = new THREE.Mesh(fundir(geos, true), matLejos);
      for (const g of geos) g.dispose();
      m.name = 'edificiosZona:' + Z.id + ':lejos'; m.userData.sinSolido = true; m.matrixAutoUpdate = false;
      scene.add(m); Z.malla = m;
    }
    function quitarZona(Z) { if (!Z.malla) return; scene.remove(Z.malla); Z.malla.geometry.dispose(); Z.malla = null; }
    function zonasDe(n) { for (const id in zonas) { const Z = zonas[id]; if (Z.nivel >= 1 && !Z.malla && Z.modelos.has(n)) encolar(() => fundirZona(Z)); } }
    const avisados = new Set();
    function respaldo(Z, n, err) {
      if (!avisados.has(n)) { avisados.add(n); console.warn('AVE edificios:', err && err.message || err); }
      for (const I of Z.inst) if (I.modelo === n && cfg.respaldo) cfg.respaldo(I);
    }
    let inicio = null;
    function revisar(x, z) {
      if (x == null) { const S = G.S; x = S.pos ? S.pos.x : 0; z = S.pos ? S.pos.z : 0; }
      if (!inicio) inicio = [x, z];
      else if (quieto && Math.hypot(x - inicio[0], z - inicio[1]) > CFG.moverse) { quieto = false; siguiente(); }
      const Rc = radioCerca(), Rl = alcance(), H = CFG.histeresis;
      for (const id in zonas) {
        const Z = zonas[id];
        Z.d = Math.max(0, Math.hypot(x - Z.cx, z - Z.cz) - Z.r);
        const cerca = Z.forzada || (Z.nivel === 2 ? Z.d < Rc + H : Z.d < Rc);
        const lejos = Z.nivel >= 1 ? Z.d < Rl + H : Z.d < Rl;
        nivelZona(Z, cerca ? 2 : lejos ? 1 : 0);
      }
      liberarVencidos(performance.now());
    }
    // Promesa: las zonas en nivel cerca que pasan el filtro, cargadas y colocadas (y los lejanos con archivo propio)
    function listasCerca(filtro) {
      const ps = [];
      for (const id in zonas) {
        const Z = zonas[id]; if (!filtro(Z)) continue;
        for (const n of Z.modelos) {
          if (Z.nivel === 2) ps.push(res(n, 'cerca').promesa);
        }
      }
      const lq = quieto ? CFG.lejosQuieto[nivelCal()] || 150 : Infinity;
      for (const id in zonas) if (zonas[id].nivel >= 1 && zonas[id].d < lq) for (const n of zonas[id].modelos) if (tieneLejos(n)) ps.push(res(n, 'lejos').promesa);
      return Promise.all(ps.filter(Boolean).map(p => p.catch(() => null))).then(() => new Promise(ok => {
        const hecho = () => { for (const id in zonas) { const Z = zonas[id]; if (filtro(Z) && Z.nivel === 2 && Z.inst.some(I => !I.colocado && res(I.modelo, 'cerca').estado === 'listo')) return false; } return true; };
        const mirar = () => { if (hecho()) ok(); else { if (arrancando || !programado) drenarColocar(); setTimeout(mirar, 30); } };
        mirar();
      }));
    }
    function drenarColocar() { for (const I of inst) if (!I.colocado && zonas[I.zona].nivel === 2 && res(I.modelo, 'cerca').estado === 'listo') colocar(I); }
    function alrededor(x, z) { revisar(x, z); return listasCerca(Z => Z.nivel === 2); }

    // --- cada cuadro: LOD, distancia, frustum y sombra por instancia → listas por lote ---
    const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), esfera = new THREE.Sphere();
    const vis = { cerca: 0, lejos: 0, mallas: 0, zonas: 0 };
    function cuadro() {
      const cam = R.camera; cam.updateMatrixWorld(); if (cam.matrixWorldInverse) cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      frustum.setFromProjectionMatrix(pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      const cp = cam.position, max = alcance(), lodD = CFG.lod[nivelCal()] || 65, H = CFG.lodH;
      const S = G.S, sx = S.pos ? S.pos.x : cp.x, sz = S.pos ? S.pos.z : cp.z;
      const conSombra = !!(R.calidad && R.calidad.sombras && R.sun && R.sun.castShadow), rS = ((R.calidad && R.calidad.sombraRadio) || 0) + CFG.margenSombra;
      for (const k in lotes) { const L = lotes[k]; L.lista.length = 0; L.sombra = false; }
      vis.zonas = 0;
      for (const id in zonas) {
        const Z = zonas[id], m = Z.malla; if (!m) { Z.usaMalla = false; continue; }
        const dz = Math.hypot(cp.x - Z.cx, cp.z - Z.cz) - Z.r;
        Z.usaMalla = Z.nivel === 1 || dz > lodD + (Z.usaMalla ? -H : H);
        const bs = m.geometry.boundingSphere; m.visible = Z.usaMalla && cp.distanceTo(bs.center) - bs.radius < max;
        if (m.visible && frustum.intersectsSphere(bs)) vis.zonas++;
      }
      for (let i = 0; i < activas.length; i++) {
        const I = activas[i];
        if (zonas[I.zona].usaMalla) continue; // la dibuja la malla fundida de su zona
        const d = Math.hypot(I.cx - cp.x, I.cy - cp.y, I.cz - cp.z);
        if (d - I.r > max) continue;
        if (I.lod === 0 && d > lodD + H) I.lod = 1; else if (I.lod === 1 && d < lodD - H) I.lod = 0;
        let L = lotes[I.modelo + (I.lod === 0 ? ':cerca' : ':lejos')] || lotes[I.modelo + (I.lod === 0 ? ':lejos' : ':cerca')];
        if (!L) continue;
        const sombra = L.tipo === 'cerca' && conSombra && Math.hypot(I.cx - sx, I.cz - sz) < rS + I.r;
        esfera.center.set(I.cx, I.cy, I.cz); esfera.radius = I.r;
        if (!sombra && !frustum.intersectsSphere(esfera)) continue;
        L.lista.push(I); if (sombra) L.sombra = true;
      }
      vis.cerca = vis.lejos = vis.mallas = 0;
      for (const k in lotes) {
        const L = lotes[k], li = L.lista, pr = L.prev;
        let igual = li.length === pr.length;
        for (let j = 0; igual && j < li.length; j++) if (li[j] !== pr[j]) igual = false;
        if (!igual) {
          const a = L.attr.array;
          for (let j = 0; j < li.length; j++) a.set(li[j].m.elements, j * 16);
          L.attr.needsUpdate = true;
          L.prev = li.slice();
        }
        for (const m of L.mallas) { m.count = li.length; m.visible = li.length > 0; m.castShadow = L.tipo === 'cerca' && L.sombra; }
        if (li.length) { vis[L.tipo] += li.length; vis.mallas += L.mallas.length; }
      }
    }

    // --- arranque, bucle y API ---
    let iniciado = false, revisionT = 0;
    const gestor = {
      zonas, instancias: inst, recursos, lotes, CFG,
      arrancar() {
        return Promise.resolve(ED.kit && !KIT() ? AVE.assets.script(ED.kit).catch(() => null) : null).then(() => {
          construir(); iniciado = true;
          revisar();
          const pre = CFG.precarga[nivelCal()] || 50;
          gestor.listo = listasCerca(Z => Z.nivel === 2 && Z.d < pre);
          return gestor.listo;
        }).then(() => { arrancando = false; gestor.tListo = performance.now(); siguiente(); });
      },
      listo: null,
      revisar, alrededor,
      cargarTodo() { for (const id in zonas) zonas[id].forzada = true; return alrededor(); },
      soltarTodo() { for (const id in zonas) zonas[id].forzada = false; revisar(); },
      liberarYa() { for (const n in recursos) for (const t in recursos[n]) { const r = recursos[n][t]; if (r.soltarEn) r.soltarEn = 1; } liberarVencidos(performance.now()); },
      terminar() {
        // todo lo pendiente ya (pruebas y capturas): descargas en curso, trabajos y colocación
        const espera = () => new Promise(ok => {
          const mirar = () => { drenar(); if (!enVuelo && !cola.some(r => r.estado === 'cola' && (r.refs || r.fijo)) && !trabajos.length) ok(); else setTimeout(mirar, 25); };
          mirar();
        });
        return espera().then(() => { drenarColocar(); drenar(); });
      },
      stats() {
        let modCerca = 0, modLejos = 0, bytes = 0;
        for (const n in recursos) {
          const rc = recursos[n].cerca, rl = recursos[n].lejos;
          if (rc && rc.estado === 'listo') { modCerca++; for (const p of rc.partes) bytes += tam(p.geo); }
          if (rl && rl.estado === 'listo') { modLejos++; bytes += tam(rl.geo); }
        }
        for (const id in zonas) if (zonas[id].malla) bytes += tam(zonas[id].malla.geometry);
        const zs = Object.values(zonas);
        return { zonas: zs.length, zonasCerca: zs.filter(Z => Z.nivel === 2).length, zonasLejos: zs.filter(Z => Z.nivel === 1).length,
          instancias: inst.length, colocadas: inst.filter(I => I.colocado).length, modelosCerca: modCerca, modelosLejos: modLejos,
          materiales: Object.keys(mats).length, kbGeometria: Math.round(bytes / 1024), visiblesCerca: vis.cerca, visiblesLejos: vis.lejos,
          drawEdificios: vis.mallas + vis.zonas, zonasFundidas: zs.filter(Z => Z.malla).length, descargando: enVuelo + cola.filter(r => r.estado === 'cola').length, trabajos: trabajos.length, omitidos: [...omitidos] };
      },
    };
    const tam = g => { let b = 0; if (!g) return 0; for (const k in g.attributes) b += g.attributes[k].array.byteLength; if (g.index) b += g.index.array.byteLength; return b; };
    G.on('update', dt => {
      if (iniciado && quieto && inicio && G.S.pos && Math.hypot(G.S.pos.x - inicio[0], G.S.pos.z - inicio[1]) > CFG.moverse) revisionT = CFG.revisar;
      if (!iniciado || (revisionT += dt) < CFG.revisar) return;
      revisionT = 0; revisar();
    }, 71);
    G.on('render', () => { if (iniciado) cuadro(); }, 22);
    // modelo(n) fijo para el contenido (taller, refugio): comparte la carga y los materiales con las instancias
    gestor.modelo = n => { const r = res(n, 'cerca'); r.fijo = true; return pedir(r, -1).then(() => r); };
    ST = gestor;
    return gestor;
  }

  // ---------- Prueba: AV.streamingTest ----------
  async function test(opts) {
    opts = opts || {};
    const P = G.pruebas, { check, result } = P.runner();
    if (!ST) { check('Sin mapa con edificios: nada que cargar por zonas', true, 'sin mapa'); return result(); }
    // Estado propio (no depende de lo que corrió antes): calidad alta fija, zonas sin forzar, desde el spawn y con lo de
    // fuera ya liberado. Al terminar se devuelven la calidad, la cámara, la posición y la partida.
    const S = G.S, keep = P.keepSave(), xo = S.pos.x, zo = S.pos.z, f0 = S.facing ? Object.assign({}, S.facing) : null;
    const MAPA = G.terreno.mapa || {}, sp = MAPA.spawn || { x: xo, z: zo }, x0 = sp.x, z0 = sp.z;
    const cal0 = { nivel: nivelCal(), manual: !!(R.calidad && R.calidad.manual) }, yaw0 = G.camara.yaw;
    const M = R.renderer.info.memory, B64 = 'AV_EDIFICIOS_B64';
    const dibujar = n => { for (let i = 0; i < (n || 2); i++) { G.camara.place(true); R.render(1 / 60, false); } };
    const ir = async (x, z, fx, fz) => { P.teleport(x, z, fx, fz); P.tick(0.1); await ST.alrededor(x, z); await ST.terminar(); if (G.solidos && G.solidos.terminar) G.solidos.terminar(); dibujar(); };
    const heap = () => (performance.memory ? performance.memory.usedJSHeapSize / 1048576 : NaN);
    const r2 = v => Math.round(v * 10) / 10;
    try {
      await ST.listo; await ST.terminar();
      if (R.setCalidad) R.setCalidad('alto', true);
      ST.soltarTodo(); await ir(x0, z0, 0, -1); ST.liberarYa(); await ST.terminar();
      // 1. Lo de cerca del inicio, cargado y con colisiones
      const Rc = radioCerca(), zs = Object.values(ST.zonas);
      const iniciales = zs.filter(Z => Math.max(0, Math.hypot(x0 - Z.cx, z0 - Z.cz) - Z.r) < Rc);
      check('Lo de cerca del inicio está cargado y con colisiones', iniciales.every(Z => Z.nivel === 2 && Z.inst.every(I => I.colocado)),
        iniciales.map(Z => Z.id + ':' + Z.inst.filter(I => I.colocado).length + '/' + Z.inst.length).join(' '));
      // 2. Entrar en una zona que no esté cerca del punto de partida: fuera de vista si la hay, si no la más lejana
      ST.revisar(x0, z0);
      const Z = zs.filter(Zn => !iniciales.includes(Zn) && Zn.nivel < 2).sort((a, b) => a.nivel - b.nivel || b.d - a.d)[0] || zs.slice().sort((a, b) => b.d - a.d)[0];
      const modelosZ = [...Z.modelos], otros = n => zs.some(o => o !== Z && o.modelos.has(n));
      const propios = modelosZ.filter(n => !otros(n));
      // Vista más cargada: borde sur de la zona con más instancias, mirando a su centro
      const ZM = zs.slice().sort((a, b) => b.inst.length - a.inst.length)[0];
      await ir(ZM.cx, ZM.cz + Math.min(ZM.r, 40) + 6, 0, -1);
      // draw calls de un cuadro entero (sombra, escena y post), contados aquí: R.stats() solo se actualiza en el bucle
      const contar = () => { const rr = R.renderer, orig = rr.render; let n = 0; rr.render = function (a, b) { orig.call(rr, a, b); n += rr.info.render.calls; }; try { G.camara.place(true); R.render(1 / 60, false); } finally { rr.render = orig; } return n; };
      // la peor de cuatro orientaciones de la cámara
      let st = null;
      for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        G.camara.yaw = yaw; dibujar(2);
        const c = contar(), se = ST.stats();
        if (!st || c > st.calls) st = { calls: c, yaw, edif: se.drawEdificios, cerca: se.visiblesCerca, lejos: se.visiblesLejos, zonas: se.zonasFundidas };
      }
      G.camara.yaw = yaw0;
      check('Draw calls de la vista más cargada ≤ 150', st.calls > 0 && st.calls <= 150, ZM.id + ' (giro ' + r2(st.yaw) + '): ' + st.calls + ' draw calls, edificios ' + st.edif +
        ' (' + st.cerca + ' instancias cerca, ' + st.lejos + ' lejos sueltas, ' + st.zonas + ' zonas fundidas) · ' + nivelCal());
      const g0 = M.geometries, t0 = M.textures;
      // Entrar en Z por el borde sur, mirando al centro
      const bx = Z.cx, bz = Z.cz + Math.min(Z.r, 40) + 6;
      await ir(bx, bz, 0, -1);
      const cargados = modelosZ.every(n => ST.recursos[n] && ST.recursos[n].cerca && ST.recursos[n].cerca.estado === 'listo');
      check('Al entrar, la zona carga sus modelos y coloca sus instancias', Z.nivel === 2 && cargados && Z.inst.every(I => I.colocado),
        Z.id + ': ' + Z.inst.length + ' instancias, ' + modelosZ.length + ' modelos');
      const sinSolido = Z.inst.filter(I => {
        if (!I.erguido || (I.r < 1.2)) return false;
        const hay = G.fisica.colliders.some(c => c.id === I.id) || (G.solidos && G.solidos.altoEn && G.solidos.altoEn(I.pos[0], I.pos[2], 1e4) > G.terreno.height(I.pos[0], I.pos[2]) + 0.3);
        return !hay && G.mundo.activos[I.id] && G.mundo.activos[I.id].alto > 1.5;
      });
      check('Las colisiones de sus edificios están activas al cargar', sinSolido.length === 0, sinSolido.map(I => I.id).slice(0, 5).join(', '));
      const idsZ = new Set(Z.inst.map(I => I.id)), colZ = () => G.fisica.colliders.filter(c => idsZ.has(c.id)).length;
      const I0 = Z.inst.find(I => I.erguido && G.mundo.activos[I.id] && G.mundo.activos[I.id].alto > 2), alto0 = () => I0 && G.solidos && G.solidos.altoEn ? G.solidos.altoEn(I0.pos[0], I0.pos[2], 1e4) : 0;
      const c1 = colZ(), s1 = alto0();
      const visibles = Object.values(ST.lotes).some(L => L.mallas.some(m => m.visible && m.count > 0));
      check('Se dibujan instancias de la zona', visibles, '');
      // 3. Salir: volver al inicio y liberar
      await ir(x0, z0, f0 && f0.x, f0 && f0.z);
      ST.liberarYa(); dibujar();
      const libres = (tipo, ns) => ns.every(n => { const r = ST.recursos[n][tipo]; return !r || r.estado === 'nada' || r.fijo; }) && !scene.children.some(o => ns.some(n => (o.name || '').startsWith('edificiosInst:' + n + ':' + tipo)));
      const propiosCerca = propios.filter(n => !ST.recursos[n].cerca.fijo);
      check('Al salir de su radio, la zona suelta el modelo completo (geometría, texturas, mallas)', Z.nivel < 2 && libres('cerca', propiosCerca),
        'nivel ' + Z.nivel + ' · geometrías ' + g0 + '→' + M.geometries + ' · texturas ' + t0 + '→' + M.textures + ' · ' + propiosCerca.join(','));
      // Lejos de todo (distancia de dibujo 1 m, simulado): también se suelta el LOD lejano
      const dib = CFG.dibujo; CFG.dibujo = { bajo: 1, medio: 1, alto: 1 };
      ST.revisar(); ST.liberarYa(); dibujar();
      check('Fuera de la vista, la zona se libera del todo (nivel 0, sin LOD lejano)', Z.nivel === 0 && libres('lejos', propios), 'nivel ' + Z.nivel + ' · geometrías ' + M.geometries);
      CFG.dibujo = dib; ST.revisar(); await ST.terminar();
      check('La cadena base64 no queda en memoria', modelosZ.every(n => !(window[B64] || {})[n]), '');
      check('Las colisiones siguen activas tras liberar', colZ() === c1 && alto0() === s1, 'colliders ' + c1 + '→' + colZ() + ' · sólido ' + r2(s1) + '→' + r2(alto0()) + ' m');
      // 4. Fugas: dos vueltas más; geometrías, texturas, bytes y heap estables
      // (geometrías y texturas de three cuentan también la flora, que va por regiones: se informan, no se exigen)
      // La referencia se toma tras una primera vuelta: así las dos medidas tienen la misma historia de histéresis.
      await ir(bx, bz, 0, -1); await ir(x0, z0); ST.liberarYa(); dibujar();
      // heap: con window.gc (Chrome con --js-flags=--expose-gc) se recoge antes y se exige ≤ 8 MB; sin gc el heap incluye basura
      // aún no recogida y solo se informa (la memoria propia de los edificios sí se exige estable)
      const gc = typeof window.gc === 'function', tolHeap = gc ? 8 : 32;
      const foto = () => { if (gc) window.gc(); const s2 = ST.stats(); return { g: M.geometries, t: M.textures, kb: s2.kbGeometria, mats: s2.materiales, mod: s2.modelosCerca + s2.modelosLejos, heap: heap() }; };
      const m1 = foto();
      for (let v = 0; v < 2; v++) { await ir(bx, bz, 0, -1); await ir(x0, z0); ST.liberarYa(); dibujar(); }
      const m2 = foto();
      check('Sin fugas tras ir y volver dos veces (memoria de edificios estable; heap con gc ≤ +8 MB)', m2.kb <= m1.kb * 1.02 + 16 && m2.mats <= m1.mats && m2.mod <= m1.mod && !(gc && m2.heap - m1.heap > tolHeap),
        'KB ' + m1.kb + '→' + m2.kb + ' · materiales ' + m1.mats + '→' + m2.mats + ' · modelos ' + m1.mod + '→' + m2.mod + ' · heap ' + r2(m1.heap) + '→' + r2(m2.heap) + ' MB' + (gc ? ' (gc)' : ' (sin gc: no se exige)') + ' · three geo ' + m1.g + '→' + m2.g + ', tex ' + m1.t + '→' + m2.t);
    } catch (e) {
      check('La prueba corre sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      G.camara.yaw = yaw0;
      if (R.setCalidad) { R.setCalidad(cal0.nivel); R.calidad.manual = cal0.manual; }
      P.teleport(xo, zo, f0 && f0.x, f0 && f0.z); P.tick(0.1); ST.revisar(xo, zo);
      P.restoreSave(keep);
    }
    return result();
  }

  return { iniciar, material, soltarMaterial, generarLejos, CFG, test, get gestor() { return ST; },
    modelo: n => ST ? ST.modelo(n) : Promise.reject(new Error('streaming sin iniciar')) };
});
