# Traspaso del coordinador (25-oct-2026, 22:40)

Estado para retomar en una sesión nueva sin releer todo el historial. Las reglas están en `CLAUDE.md`; la meta, en `docs/equipo/VERSION_1.md`; el gasto, en `docs/equipo/REGISTRO_TAREAS.md`.

## Publicado en amazonaverse.com (último: a523c51, build b981244)
Capítulo 1 completo, con:
- las 5 mejoras de diversión;
- Retos: carrera, tormenta, contrarreloj del río, fantasma y modo relajado;
- Mis récords y compartir con puerta para adultos;
- pieles de las 22 especies, accesibilidad, música y ambiente, y la bandada;
- la ciudad en HD con el complejo de La Colina;
- controles en PC y botón Acción en móvil;
- la web con la sección «El equipo» (los nombres van solo en la web).

## En curso
- **Agentes de Claude:** ciudad (ronda 2: edificios que Kelvin no ve, CityBuilder, la ciudad tipo Asgard, aldeas, La Colina), renombre de Luma a Iguaca, Banquete con comer del árbol (Fable), minimapa (P0) y cronómetro y puntuación del capítulo.
- **API** (en dos ventanas de Terminal de Kelvin): carriles G, H y L, y N, O, P y Q (Opus).
  - Topes en `tools/agente_api/limites.json`: 184 USD en total y 150 por día. Los créditos vencen el 29-oct.

## Reglas de esta ronda
- **Publicar:** aprobado por Kelvin cada versión que pase **todas** las baterías (`test.sh --extra`).
  - Flujo: `build.sh HEAD tools/build/salida/pub-<sha>`, después `test.sh`, después `sitio.sh <build>/site`, commit de `sitio/` con un índice temporal y `git push`.
- **Ramas:** una sola, `main`. Antes de publicar, comprobar que Fernando (Beor18) no tenga ramas ni PR.
- **Tope semanal del plan Max: 75 %** (iba por el 54 % el 25-oct a las 22:35). Al llegarle: guardar y parar una semana. Usar Fable (17 %) para planificar y para el trabajo grande.
- **Máquina:** como mucho unos 8–10 agentes; la Mac se apagó una vez por la carga.

## Siguiente en la fila
1. Huevos con rareza (P2 de los directores de producto: los hijos de Kelvin). Diseño cuidadoso: nada de tragamonedas ni compras.
2. Mapa, fase A: caminos originales entre aldeas y el río Amazonas más ancho (`docs/equipo/MAPA_COMPLETO.md`). La fase B (regiones) necesita la aprobación de Kelvin.
3. Ríos vivos: peces con visor (V9.1).
4. Decisiones de Kelvin pendientes: canon (Guardián, Voz, máquina, medalla), las 9 `[KELVIN]` de `BOSQUE_VIVO_DISENO.md`, los nombres de «Creativos y colaboradores» de la web, la escala de la región del Amazonas y las dos versiones de `AV3DMaxTerrainExport.zip` del Drive (todavía sin bajar).
