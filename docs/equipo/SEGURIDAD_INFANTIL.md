# SEGURIDAD_INFANTIL · Amazona Verse · 24 oct 2026

Revisión de `src/`, `content/` e `index.html`. Borrador para el abogado de COPPA; no es asesoría legal.

**Resumen:** sin cuentas, anuncios, chat, analítica ni compras; todo queda en el dispositivo. Pero el producto promete más de lo que cumple: el niño escribe texto libre y la página llama a terceros.

## 1. Checklist COPPA/FERPA

| # | Control | Estado | Evidencia |
|---|---|---|---|
| 1 | Sin cuentas, anuncios ni envío de datos | Cumple | Único POST: pruebas, mismo origen (`content/cap1/pruebas.js:106`) |
| 2 | Sin terceros que reciban la IP | Riesgo | Google Fonts `index.html:7-8`; cdnjs/jsDelivr `index.html:264-266`, `src/engine/renderer.js:240`; sin `integrity` |
| 3 | Sin texto libre del niño | Riesgo | Nombre `index.html:246`, `src/game/creador.js:21`; título y viñetas `index.html:203`, `src/game/comic.js:146` |
| 4 | Declaraciones de privacidad exactas | Riesgo | `content/cap1/lecciones.js:522-524` dice "sin texto libre" y "sin terceros"; va dentro del JSON (`src/game/aula.js:380`) |
| 5 | Sin voz, cámara, ubicación ni fotos | Cumple | Sin `getUserMedia` ni `geolocation`; el cómic captura la escena 3D |
| 6 | Sin chat ni contenido visible a otros | Cumple | No hay red ni multijugador |
| 7 | Sin enlaces externos para el niño | Cumple | Las URL salen como texto en Modo Maestro (`src/game/aula.js:498`, `src/game/criadero.js:1217`) |
| 8 | Puerta de adulto | Riesgo | Una suma de 2 cifras (`src/game/aula.js:183-184`) |
| 9 | Reporte sin datos personales | Cumple | Estación, fecha y grado (`src/game/aula.js:334`); CSV sin fórmulas (`:352`) |
| 10 | Estación sin nombres (FERPA) | Riesgo | Texto libre (`src/game/aula.js:480`) que pasa al nombre del archivo (`:386`) |
| 11 | Retención y borrado | Riesgo | Borrar existe (`src/game/aula.js:405`, `src/game/criadero.js:1236`, `src/engine/guardado.js:77`); falta política escrita |
| 12 | Política de privacidad publicada | Falta | — |
| 13 | Programa de seguridad escrito (COPPA 2025) | Falta | — |
| 14 | Autorización escolar y DPA | Falta | — |
| 15 | Host apto para niños | Riesgo | claude.ai: verificar edad mínima, registros y si exige sesión |
| 16 | Sin presión: azar, compras, rachas ni tiempos | Cumple | `content/comun/huevos.js:6`, `src/game/criadero.js:4-5` |
| 17 | Voz en el dispositivo | Riesgo bajo | Si no hay voz local, usa una en línea (`src/game/aula.js:87`) |

## 2. Riesgos priorizados

**Altos**
1. **Declaraciones falsas (#4).** La FTC puede tratarlo como engaño. Alinear texto y código.
2. **Texto libre (#3).** El niño puede escribir su nombre o su escuela; queda en `localStorage` y sale en el PNG/PDF del cómic (`content/cap1/pack.js:99`). Usar listas de nombres y frases.
3. **Terceros sin SRI (#2).** Google y las CDN ven la IP de cada niño; una CDN comprometida ejecutaría código. Servir three.js y las fuentes desde el paquete.
4. **Host (#15).** Confirmarlo antes del piloto.

**Medios**
5. Un niño de 3.º resuelve la puerta (#8) y puede borrar el reporte o adelantar la cría.
6. Estación (#10): usar un selector numérico.
7. En equipos compartidos, el siguiente estudiante ve el nombre y el cómic del anterior. Falta "Nuevo estudiante".
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
- El navegador descarga el motor 3D y las letras de servidores de terceros, que ven la dirección de internet del equipo. *[Quitar al servirlas desde el paquete.]*
- El maestro puede descargar un reporte con estación, fecha, grado y respuestas, sin nombres. Si la escuela añade nombres, el archivo pasa a ser un registro escolar (FERPA) bajo su control.
- Para borrar: Modo Maestro → "Borrar progreso"; Pausa → "Reiniciar". Borrar los datos del navegador lo elimina todo.
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
