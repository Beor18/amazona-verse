/* Juego · Interior de un bohío de Villa Raíz (G27, carril M).
   La escala la aplica mundo.js (×1,75 de fábrica; ?bohioEsc=1.25|1.5|1.75 para las capturas).
   El bohío más alto es el único cuya puerta (1,95 m) queda por encima de Vittata (1,75 m).
   Dentro, junto a la puerta, hay hamaca, tinaja y fogón. Colores del mismo vibrant_toon:
   madera cálida, crema y rojo teja mate. Vittata no se achica. La cámara se queda fuera del muro.
   Carga perezosa desde boot.js. window.AVBohios(G) → { listo, casa, vistas, test }. */
window.AVBohios = function (G) {
  'use strict';
  if (G.bohios) return G.bohios;
  const R = G.renderer, scene = R.scene, S = G.S;
  const ZONA = 'kelvin_aldea_rio_este', MODELO = 'bohio_redondo';
  const ALTO_MODELO = 3.626; // kit.js bohio_redondo.alto
  const ALTURA = (G.pack.jugador && G.pack.jugador.altura) || 1.75;
  // Lineal, la misma familia que el atlas: crema (0.80, 0.71, 0.55), madera cálida y rojo teja (0.58, 0.22, 0.14).
  const COLOR = { madera: [0.45, 0.28, 0.16], crema: [0.80, 0.71, 0.55], piedra: [0.42, 0.34, 0.24], teja: [0.58, 0.22, 0.14] };
  const FRASES = {
    hamaca: 'La hamaca está fresca. Un buen sitio para descansar un momento.',
    tinaja: 'La tinaja guarda agua de lluvia. Fría, y alcanza para todos.',
    fogon: 'El fogón está apagado. Huele a leña de esta mañana.',
  };
  let casa = null, grupo = null, listoP = null;

  const factor = () => G.bohiosFactor || 1;
  const casas = () => {
    const st = G.mundo && G.mundo.streaming;
    return (st && st.instancias || []).filter(I => I.zona === ZONA && I.modelo === MODELO && I.pos);
  };
  function elegir(lista) {
    const sp = (G.terreno.mapa && G.terreno.mapa.spawn) || { x: 134, z: 182.5 };
    const fija = G.esBohioAbierto && lista.find(I => G.esBohioAbierto(I)); if (fija) return fija;
    return lista.slice().sort((a, b) => (b.escala - a.escala) ||
      (Math.hypot(a.pos[0] - sp.x, a.pos[2] - sp.z) - Math.hypot(b.pos[0] - sp.x, b.pos[2] - sp.z)))[0] || null;
  }
  function localAMundo(I, lx, ly, lz) {
    const c = Math.cos(I.rotY), s = Math.sin(I.rotY), e = I.escala;
    return { x: I.pos[0] + (lx * c + lz * s) * e, y: I.pos[1] + ly * e, z: I.pos[2] + (-lx * s + lz * c) * e };
  }
  function girar(I, nx, nz) {
    const c = Math.cos(I.rotY), s = Math.sin(I.rotY);
    const x = nx * c + nz * s, z = -nx * s + nz * c, L = Math.hypot(x, z) || 1;
    return { x: x / L, z: z / L };
  }
  function vanoDe() {
    const M = G.solidos && G.solidos.vanos;
    const R = M && M.get && M.get(MODELO);
    return R && R.vanos && R.vanos[0] || null;
  }
  function puerta(I) {
    const v = vanoDe();
    if (!I || !v) return null;
    const p = localAMundo(I, v.x, 0, v.z);
    const n = girar(I, v.nx, v.nz);
    const suelo = G.terreno ? G.terreno.height(p.x + n.x * 0.7, p.z + n.z * 0.7) : I.pos[1];
    return {
      x: p.x + n.x * 0.7, z: p.z + n.z * 0.7, y: suelo + 0.02,
      dentroX: p.x - n.x * 0.35, dentroZ: p.z - n.z * 0.35,
      alto: (v.alto - v.y0) * I.escala, ancho: v.w * I.escala, nx: n.x, nz: n.z,
    };
  }
  function mat(rgb) {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2]), roughness: 0.92, metalness: 0 });
    m.name = 'bohio-interior';
    return m;
  }
  function pieza(geo, rgb, x, y, z) {
    const m = new THREE.Mesh(geo, mat(rgb));
    m.castShadow = m.receiveShadow = true;
    m.position.set(x, y, z);
    grupo.add(m);
    return m;
  }
  function tocar(frase) {
    G.ui.toast(frase, 2800);
  }
  function montar(I) {
    if (grupo || !I) return;
    casa = I;
    grupo = new THREE.Group();
    grupo.name = 'bohio-interior';
    const v = vanoDe();
    const n = v ? girar(I, v.nx, v.nz) : { x: 0, z: 1 };
    const p = v ? localAMundo(I, v.x, 0, v.z) : { x: I.pos[0], y: I.pos[1], z: I.pos[2] };
    // Justo dentro de la puerta, al alcance de quien está en el umbral. Metros de mundo.
    const dentro = (lado, fondo) => ({ x: p.x - n.x * fondo + n.z * lado, z: p.z - n.z * fondo - n.x * lado });
    // BM6-8: a 1,0-1,4 m del umbral (Vittata mide 0,32 de radio): antes estaban a 0,4-0,7 m y tapaban la puerta
    const a = dentro(-0.6, 1.0), b = dentro(0.1, 1.4), c = dentro(0.65, 1.2);
    const yDe = p => (G.terreno ? G.terreno.height(p.x, p.z) : I.pos[1]);
    // Hamaca: dos postes y un lienzo de madera.
    const poste = new THREE.CylinderGeometry(0.045, 0.05, 0.85, 6);
    const pa = pieza(poste, COLOR.madera, 0, 0, 0); pa.position.set(a.x - n.z * 0.42, yDe(a) + 0.42, a.z + n.x * 0.42); // la hamaca gira con la normal de la puerta
    const pb = pieza(poste, COLOR.madera, 0, 0, 0); pb.position.set(a.x + n.z * 0.42, yDe(a) + 0.42, a.z - n.x * 0.42);
    const tela = pieza(new THREE.BoxGeometry(0.9, 0.06, 0.38), COLOR.crema, 0, 0, 0);
    tela.position.set(a.x, yDe(a) + 0.48, a.z);
    tela.rotation.y = Math.atan2(n.x, n.z);
    // Tinaja crema.
    const tin = pieza(new THREE.SphereGeometry(0.22, 12, 8), COLOR.crema, 0, 0, 0);
    tin.scale.set(1, 0.85, 1);
    tin.position.set(b.x, yDe(b) + 0.2, b.z);
    // Fogón de piedra con brasa de rojo teja, mate.
    pieza(new THREE.BoxGeometry(0.28, 0.16, 0.22), COLOR.piedra, 0, 0, 0).position.set(c.x - 0.16, yDe(c) + 0.08, c.z);
    pieza(new THREE.BoxGeometry(0.28, 0.16, 0.22), COLOR.piedra, 0, 0, 0).position.set(c.x + 0.16, yDe(c) + 0.08, c.z);
    const brasa = pieza(new THREE.SphereGeometry(0.07, 8, 6), COLOR.teja, 0, 0, 0);
    brasa.position.set(c.x, yDe(c) + 0.1, c.z);
    scene.add(grupo);
    grupo.updateMatrixWorld(true);
    if (G.solidos && G.solidos.agregar) G.solidos.agregar(grupo); // BM6-8: los muebles son sólidos
    const add = (id, p, frase) => G.interaccion.add({
      id, x: p.x, z: p.z, r: 1.35,
      label: () => (id === 'bohio-hamaca' ? 'Tocar la hamaca' : id === 'bohio-tinaja' ? 'Tocar la tinaja' : 'Tocar el fogón'),
      use: () => tocar(frase),
    });
    add('bohio-hamaca', a, FRASES.hamaca);
    add('bohio-tinaja', b, FRASES.tinaja);
    add('bohio-fogon', c, FRASES.fogon);
  }
  function preparar() {
    if (listoP) return listoP;
    listoP = (async () => {
      await (G.mundo && G.mundo.listo);
      const lista = casas();
      const I = elegir(lista);
      if (!I) return null;
      const st = G.mundo.streaming;
      if (st && st.alrededor) await st.alrededor(I.pos[0], I.pos[2]);
      if (st && st.terminar) await st.terminar();
      if (G.solidos && G.solidos.terminar) G.solidos.terminar(true);
      montar(I);
      return I;
    })();
    return listoP;
  }
  // Tres encuadres para las capturas: aire, camino y puerta (Vittata en el umbral).
  function vistas() {
    const I = casa || elegir(casas());
    if (!I) return null;
    const p = puerta(I);
    const cx = I.pos[0], cz = I.pos[2];
    const suelo = G.terreno ? G.terreno.height(cx + 6, cz + 8) : I.pos[1];
    return {
      aire: { x: cx, y: I.pos[1] + 18, z: cz + 4, vuelo: true, yaw: 0.1, cam: [cx + 6, I.pos[1] + 22, cz + 16], mirar: [cx, I.pos[1] + 1, cz] },
      camino: { x: cx + 7, y: suelo + 0.05, z: cz + 8, vuelo: false, yaw: Math.atan2(-(cx) + (cx + 7), -(cz) + (cz + 8)), cam: [cx + 9, suelo + 2.2, cz + 11], mirar: [cx, I.pos[1] + 1.2, cz] },
      puerta: p ? { x: p.x, y: p.y, z: p.z, vuelo: false, yaw: Math.atan2(-p.nx, -p.nz), cam: [p.x + p.nx * 3.2, p.y + 1.6, p.z + p.nz * 3.2], mirar: [I.pos[0], I.pos[1] + 1.1, I.pos[2]] } : null,
      casa: { id: I.id, escala: I.escala, alto: ALTO_MODELO * I.escala, x: cx, z: cz },
      puertaMedida: p,
    };
  }

  async function test() {
    const out = [];
    const ok = (n, c, d) => out.push({ name: n, ok: !!c, extra: d == null ? '' : String(d) });
    const px = S.pos.x, py = S.pos.y, pz = S.pos.z;
    const C = G.camara && G.camara.CAM;
    const dist0 = C && C.dist, h0 = C && C.height;
    try {
      const I = await preparar();
      const f = factor();
      const lista = casas();
      ok('Villa Raíz tiene sus 13 bohíos redondos', lista.length === 13, lista.length);
      ok('La escala es una de las tres pedidas', f === 1.25 || f === 1.5 || f === 1.75, f);
      const altos = lista.map(B => ALTO_MODELO * B.escala);
      const menor = Math.min.apply(null, altos);
      const mayor = Math.max.apply(null, altos);
      const menorOrig = menor / f;
      ok('×1,25 y ×1,5 dejan la puerta del más alto por debajo de Vittata', f === 1.75, 'factor ' + f + ' · pico ' + menor.toFixed(2) + '–' + mayor.toFixed(2) + ' · origen ' + menorOrig.toFixed(2));
      const ch = G.actores && G.actores.player3D;
      const escV = ch && ch.root ? ch.root.scale.y * (ch.height || ALTURA) : ALTURA;
      ok('Vittata no se achica', !ch || escV > ALTURA - 0.05, escV.toFixed(2));
      ok('Hay hamaca, tinaja y fogón', !!(G.interaccion.find('bohio-hamaca') && G.interaccion.find('bohio-tinaja') && G.interaccion.find('bohio-fogon')));
      if (G.solidos && G.solidos.terminar) G.solidos.terminar(true);
      const p = puerta(I);
      const infoV = G.solidos && G.solidos.vanos && G.solidos.vanos.get(MODELO);
      ok('La puerta del bohío más alto supera 1,75 m y a ×1,5 no llegaba', !!(p && p.alto >= ALTURA && p.alto * 1.5 / f < ALTURA), p ? p.alto.toFixed(2) + ' m · ancho ' + p.ancho.toFixed(2) : (infoV && infoV.motivo));
      if (p && G.solidos && G.camara && G.camara.place) {
        let sitio = null;
        for (let d = 0.4; d <= 3.2 && !sitio; d += 0.2) {
          const x = p.x + p.nx * d, z = p.z + p.nz * d, y = G.terreno.height(x, z) + 0.12;
          if (G.solidos.penetra(x, z, y, 1.2) === 0) sitio = { x, z, y, d };
        }
        ok('Frente a la puerta hay sitio para estar de pie', !!sitio, sitio ? 'a ' + sitio.d.toFixed(1) + ' m' : 'sin hueco');
        if (sitio) {
          S.pos.x = sitio.x; S.pos.z = sitio.z; S.pos.y = sitio.y;
          if (C && dist0 != null) { C.dist = dist0; C.height = h0; }
          G.camara.yaw = Math.atan2(-p.nx, -p.nz);
          G.camara.place(true);
          const cp = G.renderer.camera.position;
          const den = G.solidos.dentro(cp.x, cp.z, cp.y);
          const distH = Math.hypot(cp.x - S.pos.x, cp.z - S.pos.z);
          ok('En la puerta la cámara no se mete en el muro', !(den > -Infinity), den === -Infinity ? 'fuera' : String(den));
          // BM6-7: todo el segmento cabeza-cámara, cada 0,15 m, sin tocar un muro
          const hy = S.pos.y + (C && C.look || 1.4), nSeg = Math.max(2, Math.ceil(Math.hypot(cp.x - S.pos.x, cp.y - hy, cp.z - S.pos.z) / 0.15));
          let tocado = 0; for (let i = 1; i <= nSeg; i++) { const t = i / nSeg; if (G.solidos.dentro(S.pos.x + (cp.x - S.pos.x) * t, S.pos.z + (cp.z - S.pos.z) * t, hy + (cp.y - hy) * t) > -Infinity) tocado++; }
          ok('Entre la cabeza y la cámara no hay muro (segmento entero)', tocado === 0, tocado + ' de ' + nSeg + ' puntos');
          ok('La cámara no se pega a Vittata', distH >= 2.5, distH.toFixed(2));
        }
      } else ok('La puerta del bohío está medida', false, infoV ? infoV.motivo : 'sin vano');
      // BM6-1: solo la amueblada tiene la puerta abierta; las otras, con panel (sólido) aunque la malla sea compartida
      if (p && G.solidos && G.solidos.penetra) {
        const pie = (x, z) => { const t = G.terreno.height(x, z), g = G.solidos.altoEn ? G.solidos.altoEn(x, z, t + 0.9) : -Infinity; return (g > t ? g : t) + 0.05; };
        const enPunto = (x, z) => G.solidos.penetra(x, z, pie(x, z), 1.2);
        const enVano = q => enPunto(q.x - q.nx * 0.7, q.z - q.nz * 0.7);
        const otras = lista.filter(B => B !== I && B.colocado && B.pos);
        const cerradas = otras.filter(B => { const q = puerta(B); return q && enVano(q, B) > 0; });
        ok('Solo la puerta del bohío amueblado está abierta', enVano(p, I) === 0 && otras.length > 0 && cerradas.length === otras.length, 'abierta ' + enVano(p, I).toFixed(2) + ' · cerradas ' + cerradas.length + '/' + otras.length);
        const pd = enPunto(p.dentroX, p.dentroZ);
        ok('BM6-8: dentro del umbral no hay muebles que estorben (penetra = 0)', pd === 0, pd.toFixed(2) + ' · de fuera a dentro: ' + [0, 0.25, 0.5, 0.7, 0.95, 1.2, 1.5, 2].map(d => enPunto(p.x - p.nx * d, p.z - p.nz * d)).join(' '));
      }
      const vis = vistas();
      ok('Hay encuadre de aire, camino y puerta', !!(vis && vis.aire && vis.camino && vis.puerta), vis && vis.casa && (vis.casa.id + ' alto ' + vis.casa.alto.toFixed(2)));
    } catch (e) {
      ok('La prueba del bohío corre', false, e && (e.stack || e.message) || e);
    } finally {
      S.pos.x = px; S.pos.y = py; S.pos.z = pz;
      if (C && dist0 != null) { C.dist = dist0; C.height = h0; }
    }
    return { ok: out.every(r => r.ok), passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  preparar().catch(() => {});
  const api = { get listo() { return preparar(); }, get casa() { return casa; }, vistas, preparar, test, factor };
  G.bohios = api;
  return api;
};
