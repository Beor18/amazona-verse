# Audio del video pitch · Amazona Verse

Todo el audio del pitch (165.6 s, 69 compases a 100 BPM) está hecho aquí con dos herramientas: síntesis con numpy y el comando `say` de macOS. No se descargó ningún sample, música ni voz.
Scripts en `tools/audio/`. Los WAV se escriben en `~/AmazonaVerse/_trabajo_claude/pitch/audio/` y no van al repo.

> **Estado: FINAL v1.** Kelvin decidió el 24 oct 2026 que la voz de la Mac (Paulina, es_MX) es la pista definitiva de la v1. Lo controla `"voz_tts_definitiva": true` en `tools/audio/tiempos.json`; con `false`, la mezcla vuelve a marcarse como "GUÍA - NO PUBLICAR". El pipeline sigue listo para cambiar la voz por la grabación de Kelvin o por una voz neural es-PR (ver "Cambiar la voz"). El campo `estado` de `pitch/audio/tiempos.json` dice siempre qué voz lleva la mezcla.

## Regenerar todo con un comando

```bash
bash ~/AmazonaVerse/Juego/tools/audio/generar_todo.sh            # SFX, voz, música, mezcla e informes (~5 min)
bash ~/AmazonaVerse/Juego/tools/audio/generar_todo.sh --mezcla   # solo mezcla e informes
```

Usa el Python de Blender con `-I` (`~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11`). No uses el `python3` del sistema, porque se cuelga. No hace falta ffmpeg ni scipy. El resultado es determinista porque las semillas son fijas.

| Script | Qué hace |
|---|---|
| `tiempos.json` | Fuente única de tiempos: secciones en compases, eventos (entrada de la música, corte, despegue, logo) y los 60 SFX. Cada SFX lleva tiempo absoluto, según los puntos de imagen del editor, o una ancla de palabra. |
| `dsp.py` | WAV de 16/24 bit, filtros por FFT y STFT, EQ RBJ, reverb por convolución con IR sintética, loudness BS.1770-4 (integrada, corta, LRA), true peak 4x y limitador con lookahead. |
| `instrumentos.py` | Cuatro (Karplus-Strong vectorizado, órdenes dobles B-E-A-D-G con las dos graves en octava, cuerpo modal), güiro, panderos de plena (seguidor, punteador, requinto), maraca granular, cuá, bajo, pad de tabla de ondas, marimba, celesta, pluck, flauta, batería, riser, impacto y platillo. |
| `musica.py` | Compone y mezcla la música por secciones → `musica/musica.wav` y `musica/grupo_*.wav`. |
| `sfx.py` | 32 efectos → `sfx/*.wav`. |
| `voz.py` | `docs/pitch/VO.txt` → `vo/VO_Bxx_SECCION.wav`, `vo_bloques.json`, `GUION_GRABACION.txt`. |
| `mezcla.py` | Voz + música con ducking + SFX → `pitch_mix.wav`, `stems/` y `tiempos.json` resuelto para el editor. |
| `analisis.py` | Validación medida de cada WAV (ver "Validación"). |

## Entregables (`_trabajo_claude/pitch/audio/`)

- `pitch_mix.wav`: 48 kHz, estéreo, 24 bit, 165.6 s.
- `stems/voz.wav`, `stems/musica.wav` (con el ducking aplicado) y `stems/sfx.wav`. Tienen la misma ganancia que la mezcla, aplicada antes del limitador.
- `vo/`: un WAV por bloque (`VO_B01_GANCHO.wav` … `VO_B12_CIERRE.wav`, mono, -19 LUFS). También `VO_completa_tts.wav`, `vo_bloques.json` (inicio, fin, ventana, ritmo, texto TTS y marcas de palabra) y `GUION_GRABACION.txt`.
- `musica/`: la música sola (-16 LUFS como objetivo, true peak ≤ -3 dBTP) y sus 7 subgrupos.
- `sfx/`: los 32 efectos sueltos.
- `tiempos.json`: tiempos reales de la mezcla, que es lo que lee el editor.
- `analisis/`: informes `informe_mezcla.*` e `informe_archivos.*`.

## Voz en off

**Voz elegida: Paulina (es_MX).** Las voces en español que trae `say` son Paulina, Eddy y Flo (es_MX) y Mónica (es_ES). Las comparé midiendo:
- Paulina y Mónica tienen banda de 22 kHz, con contenido hasta 11 kHz.
- Eddy y Flo se cortan en 8 kHz, porque son de 16 kHz, y suenan más metálicas.
- Mónica tiene acento peninsular, con distinción de z/c.

Paulina es la más cálida y la más cercana a un español caribeño neutro. Encaja con la "maestra querida" que pide el guion.

**Pronunciación.** No se puede escuchar, así que la verifiqué así: sinteticé cada palabra con varias grafías y comparé las muestras. Si dos grafías dan una salida idéntica, el motor ya pronuncia bien la palabra.

| Texto | Al TTS | Comprobación |
|---|---|---|
| Vittata | `Vitáta` | "Vittata" sale distinta: la lee con doble t. "Vitáta" = "Vitata" = vi-TÁ-ta. |
| Amazona Verse | `Amazona Vers` | "Verse" la lee "Ver-se", con dos sílabas. "Vers" es una sílaba, como en inglés. |
| El Yunque | sin cambio | Salida idéntica a "El Yúnke". |
| boricua | sin cambio | Salida idéntica a "borícua" y "boríkua". |
| coquí | sin cambio (con tilde) | Salida idéntica a "kokí". Sin tilde cambia el acento, así que `coqui` se convierte en `coquí`. |
| Crombuks | `Crómbuks` | "Crombuks" sale idéntico a "Crombúks" (crom-BÚKS). Con la tilde queda CRÓM-buks, como "Chromebooks". |
| Güeb Asémbli | sin cambio | Salida idéntica a "Güeb Asembli": el acento cae en "sém". |

**Prosodia** (comandos de `say`; Paulina ignora `[[emph]]` y `[[pmod]]`, pero `[[pbas]]`, `[[rate]]` y `[[slnc]]` sí funcionan, medido):
Medí los silencios del motor: el punto deja 0.23 s y la coma 0.20 s. Con esos datos:
- `…` se convierte en coma + `[[slnc 320]]`, unos 0.33 s en total. Al final de un bloque queda solo la coma, para que la entonación quede suspendida ("…cuidar su isla,").
- `[pausa]` = `[[slnc 580]]`, unos 0.8 s con el punto. `[pausa larga]` = `[[slnc 1300]]`.
- Entre frases hay un respiro extra de 150 ms (`[[slnc 150]]` tras `.` y `;`) si la ventana lo permite. Si no cabe, primero se quita ese respiro y luego se acelera.
- MAYÚSCULAS: `[[slnc 60]] [[pbas +2]] [[rate ×0.88]] palabra [[rate]] [[pbas -2]]`, es decir, un respiro breve, el tono un poco más alto y la palabra más lenta.
- Ritmo: 158 ppm de motor como base. `voz.py` sube el ritmo solo si un bloque no cabe (B01 va a 159) y lo baja a 146 si sobra mucho aire (B05). B12, "la cotorra VUELVE A VOLAR", va a 132 con el tono base 1 paso más grave.
- B10 empieza en 141.6, con el primer tiempo del cierre, en vez de en 142.0. Así no hay que acelerarlo: va a 158 en lugar de 182. El comité acepta movimientos de hasta 0.6 s.
- Cadena por bloque: recorte, paso alto de 80 Hz, -2 dB en 260 Hz, +2 dB en 3.3 kHz, shelf de +1.5 dB en 7.5 kHz, compresión 2:1 suave y nivel de -19 LUFS.

Cada bloque empieza en el tiempo de VO.txt, salvo B10, que entra 0.4 s antes. La primera sílaba cae en `inicio_voz_s`. Las 12 ventanas caben, y la más justa es B09, que termina en 141.04 cuando B10 empieza en 141.6.

### Cambiar la voz (grabación de Kelvin, locutor de PR o voz neural es-PR)

**Con WAV externos** (grabación o exportación de una voz neural):

1. Abre `pitch/audio/vo/GUION_GRABACION.txt`: tiene cada archivo con su texto, su inicio y su ventana.
2. Graba cada bloque en un WAV con el mismo nombre (`VO_B01_GANCHO.wav`, …). Sirve cualquier frecuencia de muestreo, mono o estéreo. Deja un poco de silencio antes de hablar.
3. Guarda los archivos en `~/AmazonaVerse/_trabajo_claude/pitch/audio/vo_kelvin/`. Puedes reemplazar solo algunos bloques.
4. Ejecuta `bash tools/audio/generar_todo.sh --mezcla`.

`mezcla.py` remuestrea a 48 kHz, pasa a mono, aplica un paso alto de 70 Hz, nivela a -19 LUFS y alinea la primera sílaba con el inicio del bloque (lo probé con un WAV de 44.1 kHz estéreo con 0.3 s de silencio delante, y el resultado fue exacto). Cuando todos los bloques vienen de `vo_kelvin/`, `estado` lo indica. Si una toma dura más que su ventana, recórtala o pide al editor que mueva la imagen. Los SFX anclados a palabras (`"ancla"` en `tiempos.json`) usan las marcas del TTS, así que con otra voz conviene revisarlos o pasarlos a `"t"` absoluto.

**Con otra voz del sistema**, por ejemplo si se instala una voz es-PR en macOS: `python3.11 -I tools/audio/voz.py --voz "<Nombre>"` y luego `generar_todo.sh --mezcla`. El ritmo, las pausas y el encaje en las ventanas se recalculan solos. Antes de usarla, repite la prueba de pronunciación comparando grafías (ver la tabla de arriba).

## Música

Composición original en re mayor a 100 BPM, con el arco del guion. El tema de Vittata es una frase de cuatro compases en el cuatro (Bm-G-D-A) que vuelve en el cierre.

| Sección | Compases / s | Armonía | Qué suena |
|---|---|---|---|
| Gancho | c0-11 · 0-26.4 | silencio hasta c4; Bm G D A Bm G Asus4-A | Solo viento hasta 9.6. Después, impacto suave, pad, tema del cuatro solo y, en la segunda vuelta, güiro, seguidor y bajo. Termina con riser y requinto. |
| Mundo | c11-20 · 26.4-48.0 | D D G A7 D D G A7 D | Plena completa: seguidor, punteador, requinto, güiro largo-corto-corto, maracas, rasgueo del cuatro y bajo de tumbao. Corte en el tiempo 3 del último compás. |
| Aprender | c20-36 · 48.0-86.4 | G A F#m Bm G A D D Em A F#m Bm G A D Asus4-A | Arpegios de marimba, picado del cuatro en los contratiempos, cuá, bombo suave y contracanto en la segunda mitad. |
| Criadero | c36-41 · 86.4-98.4 | D Bm G A D | Celesta, pad cálido, latido de pandero y, con la eclosión (c38), florece el cuatro con trémolo. |
| Tecnología | c41-49 · 98.4-117.6 | Bm G D A ×2 | Baja la energía: pluck en semicorcheas, sub y hats que entran poco a poco. |
| Mercado | c49-59 · 117.6-141.6 | Bm G D A ×2, Em A | Plena electrónica: bombo a negras, palmas, panderos, sub en tresillo, riff del tema y bombeo de sidechain. Termina con redoble y riser. |
| Cierre | c59-69 · 141.6-165.6 | G A Bm D/F# G · G A · D D D | Tema emotivo con trémolo. Corta en seco en 152.4 y queda en silencio absoluto hasta 153.6. Vuelve con el despegue (banda completa, cuatro y flauta). Golpe de logo en 158.4 y última frase del tema hasta el silencio. |

Cómo evito el sonido de 8 bits barato:
- Osciladores limitados en banda: tablas de ondas con armónicos por debajo de 19 kHz.
- Cuerdas físicas (Karplus-Strong con filtro de lazo y retardo fraccional) y percusión modal y granular.
- Humanización de tiempo y dinámica.
- Reverb de sala y de hall por convolución.
- EQ por grupo, con un hueco en 2.6-2.8 kHz para la voz.
- Mezcla en float64, sin recortes en ninguna etapa.

## Efectos de sonido (`sfx/`)

- **Coquí:** `coqui_1` y `coqui_2`. Son dos ranas: un "co" casi constante en ~1.1 kHz de 0.1 s, un hueco de 75 ms y un "quí" que sube de 1.88 a 2.28 kHz. `coqui_coro` son 26 ranas a distintas distancias.
- **Aleteo:** `aleteo_despegue`, `aleteo_bandada`, `aleteo_vuelo` y `aleteo_corto`. Combinan empuje de aire, revoloteo de plumas y golpe grave, entre 5 y 7.5 aletazos por segundo. `aterrizaje` son aletazos de frenado, un golpe en la rama y hojas; el apoyo cae a 0.40 s del archivo.
- **Agua:** `rio`, `chapoteo`, `burbujas_buceo` (bajo el agua, con paso bajo) y `gotas_lluvia`. Usan burbujas de Minnaert, es decir, senos amortiguados que suben de tono.
- **Crecimiento:** `pop_bebe`, `pop_juvenil` y `pop_adulta` (91.2, 92.4 y 93.6) suben de tono en cada etapa. `huevo_crack` y `huevo_pop` (crack, pop, destellos y un pichón que pía) quedan en la biblioteca: la imagen v1 del criadero no tiene huevo.
- **UI:** `ui_click`, `ui_tick`, `ui_confirmar`, `ui_logro`, `ui_premio`, `ui_encaje`, `ui_whoosh`, `whoosh_transicion` y `corte_golpe`. Son de madera, marimba y celesta, para que la paleta sea tropical. `teclado` queda en la biblioteca: en la imagen hay un clic en "Jugar" a 100.4, no tecleo.
- **Viento:** `viento_bosque` (ráfagas con banda móvil y hojas granulares) y `rafaga_huracan`.
- **Voces del juego:** `juego_lectura_en` (Samantha en_US, "Water rises as vapor.", con sonido de altavoz de tableta) suena en 85.56, tras el clic en "Listen". `vittata_wepa` ("¡Wepa!", TTS de personaje) va en 26.0, durante el diálogo y en el hueco entre B02 y B03.

Los tiempos de imagen (despegue 5.1, percha 21.9, buceo 39.25, clics, ropero, salto final 153.75…) son los que midió el editor en la captura de la v1.

## Mezcla

- **Ducking:** se activa con la voz, y también con la lectura en inglés y el "¡Wepa!".
  - La música baja 9 dB de banda ancha y 4 dB más en 600-4500 Hz. La banda se separa con una división complementaria cuya suma es exacta.
  - Ataque de 80 ms, retención de 250 ms y liberación de 450 ms.
  - Los SFX bajan 3 dB.
- **Música y SFX:** la música entra a +1 dB respecto a su archivo, así que sube en los huecos de la voz. A los dos se les aplica un paso alto de 25 Hz y un paso bajo de 18 kHz. Son filtros causales, sin pre-eco en los silencios.
- **Master:** ganancia iterativa hasta -14.0 LUFS y limitador true-peak con lookahead de 2 ms y techo de -1.2 dBTP.

## Validación (sin escuchar)

`analisis.py` mide en cada WAV lo siguiente:
- Pico, true peak 4x, RMS, LUFS integrada, LUFS corta máxima y LRA.
- DC y muestras recortadas.
- Bordes del archivo.
- Bandas de octava, centroide y energía por debajo de 20 Hz y por encima de 19 kHz.
- **Clics:** busca picos aislados de la segunda derivada, de más de 12 veces el RMS local en 20 ms y por encima de -50 dBFS.

Con `--secciones` mide además el loudness por sección y el silencio de los huecos. Resultados de esta versión:

| Medida | pitch_mix.wav |
|---|---|
| Duración / formato | 165.600 s · 48 kHz · estéreo · 24 bit |
| Loudness integrada | -14.0 LUFS |
| True peak | -1.2 dBTP (sin muestras recortadas) |
| Limitador | actúa en el 1.0 % del tiempo, con 1.6 dB como máximo |
| Voz sobre música (K-weighted, por bloque) | entre 10.7 dB (B09) y 15.3 dB; 27.6 dB en B01, sin música |
| Silencio de la música | -240 dB (cero digital) en 0-9.6 y en 152.4-153.6 (stem de música ya mezclado) |
| Clics | 0 en pitch_mix, en los tres stems, en la música y en los 12 bloques de voz. En la biblioteca solo se marcan transitorios intencionados (`huevo_crack`, `huevo_pop`, `teclado`), que no se usan en la v1 |
| DC / energía < 20 Hz / > 19 kHz | 0.0000 / -58 dB / -46 dB |

Las cifras exactas de cada archivo están en `pitch/audio/analisis/`.
