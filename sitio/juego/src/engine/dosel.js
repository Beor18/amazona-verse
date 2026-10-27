/* Amazona Verse · dosel por celdas (AW3, MAPA_PLAN_COMPLETO.md F1.2): el tercer nivel de los árboles.
   Malla horneada en Blender (tools/blender/entorno_dosel.py → assets/data/dosel_cap1.js): una manta de copas fundidas con color
   de vértice sobre el bosque, ~200–400 triángulos por celda de 32 m, ~47 k para toda la isla. Se dibuja de DOSEL.cerca (90 m)
   en adelante, con tramado en la banda y hundido hacia el suelo en los 60 m siguientes, y los impostores sueltos de vegetacion.js se cortan a DOSEL.impostor (250 m) mientras
   está activa: lo lejano del bosque lo pone el dosel.
   Una sola llamada: los índices van ordenados por celda y cada vez que cambia el conjunto de celdas a la vista (frustum y fuera
   del radio cercano) se copian a un búfer dinámico; los triángulos que cuenta el renderer son solo los de esas celdas.
   No va en la descarga inicial: lo carga boot.js en el primer gesto (src/engine/dosel.js + 690 KB de datos).
   Datos del pack: mundo.flora.dosel: false lo apaga; { src, global, cerca, banda, hundir, impostor } cambia lo que haga falta.
   API: window.AVDosel(G) → G.dosel = { listo, activo, impostorMax, stats(), test() } */
window.AVDosel = function (G) {
  'use strict';
  if (G.dosel) return G.dosel;
  const R = G.renderer, scene = R.scene, T = G.terreno, MAPA = T.mapa || {};
  const FL = (G.pack.mundo || {}).flora || {};
  const CAP1 = window.AV_MAPA_CAP1;
  const DOSEL = FL.dosel === false ? null : Object.assign({ src: 'assets/data/dosel_cap1.js', global: 'AV_DOSEL_CAP1', cerca: 90, banda: 14, hundir: 60, impostor: 250 }, FL.dosel);
  const api = G.dosel = { listo: Promise.resolve(), activo: false, impostorMax: DOSEL ? DOSEL.impostor : Infinity, stats: () => ({ activo: false }), test: () => Promise.resolve({ passed: 0, total: 0, results: [], omitido: 'sin dosel' }) };
  // solo para el mapa del que se horneó (el del cap. 1, que comparten los packs) o si el pack lo pide
  if (!DOSEL || !(FL.dosel || (CAP1 && MAPA.nombre === CAP1.nombre))) return api;

  const b64u8 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  let mesh = null, D = null, idxBase = null, idxVis = null, ncx = 0;
  const caja = new THREE.Box3(), frustum = new THREE.Frustum(), pv = new THREE.Matrix4();
  let clave = '', nVis = 0, celdasVis = 0;

  function crear() {
    D = window[DOSEL.global];
    const q = new Uint16Array(b64u8(D.pos).buffer), c = b64u8(D.col), nv = q.length / 3;
    const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), o = D.origen, e = D.escala;
    const tmp = new THREE.Color();
    for (let i = 0; i < nv; i++) {
      for (let k = 0; k < 3; k++) pos[i * 3 + k] = o[k] + q[i * 3 + k] * e;
      tmp.setRGB(c[i * 3] / 255, c[i * 3 + 1] / 255, c[i * 3 + 2] / 255).convertSRGBToLinear();
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    idxBase = new Uint16Array(b64u8(D.idx).buffer);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const alt = new Float32Array(nv), a8 = b64u8(D.alt); for (let i = 0; i < nv; i++) alt[i] = a8[i] / 10;
    geo.setAttribute('aAlt', new THREE.BufferAttribute(alt, 1));
    geo.setIndex(new THREE.BufferAttribute(idxBase, 1));
    geo.computeVertexNormals();
    idxVis = new Uint16Array(idxBase.length);
    geo.setIndex(new THREE.BufferAttribute(idxVis, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    ncx = D.ncx;
    const uCerca = { value: new THREE.Vector2(DOSEL.cerca, DOSEL.cerca + DOSEL.banda) }, uHundir = { value: new THREE.Vector2(DOSEL.cerca, DOSEL.cerca + DOSEL.hundir) };
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uCerca = uCerca; sh.uniforms.uHundir = uHundir;
      // en el anillo cercano el dosel se hunde hasta el suelo (aAlt: altura sobre el suelo) en vez de cortarse en seco: sin «cáscara»
      sh.vertexShader = 'attribute float aAlt; uniform vec2 uHundir; varying float vDoselD;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n  transformed.y -= aAlt * (1.0 - smoothstep(uHundir.x, uHundir.y, length(transformed.xz - cameraPosition.xz)));').replace('#include <project_vertex>',
        '#include <project_vertex>\n  vec4 dW = modelMatrix * vec4(transformed, 1.0); vDoselD = length(dW.xz - cameraPosition.xz);');
      // de cerca no hay dosel: los árboles en malla e impostor; en la banda, tramado (sin ordenar transparencias)
      sh.fragmentShader = 'uniform vec2 uCerca; varying float vDoselD;\nfloat doselIgn(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }\n' +
        sh.fragmentShader.replace('void main() {', 'void main() {\n  if (doselIgn(gl_FragCoord.xy) >= smoothstep(uCerca.x, uCerca.y, vDoselD)) discard;');
    };
    mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'flora:dosel'; mesh.frustumCulled = false; mesh.castShadow = mesh.receiveShadow = false;
    mesh.userData.sinCulling = true; // se recorta aquí, por celdas (cullPequenos de renderer.js lo mandaría a la capa 31)
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    scene.add(mesh);
    api.activo = true;
    actualizar(true);
  }

  // celdas a la vista: en el frustum y con algo más allá del radio cercano
  function actualizar(forzar) {
    if (!mesh) return;
    const cam = R.camera, cx = cam.position.x, cz = cam.position.z, cel = D.celda, cerca = DOSEL.cerca;
    cam.updateMatrixWorld();
    pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pv);
    let k = '', n = 0, nc = 0;
    const vis = [];
    for (let i = 0; i < D.celdas.length; i++) {
      const c = D.celdas[i], x0 = D.x0 + c[0] * cel, z0 = D.z0 + c[1] * cel;
      const fx = Math.max(Math.abs(cx - x0), Math.abs(cx - x0 - cel)), fz = Math.max(Math.abs(cz - z0), Math.abs(cz - z0 - cel));
      if (fx * fx + fz * fz < cerca * cerca) continue; // la esquina más lejana aún está dentro del radio cercano
      caja.min.set(x0, c[4], z0); caja.max.set(x0 + cel, c[5], z0 + cel);
      if (!frustum.intersectsBox(caja)) continue;
      vis.push(i); k += i + ',';
    }
    if (!forzar && k === clave) return;
    clave = k;
    for (const i of vis) { const c = D.celdas[i]; idxVis.set(idxBase.subarray(c[2], c[2] + c[3]), n); n += c[3]; nc++; }
    const ia = mesh.geometry.index;
    ia.updateRange.offset = 0; ia.updateRange.count = n; ia.needsUpdate = true;
    mesh.geometry.setDrawRange(0, n);
    mesh.visible = n > 0;
    nVis = n / 3; celdasVis = nc;
  }

  function stats() {
    return { activo: api.activo, triangulos: D ? D.triangulos : 0, vertices: D ? D.vertices : 0, celdas: D ? D.celdas.length : 0, celdasVisibles: celdasVis, triangulosVisibles: nVis,
      cerca: DOSEL.cerca, impostor: DOSEL.impostor, maxCelda: D ? Math.max(...D.celdas.map(c => c[3] / 3)) : 0 };
  }

  // doselTest: datos, presupuesto, una sola llamada, recorte por celdas y radio cercano, corte de impostores
  async function test() {
    await api.listo;
    const results = [], ok = (name, pasa, extra) => results.push({ name, ok: !!pasa, extra: extra == null ? undefined : typeof extra === 'object' ? JSON.stringify(extra) : String(extra) });
    const s = stats();
    ok('dosel activo', s.activo, s);
    ok('≈ 50 k triángulos para la isla (≤ 60 k)', s.triangulos > 20e3 && s.triangulos <= 60e3, s.triangulos);
    ok('≤ 500 triángulos por celda de 32 m', s.maxCelda <= 500, s.maxCelda);
    ok('una sola malla (una llamada)', scene.children.filter(o => o.name === 'flora:dosel').length === 1);
    const cam = R.camera, guard = cam.position.clone(), q = cam.quaternion.clone();
    const mirar = (x, y, z, tx, ty, tz) => { cam.position.set(x, y, z); cam.lookAt(tx, ty, tz); cam.updateMatrixWorld(); actualizar(true); return stats(); };
    try {
      const alto = mirar(0, 560, 90, 0, 0, 0);
      ok('desde el aire se ve casi toda la isla', alto.celdasVisibles >= s.celdas * 0.6, alto.celdasVisibles + '/' + s.celdas);
      const bajo = mirar(120, 16, 162, 88, 9, 118);
      ok('a ras de suelo, solo parte de las celdas', bajo.celdasVisibles > 0 && bajo.celdasVisibles < alto.celdasVisibles, bajo.celdasVisibles);
      ok('triángulos contados = los de las celdas a la vista', mesh.geometry.drawRange.count / 3 === bajo.triangulosVisibles && bajo.triangulosVisibles < s.triangulos, bajo.triangulosVisibles);
      // ninguna celda entera dentro del radio cercano
      const cx = cam.position.x, cz = cam.position.z, cel = D.celda;
      const dentro = D.celdas.filter((c, i) => clave.split(',').includes(String(i)) && Math.hypot(Math.max(Math.abs(cx - D.x0 - c[0] * cel), Math.abs(cx - D.x0 - c[0] * cel - cel)), Math.max(Math.abs(cz - D.z0 - c[1] * cel), Math.abs(cz - D.z0 - c[1] * cel - cel))) < DOSEL.cerca);
      ok('ninguna celda entera a menos de ' + DOSEL.cerca + ' m', dentro.length === 0, dentro.length);
    } finally { cam.position.copy(guard); cam.quaternion.copy(q); cam.updateMatrixWorld(); actualizar(true); }
    ok('impostores cortados a ' + api.impostorMax + ' m', api.impostorMax === DOSEL.impostor && api.impostorMax < 520);
    const passed = results.filter(c => c.ok).length;
    return { passed, total: results.length, results, stats: stats() };
  }

  api.stats = stats; api.test = test;
  api.listo = (window[DOSEL.global] ? Promise.resolve() : AVE.assets.script(DOSEL.src))
    .then(() => { crear(); G.on('render', () => actualizar(false)); })
    .catch(e => console.warn('AVE dosel:', e && e.message || e));
  return api;
};
