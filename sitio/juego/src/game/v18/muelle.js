/* Juego · V18.3 · misión 3 del arco: «El muelle de la otra orilla» (G.v18muelle). La primera obra buena del Constructor, con la Ingeniera.
   Sigue a «Los faroles de las Atalayas» (arco.js). Directiva docs/DIRECTIVA_V18_3_RESOLUCION.md §3 (ciudades que ya existen), §8 (un
   modelo, varias apariencias) y §9 (poderes). Contenido adicional del mundo abierto: no toca los seis capítulos.
   - Dónde: Embarcadero de las Canoas (plaza −128,4, 7,7; content/cap1/mundo.js), la «otra orilla» de comunidades.js. El muelle sale de
     la orilla oeste del río (x ≈ −119) hacia el agua, a 7 m de las canoas que ya están (−116,9, 2,9). Fuera de las zonas de los
     capítulos. Nada de edificios ni modelos nuevos: tablas, postes, boyas y faroles son piezas simples, como la escalera del puerto.
   - Cuándo: con los faroles de las Atalayas encendidos. Los dos humanos se mudan al embarcadero cuando Vittata se aleja de las
     Atalayas (> 160 m) o llega al muelle (< 45 m); antes de empezar, si vuelve a las Atalayas (< 60 m), están otra vez allí.
     Tuerca se queda en las Atalayas con sus faroles. arco.js deja de colocarlos y les pasa la charla (G.v18muelle.elenco()).
   - Historia: los vecinos del embarcadero pidieron un muelle para subir a las canoas sin mojarse. El Constructor, que ya aprendió a
     mirar primero, hace su primer proyecto bueno con el plano de la Ingeniera.
   - Pasos (estado G.v18.mundo.arco_muelle: inicio → plan → medido → materiales → construido; solo avanza):
     1 llegada (bocadillos) · 2 reunión (caja) · 3 marcar 3 boyas en el río (volar o nadar; con un poder OJOS brillan más) ·
     4 recuperar 4 tablas que el río llevó aguas abajo · 5 sostener la tabla 3 s mientras los dos la clavan (el Constructor por fin
     usa su animación Reparar para algo bueno) · 6 el muelle aparece (se guarda antes de los efectos) y se camina hasta el agua ·
     7 apariencias nuevas del mismo modelo: el Constructor «maestro de obra» y la Ingeniera «jefa de obra» · 8 todo persiste.
   - XP V18.2: 100 al terminar, una sola vez. Prueba: dentro de AV.v18ArcoTest() (src/boot.js junta las dos). */
window.AVV18Muelle = function (G) {
  'use strict';
  if (G.v18muelle) return G.v18muelle;
  const V = G.v18 || window.AVV18Progreso(G);
  const N = G.v18npc;
  const S = G.S, T = G.terreno, scene = G.renderer.scene;
  const ID = 'arco_muelle';
  const ESTADOS = ['inicio', 'plan', 'medido', 'materiales', 'construido'];
  const XP_FIN = 100, R_VISTA = 220, R_REUNION = 8, R_LLEGADA = 28, R_HUD = 40, R_AVISO = 45, SOSTENER_S = 3;
  const R_TOMA_LEJOS = 160, R_TOMA_CERCA = 45, R_DEVUELVE = 60;
  const ATALAYAS = { x: -69.2, z: 68.4 };
  // Medido en el mapa real: la plaza del embarcadero (content/cap1/mundo.js) y el río Amazonas (agua.rio, nivel 13 m, x ≈ −114,3 aquí)
  const SITIO = { plaza: { x: -128.4, z: 7.7 }, a: { x: -125.5, z: -4.2 }, ing: { x: -124.6, z: -1.6 }, con: { x: -125.4, z: -6.8 } };
  const CANOAS = [[-116.9, 2.9], [-115.2, 6.6]];
  const TXT = {
    titulo: 'El muelle de la otra orilla',
    aviso: 'En el Embarcadero de las Canoas el Constructor prepara su primera obra buena… La bandera verde te lleva.',
    llegada: [['constructor', 'Vittata, ¡mi primer proyecto bueno! Lo pidieron los vecinos del embarcadero.'], ['ingeniera', 'Y el plano lo hicimos juntos: un muelle para subir a las canoas sin mojarse.']],
    reunion: [['ingeniera', '¡Hola, Vittata! Antes de clavar nada, hay que saber dónde está firme el fondo.'], ['constructor', 'Antes yo clavaba primero y preguntaba después. Hoy no.'],
      ['ingeniera', 'Vuela sobre el río y marca las tres boyas: donde flotan quietas, va un poste.']],
    boya: 'Marcar la boya', boyaN: 'Boya marcada: aquí el fondo está firme. ({}/3)',
    ojos: 'Tus ojos ven las boyas aunque las tape el agua: brillan sobre el río.',
    medido: [['ingeniera', '¡Tres sitios firmes para tres postes! Ahora faltan tablas.'], ['constructor', 'El río se llevó cuatro tablas aguas abajo. ¿Nos ayudas a buscarlas?']],
    tabla: 'Recoger tabla', tablaN: '+1 tabla para el muelle ({}/4)',
    materiales: [['constructor', '¡Las cuatro! Sostén la primera tabla y nosotros la clavamos.']],
    sostener: 'Sostener la tabla del muelle', sosteniendo: 'Sostén la tabla… {}%', suelta: '¡No sueltes la tabla! Vuelve a la orilla.',
    construido: '¡El muelle de la otra orilla está listo! Ya se sube a las canoas sin mojarse.',
    fin: [['constructor', 'Mi primera obra buena… y la pidió el barrio. ¡Qué orgullo!'], ['ingeniera', 'Tú marcaste las boyas, él clavó las tablas y yo hice el plano. ¡Equipo!']],
    obj: { inicio: 'Ve al Embarcadero de las Canoas: el Constructor te espera junto al río.', plan: 'Marca las boyas del río: {}/3', medido: 'Busca las tablas río abajo: {}/4', materiales: 'Sostén la tabla en la orilla para clavarla.' },
    hablarIng: 'Hablar con la Ingeniera', hablarCon: 'Hablar con el Constructor'
  };
  const con = (t, ...v) => { let i = 0; return t.replace(/\{\}/g, () => String(v[i++])); };
  const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 3200); } catch (e) { /* sin interfaz */ } };
  const fx = (k, x, y, z, n) => { try { G.fx.burst(x, y, z, k, n || 8); } catch (e) { /* sin fx */ } };
  const emitir = ev => { try { G.emit('v18muelle', ev); } catch (e) { /* sin oyentes */ } };
  const guardarJuego = () => { try { if (G.guardado.save) G.guardado.save(true); else G.guardado.autosave(); } catch (e) { /* sin guardado */ } };
  const alto = (x, z) => T.height(x, z);
  const nivelAgua = (x, z) => { try { return G.agua ? G.agua.levelAt(x, z) : -Infinity; } catch (e) { return -Infinity; } };
  const mojado = (x, z) => nivelAgua(x, z) > alto(x, z) - 0.2;

  // ---------- Estado ----------
  const estado = () => { const e = V.mundo(ID); return ESTADOS.indexOf(e) >= 0 ? e : 'inicio'; };
  const rango = e => ESTADOS.indexOf(e);
  const hecho = () => estado() === 'construido';
  function avanzar(e) { if (rango(e) <= rango(estado())) return false; V.cambiarMundo(ID, e); emitir({ tipo: 'estado', estado: e }); return true; }
  const claveBoya = i => 'v18_muelle_boya_' + i, claveTabla = i => 'v18_muelle_tabla_' + i;
  const boyaLista = i => V.mundo(claveBoya(i)) === 'marcada', tablaLista = i => V.mundo(claveTabla(i)) === 'recogida';
  const A = { manual: false, forzar: false, avisado: false, llegada: false, reuniendo: false, ojos: false, tengo: false, sost: 0, sosteniendo: false };
  const M = { valido: false, hecho: false, eje: null, rampas: [], boyas: [], tablas: [] };
  const arcoHecho = () => V.mundo('arco_atalayas') === 'encendido';
  const listo = () => !!(G.V18 || A.forzar) && arcoHecho() && M.valido && (!G.zonas || !G.zonas.activa || G.zonas.dentro(SITIO.plaza.x, SITIO.plaza.z));
  const dist = (p, q) => Math.hypot(p.x - q.x, p.z - q.z);
  function calcElenco() {
    if (!listo()) return false;
    if (rango(estado()) > 0) return true;
    const dA = dist(S.pos, ATALAYAS), dM = dist(S.pos, SITIO.a);
    if (dA > R_TOMA_LEJOS || dM < R_TOMA_CERCA) return true;
    return dA < R_DEVUELVE ? false : A.tengo;
  }

  // ---------- El muelle (medido sobre el río real al arrancar) ----------
  // eje: de A (en la orilla, junto a la plaza) hacia el este, al agua. sAgua = primer punto mojado; el muelle va de sAgua − 2 a sAgua + 4,5
  const en = (s, l) => ({ x: SITIO.a.x + s, z: SITIO.a.z + (l || 0) });
  function medirEje() {
    let sAgua = null;
    for (let s = 0; s <= 12; s += 0.25) { const p = en(s); if (mojado(p.x, p.z)) { sAgua = s; break; } }
    if (sAgua == null || sAgua < 2.5) return null;
    const s0 = sAgua - 3, s1 = sAgua + 4.5, pf = en(s1), pa = en(sAgua + 0.5);
    if (!mojado(pf.x, pf.z) || !mojado(pa.x, pa.z)) return null;
    const cubierta = nivelAgua(pa.x, pa.z) + 0.5, p0 = en(s0), h0 = alto(p0.x, p0.z) + 0.03;
    if (Math.abs(h0 - cubierta) > 2.5) return null; // la orilla tiene que estar cerca del agua (rampa suave)
    // Perfil (como la escalera de puerto.js): envolvente superior del terreno (+ holgura) y de la cubierta sobre el agua; cada tramo
    // recto es una rampa del terreno. Donde el borde de la orilla asomara por encima de las tablas, mandaría su pendiente y no se pasaría.
    const pts = [];
    for (let s = s0; s <= s1 + 1e-6; s += 0.25) { const q = en(Math.min(s, s1)), sc = Math.min(s, s1); pts.push([sc, Math.max(alto(q.x, q.z) + (sc < s0 + 0.1 ? 0.03 : 0.14), sc >= sAgua ? cubierta : -Infinity)]); }
    const h = [];
    for (const q of pts) { while (h.length >= 2) { const [a, b] = [h[h.length - 2], h[h.length - 1]]; if ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) >= 0) h.pop(); else break; } h.push(q); }
    const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]), perfil = [h[0]];
    for (let i = 1; i < h.length - 1; i++) if (Math.abs(ang(perfil[perfil.length - 1], h[i]) - ang(h[i], h[i + 1])) > 0.087) perfil.push(h[i]);
    perfil.push(h[h.length - 1]);
    let pend = 0; for (let i = 0; i < perfil.length - 1; i++) pend = Math.max(pend, Math.abs(ang(perfil[i], perfil[i + 1])) * 180 / Math.PI);
    if (pend > 35) return null;
    return { sAgua, s0, s1, cubierta: perfil[perfil.length - 1][1], h0, perfil, pend };
  }
  const yMuelle = s => { const r = M.eje.perfil; for (let i = 0; i < r.length - 1; i++) if (s <= r[i + 1][0] || i === r.length - 2) { const t = Math.max(0, Math.min(1, (s - r[i][0]) / (r[i + 1][0] - r[i][0]))); return r[i][1] + (r[i + 1][1] - r[i][1]) * t; } return r[0][1]; };

  // ---------- Escena (piezas simples) ----------
  const mats = {};
  const mat = (k, c, o) => mats[k] || (mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(c).convertSRGBToLinear(), roughness: 0.75, metalness: 0 }, o || {})));
  const caja = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cil = (r0, r1, h, n, m) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, n || 10), m);
  const raiz = new THREE.Group(); raiz.name = 'v18-muelle'; raiz.visible = false; scene.add(raiz);
  const grupo = (n, padre) => { const g = new THREE.Group(); g.name = n; (padre || raiz).add(g); return g; };
  let gMuelle, gPlano, gBoyas = [], gTablas = [];
  function enSeco(x, z) {
    const seco = (px, pz) => { try { if (mojado(px, pz)) return false; const F = G.fisica, q = { x: px, z: pz, y: alto(px, pz) }; if (F && F.pushOut) for (const c of F.colliders) { F.pushOut(q, c, 0.7); if (q.x !== px || q.z !== pz) return false; } } catch (e) { /* */ } return true; };
    if (seco(x, z)) return { x, z };
    for (let r = 1; r <= 4; r += 1) for (let a = 0; a < 8; a++) { const px = x + Math.cos(a * 0.785) * r, pz = z + Math.sin(a * 0.785) * r; if (seco(px, pz)) return { x: px, z: pz }; }
    return { x, z };
  }
  function construir() {
    if (M.hecho) return;
    M.hecho = true;
    const E = M.eje, madera = mat('madera', '#9a6a3c'), maderaO = mat('maderaO', '#6e4a2a'), o3 = new THREE.Object3D();
    const brillo = mat('brillo', '#fff1a8', { emissive: new THREE.Color('#ffd84a'), emissiveIntensity: 0.8, transparent: true, opacity: 0.85 });
    const luz = mat('luz', '#ffd98a', { emissive: new THREE.Color('#ffb84a'), emissiveIntensity: 1.3 });
    // 2 · el plano de la obra: estacas con cinta en la orilla (solo antes de construir)
    gPlano = grupo('v18-muelle-plano');
    for (const [s, l] of [[E.s0, -1.1], [E.s0, 1.1], [E.sAgua, -1.1], [E.sAgua, 1.1]]) { const p = en(s, l), o = cil(0.04, 0.04, 0.9, 5, mat('estaca', '#c9a86a')); o.position.set(p.x, alto(p.x, p.z) + 0.45, p.z); gPlano.add(o); }
    const cinta = caja(E.sAgua - E.s0, 0.03, 0.05, mat('cinta', '#ffd23a')); const pc = en((E.s0 + E.sAgua) / 2, 1.1); cinta.position.set(pc.x, alto(pc.x, pc.z) + 0.8, pc.z); gPlano.add(cinta);
    const cinta2 = cinta.clone(); const pc2 = en((E.s0 + E.sAgua) / 2, -1.1); cinta2.position.set(pc2.x, alto(pc2.x, pc2.z) + 0.8, pc2.z); gPlano.add(cinta2);
    // 6 · el muelle: tablas, postes, barandilla a un lado, dos faroles y banderines lisos
    gMuelle = grupo('v18-muelle-obra');
    const largo = E.s1 - E.s0, n = Math.floor(largo / 0.4), tablas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.36, 0.08, 2.0), madera, n + 1);
    for (let i = 0; i <= n; i++) { const s = Math.min(E.s1, E.s0 + i * 0.4 + 0.2), p = en(s); o3.position.set(p.x, yMuelle(s) - 0.05, p.z); o3.rotation.set(0, 0, 0); o3.updateMatrix(); tablas.setMatrixAt(i, o3.matrix); }
    gMuelle.add(tablas);
    const postes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.1, 1, 8), maderaO, 6); let k = 0;
    for (const s of [E.sAgua + 0.6, E.sAgua + 2.6, E.s1 - 0.1]) for (const l of [-1.0, 1.0]) { const p = en(s, l), yb = Math.min(alto(p.x, p.z), E.cubierta - 1.6), h = E.cubierta + 0.9 - yb; o3.position.set(p.x, yb + h / 2, p.z); o3.scale.set(1, h, 1); o3.updateMatrix(); postes.setMatrixAt(k++, o3.matrix); }
    o3.scale.set(1, 1, 1); gMuelle.add(postes);
    const bar = caja(E.s1 - E.sAgua, 0.07, 0.07, madera); const pb = en((E.sAgua + E.s1) / 2, 1.0); bar.position.set(pb.x, E.cubierta + 0.9, pb.z); gMuelle.add(bar);
    const faroles = [];
    for (const s of [E.s0 + 0.2, E.s1 - 0.1]) { const p = en(s, -1.0), y = yMuelle(s), po = cil(0.05, 0.06, 1.8, 6, mat('negro', '#2c2a28', { metalness: 0.4 })); po.position.set(p.x, y + 0.9, p.z); const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), luz); b.position.set(p.x, y + 1.9, p.z); gMuelle.add(po, b); faroles.push({ x: p.x, y: y + 1.85, z: p.z }); }
    const COLS = ['#3fae5a', '#ffd23a', '#f08a2a', '#2bb3b1', '#9b6ad0'], nB = 10, tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.14, 0, 0, 0.14, 0, 0, 0, -0.3, 0], 3)); tri.computeVertexNormals();
    const ban = new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), nB), [f0, f1] = faroles;
    for (let i = 0; i < nB; i++) { const t = (i + 0.5) / nB; o3.position.set(f0.x + (f1.x - f0.x) * t, f0.y + (f1.y - f0.y) * t - Math.sin(Math.PI * t) * 0.5, f0.z); o3.rotation.set(0, 0, 0); o3.updateMatrix(); ban.setMatrixAt(i, o3.matrix); ban.setColorAt(i, new THREE.Color(COLS[i % COLS.length]).convertSRGBToLinear()); }
    gMuelle.add(ban);
    // rampa del terreno: de la orilla al agua y la cubierta; solo sostiene con el muelle hecho
    for (let i = 0; i < E.perfil.length - 1; i++) {
      const [sa, ya] = E.perfil[i], [sb, yb] = E.perfil[i + 1], a = en(sa), b = en(sb);
      const pl = T.addPlatform({ tipo: 'rampa', a: [a.x, ya, a.z], b: [b.x, yb, b.z], ancho: 2.0, id: 'v18_muelle' }); pl.when = hecho; M.rampas.push(pl);
    }
    // 3 · las boyas (en el agua, a los lados del eje del muelle)
    const boyaMat = mat('boya', '#f08a2a', { roughness: 0.5 });
    for (const [s, l] of [[E.sAgua + 1.6, 2.6], [E.sAgua + 3.4, -2.6], [E.s1 + 1.8, 0]]) {
      const p = en(s, l), i = gBoyas.length, g = grupo('v18-muelle-boya-' + i); g.position.set(p.x, nivelAgua(p.x, p.z), p.z);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), boyaMat); b.position.y = 0.1; g.add(b);
      const m = cil(0.03, 0.03, 0.6, 5, mats.negro); m.position.y = 0.55; g.add(m);
      const banda = cil(0.29, 0.29, 0.08, 12, mat('blanco', '#f2efe6')); banda.position.y = 0.12; g.add(banda);
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), brillo); aura.position.y = 0.95; aura.name = 'aura'; g.add(aura);
      gBoyas.push(g); M.boyas.push(p);
      G.interaccion.add({ id: 'v18_puerto_muelle_boya_' + i, x: p.x, z: p.z, r: 3, visible: () => listo() && A.tengo && estado() === 'plan' && !boyaLista(i), label: () => TXT.boya, use: () => marcar(i) });
    }
    // 4 · las tablas que el río llevó aguas abajo (tres en la orilla y una en el agua)
    for (const [s, l, agua] of [[E.sAgua - 1.5, -9], [E.sAgua - 4, -15], [E.sAgua + 2.5, -12, true], [E.s0 - 4, -20]]) {
      let p = en(s, l); if (!agua) p = enSeco(p.x, p.z);
      const i = gTablas.length, g = grupo('v18-muelle-tabla-' + i), y = agua ? Math.max(nivelAgua(p.x, p.z), alto(p.x, p.z)) : alto(p.x, p.z);
      const o = caja(1.4, 0.07, 0.32, madera); o.position.y = 0.05; o.rotation.y = 0.4 + i; g.add(o);
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), brillo); aura.position.y = 0.45; g.add(aura);
      g.position.set(p.x, y, p.z); gTablas.push(g); M.tablas.push(p);
      G.interaccion.add({ id: 'v18_puerto_muelle_tabla_' + i, x: p.x, z: p.z, r: 2.4, visible: () => listo() && A.tengo && estado() === 'medido' && !tablaLista(i), label: () => TXT.tabla, use: () => recoger(i) });
    }
    // 5 · sostener la tabla en la orilla
    const ps = en(E.s0 + 0.4);
    M.sostener = ps;
    G.interaccion.add({ id: 'v18_puerto_muelle_sostener', x: ps.x, z: ps.z, r: 2.6, visible: () => listo() && A.tengo && estado() === 'materiales' && !A.sosteniendo, label: () => TXT.sostener, use: sostener });
    for (const k of ['ing', 'con']) { const p = enSeco(SITIO[k].x, SITIO[k].z); SITIO[k].x = p.x; SITIO[k].z = p.z; }
  }

  // ---------- Charlas ----------
  const decir = (who, textos, fin, opts) => N.decir(who, textos, fin, opts);
  function charla(lista, fin, opts) { const ir = i => { if (i >= lista.length) { if (fin) fin(); return; } decir(lista[i][0], [lista[i][1]], () => ir(i + 1), opts); }; ir(0); }
  function objetivo() {
    const e = estado();
    if (e === 'inicio') return TXT.obj.inicio;
    if (e === 'plan') return con(TXT.obj.plan, M.boyas.filter((p, i) => boyaLista(i)).length);
    if (e === 'medido') return con(TXT.obj.medido, M.tablas.filter((p, i) => tablaLista(i)).length);
    if (e === 'materiales') return A.sosteniendo ? con(TXT.sosteniendo, Math.round(A.sost / SOSTENER_S * 100)) : TXT.obj.materiales;
    return '';
  }
  function usar(id) {
    const e = estado();
    if (e === 'inicio') return reunion();
    if (e === 'construido') return N.decir(id, (N.def(id).porEstado[N.estado(id)] || {}).dialogo || []);
    return N.decir(id, [objetivo()]);
  }

  // ---------- Aplicar el estado guardado ----------
  function deducir() {
    if (!hecho()) return;
    // partida con la misión hecha pero sin las claves de personaje: se recorre la cadena declarada
    for (const [id, cadena] of [['constructor', ['reparador', 'vecino', 'maestro_obra']], ['ingeniera', ['responsable', 'rescate', 'jefa_obra']]]) for (const e of cadena) N.cambiarEstado(id, e);
  }
  function colocarElenco() {
    const fin = hecho(), ve = () => A.tengo && listo(), E = M.eje;
    const pi = fin ? en(E.sAgua + 1, -0.4) : A.sosteniendo ? en(E.s0 + 0.9, 0.7) : SITIO.ing, pc = fin ? en(E.s0 - 1.2, 1.6) : A.sosteniendo ? en(E.s0 + 0.9, -0.7) : SITIO.con;
    const mira = p => Math.atan2(SITIO.a.x + 6 - p.x, SITIO.a.z - p.z);
    const anim = A.sosteniendo ? 'trabajar' : fin ? null : null;
    N.colocar('ingeniera', { x: pi.x, z: pi.z, caminar: true, rotY: mira(pi), anim, aparece: ve, comenta: fin });
    N.colocar('constructor', { x: pc.x, z: pc.z, caminar: true, rotY: mira(pc), anim, aparece: ve, comenta: fin });
  }
  function aplicar() {
    if (!M.valido) return false;
    construir();
    deducir();
    const e = estado(), fin = e === 'construido', ver = A.tengo && listo();
    gPlano.visible = ver && !fin; gMuelle.visible = fin && (ver || arcoHecho());
    gBoyas.forEach((g, i) => { g.visible = ver && (fin || rango(e) >= rango('plan')); g.getObjectByName('aura').visible = e === 'plan' && !boyaLista(i); });
    gTablas.forEach((g, i) => { g.visible = ver && e === 'medido' && !tablaLista(i); });
    if (ver) colocarElenco();
    if (fin) despejar();
    pagarXP();
    return true;
  }
  // los árboles del pasillo del muelle (±1,6 m), solo con el muelle hecho (como la escalera del puerto, G.vegetacion.despejar)
  function despejar() {
    const Vg = G.vegetacion; if (M.despejado || !Vg || !Vg.despejar || !Vg.instancias || !Object.keys(Vg.instancias).length) return 0;
    M.despejado = true;
    const E = M.eje, enPaso = (x, z) => { const s = x - SITIO.a.x; return s > E.s0 - 1.5 && s < E.s1 + 0.5 && Math.abs(z - SITIO.a.z) < 1.6; };
    return Vg.despejar(SITIO.a.x + E.s0 - 1.5, SITIO.a.z - 1.6, SITIO.a.x + E.s1 + 0.5, SITIO.a.z + 1.6, enPaso);
  }
  function revisarElenco() {
    const t = calcElenco();
    if (t === A.tengo) return false;
    A.tengo = t;
    try { if (G.v18arco && G.v18arco.aplicar) G.v18arco.aplicar(); } catch (er) { /* sin arco */ }
    aplicar();
    emitir({ tipo: 'elenco', aqui: t });
    return true;
  }

  // ---------- Pasos del jugador ----------
  function reunion() {
    if (estado() !== 'inicio' || !A.tengo) return false;
    if (A.reuniendo && G.dialogo && G.dialogo.activo && G.dialogo.activo()) return false;
    A.reuniendo = true; quitarGuia();
    charla(TXT.reunion, () => { A.reuniendo = false; if (avanzar('plan')) aplicar(); });
    return true;
  }
  function marcar(i) {
    if (estado() !== 'plan' || boyaLista(i) || !V.cambiarMundo(claveBoya(i), 'marcada')) return false;
    const p = M.boyas[i], n = M.boyas.filter((q, k) => boyaLista(k)).length;
    sonar('pickup'); fx('bubbles', p.x, nivelAgua(p.x, p.z) + 0.5, p.z, 10); fx('stars', p.x, nivelAgua(p.x, p.z) + 1, p.z, 6);
    toast(con(TXT.boyaN, n), 3000); emitir({ tipo: 'boya', id: i, n });
    aplicar();
    if (n >= M.boyas.length && avanzar('medido')) { aplicar(); charla(TXT.medido, null, { libre: true, caja: false }); }
    return true;
  }
  function recoger(i) {
    if (estado() !== 'medido' || tablaLista(i) || !V.cambiarMundo(claveTabla(i), 'recogida')) return false;
    const p = M.tablas[i], n = M.tablas.filter((q, k) => tablaLista(k)).length;
    sonar('pickup'); fx('leaves', p.x, alto(p.x, p.z) + 0.5, p.z, 10);
    toast(con(TXT.tablaN, n), 2600); emitir({ tipo: 'tabla', id: i, n });
    aplicar();
    if (n >= M.tablas.length && avanzar('materiales')) { aplicar(); charla(TXT.materiales, null, { libre: true, caja: false }); }
    return true;
  }
  function sostener() {
    if (estado() !== 'materiales' || A.sosteniendo) return false;
    A.sosteniendo = true; A.sost = 0; colocarElenco(); sonar('ring', 2); emitir({ tipo: 'sostener', fase: 'empieza' });
    return true;
  }
  function pasoSostener(dt) {
    if (!A.sosteniendo) return;
    if (dist(S.pos, M.sostener) > 3.6) { A.sosteniendo = false; A.sost = 0; toast(TXT.suelta, 2400); colocarElenco(); N.colocar('ingeniera', { anim: null }); N.colocar('constructor', { anim: null }); emitir({ tipo: 'sostener', fase: 'suelta' }); return; }
    A.sost += dt;
    if (Math.floor(A.sost * 3) !== Math.floor((A.sost - dt) * 3)) { const p = M.sostener; fx('dust', p.x, alto(p.x, p.z) + 0.4, p.z, 4); sonar('pickup'); }
    if (A.sost >= SOSTENER_S) { A.sosteniendo = false; A.sost = 0; construido(); }
  }
  function construido() {
    if (estado() !== 'materiales') return false;
    if (!avanzar('construido')) return false; // primero se guarda; luego los efectos
    V.otorgar('arco_muelle', 'arco_muelle', 1);
    N.cambiarEstado('constructor', 'maestro_obra'); N.cambiarEstado('ingeniera', 'jefa_obra');
    N.colocar('ingeniera', { anim: null }); N.colocar('constructor', { anim: null });
    aplicar(); guardarJuego(); sonar('unlock');
    const E = M.eje; for (const s of [E.s0, E.sAgua, E.s1]) { const p = en(s); fx('stars', p.x, yMuelle(s) + 1, p.z, 10); fx('feathers', p.x, yMuelle(s) + 0.8, p.z, 8); }
    try { G.camara.shake(0.05, 0.3); } catch (e) { /* */ }
    toast(TXT.construido, 4800);
    timers.push({ t: G.quiet ? 0 : 0.9, fn: () => charla(TXT.fin) });
    emitir({ tipo: 'construido' });
    return true;
  }
  function pagarXP() {
    if (!hecho() || !G.v18evo || !G.v18evo.dar || V.otorgado('xp_muelle')) return 0;
    if (!V.otorgar('xp_muelle', 'xp_muelle', 1)) return 0;
    return G.v18evo.dar(V.seleccionada() || 'vittata', XP_FIN, 'muelle') || 0;
  }

  // ---------- Aviso y bandera del minimapa ----------
  const guia = { x: SITIO.plaza.x, z: SITIO.plaza.z, puesta: false };
  function ponerGuia() {
    if (guia.puesta || !G.minimapa || !G.minimapa.fijarDestino) return;
    let otra = null; try { otra = (G.minimapa.marcadores ? G.minimapa.marcadores() : []).find(m => m.tipo === 'dest' && !m.auto); } catch (e) { otra = null; }
    if (otra) return;
    try { G.minimapa.fijarDestino(guia.x, guia.z); guia.puesta = true; } catch (e) { /* */ }
  }
  function quitarGuia() {
    if (!guia.puesta) return; guia.puesta = false;
    try { const d = (G.minimapa.marcadores ? G.minimapa.marcadores() : []).find(m => m.tipo === 'dest' && !m.auto); if (d && Math.abs(d.x - guia.x) < 1 && Math.abs(d.z - guia.z) < 1) G.minimapa.quitarDestino(); } catch (e) { /* */ }
  }

  // ---------- HUD (el mismo estilo que el del puerto y las Atalayas) ----------
  let hud = null;
  function montarHud() {
    if (hud) return hud;
    const st = document.createElement('style'); st.id = 'v18-muelle-css';
    st.textContent = '#v18-muelle{position:fixed;top:calc(env(safe-area-inset-top,0px) + 92px);left:0;right:0;margin-inline:auto;width:min(340px,calc(100vw - 32px));z-index:40;' +
      'font-family:inherit;color:#fff;background:rgba(28,32,44,.78);border-radius:16px;padding:8px 12px;text-align:center;pointer-events:none}' +
      '#v18-muelle[hidden]{display:none}#v18-muelle .vm-t{font-weight:700;font-size:13px;letter-spacing:.04em;color:#ffe28a}#v18-muelle .vm-o{font-size:15px;margin-top:2px;text-wrap:pretty}' +
      '#v18-muelle .vm-b{height:8px;border-radius:4px;background:rgba(255,255,255,.2);margin-top:6px;overflow:hidden}#v18-muelle .vm-b i{display:block;height:100%;width:0;background:#7dff9a}' +
      '@media (max-width:760px){body.v18-muelle-on #quest{display:none}body.v18-muelle-on #minimapa{visibility:hidden}#v18-muelle{top:calc(env(safe-area-inset-top,0px) + 64px)}}body.v18-muelle-on #toast{z-index:41}';
    document.head.appendChild(st);
    const el = document.createElement('div'); el.id = 'v18-muelle'; el.hidden = true; el.setAttribute('role', 'status'); el.setAttribute('aria-labelledby', 'vm-t');
    el.innerHTML = '<div class="vm-t" id="vm-t">' + TXT.titulo + '</div><div class="vm-o" data-k="obj"></div><div class="vm-b" data-k="barra" aria-hidden="true" hidden><i></i></div>';
    document.body.appendChild(el);
    hud = { el, q: k => el.querySelector('[data-k="' + k + '"]') };
    return hud;
  }
  function pintarHud(ver) {
    montarHud();
    const mostrar = !!ver && !hecho();
    if (hud.el.hidden === mostrar) hud.el.hidden = !mostrar;
    document.body.classList.toggle('v18-muelle-on', mostrar);
    if (!mostrar) return;
    const o = objetivo(), q = hud.q('obj'); if (q.textContent !== o) q.textContent = o;
    const vivo = A.sosteniendo ? 'off' : 'polite'; if (q.getAttribute('aria-live') !== vivo) q.setAttribute('aria-live', vivo);
    const b = hud.q('barra'); b.hidden = !A.sosteniendo; if (A.sosteniendo) b.firstChild.style.width = Math.round(A.sost / SOSTENER_S * 100) + '%';
  }

  // ---------- Paso ----------
  function libre() {
    const $ = id => document.getElementById(id), oculto = id => !$(id) || $(id).hidden;
    try { if ($('c1-fade') || (G.dialogo && G.dialogo.open && G.dialogo.open()) || G.ui.cardOpen || (G.ui.busy && G.ui.busy())) return false; return oculto('end') && oculto('comic') && oculto('creator'); } catch (e) { return false; }
  }
  const timers = [];
  function paso(dt, busy) {
    if (!M.valido || !M.hecho) return;
    for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
    revisarElenco();
    const ver = A.tengo && listo(), dP = dist(S.pos, SITIO.plaza), cerca = dP < R_VISTA;
    const verRaiz = (ver || (hecho() && arcoHecho())) && cerca;
    if (raiz.visible !== verRaiz) raiz.visible = verRaiz;
    if (gPlano.visible !== (ver && !hecho())) aplicar();
    if (!ver) { pintarHud(false); return; }
    const e = estado();
    if (e === 'inicio' && !A.avisado && !busy) { A.avisado = true; if (dP > R_AVISO) { toast(TXT.aviso, 5200); ponerGuia(); } }
    if (!cerca) { pintarHud(false); return; }
    const dA = dist(S.pos, SITIO.a);
    if (e === 'inicio' && !A.llegada && dA < R_LLEGADA && !busy && libre() && N.instancia('constructor') && N.instancia('ingeniera')) { A.llegada = true; charla(TXT.llegada, null, { libre: true, caja: false }); }
    if (e === 'inicio' && dA < R_REUNION && !busy && libre()) reunion();
    if (e === 'plan' && !A.ojos) { let ojos = false; try { const sp = V.seleccionada && V.seleccionada(), h = G.v18hab && G.v18hab.get(G.v18hab.poderDe(sp || 'vittata')); ojos = !!(h && h.tecnica === 'ojos'); } catch (er) { ojos = false; } if (ojos) { A.ojos = true; toast(TXT.ojos, 3600); } }
    const t = performance.now();
    gBoyas.forEach((g, i) => { g.position.y = nivelAgua(M.boyas[i].x, M.boyas[i].z) + Math.sin(t / 500 + i) * 0.06; const au = g.getObjectByName('aura'); if (au.visible) au.scale.setScalar((A.ojos ? 1.6 : 1) + Math.sin(t / 300) * 0.15); });
    pasoSostener(dt);
    pintarHud(dP < R_HUD + 15 && (e !== 'inicio' || dA < R_REUNION + 6) && !busy);
  }
  G.on('update', (dt, busy) => { if (!A.manual) paso(Math.min(dt, 0.1), busy); }, 75);
  G.on('apply', () => setTimeout(() => { A.sosteniendo = false; A.reuniendo = false; revisarElenco(); aplicar(); }, 0), 99);
  G.on('v18', ev => { if (ev && ev.tipo === 'mundo' && (ev.id === ID || /^v18_muelle_/.test(ev.id || '') || ev.id === 'arco_atalayas')) aplicar(); if (ev && ev.tipo === 'evo') pagarXP(); });

  function validar() {
    if (!T.mapa) return false;
    M.eje = medirEje();
    if (!M.eje) return false;
    const pf = en(M.eje.s1);
    return !mojado(SITIO.plaza.x, SITIO.plaza.z) && CANOAS.every(([x, z]) => Math.hypot(pf.x - x, pf.z - z) > 4 && Math.hypot(en(M.eje.sAgua).x - x, en(M.eje.sAgua).z - z) > 4);
  }
  function iniciar() { if (M.valido) return true; M.valido = validar(); if (M.valido) { aplicar(); revisarElenco(); } return M.valido; }
  Promise.resolve(G.mundo && G.mundo.listo).then(iniciar, iniciar);
  Promise.resolve(G.vegetacion && G.vegetacion.listo).then(() => { if (M.valido && hecho()) despejar(); }, () => {});
  if (G.v18evo) pagarXP();

  // =====================================================================================================================
  // Prueba (va dentro de AV.v18ArcoTest): la misión 3 de punta a punta con E, la física a pie por el muelle y su guardado.
  // =====================================================================================================================
  let v18Test = null;
  G.on('v18', e => { if (v18Test) v18Test(e); }, 10);
  const textos = () => {
    const t = [TXT.titulo, TXT.aviso, TXT.boya, TXT.ojos, TXT.tabla, TXT.sostener, TXT.suelta, TXT.construido, TXT.hablarIng, TXT.hablarCon,
      con(TXT.boyaN, 1), con(TXT.tablaN, 2), con(TXT.sosteniendo, 50), TXT.obj.inicio, con(TXT.obj.plan, 1), con(TXT.obj.medido, 2), TXT.obj.materiales]
      .concat([TXT.llegada, TXT.reunion, TXT.medido, TXT.materiales, TXT.fin].flatMap(l => l.map(x => x[1])));
    for (const id of ['constructor', 'ingeniera']) { const d = N.def(id); t.push(d.nombre.es); for (const e in d.porEstado) t.push(...(d.porEstado[e].dialogo || [])); }
    return t;
  };
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name: 'Muelle · ' + name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const esperar = ms => new Promise(r => setTimeout(r, ms));
    try { await G.mundo.listo; } catch (e) { /* */ }
    iniciar();
    const tit = document.getElementById('title'), titAbierta = !!(tit && tit.open), cre = document.getElementById('creator'), creOculto = cre ? cre.hidden : true;
    if (titAbierta) tit.open = false; if (cre) cre.hidden = true; try { G.pausa.sincronizar(); } catch (e) { /* */ }
    let crudo = null; try { crudo = localStorage.getItem(V.clave()); } catch (e) { /* */ }
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing && { x: S.facing.x, z: S.facing.z };
    const misiones = () => ({ m: JSON.stringify(S.missions), s: S.step, f: S.complete, e: JSON.stringify(S.events), c: JSON.stringify(S.collected), u: JSON.stringify(S.unlocked) });
    const difMis = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]).map(k => k + ': ' + String(a[k]).slice(0, 80) + ' → ' + String(b[k]).slice(0, 80));
    const susp = G.guardado.suspender, toast0 = G.ui.toast, toasts = [];
    G.ui.toast = t => { toasts.push(String(t)); };
    if (susp) susp(true);
    A.manual = true;
    const F = G.fisica, MV = F.MOVE, AR = G.v18arco, PU = G.v18puerto;
    const manual0 = [AR && AR.sesion ? AR.sesion().manual : false, PU && PU.sesion ? PU.sesion().manual : false];
    if (AR && AR.sesion) AR.sesion().manual = true; if (PU && PU.sesion) PU.sesion().manual = true;
    const cambios = [], vigilar = fn => { const a = misiones(), i0 = JSON.stringify(S.inv || {}); const r = fn(); const d = difMis(a, misiones()); if (JSON.stringify(S.inv || {}) !== i0) d.push('inv'); if (d.length) cambios.push(...d); return r; };
    const correr = (s, h) => vigilar(() => { h = h || 1 / 30; for (let t = 0; t < s; t += h) { paso(h, false); N.paso(h, false); } });
    const ir = (x, z, mirar, y) => {
      S.pos.x = x; S.pos.z = z; S.pos.y = y != null ? y : alto(x, z) + 0.02; S.vy = 0; MV.flying = y != null; MV.swimming = false; MV.grounded = y == null; MV.vx = MV.vz = 0;
      if (mirar && S.facing) { const dx = mirar.x - x, dz = mirar.z - z, d = Math.hypot(dx, dz) || 1; S.facing.x = dx / d; S.facing.z = dz / d; }
    };
    const tecla = (k, tipo) => window.dispatchEvent(new KeyboardEvent(tipo || 'keydown', { key: k, bubbles: true, cancelable: true }));
    const pulsar = k => vigilar(() => { tecla(k); tecla(k, 'keyup'); });
    const cerrarCharlas = () => { for (let i = 0; i < 16 && G.dialogo.open(); i++) pulsar('e'); try { G.dialogo.cancelarLibre && G.dialogo.cancelarLibre(); } catch (e) { /* */ } };
    const geos = () => (G.renderer.renderer && G.renderer.renderer.info.memory.geometries) || 0;
    const colorDe = (ms, nom) => { const m = ms.find(x => x.name === nom); return m ? '#' + m.color.clone().convertLinearToSRGB().getHexString() : null; };
    const puntoPara = (cx, cz, r, id) => { for (const rr of [r, r * 0.6, r * 1.3]) for (let a = 0; a < 16; a++) { const x = cx + Math.cos(a * 0.3927) * rr, z = cz + Math.sin(a * 0.3927) * rr; ir(x, z, { x: cx, z: cz }); const n = G.interaccion.nearest(); if (n && n.id === id) return { x, z }; } return { x: cx, z: cz }; };
    // caminar con el motor de movimiento por el eje del muelle (como subir() de puerto.js)
    const caminar = pasos => {
      const E = M.eje, keys = G.input.keys, r = { ok: false, s: 0, nado: false, volo: false, y: 0 };
      const p0 = en(E.s0 - 0.5); ir(p0.x, p0.z);
      if (G.solidos && G.solidos.terminar) try { G.solidos.terminar(); } catch (e) { /* */ }
      S.pos.y = F.suelo ? F.suelo(p0.x, p0.z, alto(p0.x, p0.z) + 0.5) : alto(p0.x, p0.z);
      const yaw0 = G.camara.yaw; keys.add('w');
      try {
        for (let k = 0; k < (pasos || 600); k++) {
          const s = S.pos.x - SITIO.a.x; r.s = s;
          if (s > E.s1 - 0.6) { r.ok = true; break; }
          const obj = en(s + 1.5); G.camara.yaw = Math.atan2(-(obj.x - S.pos.x), -(obj.z - S.pos.z));
          F.step(0.05, false);
          if (MV.swimming) r.nado = true; if (MV.flying) r.volo = true;
        }
      } finally { keys.delete('w'); G.camara.yaw = yaw0; }
      r.y = S.pos.y - E.cubierta; r.ok = r.ok && !r.nado && !r.volo;
      r.cerca = (F.colliders || []).filter(c => (!c.when || c.when()) && Math.hypot(c.x - S.pos.x, c.z - S.pos.z) < (c.r || 0) + 1.5).map(c => (c.kind || '?') + '@' + c.x.toFixed(1) + ',' + c.z.toFixed(1)).slice(0, 4).join(' ');
      return r;
    };
    try {
      check('1 · El sitio es el del río real: orilla del embarcadero, agua al este y lejos de las canoas', M.valido && M.hecho,
        M.eje ? 'agua a ' + M.eje.sAgua.toFixed(2) + ' m · cubierta ' + M.eje.cubierta.toFixed(2) + ' · orilla ' + M.eje.h0.toFixed(2) + ' · pendiente máx ' + M.eje.pend.toFixed(1) + '° · ' + M.eje.perfil.map(q => q[0].toFixed(1) + '/' + q[1].toFixed(2)).join(' ') : 'sin eje');
      V.borrar(); V.recargar(); Object.assign(A, { forzar: true, avisado: false, llegada: false, reuniendo: false, ojos: false, sosteniendo: false, sost: 0 });
      try { G.dialogo.clear(); } catch (e) { /* */ }
      // 2 · sin los faroles de las Atalayas no hay nada; con ellos, los dos se mudan al alejarse de las Atalayas
      V.cambiarMundo('puente_villa', 'reparado'); V.cambiarMundo('puerto_mina', 'reparado'); V.cambiarMundo('arco_atalayas', 'afinado');
      ir(SITIO.plaza.x, SITIO.plaza.z); correr(0.2);
      const antes = !A.tengo && !gPlano.visible && !(G.interaccion.nearest() && /muelle/.test(G.interaccion.nearest().id));
      V.cambiarMundo('arco_atalayas', 'encendido'); ir(ATALAYAS.x + 3, ATALAYAS.z + 3); correr(0.2); try { AR && AR.aplicar && AR.aplicar(); } catch (e) { /* */ }
      const enAtalayas = !A.tengo;
      const villa = (T.mapa.lugares && T.mapa.lugares.villa) || { x: 150, z: 170 };
      ir(villa.x, villa.z); correr(0.2);
      check('2 · Antes de encender los faroles no hay nada; luego los dos siguen en las Atalayas con Vittata allí y se mudan al alejarse', antes && enAtalayas && A.tengo, antes + ' / ' + enAtalayas + ' / ' + A.tengo);
      check('2b · Aviso y bandera verde; el marcador «Misión V18» (puerto → arco → muelle) apunta al embarcadero', toasts.includes(TXT.aviso) && (PU && PU.mapa ? (PU.mapa() || {}).nombre === TXT.titulo : true), JSON.stringify(PU && PU.mapa && PU.mapa()));
      const zona = G.zonas && G.zonas.zonaEn ? [SITIO.plaza, SITIO.a, en(M.eje.s1)].filter(p => G.zonas.zonaEn(p.x, p.z)).length : 0;
      check('2c · Fuera de las zonas de los capítulos y a más de 80 m de las Atalayas', !zona && dist(SITIO.a, ATALAYAS) > 80, 'zona ' + zona + ' · ' + dist(SITIO.a, ATALAYAS).toFixed(0) + ' m');
      // 3 · cerca aparecen los dos (Tuerca se queda en las Atalayas)
      ir(SITIO.a.x - 22, SITIO.a.z - 14); correr(0.2);
      for (let i = 0; i < 80 && !(N.instancia('ingeniera') && N.instancia('constructor')); i++) { await esperar(100); correr(0.05); }
      const ing = N.instancia('ingeniera'), cons = N.instancia('constructor');
      check('3 · Cerca del embarcadero aparecen la Ingeniera (rescate) y el Constructor (vecino); Tuerca sigue en las Atalayas', ing && cons && ing.apariencia === 'rescate' && cons.apariencia === 'vecino' && dist(cons, SITIO.con) < 1 && N.estado('tuerca') === 'aliado',
        (ing && ing.apariencia) + ' / ' + (cons && cons.apariencia) + ' · tuerca ' + N.estado('tuerca'));
      check('3b · Antes de construir el muelle no sostiene: no hay rampa y se ve el plano (estacas y cinta)', !M.rampas.some(p => p.when()) && gPlano.visible && !gMuelle.visible);
      // 4 · llegada y reunión
      ir(SITIO.a.x - 14, SITIO.a.z - 12); correr(0.4); await esperar(30);
      check('4 · Paso 1: al llegar, el Constructor y la Ingeniera cuentan su primer proyecto bueno (bocadillos)', A.llegada);
      cerrarCharlas(); try { G.dialogo.clear(); } catch (e) { /* */ }
      ir(SITIO.a.x - 6, SITIO.a.z + 1, SITIO.a); correr(0.2);
      const abre = G.dialogo.open() && (G.dialogo.actual() || {}).who === 'La Ingeniera';
      cerrarCharlas(); correr(0.1);
      check('4b · Paso 2: junto a la orilla la Ingeniera abre la reunión (caja) y con E se pasa → plan', abre && estado() === 'plan', estado());
      // 5 · boyas: volando sobre el río, con E
      M.boyas.forEach((p, i) => { cerrarCharlas(); ir(p.x + 0.4, p.z + 0.3, null, nivelAgua(p.x, p.z) + 1.5); correr(0.05); pulsar('e'); });
      cerrarCharlas();
      check('5 · Paso 3: tres boyas en el río con Acción (guardadas) → medido', estado() === 'medido' && M.boyas.every((p, i) => boyaLista(i)) && toasts.some(t => t === con(TXT.boyaN, 3)), estado());
      // 6 · tablas
      M.tablas.forEach((p, i) => { cerrarCharlas(); const agua = mojado(p.x, p.z); ir(p.x + 0.3, p.z, null, agua ? nivelAgua(p.x, p.z) + 1 : null); correr(0.05); pulsar('e'); });
      cerrarCharlas();
      check('6 · Paso 4: cuatro tablas (una en el agua) con Acción, sin tocar el inventario del capítulo → materiales', estado() === 'materiales' && M.tablas.every((p, i) => tablaLista(i)) && !cambios.some(c => c === 'inv'), estado());
      // 7 · sostener (si te vas, se suelta)
      MV.flying = false;
      { const p = puntoPara(M.sostener.x, M.sostener.z, 1.2, 'v18_puerto_muelle_sostener'); ir(p.x, p.z, M.sostener); correr(0.05); } pulsar('e'); correr(1);
      const trabajan = N.instancia('constructor') && N.instancia('constructor').anim === 'Reparar' && N.instancia('ingeniera') && N.instancia('ingeniera').anim === 'Reparar';
      ir(M.sostener.x - 6, M.sostener.z); correr(0.1);
      const solto = !A.sosteniendo && estado() === 'materiales' && toasts.includes(TXT.suelta);
      check('7 · Paso 5: con E se sostiene la tabla y los dos la clavan (Reparar); si te vas, se suelta', trabajan && solto, 'trabajan ' + trabajan + ' · suelta ' + solto);
      let guardadoAntes = null; v18Test = ev => { if (ev && ev.tipo === 'mundo' && ev.id === ID && ev.estado === 'construido' && guardadoAntes == null) { try { guardadoAntes = /"arco_muelle":"construido"/.test(localStorage.getItem(V.clave())) && !gMuelle.visible; } catch (e) { guardadoAntes = false; } } };
      const evo = G.v18evo; G.v18evo = undefined;
      { const p = puntoPara(M.sostener.x, M.sostener.z, 1.2, 'v18_puerto_muelle_sostener'); ir(p.x, p.z, M.sostener); correr(0.05); } pulsar('e'); correr(SOSTENER_S + 0.3);
      check('7b · A los 3 s el muelle queda hecho (el estado ya estaba guardado antes de los efectos)', estado() === 'construido' && guardadoAntes === true && V.otorgado('arco_muelle'), estado() + ' · ' + guardadoAntes);
      G.v18evo = evo;
      let xp = null;
      if (evo && evo.info) { const sp = V.seleccionada() || 'vittata', x0 = evo.info(sp).xp; G.emit('v18', { tipo: 'evo' }); const x1 = evo.info(sp).xp; G.emit('v18', { tipo: 'evo' }); xp = [x0, x1, evo.info(sp).xp]; }
      check('7c · XP V18.2: 100 al terminar, una sola vez', xp ? xp[1] - xp[0] >= XP_FIN && xp[2] === xp[1] : true, xp ? xp.join(' → ') : 'sin G.v18evo');
      correr(1.0); cerrarCharlas();
      // 8 · transformación y apariencias
      for (let i = 0; i < 40 && (N.instancia('constructor') || {}).meta; i++) correr(0.25);
      const ci = N.instancia('constructor'), ii = N.instancia('ingeniera');
      check('8 · Paso 6: el muelle con faroles y banderines aparece, el plano se recoge y la rampa sostiene', gMuelle.visible && !gPlano.visible && M.rampas.every(p => p.when()));
      check('8b · Paso 7: el Constructor pasa a maestro de obra (chaleco verde, casco, mochila) y la Ingeniera a jefa de obra (chaqueta turquesa, insignia)',
        N.estado('constructor') === 'maestro_obra' && ci && ci.apariencia === 'maestro_obra' && ci.nodos.Chaleco.visible && ci.nodos.Mochila.visible && colorDe(ci.mats, 'CHALECO') === '#3fae5a'
        && N.estado('ingeniera') === 'jefa_obra' && ii && ii.apariencia === 'jefa_obra' && colorDe(ii.mats, 'CHAQUETA') === '#2bb3b1' && ii.acc.insignia.visible,
        (ci && ci.apariencia + '/' + colorDe(ci.mats, 'CHALECO')) + ' · ' + (ii && ii.apariencia + '/' + colorDe(ii.mats, 'CHAQUETA')));
      const g0 = geos(); N.apariencia('constructor', 'supervisor'); N.apariencia('ingeniera', 'aprendiz'); const g1 = geos(); N.apariencia('constructor', 'maestro_obra'); N.apariencia('ingeniera', 'jefa_obra');
      check('8c · Cambiar de apariencia no crea geometría (un modelo, varias apariencias)', g0 === g1 && geos() === g0, g0 + ' → ' + g1);
      const cam = caminar(600);
      check('8d · Se camina de la orilla al final del muelle, sobre el agua, sin nadar ni volar', cam.ok && Math.abs(cam.y) < 0.6, 's ' + cam.s.toFixed(1) + '/' + M.eje.s1.toFixed(1) + ' · Δy ' + cam.y.toFixed(2) + (cam.nado ? ' · nadó' : '') + (cam.volo ? ' · voló' : '') + (cam.cerca ? ' · cerca: ' + cam.cerca : ''));
      { const c = N.instancia('constructor') || SITIO.con, p = puntoPara(c.x, c.z, 1.6, 'v18npc_constructor'); ir(p.x, p.z, c); }
      const nc = G.interaccion.nearest(); if (nc && nc.id === 'v18npc_constructor') pulsar('e');
      check('8e · El Constructor maestro de obra tiene diálogo nuevo', G.dialogo.open() && N.def('constructor').porEstado.maestro_obra.dialogo.indexOf((G.dialogo.actual() || {}).text) >= 0, (G.dialogo.actual() || {}).text);
      cerrarCharlas();
      // 9 · persistencia, partidas viejas y «Comenzar de cero»
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.2);
      check('9 · Paso 8: tras recargar siguen el muelle, la rampa y las dos apariencias; ni premio ni XP se repiten', hecho() && gMuelle.visible && M.rampas.every(p => p.when()) && N.estado('constructor') === 'maestro_obra' && N.estado('ingeniera') === 'jefa_obra' && !V.otorgar('arco_muelle', 'arco_muelle', 1) && pagarXP() === 0);
      localStorage.setItem(V.clave(), JSON.stringify({ v: 2, especies: {}, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado', puerto_mina: 'reparado', arco_atalayas: 'encendido' }, sel: null, evo: {} }));
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.1);
      const vieja = estado() === 'inicio' && !gMuelle.visible && !M.rampas.some(p => p.when()) && N.estado('constructor') === 'vecino';
      localStorage.setItem(V.clave(), JSON.stringify({ v: 2, especies: {}, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado', puerto_mina: 'reparado', arco_atalayas: 'encendido', arco_muelle: 'qqq' }, sel: null, evo: {} }));
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.1);
      check('9b · Una partida de antes (Atalayas hechas, sin claves del muelle) empieza en «inicio»; un valor desconocido no rompe nada', vieja && estado() === 'inicio');
      localStorage.setItem(V.clave(), JSON.stringify({ v: 2, especies: {}, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado', puerto_mina: 'reparado', arco_atalayas: 'encendido', arco_muelle: 'construido' }, sel: null, evo: {} }));
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.1);
      check('9c · Con el muelle hecho y sin claves de personaje se deducen maestro de obra, jefa de obra y Tuerca aliado; nada retrocede', N.estado('constructor') === 'maestro_obra' && N.estado('ingeniera') === 'jefa_obra' && N.estado('tuerca') === 'aliado' && gMuelle.visible && !N.cambiarEstado('constructor', 'vecino') && !avanzar('plan'));
      localStorage.removeItem(V.clave()); G.emit('apply'); await esperar(60); correr(0.1);
      check('9d · «Comenzar de cero» lo borra: sin muelle ni rampa y los dos al principio', estado() === 'inicio' && !A.tengo && !gMuelle.visible && !M.rampas.some(p => p.when()) && N.estado('constructor') === 'supervisor' && N.estado('ingeniera') === 'aprendiz');
      check('10 · No toca las misiones del capítulo', !cambios.length, cambios.slice(0, 4).join(' | '));
      if (!window.AV_EN) { try { await AVE.assets.script('content/cap1/en.js'); } catch (e) { /* */ } }
      const D = window.AV_EN || {}, pats = Object.keys(D).filter(k => k.indexOf('{}') >= 0).map(k => new RegExp('^' + k.split('{}').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$'));
      const faltan = textos().filter(t => !D[t] && !pats.some(re => re.test(t)));
      check('10b · Todos los textos tienen inglés en content/cap1/en.js', !faltan.length, faltan.slice(0, 6).join(' | '));
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    try { cerrarCharlas(); } catch (e) { /* */ }
    A.manual = false; A.forzar = false; A.sosteniendo = false; A.sost = 0; A.reuniendo = false; timers.length = 0; v18Test = null;
    G.ui.toast = toast0; MV.flying = false;
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; if (fac0 && S.facing) { S.facing.x = fac0.x; S.facing.z = fac0.z; }
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar(); revisarElenco(); aplicar(); quitarGuia(); pintarHud(false);
    if (AR && AR.sesion) AR.sesion().manual = manual0[0]; if (PU && PU.sesion) PU.sesion().manual = manual0[1];
    try { if (AR && AR.aplicar) AR.aplicar(); if (PU && PU.aplicar) PU.aplicar(); } catch (e) { /* */ }
    N.paso(0.01, false);
    if (titAbierta) tit.open = true; if (cre) cre.hidden = creOculto; try { G.pausa.sincronizar(); } catch (e) { /* */ }
    if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  const mapa = () => (listo() && A.tengo && !hecho() ? { x: SITIO.plaza.x, z: SITIO.plaza.z, nombre: TXT.titulo } : null);
  G.v18muelle = { ID, ESTADOS, estado, avanzar, aplicar, usar, paso, SITIO, test, mapa, elenco: () => A.tengo, get eje() { return M.eje; }, get valido() { return M.valido; }, sesion: () => A };
  return G.v18muelle;
};
