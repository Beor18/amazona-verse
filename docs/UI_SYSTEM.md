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
Entradas: `pop-in`, `rise-in`, `toast-in`, `badge-pop`. Ambiente: `bob`, `sway`, `drift`, `twinkle`. Atención: `ring` (Jugar) y `seg-pulse` (paso actual). Cada animación define solo su `from`; con `prefers-reduced-motion: reduce` se apagan y queda el estado de reposo.

## Estados
`:hover` brillo +7 %; `:active` hunde el labio; `:focus-visible` anillo amarillo de 4 px con halo oscuro (azul sobre papel); `[aria-pressed=true]` dorado con ✓; `.locked`/`:disabled` gris con candado. Con diálogo o tarjeta abiertos se apartan los controles táctiles.

## Cambios de UI que requieren JS
1. **Enlazar** `<script src="src/ui/ui.js" defer></script>`: máquina de escribir, Esc/P abre la pausa y rebote de contadores. Probado inyectándolo (selfTest 45/45; `#d-text` conserva el texto completo).
2. **Pausa real:** congelar el bucle con `#pause` abierto (evento `toggle`) y con la portada `#title` abierta.
3. **Movimiento reducido en el juego:** `shake()`, `hitStop()` y partículas deben respetar `prefers-reduced-motion`.
4. **Logro de ropa:** `grant()` usa `toast()`; con `toastHTML('<b>¡Ropa nueva!</b> …')` toma el estilo de logro.
5. **Foco:** llevarlo a la tarjeta al abrirla y devolverlo al cerrar.
6. **Ids duplicados:** `c-close` está en la tarjeta de terreno y en el cómic; funciona porque `#card` va antes en el DOM. Renombrar el de la plantilla.
7. **Botón Acción:** icono según el verbo (`data-icon`).
8. **Diario:** filtros Fauna/Cultura y `.progress`.
9. **Pruebas automáticas:** cerrar la portada con `document.getElementById('title').close()`.
