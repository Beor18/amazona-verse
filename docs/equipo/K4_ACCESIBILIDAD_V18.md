# K4-10 · Accesibilidad de la UI de la V18

Revisión de solo lectura (Kimi 4a, 6-nov, ~14:30 UTC) del CSS y la UI dentro de `src/game/v18/*.js` frente a `src/game/accesibilidad.js` (blob `0f4d4ee3`) y `src/ui/ui.css` (sección 7b). Sin tocar código. Los cuatro archivos ocupados (minigolf, evolución, habilidades, combate) se revisaron solo como lectura; cualquier arreglo en ellos lo hace su agente.

Método: descarga de los 18 módulos por raw con verificación de SHA de blob, extracción de los 7 bloques de CSS embebido (amenaza, combate, duelo2, evolución, minigolf, puerto, descubrir) y del botón con estilo en línea de explorar; cálculo de ratios de contraste WCAG con la fórmula de luminancia relativa.

## Lo que está bien

- **Botones táctiles ≥ 44 px en todos los módulos:** amenaza (44), puerto (44×44), duelo2 (44), minigolf (52 y 60 en la elección de jugadores), explorar (44×44), evolución (`.btn` 44). Descubrir usa la tarjeta común (`showCard` + `.btn` de ui.css, ya cubierta por las pruebas).
- **Contraste normal suficiente:** peor caso razonable (chip semitransparente sobre cielo claro) da 8,5:1 para el texto principal, 6,7:1 para el secundario (`.vd-pod`, 12 px, opacidad .85) y 4,6:1 para el más débil (`.vd-et`, 10 px, opacidad .75). Supera AA (4,5:1) en todos los escenarios medidos; sobre fondos oscuros llega a 13:1.
- **Teclado:** los modos se juegan con teclado (hay `keydown` en amenaza, combate, duelo2, explorar, minigolf y puerto, y se quitan en `soltar()`), los botones son `<button>` nativos y ui.css tiene `:focus-visible` global (outline de 4 px).
- **Reducir movimiento:** la regla global de ui.css (`*, *::before, *::after { animation: none !important }` en `@media (prefers-reduced-motion: reduce)`) apaga también las animaciones de la V18 (la carta de evolución incluida).
- **Minigolf con texto además de color:** el turno se anuncia con texto («Turno: Jugador 1»), el jugador activo lleva subrayado y las medallas llevan texto; el color (COLORES, minigolf.js:79) es apoyo, no el único canal.
- **aria-pressed bien usado** en descubrir (selección de especie) y duelo2; los `aria-label` de las flechas del minigolf van por `TXT` (traducidos).

## Hallazgos (ids propuestos; el siguiente libre tras QA-181…185 de `K4_HALLAZGOS_V18.md`)

### QA-186 (Media) · Los HUD de la V18 ignoran los ajustes de accesibilidad
Ningún archivo de `src/game/v18/` usa `var(--fs-*)`, `G.accesibilidad` ni las clases `a11y-*` (búsqueda literal en los 18 módulos: 0 resultados), y ui.css (94 991 B) no tiene ningún selector `v18` (0 menciones). Consecuencia: un niño con «Texto: Muy grande» (×1,3) o con «Alto contraste» ve los paneles `#v18-amenaza`, `#v18-puerto`, `#v18-duelo`, `#v18-duelo2`, `#v18-golf`, `#v18-evo-carta` y el botón `#v18-exp-poder` exactamente igual: letra fija de 10 a 18 px y fondos semitransparentes. Además `accesibilidad.test()` no los cubre: su lista `PANTALLAS` (accesibilidad.js) no incluye ningún panel V18, así que nadie mediría un desborde o un contraste malo ahí.
**Propuesta:** en los CSS de módulo, cambiar los `font-size` fijos por `calc(Npx * var(--fs-k, 1))` (el token `--fs-k` ya existe: ui.css lo pone a 1,15/1,3 con `a11y-t1/t2`; con valor por defecto 1 no cambia nada si el ajuste está apagado). Añadir los 6 paneles a la maqueta de `accesibilidad.test()` para que entren en las medidas de desborde y contraste.

### QA-187 (Baja) · Texto de 10–12 px fijo, bajo el suelo de la interfaz
La interfaz general no baja de 13 px ni en los textos pequeños (ui.css: `calc(13px * var(--fs-k))` para `.diary li small`), pero la V18 sí:
- `duelo2.js:286` — `.vd-et` 10 px y `.vd-tc` 11 px (etiquetas de estado del duelo), con opacidad .75/.8.
- `duelo2.js:281` — `.vd-pod` 12 px, opacidad .85.
- `evolucion.js:230` — `.v18-evo-et` 10 px (etiquetas de la carta de evolución); `evolucion.js:229` — `.v18-evo-f` 12 px.
- `minigolf.js:638` — `.vg-et` 11 px; `minigolf.js:650` — `.vg-guia` 12 px, opacidad .85.
- `puerto.js:480` — `.vp-t` 13 px (justo en el suelo, pero sin escalar).
Para niños de 7 a 10 años, 10 px en una pantalla de teléfono es muy poco. **Propuesta:** subir el suelo de la V18 a 12–13 px y aplicar `var(--fs-k, 1)` (mismo arreglo que QA-186).

### QA-188 (Baja) · Vidas y aciertos solo como puntos de color
- `amenaza.js:265-268` (con el CSS de `amenaza.js:245`): las plumas (vidas) y las nubes (aciertos que faltan) son puntitos de 12 px, llenos `#ffd84a` o apagados `rgba(255,255,255,.22)`. La cuenta solo se lee por color/brillo del punto; no hay número ni texto (WCAG 1.4.1, uso del color).
- `duelo2.js:284`: las plumas gastadas del duelo solo bajan a `opacity:.18`.
Minigolf ya enseña el patrón correcto (texto + subrayado + color). **Propuesta:** añadir la cuenta en texto junto a los puntos («2/3»), o marcar los apagados con una forma (×). En duelo2, añadir además una trama o borde al estado gastado.

### QA-189 (Muy baja) · `aria-label` sin traducir en el botón Poder
`explorar.js:176`: `btn.setAttribute('aria-label', 'Poder')` queda fijo en español; con el juego en inglés el lector de pantalla dice «Poder». Los `aria-label` del minigolf (minigolf.js:669) sí van por `TXT`. **Propuesta:** pasar el texto por el `L()`/`TXT` del módulo.

## Notas

- Los fondos semitransparentes (`rgba(30,40,30,.72…82)`) rinden bien en contraste porque el texto es casi blanco, pero con «Alto contraste» activado el resto de la interfaz pasa a superficies opacas y estos paneles no (parte de QA-186).
- Los botones de amenaza, duelo2 y minigolf tienen `min-height:44px` pero no `min-width`; con etiquetas cortas cabría un botón estrecho. Hoy la etiqueta más corta («◀»/«▶» en minigolf) mide ≥44 px por el padding y el `font-size:18px`; solo queda como vigilancia si se añaden botones nuevos.
- Medidas de contraste hechas con la fórmula WCAG de luminancia relativa sobre tres escenarios de fondo (cielo claro, arena, bosque oscuro). Sin GPU: no se midieron píxeles reales del render; los escenarios cubren el rango razonable de fondos.
