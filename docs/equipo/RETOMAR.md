# Cómo retomar Amazona Verse desde cualquier sesión (web o Mac)

Actualizado: 28-oct-2026, por la sesión coordinadora de Claude en la web (claude.ai/code).

**28-oct: Kelvin pasó el control a la sesión coordinadora de la web.** Desde aquí se revisa lo de Grok, se capturan las vistas en vivo y se dejan los pedidos. El build ya corre en la nube (comprobado: 6f45cda en 24 s) y las 13 baterías se están probando ahí, con `AV_PYTHON` = el python3 del contenedor y `AV_CHROME` = un envoltorio del Chromium de Playwright, que cambia `--use-angle=metal` por SwiftShader. Sin GPU, cada captura tarda unos 15 minutos. La Mac (supervisor) puede seguir uniendo y publicando; si las dos publican, gana el último push y nadie hace `--force`.

## Quién hace qué
- **Grok (Cursor)** hace todo el trabajo pendiente: la API ya no se usa (queda poco crédito). Sus pedidos están en `docs/equipo/PEDIDOS.md` (el último manda).
- **La sesión coordinadora de Claude** une el trabajo de Grok, revisa la calidad visual (en vivo, contra las referencias de Kelvin) y publica.
- **Kelvin** decide el canon, el dinero y aprueba todo lo visual.

## Dónde está cada cosa
| Qué | Dónde |
|---|---|
| Tablero y tareas | `docs/equipo/TRABAJO_SIMULTANEO.md` (Grok), `docs/equipo/TAREAS_API.md` (historial de la API) |
| Pedidos entre agentes | `docs/equipo/PEDIDOS.md` |
| Bugs | `docs/equipo/BUGS.md` (QA-53 sigue abierto) |
| Plan del mapa | `docs/equipo/MAPA_PLAN_COMPLETO.md`; vistas de captura en `tools/build/mapa_vistas.json` (la buena de la ciudad es `ciudad_tepuy`) |
| Metas visuales de Kelvin | `docs/img/ciudad_tepuy_meta_kelvin.jpg` (la gran ciudad), `docs/img/mapa_audit_original_2022.jpg` (todo el mapa), `docs/img/referencia_manga_toon.webp` (cómic, en pausa) |
| Historia | `docs/equipo/TEMPORADA1_HILO.md` (39 decisiones [KELVIN] pendientes al final) |
| Estándar visual | `docs/equipo/ESTANDAR_VISUAL.md` |
| Trabajo a medias del último reinicio | `refs/respaldo/20261027-2108` en GitHub (`git fetch origin 'refs/respaldo/*:refs/respaldo/*'`) |

## Pendiente para el lanzamiento, en orden
1. **La gran ciudad del tepuy como la imagen de Kelvin** (Grok, G18): blanca y crema, con cúpulas, sin torres raras.
2. **La selva sobre el tepuy alrededor de la ciudad** (Grok, G19 = BL1).
3. **QA-53:** la pantalla se congela en el móvil al pulsar «Empezar».
4. **Las aldeas con tejados rojos** legibles desde el aire (F2.2) y el `_hd` a más distancia (F2.1).
5. Revisar en vivo **Amazona Flight** (BK1: Vittata de 3/4 + los árboles de la primera versión) y enseñárselo a Kelvin.
6. Las **39 decisiones de canon** de Kelvin.
7. **QA final** en teléfonos reales.

**En pausa por orden de Kelvin:** el cómic Manga Toon (no gastar más ahí) y los minijuegos nuevos.

## Cómo se publica
- `tools/build/build.sh HEAD <carpeta>`, luego `tools/build/test.sh <carpeta>/ --extra` y luego `tools/build/sitio.sh <carpeta>/site`.
- Haz commit de `sitio/` con un índice temporal y push a `main`. Vercel publica amazonaverse.com en 1–2 minutos.
- Solo publica si las pruebas obligatorias están en verde.
- En la Mac de Kelvin esto lo hacen solos `~/AmazonaVerse/_herramientas/coordinacion/supervisor.sh`, `publicar.sh` y `unir_grok.sh`.

## Reglas que no cambian
Las de `AGENTS.md`:
- una sola rama, `main`;
- commits con índice temporal y solo de tus archivos;
- nada en segundo plano sin esperar el resultado;
- nunca detener el trabajo de otro;
- nada visual se da por hecho sin que Kelvin lo vea;
- todas las edades, sin violencia, chat ni compras.
