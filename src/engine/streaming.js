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
   puede caer en pantalla). Draw calls = pares modelo × material con alguna instancia visible, más una malla fundida por zona
   ('edificiosZona:<zona>:lejos', todos sus lejanos juntos) para las zonas que se ven enteras más allá de la distancia de LOD.
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
     originales de KitBash3D, docs/EDIFICIOS.md § Ciudad completa). Un solo material AV_HD_* con el atlas 4×4 de las 16
     texturas Ancient (o las 10 Savage), difusa y normales, atlas 4096, y la celda de cada cara en la UV2 (atributo avCelda):
     un draw call por modelo. Se pide con la zona en nivel cerca, en cualquier calidad y con WebGL2 (CFG.hd), también antes
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
   cargarTodo(), soltarTodo(), liberarYa(), terminar(), stats() }; modelo(n) → Promise<{ partes, radio, alto }> fijo (piezas del
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
    moverse: 2,                                    // m que anda el jugador antes de pedir modelos completos fuera de la precarga
    lod: { bajo: 35, medio: 50, alto: 60 },        // m del centro de la instancia a la cámara: cerca → lejos
    lodH: 8,                                       // histéresis del LOD (m)
    // F2.1: 45/70/90 m eran el mínimo (Kelvin, 26-oct: no se recorta el kit), no el tope.
    // Media 90 m y alta 120 m. Baja se queda en 45 m: el móvil modesto no carga más mallas.
    hd: { bajo: 45, medio: 90, alto: 120 },
    hdGrande: 10,                                  // m de radio: los grandes usan su _hd también más allá del LOD (los pequeños, el lejano: menos draw calls)
    // kelvin_ruinas_yunque y _2 (el conjunto de torres de la izquierda, sobre la roca).
    // Desde el aire la ciudad mide más que el _hd general y si no se ve la silueta beige.
    ciudadVista: 220,                              // m al borde de la zona: carga el kit (el spawn, a ~290 m, no entra)
    ciudadMalla: 340,                              // m a la superficie: lo que se dibuja es el _hd o el ligero con textura, no el lejano
    gracia: 3,                                     // s sin uso antes de soltar un modelo
    msCuadro: 4, msArranque: 24,                   // presupuesto de CPU por tanda (en juego / antes de mundoListo)
    descargas: 1, descargasArranque: 3,            // descargas a la vez
    revisar: 0.3,                                  // s entre revisiones de niveles
    margenSombra: 4,
    sombraChica: 4,                                // m de radio: por debajo, la sombra solo hasta la mitad del radio de sombras
  };
  const nivelCal = () => (R.calidad && R.calidad.nivel) || 'medio';
  function alcanceNiebla() {
    const f = scene.fog; if (!f) return Infinity;
    return f.near < 0 ? -f.near + f.far * 3.5 : f.far; // atmosférica (near negativo): por debajo de ~3 % de visibilidad
  }
  const alcance = () => Math.min(CFG.dibujo[nivelCal()] || 190, alcanceNiebla());
  const radioCerca = () => Math.min(CFG.cerca[nivelCal()] || 110, alcance());
  const alcanceZona = () => Math.min(Math.max(CFG.zonaLejos[nivelCal()] || 0, alcance()), alcanceNiebla());

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
    return m;
  }
  // BM23: los modelos Ancient que llegan sin _hd (templo_grande_a y otras torres de la ciudad del tepuy) pintaban el ocre del kit
  // (KB3D_mudM) y desde el aire la ciudad era amarilla. Misma crema que el atlas (piedra mate, albedo máx. ~0,85), conservando el detalle.
  function cremaPlana(m, fuerza) {
    m.specular.setHex(0x000000); m.shininess = 1;
    m.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' +
        '{ float y = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );\n' +
        '  float t = clamp( pow( max( y, 0.0 ), 0.75 ), 0.0, 1.0 );\n' +
        '  vec3 piedra = mix( vec3( 0.54, 0.45, 0.34 ), vec3( 0.94, 0.85, 0.70 ), t );\n' +
        '  float detalle = clamp( y / max( mix( 0.40, 0.80, t ), 0.15 ), 0.70, 1.08 );\n' +
        '  diffuseColor.rgb = mix( diffuseColor.rgb, piedra * detalle, ' + fuerza.toFixed(2) + ' ); }');
    };
    m.customProgramCacheKey = () => 'av-crema-plana-' + fuerza;
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
    const A = HD.celdas * HD.celda, dentro = HD.celda - 2 * HD.margen, f = v => v.toFixed(6);
    const esc = m.userData.avAtlasEsc = { value: 1 }; // tamaño del atlas / 4096 (reducirAtlas): corrige el lod sin recompilar
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
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvAvCelda = avCelda;')
        // BM40: posición de mundo para la textura triplanar de la piedra
        .replace('#include <project_vertex>', '#include <project_vertex>\n{ mat4 mw = modelMatrix;\n#ifdef USE_INSTANCING\n mw = mw * instanceMatrix;\n#endif\n vAvMundo = ( mw * vec4( transformed, 1.0 ) ).xyz; }')
        .replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\nvarying vec3 vAvMundo;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <uv_pars_fragment>', '#include <uv_pars_fragment>\nvarying vec2 vAvCelda;\nvarying vec3 vAvMundo;\nuniform float avAtlasEsc;\nuniform float avTeja;\nuniform float avCrema;\n' +
          'vec4 avAtlas( sampler2D t, vec2 uv ) {\n' +
          '  vec2 dx = dFdx( uv ) * ' + f(dentro) + ' * avAtlasEsc, dy = dFdy( uv ) * ' + f(dentro) + ' * avAtlasEsc;\n' +
          '  float ax = length( dx ), ay = length( dy ), mayor = max( ax, ay ), menor = min( ax, ay );\n' +
          '  float lod = clamp( log2( max( max( menor, mayor / 4.0 ), 1e-4 ) ), 0.0, ' + f(HD.lodMax) + ' + log2( avAtlasEsc ) );\n' +
          '  return textureLod( t, vAvCelda + ' + f(HD.margen / A) + ' + fract( uv ) * ' + f(dentro / A) + ', lod );\n}')
        // split/join: el mapa de normales usa texture2D dos veces (espacio de objeto y tangente). replace() solo
        // cambiaba la primera, y la que se dibuja seguía leyendo el atlas entero con la UV suelta (borde beige, sin relieve).
        .replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment.split('texture2D( map, vUv )').join('avAtlas( map, vUv )') +
          '\nif (avTeja > 0.5 && vAvCelda.x < 0.02 && abs(vAvCelda.y - 0.25) < 0.02) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.58, 0.22, 0.14), 0.84);\n' +
          // Crema solo en la piedra labrada del atlas Ancient (celdas en tools/blender/edificios_hd_atlas.py): mudM y mudDarkM
          // (6, 7) a media fuerza; beams (13, madera) y rockM (14, roca) conservan su textura. Albedo máximo ~0,85 (antes 1,11:
          // se veía blanco, como yeso) y el detalle de la textura se conserva en vez de aplanarse.
          'if (avCrema > 0.5) {\n' +
          '  vec2 cc = floor( vAvCelda * 4.0 + 0.5 );\n' +
          '  float k = cc.y * 4.0 + cc.x;\n' +
          '  float fuerza = ( abs( k - 13.0 ) < 0.5 || abs( k - 14.0 ) < 0.5 ) ? 0.0 : ( ( abs( k - 6.0 ) < 0.5 || abs( k - 7.0 ) < 0.5 ) ? 0.5 : 1.0 );\n' +
          '  float y = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );\n' +
          '  float t = clamp( pow( max( y, 0.0 ), 0.75 ), 0.0, 1.0 );\n' +
          '  vec3 piedra = mix( vec3( 0.54, 0.45, 0.34 ), vec3( 0.94, 0.85, 0.70 ), t );\n' +
          '  float detalle = clamp( y / max( mix( 0.40, 0.80, t ), 0.15 ), 0.70, 1.08 );\n' +
          '  diffuseColor.rgb = mix( diffuseColor.rgb, piedra * detalle, fuerza );\n' +
          // BM40: las losas y paredes grandes del interior estiraban la UV original (borrosas, de un solo color y con costuras).
          // Textura de la piedra (celda 6 del atlas) proyectada en triplanar con tamaño fijo en el mundo (1 repetición = 2,5 m),
          // como variación de luminosidad alrededor de su media, más una veta suave de gran escala para romper las caras lisas.
          '  if ( fuerza > 0.0 ) {\n' +
          '    vec3 pw = vAvMundo, gn = normalize( cross( dFdx( pw ), dFdy( pw ) ) );\n' +
          '    vec3 wt = pow( abs( gn ), vec3( 4.0 ) ); wt /= ( wt.x + wt.y + wt.z + 1e-4 );\n' +
          '    vec2 org = vec2( 0.5, 0.25 );\n' +
          '    float avg = dot( textureLod( map, org + 0.125, 5.0 ).rgb, vec3( 0.2126, 0.7152, 0.0722 ) );\n' +
          '    float dt = 0.0;\n' +
          '    for ( int i = 0; i < 3; i ++ ) {\n' +
          '      vec2 q = ( i == 0 ? pw.zy : ( i == 1 ? pw.xz : pw.xy ) ) / 2.5;\n' +
          '      vec2 ddx = dFdx( q ) * ' + f(dentro) + ' * avAtlasEsc, ddy = dFdy( q ) * ' + f(dentro) + ' * avAtlasEsc;\n' +
          '      float lodq = clamp( log2( max( max( length( ddx ), length( ddy ) ), 1e-4 ) ), 0.0, ' + f(HD.lodMax) + ' + log2( avAtlasEsc ) );\n' +
          '      float w = i == 0 ? wt.x : ( i == 1 ? wt.y : wt.z );\n' +
          '      dt += w * dot( textureLod( map, org + ' + f(HD.margen / A) + ' + fract( q ) * ' + f(dentro / A) + ', lodq ).rgb, vec3( 0.2126, 0.7152, 0.0722 ) );\n' +
          '    }\n' +
          '    float veta = 0.5 + 0.25 * sin( dot( pw, vec3( 0.37, 0.61, 0.29 ) ) ) + 0.25 * sin( dot( pw, vec3( -0.23, 0.17, 0.53 ) ) + 1.7 );\n' +
          '    diffuseColor.rgb *= clamp( mix( 1.0, dt / max( avg, 0.05 ), 0.6 * fuerza ), 0.65, 1.3 ) * mix( 0.9, 1.08, veta );\n' +
          '  }\n' +
          '}\n')
        // BM2: la crema se veía plana. Con la normal ya perturbada, las caras que miran al suelo (cornisas por debajo, techos
        // de huecos, dinteles) y las verticales pierden hasta un 38 % de albedo; la que mira al cielo se queda como estaba.
        // Solo cambia el albedo: no toca el specular 0 ni el shininess 1 de la piedra.
        .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.split('texture2D( normalMap, vUv )').join('avAtlas( normalMap, vUv )') +
          '\nif (avCrema > 0.5) {\n' +
          '  float ny = inverseTransformDirection( normal, viewMatrix ).y;\n' +
          '  float u = clamp( ( ny + 0.15 ) / 1.05, 0.0, 1.0 );\n' +
          '  diffuseColor.rgb *= mix( 0.72, 1.0, u * u * ( 3.0 - 2.0 * u ) );\n' +
          '}\n');
    };
    m.customProgramCacheKey = () => 'av-hd-atlas';
    reducirAtlas(m);
  }
  // BJ1 (QA-52, QA-53): cada atlas de 4096 (difusa y normales) ocupa 85 MB en la GPU; en el móvil, el de la casa junto al punto
  // de aparición llevaba el cap. 1 a 250 MB y subirlo al pulsar «Empezar» congelaba la pantalla. En calidad baja, y en el móvil
  // fuera de alta, se queda en 2048 (celda 512, 21 MB): se dibuja una vez en un lienzo y se suelta el original. Al volver a una
  // calidad mayor sigue en 2048 hasta que la zona se descarga y el modelo vuelve a bajar.
  const MOVIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const atlasMax = () => nivelCal() === 'bajo' || (MOVIL && nivelCal() !== 'alto') ? HD.celdas * HD.celda / 2 : 0;
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
  G.on('calidad', () => { for (const k in mats) if (/^AV_HD_/.test(k)) reducirAtlas(mats[k].mat); });
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
  // F2.2: las caras de arriba del tejado (normal hacia el cielo, en la mitad alta) pasan a rojo teja
  // cálido. El color de vértice del _lejos estaba en ~0,11 y desde el aire no se leía. No se toca la geometría.
  function techar(geo) {
    const pos = geo.attributes.position, nor = geo.attributes.normal, col = geo.attributes.color;
    if (!pos || !nor || !col) return;
    let y1 = -1e9;
    for (let i = 0; i < pos.count; i++) y1 = Math.max(y1, pos.getY(i));
    const corte = y1 * 0.42;
    for (let i = 0; i < pos.count; i++) {
      if (nor.getY(i) > 0.32 && pos.getY(i) > corte) col.setXYZ(i, 0.70, 0.28, 0.18);
    }
    col.needsUpdate = true;
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
  // BM38: el ×1,38 llevaba a 1,0 los canales de las caras claras y el _lejos salía blanco puro frente al crema del cercano
  // (cremaPlana/atlas: 0,94 / 0,85 / 0,70 como máximo). Tope por canal = el techo de la piedra cercana.
  const TOPE_LEJOS = [0.94, 0.85, 0.72];
  function marfilar(geo) {
    const col = geo.attributes.color;
    if (!col || geo.userData.marfil) return;
    for (let i = 0; i < col.count; i++) {
      const r = col.getX(i), g = col.getY(i), b = col.getZ(i), y = 0.2126 * r + 0.7152 * g + 0.0722 * b, s = 0.32, k = 1.38;
      col.setXYZ(i, Math.min(TOPE_LEJOS[0], (y + (r - y) * s) * k), Math.min(TOPE_LEJOS[1], (y + (g - y) * s) * k * 0.97), Math.min(TOPE_LEJOS[2], (y + (b - y) * s * 1.15) * k));
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
    const esCiudad = id => id === 'kelvin_ruinas_yunque' || id === 'kelvin_ruinas_yunque_2';

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
        I.r = rad * I.escala; I.cx = I.pos[0]; I.cy = I.pos[1] + I.r * 0.4; I.cz = I.pos[2];
        inst.push(I);
        (porModelo[c.n] || (porModelo[c.n] = [])).push(I);
        const Z = zonas[c.zona] || (zonas[c.zona] = { id: c.zona, inst: [], modelos: new Set(), cx: 0, cz: 0, r: 0, nivel: 0, forzada: false, ciudad: false, d: Infinity });
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
      const partes = r.tipo === 'lejos' ? [{ geo: r.geo, mat: matLejos }] : r.partes;
      const L = lotes[k] = { n: r.n, tipo: r.tipo, attr, mallas: [], lista: [], prev: [], sombra: false };
      for (const p of partes) {
        const m = new THREE.InstancedMesh(p.geo, p.mat, cap);
        m.instanceMatrix = attr; m.count = 0; m.visible = false; m.frustumCulled = false; m.matrixAutoUpdate = false;
        m.castShadow = r.tipo !== 'lejos';
        m.receiveShadow = true;
        m.name = 'edificiosInst:' + r.n + ':' + r.tipo + ':' + p.mat.name; m.userData.sinSolido = true;
        scene.add(m); L.mallas.push(m);
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
    const cargarGLB = clave => G.assets.loadGLB(base + clave + '.glb', { b64: () => (window[B64] || {})[clave], script: base + clave + '_glb.js', base, error: 'edificio no disponible: ' + clave });
    const tieneLejos = n => { const k = KIT(); return !!(k && k[n] && k[n].lejos); };
    const tieneHD = n => { const k = KIT(); return !!(k && k[n] && k[n].hd); };
    const hdActivo = () => (CFG.hd[nivelCal()] || 0) > 0 && hdGL2();
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
      const pre = CFG.precarga[nivelCal()] || 50, lq = CFG.lejosQuieto[nivelCal()] || 150;
      return (r.tipo === 'lejos' && r.prio < lq) || ((r.tipo === 'cerca' || r.tipo === 'hd') && r.prio < pre);
    }
    function siguiente() {
      const max = arrancando ? CFG.descargasArranque : CFG.descargas;
      while (enVuelo < max && cola.length) {
        cola.sort((a, b) => a.prio - b.prio);
        const i = cola.findIndex(puedeAhora);
        if (i < 0) break;
        const r = cola.splice(i, 1)[0];
        if (r.estado !== 'cola') continue;
        if (!r.refs && !r.fijo) { r.estado = 'nada'; continue; }
        r.estado = 'bajando'; enVuelo++;
        cargarGLB(r.tipo === 'lejos' ? r.n + '_lejos' : r.tipo === 'hd' ? r.n + '_hd' : r.n)
          .then(gltf => encolar(() => procesar(r, gltf.scene)), err => { r.estado = 'error'; r.error = err; r.mal(err); })
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
      if (r.tipo === 'lejos') {
        const geos = [...grupos.values()].flatMap(g => g.geos.map(geo => {
          if (geo.attributes.color) return geo;
          const c = g.src.color || new THREE.Color(1, 1, 1), n = geo.attributes.position.count, a = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
          const out = geo.clone(); out.setAttribute('color', new THREE.BufferAttribute(a, 3)); return out;
        }));
        r.geo = fundir(geos, true);
        piedraLejos(r.n, r.geo, [...grupos.values()].some(g => g.src && g.src.userData && g.src.userData.avCremaLejos === 1));
        if (tieneTeja(r.n)) techar(r.geo);
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
        try { r.geo = generarLejos(rc.partes); piedraLejos(r.n, r.geo); if (tieneTeja(r.n)) techar(r.geo); r.estado = 'listo'; crearLote(r); if (!r.refs) r.soltarEn = performance.now() + CFG.gracia * 1000; r.ok(r); zonasDe(r.n); }
        catch (e) { r.estado = 'error'; r.mal(e); }
        soltar(rc);
      }), err => { r.estado = 'error'; r.mal(err); soltar(rc); });
    }
    function liberar(r) {
      quitarLote(r);
      if (r.tipo !== 'lejos' && r.partes) { for (const p of r.partes) { p.geo.dispose(); soltarMaterial(p.mat); } r.partes = null; }
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
      // BM6-1: bohío de puerta abierta compartida: salvo la instancia amueblada, cada una pone su panel (sólido)
      if (G.bohiosAbiertos && G.bohiosAbiertos[I.modelo] && !(G.esBohioAbierto && G.esBohioAbierto(I)) && G.solidos && G.solidos.panelInstancia) G.solidos.panelInstancia(I.modelo, I.m);
      if (G.solidos && G.solidos.agregar) {
        const g = new THREE.Group();
        for (const p of r.partes) { const m = new THREE.Mesh(p.geo, p.mat); m.matrixAutoUpdate = false; m.matrix.copy(I.m); g.add(m); }
        g.userData.modelo = I.modelo; // BM6-3: solidos.js guarda las matrices por nombre de modelo
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
    // Distancia al modelo más cercano de la zona (prioridad de descarga: lo que tienes delante entra antes que el resto).
    function distModelo(Z, n) {
      const S = G.S, x = S.pos ? S.pos.x : Z.cx, z = S.pos ? S.pos.z : Z.cz;
      let m = Z.d;
      for (const I of Z.inst) if (I.modelo === n && I.pos) m = Math.min(m, Math.hypot(I.pos[0] - x, I.pos[2] - z) - (I.r || 0));
      return m;
    }
    // Versión _hd de los modelos de la zona: se pide en nivel cerca, en cualquier calidad, y se suelta al salir.
    function ajustarHD(Z, quiere) {
      if (!!Z.hd === quiere) return;
      Z.hd = quiere;
      for (const n of Z.modelos) if (tieneHD(n)) { if (quiere) pedir(res(n, 'hd'), Z.d + 1).catch(() => {}); else soltar(res(n, 'hd')); }
    }
    // Zona vista de lejos: todos sus lejanos fundidos en una malla (un draw call por zona; el frustum la descarta entera). Se
    // usa en nivel lejos y también en nivel cerca mientras toda la zona quede más allá de la distancia de LOD de la cámara.
    // La zona se funde en tandas de pocos milisegundos: cerrarla de una vez trababa el cuadro.
    function fundirZona(Z) {
      if (Z.nivel < 1 || Z.malla || Z.fundir) return;
      const rs = [...Z.modelos].map(n => res(n, 'lejos'));
      if (!rs.every(r => r.estado === 'listo' && r.geo)) return;
      Z.fundir = { i: 0, geos: [] };
      encolar(() => fundirPaso(Z));
    }
    function fundirPaso(Z) {
      const F = Z.fundir;
      if (!F || Z.malla || Z.nivel < 1) { if (F) { for (const g of F.geos) g.dispose(); Z.fundir = null; } return; }
      const t0 = performance.now();
      while (F.i < Z.inst.length && performance.now() - t0 < 6) {
        const I = Z.inst[F.i++], geo = res(I.modelo, 'lejos').geo;
        if (!geo) { for (const g of F.geos) g.dispose(); Z.fundir = null; return; }
        F.geos.push(geo.clone().applyMatrix4(I.m));
      }
      if (F.i < Z.inst.length || performance.now() - t0 >= 6) { encolar(() => (Z.fundir && Z.fundir.i < Z.inst.length) ? fundirPaso(Z) : fundirCerrar(Z)); return; }
      fundirCerrar(Z);
    }
    function fundirCerrar(Z) {
      const F = Z.fundir; if (!F) return;
      Z.fundir = null;
      if (Z.nivel < 1 || Z.malla) { for (const g of F.geos) g.dispose(); return; }
      if (!F.geos.length) return;
      const m = new THREE.Mesh(fundir(F.geos, true), matLejos);
      for (const g of F.geos) g.dispose();
      m.name = 'edificiosZona:' + Z.id + ':lejos'; m.userData.sinSolido = true; m.matrixAutoUpdate = false;
      m.receiveShadow = true; m.castShadow = false;
      scene.add(m); Z.malla = m;
    }
    function quitarZona(Z) {
      if (Z.fundir) { for (const g of Z.fundir.geos) g.dispose(); Z.fundir = null; }
      if (!Z.malla) return; scene.remove(Z.malla); Z.malla.geometry.dispose(); Z.malla = null;
    }
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
      const Rc = radioCerca(), Rl = alcanceZona(), H = CFG.histeresis;
      for (const id in zonas) {
        const Z = zonas[id];
        Z.d = Math.max(0, Math.hypot(x - Z.cx, z - Z.cz) - Z.r);
        const cerca = Z.forzada || (Z.nivel === 2 ? Z.d < Rc + H : Z.d < Rc);
        const lejos = Z.nivel >= 1 ? Z.d < Rl + H : Z.d < Rl;
        nivelZona(Z, cerca ? 2 : lejos ? 1 : 0);
        // La gran ciudad del tepuy: una referencia propia del kit, aparte del nivel. Así el _hd sigue cargado
        // cuando Vittata la mira desde el aire y se suelta al volver al spawn. No alarga el _hd del resto del mapa.
        if (esCiudad(Z.id)) {
          const quiere = hdActivo() && Z.nivel >= 1 && Z.d < CFG.ciudadVista + (Z.ciudad ? H : 0);
          if (Z.ciudad !== quiere) {
            Z.ciudad = quiere;
            for (const n of Z.modelos) {
              if (quiere) pedir(res(n, 'cerca'), Z.d).catch(err => respaldo(Z, n, err));
              else soltar(res(n, 'cerca'));
            }
          }
        }
        ajustarHD(Z, hdActivo() && (Z.ciudad || (Z.nivel === 2 && Z.d < Rc + (Z.hd ? H : 0)))); // forzada de lejos (cargarTodo): sin _hd
        if (Z.hd) for (const n of Z.modelos) {
          const rh = recursos[n] && recursos[n].hd;
          if (rh && rh.estado === 'cola') rh.prio = distModelo(Z, n);
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
    const vis = { cerca: 0, lejos: 0, hd: 0, mallas: 0, zonas: 0 };
    function cuadro() {
      const cam = R.camera; cam.updateMatrixWorld(); if (cam.matrixWorldInverse) cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      frustum.setFromProjectionMatrix(pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      const cp = cam.position, max = alcance(), maxZ = alcanceZona(), lodD = CFG.lod[nivelCal()] || 65, H = CFG.lodH, hdD = hdActivo() ? CFG.hd[nivelCal()] : 0;
      const S = G.S, px = S.pos ? S.pos.x : cp.x, py = S.pos ? S.pos.y : cp.y, pz = S.pos ? S.pos.z : cp.z;
      const conSombra = !!(R.calidad && R.calidad.sombras && R.sun && R.sun.castShadow), rS = ((R.calidad && R.calidad.sombraRadio) || 0) + CFG.margenSombra;
      for (const k in lotes) { const L = lotes[k]; L.lista.length = 0; L.sombra = false; }
      vis.zonas = 0;
      for (const id in zonas) {
        const Z = zonas[id], m = Z.malla; if (!m) { Z.usaMalla = false; continue; }
        const dz = Math.hypot(cp.x - Z.cx, cp.z - Z.cz) - Z.r;
        const dj = Math.hypot(px - Z.cx, pz - Z.cz) - Z.r;
        const umbral = lodD + (Z.usaMalla ? -H : H);
        // La silueta fundida solo si la cámara y Vittata están lejos del borde. Junto a las ruinas se dibujan las mallas.
        // En la ciudad del tepuy, nunca: la silueta beige tapa el kit justo en la vista aérea.
        Z.usaMalla = !Z.ciudad && (Z.nivel === 1 || (dz > umbral && dj > umbral));
        const bs = m.geometry.boundingSphere; m.visible = Z.usaMalla && cp.distanceTo(bs.center) - bs.radius < maxZ;
        if (m.visible && frustum.intersectsSphere(bs)) vis.zonas++;
      }
      for (let i = 0; i < activas.length; i++) {
        const I = activas[i];
        if (zonas[I.zona].usaMalla) continue; // la dibuja la malla fundida de su zona
        const dCam = Math.hypot(I.cx - cp.x, I.cy - cp.y, I.cz - cp.z);
        const vista = zonas[I.zona].ciudad;
        const maxI = vista ? Math.max(max, CFG.ciudadMalla) : max;
        if (dCam - I.r > maxI) continue;
        // Metros hasta la superficie de la esfera, el menor entre la cámara y Vittata. Encima de una torre el centro
        // queda muchos metros abajo: con la distancia al centro el lod lejano (beige, sin textura) seguía puesto.
        const dPla = Math.hypot(I.cx - px, I.cy - py, I.cz - pz);
        const dl = Math.max(0, Math.min(dCam, dPla) - I.r);
        const grande = I.r > CFG.hdGrande;
        const lodLim = vista ? Math.max(lodD, CFG.ciudadMalla) : lodD;
        const hdLim = vista ? Math.max(hdD, CFG.ciudadMalla) : hdD;
        if (I.lod === 0 && dl > lodLim + H) I.lod = 1; else if (I.lod === 1 && dl < lodLim - H) I.lod = 0;
        // Junto a la pared, la malla completa en cualquier calidad. Los grandes siguen en HD más allá del LOD, hasta hdD.
        // La torre chica, de lejos, queda en la silueta. Mientras el _hd baja, se ve el ligero y no la silueta.
        // En la ciudad del tepuy el límite es el de la vista aérea: si no, a 100 m ya es la silueta beige.
        const junto = hdLim > 0 && dl < hdLim + (I.hd ? H : -H);
        I.hd = junto && (I.lod === 0 || grande) && I.colocado; // BM6-6: el _hd no sustituye al ligero hasta que el sólido esté colocado
        const base = (I.lod === 0 || junto) ? 'cerca' : 'lejos';
        let L = (I.hd && lotes[I.modelo + ':hd']) || lotes[I.modelo + ':' + base] || lotes[I.modelo + ':' + (base === 'cerca' ? 'lejos' : 'cerca')];
        if (!L) continue;
        // Los props chicos (losas, toldos, canoas: BH1) solo dan sombra junto a Vittata: más allá son unos pocos texels
        // del mapa de sombras y cada modelo con sombra es un draw call más en la pasada de sombras.
        const sombra = L.tipo !== 'lejos' && conSombra && Math.hypot(I.cx - px, I.cz - pz) < (I.r < CFG.sombraChica ? rS * 0.5 : rS) + I.r;
        esfera.center.set(I.cx, I.cy, I.cz); esfera.radius = I.r;
        if (!sombra && !frustum.intersectsSphere(esfera)) continue;
        L.lista.push(I); if (sombra) L.sombra = true;
      }
      vis.cerca = vis.lejos = vis.hd = vis.mallas = 0;
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
              scene.add(m); L.mallas.push(m); L.panel = m;
            }
          }
        }
        if (L.panel && G.esBohioAbierto && li.some(I => G.esBohioAbierto(I))) { // BM13: varias abiertas (una por aldea), todas al final
          const cerr = li.filter(I => !G.esBohioAbierto(I)), abi = li.filter(I => G.esBohioAbierto(I));
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
      cargarTodo() { for (const id in zonas) zonas[id].forzada = true; return alrededor(); },
      soltarTodo() { for (const id in zonas) zonas[id].forzada = false; revisar(); },
      liberarYa() { for (const n in recursos) for (const t in recursos[n]) { const r = recursos[n][t]; if (r.soltarEn) r.soltarEn = 1; } liberarVencidos(performance.now()); },
      terminar() {
        // Lo que ya se está bajando, más los trabajos y la colocación. La cola que el modo quieto
        // todavía no deja bajar (el mapa entero, a 650 m) no cuenta: si no, la prueba no arranca.
        const espera = () => new Promise(ok => {
          const mirar = () => {
            drenar(); siguiente();
            const esperaCola = cola.some(r => r.estado === 'cola' && (r.refs || r.fijo) && puedeAhora(r));
            if (!enVuelo && !esperaCola && !trabajos.length) ok(); else setTimeout(mirar, 25);
          };
          mirar();
        });
        return espera().then(() => { drenarColocar(); drenar(); });
      },
      stats() {
        let modCerca = 0, modLejos = 0, modHD = 0, bytes = 0;
        for (const n in recursos) {
          const rc = recursos[n].cerca, rl = recursos[n].lejos, rh = recursos[n].hd;
          if (rc && rc.estado === 'listo') { modCerca++; for (const p of rc.partes) bytes += tam(p.geo); }
          if (rh && rh.estado === 'listo') { modHD++; for (const p of rh.partes) bytes += tam(p.geo); }
          if (rl && rl.estado === 'listo') { modLejos++; bytes += tam(rl.geo); }
        }
        for (const id in zonas) if (zonas[id].malla) bytes += tam(zonas[id].malla.geometry);
        const zs = Object.values(zonas);
        return { zonas: zs.length, zonasCerca: zs.filter(Z => Z.nivel === 2).length, zonasLejos: zs.filter(Z => Z.nivel === 1).length,
          instancias: inst.length, colocadas: inst.filter(I => I.colocado).length, modelosCerca: modCerca, modelosLejos: modLejos, modelosHD: modHD,
          materiales: Object.keys(mats).length, kbGeometria: Math.round(bytes / 1024), visiblesCerca: vis.cerca, visiblesLejos: vis.lejos, visiblesHD: vis.hd, hd: hdActivo(),
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
      let st = null, hdMax = 0;
      for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        G.camara.yaw = yaw; dibujar(2);
        const c = contar(), se = ST.stats();
        if (!st || c > st.calls) st = { calls: c, yaw, edif: se.drawEdificios, cerca: se.visiblesCerca, lejos: se.visiblesLejos, hd: se.visiblesHD, zonas: se.zonasFundidas };
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
        ' (' + st.cerca + ' instancias cerca, ' + st.hd + ' _hd, ' + st.lejos + ' lejos sueltas, ' + st.zonas + ' zonas fundidas) · ' + nivelCal());
      const lejosM = [];
      scene.traverse(o => { if (o.name && o.name.indexOf(':lejos') >= 0) lejosM.push(o); });
      check('El lejano recibe la sombra del sol y no la proyecta', lejosM.length > 0 && lejosM.every(o => o.receiveShadow && !o.castShadow),
        lejosM.length + ' mallas');
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
      const m1 = foto();
      for (let v = 0; v < 2; v++) { await ir(bx, bz, 0, -1); await ir(x0, z0); ST.liberarYa(); dibujar(); }
      const m2 = foto();
      check('Sin fugas tras ir y volver dos veces (memoria de edificios estable; heap con gc ≤ +8 MB)', m2.kb <= m1.kb * 1.02 + 16 && m2.mats <= m1.mats && m2.mod <= m1.mod && !(gc && m2.heap - m1.heap > tolHeap),
        'KB ' + m1.kb + '→' + m2.kb + ' · materiales ' + m1.mats + '→' + m2.mats + ' · modelos ' + m1.mod + '→' + m2.mod + ' · heap ' + r2(m1.heap) + '→' + r2(m2.heap) + ' MB' + (gc ? ' (gc)' : ' (sin gc: no se exige)') + ' · three geo ' + m1.g + '→' + m2.g + ', tex ' + m1.t + '→' + m2.t);
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
        await ir(x0, z0); ST.liberarYa(); dibujar();
        check('Al volver al inicio, la ciudad del tepuy suelta el kit de la vista aérea', !ZC.ciudad && ZC.nivel < 2, 'ciudad ' + !!ZC.ciudad + ' · nivel ' + ZC.nivel);
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
    get gestor() { return ST; },
    modelo: n => ST ? ST.modelo(n) : Promise.reject(new Error('streaming sin iniciar')) };
});
