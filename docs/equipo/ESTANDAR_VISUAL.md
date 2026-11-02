# Estándar visual (G16, carril BD)

Regla para todo capítulo: se ve el mismo juego que el capítulo 1 con el look de fábrica `vibrant_toon`. Una tormenta o la noche se permiten si usan cielo atmosférico (con `cenit`), la misma saturación y la misma calidad de post. Un fondo plano o una niebla de pocas decenas de metros no pasa.

`AV.lookCapitulosTest()` lee los packs y falla si alguno se sale. Está en las baterías obligatorias de `tools/build/config.json`: si falla, `test.sh` no pasa y no se publica.

## Día (capítulos 1, 2, 3, 4 y 6, mundo analítico y plantilla)

Lo declara el pack. Con `vibrant_toon` activo, el look pinta encima el cielo, la niebla y las luces de fábrica (exposición 0,76, cenit `#1e78e8`, niebla hasta 1500). Sin `cenit` ese look no tenía cielo atmosférico y el capítulo se veía de otro color.

| Campo | Valor |
|---|---|
| `exposicion` | 0,74 |
| `cielo` | `color #c3e2f0`, `cenit #2a7fd4`, `sol #fff1cf`, `niebla [40, 1000]`, `nieblaAltura [8, 70]` |
| `luces` | cielo `#cfe6ff`, suelo `#45602e`, hemi 0,66, sol `#fff0d6`, `solInt` 2,0, `solPos [-42, 70, 46]` |
| `post` | saturación 1,08, contraste 1,04, bloom 0,2, viñeta 0,16 |
| `mar` | laguna `#86e3cf`, somero `#1fa9ad`, hondo `#0b4f86` |
| río de plantilla | `agua.color #5fe3d6` (el mismo claro del río del capítulo 1) |
| copa | `#2f7d43` |

## Noche (capítulo 5)

`mundo.cielo.permiso: 'noche'`. Misma gradación y mismo toon que `vibrant_toon`. El cielo sigue siendo atmosférico. El terreno del relevo se queda plano: la línea de vista del puzzle mide la altura; una loma nueva la rompería. Hay árboles (`#2f7d43`) y mar de la misma familia.

| Campo | Valor |
|---|---|
| `exposicion` | 0,72 |
| `cielo` | horizonte `#6d84b0`, cenit `#24366e`, sol `#ffd7a8`, niebla `[48, 720]` |
| `luces` | cielo `#9eb6e4`, suelo `#3a4a32`, hemi 0,62, sol `#ffd0a0`, `solInt` 1,35 |
| `post` | saturación 1,08, contraste 1,04, bloom 0,2, viñeta 0,2 |
| `mar` | laguna `#3d8f96`, somero `#1a7a86`, hondo `#0b3a62` |

Esos números viven en `LOOKS.vibrant_toon.noche` (`src/game/look.js`). La prueba compara el pack con ellos.

## Tormenta (capítulo 2)

El cielo de partida es el del día. Durante la prueba de la casa el pack pide `G.look.pausarAmbiente(true)`, cierra el cielo atmosférico hacia gris y lo devuelve al calmar. El barrido del look no le pisa la niebla cada 90 cuadros.

## Qué no entra

Minijuegos, `web/`, edificios y el compile de shaders. F2.2 (tejados por aldea): Kelvin decidió el 28-oct que son rojos, como en el render de 2022, dentro de la paleta `vibrant_toon` (DECISION_LOG).

## Capturas

Arranque de cada capítulo, escritorio 1280×800 y móvil 375×812. `docs/img/bd1_lado_escritorio.jpg` pone el publicado anterior a la izquierda y este estándar a la derecha. El capítulo 1 sale en negro: es la apertura. Medidas en `docs/img/bd1_antes_medidas.json` y `docs/img/bd1_despues_medidas.json`. Antes, los capítulos 2 a 6 no tenían cielo atmosférico (niebla de 90 a 130 m). Después, el día llega a 1000 m y la noche del 5 a 720 m.
