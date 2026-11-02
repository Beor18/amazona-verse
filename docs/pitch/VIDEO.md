# Video pitch · cómo recapturar y re-montar

El pitch se arma con dos comandos: uno captura y otro monta. Los dos son reproducibles y no tocan el código del juego.
Cuando cambie el mundo (mapa nuevo, edificios, ropa, criadero), basta con volver a correrlos.

| Paso | Comando (desde `~/AmazonaVerse/Juego`) | Tiempo aprox. |
|---|---|---|
| 1. Capturar | `python3 tools/video/capturar.py --ver v2` | 5–10 min |
| 2. Montar | `python3 tools/video/montaje.py --ver v2` | 10–15 min |

Salida: `~/AmazonaVerse/Pitch/AmazonaVerse_Pitch_v2.mp4` (1920x1080, 30 fps, H.264, AAC 48 kHz) y
`AmazonaVerse_Pitch_v2_ligero.mp4` (1280x720, menos de 50 MB, para compartir). Los dos llevan el índice al principio y se
pueden reproducir en la web mientras se descargan.

## 1. Captura (`tools/video/capturar.py` + `capturar.html` + `captura.js`)

- Arranca el servidor de desarrollo (`tests/server.py`, puerto 8765) si no está corriendo.
- Abre Google Chrome sin ventana, con un perfil temporal propio, en `tools/video/capturar.html`. Esa página carga el juego en
  un iframe de 1280x720 CSS e inyecta `tools/video/captura.js`.
- `captura.js` toma el control del reloj: `performance.now` y `requestAnimationFrame` pasan a tiempo virtual, y cada cuadro
  avanza exactamente 1/30 s. `Math.random` se siembra con el id de la toma. Así la misma toma da siempre los mismos
  cuadros, por lenta que sea la máquina. El guardado en localStorage queda desactivado en esa pestaña.
- El mundo se renderiza a 3840x2160 (supermuestreo x2) y se reduce a 1920x1080. Cada cuadro sale como JPEG de calidad 0,92
  por `POST /__save` a `tests/out/` y se mueve enseguida a `~/AmazonaVerse/_trabajo_claude/pitch/frames/<ver>/<toma>/`.
- Con `"hud": true`, la interfaz real (HTML) se rasteriza encima del cuadro, maquetada a 1280x720 y con Fredoka y
  Atkinson incrustadas. Sin HUD, el cuadro es solo el mundo, sin el haz ni la flecha de guía.
- Títulos y logo: se generan como PNG transparentes con la tipografía del juego. Salen de `docs/pitch/TOMAS.json` y del
  logo de la portada, y van a `frames/<ver>/gfx/`.
- Las tomas de otro content pack (por ejemplo `tec_motor_plantilla`, con `"pack": "plantilla"`) se capturan en una segunda
  pasada, con su propia página.

Opciones útiles:
- `--solo id1,id2`: recaptura solo esas tomas. Borra sus cuadros viejos y conserva los demás.
- `--previa`: 3 cuadros por toma y hojas de contacto en `frames/<ver>/hojas/`. Sirve para revisar encuadres en un minuto;
  úsalo con otra versión, por ejemplo `--ver v2p --previa --ss 1`.
- `--navegador abrir`: usa el navegador por defecto, con ventana, en vez de Chrome sin ventana.
- A mano, desde la consola del juego: carga `tools/video/captura.js` y llama
  `AVCAP.guion('tools/video/guiones/pitch.json', { version: 'v2' })`. Después mueve los cuadros con
  `python3 tools/video/capturar.py --ver v2 --solo-mover`.

## 2. Guion de captura (`tools/video/guiones/pitch.json`)

Los ids de toma son los de `docs/pitch/TOMAS.json`. El comité es dueño de los tiempos, los títulos y el orden; el guion de
captura dice cómo se graba cada toma:

```json
{ "id": "gancho_vuelo_mirador", "dur": 4.8, "preroll": 0.5, "hud": false,
  "estado": { "en": { "poi": "mirador", "dx": 2.5, "dz": 0.5 }, "rumbo": 90, "ropa": "base", "aprendiz": false },
  "camara": { "tipo": "dron", "puntos": [ { "jugador0": true, "frente": 2.5, "lado": -6, "dy": 1.4 }, … ], "fov": [50, 58] },
  "acciones": [ { "t": -0.5, "a": "caminar", "rumbo": 92, "correr": true }, { "t": 0.3, "a": "vuelo", "dur": 6, "puntos": [[26, 174], [45, 181]], "sobreSuelo": 19 } ],
  "montaje": { "transicion": 0.3, "desenfoque": [0, 14], "zoom": [1, 1.2], "titulo": { "estilo": "logo" } } }
```

- Puntos: `[x, z]` (sobre el suelo), `[x, y, z]`, `{ "poi": id, dx, dy, dz }` (POIs del mapa, lugares, NPC o
  `respaldoPOI`), `{ "jugador": true }` (en vivo) y `{ "jugador0": true, "frente", "lado", "dy" }` (relativo a donde
  empezó la toma).
- Cámaras: `juego` (la del juego, con `yaw` y `giro`), `seguimiento` (dist, alto, lado, adelante, rumbo fijo opcional),
  `orbita` (centro, radio, alto, ang, vel en °/s), `primerPlano` (ang respecto a la cara, dist, alto), `dron` (spline por
  puntos, mira a Vittata, a un punto o adelante), `fija`. Los números aceptan `[desde, hasta]`. `pulso` añade cámara en
  mano. Ninguna cámara baja del suelo ni del agua. `far` y `niebla` cambian solo esa toma.
- Acciones de Vittata (t en s desde el punto de entrada): `ruta`, `caminar`, `correr`, `parar`, `saltar`, `planear`,
  `volar`, `subir`, `bajar`, `aterrizar`, `soltarVuelo`, `vuelo` (vuelo guiado por spline, con duración exacta),
  `bucear`, `emerger`, `impulso`, `gesto`, `ropa`, `expresion`, `mirar`, `mirarCamara`, `teleport`, `accion`, `clic`
  (selector y texto), `edu` (paso de la misión) y `js`.
- `margen` [antes, después] (por defecto [0,5, 0,7]) graba cuadros de más para fundidos y para ajustar el corte.
- Otras claves de toma: `hud` (interfaz encima), `lienzo` (selector de otro canvas como fuente, p. ej. `.cr-canvas`),
  `pack` (toma de otro content pack, en su propia pasada), `sinCaptura` + `captura_de` (una toma del comité que sale de
  otra captura, con `montaje.entrada`), `preroll` (segundos simulados antes de grabar). Las acciones `js` y `estado.js`
  pueden devolver una promesa: el reloj virtual espera a que termine (abrir el criadero, cargar un modelo).

## 3. Montaje (`tools/video/montaje.py`, Blender 4.2 VSE sin ventana)

- Se lanza solo con `taskpolicy -b nice -n 15 ~/Applications/Blender.app/Contents/MacOS/Blender -b`.
- Lee `docs/pitch/TOMAS.json` (inicio, duración y título de cada toma, más el logo), los ajustes de `montaje` del guion y
  los cuadros de `frames/<ver>`. Coloca la mezcla del sonido (`_trabajo_claude/pitch/audio/pitch_mix.wav`).
- Cortes secos en compás por defecto. Opcionales: fundido encadenado (`transicion`), desenfoque, zoom digital, pantalla
  dividida (`dividida: [izq, der]`) y marco de navegador (`marco`). Los títulos entran con un fundido y una subida suave.
- Un clip externo en `_trabajo_claude/pitch/externos/<toma>.mp4` sustituye a la captura de esa toma, por ejemplo una
  grabación real de pantalla para `tec_navegador`.
- `--hasta 26.4` monta solo los primeros segundos (así se hizo el v0 del gancho). Con `--blend` guarda también el .blend.
- Los avisos (tomas que faltan o quedan cortas, gráficos ausentes) salen en pantalla y en
  `_trabajo_claude/pitch/montaje_v<N>.json`.

## Pendientes conocidos (v1)

- Criadero (86.4–98.4 s): es real (`G.criadero.debug`). Para la eclosión y el bebé se graba una sola toma,
  `criadero_seq`, con `"lienzo": ".cr-canvas"`, porque la vista del criadero tiene su propio WebGL. `criadero_vuelo`
  muestra a la cría (Iguaca, la compañera) siguiendo a Vittata por el mundo. Para recapturar el criadero:
  `--solo criadero_seq,criadero_juvenil,criadero_adulto,criadero_vuelo`.
- Loops de la web (sin audio, menos de 4 MB, cierre limpio): se capturan con su propio guion y se montan con loops.py.
  `capturar.py --ver web1 --guion tools/video/guiones/loops.json --sin-graficos --puerto 8791` (servidor propio:
  el 8765 suele ser de otro) y después `loops.py [--solo historia,ropero] [--solo-poster]`. Salen a
  `~/AmazonaVerse/Web/assets/video/` (mp4 + webm VP9 + póster jpg). El hero sale de las tomas de v1, como `hero.mp4`.
  Ropero: solo la pava (la gorra con la bandera no va en anuncios, `docs/BANDERA_PR_GUIA.md` §6).
- Ritmo del render: `taskpolicy -b` deja a Blender en los núcleos de eficiencia, así que el master de 165 s tarda
  entre 30 y 90 min, según la carga de la Mac. El `_ligero` (720p) ya sale siempre del master recodificado: exportar el
  montaje a 1280x720 recortaba el centro del cuadro (le pasó al `_ligero` de v1 del 24 oct, 23:48; hay que rehacerlo).
  Rehacerlo solo: `montaje.py --ver v1 --ligero-desde-master`.
- Cambiar solo el audio sin recapturar ni recodificar la imagen (segundos, no horas): primero `bash tools/audio/generar_todo.sh --mezcla` y después, para cada MP4 (master 256 kb/s; web y `_compartir` 128 kb/s):
  `python3 tools/audio/remux_audio.py ENTRADA.mp4 SALIDA.mp4 --kbps 128`. Copia la pista de video tal cual, codifica el WAV con `afconvert` y deja el índice (moov) al principio. `remux_audio.py --info ARCHIVO.mp4` da duración, códecs, resolución y peso (hace de ffprobe).
- Pitch para la web (≤ 14 MB, 960x540, video 480 kb/s + AAC 128 kb/s, póster en el logo):
  `montaje.py --ver v1 --ligero-desde-master --alto 540 --kbps 480 --poster 27.2 --destino ~/AmazonaVerse/Web/assets/video/pitch.mp4`.
- Python: los comandos `python3 …` de esta guía se corren con el de Blender
  (`~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11 -I`), nunca con el del sistema.
- `tec_navegador`: por ahora es un marco neutro de navegador sobre una captura real de la portada y el juego. Si llega
  una grabación real, va en `externos/tec_navegador.mp4`.
- Bajo el agua el motor no tiene render subacuático, así que esas tomas se graban a ras de la superficie.
- El mirador (torre) aún no tiene la plataforma alta caminable: Vittata está en el borde del cerro, junto a la torre.
- Presupuesto de disco: cada versión completa ocupa unos 2–3 GB de cuadros. Borra `frames/<ver>` de las versiones
  descartadas.
