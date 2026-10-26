# UI_SYSTEM · Amazona Verse

Sistema de interfaz reutilizable para los juegos de la empresa. Archivos: `src/ui/tokens.css` (marca), `src/ui/ui.css` (componentes y pantallas), `src/ui/ui.js` (efectos de presentación, opcional).

## Principios
- **Vidrio y papel.** El HUD es vidrio oscuro sobre el mundo 3D; lo que se lee con calma (tarjetas, diálogo, diario) es papel con tinta.
- **Caramelo táctil.** Botones gruesos con "labio" 3D, de 48 px (nunca menos de 44).
- **Sin JS si se puede.** Portada (`<dialog open>` + `form method="dialog"`), pausa (`popover`), libreta del Diario (`:has()`), barra de pasos (CSS).

## Tokens (`tokens.css`)
Un fork cambia la marca solo aquí: paleta cruda (`--night`, `--leaf`, `--beak`, `--crest`, `--paper`, `--parchment`, `--ink`…) → tokens semánticos que usa `ui.css`.

| Grupo | Tokens |
|---|---|
| Color | `--c-bg`, `--c-surface(-solid/-raised)`, `--c-text(-muted)`, `--c-eyebrow`, `--c-primary/-ink/-lip`, `success`, `info`, `magic`, `danger`, `--c-paper`, `--c-ink(-muted)`, `--c-focus`, `--c-scrim` |
| Tipo | `--font-display` Fredoka (títulos, botones), `--font-body` Atkinson Hyperlegible; `--fs-xs` 12 → `--fs-3xl` 40; cuerpo 16, diálogo 18 |
| Espacio | base 4: `--sp-1` 4 … `--sp-10` 40 |
| Radios | `--r-xs` 6, `sm` 10, `md` 14, `lg` 20, `xl` 28, `pill` |
| Tamaño | `--tap` 48, `--tap-lg` 68, `--tap-xl` 92, `--stick` 136 |
| Movimiento | `--dur-1/2/3` 120/220/420 ms, `--ease-out`, `--ease-pop` |
| Capas | `--z-hud` 5 … `--z-title` 40 |

Contraste AA comprobado en 22 pares de texto e iconos; el peor, 5:1 (texto sobre píldora translúcida con cielo blanco detrás).

## Componentes
- **Botón** `.btn` (primario naranja) + `ghost`, `secondary`, `success`, `info`, `magic`, `danger`; tamaños `sm`, `xl`, `round`, `icon`, `tile`. Se tiñe con `--btn-bg/-ink/-lip`.
- **Panel** `.panel`: vidrio. **Papel** `.paper`: tinta oscura y foco azul.
- **Diálogo** `#dialog`: retrato circular que sobresale, nombre en pestaña, texto 18 px y `Seguir ▶`.
- **Chip** `.chip[aria-pressed]`: pastilla de 44 px.
- **Toast** `#toast`: informativo (vidrio); **logro** si trae `<b>` (dorado, estrella y brillo); **instrucción** si trae un botón.
- **Barra de progreso** `.progress` con `--value` (0–1); variante segmentada en `#steps`.
- **Tecla** `kbd`.

## Iconos
SVG inline de 24×24, trazo 2.4 redondeado, catalogados al final de `ui.css` como `--i-nombre` (data-URI). Uso: `data-icon="book"`. Se pinta en `::before` con `mask` y `currentColor`, así sobrevive cuando el JS reescribe `textContent`. Tamaño: `--icon-size`. Sobre un círculo de color se usa como `background` (glifo negro).

## Movimiento
Entradas: `pop-in`, `rise-in`, `toast-in`, `badge-pop`. Ambiente: `bob`, `sway`, `drift`, `twinkle`. Atención: `ring` (Jugar) y `seg-pulse` (paso actual). UI 2026 (ficha 26-H, sección 9 de `ui.css`): `bar-shine` (brillo que recorre las barras y el segmento actual, `--dur-shine`), `spark-up` (destello dorado del contador del inventario al cambiar, en `::after` sin texto), icono de todos los avisos con `badge-pop`, paneles con borde de 2 px y filo de luz (`--r-panel`, `--c-highlight`) y botones con sombra de su color (`--btn-glow`, `--glow-k`). No cambian colores de texto. Fuentes autoalojadas con su licencia en `assets/vendor/fonts/OFL.txt`. Cada animación define solo su `from`; con `prefers-reduced-motion: reduce` se apagan y queda el estado de reposo.

## Estados
`:hover` brillo +7 %; `:active` hunde el labio; `:focus-visible` anillo amarillo de 4 px con halo oscuro (azul sobre papel); `[aria-pressed=true]` dorado con ✓; `.locked`/`:disabled` gris con candado. Con diálogo o tarjeta abiertos se apartan los controles táctiles.

## Cambios de UI que requieren JS
1. **Hecho.** `src/ui/ui.js` enlazado con `defer`: máquina de escribir (un toque en la caja del diálogo completa la frase), Esc/P abre la pausa y rebote de contadores.
2. **Hecho.** Pausa real en `src/engine/pausa.js`: con `#pause`, la portada `#title` o `G.pausa.set(motivo, true)` (Modo Maestro) el mundo se congela (dt = 0) y `input.js` ignora las acciones. La barra de pasos usa `--n`/`--n-label` desde `misiones.renderQuest()`.
3. **Movimiento reducido en el juego:** `shake()`, `hitStop()` y partículas deben respetar `prefers-reduced-motion`.
4. **Logro de ropa:** `grant()` usa `toast()`; con `toastHTML('<b>¡Ropa nueva!</b> …')` toma el estilo de logro.
5. **Foco:** llevarlo a la tarjeta al abrirla y devolverlo al cerrar.
6. **Ids duplicados:** `c-close` está en la tarjeta de terreno y en el cómic; funciona porque `#card` va antes en el DOM. Renombrar el de la plantilla.
7. **Botón Acción:** icono según el verbo (`data-icon`).
8. **Diario:** filtros Fauna/Cultura y `.progress`.
9. **Pruebas automáticas:** cerrar la portada con `document.getElementById('title').close()`.

## Aula (src/ui/aula.css, la carga src/game/aula.js)
Tarjetas de la lección en `#card` (`.edu`: cabecera con retrato, opciones `.edu-opt` con estados `bad`/`ok`/`brilla`, `.edu-retro` pista/ok/así es, secuencias `.edu-seq`, cadena `.edu-cadena`, "Predije y vi" `.edu-cmp`, puntos de avance `.edu-dots` sin puntaje), sección **Aula** en la pausa (chips ES/EN, texto corto, voz), enlace discreto **Docentes** al pie y panel **Modo Maestro** (`#maestro`, papel, pestañas). Capturas: `docs/img/edu_*.png`.

## Revisión v21 (375×812, 700/768 y 1366×768)
1. **P1 · Etiqueta del compañero ilegible:** el texto mide 6–7 px a la distancia de juego. En `src/engine/actores.js` (gameplay): `sizeAttenuation: false` en el SpriteMaterial, escalarla cada cuadro a 36 px de alto (`k = 2 / (alto del lienzo × camera.projectionMatrix.elements[5])`) y usar `tex.repeat`/`offset` para no deformar el texto.
2. **P1 · Con «Nido», los 4 botones de `#sys` pisan el objetivo entre 561 y 760 px** (a 700 px se montan 54 px). En `ui.css`: `@media (max-width: 760px) { .hud-btn { width: var(--tap); padding: 0; font-size: 0; } }`.
3. **P2 · Criadero (`criadero.css`):** los chips de postura miden 36 px (pasar a `min-height: var(--tap-sm)`); los textos de cápsulas y etapas son de 10–11 px (pasar a `var(--fs-xs)`); el aviso «¡Ñam!» tapa el nido (mejor un globo de papel sobre la cría).
4. **P2 · El icono «Nido» es relleno y el resto del catálogo es de trazo 2.4:** hay una propuesta de trazo (huevo + nido tejido). «¡X creció!» debería ir con `toastHTML` y `<b>` para tomar el estilo de logro.
5. **P3 · Objetivo desplegado en el móvil:** la barra queda pegada al eyebrow (`#quest.abierto #steps { margin-top: 6px }`) y «Seguridad del refugio: —» confunde (mejor «por descubrir»). El aviso de pérdida de WebGL ya usa los tokens: está bien.

