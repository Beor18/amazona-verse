# SEGURIDAD_INFANTIL · Amazona Verse · 24 oct 2026 (§5 añadida el 2-nov)

Los puntos 1 a 4 de arriba son de la revisión del 24-oct y no se han vuelto a revisar; el ranking en línea (§5) es posterior y describe el código de hoy.

Revisión de `src/`, `content/` e `index.html` (estados al día con 48524f5). Borrador para el abogado de COPPA; no es asesoría legal.

**Resumen:** sin cuentas, anuncios, chat, analítica ni compras; todo queda en el dispositivo. Pero el producto promete más de lo que cumple: el niño escribe texto libre y la página aún llama a Google Fonts.

## 1. Checklist COPPA/FERPA

| # | Control | Estado | Evidencia |
|---|---|---|---|
| 1 | Sin cuentas, anuncios ni envío de datos | Cumple con una excepción: el ranking en línea, opcional (§5, desde cb4df02, 26-oct) | Sin el ranking, único POST: pruebas, mismo origen (`content/cap1/pruebas.js:106`) |
| 2 | Sin terceros que reciban la IP | Riesgo | Solo Google Fonts (`index.html:7-8`); three r128 local desde 48524f5 (`index.html:264-266`); jsDelivr solo si falta la copia local (`src/engine/renderer.js:253`) |
| 3 | Sin texto libre del niño | Riesgo (filtrado en 647ebfd; faltan listas) | Nombre `index.html:246`, `src/game/creador.js:21`; título y viñetas `index.html:203`, `src/game/comic.js:146` |
| 4 | Declaraciones de privacidad exactas | Riesgo bajo (reporte corregido en 647ebfd; falta `lecciones.js`) | `content/cap1/lecciones.js:522-524` dice "sin texto libre" y "sin terceros"; va dentro del JSON (`src/game/aula.js:380`) |
| 5 | Sin voz, cámara, ubicación ni fotos | Cumple | Sin `getUserMedia` ni `geolocation`; el cómic captura la escena 3D |
| 6 | Sin chat ni contenido visible a otros | Cumple en chat; el ranking muestra un apodo de lista fija a otros jugadores (§5) | No hay chat ni multijugador |
| 7 | Sin enlaces externos para el niño | Cumple | Las URL salen como texto en Modo Maestro (`src/game/aula.js:498`, `src/game/criadero.js:1217`) |
| 8 | Puerta de adulto | Cumple (647ebfd: pulsación larga y multiplicación) | Una suma de 2 cifras (`src/game/aula.js:183-184`) |
| 9 | Reporte sin datos personales | Cumple | Estación, fecha y grado (`src/game/aula.js:334`); CSV sin fórmulas (`:352`) |
| 10 | Estación sin nombres (FERPA) | Cumple (647ebfd: lista 1-40) | Texto libre (`src/game/aula.js:480`) que pasa al nombre del archivo (`:386`) |
| 11 | Retención y borrado | Riesgo | Borrar existe (`src/game/aula.js:405`, `src/game/criadero.js:1236`, `src/engine/guardado.js:77`); falta política escrita |
| 12 | Política de privacidad publicada | Falta | — |
| 13 | Programa de seguridad escrito (COPPA 2025) | Falta | — |
| 14 | Autorización escolar y DPA | Falta | — |
| 15 | Host apto para niños | Riesgo | claude.ai: verificar edad mínima, registros y si exige sesión |
| 16 | Sin presión: azar, compras, rachas ni tiempos | Cumple | `content/comun/huevos.js:6`, `src/game/criadero.js:4-5` |
| 17 | Voz en el dispositivo | Cumple (647ebfd: solo voces locales) | Si no hay voz local, usa una en línea (`src/game/aula.js:87`) |

## 2. Riesgos priorizados

**Altos**
1. **Declaraciones falsas (#4).** La FTC puede tratarlo como engaño. Alinear texto y código.
2. **Texto libre (#3).** El niño puede escribir su nombre o su escuela; queda en `localStorage` y sale en el PNG/PDF del cómic (`content/cap1/pack.js:99`). Usar listas de nombres y frases.
3. **Google Fonts (#2).** Google ve la IP de cada niño. three.js ya es local (48524f5); servir las fuentes desde el paquete requiere aprobación de Kelvin.
4. **Host (#15).** Confirmarlo antes del piloto.

**Medios**
5. Un niño de 3.º resuelve la puerta (#8) y puede borrar el reporte o adelantar la cría.
6. Estación (#10): usar un selector numérico.
7. En equipos compartidos, el siguiente estudiante ve el nombre y el cómic del anterior. "Nuevo estudiante" ya existe (647ebfd); falta que el criadero borre lo suyo.
8. Accesibilidad parcial: hay teclado, táctil, `prefers-reduced-motion` (`src/engine/camara.js:76`), voz, texto corto, Atkinson Hyperlegible y `aria-live`. Falta lo del GDD §9 (movimiento reducido dentro del juego, remapeo, tamaño de texto, modo relajado) y auditar contraste.

**Bajos**
9. **Criadero.** Nada baja con el tiempo, enferma ni muere; no hay azar. Ajustes:
   - Dormir usa cara triste (`src/game/criadero.js:909`).
   - El niño ve botones de XP de prototipo (`:295-299`).
   - Liberar no pide confirmación final (`:1190`) y es requisito de la cápsula "legendaria" (`content/comun/huevos.js:164`).
   - Raro, épico y legendario (`:171-175`) suenan a cajas de botín.
10. **Contenido.** María y la crecida se cuentan con datos y esperanza (`content/cap1/lecciones.js:315`). Falta una nota de trauma en la guía.
11. **Pruebas en producción:** `window.AV` (`src/boot.js:27`).

## 3. Política mínima (borrador para revisión legal)

**Amazona Verse: tu privacidad, en simple**
- No pedimos nombre, correo, fotos, voz ni ubicación. No hay cuentas, anuncios, chat ni compras.
- El progreso se guarda solo en este equipo; no lo recibimos.
- El navegador descarga las letras desde Google Fonts, que ve la dirección de internet del equipo. *[Quitar al servirlas desde el paquete.]*
- El maestro puede descargar un reporte con estación, fecha, grado y respuestas, sin nombres. Si la escuela añade nombres, el archivo pasa a ser un registro escolar (FERPA) bajo su control.
- Para borrar: la partida y el cómic solo se borran si el jugador lo elige: Pausa → «Comenzar de cero» (o «Comenzar de cero» en el panel final), que pregunta «¿Comenzar de cero? Se borrará tu partida y tu cómic.» con «No, volver» y «Sí, comenzar de cero». En un equipo compartido, Modo Maestro → «Nuevo estudiante: comenzar de cero» (la misma pregunta, dos toques; borra partida, cómic, nido, récords y copias de rescate) y «Borrar progreso» (solo el reporte del aula). Una partida guardada que no se puede leer no se borra: se aparta en hasta 3 copias de rescate con fecha en este equipo, y «Nuevo estudiante» las elimina. Borrar los datos del navegador lo elimina todo.
- Pedimos a los niños no escribir su nombre real.
- Si algún día recogemos datos, antes pediremos permiso a la escuela o la familia.
- Contacto: *[correo del responsable]*.

## 4. Antes de un piloto en escuela
1. Cerrar los riesgos altos 1 a 3 y decidir el host.
2. QA confirma en la pestaña Red cero peticiones a otros dominios.
3. Puerta de adulto más fuerte y botón "Nuevo estudiante".
4. El abogado revisa política, retención, programa de seguridad y autorización escolar.
5. DPA con la escuela; revisar reglas del DEPR y estatales (p. ej., SOPIPA en California, Ed Law 2-d en Nueva York).
6. Hoja para familias con la política y opción de no participar.
7. Nota de trauma sobre María en la guía.
8. Auditoría WCAG 2.1 AA de menús y paneles.

## 5. Ranking en línea (descripción del código al 2-nov, sin decisiones)

Existe un ranking global opcional para los retos. Entró en `cb4df02` (26-oct, Kelvin). Esto describe lo que hace hoy; **no decide nada**. La decisión (puerta de adulto, apagarlo para el piloto, quitar el id o dejarlo) está en `docs/equipo/PENDIENTES_KELVIN.md` §0, punto 3.

**Dónde está.** Cliente: `src/game/records.js` (`publicarRanking`, panel `#rec-rank`), llamado desde `src/game/retos.js` y `src/game/flight.js`. Servidor: función `amazona-records` de Supabase en el proyecto `muxxdjyxwjxaoziczkcz`, código en `tools/supabase/amazona-records/index.ts`, notas en `tools/supabase/README.md`. El host está permitido como conexión en `tools/build/config.json`.

**Cuándo sale.** Solo si el jugador toca «Publicar en el ranking» en la pantalla de resultados, y el botón aparece solo cuando la partida es su mejor marca. Es opcional: si no lo toca, no se envía nada. En el panel hay «Ahora no». Las partidas de prueba nunca publican.

**Qué retos.** carrera, río, tormenta, banquete, flight, river rush y tren (`RANK_RETOS`).

**Qué envía** (POST con JSON a `https://muxxdjyxwjxaoziczkcz.supabase.co/functions/v1/amazona-records`):
- `reto`: cuál de los retos de arriba.
- `valor`: la marca (tiempo en ms o puntos).
- `dur_ms`: cuánto duró la partida, para validar que la marca es verosímil.
- `alias`: apodo «Animal Adjetivo NN».
- `dispositivo`: un id aleatorio de 32 caracteres hexadecimales, creado en este dispositivo y guardado en `localStorage` (`<almacen>.rankdisp`).

**No envía** el nombre del personaje, ni texto libre, ni correo, ni la partida, ni el cómic. El navegador del niño sí hace la petición, así que el servidor ve su IP en la conexión.

**Nombres y filtro.** No hay texto libre. El niño elige apodo con tres selectores: un animal de 10 (Cotorra, Coquí, Guaraguao, Colibrí, Iguaca, Tinglar, Manatí, Reinita, Múcaro, Lagartijo), una cualidad de 10 (Veloz, Valiente, Curioso, Brillante, Alegre, Audaz, Sabio, Feliz, Ágil, Sereno) y un número de 1 a 99, o «Otro al azar». El apodo se recuerda en `localStorage` (`<almacen>.rankalias`). El servidor repite la comprobación con una expresión regular: rechaza cualquier alias fuera de esas listas.

**Qué guarda el servidor** (tabla `amazona.records`, con RLS y sin políticas: no se lee por la API REST): reto, valor, duración, alias, y el id de dispositivo y la IP como hash SHA-256 con sal. No guarda el id ni la IP en claro. Antitrampas: límites de verosimilitud por reto, 20 envíos por hora por dispositivo y 60 por IP, y un puesto por dispositivo en el top. Una marca se oculta a mano con `oculto = true`.

**Qué devuelve y muestra.** El puesto y las tres primeras marcas (apodo y marca); el panel enlaza a `https://amazonaverse.com/#top-records`. Un GET de la misma función devuelve el top público.

**Lo que NO hay hoy** (hechos, no propuestas): no hay puerta de adulto antes de publicar (a diferencia de «Compartir»); no hay política de privacidad publicada ni nota para familias que mencione el ranking; el texto de «Mis récords» (`TX.local` en `src/game/records.js`) dice «Todo se guarda solo en este dispositivo. No se envía nada a ningún servidor», lo cual ya no es exacto si se publica una marca (el comentario de cabecera del archivo también); no hay forma de que el niño borre su marca. La política mínima del §3 tampoco lo menciona. Qué hacer con esto lo decide Kelvin.
