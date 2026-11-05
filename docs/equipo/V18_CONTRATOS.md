# V18.1 · Contratos compartidos (frente D)

Directiva: `docs/DIRECTIVA_V18_1.txt` (Kelvin, 5-nov). Ciclo a demostrar: **descubre una cotorra → desbloquea su poder → supera un desafío → gana una recompensa → transforma un mundo que recuerda lo que hiciste.**

## Reglas para todos los frentes

- **Bandera:** todo lo de V18.1 se carga solo con `?v18=1` (o `localStorage['amazonaverse.v18'] = '1'`). Sin ella el juego estable queda igual. `G.V18` dice si está puesta. Los módulos nuevos van en `src/game/v18/` y se cargan desde `src/boot.js` con `aDemanda` y `alPrimerGesto`.
- **Rama:** `main` única, como manda `CLAUDE.md`. La bandera sustituye a las ramas por frente. Commits pequeños, de rutas concretas.
- **Un solo progreso:** nadie crea su propio almacén. Todo pasa por `G.v18` (`src/game/v18/progreso.js`).
- **Pruebas:** cada módulo trae `AV.<nombre>Test()`. Las 12 baterías en verde antes de cada push de código.
- **Sin gastos de API ni modelos nuevos** sin aprobación. Se reutilizan el rig de Vittata, las pieles de las especies y los sistemas existentes.

## Datos

| Contrato | Forma | Dueño |
| --- | --- | --- |
| `speciesId` | id de `content/comun/especies.js` (`vittata`, `arausiaca`…) | todos |
| Estado de especie | `no_descubierta` < `descubierta` < `desbloqueada` < `seleccionable` < `seleccionada` (una sola seleccionada). La especie del perfil entra como `seleccionable`: nada se bloquea en partidas viejas | C, vía `G.v18` |
| `abilityId` | `{ id, especie(s), coste: energía, cooldown s, efecto: fn(ctx), anim/fx }`. Motor configurable por especie; reutiliza los dones de `src/game/dones.js` (Ráfaga doble, Columna de nube, Rasante de río, Plumas de hoja) | A |
| Eventos de combate | `G.emit('v18combate', { tipo: 'hit' \| 'damage' \| 'win' \| 'loss', de, a, valor })` | A |
| Recompensa | `G.v18.otorgar(rewardKey, itemId, n)`: idempotente (la misma `rewardKey` nunca se da dos veces). `G.v18.cuantos(itemId)`, `G.v18.gastar(itemId, n)` | A otorga, B gasta |
| `worldChangeId` | `G.v18.mundo(id)` / `G.v18.cambiarMundo(id, estado)`; estados por estructura (p. ej. `roto` → `reparado`) | B |
| Guardado | `<almacen>.v18` = `{ v: 1, especies, inv, otorgados, mundo, sel }`. Cambios de esquema: subir `v` y migrar en `progreso.js` | D |
| Eventos de progreso | `G.emit('v18', { tipo: 'especie' \| 'inv' \| 'mundo' \| 'recompensa', … })` | D |

## Demo D7 (decidido por Kelvin el 5-nov, ver DECISION_LOG)

- **Especies y poderes:** Vittata «Grito del Yunque» (familia técnica PICO: abre el pico, ondas sonoras que empujan e interrumpen, alcance limitado, recuperación) y *A. arausiaca* «Escudo de plumas» (familia PLUMAS: alas abiertas, plumas que giran, reduce o bloquea un ataque un momento, recuperación; contrarresta en parte el grito).
- **Ataques básicos de todas:** golpe de ala (cerca) y semilla (a distancia). El grito no es básico.
- **Resistencia:** 5 plumas; energía de poderes aparte.
- **Rival IA:** «Campeona de la Explanada», cotorra existente sin canon nuevo.
- **Recompensa:** materiales del inventario existente (`S.inv`: madera, piedra…), con `G.v18.otorgar(rewardKey, …)` solo como registro idempotente de que esa victoria ya pagó; nada de moneda nueva. También se consiguen sin pelear.
- **Estructura:** puente colgante junto a Villa Raíz (`puente_villa`), se paga con esos materiales y abre un atajo.
- **Familias técnicas de poderes** para la matriz de las 36: PICO, OJOS, PLUMAS, ALAS.
