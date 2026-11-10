/* AVE · streaming de edificios por zona (rol Streaming de mundo; docs/ARQUITECTURA.md § Streaming de edificios)
   Los edificios de Kelvin se cargan por zonas según la distancia de Vittata y se liberan al alejarse; se dibujan con
   InstancedMesh por modelo con LOD cerca/lejos por instancia. mundo.js lo arranca (iniciar) y pone las colisiones.

   Niveles de una zona (distancia del jugador al borde de la zona, d; R = radios del preset de calidad):
   - cerca (d < R.cerca, ~120 m): modelo completo (texturas, sombras) y colisiones. La primera vez que una instancia llega
     aquí se le ponen sus colisiones (las de mundo.js y G.solidos.agregar) y ya no se quitan: siguen activas aunque la zona
     se libere (son pocas y pesan poco).
   - lejos (d < CFG.zonaLejos, 650 m, o la niebla si llega antes): solo el LOD lejano, fundido por zona; los edificios
     sueltos se dibujan hasta CFG.dibujo del preset. El lejano no proyecta sombra (está fuera del mapa) pero sí la
     recibe: la del sol cae encima cuando entra en el radio. El volumen, a 100 m, va en el color de vértice.
   - fuera: nada en memoria.
   Histéresis: una zona baja de nivel con H m de más (40) y los modelos se sueltan tras 3 s sin uso (no hay vaivén en el borde).
   Por instancia, cerca/lejos se elige por la distancia a la cámara (CFG.lod ± CFG.lodH) y cada cuadro se descarta lo que
   queda fuera del frustum o de la distancia de dibujo (las de cerca a menos del radio de sombra se dibujan igual: su sombra
   puede caer en pantalla). Draw calls = pares modelo × material con alguna instancia visible. En las zonas cercanas, los
   modelos se funden por material; los cercanos, los _hd y los lejanos de varias zonas se vuelven a fundir globalmente.
   Las sombras de las ciudades usan una malla ligera por zona en la capa 1, visible solo para la cámara del sol.
   Carga: antes de mundoListo entra el modelo completo de lo que el jugador tiene encima (CFG.precarga) y el LOD lejano de
   lo visible a menos de CFG.lejosQuieto; el resto espera a que el jugador se mueva (CFG.moverse) y llegan en segundo plano,
   más cerca primero, con una descarga a la vez y el trabajo de CPU troceado (requestIdleCallback, CFG.msCuadro por tanda).
   La fusión de una zona lejana va por tandas. El programa de las ráfagas (burbujas al llegar a la caleta) y el del atlas
   se compilan al cargar, dentro de la escena, para no hacerlo en el cuadro en el que Vittata aparece. Liberar = quitar las mallas, geometry.dispose() y soltar materiales y texturas (conteo de
   referencias por nombre de material: el kit comparte su paleta). La cadena base64 la suelta AVE.assets.loadGLB al decodificar.
   El buffer de instancias de cada modelo×LOD se reutiliza (three r128 no lo libera al quitar la malla).

   Recursos del kit (assets/models/edificios/, mundo.edificios.base y .b64 del pack):
   - <modelo>.glb | <modelo>_glb.js (AV_EDIFICIOS_B64[modelo]): el de cerca. Materiales con nombre: mismo nombre = misma textura.
   - <modelo>_lejos.glb | _lejos_glb.js (AV_EDIFICIOS_B64[modelo + '_lejos']): el lejano, un material AV_Lejos con color de
     vértice, mismo pivote y escala. Solo se pide si el manifiesto lo declara; si no, se genera en tiempo de ejecución
     simplificando el de cerca (agrupado de vértices) con el color medio de cada textura.
   - Manifiesto opcional window.AV_EDIFICIOS_KIT = { <modelo>: { lejos: bool, radio, alto, tris, kb, kbLejos } } (se carga
     de mundo.edificios.kit si el pack lo pone). Con manifiesto, un modelo que no figura se salta con un aviso (sin pedir nada).
   - <modelo>_hd.glb | _hd_glb.js (si el manifiesto dice hd: true): versión cercana de alta fidelidad (geometría y UV
     originales de KitBash3D, docs/EDIFICIOS.md § Ciudad completa). Los modelos con atlas usan un material AV_HD_* con las 16
     texturas Ancient (o las 10 Savage), difusa y normales, atlas 4096, y la celda de cada cara en la UV2 (atributo avCelda);
     los restaurados pueden tener varios materiales. Al fundir se reasignan a su celda del atlas; los materiales sin equivalente
     conservan el suyo. Se pide con la zona en nivel cerca, en cualquier calidad y con WebGL2 (CFG.hd), también antes
     de moverse si ya estás en la zona. La distancia es hasta la superficie (cámara o Vittata, la que esté más cerca):
     encima de una torre no cuenta el centro, que queda abajo, y no se dibuja el lod beige. Mientras el _hd baja se ve
     el ligero, no la silueta. Solo es imagen: colisiones, pisos y vanos salen siempre del ligero (iguales en todo equipo).

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
   cargarTodo(), soltarTodo(), liberarYa(), terminar(), stats(), precargarZona(x, z, o) }; modelo(n) → Promise<{ partes, radio, alto }> fijo (piezas del
   contenido: no se libera nunca); material(src, fijo); test(opts) (AV.streamingTest). */
AVE.module('streaming', function (G) {
  'use strict';
  const R = G.renderer, scene = R.scene;
  const CFG = {
    cerca: { bajo: 50, medio: 60, alto: 75 },      // m al borde de la zona: modelo completo y colisiones (≥ distancia de LOD)
    precarga: { bajo: 20, medio: 25, alto: 30 },   // m: zonas cuyo modelo completo entra antes de mundoListo (lo demás visible, con su lejano)
    lejosQuieto: { bajo: 120, medio: 150, alto: 150 }, // m: hasta que el jugador se mueve, solo baja el lejano de las zonas a menos de esto
    dibujo: { bajo: 150, medio: 190, alto: 320 },  // m: distancia de dibujo de los edificios sueltos (la de antes en mundo.js)
    // m: distancia de dibujo de las zonas lejanas, cada una una sola malla fundida (un draw call): la ciudad entera se ve
    // desde cualquier punto de la isla (470 m) en todas las calidades; antes, en el móvil solo llegaban 8 de 17 zonas
    zonaLejos: { bajo: 650, medio: 650, alto: 650 },
    histeresis: 30,                                // m de más para bajar de nivel
    bajarEspera: 1.5,                              // KIMI-038: s que una bajada de nivel/HD debe pedirse seguido antes de aplicarse (anti-flapping en vuelo)
    moverse: 2,                                    // m que anda el jugador antes de pedir modelos completos fuera de la precarga
    // KIMI-246 (8-nov, 📣 nube/coordinadora): «edificios lejanos como ruinas al llegar». En el reveal, las zonas
    // de 60-120 m enseñan su `_lejos` hasta que su borde entra en el radio de nivel 2 (medido: nunca, estando
    // quieto). Mientras el jugador está a ≤ dist del punto de aparición, el radio de nivel 2 se amplía extra m:
    // esas zonas piden su modelo completo durante la propia pantalla de carga (el radio de precargarZona ya lo
    // cubre: max(cerca, hd) + histéresis ≥ cerca + extra en las tres calidades) y llegan detalladas al reveal.
    // Al alejarse del punto de aparición el boost se apaga y caen con la bajada diferida de siempre (KIMI-038).
    // En móvil/bajo el extra es la mitad: la carga móvil ya va al tope de segundos.
    llegada: { dist: 180, extra: 60, extraMovil: 30 },
    lod: { bajo: 35, medio: 50, alto: 60 },        // m del centro de la instancia a la cámara: cerca → lejos
    lodH: 8,                                       // histéresis del LOD (m)
    // F2.1: 45/70/90 m eran el mínimo (Kelvin, 26-oct: no se recorta el kit), no el tope.
    // Media 90 m y alta 120 m. Baja se queda en 45 m: el móvil modesto no carga más mallas.
    hd: { bajo: 45, medio: 90, alto: 120 },
    hdGrande: 10,                                  // m de radio: los grandes usan su _hd también más allá del LOD (los pequeños, el lejano: menos draw calls)
    // kelvin_ruinas_yunque y _2 (el conjunto de torres de la izquierda, sobre la roca).
    // Desde el aire la ciudad mide más que el _hd general y si no se ve la silueta beige.
    // 1-nov (Kelvin: «de lejos se ve blanco y de cerca de otra forma»): en «alto» los templos se ven con su modelo texturizado
    // desde casi toda la isla, no con el lejano crema sin textura (AV_Lejos). En «bajo» queda como antes (el spawn no carga la ciudad).
    ciudadVista: { bajo: 220, medio: 420, alto: 650 }, // m al borde de la zona: carga el kit
    // KIMI-030/QA-153: la salida del kit era `d < ciudadVista + histéresis(30)` y la villa queda a d=228 m de la ciudad:
    // en «bajo» (tope 220) la banda [220, 250] contenía la villa entera, así que tras visitar la ciudad el kit
    // (~450 MB de fusiones/lotes) quedaba cargado para siempre. La histéresis de distancia se cambia por gracia de
    // tiempo: al entrar en rango se recarga la cuenta; al salir, el kit se suelta pasados estos segundos.
    ciudadGracia: 8,                                 // s fuera de rango antes de soltar el kit de la ciudad
    ciudadMalla: { bajo: 340, medio: 450, alto: 700 }, // m a la superficie: lo que se dibuja es el _hd o el ligero con textura, no el lejano
    // KIMI-Task-011 (iPad, 2-nov: 8,1 M triángulos sobre Villa Raíz): en la ciudad, el _hd (hasta 460 000 triángulos por templo)
    // llega a 45 / 150 m (y al tope hdTris); más allá se ve el ligero con textura hasta ciudadMalla. En «alto», como antes.
    // (El lejano con atlas no sirve de paso intermedio: en la prueba del 3-nov algunos salían crema o con otra forma.)
    ciudadHD: { bajo: 45, medio: 150, alto: 700 },
    // Tope de triángulos _hd a la vista por cuadro: entran los más cercanos (los que ya iban en _hd, con 10 m de ventaja para
    // que no parpadeen en el borde; el más cercano entra siempre); el resto se ve con el ligero con textura. Algunos _hd fieles
    // pasan de 180 000 triángulos (templo_mediano_h, 462 000).
    hdTris: { bajo: 400e3, medio: 900e3, alto: Infinity },
    gracia: 3,                                     // s sin uso antes de soltar un modelo
    msCuadro: 4, msArranque: 24,                   // presupuesto de CPU por tanda (en juego / antes de mundoListo)
    // QA-200: modo recuperación de la cola. Si decenas de descargas aterrizan juntas tras una hambruna del hilo
    // (interrupción de iOS, tormenta de GC), los trabajos se acumulan por miles y el drenado a msCuadro tarda
    // minutos en recuperarse (tirones largos). Pasado colaGrande la bomba drena con msRecuperacion hasta bajar
    // de la mitad (histeresis). Inerte en juego normal: la cola sana son decenas o cientos de trabajos (la
    // explosión medida era 6 250-11 420). A/B y herramientas: ?colagrande=N (muy alto = desactivado).
    colaGrande: (() => { try { const v = parseInt(new URLSearchParams(location.search).get('colagrande'), 10); return v > 0 ? v : 2500; } catch (e) { return 2500; } })(),
    msRecuperacion: 12,
    precargaVuelo: 2.5, precargaVueloMax: 120, precargaVueloMin: 15, // KIMI-Task-017: anticipo (s × velocidad), tope en m y velocidad mínima (m/s): solo en vuelo rápido, no a pie (los gags del cómic capturan a velocidad baja)
    precargaPie: 4, precargaPieMin: 5,                        // KIMI-348: a pie (caminar ~6,5 m/s) también se anticipa la zona hacia la que se va, con ventana mayor (4 s ≈ 26 m antes del cruce); por debajo de 5 m/s (quieto/posando, momentos de cómic) sigue sin precargar
    descargas: 2, descargasArranque: 3,            // descargas a la vez (KIMI-017: 2 en caliente; los picos al teleport lejos del spawn eran N GLB con 1 descarga a la vez)
    revisar: 0.3,                                  // s entre revisiones de niveles
    margenSombra: 4,
    sombraChica: 4,                                // m de radio: por debajo, la sombra solo hasta la mitad del radio de sombras
  };
  // KIMI-038: contadores de transiciones de nivel/HD aplicadas y de bajadas diferidas evitadas. Viven a nivel de
  // módulo: el closure de streaming.transiciones() (API de diagnóstico para las herramientas kimi3_*) los lee
  // desde fuera de iniciar(); dentro de iniciar los actualizan nivelZona/aplicarNivel/ajustarHD.
  let transNivel = 0, transHD = 0, bajasEvitadas = 0;
  const nivelCal = () => (R.calidad && R.calidad.nivel) || 'medio';
  // KIMI-177 avance 2: en «bajo» los GLB del kit de la ciudad no descargan su normal gigante embebida
  // (assets.js sustituye la URL por una normal plana 2×2); aquí se conecta el criterio de calidad del motor.
  if (G.assets && G.assets.setNormalPlanaBaja) G.assets.setNormalPlanaBaja(() => nivelCal() === 'bajo');
  // KIMI-204/KIMI-250: el difuso embebido que sí se sirve ligero es el 2048 en escritorio/tablet y el
  // 1024 en el móvil pequeño (MOVIL_PEQ: atlasMax = 1024² en cualquier calidad, mismo criterio que
  // materialAtlas y reducirAtlas). El callback es perezoso: MOVIL_PEQ queda inicializado mucho antes de que
  // se parseé el primer GLB. KIMI-250: el sufijo se usa en «bajo» (como siempre) y en medio/alto durante el
  // arranque (hasta que el atlas real sube en background, ver setAtlasHDListo).
  if (G.assets && G.assets.setSufijoLQDifuso) G.assets.setSufijoLQDifuso(() => MOVIL_PEQ ? '_lq1024' : '_lq');
  // KIMI-207 (QA-201): en «medio/alto» la normal del atlas se sirve horneada a 2048² (hd_<kit>_n_lq.jpg);
  // criterio complementario del de arriba (bajo = plana 2×2, medio/alto = LQ 2048²).
  if (G.assets && G.assets.setNormalLQMedia) G.assets.setNormalLQMedia(() => nivelCal() !== 'bajo');
  // «Texturas optimizadas» (Modo Escuela, QA-181/QA-110): en «bajo» y con calidad.escuela el difuso LQ del atlas va en
  // KTX2 Basis ETC1S (assets.js ktx2De/texKTX2; el cambio de mapa lo hace ajustarComprimida). Medio/alto sin escuela: como antes.
  const comprimidaModo = () => nivelCal() === 'bajo' || !!(R.calidad && R.calidad.escuela === true);
  if (G.assets && G.assets.setComprimida) G.assets.setComprimida(comprimidaModo, () => R.renderer);
  // QA-107 (iPhone, 3-nov): en el móvil, en «medio», la ciudad del tepuy cargaba su kit desde el punto de aparición (420 m) y el
  // _hd hasta 150 m; al despegar subían de golpe los atlas y las fusiones y Safari cerraba la pestaña. En el móvil, la ciudad
  // (vista, malla, _hd y tope de triángulos) usa los valores de «bajo» fuera de «alto». El escritorio no cambia.
  const MOVIL_C = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const nivelCiudad = () => { const n = nivelCal(); return MOVIL_C && n === 'medio' ? 'bajo' : n; };
  // KIMI-251 (encargo TAREAS_WEB 8-nov «diferir los _hd al acercarse»): distancia a la que el _hd de la gran
  // ciudad puede verse por primera vez. Sus instancias solo se colocan en nivel 2 (colocar() exige
  // zonas[I.zona].nivel === 2, o sea Z.d < Rc) y encima deben quedar dentro del límite de dibujo _hd de
  // cuadro() (max(CFG.hd, min(ciudadMalla, ciudadHD))). Pedir el _hd desde el spawn (la villa queda a
  // d≈228 m y ciudadVista es 420/650) metía ~31 MB de GLB _hd en la ventana de arranque de medio/alto
  // sin que se pudiera ver NI UNA SOLA instancia _hd (verificado: con la cola drenada y el _hd listo, la
  // vista del spawn dibuja los mismos 20 _hd de siempre, todos del kit cercano). Se pide solo al acercarse
  // al primer uso real con un margen de descarga de 60 m sobre el radio de colocación; al alejarse se
  // suelta como antes (bajada diferida, KIMI-038).
  const hdCiudadLimite = () => { const ni = nivelCiudad(); return Math.max(CFG.hd[ni] || 0, (CFG.cerca[ni] || 60) + 60); };
  function alcanceNiebla() {
    const f = scene.fog; if (!f) return Infinity;
    return f.near < 0 ? -f.near + f.far * 3.5 : f.far; // atmosférica (near negativo): por debajo de ~3 % de visibilidad
  }
  // KIMI-320/375 (Modo Escuela, QA-181): «menor distancia de dibujo» — los edificios sueltos se recortan
  // ~45 % antes (bajo 150→82 m · medio 190→104 · alto 320→176; en KIMI-320 era 0,75, quedaba corto en
  // el Chromebook a ×6: ep3 14 / ep4 19 fps con 82-95 calls). El horizonte lo siguen cubriendo las zonas
  // fundidas (zonaLejos 650 m, alcanceZona), igual que en «bajo»: la isla no se queda sin edificios,
  // solo cae antes el detalle por instancia (menos draw calls y submit por cuadro).
  const alcance = () => Math.min((CFG.dibujo[nivelCal()] || 190) * ((R.calidad && R.calidad.escuela === true) ? 0.55 : 1), alcanceNiebla());
  const radioCerca = () => Math.min(CFG.cerca[nivelCal()] || 110, alcance());
  const alcanceZona = () => Math.min(Math.max(CFG.zonaLejos[nivelCal()] || 0, alcance()), alcanceNiebla());

  // ---------- Trabajo troceado ----------
  const trabajos = [];
  let programado = false, arrancando = true, quieto = true; // quieto: el jugador no se ha movido desde el inicio
  let precarga = null; // precargarZona (pantalla de carga, src/ui/carga.js): { descargas, ms } mientras dura; null = lo de siempre
  let terminarMax = false; // KIMI-020: mientras terminar() bombea la cola, más descargas en paralelo (un asentado aéreo pide decenas de GLB)
  let recuperacion = false; // QA-200: la cola explotó (trabajos > CFG.colaGrande) y se drena con más presupuesto hasta la mitad
  const ric = window.requestIdleCallback ? (fn => window.requestIdleCallback(fn, { timeout: 60 })) : (fn => setTimeout(fn, 16));
  function programar() { if (!programado && trabajos.length) { programado = true; ric(bombear); } }
  function bombear(dl) {
    programado = false;
    const libre = dl && dl.timeRemaining ? dl.timeRemaining() : CFG.msCuadro;
    if (!arrancando && !precarga) {
      if (!recuperacion && trabajos.length > CFG.colaGrande) recuperacion = true;
      else if (recuperacion && trabajos.length < CFG.colaGrande / 2) recuperacion = false;
    } else recuperacion = false;
    const tope = recuperacion ? CFG.msRecuperacion : CFG.msCuadro;
    const presupuesto = arrancando ? CFG.msArranque : precarga ? precarga.ms : Math.max(2, Math.min(tope, libre));
    const t0 = performance.now();
    while (trabajos.length && (performance.now() - t0 < presupuesto || performance.now() === t0)) {
      const j = trabajos.shift();
      const ta = performance.now();
      try { j(); } catch (e) { console.warn('AVE streaming:', e && e.message || e); }
      const d = performance.now() - ta;
      if (d > 25) { // KIMI-017: diagnóstico de tirones (tools/build/kimi3_017.js --fases); en juego normal casi nunca dispara
        if (!G.trabajosLentos) G.trabajosLentos = [];
        const L = G.trabajosLentos;
        L.push({ n: j.avNombre || j.name || 'job', ms: Math.round(d), t: Math.round(ta) });
        if (L.length > 40) L.shift();
      }
    }
    programar();
  }
  function encolar(fn, nombre) { if (nombre) fn.avNombre = nombre; trabajos.push(fn); programar(); }
  function drenar() { while (trabajos.length) { const j = trabajos.shift(); try { j(); } catch (e) { console.warn('AVE streaming:', e && e.message || e); } } }

  // ---------- Subida de texturas en tandas (KIMI-Task-017) ----------
  // Los atlas de las fusiones (hasta 2048², 21 MB) se subían a la GPU dentro del primer cuadro que dibujaba
  // la malla: al entrar una zona, ese cuadro se dispara (lag en móvil/iPad al moverse). La visibilidad no
  // se toca (el cómic hace fotos del mundo en cualquier momento); en su lugar las texturas de cada malla
  // nueva se suben aquí, UNA POR TRABAJO (medido 4-nov: un solo trabajo con todas las de una fusión daba
  // un trabajo de ~470 ms que congelaba el cuadro; así el presupuesto de la cola las reparte en cuadros).
  // El calentador del renderer sigue compilando programas y subiendo geometrías de 2 en 2 por cuadro.
  function subirTex(m) {
    if (!m) return;
    const pendientes = [];
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      if (!mat) continue;
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap']) {
        const t = mat[k];
        if (t && t.image) {
          const ud = t.userData || (t.userData = {}); // hay mapas «placeholder» sin userData (construir/crearLote)
          if (!ud.avSubida) { ud.avSubida = 1; pendientes.push(t); }
        }
      }
    }
    for (const t of pendientes) {
      encolar(() => {
        const W = R.renderer; if (!W || !W.initTexture || (R.contexto && R.contexto.perdido)) return;
        try { W.initTexture(t); } catch (e) { console.warn('AVE streaming: initTexture', e && e.message || e); }
      }, 'subirTex');
    }
  }

  // ---------- Precarga del programa de las ráfagas ----------
  // fx.burst crea el PointsMaterial al llegar al agua (burbujas de la caleta): el primer dibujo, en SwiftShader,
  // se queda varios segundos en getProgramInfoLog. Se deja una de cada familia en la escena y el primer render
  // de verdad (luces y sombras ya puestos) la compila; luego se oculta. El material sigue vivo para no soltar el programa.
  let rafagas = [];
  function precargarRafagas() {
    if (!G.fx || !G.fx.burst || rafagas.length) return;
    const antes = new Set();
    scene.traverse(o => { if (o.isPoints) antes.add(o); });
    for (const k of ['bubbles', 'feathers', 'gold', 'stars']) { try { G.fx.burst(0, -500, 0, k, 1); } catch (e) { console.warn('AVE precarga:', e && e.message || e); } }
    const nuevos = [];
    scene.traverse(o => { if (o.isPoints && !antes.has(o)) nuevos.push(o); });
    for (const o of nuevos) {
      const mat = o.material;
      o.visible = false;
      scene.remove(o);
      o.material = new THREE.PointsMaterial();
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([0, -500, 0], 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1], 3));
      const ancla = new THREE.Points(g, mat);
      ancla.name = 'precarga-rafaga'; ancla.visible = false; ancla.frustumCulled = false; ancla.userData.sinSolido = true;
      scene.add(ancla); rafagas.push(ancla);
    }
    // También el PointsMaterial sin mapa (llovizna, gotas): es otro programa y, si no, se compila al llegar.
    const g0 = new THREE.BufferGeometry();
    g0.setAttribute('position', new THREE.Float32BufferAttribute([0, -500, 0], 3));
    const plano = new THREE.Points(g0, new THREE.PointsMaterial({ size: 0.16, transparent: true, depthWrite: false, sizeAttenuation: true, fog: true }));
    plano.name = 'precarga-rafaga'; plano.visible = false; plano.frustumCulled = false; plano.userData.sinSolido = true;
    scene.add(plano); rafagas.push(plano);
  }
  G.on('mundoListo', precargarRafagas, 90);
  // Primer render de la escena: se ven un cuadro (compila con las luces y las sombras de verdad) y al siguiente se ocultan.
  let rafagaPaso = 0;
  G.on('render', () => {
    if (!rafagas.length || rafagaPaso > 1) return;
    rafagaPaso++;
    for (const a of rafagas) a.visible = rafagaPaso === 1;
  }, 1);

  // ---------- Materiales compartidos por nombre, con conteo de referencias ----------
  const mats = {}; // nombre → { mat, refs, fijo }
  function afilar(t) {
    if (!t || !R.renderer || !R.renderer.capabilities) return;
    const max = R.renderer.capabilities.getMaxAnisotropy();
    if (max > 1) t.anisotropy = Math.min(8, max);
  }
  function crearMaterial(src, k) {
    const m = new THREE.MeshPhongMaterial({ map: src.map || null, color: src.map ? 0xffffff : src.color, side: src.side, shininess: 8,
      specular: new THREE.Color(0x101010), alphaTest: src.alphaTest || 0, transparent: false, vertexColors: !!src.vertexColors });
    if (!src.map && src.color) m.color.copy(src.color);
    // Si el glTF ligero trae normalMap, se usa. El kit de ahora no la trae: en la aldea del inicio pesaba en la descarga. El relieve va en el atlas, solo en alta.
    if (src.normalMap && !/^AV_HD_/.test(k)) {
      m.normalMap = src.normalMap;
      if (src.normalScale) m.normalScale.copy(src.normalScale);
    }
    afilar(m.map); afilar(m.normalMap);
    m.name = k;
    if (/^AV_HD_/.test(k)) atlasHD(m, src);
    else if (/^KB3D_mud(Dark)?M$/.test(k)) cremaPlana(m, /Dark/.test(k) ? 0.5 : 0.85);
    // BM79: losa, plataforma, bloque y templo_grande_e (sin _hd) traen KB3D_floorM/wallL/pillarsM, y el kit KB3D_stoneM: sin crema salían como losas blancas
    else if (/^KB3D_(floor|stone|pillars)M$|^KB3D_wallL$/.test(k)) cremaPlana(m, 0.85, 0.74);
    // BM97: el kit Savage cercano pasa a la misma paleta que el _hd y el _lejos (madera cálida, teja roja, piedra crema)
    else if (/^KB3D_(WoodPlanks|WoodHewn|BarkNew|beams)$/.test(k)) paletaPlana(m, 'madera');
    else if (/^KB3D_(RoofThatched|TarpFabricDamaged)$/.test(k)) paletaPlana(m, 'teja');
    else if (/^KB3D_(RockSharp|MudRocky)$/.test(k)) cremaPlana(m, 0.85, 0.74);
    return m;
  }
  // BM97: UNA paleta vibrant_toon por material, la misma en el modelo cercano, el _hd y el _lejos (albedo, antes de la luz).
  // madera = la del _lejos (edificios_lejos_madera.py: sombra 0,20, cara clara 0,56, tono 0,62/0,36/0,16); teja = techar().
  const PAL = { teja: [0.58, 0.22, 0.14], madera: [0.62, 0.36, 0.16] };
  const glslMadera = (k) => 'vec3( ' + (PAL.madera[0] / 0.401).toFixed(4) + ', ' + (PAL.madera[1] / 0.401).toFixed(4) + ', ' + (PAL.madera[2] / 0.401).toFixed(4) + ' ) * ( 0.20 + 0.36 * smoothstep( 0.03, 0.35, ' + k + ' ) )';
  function paletaPlana(m, clase) {
    m.specular.setHex(0x000000); m.shininess = 1;
    const c = PAL.teja, cuerpo = clase === 'teja'
      ? 'vec3( ' + c.map(v => v.toFixed(2)).join(', ') + ' ) * clamp( y / 0.30, 0.92, 1.08 )'
      : glslMadera('y');
    m.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' +
        '{ float y = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );\n' +
        '  diffuseColor.rgb = mix( diffuseColor.rgb, ' + cuerpo + ', 0.9 ); }');
    };
    m.customProgramCacheKey = () => 'av-paleta-' + clase;
  }
  // BM23: los modelos Ancient que llegan sin _hd (templo_grande_a y otras torres de la ciudad del tepuy) pintaban el ocre del kit
  // (KB3D_mudM) y desde el aire la ciudad era amarilla. Misma crema que el atlas (piedra mate, albedo máx. ~0,90), conservando el detalle.
  // brillo (BM79): 1 por defecto; las losas llanas ven el sol y el cielo de frente y con 1 salen blancas desde el aire
  function cremaPlana(m, fuerza, brillo) {
    brillo = brillo || 1;
    m.specular.setHex(0x000000); m.shininess = 1;
    m.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' +
        '{ float y = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );\n' +
        '  float t = clamp( pow( max( y, 0.0 ), 0.75 ), 0.0, 1.0 );\n' +
        '  vec3 piedra = mix( vec3( 0.50, 0.40, 0.26 ), vec3( 0.90, 0.76, 0.52 ), t );\n' +
        '  float detalle = clamp( y / max( mix( 0.40, 0.80, t ), 0.15 ), 0.70, 1.08 );\n' +
        '  diffuseColor.rgb = mix( diffuseColor.rgb, piedra * detalle * ' + brillo.toFixed(2) + ', ' + fuerza.toFixed(2) + ' ); }');
    };
    m.customProgramCacheKey = () => 'av-crema-plana-' + fuerza + '-' + brillo;
  }
  // ---------- Alta fidelidad (_hd): atlas 4×4 de las texturas originales (tools/blender/edificios_hd_atlas.py) ----------
  // La UV original repite la textura; avCelda (UV2) es el origen de la celda del material en el atlas. fract() envuelve la UV
  // dentro de la celda, que tiene un margen que repite su borde, y el nivel de mipmap sale de la UV sin envolver (sin costuras).
  // Celda 1024 y margen 32 (atlas 4096). La fracción es la misma que 512/16, así que la UV2 horneada no cambia.
  // El lod usa el eje corto cuando el otro es mucho mayor (relieve de lado, sin pasar el margen de la celda).
  const HD = { celdas: 4, celda: 1024, margen: 32, lodMax: 5 };
  const hdGL2 = () => !!(R.renderer && R.renderer.capabilities && R.renderer.capabilities.isWebGL2);
  // three r128: Texture no trae userData (el Material sí). Crearlo aquí evita que procesar() del _hd lance
  // «Cannot set properties of undefined (setting 'avAtlas')» y deje el modelo en «bajando».
  function marcarAtlas(t) {
    if (!t || !t.isTexture) return;
    if (!t.userData) t.userData = {};
    t.userData.avAtlas = true;
  }
  function atlasHD(m, src) {
    if (src.normalMap) { m.normalMap = src.normalMap; if (src.normalScale) m.normalScale.copy(src.normalScale); }
    // El look no debe bajar este atlas: la celda de 1024 es el detalle del kit. La URL a veces queda en blob.
    marcarAtlas(m.map); marcarAtlas(m.normalMap);
    afilar(m.map); afilar(m.normalMap);
    // KIMI-250: el parse del GLB trae el difuso que el URLModifier sirvió: el JPEG LQ de arranque mientras
    // el kit no esté «listo» (en «bajo» siempre; en medio/alto hasta el barrido de los ~20 s). La marca hace
    // que el barrido o el gancho 'calidad' lo suban al 4096 real solo donde el tope de calidad lo exige
    // (atlasMax() === 0); avAtlasEsc corrige el lod del shader con el tamaño real del mapa (0,5 el 2048,
    // 0,25 el 1024 del móvil pequeño, 1 el 4096).
    const kitHD = m.name === 'AV_HD_Ancient' ? 'ancient' : 'savage';
    m.userData.avLQDifuso = !(G.assets && G.assets.atlasHDListoEs && G.assets.atlasHDListoEs(kitHD));
    const A = HD.celdas * HD.celda, dentro = HD.celda - 2 * HD.margen, f = v => v.toFixed(6);
    const esc = m.userData.avAtlasEsc = { value: m.userData.avLQDifuso ? (MOVIL_PEQ ? 0.25 : 0.5) : 1 };
    // F2.2 (carril B): en el atlas Savage, RoofThatched es la celda 4. Rojo teja, el uniforme lo apaga en Ancient.
    // G18 (carril C): el atlas Ancient es ocre; con vibrant_toon se ve dorado. La piedra pasa a crema mate.
    // Un solo programa (av-hd-atlas): cada uniforme actúa solo en su kit.
    const teja = { value: m.name === 'AV_HD_Savage' ? 1 : 0 };
    const esCrema = m.name === 'AV_HD_Ancient';
    const uCrema = { value: esCrema ? 1 : 0 };
    if (esCrema) { m.specular.setHex(0x000000); m.shininess = 1; }
    m.onBeforeCompile = sh => {
      sh.uniforms.avAtlasEsc = esc;
      sh.uniforms.avTeja = teja;
      sh.uniforms.avCrema = uCrema;
      sh.vertexShader = sh.vertexShader
        .replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\nattribute vec2 avCelda;\nvarying vec2 vAvCelda;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvAvCelda = avCelda;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <uv_pars_fragment>', '#include <uv_pars_fragment>\nvarying vec2 vAvCelda;\nuniform float avAtlasEsc;\nuniform float avTeja;\nuniform float avCrema;\n' +
          'vec4 avAtlas( sampler2D t, vec2 uv ) {\n' +
          '  vec2 dx = dFdx( uv ) * ' + f(dentro) + ' * avAtlasEsc, dy = dFdy( uv ) * ' + f(dentro) + ' * avAtlasEsc;\n' +
          '  float ax = length( dx ), ay = length( dy ), mayor = max( ax, ay ), menor = min( ax, ay );\n' +
          '  float lod = clamp( log2( max( max( menor, mayor / 4.0 ), 1e-4 ) ), 0.0, ' + f(HD.lodMax) + ' + log2( avAtlasEsc ) );\n' +
          '  return textureLod( t, vAvCelda + ' + f(HD.margen / A) + ' + fract( uv ) * ' + f(dentro / A) + ', lod );\n}')
        // split/join: el mapa de normales usa texture2D dos veces (espacio de objeto y tangente). replace() solo
        // cambiaba la primera, y la que se dibuja seguía leyendo el atlas entero con la UV suelta (borde beige, sin relieve).
        .replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment.split('texture2D( map, vUv )').join('avAtlas( map, vUv )') +
          // BM43: la tela roja sacaba el entramado de la paja como malla de colores; ahora casi plana (0,97) con el detalle de luz
          // comprimido a ±8 % alrededor de la media de la celda, como lona
          // BM97: paleta única en el atlas Savage (celdas: 0-3 madera, 4 paja y 5 lona = teja, 6 cuerda = madera, 7-9 roca = crema)
          '\nif (avTeja > 0.5) {\n' +
          '  vec2 cs = floor( vAvCelda * 4.0 + 0.5 );\n' +
          '  float ks = cs.y * 4.0 + cs.x;\n' +
          '  float ys = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );\n' +
          '  if ( ks < 3.5 || abs( ks - 6.0 ) < 0.5 ) diffuseColor.rgb = mix( diffuseColor.rgb, ' + glslMadera('ys') + ', 0.9 );\n' +
          '  else if ( ks < 5.5 ) {\n' +
          '    float ym = dot( textureLod( map, vAvCelda + 0.125, 5.0 ).rgb, vec3( 0.2126, 0.7152, 0.0722 ) );\n' +
          '    diffuseColor.rgb = vec3(0.58, 0.22, 0.14) * clamp( ys / max( ym, 0.05 ), 0.92, 1.08 );\n' +
          '  } else if ( ks > 6.5 && ks < 9.5 ) {\n' +
          '    float t = clamp( pow( max( ys, 0.0 ), 0.75 ), 0.0, 1.0 );\n' +
          '    vec3 piedra = mix( vec3( 0.50, 0.40, 0.26 ), vec3( 0.90, 0.76, 0.52 ), t );\n' +
          '    float detalle = clamp( ys / max( mix( 0.40, 0.80, t ), 0.15 ), 0.70, 1.08 );\n' +
          '    diffuseColor.rgb = mix( diffuseColor.rgb, piedra * detalle * 0.74, 0.85 );\n' +
          '  }\n}\n' +
          // Crema solo en la piedra labrada del atlas Ancient (celdas en tools/blender/edificios_hd_atlas.py): mudM y mudDarkM
          // (6, 7) a media fuerza; las restauradas (0, 1, 4, 10), beams (13) y rockM (14) conservan su textura. Albedo máximo
          // ~0,90 (antes 1,11: se veía blanco, como yeso) y el detalle de la textura se conserva en vez de aplanarse.
          'if (avCrema > 0.5) {\n' +
          '  vec2 cc = floor( vAvCelda * 4.0 + 0.5 );\n' +
          '  float k = cc.y * 4.0 + cc.x;\n' +
          '  float fuerza = ( k < 1.5 || abs( k - 4.0 ) < 0.5 || abs( k - 10.0 ) < 0.5 || abs( k - 13.0 ) < 0.5 || abs( k - 14.0 ) < 0.5 ) ? 0.0 : ( ( abs( k - 6.0 ) < 0.5 || abs( k - 7.0 ) < 0.5 ) ? 0.5 : 1.0 );\n' +
          '  float y = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );\n' +
          '  float t = clamp( pow( max( y, 0.0 ), 0.75 ), 0.0, 1.0 );\n' +
          '  vec3 piedra = mix( vec3( 0.50, 0.40, 0.26 ), vec3( 0.90, 0.76, 0.52 ), t );\n' +
          '  float detalle = clamp( y / max( mix( 0.40, 0.80, t ), 0.15 ), 0.70, 1.08 );\n' +
          '  diffuseColor.rgb = mix( diffuseColor.rgb, piedra * detalle, fuerza );\n' +
          '}\n')
        // BM2: la crema se veía plana. Con la normal ya perturbada, las caras que miran al suelo (cornisas por debajo, techos
        // de huecos, dinteles) y las verticales pierden hasta un 38 % de albedo; la que mira al cielo se queda como estaba.
        // Solo cambia el albedo: no toca el specular 0 ni el shininess 1 de la piedra.
        .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.split('texture2D( normalMap, vUv )').join('avAtlas( normalMap, vUv )') +
          '\nif (avCrema > 0.5) {\n' +
          '  float ny = inverseTransformDirection( normal, viewMatrix ).y;\n' +
          '  float u = clamp( ( ny + 0.15 ) / 1.05, 0.0, 1.0 );\n' +
          '  diffuseColor.rgb *= mix( 0.72, 1.0, u * u * ( 3.0 - 2.0 * u ) );\n' +
          // BM90: también las celdas restauradas conservan su textura, pero entran en la misma piedra dorada de la meta.
          '  diffuseColor.rgb *= vec3( 1.06, 0.94, 0.70 );\n' +
          '}\n');
    };
    m.customProgramCacheKey = () => 'av-hd-atlas';
    reducirAtlas(m);
    subirEnCola(m);
    ajustarComprimida(m);
  }
  // BJ1 (QA-52, QA-53): cada atlas de 4096 (difusa y normales) ocupa 85 MB en la GPU; en el móvil, el de la casa junto al punto
  // de aparición llevaba el cap. 1 a 250 MB y subirlo al pulsar «Empezar» congelaba la pantalla. En calidad baja, y en el móvil
  // fuera de alta, se queda en 2048 (celda 512, 21 MB): se dibuja una vez en un lienzo y se suelta el original. Al volver a una
  // calidad mayor sigue en 2048 hasta que la zona se descarga y el modelo vuelve a bajar.
  const MOVIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  // QA-110 (iPhone, 4-nov: se cerró volando sobre la Ciudad de los 36 en bajo). Decisión de Kelvin (4-nov, DECISION_LOG): en el
  // móvil de pantalla pequeña (táctil y lado corto < 600 px: iPhone y Android, no tablets) el atlas baja a 1024 al cargar, antes
  // de subirlo (celda 256, 5,3 MB por textura; los cuatro, 21 MB en vez de 85), en cualquier calidad. Tablet y escritorio, como antes.
  const MOVIL_PEQ = MOVIL && Math.min(screen.width || 0, screen.height || 0) > 0 && Math.min(screen.width, screen.height) < 600;
  // Modo Escuela (QA-181, 📣 coordinadora 8-nov): con calidad.escuela el atlas NO sube al 4096 JPEG (~85 MB en la GPU)
  // ni en el barrido de los ~20 s ni al subir de calidad: se queda en el LQ final (KTX2 comprimido en escuela, JPEG
  // 2048 en «bajo»), mismo criterio de consumo bajo que el móvil. Sin escuela nada cambia. Al apagar el Modo Escuela
  // en caliente, el gancho 'calidad' vuelve a pedir el 4096 (atlasMax() === 0 otra vez) como un arranque normal.
  const atlasMax = () => MOVIL_PEQ ? HD.celdas * HD.celda / 4
    : comprimidaModo() || (MOVIL && nivelCal() !== 'alto') ? HD.celdas * HD.celda / 2 : 0;
  // QA-110: las texturas del atlas se suben a la GPU de una en una, cada 300 ms (renderer.initTexture), en cuanto se crea el
  // material y antes de que la ciudad se vea; así no llegan las cuatro en el mismo cuadro al despegar. Una imagen que aún no
  // ha cargado espera su turno de nuevo (hasta ~30 s); si la escena la dibuja antes, three la sube allí, como antes.
  const colaSubir = []; let subiendo = false;
  function subirEnCola(m) {
    for (const t of [m.map, m.normalMap]) if (t && !colaSubir.some(c => c.t === t)) colaSubir.push({ m, t, n: 0 });
    if (!subiendo) { subiendo = true; setTimeout(subirSiguiente, 300); }
  }
  function subirSiguiente() {
    const c = colaSubir.shift();
    if (!c) { subiendo = false; return; }
    const img = c.t.image;
    if (!(img && img.width)) { if (++c.n < 100) colaSubir.push(c); }
    else {
      reducirAtlas(c.m);
      const rr = R.renderer;
      if (rr && rr.initTexture && !(R.contexto && R.contexto.perdido)) { try { rr.initTexture(c.t); } catch (e) { console.warn('AVE streaming: initTexture', e && e.message || e); } }
    }
    setTimeout(subirSiguiente, 300);
  }
  function reducirAtlas(m) {
    const max = atlasMax();
    if (!max || !m.userData.avAtlasEsc) return;
    for (const t of [m.map, m.normalMap]) {
      const img = t && t.image;
      if (!img || !(img.width > max)) continue;
      const c = document.createElement('canvas');
      c.width = max; c.height = Math.round(img.height * max / img.width);
      try { c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); } catch (e) { continue; } // imagen sin leer: se queda
      t.image = c; t.needsUpdate = true;
      if (img.close) img.close(); // ImageBitmap del GLTFLoader: libera la copia de 64 MB en memoria
    }
    if (m.map && m.map.image) m.userData.avAtlasEsc.value = m.map.image.width / (HD.celdas * HD.celda);
  }
  // KIMI-177: la normal 2×2 plana (data URI de assets.js) marca «estaba en bajo y no se descargó la real».
  const esNormalPlana = t => !!(t && t.image && t.image.width === 2 && t.image.height === 2);
  // «Texturas optimizadas» (Modo Escuela/bajo): el difuso LQ del atlas pasa a su .ktx2 (Basis ETC1S, comprimido en la GPU) y,
  // fuera de ese modo o si el .ktx2 falla, vuelve al JPEG LQ. Solo mientras el mapa sea el LQ (avLQDifuso): en escritorio
  // medio/alto subirAtlasA4096 lo cambia después al 4096 como siempre. El 2×2 de assets.js (el GLB no bajó el JPEG) se
  // reconoce por su tamaño. Gancho para el Modo Escuela de Kimi 3: comprimidaModo() de arriba.
  function mapaAtlas(m, t, viejo) {
    if (viejo && viejo.wrapS !== undefined) { t.wrapS = viejo.wrapS; t.wrapT = viejo.wrapT; }
    t.flipY = false; t.encoding = THREE.sRGBEncoding; marcarAtlas(t); afilar(t);
    m.map = t;
    if (viejo && viejo !== t) { try { viejo.dispose(); } catch (e) { /* r128 */ } }
    reducirAtlas(m);
  }
  function ajustarComprimida(m) {
    const ud = m.userData;
    if (!ud.avLQDifuso || !ud.avAtlasEsc || ud.avKTX2Pend || !G.assets || !G.assets.ktx2De) return;
    const kit = m.name === 'AV_HD_Ancient' ? 'ancient' : 'savage';
    const url = kitBase + 'tex_hd/hd_' + kit + (MOVIL_PEQ ? '_lq1024' : '_lq') + '.jpg';
    const t0 = m.map, comp = !!(t0 && t0.isCompressedTexture), plano = !!(t0 && t0.image && t0.image.width === 2);
    const aJPEG = () => { if (m.map && (m.map.isCompressedTexture || (m.map.image && m.map.image.width === 2))) mapaAtlas(m, G.assets.tex(url, () => reducirAtlas(m)), m.map); };
    if (G.assets.ktx2De(url)) {
      if (comp) return;
      // QA-nuevo-edif-android: con el .ktx2 ya transcodificado (otro material del kit lo usó antes), al momento: sin la
      // ventana del 2×2 beige (cajas lisas) al volver a entrar en una zona. Y se pide ya el del otro kit, para que el
      // primer material Ancient/Savage que nazca más tarde (llegar volando a las Atalayas) lo encuentre listo.
      const listo = G.assets.ktx2Listo && G.assets.ktx2Listo(url);
      if (listo) { mapaAtlas(m, listo, m.map); return; }
      const otro = kitBase + 'tex_hd/hd_' + (kit === 'ancient' ? 'savage' : 'ancient') + (MOVIL_PEQ ? '_lq1024' : '_lq') + '.jpg';
      if (G.assets.ktx2Listo && !G.assets.ktx2Listo(otro)) G.assets.texKTX2(otro, () => {}, () => {});
      ud.avKTX2Pend = true;
      G.assets.texKTX2(url, t => {
        ud.avKTX2Pend = false;
        if (!mats[m.name] || mats[m.name].mat !== m) { t.dispose(); return; } // la zona se descargó mientras tanto
        if (!ud.avLQDifuso || !G.assets.ktx2De(url)) { t.dispose(); aJPEG(); return; }
        mapaAtlas(m, t, m.map);
      }, e => { ud.avKTX2Pend = false; console.warn('AVE streaming: atlas .ktx2, se usa el JPEG', e && e.message || e); aJPEG(); });
    } else if (comp || plano) aJPEG();
  }
  // KIMI-250: sube el difuso del atlas al 4096 real (mismo swap para el gancho 'calidad' y para el barrido
  // de los ~20 s). Al completarse, el kit queda «listo» (assets.js): los parses siguientes de los GLB piden
  // el 4096 directo (caché HTTP, sin bytes nuevos de red) y los materiales nuevos nacen sin marca de LQ.
  function subirAtlasA4096(k, m) {
    const kit = /Ancient$/.test(k) ? 'ancient' : 'savage';
    const map = G.assets.tex(kitBase + 'tex_hd/hd_' + kit + '.jpg', () => reducirAtlas(m));
    map.encoding = THREE.sRGBEncoding;
    map.flipY = false; marcarAtlas(map); afilar(map); // sin la marca, el look lo encogería al tope de la calidad
    const viejo = m.map;
    m.map = map;
    if (viejo && viejo !== map) { try { viejo.dispose(); } catch (e) { /* r128 */ } }
    m.userData.avLQDifuso = false;
    m.userData.avAtlasEsc.value = 1; // el 4096 real: LOD del shader como en un arranque en alta
    m.needsUpdate = true;
    if (G.assets && G.assets.setAtlasHDListo) G.assets.setAtlasHDListo(kit, true);
  }
  G.on('calidad', () => {
    for (const k in mats) if (/^AV_HD_/.test(k)) {
      const m = mats[k].mat;
      // KIMI-177: el atlas pudo crearse en «bajo» sin normal (no se descargó, ~14 MB) o con la normal plana
      // de los GLB (avance 2); al subir la calidad se pide la verdadera y se engancha al mismo material.
      // El tex() carga en paralelo: se reduce al llegar la imagen (reducirAtlas en el acto no vería
      // image y el 4096² se subiría entero a la GPU en un móvil que sube de calidad).
      if ((!m.normalMap || esNormalPlana(m.normalMap)) && nivelCal() !== 'bajo') {
        const kit = /Ancient$/.test(k) ? 'ancient' : 'savage';
        // KIMI-207: misma normal LQ 2048² que en un arranque en medio/alto (criterio único, sin sorpresas al subir)
        const nm = G.assets.tex(kitBase + 'tex_hd/hd_' + kit + '_n_lq.jpg', () => reducirAtlas(m));
        nm.flipY = false; marcarAtlas(nm); afilar(nm); // como atlasHD(): sin la marca, tras reducirAtlas (canvas sin src) el look lo encogía al tope de la calidad
        m.normalMap = nm;
        m.needsUpdate = true;
      }
      // KIMI-202/KIMI-250: el difuso pudo nacer con el JPEG ligero horneado (hd_<kit>_lq.jpg: en «bajo»
      // como siempre, y desde KIMI-250 también en el arranque de medio/alto). Se sube al 4096 real solo
      // donde el tope de calidad lo exige (atlasMax() === 0 = escritorio/tablet en medio/alto; en móvil y
      // en bajo el LQ ya es el final y no se descarga nada, mismo criterio que la normal de arriba).
      if (m.userData.avLQDifuso && atlasMax() === 0) subirAtlasA4096(k, m);
      ajustarComprimida(m);
      reducirAtlas(m);
    }
  });
  // KIMI-250 (QA-201/KIMI-244, tope 28 MB): barrido único a los ~20 s de la sesión (la ventana de carga ya
  // está cerrada: medido red quieta ~2 s tras el reveal). Los materiales AV_HD_ que nacieron con el LQ de
  // arranque suben al 4096 real donde el tope lo exige (atlasMax() === 0). Si un parse de GLB aterriza
  // justo antes del barrido, su material ya está en mats y también lo sube; los posteriores nacen con el
  // 4096 (kit «listo»). En móvil/bajo no se pide nada: la vista final queda idéntica en todas las calidades.
  setTimeout(() => {
    if (atlasMax() !== 0) return;
    for (const k in mats) if (/^AV_HD_/.test(k)) {
      const it = mats[k];
      if (it && it.mat.userData.avLQDifuso) subirAtlasA4096(k, it.mat);
    }
  }, 20000);
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
    if (m.normalMap) m.normalMap.dispose();
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
          vistas.add(t); t.dispose();
          // El atlas es un ImageBitmap compartido: close() del sobrante dejaba en blanco el material que se queda.
          if (t.image && typeof t.image.close === 'function' && !(AVE.assets && AVE.assets.imagenRetenida && AVE.assets.imagenRetenida(t.image))) t.image.close();
        }
        if (!usados.has(m)) m.dispose();
      }
    });
  }
  const matLejos = new THREE.MeshLambertMaterial({ vertexColors: true, name: 'AV_Lejos' });
  const matSombra = new THREE.MeshBasicMaterial({ name: 'AV_Sombra' });

  // ---------- Geometría: fundir partes, simplificar para el LOD lejano ----------
  // Factor de un atributo entero normalizado (COLOR_0 Uint16 del _lejos, cuantización): en r128 getX no desnormaliza (QA-25)
  const kNorm = a => !a || !a.normalized ? 1 : a.array instanceof Uint8Array ? 1 / 255 : a.array instanceof Uint16Array ? 1 / 65535
    : a.array instanceof Int8Array ? 1 / 127 : a.array instanceof Int16Array ? 1 / 32767 : 1;
  // BM105: fusión de lejanos con atlas (posición, normal, uv y celda del atlas)
  function fundirTex(geos) {
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
    const A = { position: [3, new Float32Array(nv * 3)], normal: [3, new Float32Array(nv * 3)], uv: [2, new Float32Array(nv * 2)], avCelda: [2, new Float32Array(nv * 2)] };
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const g of geos) {
      for (const k in A) { const a = g.attributes[k], d = A[k][0], k1 = kNorm(a); for (let i = 0, n = a.count; i < n; i++) for (let c = 0; c < d; c++) A[k][1][(vo + i) * d + c] = a['get' + 'XYZ'[c]](i) * k1; }
      for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo;
      io += g.index.count; vo += g.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    for (const k in A) out.setAttribute(k, new THREE.BufferAttribute(A[k][1], A[k][0]));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere(); out.computeBoundingBox();
    return out;
  }
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
  // KIMI-Task-017/031: fundir resumible en tandas de ~ms, también DENTRO de una geometría grande (la fusión
  // global HD de una zona era un solo trabajo de 370–720 ms: una geometría de ~1 M de vértices no se
  // interrumpía). Los límites (boundingBox/Sphere) se calculan durante la copia: computeBoundingSphere de
  // la geometría fundida eran otros ~700–900 ms de golpe en el trabajo que cerraba la fusión.
  function fusionLenta(geos, modo, ms, paso, alTerminar) {
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const dims = modo === 'tex' ? { position: 3, normal: 3, uv: 2, avCelda: 2 }
      : modo === 'color' ? { position: 3, normal: 3, color: 3 }
      : { position: 3, normal: 3, uv: geos.every(g => g.attributes.uv) ? 2 : 0 };
    const arr = {};
    for (const k in dims) if (dims[k]) arr[k] = new Float32Array(nv * dims[k]);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let g0 = 0, vo = 0, io = 0, v0 = 0, x0 = 0;
    let bx1 = Infinity, by1 = Infinity, bz1 = Infinity, bx2 = -Infinity, by2 = -Infinity, bz2 = -Infinity;
    const TROZO = 24576; // vértices por slice (y ×3 índices): cada slice queda en pocos ms incluso con CPU ×4
    const avanzar = () => {
      const t0 = performance.now();
      while (g0 < geos.length) {
        const g = geos[g0], a = g.attributes, n = a.position.count;
        if (v0 < n) {
          const kp = kNorm(a.position), kn = a.normal ? kNorm(a.normal) : 1, ku = a.uv ? kNorm(a.uv) : 1,
            kc = a.color ? kNorm(a.color) : 1, ka = a.avCelda ? kNorm(a.avCelda) : 1;
          const fin = Math.min(n, v0 + TROZO);
          for (let i = v0; i < fin; i++) {
            const v = vo + i;
            const px = a.position.getX(i) * kp, py = a.position.getY(i) * kp, pz = a.position.getZ(i) * kp;
            arr.position[v * 3] = px; arr.position[v * 3 + 1] = py; arr.position[v * 3 + 2] = pz;
            if (px < bx1) bx1 = px; if (px > bx2) bx2 = px;
            if (py < by1) by1 = py; if (py > by2) by2 = py;
            if (pz < bz1) bz1 = pz; if (pz > bz2) bz2 = pz;
            if (arr.normal && a.normal) { arr.normal[v * 3] = a.normal.getX(i) * kn; arr.normal[v * 3 + 1] = a.normal.getY(i) * kn; arr.normal[v * 3 + 2] = a.normal.getZ(i) * kn; }
            if (arr.uv && a.uv) { arr.uv[v * 2] = a.uv.getX(i) * ku; arr.uv[v * 2 + 1] = a.uv.getY(i) * ku; }
            if (arr.color) { if (a.color) { arr.color[v * 3] = a.color.getX(i) * kc; arr.color[v * 3 + 1] = a.color.getY(i) * kc; arr.color[v * 3 + 2] = a.color.getZ(i) * kc; } else { arr.color[v * 3] = 1; arr.color[v * 3 + 1] = 1; arr.color[v * 3 + 2] = 1; } }
            if (arr.avCelda && a.avCelda) { arr.avCelda[v * 2] = a.avCelda.getX(i) * ka; arr.avCelda[v * 2 + 1] = a.avCelda.getY(i) * ka; }
          }
          v0 = fin;
        } else {
          const cnt = g.index ? g.index.count : n, fin = Math.min(cnt, x0 + TROZO * 3);
          if (g.index) for (let i = x0; i < fin; i++) idx[io + i] = g.index.getX(i) + vo;
          else for (let i = x0; i < fin; i++) idx[io + i] = i + vo;
          x0 = fin;
          if (x0 >= cnt) { io += cnt; vo += n; g0++; v0 = 0; x0 = 0; }
        }
        if (performance.now() - t0 >= ms) break;
      }
      if (g0 < geos.length) { paso(avanzar); return; }
      const out = new THREE.BufferGeometry();
      for (const k in arr) if (arr[k]) out.setAttribute(k, new THREE.BufferAttribute(arr[k], dims[k]));
      out.setIndex(new THREE.BufferAttribute(idx, 1));
      if (nv) {
        out.boundingBox = new THREE.Box3(new THREE.Vector3(bx1, by1, bz1), new THREE.Vector3(bx2, by2, bz2));
        const c = out.boundingBox.getCenter(new THREE.Vector3());
        out.boundingSphere = new THREE.Sphere(c, c.distanceTo(out.boundingBox.max));
      } else { out.computeBoundingSphere(); out.computeBoundingBox(); }
      alTerminar(out);
    };
    avanzar();
  }
  // CG-73: la fusión cercana (fundirCercaPaso) clonaba cada instancia, le aplicaba la matriz y luego
  // fusionLenta volvía a copiar. Los clones seguían vivos (gr.geos) hasta cerrar la zona: a ~9 s el heap
  // se iba a 139–145 MB con basura que el GC aún no había recogido (presupuesto 120; KIMI-341). Aquí se
  // escribe el mismo resultado en un solo pase, desde la geometría fuente y la matriz de la instancia.
  // Mismo contrato que clone + applyMatrix4 (r128: getX no desnormaliza) + fusionLenta, troceado igual.
  const _nmCerca = new THREE.Matrix3();
  const _truncU8 = new Uint8Array(1), _truncI8 = new Int8Array(1), _truncU16 = new Uint16Array(1), _truncI16 = new Int16Array(1), _truncU32 = new Uint32Array(1), _truncI32 = new Int32Array(1);
  function truncAttr(a, v) {
    const arr = a.array;
    if (!arr || arr instanceof Float32Array || arr instanceof Float64Array) return v;
    const t = arr instanceof Uint16Array ? _truncU16 : arr instanceof Int16Array ? _truncI16
      : arr instanceof Uint8Array ? _truncU8 : arr instanceof Int8Array ? _truncI8
      : arr instanceof Uint32Array ? _truncU32 : arr instanceof Int32Array ? _truncI32 : null;
    if (!t) return v;
    t[0] = v;
    return t[0];
  }
  function fusionLentaPartes(partes, modo, ms, paso, alTerminar) {
    let nv = 0, ni = 0;
    for (const d of partes) {
      const g = d.geo, n = g.attributes.position.count;
      nv += n; ni += g.index ? g.index.count : n;
    }
    const dims = modo === 'tex' ? { position: 3, normal: 3, uv: 2, avCelda: 2 }
      : { position: 3, normal: 3, uv: partes.every(d => d.geo.attributes.uv) ? 2 : 0 };
    const arr = {};
    for (const k in dims) if (dims[k]) arr[k] = new Float32Array(nv * dims[k]);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let p0 = 0, vo = 0, io = 0, v0 = 0, x0 = 0;
    let bx1 = Infinity, by1 = Infinity, bz1 = Infinity, bx2 = -Infinity, by2 = -Infinity, bz2 = -Infinity;
    const TROZO = 24576;
    const avanzar = () => {
      const t0 = performance.now();
      while (p0 < partes.length) {
        const d = partes[p0], g = d.geo, a = g.attributes, n = a.position.count, e = d.m.elements;
        if (v0 < n) {
          const kp = kNorm(a.position), kn = a.normal ? kNorm(a.normal) : 1, ku = a.uv ? kNorm(a.uv) : 1, ka = a.avCelda ? kNorm(a.avCelda) : 1;
          const ne = arr.normal && a.normal ? _nmCerca.getNormalMatrix(d.m).elements : null;
          const cu = d.celda ? (d.celda[1] % 4) / 4 : 0, cv = d.celda ? Math.floor(d.celda[1] / 4) / 4 : 0;
          const fin = Math.min(n, v0 + TROZO);
          for (let i = v0; i < fin; i++) {
            const v = vo + i;
            const x = a.position.getX(i), y = a.position.getY(i), z = a.position.getZ(i);
            const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
            let px = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
            let py = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
            let pz = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
            px = truncAttr(a.position, px); py = truncAttr(a.position, py); pz = truncAttr(a.position, pz);
            px *= kp; py *= kp; pz *= kp;
            arr.position[v * 3] = px; arr.position[v * 3 + 1] = py; arr.position[v * 3 + 2] = pz;
            if (px < bx1) bx1 = px; if (px > bx2) bx2 = px;
            if (py < by1) by1 = py; if (py > by2) by2 = py;
            if (pz < bz1) bz1 = pz; if (pz > bz2) bz2 = pz;
            if (ne) {
              let nx = a.normal.getX(i), ny = a.normal.getY(i), nz = a.normal.getZ(i);
              let rx = ne[0] * nx + ne[3] * ny + ne[6] * nz;
              let ry = ne[1] * nx + ne[4] * ny + ne[7] * nz;
              let rz = ne[2] * nx + ne[5] * ny + ne[8] * nz;
              const len = Math.hypot(rx, ry, rz) || 1;
              rx = truncAttr(a.normal, rx / len); ry = truncAttr(a.normal, ry / len); rz = truncAttr(a.normal, rz / len);
              arr.normal[v * 3] = rx * kn; arr.normal[v * 3 + 1] = ry * kn; arr.normal[v * 3 + 2] = rz * kn;
            }
            if (arr.uv && a.uv) { arr.uv[v * 2] = a.uv.getX(i) * ku; arr.uv[v * 2 + 1] = a.uv.getY(i) * ku; }
            if (arr.avCelda) {
              if (d.celda) { arr.avCelda[v * 2] = cu; arr.avCelda[v * 2 + 1] = cv; }
              else if (a.avCelda) { arr.avCelda[v * 2] = a.avCelda.getX(i) * ka; arr.avCelda[v * 2 + 1] = a.avCelda.getY(i) * ka; }
            }
          }
          v0 = fin;
        } else {
          const cnt = g.index ? g.index.count : n, fin = Math.min(cnt, x0 + TROZO * 3);
          if (g.index) for (let i = x0; i < fin; i++) idx[io + i] = g.index.getX(i) + vo;
          else for (let i = x0; i < fin; i++) idx[io + i] = i + vo;
          x0 = fin;
          if (x0 >= cnt) { io += cnt; vo += n; p0++; v0 = 0; x0 = 0; }
        }
        if (performance.now() - t0 >= ms) break;
      }
      if (p0 < partes.length) { paso(avanzar); return; }
      const out = new THREE.BufferGeometry();
      for (const k in arr) if (arr[k]) out.setAttribute(k, new THREE.BufferAttribute(arr[k], dims[k]));
      out.setIndex(new THREE.BufferAttribute(idx, 1));
      if (nv) {
        out.boundingBox = new THREE.Box3(new THREE.Vector3(bx1, by1, bz1), new THREE.Vector3(bx2, by2, bz2));
        const c = out.boundingBox.getCenter(new THREE.Vector3());
        out.boundingSphere = new THREE.Sphere(c, c.distanceTo(out.boundingBox.max));
      } else { out.computeBoundingSphere(); out.computeBoundingBox(); }
      alTerminar(out);
    };
    avanzar();
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
  // F2.2: las caras de arriba del tejado (normal hacia el cielo, en la mitad alta) pasan a rojo teja
  // cálido. El color de vértice del _lejos estaba en ~0,11 y desde el aire no se leía. No se toca la geometría.
  function techar(geo) {
    const pos = geo.attributes.position, nor = geo.attributes.normal, col = geo.attributes.color;
    if (!pos || !nor || !col) return;
    let y1 = -1e9;
    for (let i = 0; i < pos.count; i++) y1 = Math.max(y1, pos.getY(i));
    const corte = y1 * 0.42;
    for (let i = 0; i < pos.count; i++) {
      if (nor.getY(i) > 0.32 && pos.getY(i) > corte) col.setXYZ(i, PAL.teja[0], PAL.teja[1], PAL.teja[2]);
    }
    col.needsUpdate = true;
  }
  // BM97: la lona del _lejos era ocre (0,72/0,46/0,22) y la de cerca roja: pasa a la misma teja, conservando su sombreado
  const esLona = n => /^(toldo_|tienda_|campamento_|carpa_)/.test(n);
  function lonar(geo) {
    const col = geo.attributes.color;
    if (!col || geo.userData.lona) return;
    for (let i = 0; i < col.count; i++) {
      const y = 0.2126 * col.getX(i) + 0.7152 * col.getY(i) + 0.0722 * col.getZ(i), k = Math.min(1.2, Math.max(0.6, y / 0.40));
      col.setXYZ(i, PAL.teja[0] * k, PAL.teja[1] * k, PAL.teja[2] * k);
    }
    col.needsUpdate = true; geo.userData.lona = 1;
  }
  // Piedra Ancient (ciudad del tepuy y el resto del kit). El _hd ya va a marfil; el _lejos
  // seguía ocre y, desde el aire, la ciudad se veía dorada y el grupo de la izquierda, oscuro.
  // muro_roca no entra: es roca y madera del kit Savage, no piedra labrada (se veía crema y perdía caras).
  const esPiedra = n => /^(ruina_|templo_|muro_templo|plataforma_piedra|bloque_piedra|losa_piedra|complejo_ruinas)/.test(n);
  function cremar(geo) {
    const col = geo.attributes.color;
    if (!col) return;
    for (let i = 0; i < col.count; i++) {
      const y = 0.2126 * col.getX(i) + 0.7152 * col.getY(i) + 0.0722 * col.getZ(i);
      const t = Math.min(1, Math.pow(Math.max(y, 0) / 0.22, 0.55));
      const d = Math.min(1.12, Math.max(0.84, y / 0.28));
      col.setXYZ(i, (0.55 + 0.41 * t) * d, (0.48 + 0.40 * t) * d, (0.38 + 0.36 * t) * d);
    }
    col.needsUpdate = true;
  }
  // Solo se quitan los triángulos degenerados (altura sobre la arista larga < 2 cm). La regla de antes
  // (arista larga > 12 × la corta) borraba caras reales de torres, pilastras y cornisas: 18–38 % de los
  // triángulos de ruina_torre* y muro_roca, y desde lejos las ciudades se veían como esqueletos con huecos.
  function podarAstillas(geo) {
    const pos = geo.attributes.position, index = geo.index;
    if (!pos || !index) return;
    const src = index.array, nt = index.count / 3, keep = [];
    const dist = (a, b) => Math.hypot(pos.getX(a) - pos.getX(b), pos.getY(a) - pos.getY(b), pos.getZ(a) - pos.getZ(b));
    for (let t = 0; t < nt; t++) {
      const a = src[t * 3], b = src[t * 3 + 1], c = src[t * 3 + 2];
      const ab = dist(a, b), bc = dist(b, c), ca = dist(c, a);
      const corto = Math.min(ab, bc, ca), largo = Math.max(ab, bc, ca), sp = (ab + bc + ca) / 2;
      const area = Math.sqrt(Math.max(0, sp * (sp - ab) * (sp - bc) * (sp - ca)));
      if (corto < 1e-4 || 2 * area / largo < 0.02) continue;
      keep.push(a, b, c);
    }
    if (!keep.length || keep.length === index.count) return;
    geo.setIndex(new THREE.BufferAttribute(new (pos.count > 65535 ? Uint32Array : Uint16Array)(keep), 1));
    geo.computeBoundingSphere();
  }
  // horneado: el _lejos ya trae la crema en COLOR_0 (77d79ca, extras.avCremaLejos). Cremarlo otra vez lo llevaba a blanco.
  function piedraLejos(n, geo, horneado) {
    if (!esPiedra(n) || !geo) return;
    podarAstillas(geo);
    if (!horneado) cremar(geo);
    marfilar(geo);
  }
  // BM23: desde el aire la crema horneada, con el sol cálido y el verde del suelo en la luz hemisférica, se leía amarillo oliva.
  // Se acerca al marfil de la meta de Kelvin: menos saturación (×0,55) y algo más de luz, sin tocar la luminosidad relativa de las caras.
  // BM56 (BM38 se había perdido): el ×1,38 llevaba a 1,0 las caras claras y el _lejos salía blanco puro frente al crema
  // del cercano. Tope por canal = el techo de la piedra cercana (cremaPlana/atlas: 0,94 / 0,85 / 0,72).
  // BM79: con el sol y la luz del cielo el Lambert multiplicaba el 0,94 por más de 1 y las losas llanas salían blancas: tope más bajo.
  const TOPE_LEJOS = [0.80, 0.68, 0.52], TINTE_LEJOS = [1, 0.86, 0.60];
  function marfilar(geo) {
    const col = geo.attributes.color;
    if (!col || geo.userData.marfil) return;
    for (let i = 0; i < col.count; i++) {
      const r = col.getX(i), g = col.getY(i), b = col.getZ(i), y = 0.2126 * r + 0.7152 * g + 0.0722 * b, s = 0.5, k = 1.38;
      col.setXYZ(i, Math.min(TOPE_LEJOS[0], (y + (r - y) * s) * k * TINTE_LEJOS[0]), Math.min(TOPE_LEJOS[1], (y + (g - y) * s) * k * 0.97 * TINTE_LEJOS[1]), Math.min(TOPE_LEJOS[2], (y + (b - y) * s * 1.15) * k * TINTE_LEJOS[2]));
    }
    col.needsUpdate = true; geo.userData.marfil = 1;
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
  let kitBase = 'assets/models/edificios/'; // KIMI-177: lo fija iniciar(); lo lee el gancho 'calidad' (fuera de su alcance)
  function iniciar(cfg) {
    const T = G.terreno, MAPA = cfg.mapa, ED = cfg.ED, B64 = ED.b64 || 'AV_EDIFICIOS_B64', base = kitBase = ED.base;
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
    // ruina_torre_f mide 6,6 m en Y y 2,3 m en planta. En la ciudad la matriz del export le aplica
    // un cabeceo de −90° y la torre queda acostada: desde el sureste se lee como un gancho.
    // El modelo ya es Y-arriba. Se conservan el rumbo, la escala uniforme y el origen.
    const ejeT = new THREE.Vector3(), ejeYT = new THREE.Vector3(0, 1, 0), ejeZT = new THREE.Vector3();
    function enderezarTorreY(I) {
      I.m.decompose(vecA, quatA, escA);
      ejeT.set(1, 0, 0).applyQuaternion(quatA); ejeT.y = 0;
      if (ejeT.lengthSq() < 1e-8) ejeT.set(1, 0, 0);
      ejeT.normalize();
      ejeZT.crossVectors(ejeT, ejeYT).normalize();
      const s = (escA.x + escA.y + escA.z) / 3;
      I.m.makeBasis(ejeT, ejeYT, ejeZT);
      I.m.scale(escA.set(s, s, s));
      I.m.setPosition(vecA);
      I.pos = [vecA.x, vecA.y, vecA.z]; I.escala = s; I.erguido = true;
      const e = I.m.elements; I.rotY = Math.atan2(e[8], e[10]);
    }
    // 1-nov: también las otras dos zonas con templos grandes (las ruinas del este y el complejo de la colina), que de lejos salían como bloques blancos
    const CIUDADES = new Set(['kelvin_ruinas_yunque', 'kelvin_ruinas_yunque_2', 'kelvin_aldea_rio_este_2', 'kelvin_aldea_colina']);
    const esCiudad = id => CIUDADES.has(id);

    // BM39: piedra de ruinas (miradores, ciudad y colina) que flota sobre el escalón. Solo baja: si el origen queda más de
    // `sobre` por encima del mínimo del terreno bajo su huella, se lleva a ese mínimo; las hundidas a propósito (zócalo) no se tocan.
    const RUINA = { modelos: /^(ruina_(?!torre)|templo_|bloque_piedra|complejo_ruinas|monolito)/, zonas: /^kelvin_ruinas_yunque/, huella: 0.5, huellaMax: 6, sobre: 0.3 };
    function bajarRuina(I) {
      if (!RUINA.modelos.test(I.modelo) || !RUINA.zonas.test(I.zona)) return;
      const h = Math.min(I.r * RUINA.huella, RUINA.huellaMax), c = Math.cos(I.rotY), s = Math.sin(I.rotY);
      let y = Infinity;
      for (const [u, v] of [[-h, -h], [h, -h], [-h, h], [h, h], [0, 0]]) y = Math.min(y, T.height(I.pos[0] + u * c + v * s, I.pos[2] - u * s + v * c));
      if (isFinite(y) && I.pos[1] - y > RUINA.sobre) { I.pos[1] = y; I.m.elements[13] = y; }
    }

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
          if (c.zona === 'kelvin_ruinas_yunque' && c.n === 'ruina_torre_f' && !I.erguido) enderezarTorreY(I);
        } else {
          const x = c.pos[0], z = c.pos[2], suelo = T.height(x, z);
          const y = c.op.yExacta && c.pos[1] != null ? c.pos[1] : c.pos[1] != null ? Math.min(c.pos[1], suelo) : suelo;
          let rot = c.rotY;
          if (c.op.orientar !== false && cfg.orientar) { const a = cfg.orientar(Object.assign({}, c.e, { id: c.id, pos: [x, y, z] }), c.n); if (a != null) rot = a; }
          I.escala = pack * c.escala; I.rotY = rot; I.pos = [x, y, z];
          I.m.compose(vecA.set(x, y, z), quatA.setFromAxisAngle(up, rot), escA.set(I.escala, I.escala, I.escala));
        }
        const k = kit && kit[c.n], rad = k && k.radio ? k.radio : c.e.dim ? Math.hypot(c.e.dim[0], c.e.dim[1], c.e.dim[2]) / 2 : 10;
        I.r = rad * I.escala; bajarRuina(I); I.cx = I.pos[0]; I.cy = I.pos[1] + I.r * 0.4; I.cz = I.pos[2];
        inst.push(I);
        (porModelo[c.n] || (porModelo[c.n] = [])).push(I);
        const Z = zonas[c.zona] || (zonas[c.zona] = { id: c.zona, inst: [], modelos: new Set(), cx: 0, cz: 0, r: 0, nivel: 0, forzada: false, ciudad: false, ciudadHasta: 0, d: Infinity });
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
      const partes = r.tipo === 'lejos' ? [{ geo: r.geo, mat: r.mat || matLejos }] : r.partes;
      const L = lotes[k] = { n: r.n, tipo: r.tipo, attr, mallas: [], lista: [], prev: [], sombra: false };
      for (const p of partes) {
        const m = new THREE.InstancedMesh(p.geo, p.mat, cap);
        m.instanceMatrix = attr; m.count = 0; m.visible = false; m.frustumCulled = false; m.matrixAutoUpdate = false;
        m.castShadow = r.tipo !== 'lejos';
        m.receiveShadow = true;
        m.name = 'edificiosInst:' + r.n + ':' + r.tipo + ':' + p.mat.name; m.userData.sinSolido = true;
        scene.add(m); L.mallas.push(m); subirTex(m);
      }
      r.mallas = L.mallas;
    }
    function quitarLote(r) {
      const k = r.n + ':' + r.tipo, L = lotes[k]; if (!L) return;
      for (const m of L.mallas) scene.remove(m);
      if (L.panel) L.panel.geometry.dispose();
      delete lotes[k]; r.mallas = [];
    }

    // --- carga y liberación de recursos (conteo de referencias por zonas) ---
    const cola = []; let enVuelo = 0;
    // BM133: _hd de 400 k triángulos de complejo_ruinas (complejo_ruinas_hd400). KIMI-022 (docs/img/kimi022/,
    // matriz «limpia-*»): criterio de encendido cumplido con GPU real (escritorio medio ON fpsMed 111,8 / p50 142,9 ≥ 50)
    // y el fusible MOVIL_PEQ lo mantiene apagado en teléfonos (la verificación funcional --hd400 auto lo confirmó:
    // escritorio carga el hd400; móvil táctil 390×844 no). Los dos rojos que retrasaron el encendido (16/17 _hd 'listos'
    // en ruinas_yunque y AV_HD_Ancient ausente en la vista aérea) resultaron ser CONTENCIÓN de la PC compartida, no
    // código: con PC libre y hd400=1 streamingTest da 23/24 = HEAD (solo QA-81 intermitente, 158 calls). ON por defecto
    // en escritorio y tablet; ?hd400=0 lo apaga y ?hd400=1 lo fuerza (herramientas y A/B).
    const HD400 = (() => { try { const v = new URLSearchParams(location.search).get('hd400'); return v === null ? !MOVIL_PEQ : v === '1'; } catch (e) { return false; } })();
    const cargarGLB = clave => G.assets.loadGLB(base + clave + '.glb', { b64: () => (window[B64] || {})[clave], script: base + clave + '_glb.js', base, error: 'edificio no disponible: ' + clave });
    const tieneLejos = n => { const k = KIT(); return !!(k && k[n] && k[n].lejos); };
    const tieneHD = n => { const k = KIT(); return !!(k && k[n] && k[n].hd); };
    const CELDAS = [
      ['ancient', 0, /AV_Restaurado_Bloques|KB3D_stoneM/i], ['ancient', 1, /AV_Restaurado_Piedra|KB3D_wallM/i],
      ['ancient', 2, /KB3D_wallL/i], ['ancient', 3, /KB3D_pillarsM/i], ['ancient', 4, /AV_Restaurado_Base|KB3D_floorM/i],
      ['ancient', 5, /KB3D_floorDarkM/i], ['ancient', 6, /KB3D_mudM/i], ['ancient', 7, /KB3D_mudDarkM/i],
      ['ancient', 8, /KB3D_damageM/i], ['ancient', 9, /KB3D_damageL/i], ['ancient', 10, /AV_Restaurado_Tallado|KB3D_decoM/i],
      ['ancient', 11, /KB3D_blocksL/i], ['ancient', 12, /KB3D_bricksM/i], ['ancient', 13, /KB3D_beams/i],
      ['ancient', 14, /KB3D_rockM/i], ['ancient', 15, /KB3D_sculptM/i],
      ['savage', 0, /KB3D_WoodPlanks/i], ['savage', 1, /KB3D_WoodHewn/i], ['savage', 2, /KB3D_BarkNew/i],
      ['savage', 3, /KB3D_BarkCharred/i], ['savage', 4, /KB3D_RoofThatched/i], ['savage', 5, /KB3D_TarpFabricDamaged/i],
      ['savage', 6, /KB3D_Rope/i], ['savage', 7, /KB3D_RockSharp/i], ['savage', 8, /KB3D_RockSmooth/i], ['savage', 9, /KB3D_MudRocky/i]
    ];
    function materialAtlas(kit) {
      const k = 'AV_HD_' + (kit === 'ancient' ? 'Ancient' : 'Savage');
      if (!mats[k]) {
        // KIMI-202/KIMI-250: el difuso del atlas SIEMPRE arranca con el JPEG 2048² horneado
        // (tex_hd/hd_<kit>_lq.jpg, ~1,3-1,6 MB frente a 4,1-5,4 MB del 4096²): es la MISMA resolución que
        // ya dejaba reducirAtlas() en «bajo» y en el móvil fuera de alta (atlasMax 2048/1024), así que esas
        // vistas no cambian; se ahorra la descarga y el pico de decodificación del 4096. En medio/alto de
        // escritorio (atlasMax() = 0) el 4096 real se pide en background a los ~20 s, fuera de la ventana
        // de carga (KIMI-244: tope 28 MB incumplido, 61,4 MB medidos), con el mismo swap del gancho
        // 'calidad': la vista final queda idéntica. Al subir de calidad el gancho pide el 4096 al momento.
        // KIMI-204: en el móvil de pantalla pequeña (MOVIL_PEQ) el tope de reducirAtlas ya es 1024²
        // (atlasMax = celdas*celda/4, decisión QA-110 de Kelvin), así que se sirve el JPEG horneado a
        // 1024 (hd_<kit>_lq1024.jpg, ~0,3-0,4 MB): los MISMOS píxeles que el canvas 1024 que reducirAtlas
        // haría del 2048, sin doble decodificación y con ~2,2 MB menos de descarga.
        const lqMovil = MOVIL_PEQ;
        // KIMI-250: si el kit ya subió el 4096 real en background (barrido de los ~20 s), el material nuevo
        // nace con el 4096; si no, con el LQ de arranque y la marca para subirlo después.
        const listo = !!(G.assets && G.assets.atlasHDListoEs && G.assets.atlasHDListoEs(kit));
        // «Texturas optimizadas» (bajo/Modo Escuela): con .ktx2 disponible, el material nace con el 2×2 del color del kit
        // (no se baja el JPEG) y atlasHD → ajustarComprimida le pone el KTX2 al llegar (o el JPEG si falla).
        const lqUrl = base + 'tex_hd/hd_' + kit + (lqMovil ? '_lq1024' : '_lq') + '.jpg';
        const conKTX2 = !listo && G.assets.ktx2De && G.assets.ktx2De(lqUrl);
        const map = G.assets.tex(conKTX2 ? G.assets.planoKit(kit) : listo ? base + 'tex_hd/hd_' + kit + '.jpg' : lqUrl);
        map.encoding = THREE.sRGBEncoding;
        map.flipY = false;
        // KIMI-177: en «bajo» la normal del atlas (JPEG de ~14 MB, las dos ~28 MB) no se descarga: a DPR 0,75 su relieve
        // no se aprecia y era la mitad de la carga inicial real con GPU (los cuatro tex_hd son 36 MB y entran en el
        // spawn con la fusión cercana de la ciudad). Mismo criterio que el kit ligero («el relieve va en el atlas, solo
        // en alta», línea ~231). Si la calidad sube, el gancho 'calidad' de abajo la descarga y la engancha al mismo
        // material (needsUpdate, sin refundir la zona).
        // KIMI-207 (QA-201): en «medio/alto» la normal del atlas baja al JPEG horneado 2048²
        // (tex_hd/hd_<kit>_n_lq.jpg, ~1,7 MB frente a ~14 MB del 4096²): eran 27,7 MB de la carga inicial
        // en medio/alto (Mac 36,7 MB > tope 28) y el relieve toon no la distingue (A/B de capturas KIMI-207).
        const normalMap = nivelCal() === 'bajo' ? null : G.assets.tex(base + 'tex_hd/hd_' + kit + '_n_lq.jpg');
        if (normalMap) normalMap.flipY = false;
        mats[k] = { mat: crearMaterial({ name: k, map, normalMap, side: THREE.DoubleSide }, k), refs: 0, fijo: false };
        // El shader del atlas corrige el LOD con avAtlasEsc (tamaño real / 4096): hay que fijarla ya con
        // el JPEG que se sirvió (0,5 para el 2048, 0,25 para el 1024 del móvil pequeño, 1 para el 4096),
        // no solo cuando pase reducirAtlas (puede que ningún evento 'calidad' llegue antes de la fusión).
        // El upgrade en background lo hacen el barrido de los ~20 s o el gancho 'calidad' (misma clave en mats).
        mats[k].mat.userData.avLQDifuso = !listo;
        mats[k].mat.userData.avAtlasEsc.value = listo ? 1 : lqMovil ? 0.25 : 0.5;
      }
      return mats[k].mat;
    }
    // KIMI-044: clave de celda del atlas SIN clonar la geometría.
    function atlasCelda(geo, mat) {
      if ((geo.attributes.avCelda && /^AV_HD_/.test(mat.name)) || !geo.attributes.uv) return null;
      return CELDAS.find(c => c[2].test(mat.name)) || null;
    }
    // KIMI-044: la fase 1 de la fusión (_hd/cercano) solo apila {geo fuente, matriz de instancia, celda del
    // atlas}; el clon (con su avCelda) se materializa al cerrar CADA GRUPO, en tandas de ~6 ms, y se dispone
    // al terminar ese grupo. Antes convertirAtlas clonaba cada parte por instancia en la fase 1 y todos los
    // clones vivían hasta cerrar el último grupo: en el drenado de la ciudad el pico transitorio de heap era
    // fuente + todos los clones + lo ya fundido (+134 MB medidos en k044-base1.json; palanca «soltar lo ya
    // consumido por la fusión» de QA-152 fase 7 / QA-153).
    function apilarParte(F, p, I) {
      const c = atlasCelda(p.geo, p.mat), mat = c ? materialAtlas(c[0]) : p.mat;
      let gr = F.grupos.get(mat.name); if (!gr) F.grupos.set(mat.name, gr = { mat, partes: [], ins: [], modelos: new Set() });
      gr.partes.push({ geo: p.geo, m: I.m, celda: c });
      gr.ins.push(I); gr.modelos.add(I.modelo);
    }
    function materializarGrupo(F, gr, ms) {
      if (!gr.tmp) { gr.tmp = []; gr.geos = []; gr.pi = 0; F.temporales = gr.tmp; }
      const t0 = performance.now();
      while (gr.pi < gr.partes.length && performance.now() - t0 < ms) {
        const d = gr.partes[gr.pi++], g = d.geo.clone();
        if (d.celda) {
          const n = g.attributes.position.count, uv = new Float32Array(n * 2);
          for (let i = 0; i < n; i++) { uv[i * 2] = (d.celda[1] % 4) / 4; uv[i * 2 + 1] = Math.floor(d.celda[1] / 4) / 4; }
          g.setAttribute('avCelda', new THREE.BufferAttribute(uv, 2)); g.deleteAttribute('uv2');
        }
        g.applyMatrix4(d.m);
        gr.tmp.push(g); gr.geos.push(g);
      }
      return gr.pi >= gr.partes.length;
    }
    const hdActivo = () => (CFG.hd[nivelCal()] || 0) > 0 && hdGL2();
    // QA-158 (4-nov, iPhone Safari recarga tras 5–10 min de vuelo): en «bajo» no se funde el _hd de zona ni el global.
    // Medido en vuelo (docs/img/kimi158/qa158-atrib2.json): las fusiones edificiosZonaHD* retenían ~270 MB de geometría
    // en la villa (visibles a 0) + ~70 MB de recursos _hd listos. El _hd por instancia a <45 m (lotes, tope hdTris) se
    // queda: la imagen de cerca en «bajo» no cambia. Móvil en «medio» usa nivelCiudad() = 'bajo' (mismo criterio que
    // ciudadVista/ciudadHD, QA-107); escritorio en «medio» sigue fundiendo como antes.
    const hdZona = () => nivelCiudad() !== 'bajo';
    function pedir(r, prio) {
      r.refs++; r.soltarEn = 0;
      if (r.estado === 'nada') {
        r.estado = 'cola'; r.prio = prio;
        r.promesa = new Promise((ok, mal) => { r.ok = ok; r.mal = mal; });
        r.promesa.catch(() => {});
        if (r.tipo === 'lejos' && !tieneLejos(r.n)) generarDesdeCerca(r, prio);
        else { cola.push(r); siguiente(); }
      } else if (r.estado === 'cola' && prio < r.prio) { r.prio = prio; siguiente(); }
      return r.promesa;
    }
    function soltar(r) {
      if (--r.refs > 0 || r.fijo) return;
      r.refs = 0; r.soltarEn = performance.now() + CFG.gracia * 1000;
    }
    // Con el jugador quieto solo arrancan el lejano cercano y el modelo completo de la precarga.
    // El resto espera en cola, con referencia, hasta que Vittata se mueve.
    function puedeAhora(r) {
      if (!(arrancando || quieto)) return true;
      if (precarga && !arrancando && r.prio <= precarga.radio) return true; // pantalla de carga: la zona de inicio entera
      const pre = CFG.precarga[nivelCal()] || 50, lq = CFG.lejosQuieto[nivelCal()] || 150;
      return (r.tipo === 'lejos' && r.prio < lq) || ((r.tipo === 'cerca' || r.tipo === 'hd') && r.prio < pre);
    }
    function siguiente() {
      const max = terminarMax ? Math.max(4, CFG.descargas * 2) : arrancando ? CFG.descargasArranque : precarga ? precarga.descargas : CFG.descargas;
      while (enVuelo < max && cola.length) {
        cola.sort((a, b) => a.prio - b.prio);
        const i = cola.findIndex(puedeAhora);
        if (i < 0) break;
        const r = cola.splice(i, 1)[0];
        if (r.estado !== 'cola') continue;
        // QA-160: un recurso pedido y luego soltado mientras aún estaba en cola (la zona cambió de nivel antes
        // de que la descarga arrancara) se descarta aquí; hay que resolver su promesa, si no queda colgada para
        // siempre y el Promise.all de listasCerca() (alrededor) espera un recurso que nadie necesita → cuelgue
        // del test/herramienta con la cola vacía (medido 5-nov: carpa_a:cerca, monumento_b:cerca… nada+promesa).
        if (!r.refs && !r.fijo) { r.estado = 'nada'; const ok = r.ok; r.ok = r.mal = r.promesa = null; if (ok) ok(r); continue; }
        r.estado = 'bajando'; enVuelo++;
        cargarGLB(r.tipo === 'lejos' ? r.n + '_lejos' : r.tipo === 'hd' ? r.n + (HD400 && r.n === 'complejo_ruinas' ? '_hd400' : '_hd') : r.n)
          .then(gltf => encolar(() => procesar(r, gltf.scene), 'procesar:' + r.n + ':' + r.tipo), err => { r.estado = 'error'; r.error = err; r.mal(err); })
          .then(() => { enVuelo--; siguiente(); });
      }
    }
    function tieneTeja(n) {
      const k = KIT(), mats = k && k[n] && k[n].mats;
      return !!(mats && mats.some(m => /RoofThatched/i.test(m)));
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
      // BM105: el _lejos Ancient con UV y celda del atlas (TEXCOORD_1) se dibuja con AV_HD_Ancient, el mismo material y tono del cercano
      const gt = r.tipo === 'lejos' && grupos.size === 1 && grupos.get('AV_Lejos').geos.length === 1 ? grupos.get('AV_Lejos') : null;
      if (gt && gt.geos[0].attributes.uv && gt.geos[0].attributes.uv2 && gt.src && gt.src.map && /^AV_HD_/.test(gt.src.name)) {
        const geo = gt.geos[0];
        geo.setAttribute('avCelda', geo.attributes.uv2); geo.deleteAttribute('uv2'); geo.deleteAttribute('color');
        if (!geo.boundingSphere) geo.computeBoundingSphere(); if (!geo.boundingBox) geo.computeBoundingBox();
        r.mat = material(gt.src, r.fijo); usados.add(r.mat); if (r.mat.map) usados.add(r.mat.map); if (r.mat.normalMap) usados.add(r.mat.normalMap);
        r.geo = geo;
      } else if (r.tipo === 'lejos') {
        const geos = [...grupos.values()].flatMap(g => g.geos.map(geo => {
          if (geo.attributes.color) return geo;
          const c = g.src.color || new THREE.Color(1, 1, 1), n = geo.attributes.position.count, a = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
          const out = geo.clone(); out.setAttribute('color', new THREE.BufferAttribute(a, 3)); return out;
        }));
        r.geo = fundir(geos, true);
        piedraLejos(r.n, r.geo, [...grupos.values()].some(g => g.src && g.src.userData && g.src.userData.avCremaLejos === 1));
        if (tieneTeja(r.n)) techar(r.geo);
        if (esLona(r.n)) lonar(r.geo);
      } else {
        r.partes = [];
        for (const [, gr] of grupos) {
          const mat = material(gr.src, r.fijo);
          usados.add(mat); if (mat.map) usados.add(mat.map); if (mat.normalMap) usados.add(mat.normalMap);
          const geo = gr.geos.length === 1 ? gr.geos[0] : fundir(gr.geos, false);
          if (!geo.boundingBox) geo.computeBoundingBox();
          if (!geo.boundingSphere) geo.computeBoundingSphere();
          // celda del atlas de la versión _hd: TEXCOORD_1 llega como uv2 (en r128 lo leen el aoMap y el lightMap)
          if (r.tipo === 'hd' && geo.attributes.uv2) { geo.setAttribute('avCelda', geo.attributes.uv2); geo.deleteAttribute('uv2'); }
          r.partes.push({ geo, mat });
        }
        // la versión _hd es solo imagen: esferas, vanos y colisiones son las del ligero
        if (r.tipo === 'cerca') {
          // vanos de puerta a un interior vacío: solidos.js los tapa con un panel fundido en una de las partes (B4)
          if (G.solidos && G.solidos.cerrarVanos) G.solidos.cerrarVanos(r.n, r.partes, fundir);
          const caja = new THREE.Box3(); for (const p of r.partes) caja.union(p.geo.boundingBox);
          const esf = caja.getBoundingSphere(new THREE.Sphere());
          r.radio = esf.radius; r.centro = esf.center; r.alto = caja.max.y;
          actualizarEsferas(r.n, esf);
        }
      }
      soltarSobrantes(root, usados);
      root.traverse(o => { if (o.isMesh && r.tipo !== 'lejos' && !r.partes.some(p => p.geo === o.geometry)) o.geometry.dispose(); });
      if (r.tipo === 'lejos') root.traverse(o => { if (o.isMesh && o.geometry !== r.geo) o.geometry.dispose(); });
      r.estado = 'listo';
      if (!r.refs && !r.fijo) r.soltarEn = performance.now() + CFG.gracia * 1000;
      crearLote(r);
      r.ok(r);
      if (r.tipo === 'lejos') zonasDe(r.n);
      if (r.tipo === 'hd' && hdZona()) for (const id in zonas) if ((zonas[id].ciudad || zonas[id].nivel === 2) && zonas[id].modelos.has(r.n)) encolar(() => fundirHD(zonas[id]), 'fundirHD:' + id);
      if (r.tipo === 'cerca') {
        for (const id in zonas) if ((zonas[id].ciudad || zonas[id].nivel === 2) && zonas[id].modelos.has(r.n)) {
          encolar(() => fundirCercaZona(zonas[id]), 'fundirCerca:' + id); encolar(() => fundirSombraZona(zonas[id]), 'fundirSombra:' + id);
        }
        for (const I of porModelo[r.n] || []) if (!I.colocado && zonas[I.zona].nivel === 2) encolar(() => colocar(I), 'colocar:' + I.modelo);
      }
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
        try { r.geo = generarLejos(rc.partes); piedraLejos(r.n, r.geo); if (tieneTeja(r.n)) techar(r.geo);
        if (esLona(r.n)) lonar(r.geo); r.estado = 'listo'; crearLote(r); if (!r.refs) r.soltarEn = performance.now() + CFG.gracia * 1000; r.ok(r); zonasDe(r.n); }
        catch (e) { r.estado = 'error'; r.mal(e); }
        soltar(rc);
      }), err => { r.estado = 'error'; r.mal(err); soltar(rc); });
    }
    function liberar(r) {
      quitarLote(r);
      if (r.tipo !== 'lejos' && r.partes) { for (const p of r.partes) { p.geo.dispose(); soltarMaterial(p.mat); } r.partes = null; }
      if (r.tipo === 'lejos' && r.geo) { r.geo.dispose(); r.geo = null; if (r.mat) { soltarMaterial(r.mat); r.mat = null; } }
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
      // BM6-1: bohío de puerta abierta compartida: salvo la instancia amueblada, cada una pone su panel (sólido)
      if (G.bohiosAbiertos && G.bohiosAbiertos[I.modelo] && !(G.esBohioAbierto && G.esBohioAbierto(I)) && G.solidos && G.solidos.panelInstancia) G.solidos.panelInstancia(I.modelo, I.m);
      // KIMI-034: agregarPartes encola directo; la vía agregar(Group+Mesh) dejaba basura por instancia
      if (G.solidos && G.solidos.agregarPartes) G.solidos.agregarPartes(r.partes, I.m, I.modelo);
      else if (G.solidos && G.solidos.agregar) {
        const g = new THREE.Group();
        for (const p of r.partes) { const m = new THREE.Mesh(p.geo, p.mat); m.matrixAutoUpdate = false; m.matrix.copy(I.m); g.add(m); }
        g.userData.modelo = I.modelo; // BM6-3: solidos.js guarda las matrices por nombre de modelo
        G.solidos.agregar(g);
      }
      const Z = zonas[I.zona];
      if ((Z.ciudad || Z.nivel === 2) && Z.cercaMallas) encolar(() => fundirCercaZona(Z), 'fundirCerca:' + Z.id);
    }

    // --- niveles de las zonas ---
    let activas = [];
    function nivelZona(Z, quiere) {
      const antes = Z.nivel;
      if (quiere === antes) { // estable (o subió de verdad en un tick previo): cancela la bajada que pudiera estar pendiente
        if (Z.bajarPide) { Z.bajarPide = 0; bajasEvitadas++; }
        return;
      }
      if (quiere > antes) { // subida: inmediata y cancela la bajada pendiente
        if (Z.bajarPide) { Z.bajarPide = 0; bajasEvitadas++; }
        aplicarNivel(Z, antes, quiere);
        return;
      }
      // KIMI-038: la bajada solo se aplica si se pide de seguido durante CFG.bajarEspera s. Rozar una frontera en
      // vuelo (la banda de histéresis son ~4 s a 15 m/s) ya no destruye y refunde la fusión de la zona en cada
      // cruce; si el nivel deseado sube antes de que cumpla el temporizador, la bajada se cancela (evitada).
      const ahora = performance.now();
      if (Z.bajarPide) {
        if (quiere <= Z.bajarNivel) Z.bajarNivel = quiere; // sigue queriendo bajar al menos: conserva el reloj
        else { Z.bajarPide = 0; bajasEvitadas++; return; }   // quiso subir respecto al pendiente: cancelar
        if (ahora - Z.bajarPide < CFG.bajarEspera * 1000) return;
        Z.bajarPide = 0;
      } else {
        Z.bajarPide = ahora; Z.bajarNivel = quiere;
        return;
      }
      aplicarNivel(Z, antes, Z.bajarNivel != null ? Z.bajarNivel : quiere);
    }
    function aplicarNivel(Z, antes, quiere) {
      Z.nivel = quiere;
      transNivel++;
      for (const n of Z.modelos) {
        if (antes < 2 && quiere === 2) pedir(res(n, 'cerca'), Z.d).catch(err => respaldo(Z, n, err));
        if (antes === 2 && quiere < 2) soltar(res(n, 'cerca'));
        if (antes < 1 && quiere >= 1) pedir(res(n, 'lejos'), Z.d + 1).catch(() => {});
        if (antes >= 1 && quiere < 1) soltar(res(n, 'lejos'));
      }
      if (antes === 2 && quiere < 2 && !Z.ciudad) quitarCercaZona(Z);
      if (quiere === 2) for (const I of Z.inst) if (!I.colocado && res(I.modelo, 'cerca').estado === 'listo') encolar(() => colocar(I), 'colocar:' + I.modelo);
      if (quiere >= 1) encolar(() => fundirZona(Z), 'fundirZona:' + Z.id); else quitarZona(Z);
      activas = inst.filter(I => zonas[I.zona].nivel >= 1);
    }
    // KIMI-038: el asentado (terminar) y las comprobaciones de tests exigen el estado ya aplicado: las bajadas
    // pendientes se resuelven al momento en vez de esperar al temporizador. Cubre nivel y _hd.
    function aplicarBajasPendientes() {
      for (const id in zonas) {
        const Z = zonas[id];
        if (Z.bajarPide) { Z.bajarPide = 0; const antes = Z.nivel, quiere = Z.bajarNivel != null ? Z.bajarNivel : antes; if (quiere < antes) aplicarNivel(Z, antes, quiere); }
        if (Z.hdBajar) { Z.hdBajar = 0; if (Z.hd) { Z.hd = false; transHD++; quitarHDZona(Z); for (const n of Z.modelos) if (tieneHD(n)) soltar(res(n, 'hd')); } }
      }
    }
    // Distancia al modelo más cercano de la zona (prioridad de descarga: lo que tienes delante entra antes que el resto).
    function distModelo(Z, n) {
      const S = G.S, x = S.pos ? S.pos.x : Z.cx, z = S.pos ? S.pos.z : Z.cz;
      let m = Z.d;
      for (const I of Z.inst) if (I.modelo === n && I.pos) m = Math.min(m, Math.hypot(I.pos[0] - x, I.pos[2] - z) - (I.r || 0));
      return m;
    }
    function cargasPendientes(Z, tipo) {
      return [...Z.modelos].some(n => { const r = res(n, tipo); return r.estado === 'bajando' || (r.estado === 'cola' && r.refs); });
    }
    // KIMI-Task-011: las mallas globales (varias zonas fundidas por material) guardan el tramo del índice de cada zona y se
    // dibujan con grupos: solo los tramos de las zonas que de verdad usan esa versión este cuadro (un draw call por tramo
    // seguido). Antes se dibujaba la malla entera en cuanto una zona estaba a la vista: el _hd de todo el mapa a 650 m y el
    // lejano debajo del cercano (doble dibujo y el parche blanco de la pared).
    // Las fusiones de zona (_hd y cercano) llevan un tramo por instancia; las globales, los de sus zonas uno detrás de otro.
    // claves[i]: la instancia (o la zona, en el lejano global) de geos[i], o la lista de tramos de una malla de zona ya fundida.
    function conTramos(m, mat, geos, claves) {
      m.material = [mat]; m.userData.mat = mat; m.userData.clave = null;
      let ini = 0; const T = m.userData.tramos = [];
      geos.forEach((g, i) => {
        const n = g.index ? g.index.count : g.attributes.position.count, k = claves[i];
        if (Array.isArray(k)) for (const t of k) T.push({ z: t.z, start: ini + t.start, count: t.count });
        else T.push({ z: k, start: ini, count: n });
        ini += n;
      });
      m.geometry.clearGroups();
    }
    // KIMI-034: runs con objetos reutilizados y comparación estructural — antes armaba array + objetos + clave
    // (string) nuevos por malla visible en cada cuadro: basura por cuadro en vuelo.
    function tramos(m, quiere, gapo, gapV) {
      const pool = m.userData._rp || (m.userData._rp = []), runs = m.userData._ru || (m.userData._ru = []);
      runs.length = 0;
      const T = m.userData.tramos;
      if (!gapo) {
        for (const t of T) if (quiere(t.z)) {
          const u = runs.length ? runs[runs.length - 1] : null;
          if (u && u.start + u.count === t.start) u.count += t.count;
          else { const r = pool[runs.length] || (pool[runs.length] = { start: 0, count: 0 }); r.start = t.start; r.count = t.count; runs.push(r); }
        }
      } else {
        // KIMI-192 (QA-81, pedido de Kimi 1 en PEDIDOS 144): en las fusiones GLOBALES los runs se fragmentan
        // por el frustum (cada tramo es una instancia marcada a las que quiere() da paso este cuadro): en la
        // peor vista la fusión HD global dibujaba 7 runs de AV_HD_Ancient. Un run se traga los huecos de
        // instancias NO marcadas que tenga entre pecho y espalda (gapo tramos y gapV vértices de sobre-dibujo
        // acotados): el coste es vértice/clip de vecinas fuera de cuadro, el ahorro es 1 draw call por hueco.
        let i = 0;
        while (i < T.length) {
          if (!quiere(T[i].z)) { i++; continue; }
          const r = pool[runs.length] || (pool[runs.length] = { start: 0, count: 0 });
          r.start = T[i].start; r.count = T[i].count;
          let huecos = 0, extra = 0, j = i + 1, fin = T[i].start + T[i].count;
          while (j < T.length) {
            const t = T[j];
            if (quiere(t.z)) { r.count = t.start + t.count - r.start; fin = t.start + t.count; huecos = 0; j++; continue; }
            // KIMI-225 (arreglo de fondo del doble dibujo de KIMI-192): un hueco solo se traga si su instancia
            // NO se dibuja por ningún otro camino este cuadro: lote propio o fusión (marca fusN del cuadro; fus 1/2
            // fusión, 3 lote) o la silueta beige de su zona (lejosVe: la dibuja su malla o la fusión lejana global).
            // Si se dibuja por ahí hay que romper el run: tragarla sería dibujarla dos veces (z-fighting).
            const Zt = zonas[t.z.zona];
            if (t.z.fusN === fusN || (Zt && Zt.lejosVe)) break;
            huecos++; extra += t.count;
            if (huecos > gapo || extra > gapV) break;
            r.count = t.start + t.count - r.start;
            j++;
          }
          r.count = fin - r.start; // cola: recorta los huecos tragados tras el último tramo querido (sobre-dibujo sin ahorro de call)
          runs.push(r); i = j;
        }
      }
      const prev = m.userData._pr || (m.userData._pr = []);
      let igual = prev.length === runs.length;
      for (let i = 0; igual && i < runs.length; i++) if (prev[i].start !== runs[i].start || prev[i].count !== runs[i].count) igual = false;
      if (!igual) {
        m.geometry.clearGroups(); for (const r of runs) m.geometry.addGroup(r.start, r.count, 0);
        for (let i = 0; i < runs.length; i++) { const p = prev[i] || (prev[i] = { start: 0, count: 0 }); p.start = runs[i].start; p.count = runs[i].count; }
        prev.length = runs.length;
      }
      return runs.length;
    }
    // En las ciudades, todos los _hd comparten la misma vista aérea: se funden por material en vez de dibujar un lote por modelo.
    function quitarHDZona(Z) {
      Z.hdFundiendo = false;
      if (Z.hdF) { for (const g of Z.hdF.temporales) g.dispose(); Z.hdF = null; }
      for (const m of Z.hdMallas || []) { scene.remove(m); m.geometry.dispose(); soltarMaterial(m.userData.mat); }
      Z.hdMallas = null; Z.hdModelos = new Set();
      programarHDGlobal();
    }
    function fundirHD(Z, forzar) {
      if ((!Z.ciudad && Z.nivel < 2) || !Z.hd || Z.hdF || (!forzar && cargasPendientes(Z, 'hd'))) return;
      const modelos = new Set([...Z.modelos].filter(n => tieneHD(n) && res(n, 'hd').estado === 'listo'));
      if (!modelos.size) return;
      if (Z.hdMallas) {
        if ([...modelos].every(n => Z.hdModelos.has(n))) return;
        quitarHDZona(Z);
      }
      Z.hdFundiendo = true;
      // KIMI-135: fundir las instancias en orden espacial de Morton (Z-order) sobre su posición: las vecinas
      // en el espacio quedan en tramos contiguos de la geometría fundida, así los runs por cuadro (vis.hd de
      // la fusión global sobre todo) tienden a ser rangos contiguos y no se fragmentan con el orden del mapa.
      // Misma geometría/imagen, solo cambia el orden.
      const _spread = v => { v &= 0xffff; v = (v | (v << 8)) & 0x00ff00ff; v = (v | (v << 4)) & 0x0f0f0f0f; v = (v | (v << 2)) & 0x33333333; return (v | (v << 1)) & 0x55555555; };
      const _morton = (x, z) => (_spread(x) | (_spread(z) << 1)) >>> 0;
      const inst = Z.inst.slice().sort((a, b) => {
        const qa = _morton(Math.round((a.cx - Z.cx) / 4 + 512), Math.round((a.cz - Z.cz) / 4 + 512));
        const qb = _morton(Math.round((b.cx - Z.cx) / 4 + 512), Math.round((b.cz - Z.cz) / 4 + 512));
        return qa - qb;
      });
      Z.hdF = { i: 0, g: 0, modelos, grupos: new Map(), temporales: [], ms: [], inst };
      encolar(() => fundirHDPaso(Z), 'fundirHD:' + Z.id);
    }
    // KIMI-Task-017: se funde en tandas de ~6 ms por trabajo (el fundido entero de una zona eran 100–420 ms
    // de CPU en un solo trabajo: al teleportar, un cuadro largo). Mientras se refunde, la zona dibuja los
    // lotes por instancia (más draw calls unos cuadros, mismo aspecto).
    function fundirHDPaso(Z) {
      const F = Z.hdF; if (!F) return;
      const limpiar = () => { for (const g of F.temporales) g.dispose(); F.temporales = []; };
      const t0 = performance.now();
      try {
        while (F.i < F.inst.length && performance.now() - t0 < 6) {
          const I = F.inst[F.i++];
          if (!F.modelos.has(I.modelo)) continue;
          for (const p of res(I.modelo, 'hd').partes) apilarParte(F, p, I);
        }
        if (F.i < F.inst.length) { encolar(() => fundirHDPaso(Z), 'fundirHD:' + Z.id); return; }
        // KIMI-020/031: el cierre (fundirTex/fundir por material) también se trocea en tandas de ~6 ms, un grupo
        // por paso. En kelvin_ruinas_yunque el cierre entero era un solo trabajo de ~3,6 s (móvil ×4) que
        // congelaba el cuadro tanto en juego como en terminar(); el troceo por grupos (KIMI-020) no bastaba
        // porque el grupo AV_HD_Ancient funde todas las partes con atlas de golpe (medido 4-nov: 4050 ms).
        if (!F.gruposL) F.gruposL = [...F.grupos.values()];
        const gr = F.gruposL[F.g];
        if (!gr) {
          Z.hdMallas = F.ms; Z.hdModelos = F.modelos;
          limpiar();
          Z.hdF = null; Z.hdFundiendo = false;
          encolar(() => fundirCercaZona(Z), 'fundirCerca:' + Z.id); programarHDGlobal();
          return;
        }
        // KIMI-044: los clones del grupo se materializan aquí en tandas (la fase 1 solo apiló fuentes) y
        // se disponen al cerrar el grupo: el transitorio deja de acumular los clones de todos los grupos.
        if (!materializarGrupo(F, gr, 6)) { encolar(() => fundirHDPaso(Z), 'fundirHD:' + Z.id); return; }
        const atlas = /^AV_HD_/.test(gr.mat.name) && gr.geos.every(g => g.attributes.avCelda);
        fusionLenta(gr.geos, atlas ? 'tex' : 'plana', 6,
          sig => encolar(sig, 'fundirHD:' + Z.id),
          geo => {
            if (Z.hdF !== F) { geo.dispose(); return; } // la zona se invalidó a medias: se descarta
            const m = new THREE.Mesh(geo, gr.mat);
            conTramos(m, gr.mat, gr.geos, gr.ins);
            m.name = 'edificiosZonaHD:' + Z.id + ':' + gr.mat.name; m.userData.sinSolido = true; m.userData.modelos = gr.modelos;
            m.visible = false; m.castShadow = false; m.receiveShadow = true; m.matrixAutoUpdate = false;
            const it = mats[gr.mat.name]; if (it) it.refs++;
            scene.add(m); F.ms.push(m); subirTex(m);
            for (const g of gr.tmp) g.dispose(); gr.tmp = null; F.temporales = [];
            F.g++;
            encolar(() => fundirHDPaso(Z), 'fundirHD:' + Z.id);
          });
        return;
      } catch (e) {
        for (const m of F.ms) { scene.remove(m); m.geometry.dispose(); soltarMaterial(m.userData.mat || m.material); }
        console.warn('AVE streaming: no se pudo fundir el _hd de ' + Z.id, e && e.message || e);
        limpiar();
        Z.hdF = null; Z.hdFundiendo = false;
        programarHDGlobal();
      }
    }
    const hdGlobal = { mallas: [], ids: '', pendiente: false, zonas: new Set(), paso: null, rehacer: false };
    function quitarHDGlobal() {
      hdGlobal.paso = null; // invalida una fusión global a medias (su continuación descarta lo fundido)
      for (const m of hdGlobal.mallas) { scene.remove(m); m.geometry.dispose(); soltarMaterial(m.userData.mat); }
      hdGlobal.mallas = []; hdGlobal.ids = ''; hdGlobal.zonas = new Set();
    }
    // KIMI-Task-017/QA-53: un grupo (material) por trabajo y cada grupo fundido por tandas de ~6 ms. Antes el
    // fundido global entero era un trabajo monolítico: 600–900 ms de CPU en un cuadro al revelar la carga y
    // al teleportar. Mientras se funde a medias, la zona sigue dibujando sus lotes (mismo aspecto).
    function fundirHDGlobal() {
      if (!hdZona()) { if (hdGlobal.mallas.length || hdGlobal.ids) quitarHDGlobal(); return; } // QA-158: en «bajo» la fusión global HD no existe
      if (hdGlobal.paso) { hdGlobal.rehacer = true; return; } // hay una a medias: al cerrar rehace con ids frescos
      if (Object.values(zonas).some(Z => Z.hdFundiendo)) return;
      // KIMI-135: la fusión global es de ciudades (línea ~1172: «en las ciudades, todos los _hd comparten la misma
      // vista aérea»). Con zonas NO-ciudad dentro, hdGlobal.zonas mezclaba una zona con hdSombra y activaba
      // castShadow en TODA la malla global: en la peor vista (kelvin_ruinas_yunque, alto) las 2 mallas × 6 runs
      // proyectaban sombra = 12 calls de sombra, duplicando la silueta ligera de la ciudad (su sombraMalla ya la
      // da, carril despachar). Las zonas sueltas conservan su fusión zonal (misma geometría/imagen, su sombra
      // propia vía Z.hdSombra) y aquí dejan de sumar tramos y sombra a la vista de la ciudad.
      const zs = Object.values(zonas).filter(Z => Z.hdMallas && Z.ciudad).sort((a, b) => a.id < b.id ? -1 : 1);
      const ids = zs.map(Z => Z.id + ':' + [...Z.hdModelos].sort().join(',')).join('|');
      if (ids === hdGlobal.ids) return;
      quitarHDGlobal();
      if (zs.length < 2) { hdGlobal.ids = ids; return; }
      const grupos = new Map();
      for (const Z of zs) for (const m of Z.hdMallas) {
        const mt = m.userData.mat; let gr = grupos.get(mt.name); if (!gr) grupos.set(mt.name, gr = { mat: mt, geos: [], zonas: [] });
        gr.geos.push(m.geometry); gr.zonas.push(m.userData.tramos);
      }
      const F = { lista: [...grupos.values()], i: 0 };
      hdGlobal.paso = F;
      encolar(() => fundirHDGlobalPaso(F, ids, zs), 'fundirHDGlobal');
    }
    function fundirHDGlobalPaso(F, ids, zs) {
      if (hdGlobal.paso !== F) return; // invalidada (se fundió/rehizo entretanto)
      const gr = F.lista[F.i];
      if (!gr) {
        hdGlobal.paso = null; hdGlobal.ids = ids; hdGlobal.zonas = new Set(zs.map(Z => Z.id));
        if (hdGlobal.rehacer) { hdGlobal.rehacer = false; programarHDGlobal(); }
        return;
      }
      const atlas = /^AV_HD_/.test(gr.mat.name) && gr.geos.every(g => g.attributes.avCelda);
      fusionLenta(gr.geos, atlas ? 'tex' : 'plana', precarga ? Math.max(6, precarga.ms) : 6,
        sig => encolar(sig, 'fundirHDGlobal:' + gr.mat.name),
        geo => {
          if (hdGlobal.paso !== F) { geo.dispose(); return; }
          const m = new THREE.Mesh(geo, gr.mat);
          conTramos(m, gr.mat, gr.geos, gr.zonas);
          m.name = 'edificiosZonaHDGlobal:' + gr.mat.name; m.userData.sinSolido = true;
          m.visible = false; m.castShadow = false; m.receiveShadow = true; m.matrixAutoUpdate = false;
          const it = mats[gr.mat.name]; if (it) it.refs++;
          scene.add(m); hdGlobal.mallas.push(m); subirTex(m);
          F.i++;
          encolar(() => fundirHDGlobalPaso(F, ids, zs), 'fundirHDGlobal');
        });
    }
    function programarHDGlobal() {
      if (hdGlobal.pendiente) return;
      hdGlobal.pendiente = true;
      encolar(() => { hdGlobal.pendiente = false; fundirHDGlobal(); }, 'fundirHDGlobal');
    }
    function quitarCercaZona(Z) {
      Z.cercaFundiendo = false;
      if (Z.cercaF) { for (const g of Z.cercaF.temporales) g.dispose(); Z.cercaF = null; }
      for (const m of Z.cercaMallas || []) { scene.remove(m); m.geometry.dispose(); soltarMaterial(m.userData.mat); }
      Z.cercaMallas = null; Z.cercaModelos = new Set();
      programarCercaGlobal();
    }
    // CG-73: la fusión cercana (KIMI-341) reserva unos 20 MB de geometría. El heap de arranque se
    // mide justo al soltar la pantalla de carga: hasta 4 s después se dibujan los lotes por instancia
    // (el mismo aspecto). Si Vittata se mueve o una prueba llama a terminar(), se funde en ese momento.
    let cercaPuede = false, cercaTimer = 0;
    const cercaEspera = [];
    function activarCerca() {
      if (cercaPuede) return;
      cercaPuede = true;
      if (cercaTimer) { clearTimeout(cercaTimer); cercaTimer = 0; }
      for (const Z of cercaEspera.splice(0)) encolar(() => fundirCercaZona(Z, true), 'fundirCerca:' + Z.id);
    }
    function programarCerca() {
      if (cercaPuede || cercaTimer) return;
      cercaTimer = setTimeout(activarCerca, 4000);
    }
    function fundirCercaZona(Z, forzar) {
      if ((!Z.ciudad && Z.nivel < 2) || Z.cercaF || (!forzar && (cargasPendientes(Z, 'cerca') || cargasPendientes(Z, 'hd')))) return;
      if (!cercaPuede && !forzar) { if (cercaEspera.indexOf(Z) < 0) cercaEspera.push(Z); if (!precarga) programarCerca(); return; }
      // KIMI-Task-011: los modelos con _hd también entran (cada instancia es un tramo: se dibuja el _hd o el ligero, no los dos)
      const modelos = new Set([...Z.modelos].filter(n => res(n, 'cerca').estado === 'listo' && !(G.bohiosAbiertos && G.bohiosAbiertos[n])));
      if (Z.cercaMallas && modelos.size === Z.cercaModelos.size && [...modelos].every(n => Z.cercaModelos.has(n))) return;
      quitarCercaZona(Z);
      if (!modelos.size) return;
      Z.cercaFundiendo = true;
      Z.cercaF = { i: 0, g: 0, modelos, grupos: new Map(), temporales: [], ms: [] }; // g: contador de grupos (igual que hdF; sin él gruposL[undefined] cerraba la fusión con 0 mallas, KIMI-341)
      encolar(() => fundirCercaPaso(Z), 'fundirCerca:' + Z.id);
    }
    // KIMI-Task-017: en tandas de ~6 ms por trabajo (el fundido entero eran hasta ~150 ms de CPU seguidos).
    function fundirCercaPaso(Z) {
      const F = Z.cercaF; if (!F) return;
      const t0 = performance.now();
      try {
        while (F.i < Z.inst.length && performance.now() - t0 < 6) {
          const I = Z.inst[F.i++];
          if (!F.modelos.has(I.modelo)) continue;
          for (const p of res(I.modelo, 'cerca').partes) apilarParte(F, p, I);
        }
        if (F.i < Z.inst.length) { encolar(() => fundirCercaPaso(Z), 'fundirCerca:' + Z.id); return; }
        // KIMI-031: el cierre por grupos era un solo trabajo sin presupuesto que fundía cada material de
        // golpe (fundirTex monolítico): al teleportar a la ciudad sumaba segundos de cuadro. Mismo reparto
        // que el HD (un grupo por paso, tandas de ~6 ms dentro del grupo).
        if (!F.gruposL) F.gruposL = [...F.grupos.values()];
        const gr = F.gruposL[F.g];
        if (!gr) {
          Z.cercaMallas = F.ms; Z.cercaModelos = F.modelos;
          for (const g of F.temporales) g.dispose();
          Z.cercaF = null; Z.cercaFundiendo = false;
          programarCercaGlobal();
          return;
        }
        // CG-73: sin clonar (materializarGrupo dejaba cada copia viva hasta el cierre de la zona).
        // Mismos tramos: un descriptor por parte, con el mismo número de índices que el clon.
        const cuentas = gr.partes.map(d => {
          const g = d.geo, pc = g.attributes.position.count, ic = g.index ? g.index.count : 0;
          return g.index ? { index: { count: ic }, attributes: { position: { count: pc } } } : { attributes: { position: { count: pc } } };
        });
        const atlas = /^AV_HD_/.test(gr.mat.name) && gr.partes.every(d => d.celda || d.geo.attributes.avCelda);
        fusionLentaPartes(gr.partes, atlas ? 'tex' : 'plana', 6,
          sig => encolar(sig, 'fundirCerca:' + Z.id),
          geo => {
            if (Z.cercaF !== F) { geo.dispose(); return; } // la zona se invalidó a medias: se descarta
            const m = new THREE.Mesh(geo, gr.mat);
            conTramos(m, gr.mat, cuentas, gr.ins);
            m.name = 'edificiosZonaCerca:' + Z.id + ':' + gr.mat.name; m.userData.sinSolido = true; m.userData.modelos = gr.modelos;
            m.visible = false; m.castShadow = false; m.receiveShadow = true; m.matrixAutoUpdate = false;
            const it = mats[gr.mat.name]; if (it) it.refs++;
            scene.add(m); F.ms.push(m); subirTex(m);
            gr.partes = null; gr.ins = null;
            F.g++;
            encolar(() => fundirCercaPaso(Z), 'fundirCerca:' + Z.id);
          });
        return;
      } catch (e) {
        for (const m of F.ms) { scene.remove(m); m.geometry.dispose(); soltarMaterial(m.userData.mat || m.material); }
        console.warn('AVE streaming: no se pudo fundir el cercano de ' + Z.id, e && e.message || e);
        for (const g of F.temporales) g.dispose();
        Z.cercaF = null; Z.cercaFundiendo = false;
        programarCercaGlobal();
      }
    }
    const cercaGlobal = { mallas: [], ids: '', pendiente: false, zonas: new Set(), paso: null, rehacer: false };
    function quitarCercaGlobal() {
      cercaGlobal.paso = null; // invalida una fusión global a medias (su continuación descarta lo fundido)
      for (const m of cercaGlobal.mallas) { scene.remove(m); m.geometry.dispose(); soltarMaterial(m.userData.mat); }
      cercaGlobal.mallas = []; cercaGlobal.ids = ''; cercaGlobal.zonas = new Set();
    }
    // KIMI-Task-017/QA-53: mismo reparto que el HD global (un material por trabajo, tandas de ~6 ms); antes
    // era un trabajo monolítico en el mismo cuadro que el del HD global.
    function fundirCercaGlobal() {
      if (cercaGlobal.paso) { cercaGlobal.rehacer = true; return; }
      if (Object.values(zonas).some(Z => Z.cercaFundiendo)) return;
      const zs = Object.values(zonas).filter(Z => Z.cercaMallas).sort((a, b) => a.id < b.id ? -1 : 1);
      const ids = zs.map(Z => Z.id + ':' + [...Z.cercaModelos].sort().join(',')).join('|');
      if (ids === cercaGlobal.ids) return;
      quitarCercaGlobal();
      if (zs.length < 2) { cercaGlobal.ids = ids; return; }
      const grupos = new Map();
      for (const Z of zs) for (const m of Z.cercaMallas) {
        const mt = m.userData.mat; let gr = grupos.get(mt.name); if (!gr) grupos.set(mt.name, gr = { mat: mt, geos: [], zonas: [] });
        gr.geos.push(m.geometry); gr.zonas.push(m.userData.tramos);
      }
      const F = { lista: [...grupos.values()], i: 0 };
      cercaGlobal.paso = F;
      encolar(() => fundirCercaGlobalPaso(F, ids, zs), 'fundirCercaGlobal');
    }
    function fundirCercaGlobalPaso(F, ids, zs) {
      if (cercaGlobal.paso !== F) return;
      const gr = F.lista[F.i];
      if (!gr) {
        cercaGlobal.paso = null; cercaGlobal.ids = ids; cercaGlobal.zonas = new Set(zs.map(Z => Z.id));
        if (cercaGlobal.rehacer) { cercaGlobal.rehacer = false; programarCercaGlobal(); }
        return;
      }
      const atlas = /^AV_HD_/.test(gr.mat.name) && gr.geos.every(g => g.attributes.avCelda);
      fusionLenta(gr.geos, atlas ? 'tex' : 'plana', precarga ? Math.max(6, precarga.ms) : 6,
        sig => encolar(sig, 'fundirCercaGlobal:' + gr.mat.name),
        geo => {
          if (cercaGlobal.paso !== F) { geo.dispose(); return; }
          const m = new THREE.Mesh(geo, gr.mat);
          conTramos(m, gr.mat, gr.geos, gr.zonas);
          m.name = 'edificiosZonaCercaGlobal:' + gr.mat.name; m.userData.sinSolido = true;
          m.visible = false; m.castShadow = false; m.receiveShadow = true; m.matrixAutoUpdate = false;
          const it = mats[gr.mat.name]; if (it) it.refs++;
          scene.add(m); cercaGlobal.mallas.push(m); subirTex(m);
          F.i++;
          encolar(() => fundirCercaGlobalPaso(F, ids, zs), 'fundirCercaGlobal');
        });
    }
    function programarCercaGlobal() {
      if (cercaGlobal.pendiente) return;
      cercaGlobal.pendiente = true;
      encolar(() => { cercaGlobal.pendiente = false; fundirCercaGlobal(); }, 'fundirCercaGlobal');
    }
    function quitarSombraZona(Z) {
      if (Z.sombraF) { for (const g of Z.sombraF.geos) g.dispose(); Z.sombraF = null; }
      if (!Z.sombraMalla) return;
      scene.remove(Z.sombraMalla); Z.sombraMalla.geometry.dispose(); Z.sombraMalla = null; Z.sombraModelos = new Set();
    }
    function fundirSombraZona(Z) {
      if (!Z.ciudad || Z.sombraF || cargasPendientes(Z, 'cerca')) return;
      const modelos = new Set([...Z.modelos].filter(n => res(n, 'cerca').estado === 'listo'));
      if (Z.sombraMalla && modelos.size === Z.sombraModelos.size && [...modelos].every(n => Z.sombraModelos.has(n))) return;
      quitarSombraZona(Z);
      if (!modelos.size) return;
      Z.sombraF = { i: 0, modelos, geos: [] };
      encolar(() => fundirSombraPaso(Z), 'fundirSombra:' + Z.id);
    }
    function fundirSombraPaso(Z) {
      const F = Z.sombraF; if (!F) return;
      const t0 = performance.now();
      try {
        while (F.i < Z.inst.length && performance.now() - t0 < 6) {
          const I = Z.inst[F.i++];
          if (!F.modelos.has(I.modelo)) continue;
          for (const p of res(I.modelo, 'cerca').partes) F.geos.push(p.geo.clone().applyMatrix4(I.m));
        }
        if (F.i < Z.inst.length) { encolar(() => fundirSombraPaso(Z), 'fundirSombra:' + Z.id); return; }
        // KIMI-031: la fusión de la sombra entera era monolítica; se trocea en tandas de ~6 ms.
        fusionLenta(F.geos, 'plana', 6,
          sig => encolar(sig, 'fundirSombra:' + Z.id),
          geo => {
            if (Z.sombraF !== F) { geo.dispose(); return; } // la zona se invalidó a medias: se descarta
            const m = new THREE.Mesh(geo, matSombra);
            for (const g of F.geos) g.dispose();
            F.geos = [];
            m.name = 'edificiosZonaSombra:' + Z.id; m.userData.sinSolido = true;
            m.visible = false; m.castShadow = true; m.receiveShadow = false; m.matrixAutoUpdate = false;
            m.layers.set(1);
            if (R.sun && R.sun.shadow && R.sun.shadow.camera) R.sun.shadow.camera.layers.enable(1);
            scene.add(m); Z.sombraMalla = m; Z.sombraModelos = F.modelos; subirTex(m);
            Z.sombraF = null;
          });
        return;
      } catch (e) {
        for (const g of F.geos) g.dispose();
        Z.sombraF = null;
        console.warn('AVE streaming: no se pudo fundir la sombra de ' + Z.id, e && e.message || e);
      }
    }
    // Versión _hd de los modelos de la zona: se pide en nivel cerca, en cualquier calidad, y se suelta al salir.
    // KIMI-038: la bajada se diferencia como la de nivel (CFG.bajarEspera): cruzar el borde del _hd en vuelo no
    // destruye y refunde la fusión HD en cada pasada; la subida es inmediata.
    function ajustarHD(Z, quiere) {
      const antes = !!Z.hd;
      if (quiere === antes) { if (Z.hdBajar) { Z.hdBajar = 0; bajasEvitadas++; } return; }
      if (quiere) {
        if (Z.hdBajar) { Z.hdBajar = 0; bajasEvitadas++; }
        Z.hd = true; transHD++;
        for (const n of Z.modelos) if (tieneHD(n)) pedir(res(n, 'hd'), Z.d + 1).catch(() => {});
        encolar(() => fundirHD(Z), 'fundirHD:' + Z.id);
        return;
      }
      const ahora = performance.now();
      if (!Z.hdBajar) { Z.hdBajar = ahora; return; }
      if (ahora - Z.hdBajar < CFG.bajarEspera * 1000) return;
      Z.hdBajar = 0;
      Z.hd = false; transHD++;
      quitarHDZona(Z);
      for (const n of Z.modelos) if (tieneHD(n)) soltar(res(n, 'hd'));
    }
    // Zona vista de lejos: todos sus lejanos fundidos en una malla (un draw call por zona; el frustum la descarta entera). Se
    // usa en nivel lejos y también en nivel cerca mientras toda la zona quede más allá de la distancia de LOD de la cámara.
    // La zona se funde en tandas de pocos milisegundos: cerrarla de una vez trababa el cuadro.
    function fundirZona(Z) {
      if (Z.nivel < 1 || Z.malla || Z.fundir) return;
      const rs = [...Z.modelos].map(n => res(n, 'lejos'));
      if (!rs.every(r => r.estado === 'listo' && r.geo)) return;
      Z.fundir = { i: 0, geos: [], tex: [], mat: null };
      encolar(() => fundirPaso(Z), 'fundirPaso:' + Z.id);
    }
    function fundirPaso(Z) {
      const F = Z.fundir;
      const libF = () => { for (const g of F.geos.concat(F.tex)) g.dispose(); Z.fundir = null; };
      if (!F || Z.malla || Z.nivel < 1) { if (F) libF(); return; }
      const t0 = performance.now();
      while (F.i < Z.inst.length && performance.now() - t0 < 6) {
        const I = Z.inst[F.i++], rl = res(I.modelo, 'lejos'), geo = rl.geo;
        if (!geo) { libF(); return; }
        (rl.mat ? F.tex : F.geos).push(geo.clone().applyMatrix4(I.m));
        if (rl.mat) F.mat = rl.mat;
      }
      if (F.i < Z.inst.length || performance.now() - t0 >= 6) { encolar(() => (Z.fundir && Z.fundir.i < Z.inst.length) ? fundirPaso(Z) : fundirCerrar(Z), 'fundirPaso:' + Z.id); return; }
      fundirCerrar(Z);
    }
    function fundirCerrar(Z) {
      const F = Z.fundir; if (!F) return;
      if (Z.nivel < 1 || Z.malla) { for (const g of F.geos.concat(F.tex)) g.dispose(); Z.fundir = null; return; }
      if (!F.geos.length && !F.tex.length) { Z.fundir = null; return; }
      // KIMI-031: los cierres fundían la zona entera de golpe (fundir/fundirTex monolíticos, segundos de
      // cuadro al teleportar a la ciudad); se funden en tandas de ~6 ms, color primero y atlas después.
      if (F.geos.length && !F.geoColor) {
        fusionLenta(F.geos, 'color', 6,
          sig => encolar(sig, 'fundirCerrar:' + Z.id),
          geo => { if (Z.fundir !== F) { geo.dispose(); return; } F.geoColor = geo; encolar(() => fundirCerrar(Z), 'fundirCerrar:' + Z.id); });
        return;
      }
      if (F.tex.length && !F.geoTex) {
        fusionLenta(F.tex, 'tex', 6,
          sig => encolar(sig, 'fundirCerrar:' + Z.id),
          geo => { if (Z.fundir !== F) { geo.dispose(); return; } F.geoTex = geo; encolar(() => fundirCerrar(Z), 'fundirCerrar:' + Z.id); });
        return;
      }
      // BM105: los lejanos con atlas (Ancient) van en su propia malla, con AV_HD_Ancient; el resto, el color de vértice de siempre
      const mk = (geo, mat, nom) => {
        const m = new THREE.Mesh(geo, mat);
        m.name = 'edificiosZona:' + Z.id + ':' + nom; m.userData.sinSolido = true; m.matrixAutoUpdate = false;
        m.receiveShadow = true; m.castShadow = false;
        scene.add(m); subirTex(m); return m;
      };
      const ms = [];
      if (F.geoColor) ms.push(mk(F.geoColor, matLejos, 'lejos'));
      if (F.geoTex) {
        const it = mats[F.mat.name]; if (it) it.refs++;
        const m = mk(F.geoTex, F.mat, 'lejosTex'); m.userData.matTex = true; ms.push(m);
      }
      for (const g of F.geos.concat(F.tex)) g.dispose();
      Z.fundir = null;
      Z.malla = ms[0]; Z.mallaExtra = ms.slice(1);
      programarLejosGlobal();
    }
    function quitarZona(Z) {
      if (Z.fundir) { for (const g of Z.fundir.geos.concat(Z.fundir.tex)) g.dispose(); Z.fundir = null; }
      if (!Z.malla) return;
      for (const m of [Z.malla].concat(Z.mallaExtra || [])) { scene.remove(m); m.geometry.dispose(); if (m.userData.matTex) soltarMaterial(m.material); }
      Z.malla = null; Z.mallaExtra = [];
      programarLejosGlobal();
    }
    const lejosGlobal = { mallas: [], ids: '', pendiente: false, zonas: new Set(), paso: null, rehacer: false };
    function quitarLejosGlobal() {
      lejosGlobal.paso = null; // invalida una fusión global a medias (su continuación descarta lo fundido)
      for (const m of lejosGlobal.mallas) { scene.remove(m); m.geometry.dispose(); if (m.userData.matTex) soltarMaterial(m.userData.mat); }
      lejosGlobal.mallas = []; lejosGlobal.ids = ''; lejosGlobal.zonas = new Set();
    }
    // KIMI-Task-017/QA-53: mismo reparto (un material por trabajo, tandas de ~6 ms); antes era un trabajo
    // monolítico en el mismo cuadro que los HD/cerca globales.
    function fundirLejosGlobal() {
      if (lejosGlobal.paso) { lejosGlobal.rehacer = true; return; }
      if (Object.values(zonas).some(Z => Z.fundir)) return;
      const zs = Object.values(zonas).filter(Z => Z.malla).sort((a, b) => a.id < b.id ? -1 : 1), ids = zs.map(Z => Z.id).join('|');
      if (ids === lejosGlobal.ids) return;
      quitarLejosGlobal();
      if (zs.length < 2) { lejosGlobal.ids = ids; return; }
      // Por el material de cada malla (userData.matTex), no por su orden: una zona solo con lejanos Ancient (las de la ciudad)
      // tiene la malla con atlas en Z.malla, y fundida con el color de vértice salía blanca.
      const color = { mat: matLejos, geos: [], zonas: [] }, tex = new Map();
      for (const Z of zs) for (const m of [Z.malla].concat(Z.mallaExtra || [])) {
        if (!m.userData.matTex) { color.geos.push(m.geometry); color.zonas.push(Z.id); continue; }
        let g = tex.get(m.material.name); if (!g) tex.set(m.material.name, g = { mat: m.material, geos: [], zonas: [] });
        g.geos.push(m.geometry); g.zonas.push(Z.id);
      }
      const F = { lista: [color, ...tex.values()].filter(g => g.geos.length), i: 0 };
      lejosGlobal.paso = F;
      encolar(() => fundirLejosGlobalPaso(F, ids, zs), 'fundirLejosGlobal');
    }
    function fundirLejosGlobalPaso(F, ids, zs) {
      if (lejosGlobal.paso !== F) return;
      const g = F.lista[F.i];
      if (!g) {
        lejosGlobal.paso = null; lejosGlobal.ids = ids; lejosGlobal.zonas = new Set(zs.map(Z => Z.id));
        if (lejosGlobal.rehacer) { lejosGlobal.rehacer = false; programarLejosGlobal(); }
        return;
      }
      const conTex = g.mat !== matLejos;
      fusionLenta(g.geos, conTex ? 'tex' : 'color', precarga ? Math.max(6, precarga.ms) : 6,
        sig => encolar(sig, 'fundirLejosGlobal:' + g.mat.name),
        geo => {
          if (lejosGlobal.paso !== F) { geo.dispose(); return; }
          const m = new THREE.Mesh(geo, g.mat);
          conTramos(m, g.mat, g.geos, g.zonas);
          m.name = 'edificiosZona:global:' + (conTex ? 'lejosTex' : 'lejos'); m.userData.sinSolido = true; m.userData.matTex = conTex; m.matrixAutoUpdate = false;
          m.receiveShadow = true; m.castShadow = false; m.visible = false;
          if (conTex) { const it = mats[g.mat.name]; if (it) it.refs++; }
          scene.add(m); lejosGlobal.mallas.push(m); subirTex(m);
          F.i++;
          encolar(() => fundirLejosGlobalPaso(F, ids, zs), 'fundirLejosGlobal');
        });
    }
    function programarLejosGlobal() {
      if (lejosGlobal.pendiente) return;
      lejosGlobal.pendiente = true;
      encolar(() => { lejosGlobal.pendiente = false; fundirLejosGlobal(); }, 'fundirLejosGlobal');
    }
    function zonasDe(n) { for (const id in zonas) { const Z = zonas[id]; if (Z.nivel >= 1 && !Z.malla && Z.modelos.has(n)) encolar(() => fundirZona(Z), 'fundirZona:' + Z.id); } }
    const avisados = new Set();
    function respaldo(Z, n, err) {
      if (!avisados.has(n)) { avisados.add(n); console.warn('AVE edificios:', err && err.message || err); }
      for (const I of Z.inst) if (I.modelo === n && cfg.respaldo) cfg.respaldo(I);
    }
    let inicio = null;
    // KIMI-Task-017: precarga hacia adelante. Al volar, las zonas nuevas entraban en alcance ya a la vista:
    // el lejano (y el kit de la gran ciudad) se bajaba, fundía y estrenaba dentro de unos pocos cuadros
    // (cuadros largos en móvil). Aquí se adelantan esas descargas cuando la zona va a entrar dentro de
    // ~precargaVuelo s (según la velocidad de Vittata). La referencia de cada precarga se suelta en cuanto
    // la zona toma el relevo (sube de nivel / entra la ciudad) o Vittata se deja de acercar a ella.
    let vueloUlt = null;
    function vueloAnticipo(x, z) {
      const ahora = performance.now();
      let v = 0;
      if (vueloUlt) { const dt = (ahora - vueloUlt.t) / 1000; if (dt > 0.05) v = Math.hypot(x - vueloUlt.x, z - vueloUlt.z) / dt; }
      vueloUlt = { x, z, t: ahora };
      if (v >= (CFG.precargaVueloMin || 0)) return Math.min(CFG.precargaVueloMax || 120, v * CFG.precargaVuelo);
      // KIMI-348: a pie (caminar ~6,5 m/s) también se precarga la zona hacia la que se camina; por debajo del
      // mínimo (quieto/posado, momentos de cómic) sigue en 0, como antes. El «pop de ruinas» medido en KIMI-340
      // al cruzar a pie era el cerca pidiéndose EN la frontera; con 4 s × velocidad ya está bajando ~26 m antes.
      if (v >= (CFG.precargaPieMin || 0)) return Math.min(CFG.precargaVueloMax || 120, v * CFG.precargaPie);
      return 0;
    }
    function prePedir(Z, n, tipo, prio) {
      const k = tipo + ':' + n;
      if (Z.pre && Z.pre[k]) return;
      const r = res(n, tipo);
      if (r.estado !== 'nada') return; // ya lo lleva la cola de verdad
      if (!Z.pre) Z.pre = {};
      Z.pre[k] = true;
      pedir(r, prio).catch(() => {});
    }
    function revisar(x, z) {
      if (x == null) { const S = G.S; x = S.pos ? S.pos.x : 0; z = S.pos ? S.pos.z : 0; }
      if (!inicio) inicio = [x, z];
      else if (quieto && Math.hypot(x - inicio[0], z - inicio[1]) > CFG.moverse) { quieto = false; siguiente(); activarCerca(); }
      const Rc = radioCerca(), Rl = alcanceZona(), H = CFG.histeresis;
      const anticipo = vueloAnticipo(x, z);
      const ahora = performance.now();
      // KIMI-246: boost de llegada — cerca del punto de aparición el nivel 2 (modelo completo) llega extra m más
      // allá del radio, para que los edificios de 60-120 m no se vean «como ruinas» al aparecer. Solo ensancha la
      // frontera de subida; la de bajada y el resto de niveles quedan como estaban.
      const RcLlegada = Rc + (inicio && Math.hypot(x - inicio[0], z - inicio[1]) <= CFG.llegada.dist
        ? (MOVIL_C || nivelCal() === 'bajo' ? CFG.llegada.extraMovil : CFG.llegada.extra) : 0);
      for (const id in zonas) {
        const Z = zonas[id];
        Z.d = Math.max(0, Math.hypot(x - Z.cx, z - Z.cz) - Z.r);
        const cerca = Z.forzada || (Z.nivel === 2 ? Z.d < RcLlegada + H : Z.d < RcLlegada);
        const lejos = Z.nivel >= 1 ? Z.d < Rl + H : Z.d < Rl;
        nivelZona(Z, cerca ? 2 : lejos ? 1 : 0);
        // La gran ciudad del tepuy: una referencia propia del kit, aparte del nivel. Así el _hd sigue cargado
        // cuando Vittata la mira desde el aire y se suelta al volver al spawn. No alarga el _hd del resto del mapa.
        if (esCiudad(Z.id)) {
          const limite = CFG.ciudadVista[nivelCiudad()];
          const enRango = Z.d < limite;
          if (hdActivo() && Z.nivel >= 1 && enRango) Z.ciudadHasta = ahora + CFG.ciudadGracia * 1000;
          // En rango: siempre encendida. Fuera de la banda de histéresis: se suelta ya. Dentro de la banda: se
          // mantiene solo lo que dure la gracia desde la última vez en rango (así la villa, a 228 m, no retiene
          // el kit para siempre), y para RE-encenderla hay que volver a rango (contrato del test: en frío no carga).
          const quiere = hdActivo() && Z.nivel >= 1 && (enRango || (Z.ciudad && Z.d < limite + H && Z.ciudadHasta > ahora));
          if (Z.ciudad !== quiere) {
            Z.ciudad = quiere;
            for (const n of Z.modelos) {
              if (quiere) pedir(res(n, 'cerca'), Z.d).catch(err => respaldo(Z, n, err));
              else soltar(res(n, 'cerca'));
            }
          }
          if (quiere) { encolar(() => fundirCercaZona(Z), 'fundirCerca:' + Z.id); encolar(() => fundirSombraZona(Z), 'fundirSombra:' + Z.id); }
          else { quitarCercaZona(Z); quitarSombraZona(Z); }
        }
        ajustarHD(Z, hdZona() && hdActivo() && ((Z.ciudad && Z.d < hdCiudadLimite() + (Z.hd ? H : 0)) || (Z.nivel === 2 && Z.d < Rc + (Z.hd ? H : 0)))); // QA-158: en «bajo» sin fusión HD de zona (cargarTodo forzada: sin _hd, como antes) · KIMI-251: el _hd de la ciudad solo se pide cuando puede verse (Z.d < hdCiudadLimite), no desde el spawn
        if (Z.hd) for (const n of Z.modelos) {
          const rh = recursos[n] && recursos[n].hd;
          if (rh && rh.estado === 'cola') rh.prio = distModelo(Z, n);
        }
        // KIMI-Task-017: precarga hacia adelante (lejos de las zonas a las que se acerca; kit de la gran ciudad)
        // KIMI-340: también el modelo detallado (cerca) de la zona a la que se vuela. El «efecto ruinas» medido
        // al llegar era el _lejos quedándose a la vista ~0,5-1,5 s mientras el cerca bajaba al cruzar la frontera;
        // con el cerca ya 'listo' al cruzar, el colocado es inmediato (aplicarNivel) y no hay ventana pobre.
        if (anticipo > 0) {
          if (Z.nivel === 0 && Z.d < Rl + anticipo) for (const n of Z.modelos) prePedir(Z, n, 'lejos', Z.d + 1);
          if (Z.nivel === 1 && Z.d < RcLlegada + anticipo) for (const n of Z.modelos) prePedir(Z, n, 'cerca', Z.d);
          if (esCiudad(Z.id) && !Z.ciudad && Z.d < CFG.ciudadVista[nivelCiudad()] + anticipo) for (const n of Z.modelos) prePedir(Z, n, 'cerca', Z.d);
        }
        if (Z.pre) {
          const dentroL = Z.nivel === 0 && Z.d < Rl + anticipo + 60;
          const dentroC = esCiudad(Z.id) ? !Z.ciudad && Z.d < CFG.ciudadVista[nivelCiudad()] + anticipo + 60
                                         : Z.nivel === 1 && Z.d < RcLlegada + anticipo + 60;
          for (const k in Z.pre) {
            const i = k.indexOf(':'), tipo = k.slice(0, i);
            if (!(tipo === 'lejos' ? dentroL : dentroC)) { soltar(res(k.slice(i + 1), tipo)); delete Z.pre[k]; }
          }
        }
      }
      liberarVencidos(performance.now());
    }
    // Promesa: las zonas en nivel cerca que pasan el filtro, cargadas y colocadas (y los lejanos con archivo propio)
    function listasCerca(filtro) {
      const ps = [];
      // Quien espera esta promesa tiene que poder bajarla: en quieto, un cerca a 30,5 m
      // (justo por encima de la precarga) se quedaba en cola y la prueba no salía del spawn.
      const exigir = r => { if (r && r.estado === 'cola') r.prio = -1; return r && r.promesa; };
      for (const id in zonas) {
        const Z = zonas[id]; if (!filtro(Z)) continue;
        for (const n of Z.modelos) {
          if (Z.nivel === 2) ps.push(exigir(res(n, 'cerca')));
        }
      }
      const lq = quieto ? CFG.lejosQuieto[nivelCal()] || 150 : Infinity;
      for (const id in zonas) if (zonas[id].nivel >= 1 && zonas[id].d < lq) for (const n of zonas[id].modelos) if (tieneLejos(n)) ps.push(exigir(res(n, 'lejos')));
      siguiente();
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
    let nCuadro = 0; const candHD = [];
    const vis = { cerca: 0, lejos: 0, hd: 0, mallas: 0, zonas: 0 };
    // KIMI-034: predicados y despachar viven a nivel de módulo (dentro de cuadro() eran closures nuevas por cuadro).
    // fusN = nº de cuadro actual: la frescura de I.fus se compara contra él.
    let fusN = 0;
    const quiereHD = I => I.fusN === fusN && I.fus === 1, quiereCerca = I => I.fusN === fusN && I.fus === 2;
    const lejosVeZona = id => !!(zonas[id] && zonas[id].lejosVe);
    // KIMI-331 (Modo Escuela): Math.hypot mide ~2-2,4× más lento que sqrt en V8 (su escalado anti-overflow)
    // y aquí las coordenadas son de metros: mismo resultado con diferencia ~1e-13 m, muy por debajo de los
    // umbrales (metros). Son ~3 hipot por instancia activa y cuadro en cuadro().
    const distXZ = (x1, z1, x2, z2) => { const x = x1 - x2, z = z1 - z2; return Math.sqrt(x * x + z * z); };
    const distXYZ = (x1, y1, z1, x2, y2, z2) => { const x = x1 - x2, y = y1 - y2, z = z1 - z2; return Math.sqrt(x * x + y * y + z * z); };
    const SIN_LISTA = []; // evita el array nuevo de `|| []` por zona y cuadro
    const candPool = [];  // objetos del bucket HD reutilizados (patrón KIMI-034, sin basura por cuadro)
    const esBohioAbiertoI = I => G.esBohioAbierto(I);
    function despachar(I, Z, L, sombra, nC) {
      // KIMI-Task-011: en las fusiones de zona cada instancia es un tramo; solo se dibujan los tramos de las que quieren esa
      // versión este cuadro (antes, la fusión entera en cuanto su caja estaba a la vista: el _hd de toda la ciudad a 450 m).
      if (L.tipo === 'cerca' && Z.usaCercaFusion && Z.cercaModelos.has(I.modelo)) {
        vis.cerca++; I.fusN = nC; I.fus = 2; Z.cercaVe = true;
        if (sombra) { if (Z.ciudad) Z.sombraPide = true; else Z.cercaSombra = true; }
        return;
      }
      if (L.tipo === 'hd' && Z.usaHDFusion && Z.hdModelos.has(I.modelo)) {
        vis.hd++; I.fusN = nC; I.fus = 1; Z.hdVe = true;
        if (sombra) { if (Z.ciudad) Z.sombraPide = true; else Z.hdSombra = true; }
        return;
      }
      // En la ciudad la sombra la da su malla ligera (capa 1): el _hd no entra en la pasada de sombras.
      // KIMI-225: marcarla como dibujada por lote (fus=3) para que las fusiones globales no la traguen como hueco.
      I.fusN = nC; I.fus = 3;
      L.lista.push(I); if (sombra) { if (Z.ciudad && Z.sombraMalla) Z.sombraPide = true; else L.sombra = true; }
    }
    function globalFus(G2, quiere, so) {
      // KIMI-331: el Set de zonas se sustituye (nunca se muta) al refundir: la copia array se cachea por identidad.
      const zs = G2.zonas.size ? (G2._zsa && G2._zsaN === G2.zonas ? G2._zsa : (G2._zsaN = G2.zonas, G2._zsa = [...G2.zonas])) : SIN_LISTA;
      for (const m of G2.mallas) {
        const n = tramos(m, quiere, 8, 100000); // KIMI-192/KIMI-225: gapo 8 tramos / 100 k vértices acotados; KIMI-225: el tramos() con gapo solo traga instancias que no se dibujan por otro camino este cuadro (el doble dibujo que motivó el revert 3ccbb99d)
        m.visible = n > 0;
        m.castShadow = m.visible && zs.some(id => zonas[id] && zonas[id][so]);
        vis.mallas += n;
      }
    }
    function cuadro() {
      const cam = R.camera; cam.updateMatrixWorld(); if (cam.matrixWorldInverse) cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      frustum.setFromProjectionMatrix(pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      const cp = cam.position, max = alcance(), maxZ = alcanceZona(), lodD = CFG.lod[nivelCal()] || 65, H = CFG.lodH, hdD = hdActivo() ? CFG.hd[nivelCal()] : 0;
      const S = G.S, px = S.pos ? S.pos.x : cp.x, py = S.pos ? S.pos.y : cp.y, pz = S.pos ? S.pos.z : cp.z;
      const conSombra = !!(R.calidad && R.calidad.sombras && R.sun && R.sun.castShadow), rS = ((R.calidad && R.calidad.sombraRadio) || 0) + CFG.margenSombra;
      for (const k in lotes) { const L = lotes[k]; L.lista.length = 0; L.sombra = false; }
      vis.zonas = vis.hd = vis.cerca = 0;
      const nC = ++nCuadro; fusN = nC;
      const enVista = (h, maxZ2) => { const bs = h.geometry.boundingSphere; return cp.distanceTo(bs.center) - bs.radius < maxZ2 && frustum.intersectsSphere(bs); };
      for (const id in zonas) {
        const Z = zonas[id], m = Z.malla;
        Z.usaHDFusion = !!((Z.ciudad || Z.nivel === 2) && Z.hdMallas && Z.hdMallas.length && Z.inst.every(I => I.colocado || !Z.hdModelos.has(I.modelo)));
        Z.usaCercaFusion = !!((Z.ciudad || Z.nivel === 2) && Z.cercaMallas && Z.cercaMallas.length);
        Z.hdVe = Z.cercaVe = Z.hdSombra = Z.cercaSombra = Z.sombraPide = false;
        if (Z.sombraMalla) Z.sombraMalla.visible = false;
        for (const h of Z.hdMallas || SIN_LISTA) { h.visible = false; h.castShadow = false; }
        for (const h of Z.cercaMallas || SIN_LISTA) { h.visible = false; h.castShadow = false; }
        Z.lejosVe = false;
        if (!m) { Z.usaMalla = false; continue; }
        const dz = distXZ(cp.x, cp.z, Z.cx, Z.cz) - Z.r;
        const dj = distXZ(px, pz, Z.cx, Z.cz) - Z.r;
        const umbral = lodD + (Z.usaMalla ? -H : H);
        // La silueta fundida solo si la cámara y Vittata están lejos del borde. Junto a las ruinas se dibujan las mallas.
        // En la ciudad del tepuy, nunca: la silueta beige tapa el kit justo en la vista aérea.
        Z.usaMalla = !Z.ciudad && (Z.nivel === 1 || (dz > umbral && dj > umbral));
        Z.lejosVe = Z.usaMalla && enVista(m, maxZ);
        m.visible = Z.lejosVe && !lejosGlobal.zonas.has(Z.id);
        if (Z.mallaExtra) for (const e of Z.mallaExtra) e.visible = m.visible;
        if (m.visible) vis.zonas++;
      }
      for (const m of lejosGlobal.mallas) {
        const n = tramos(m, lejosVeZona);
        m.visible = n > 0; vis.zonas += n;
      }
      const hdTope = CFG.hdTris[nivelCiudad()] || Infinity;
      for (let i = 0; i < activas.length; i++) {
        const I = activas[i], Z = zonas[I.zona];
        if (Z.usaMalla) continue; // la dibuja la malla fundida de su zona
        const dCam = distXYZ(I.cx, I.cy, I.cz, cp.x, cp.y, cp.z);
        const vista = Z.ciudad;
        const cM = CFG.ciudadMalla[nivelCiudad()], maxI = vista ? Math.max(max, cM) : max;
        if (dCam - I.r > maxI) continue;
        // Metros hasta la superficie de la esfera, el menor entre la cámara y Vittata. Encima de una torre el centro
        // queda muchos metros abajo: con la distancia al centro el lod lejano (beige, sin textura) seguía puesto.
        const dPla = distXYZ(I.cx, I.cy, I.cz, px, py, pz);
        const dl = Math.max(0, Math.min(dCam, dPla) - I.r);
        const grande = I.r > CFG.hdGrande;
        const lodLim = vista ? Math.max(lodD, cM) : lodD;
        const hdLim = vista ? Math.max(hdD, Math.min(cM, CFG.ciudadHD[nivelCiudad()] || 0)) : hdD;
        if (I.lod === 0 && dl > lodLim + H) I.lod = 1; else if (I.lod === 1 && dl < lodLim - H) I.lod = 0;
        // Junto a la pared, la malla completa en cualquier calidad. Los grandes siguen en HD más allá del LOD, hasta hdD.
        // La torre chica, de lejos, queda en la silueta. Mientras el _hd baja, se ve el ligero y no la silueta.
        // En la ciudad del tepuy, en «alto», el límite es el de la vista aérea; en media y baja, el _hd de la calidad.
        const junto = hdLim > 0 && dl < hdLim + (I.hd ? H : -H);
        I.hd = junto && (I.lod === 0 || grande) && I.colocado; // BM6-6: el _hd no sustituye al ligero hasta que el sólido esté colocado
        const base = (I.lod === 0 || junto) ? 'cerca' : 'lejos';
        let L = (I.hd && lotes[I.modelo + ':hd']) || lotes[I.modelo + ':' + base] || lotes[I.modelo + ':' + (base === 'cerca' ? 'lejos' : 'cerca')];
        if (!L) continue;
        // Los props chicos (losas, toldos, canoas: BH1) solo dan sombra junto a Vittata: más allá son unos pocos texels
        // del mapa de sombras y cada modelo con sombra es un draw call más en la pasada de sombras.
        const sombra = L.tipo !== 'lejos' && conSombra && distXZ(I.cx, I.cz, px, pz) < (I.r < CFG.sombraChica ? rS * 0.5 : rS) + I.r;
        esfera.center.set(I.cx, I.cy, I.cz); esfera.radius = I.r;
        if (!sombra && !frustum.intersectsSphere(esfera)) continue;
        if (L.tipo === 'hd' && hdTope < Infinity) { const c = candPool.pop() || { I: null, Z: null, sombra: false, k: 0 }; c.I = I; c.Z = Z; c.sombra = sombra; c.k = dl - (I.hdPres ? 10 : 0); candHD.push(c); continue; }
        despachar(I, Z, L, sombra, nC);
      }
      if (candHD.length) {
        candHD.sort((a, b) => a.k - b.k);
        const K = KIT() || {}; let suma = 0;
        for (const c of candHD) {
          const t = (K[c.I.modelo] && K[c.I.modelo].trisHD) || 0;
          c.I.hdPres = suma === 0 || suma + t <= hdTope; if (c.I.hdPres) suma += t; // el más cercano entra siempre
          const L = c.I.hdPres ? lotes[c.I.modelo + ':hd'] : (lotes[c.I.modelo + ':cerca'] || lotes[c.I.modelo + ':lejos']);
          if (!c.I.hdPres) c.I.hd = false;
          if (L) despachar(c.I, c.Z, L, c.sombra && L.tipo !== 'lejos', nC);
          candPool.push(c);
        }
        candHD.length = 0;
      }
      vis.lejos = vis.mallas = 0;
      for (const id in zonas) {
        const Z = zonas[id];
        if (Z.hdVe && !hdGlobal.zonas.has(Z.id)) for (const m of Z.hdMallas) {
          const n = tramos(m, quiereHD); m.visible = n > 0; m.castShadow = m.visible && Z.hdSombra; vis.mallas += n;
        }
        if (Z.cercaVe && !cercaGlobal.zonas.has(Z.id)) for (const m of Z.cercaMallas) {
          const n = tramos(m, quiereCerca); m.visible = n > 0; m.castShadow = m.visible && Z.cercaSombra; vis.mallas += n;
        }
        if (Z.sombraMalla) Z.sombraMalla.visible = Z.sombraPide;
      }
      globalFus(hdGlobal, quiereHD, 'hdSombra');
      globalFus(cercaGlobal, quiereCerca, 'cercaSombra');
      for (const k in lotes) {
        const L = lotes[k], li = L.lista, pr = L.prev;
        // BM6-1: panel de la puerta abierta compartida, como una malla más del lote; la instancia amueblada va la última y no lo lleva
        if (L.tipo === 'cerca' && !L.panelHecho && G.bohiosAbiertos && G.bohiosAbiertos[L.n] && G.solidos && G.solidos.panelAbierto) {
          const rc = recursos[L.n] && recursos[L.n].cerca, pa = rc && rc.partes && G.solidos.panelAbierto(L.n, rc.partes);
          if (pa !== undefined && rc && rc.partes) {
            L.panelHecho = true;
            if (pa) {
              const m = new THREE.InstancedMesh(pa.geo, pa.mat, L.attr.count);
              m.instanceMatrix = L.attr; m.count = 0; m.visible = false; m.frustumCulled = false; m.matrixAutoUpdate = false;
              m.castShadow = m.receiveShadow = true; m.name = 'edificiosInst:' + L.n + ':panel'; m.userData.sinSolido = true;
              scene.add(m); L.mallas.push(m); L.panel = m; subirTex(m);
            }
          }
        }
        if (L.panel && G.esBohioAbierto && li.some(esBohioAbiertoI)) { // BM13: varias abiertas (una por aldea), todas al final
          const cerr = li.filter(I => !G.esBohioAbierto(I)), abi = li.filter(esBohioAbiertoI);
          for (let j = 0; j < li.length; j++) li[j] = j < cerr.length ? cerr[j] : abi[j - cerr.length];
        }
        let igual = li.length === pr.length;
        for (let j = 0; igual && j < li.length; j++) if (li[j] !== pr[j]) igual = false;
        if (!igual) {
          const a = L.attr.array;
          for (let j = 0; j < li.length; j++) a.set(li[j].m.elements, j * 16);
          L.attr.needsUpdate = true;
          L.prev = li.slice();
        }
        let nPanel = L.panel ? li.length : 0;
        while (nPanel > 0 && G.esBohioAbierto && G.esBohioAbierto(li[nPanel - 1])) nPanel--;
        for (const m of L.mallas) { m.count = m === L.panel ? nPanel : li.length; m.visible = m.count > 0; m.castShadow = L.tipo !== 'lejos' && L.sombra; }
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
      // Pantalla de carga (src/ui/carga.js): baja ya lo que el streaming pediría al primer paso de Vittata en la zona de inicio
      // y sus vecinas: el modelo completo de las zonas cercanas y su _hd dentro de su rango según la calidad (CFG.cerca y CFG.hd
      // + histéresis; lo que ya está pedido y en cola). No cambia rangos ni CFG ni el modo quieto: el kit de la ciudad lejana
      // y el resto siguen llegando al moverse, como hoy (no sube el pico de memoria del arranque). Mientras dura solo cambia el
      // ritmo: o.descargas a la vez y o.ms por tanda (el mundo está tapado); terminar() vuelve al de siempre.
      // Devuelve { radio, total(), faltan(), progreso(), hecho(), terminar() }, o null sin arrancar.
      precargarZona(x, z, o) {
        o = o || {};
        if (!iniciado || arrancando) return null;
        if (x == null) { const S = G.S; x = S.pos ? S.pos.x : 0; z = S.pos ? S.pos.z : 0; }
        const radio = o.radio != null ? o.radio : Math.max(radioCerca(), hdActivo() ? CFG.hd[nivelCal()] || 0 : 0) + CFG.histeresis;
        precarga = { radio, descargas: Math.max(1, o.descargas || CFG.descargas), ms: Math.max(2, o.ms || CFG.msCuadro) };
        revisar(x, z); siguiente();
        const objetivo = new Set();
        const recoger = () => {
          for (const n in recursos) for (const t in recursos[n]) {
            const r = recursos[n][t];
            if (r.estado !== 'nada' && (r.refs || r.fijo) && r.prio != null && r.prio <= radio) objetivo.add(r);
          }
        };
        const pendiente = r => r.estado !== 'listo' && r.estado !== 'error' && r.estado !== 'nada';
        const sinColocar = () => { let n = 0; for (const I of inst) if (!I.colocado && zonas[I.zona].nivel === 2 && zonas[I.zona].d <= radio && res(I.modelo, 'cerca').estado === 'listo') n++; return n; };
        const faltan = () => { recoger(); let f = 0; for (const r of objetivo) if (pendiente(r)) f++; return f + sinColocar(); };
        const total = () => { recoger(); return objetivo.size + 1; };
        // Hecho: lo de la zona bajado y colocado, y sus fusiones en la cola de trabajo hechas (o 1,5 s más: los lejanos del
        // resto del mapa siguen llegando y encolando las suyas, y esas no se esperan)
        let fin = false, tCola = 0;
        const zona = {
          radio, total, faltan,
          progreso: () => { if (fin) return 1; const t = total(); return Math.max(0, Math.min(1, (t - faltan() - (trabajos.length ? 1 : 0)) / t)); },
          hecho: () => {
            if (fin) return true;
            if (faltan()) { tCola = 0; if (!programado) drenarColocar(); return false; }
            if (!trabajos.length) return true;
            if (!tCola) tCola = performance.now();
            return performance.now() - tCola > 1500;
          },
          terminar() { fin = true; if (precarga === estado) precarga = null; siguiente(); programar(); programarCerca(); },
        };
        const estado = precarga;
        return zona;
      },
      cargarTodo() { for (const id in zonas) zonas[id].forzada = true; return alrededor(); },
      soltarTodo() { for (const id in zonas) zonas[id].forzada = false; revisar(); },
      liberarYa() { aplicarBajasPendientes(); for (const n in recursos) for (const t in recursos[n]) { const r = recursos[n][t]; if (r.soltarEn) r.soltarEn = 1; } liberarVencidos(performance.now()); },
      // terminar(o): o.topeMs acota la espera (herramientas de captura: en vistas aéreas altas la cola es grande
      // y bajo contención puede superar el timeout del eval; KIMI-020). Sin tope, comportamiento de siempre.
      // Resuelve con null al agotarse la cola, o {tope:true, pendientes} al vencer el tope.
      // KIMI-020: la cola se bombea con presupuesto por tanda en vez de drenar() entera en un tick — el drenado
      // monolítico bloqueaba el hilo ~15 s en el asentado a +30 m sobre la ciudad (parse de los GLB _hd de los
      // templos) y los evals con timeout (ronda 013: 30 s) lo veían como un cuelgue «pre y post», con la página
      // helada. Así el hilo queda vivo, el topeMs puede disparar y las descargas van más en paralelo.
      terminar(o) {
        o = o || {};
        activarCerca(); // las pruebas asientan el mundo aquí: la fusión cercana tiene que estar hecha antes de medir
        const topeMs = Math.max(0, o.topeMs || 0), t0 = performance.now();
        aplicarBajasPendientes(); // KIMI-038: el asentado exige el estado aplicado (las bajadas diferidas no esperan al temporizador)
        // Lo que ya se está bajando, más los trabajos y la colocación. La cola que el modo quieto
        // todavía no deja bajar (el mapa entero, a 650 m) no cuenta: si no, la prueba no arranca.
        const espera = () => new Promise(ok => {
          const mirar = () => {
            if (topeMs && performance.now() - t0 >= topeMs) {
              let pendientes = 0;
              for (const r of cola) if (r.estado === 'cola' && (r.refs || r.fijo)) pendientes++;
              ok({ tope: true, pendientes, trabajos: trabajos.length, enVuelo });
              return;
            }
            const tp = performance.now();
            while (trabajos.length && performance.now() - tp < 90) {
              const j = trabajos.shift();
              try { j(); } catch (e) { console.warn('AVE streaming:', e && e.message || e); }
            }
            terminarMax = true; siguiente(); terminarMax = false;
            const esperaCola = cola.some(r => r.estado === 'cola' && (r.refs || r.fijo) && puedeAhora(r));
            if (!enVuelo && !esperaCola && !trabajos.length) ok(null); else setTimeout(mirar, 25);
          };
          mirar();
        });
        return espera().then(r => {
          drenarColocar(); drenar();
          for (const id in zonas) { const Z = zonas[id]; fundirHD(Z, true); fundirCercaZona(Z, true); }
          fundirHDGlobal(); fundirCercaGlobal(); fundirLejosGlobal();
          return r;
        });
      },
      stats() {
        let modCerca = 0, modLejos = 0, modHD = 0, bytes = 0;
        for (const n in recursos) {
          const rc = recursos[n].cerca, rl = recursos[n].lejos, rh = recursos[n].hd;
          if (rc && rc.estado === 'listo') { modCerca++; for (const p of rc.partes) bytes += tam(p.geo); }
          if (rh && rh.estado === 'listo') { modHD++; for (const p of rh.partes) bytes += tam(p.geo); }
          if (rl && rl.estado === 'listo') { modLejos++; bytes += tam(rl.geo); }
        }
        for (const id in zonas) {
          const Z = zonas[id];
          if (Z.malla) bytes += tam(Z.malla.geometry);
          for (const m of Z.hdMallas || []) bytes += tam(m.geometry);
          for (const m of Z.cercaMallas || []) bytes += tam(m.geometry);
          if (Z.sombraMalla) bytes += tam(Z.sombraMalla.geometry);
        }
        for (const m of lejosGlobal.mallas) bytes += tam(m.geometry);
        for (const m of hdGlobal.mallas) bytes += tam(m.geometry);
        for (const m of cercaGlobal.mallas) bytes += tam(m.geometry);
        const zs = Object.values(zonas);
        return { zonas: zs.length, zonasCerca: zs.filter(Z => Z.nivel === 2).length, zonasLejos: zs.filter(Z => Z.nivel === 1).length,
          instancias: inst.length, colocadas: inst.filter(I => I.colocado).length, modelosCerca: modCerca, modelosLejos: modLejos, modelosHD: modHD,
          materiales: Object.keys(mats).length, kbGeometria: Math.round(bytes / 1024), visiblesCerca: vis.cerca, visiblesLejos: vis.lejos, visiblesHD: vis.hd, hd: hdActivo(),
          drawEdificios: vis.mallas + vis.zonas, zonasFundidas: zs.filter(Z => Z.malla).length, descargando: enVuelo + cola.filter(r => r.estado === 'cola').length, trabajos: trabajos.length, recuperacion, omitidos: [...omitidos] };
      },
      // Diagnóstico para las herramientas de Kimi 3 (tools/build/kimi3_*.js): por qué terminar() sigue esperando.
      // Solo lectura; no toca la cola ni los trabajos.
      _diag() {
        return {
          enVuelo, quieto, arrancando, precarga: !!precarga,
          cola: cola.map(r => ({ n: r.n, tipo: r.tipo, estado: r.estado, prio: Math.round(r.prio), refs: r.refs, fijo: !!r.fijo })),
          trabajos: trabajos.map(j => j.avNombre || j.name || 'job'),
        };
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
    gestor.tieneHD = tieneHD;
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
      // PC rápido: la batería puede arrancar antes de que el mundo registre las instancias del kit
      // (con zonas vacías la elección de zona de abajo casca). Se espera a que haya zonas (tope 120 s).
      const tZonas = performance.now();
      while (!Object.keys(ST.zonas).length && performance.now() - tZonas < 120000) await new Promise(r => setTimeout(r, 250));
      if (G.mundo && G.mundo.listo) await G.mundo.listo;
      await ST.listo; await ST.terminar();
      if (R.setCalidad) R.setCalidad('alto', true);
      ST.soltarTodo(); await ir(x0, z0, 0, -1); ST.liberarYa(); await ST.terminar();
      // 1. Lo de cerca del inicio, cargado y con colisiones
      const Rc = radioCerca(), zs = Object.values(ST.zonas);
      const iniciales = zs.filter(Z => Math.max(0, Math.hypot(x0 - Z.cx, z0 - Z.cz) - Z.r) < Rc);
      check('Lo de cerca del inicio está cargado y con colisiones', iniciales.every(Z => Z.nivel === 2 && Z.inst.every(I => I.colocado)),
        iniciales.map(Z => Z.id + ':' + Z.inst.filter(I => I.colocado).length + '/' + Z.inst.length).join(' '));
      if (hdGL2() && R.setCalidad) {
        R.setCalidad('medio', true); ST.revisar(); dibujar(2);
        const zonasHD = zs.filter(zn => zn.usaHDFusion && zn.hdVe).length, globalHD = [];
        scene.traverse(o => { if (o.visible && o.name && o.name.indexOf('edificiosZonaHDGlobal:') === 0) globalHD.push(o.name); });
        check('La fusión global HD solo se dibuja con una zona HD visible', globalHD.length === 0 || zonasHD > 0,
          zonasHD + ' zonas HD visibles · mallas globales: ' + (globalHD.join(', ') || 'ninguna'));
        R.setCalidad('alto', true); ST.revisar(); dibujar(2);
      }
      // 2. Entrar en una zona que no esté cerca del punto de partida: fuera de vista si la hay, si no la más lejana
      ST.revisar(x0, z0);
      const Z = zs.filter(Zn => !iniciales.includes(Zn) && Zn.nivel < 2).sort((a, b) => a.nivel - b.nivel || b.d - a.d)[0] || zs.slice().sort((a, b) => b.d - a.d)[0];
      if (!Z) { check('Hay zonas de edificios que probar', false, 'zonas: ' + zs.length); return result(); }
      const modelosZ = [...Z.modelos], otros = n => zs.some(o => o !== Z && o.modelos.has(n));
      const propios = modelosZ.filter(n => !otros(n));
      // Vista más cargada: borde sur de la zona con más instancias, mirando a su centro
      const ZM = zs.slice().sort((a, b) => b.inst.length - a.inst.length)[0];
      const bzM = ZM.cz + Math.min(ZM.r, 40) + 6;
      await ir(ZM.cx, bzM, 0, -1);
      // draw calls de un cuadro entero (sombra, escena y post), contados aquí: R.stats() solo se actualiza en el bucle
      const contar = () => { const rr = R.renderer, orig = rr.render; let n = 0; rr.render = function (a, b) { orig.call(rr, a, b); n += rr.info.render.calls; }; try { G.camara.place(true); R.render(1 / 60, false); } finally { rr.render = orig; } return n; };
      // la peor de cuatro orientaciones de la cámara. Cada toma se acepta solo con el mundo asentado en el punto
      // medido: con otra batería QA concurrente en la página (runner de la nube con ?qa=1) sus teleports dejan
      // la escena a mitad y la toma mide otra vista (rojo intermitente en la nube «174 calls, giro 3.1» con un
      // desglose imposible en HEAD verde: 28/44/7 frente a 69/34/6; mismo mecanismo que QA-160). Si tras los
      // reintentos no asienta, se mide igualmente pero el extra lo dice.
      let st = null, hdMax = 0, aviso = '';
      // QA-nuevo-br1-3: mallas visibles (con visibilidad heredada) por hijo directo de la escena, las 8 que más tienen
      const porGrupo = () => { const n = {}; for (const h of scene.children) { if (!h.visible) continue; let k = 0; h.traverseVisible(o => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) k++; }); if (k) n[h.name || h.type] = (n[h.name || h.type] || 0) + k; }
        return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0] + ' ' + e[1]).join(', '); };
      for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        for (let intento = 0; intento < 4; intento++) {
          if (Math.hypot(S.pos.x - ZM.cx, S.pos.z - bzM) > 3) await ir(ZM.cx, bzM, 0, -1);
          await ST.terminar();
          const se0 = ST.stats();
          if (!se0.trabajos && !se0.descargando && Math.hypot(S.pos.x - ZM.cx, S.pos.z - bzM) <= 3) break;
        }
        const se0 = ST.stats();
        if (se0.trabajos || se0.descargando || Math.hypot(S.pos.x - ZM.cx, S.pos.z - bzM) > 3) aviso = ' · toma sin asentar (QA concurrente)';
        G.camara.yaw = yaw; dibujar(2);
        const c = contar(), se = ST.stats();
        if (!st || c > st.calls) {
          // QA-nuevo-br1-3: diagnóstico de la toma (sola 132 calls con 22 cerca/32 _hd; tras ep4e2e…juiceTest 181 con 50/82)
          const cp = R.camera.position, Cq = R.calidad || {};
          st = { calls: c, yaw, edif: se.drawEdificios, cerca: se.visiblesCerca, lejos: se.visiblesLejos, hd: se.visiblesHD, zonas: se.zonasFundidas,
            diag: 'cám ' + [cp.x - S.pos.x, cp.y - S.pos.y, cp.z - S.pos.z].map(r2).join(',') + ' fov ' + r2(R.camera.fov) + ' asp ' + r2(R.camera.aspect) + ' · alcance ' + r2(alcance()) + ' niebla ' + r2(alcanceNiebla())
              + ' · sombras ' + (Cq.sombras || 0) + '/' + (Cq.sombraRadio || 0) + ' esc ' + !!Cq.escuela + ' · inst ' + se.instancias + ' colocadas ' + se.colocadas + ' zonasCerca ' + se.zonasCerca + ' · ZM ' + ZM.inst.length
              + ' · mallas visibles por grupo: ' + porGrupo() };
        }
        hdMax = Math.max(hdMax, se.visiblesHD);
      }
      G.camara.yaw = yaw0;
      // Versión cercana de alta fidelidad (_hd): cargada y dibujada en calidad alta con WebGL2. Media y baja también la piden.
      const conHD = [...ZM.modelos].filter(n => ST.tieneHD(n));
      if (hdGL2() && R.setCalidad) {
        R.setCalidad('medio', true); ST.revisar();
        check('En calidad media se pide el edificio completo', (CFG.hd.medio || 0) > 0 && !!(ST.stats() && ST.stats().hd), 'medio ' + (CFG.hd.medio || 0) + ' m');
        R.setCalidad('bajo', true); ST.revisar();
        check('En calidad baja, junto al edificio, también', (CFG.hd.bajo || 0) > 0 && !!(ST.stats() && ST.stats().hd), 'bajo ' + (CFG.hd.bajo || 0) + ' m');
        check('F2.1: el detalle llega a 90 m en media y a 120 m en alta; en baja el kit sigue a 45 m', CFG.hd.medio === 90 && CFG.hd.alto === 120 && CFG.hd.bajo === 45,
          'bajo ' + CFG.hd.bajo + ' · medio ' + CFG.hd.medio + ' · alto ' + CFG.hd.alto);
        R.setCalidad('alto', true); ST.revisar();
      }
      if (conHD.length && (CFG.hd.alto || 0) > 0 && hdGL2()) {
        const listosHD = conHD.filter(n => ST.recursos[n].hd && ST.recursos[n].hd.estado === 'listo');
        check('Cerca, los edificios con versión de alta fidelidad la cargan y la dibujan', listosHD.length === conHD.length && hdMax > 0,
          ZM.id + ': ' + listosHD.length + '/' + conHD.length + ' modelos _hd, hasta ' + hdMax + ' instancias _hd a la vista');
      if (listosHD.length) { // BM6-5: las colisiones salen del ligero; el _hd debe medir lo mismo (cajas a 0,3 m)
        const caja = r => { const b = new THREE.Box3(); for (const p of r.partes) b.union(p.geo.boundingBox); return b; };
        const dif = n => { const rc = ST.recursos[n]; if (!(rc.cerca.partes && rc.hd.partes)) return 0; const a = caja(rc.cerca), b = caja(rc.hd); return Math.max(...[a.min.x - b.min.x, a.min.y - b.min.y, a.min.z - b.min.z, a.max.x - b.max.x, a.max.y - b.max.y, a.max.z - b.max.z].map(Math.abs)); };
        const PENDIENTE_HD = ['templo_grande', 'templo_grande_f', 'ruina_mirador']; // BM6-5: desfase medido, a reexportar en Blender (BUGS.md)
        const malos = listosHD.filter(n => dif(n) > 0.3 && !PENDIENTE_HD.includes(n));
        check('El _hd mide lo mismo que el ligero (de donde salen las colisiones)', malos.length === 0, malos.map(n => n + ' ' + dif(n).toFixed(2)).join(', ') || listosHD.length + ' modelos; pendientes: ' + listosHD.filter(n => PENDIENTE_HD.includes(n)).map(n => n + ' ' + dif(n).toFixed(2)).join(', '));
      }
      }
      check('Draw calls de la vista más cargada ≤ 150', st.calls > 0 && st.calls <= 150, ZM.id + ' (giro ' + r2(st.yaw) + '): ' + st.calls + ' draw calls, edificios ' + st.edif +
        ' (' + st.cerca + ' instancias cerca, ' + st.hd + ' _hd, ' + st.lejos + ' lejos sueltas, ' + st.zonas + ' zonas fundidas) · ' + nivelCal() + aviso + ' · ' + st.diag);
      { // QA-nuevo-br1-3: los personajes V18 (Arausiaca, la rival del duelo, los NPC de v18npc) a más de 60 m no se dibujan; tras
        // pasar por sus sitios (juiceTest carga los módulos a demanda) sumaban ~47 draw calls en esta vista
        const esV18 = h => /^(v18_arausiaca|v18_rival|v18npc:)/.test(h.name || ''), v18 = scene.children.filter(esV18);
        const dV18 = h => Math.hypot(h.position.x - S.pos.x, h.position.z - S.pos.z), lejosV = v18.filter(h => h.visible && dV18(h) > 60.5);
        check('QA-nuevo-br1-3 · En la vista más cargada no se dibujan los personajes V18 lejanos (> 60 m)', lejosV.length === 0,
          v18.length + ' en la escena: ' + (v18.map(h => h.name + ' ' + Math.round(dV18(h)) + ' m ' + (h.visible ? 'visible' : 'oculto')).join(', ') || 'ninguno cargado'));
      }
      const lejosM = [];
      scene.traverse(o => { if (o.name && o.name.indexOf(':lejos') >= 0) lejosM.push(o); });
      check('El lejano recibe la sombra del sol y no la proyecta', lejosM.length > 0 && lejosM.every(o => o.receiveShadow && !o.castShadow),
        lejosM.length + ' mallas');
      const g0 = M.geometries, t0 = M.textures;
      // Entrar en Z por el borde sur, mirando al centro
      const bx = Z.cx, bz = Z.cz + Math.min(Z.r, 40) + 6;
      // QA-160: con la batería QA concurrente en la página (qa.js autoarranca con ?qa=1), un teleport
      // ajeno justo tras ir() deja la zona a mitad de colocar; se re-ir() con reintento acotado (una
      // zona realmente rota falla las 5) antes de darla por mala.
      const zonaColocada = () => Z.nivel === 2 && modelosZ.every(n => ST.recursos[n] && ST.recursos[n].cerca && ST.recursos[n].cerca.estado === 'listo') && Z.inst.every(I => I.colocado);
      let intentos = 0;
      while (intentos < 5 && !zonaColocada()) { await ir(bx, bz, 0, -1); intentos++; }
      const cargados = modelosZ.every(n => ST.recursos[n] && ST.recursos[n].cerca && ST.recursos[n].cerca.estado === 'listo');
      check('Al entrar, la zona carga sus modelos y coloca sus instancias', Z.nivel === 2 && cargados && Z.inst.every(I => I.colocado),
        Z.id + ': ' + Z.inst.length + ' instancias, ' + modelosZ.length + ' modelos' + (intentos ? ' · reintento ×' + intentos : ''));
      const sinSolido = Z.inst.filter(I => {
        if (!I.erguido || (I.r < 1.2)) return false;
        const hay = G.fisica.colliders.some(c => c.id === I.id) || (G.solidos && G.solidos.altoEn && G.solidos.altoEn(I.pos[0], I.pos[2], 1e4) > G.terreno.height(I.pos[0], I.pos[2]) + 0.3);
        return !hay && G.mundo.activos[I.id] && G.mundo.activos[I.id].alto > 1.5;
      });
      check('Las colisiones de sus edificios están activas al cargar', sinSolido.length === 0, sinSolido.map(I => I.id).slice(0, 5).join(', '));
      const idsZ = new Set(Z.inst.map(I => I.id)), colZ = () => G.fisica.colliders.filter(c => idsZ.has(c.id)).length;
      const I0 = Z.inst.find(I => I.erguido && G.mundo.activos[I.id] && G.mundo.activos[I.id].alto > 2), alto0 = () => I0 && G.solidos && G.solidos.altoEn ? G.solidos.altoEn(I0.pos[0], I0.pos[2], 1e4) : 0;
      const c1 = colZ(), s1 = alto0();
      const visibles = Object.values(ST.lotes).some(L => L.mallas.some(m => m.visible && m.count > 0)) || scene.children.some(o => o.visible && /^edificiosZona(Cerca|HD)/.test(o.name));
      check('Se dibujan instancias de la zona', visibles, '');
      // 3. Salir: volver al inicio y liberar
      await ir(x0, z0, f0 && f0.x, f0 && f0.z);
      ST.liberarYa(); dibujar();
      const libres = (tipo, ns) => ns.every(n => { const r = ST.recursos[n][tipo]; return !r || r.estado === 'nada' || r.fijo; }) && !scene.children.some(o => ns.some(n => (o.name || '').startsWith('edificiosInst:' + n + ':' + tipo)));
      const propiosCerca = propios.filter(n => !ST.recursos[n].cerca.fijo);
      check('Al salir de su radio, la zona suelta el modelo completo (geometría, texturas, mallas)', Z.nivel < 2 && libres('cerca', propiosCerca) && libres('hd', propios),
        'nivel ' + Z.nivel + ' · geometrías ' + g0 + '→' + M.geometries + ' · texturas ' + t0 + '→' + M.textures + ' · ' + propiosCerca.join(','));
      // Lejos de todo (distancia de dibujo 1 m, simulado): también se suelta el LOD lejano
      const dib = CFG.dibujo, dibZ = CFG.zonaLejos; CFG.dibujo = CFG.zonaLejos = { bajo: 1, medio: 1, alto: 1 };
      ST.revisar(); ST.liberarYa(); dibujar();
      check('Fuera de la vista, la zona se libera del todo (nivel 0, sin LOD lejano)', Z.nivel === 0 && libres('lejos', propios), 'nivel ' + Z.nivel + ' · geometrías ' + M.geometries);
      CFG.dibujo = dib; CFG.zonaLejos = dibZ; ST.revisar(); await ST.terminar();
      check('La cadena base64 no queda en memoria', modelosZ.every(n => !(window[B64] || {})[n]), '');
      check('Las colisiones siguen activas tras liberar', colZ() === c1 && alto0() === s1, 'colliders ' + c1 + '→' + colZ() + ' · sólido ' + r2(s1) + '→' + r2(alto0()) + ' m');
      // 4. Fugas: dos vueltas más; geometrías, texturas, bytes y heap estables
      // (geometrías y texturas de three cuentan también la flora, que va por regiones: se informan, no se exigen)
      // La referencia se toma tras una primera vuelta: así las dos medidas tienen la misma historia de histéresis.
      await ir(bx, bz, 0, -1); await ir(x0, z0); ST.liberarYa(); dibujar();
      // heap: con window.gc (Chrome con --js-flags=--expose-gc) se recoge antes y se exige ≤ 8 MB; sin gc el heap incluye basura
      // aún no recogida y solo se informa (la memoria propia de los edificios sí se exige estable)
      const gc = typeof window.gc === 'function', tolHeap = gc ? 8 : 32;
      const foto = () => { if (gc) window.gc(); const s2 = ST.stats(); return { g: M.geometries, t: M.textures, kb: s2.kbGeometria, mats: s2.materiales, mod: s2.modelosCerca + s2.modelosLejos + s2.modelosHD, heap: heap() }; };
      // QA-160: con otra batería QA corriendo concurrente en la página (qa.js autoarranca con ?qa=1 y
      // teletransporta por el mapa), sus teleports pueden dejar justo antes de una foto zonas a nivel 2
      // con referencias legítimas; el post-mortem del probe lo confirma (0 retenidos sin dueño estructural,
      // docs/img/kimi160/qa160-r24-qa.json). Es estado vivo ajeno, no una fuga de este test: se asienta el
      // mundo en el spawn (soltar lo que quedó lejos y dejar correr cuadros para que drenen trabajos y
      // descargas en marcha) antes de cada foto. Una fuga real seguiría con refs>0 sin dueño y saltaría igual.
      // El asentado exige estabilidad real (cola de trabajos y descargas vacías 2 pasadas seguidas): 3 pasadas
      // fijas no bastan cuando la batería concurrente funde la ciudad en la ventana (r26-fix: m2 con 149 trabajos).
      // El tope (~12 s) es mayor que la gracia de la ciudad (8 s): lo que la batería visitó hace >8 s cae en el
      // spawn (d=228, fuera de rango) y liberarYa lo suelta antes de la foto.
      const asentar = async () => {
        let estables = 0, s = ST.stats(), pasadas = 0;
        while (pasadas < 4 || (pasadas < 40 && estables < 2)) {
          ST.revisar(x0, z0); ST.liberarYa(); dibujar();
          await new Promise(r => setTimeout(r, 300));
          s = ST.stats();
          estables = (s.descargando === 0 && s.trabajos === 0) ? estables + 1 : 0;
          pasadas++;
        }
        return 'descargando ' + s.descargando + '/trabajos ' + s.trabajos + ' · ' + pasadas + ' pasadas';
      };
      const as1 = await asentar();
      const m1 = foto();
      for (let v = 0; v < 2; v++) { await ir(bx, bz, 0, -1); await ir(x0, z0); ST.liberarYa(); dibujar(); }
      const as2 = await asentar();
      const m2 = foto();
      check('Sin fugas tras ir y volver dos veces (memoria de edificios estable; heap con gc ≤ +8 MB)', m2.kb <= m1.kb * 1.02 + 16 && m2.mats <= m1.mats && m2.mod <= m1.mod && !(gc && m2.heap - m1.heap > tolHeap),
        'KB ' + m1.kb + '→' + m2.kb + ' · materiales ' + m1.mats + '→' + m2.mats + ' · modelos ' + m1.mod + '→' + m2.mod + ' · heap ' + r2(m1.heap) + '→' + r2(m2.heap) + ' MB' + (gc ? ' (gc)' : ' (sin gc: no se exige)') + ' · three geo ' + m1.g + '→' + m2.g + ', tex ' + m1.t + '→' + m2.t + ' · asentado ' + as1 + ' | ' + as2);
      // La ciudad del tepuy, desde el aire (150 m al borde, más lejos que el _hd general): el kit, no la silueta beige.
      const ZC = ST.zonas.kelvin_ruinas_yunque;
      if (ZC && hdGL2()) {
        await ir(ZC.cx, ZC.cz + ZC.r + 150, 0, -1);
        const seC = ST.stats();
        const beige = ZC.malla && ZC.malla.visible;
        check('La ciudad del tepuy, desde el aire, usa el kit con textura y no la silueta beige', ZC.ciudad && ZC.nivel >= 1 && seC.visiblesHD > 0 && !beige,
          'hd ' + seC.visiblesHD + ' · cerca ' + seC.visiblesCerca + ' · lejos ' + seC.visiblesLejos + ' · ciudad ' + !!ZC.ciudad + ' · silueta ' + !!beige);
        const torresF = (ST.instancias || []).filter(I => I.zona === 'kelvin_ruinas_yunque' && I.modelo === 'ruina_torre_f');
        check('Las torres F de la ciudad están erguidas (el export las tumbaba y se leían como ganchos)', torresF.length === 3 && torresF.every(I => I.erguido), torresF.map(I => I.id + (I.erguido ? '' : ' tumbada')).join(', '));
        const Z2 = ST.zonas.kelvin_ruinas_yunque_2;
        check('El conjunto de torres de la izquierda usa el kit en la vista aérea', !!(Z2 && Z2.ciudad && Z2.nivel >= 1), Z2 ? 'ciudad ' + !!Z2.ciudad + ' · nivel ' + Z2.nivel + ' · d ' + Math.round(Z2.d) : 'sin zona');
        let matCrema = null;
        scene.traverse(o => { const m = o.material; if (m && m.name === 'AV_HD_Ancient') matCrema = m; });
        const claveCrema = matCrema && matCrema.customProgramCacheKey ? String(matCrema.customProgramCacheKey()) : '';
        check('La piedra Ancient del kit es crema mate (sin brillo especular)', !!(matCrema && matCrema.shininess === 1 && matCrema.specular && matCrema.specular.r === 0 && matCrema.userData && matCrema.userData.avAtlasEsc), claveCrema || 'sin material');
        const atlasFusion = [];
        scene.traverse(o => { const m = o.userData.mat || o.material; if (/^edificiosZonaHD:/.test(o.name) && m && /^AV_HD_/.test(m.name)) atlasFusion.push(m); });
        check('El atlas de las fusiones conserva la codificación sRGB del original', atlasFusion.length > 0 && atlasFusion.every(m => !m.map || m.map.encoding === THREE.sRGBEncoding),
          atlasFusion.map(m => m.name + '=' + (m.map ? m.map.encoding : 'sin mapa')).join(', '));
        await ir(x0, z0); ST.liberarYa(); dibujar();
        // 1-nov (3be9edeb, Kelvin: «de lejos se ve blanco»): en «alto» el kit de la ciudad se queda cargado desde casi
        // toda la isla (ciudadVista 650 m; el spawn, a ~228 m del borde, está dentro a propósito) y en «bajo» el spawn
        // cae en la banda de histéresis (220+30 m). La otra mitad del contrato es la que se exige aquí: fuera del
        // rango el kit se suelta (memoria en móvil). En alto no existe punto de la isla a >680 m: se prueba en bajo.
        if (R.setCalidad) { R.setCalidad('bajo', true); ST.revisar(); }
        await ir(-220, 220, 0, -1); // esquina sureste de la isla: d ≈ 300 m > 220 + 30
        check('Fuera de su rango, la ciudad del tepuy suelta el kit de la vista aérea', !ZC.ciudad && ZC.nivel < 2, 'ciudad ' + !!ZC.ciudad + ' · nivel ' + ZC.nivel + ' · d ' + Math.round(ZC.d) + ' · ' + nivelCal());
        await ir(x0, z0); ST.liberarYa(); dibujar();
        check('En bajo, el spawn no carga la ciudad del tepuy (memoria de móvil)', !ZC.ciudad, 'ciudad ' + !!ZC.ciudad + ' · d ' + Math.round(ZC.d) + ' · ' + nivelCal());
        { // QA-nuevo-edif-android (9-nov, Kelvin en Android, «bajo»: edificios de las Atalayas como cajas beige lisas): en «bajo»
          // (texturas KTX2) los edificios cercanos, al llegar volando, son el modelo completo con el atlas, no el 2×2 del color
          // del kit; y al volver a entrar (material del kit soltado en el spawn y creado otra vez) la textura está al momento.
          const planos = () => { let n = 0, t = 0; scene.traverseVisible(o => { if (!o.isMesh || !o.material) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && /^AV_HD_/.test(m.name)) { t++; if (m.map && m.map.image && m.map.image.width === 2) n++; } }); return { n, t }; }; // fusiones: material = [mat]
          const ktx = !!(G.assets && G.assets.ktx2De && G.assets.ktx2De(kitBase + 'tex_hd/hd_ancient' + (MOVIL_PEQ ? '_lq1024' : '_lq') + '.jpg'));
          const llegar = async () => { await ir(ZC.cx, ZC.cz + Math.min(ZC.r, 40), 0, -1); S.pos.y += 35; dibujar(2); };
          await llegar();
          let p1 = planos(); const tE = performance.now();
          while (p1.n && performance.now() - tE < 15000) { await new Promise(r => setTimeout(r, 250)); dibujar(1); p1 = planos(); }
          const se1 = ST.stats(), sil = !!(ZC.malla && ZC.malla.visible);
          check('QA-nuevo-edif-android · En bajo, al llegar volando, los edificios cercanos son el modelo completo y con textura (no cajas beige)',
            ZC.nivel === 2 && se1.visiblesCerca > 0 && !sil && p1.t > 0 && p1.n === 0,
            'nivel ' + ZC.nivel + ' · cerca ' + se1.visiblesCerca + ' · lejos ' + se1.visiblesLejos + ' · silueta ' + sil + ' · mallas atlas ' + p1.t + ', sin textura ' + p1.n + ' · ktx2 ' + ktx + ' ' + JSON.stringify(G.assets.estadoKTX2 ? G.assets.estadoKTX2() : null) + ' · ' + Math.round(performance.now() - tE) + ' ms');
          await ir(x0, z0); ST.liberarYa(); dibujar();
          await llegar();
          const p2 = planos();
          check('QA-nuevo-edif-android · Al volver a entrar, el atlas KTX2 ya transcodificado se pone al momento (sin cuadros beige)', p2.t > 0 && p2.n === 0,
            'mallas atlas ' + p2.t + ', sin textura ' + p2.n + ' · ktx2 ' + ktx);
          await ir(x0, z0); ST.liberarYa(); dibujar();
        }
        if (R.setCalidad) { R.setCalidad('alto', true); ST.revisar(); }
      }
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

  return { iniciar, material, soltarMaterial, generarLejos, CFG, test,
    rafagasListas: () => rafagaPaso >= 1 && rafagas.length > 0,
    transiciones: () => ({ nivel: transNivel, hd: transHD, evitadas: bajasEvitadas }), // KIMI-038: flapping de nivel/HD medido en vuelo (herramientas kimi3_*)
    get gestor() { return ST; },
    modelo: n => ST ? ST.modelo(n) : Promise.reject(new Error('streaming sin iniciar')) };
});
