# BOSQUE_VIVO_DISENO · clima, fauna que reacciona y «Save the Parrot»

Fichas de implementación de los puntos 2, 3 y 4 de `V9_BOSQUE_VIVO.md`, pensadas para que un agente las haga sin preguntar. Diseño de 25-oct-2026 (Fable), leído del código de `main` en 3c68f3a; nada compilado ni probado. Regla V8.0: diversión primero; lo educativo sale solo. Sin violencia, sin anillos, sin daño, sin Vittata tocada.

**Orden recomendado:** 1.º Fauna (lagartijo y mariposas: S, se ve en el minuto 1) → 2.º Clima (M, cambia todo el mundo y toca al dueño gráfico) → 3.º «Save the Parrot» (M, necesita el clima para su giro cómico pero funciona sin él). Entre las tres, un carril por ficha: no comparten archivos salvo `src/boot.js` (una línea cada una) y `content/cap1/pack.js` (claves distintas).

**Ganchos que ya existen y se usan aquí** (de `src/engine/core.js` y los módulos):
`G.on(nombre, fn, prio)` / `G.emit` · `'update'(dt, busy)` · `'render'(dt)` · `'apply'` (partida cargada o restaurada) · `'calidad'(C)` de `renderer.js` (C.nivel bajo/medio/alto, C.particulas 0,4/0,7/1) · `'vuelo'(bool)` y `'viento'(bool)` de `fisica.js` · `'agarrado'/'soltado'/'usado'(id, obj)` de `agarre.js` · `'aprendizaje'({ tipo, id })` → XP al nido (`criadero.js`, tabla en `content/comun/huevos.js` `xp.tipos`) · `'lugar'` de `lugares.js` · `'criadero'(tipo, d)` y `'companero'` · `'retosResultado'` → `records.js` · `G.interaccion.add({ id, x, z, r, label, use, visible })` · `G.ui.toastHTML` · `G.eventos.log(clave, data)` para el cómic · `G.diario.seccion({ id, html })` para una sección nueva en la tarjeta del Diario · `G.terreno.trees` (lista de árboles), `G.terreno.poi(id)`, `G.solidos.percha` · `G.audio.define/play` · `G.fx.burst/rain`, `G.fx.MAX_PARTICLES = 200` · `G.musicaApi` (`musica.js`: pista `tension` si `S.event` o `G.fx.rain.visible` > 5 s; capas `viento`, `aves`, `coquies`, `rio`, `mar`; `hora(h|null)`).
Carga perezosa: `src/boot.js` `aDemanda(src, fabrica)` → `window.AVClima(G)` etc., igual que `bandada.js` y `musica.js`.

---

## Ficha 1 · Clima de El Yunque

**Tamaño M (2 días) · Riesgo medio** (FPS en móvil y choque con la niebla atmosférica del renderer; se mitiga con el presupuesto de abajo).

### Qué siente el jugador
Cuatro estados, siempre de día (no hay ciclo día/noche en el juego: `S.hora` no existe):

| Estado | Duración | Cielo y luz | Visibilidad (niebla) | Vuelo | Suelo y agua | Sonido (`musica.js`) |
|---|---|---|---|---|---|---|
| **sol** | 4–7 min | el de hoy (`content/cap1/mundo.js` `cielo`/`luces`) | niebla [40, 1000] (la actual) | **térmicas**: 3–4 columnas de aire sobre la plaza, la colina y la cumbre; dentro, Vittata sube sola 2,5 m/s sin aletear (hojas que giran en espiral las señalan) | nada | `explora`, aves 1 |
| **llovizna** | 2–3 min | sol ×0,8, cielo 8 % más gris | niebla [30, 600] | nada; las térmicas se apagan | gotas finas, charcos no | aves 0,6, capa nueva `lluvia` 0,35; sin `tension` |
| **aguacero** | 60–90 s | sol ×0,45, cielo gris azulado `#8fa6b4` | niebla [18, 260] | **ráfaga lateral** 2,2 m/s en la dirección de `mundo.flora.viento.dir` (la misma de los árboles) y un empujón hacia abajo de 0,8 m/s por encima de 12 m del suelo: volar bajo y a sotavento es más rápido | lluvia de `G.fx.rain`, `G.agua.ripple` (ya existe), `G.camara.shake(0.03, 0.1)` cada 4 s con un trueno lejano | `tension` (ya salta sola por `G.fx.rain.visible`), `viento` +0,35 (ya lo hace `calcularAmbiente` con `lluvia`) |
| **neblina** | 2–4 min, solo tras un aguacero o en el Bosque enano (`nublado`, `cumbre`, `picachos`) | sol ×0,7, cielo lechoso `#d8e4e8` | niebla [10, 120], `nieblaAltura` [2, 20] | sin viento; **refugio**: posarse bajo una copa o un techo (G.solidos.cubre) quita las gotas de la cámara | coquíes visibles y cantando (ficha 2) | `coquies` 0,6 aunque sea de día (nueva entrada `niebla` en `calcularAmbiente`), aves 0,4 |

Transiciones: 12 s (sol→llovizna→aguacero) y 20 s (aguacero→neblina→sol), con `lerp` por frame de niebla, color del cielo y `sun.intensity`. Nunca aguacero directo desde sol: siempre pasa por llovizna (el niño lo ve venir). Máquina de estados con pesos: sol 55 %, llovizna 25 %, aguacero 12 %, neblina 8 %; en el Bosque enano la neblina pesa 40 %. Semilla por `S.saveId` + minuto de juego, así dos hermanos con la misma partida ven lo mismo y las pruebas son deterministas (`?clima=aguacero` fija un estado, como `?calidad=bajo`).

**Refugio**: durante aguacero, estar bajo cubierto (`G.solidos.cubre(x, z, y)` ya responde si hay techo o copa encima) 3 s seguidos registra una vez por partida el evento `ShelterFromRain` (cómic: «Vittata esperó a que escampara») y da `G.emit('aprendizaje', { tipo: 'clima', id: 'refugio' })` (nuevo tipo en `huevos.js`, 10 XP, grupo explorar). Es la única «recompensa»; el clima no castiga nada.

### Convivencia con la crecida del capítulo 1
La crecida (`historia.js` 355–385) pone `S.event`, `G.fx.rain.visible = true` y `G.agua.setLevel`. Regla: **mientras `S.event` exista, el clima se congela en `aguacero` y no toca el agua**. `clima.js` nunca llama a `G.agua.setLevel`; solo lee `S.event`. Al terminar la crecida (`S.event = null`) el clima pasa a `neblina` (20 s) y luego a sol: la neblina que queda tras la tormenta es el remate natural de la escena. Antes del paso 4 de la historia (`S.step < 4`, refugio sin construir) el aguacero está desactivado para que la primera lluvia fuerte que el niño vea sea la crecida narrativa; llovizna y neblina sí.

### Presupuesto (móvil, `calidad.nivel`)
| Recurso | bajo | medio | alto |
|---|---|---|---|
| Gotas de lluvia (`G.fx.rain`, hoy 900 puntos fijos) | 300 visibles (`setDrawRange`) | 600 | 900 |
| Hojas de térmicas (Points, 1 draw call) | 0 (las térmicas funcionan, sin hojas) | 40 | 90 |
| Gotas en cámara (overlay CSS, 0 draw calls) | 6 divs | 10 | 14 |
| Lerp de niebla/luz | cada 4 frames | cada 2 | cada frame |
| Trueno | solo audio | audio + flash del `hemi` 80 ms | igual |

Nada nuevo con sombras ni transparencias ordenadas. Objetivo: el aguacero no baja más de 2 FPS respecto a sol en medio (medido con `G.renderer.stats()` en `climaTest`). Las hojas usan `G.fx.MAX_PARTICLES` (200): si `G.fx.live > 140`, el clima no emite hojas ese segundo.

### Archivos
- **Nuevo** `src/game/clima.js` (perezoso, `window.AVClima(G)`): máquina de estados, lerps, térmicas, ráfaga, refugio, overlay de gotas (estilos dentro del archivo, como `musica.js`), `test()`.
  API: `estado()`, `fijar(nombre | null)`, `enTermica()`, `viento()` → `{ x, z, y }`, `test()`.
  Empuje al vuelo: en `'update'` (prio 45, antes de retos 46), si `MOVE.flying && !busy`: `MOVE.vx += vx·dt·3`, `MOVE.vz += vz·dt·3` y `S.pos.y = min(S.pos.y + vy·dt, G.fisica.techoVuelo(x, z) - 1)`. `MOVE`, `S.pos` y `techoVuelo` son públicos en `G.fisica`; no se edita `fisica.js` (dueño Movimiento). Avisar a Movimiento igual (COORDINACION): si prefieren un gancho `'empuje'` dentro de `step`, el cambio es de 2 líneas.
- `src/boot.js`: `const cargarClima = aDemanda('src/game/clima.js', 'AVClima');` tras `'listo'`, como la bandada (1 línea; dueño coordinador).
- `src/engine/fx.js` (dueño gráfico; pedir): exponer `rain.geometry.setDrawRange` ya es posible desde fuera; solo hace falta que `updateRain` mueva `rain.geometry.drawRange.count` gotas y no `RAIN_N`. 1 línea.
- `src/engine/renderer.js` (dueño gráfico; pedir): nada obligatorio. `scene.fog.near/far`, `sun.intensity`, `hemi.intensity` y `sky` ya son públicos. Opcional: `renderer.cielo(colorHorizonte, colorCenit)` para no tocar `skyU` desde fuera.
- `src/game/musica.js` (gameplay): `calcularAmbiente` lee `e.niebla` y `e.llovizna` (de `G.clima.estado()`); nueva capa `lluvia` (ruido rosa filtrado, ya hay `noise`); `coquies` suben con niebla. ~25 líneas.
- `content/comun/huevos.js` (dueño huevos; pedir): `clima: { xp: 10, grupo: 'explorar' }`.
- `content/cap1/pack.js`: `clima: { pesos, zonasNeblina: ['nublado', 'cumbre', 'picachos'], termicas: ['plaza', 'colina', 'cumbre'], eventos: { ShelterFromRain } }` y una viñeta opcional.
- `docs/equipo/REGISTRO_TAREAS.md`.

### Prueba que lo valida (`AV.climaTest()`, entra en las baterías de `tools/build/test.sh --extra`)
1. `fijar('aguacero')` → en 13 s `scene.fog.far ≤ 270`, `G.fx.rain.visible`, `G.musicaApi.estado().pista === 'tension'` tras 5 s simulados.
2. Con `S.event = { t: 0, dur: 20 }` el estado queda `aguacero` y `G.agua.levelAt` no cambia por el clima.
3. `fijar('sol')`, Vittata volando en el centro de una térmica 2 s → `S.pos.y` sube ≥ 4 m sin pulsar Subir y nunca pasa `techoVuelo - 1`.
4. `G.renderer.setCalidad('bajo')` → `rain.geometry.drawRange.count === 300` y 0 hojas.
5. `S.step = 2` → `fijar('aguacero')` devuelve false (bloqueado antes del refugio).
6. 0 errores de consola; `prefers-reduced-motion`: sin shake ni flash.
Playtest: en el móvil de referencia, FPS en aguacero ≥ FPS en sol − 2.

### [KELVIN]
- **[KELVIN]** si el Bosque enano vive casi siempre en neblina (40 %) o igual que el resto.
- **[KELVIN]** si quiere arcoíris al salir el sol tras el aguacero (S extra, un quad con shader; bonito pero no verificable como «de El Yunque» salvo con foto propia).
- **[KELVIN]** canon: ¿la neblina es «el aliento del Yunque» en la historia o solo clima?

Dato con fuente para el Diario/cómic (opcional): «En El Yunque llueve todo el año; no hay estación seca» y «unos 3 860 mm al año de media» (Wikipedia EN, *El Yunque National Forest*, consultado 25-oct-2026, https://en.wikipedia.org/wiki/El_Yunque_National_Forest; la misma página da también 240 pulgadas en otro párrafo: **por verificar** contra el USDA Forest Service antes de publicarlo).

---

## Ficha 2 · Fauna que reacciona

**Tamaño S+ (1 día las tres especies; la boa, medio día más) · Riesgo bajo** (todo instanciado, sin sombras, sin física).

Principio: cada animal hace **una cosa** cuando Vittata se acerca y **otra** si se queda quieta. Observar = estar a < 4 m, quieta o posada, 2 s. Observar por primera vez da la entrada del álbum («Fauna de El Yunque», sección nueva del Diario) y `G.emit('aprendizaje', { tipo: 'fauna', id })` (nuevo tipo, 15 XP). Nada se persigue para atraparlo; nada huye con miedo exagerado.

| Especie | Dónde (instancias) | Comportamiento mínimo | Reacción a Vittata | Gag |
|---|---|---|---|---|
| **Lagartijo** (*Anolis cristatellus*) | los 2 m bajos de los troncos: 12 (medio) / 20 (alto) / 6 (bajo), elegidos de `G.terreno.trees` a < 60 m del jugador, recolocados al moverse 40 m (como el pasto) | pegado al tronco, quieto; cada 6–12 s da 3 «flexiones» y despliega el **abanico amarillo con borde naranja** (un quad que escala) | a < 6 m se gira al lado opuesto del tronco (se esconde a medias: se ve la cola); si Vittata se posa en ese árbol y espera 2 s, vuelve a asomar y hace las flexiones «para ella» → observado | si Vittata hace el gesto «saludar» (Foto) cerca, el lagartijo responde con flexiones: viñeta «Concurso de flexiones» |
| **Mariposas** (*Heliconius charithonia*, cebra) | 3 nubes de 8 (medio) / 12 (alto) / 4 (bajo) junto a flores: plaza, claro del bosque (`parada_claro`) y Poza del Dajao (`poza_dajao`) | vuelo lento en ochos a 1–3 m, una `InstancedMesh` de 2 triángulos con aleteo en el vertex shader (mismo truco que `bandada.js`) | al pasar volando a < 3 m se dispersan 2 s y vuelven; si Vittata se posa junto a las flores 2 s, **una se le posa en el pico** (se enlaza al hueso del pico con `G.actores`, como hace `agarre.js` con los objetos) → observado | el pichón compañero (`criadero.companero()`) las persigue a saltitos (gancho para la mejora 9 de `DIVERSION_CAP1`) |
| **Coquí** (*Eleutherodactylus coqui*) | 3 arbustos de M3 (`content/cap1/misiones.js` `BUSHES`, ya tienen `frog` mesh) + 5 hojas más en el Bosque enano | **visible solo con neblina o llovizna** (ficha 1) o al terminar M3; de día con sol está escondido (el canto nocturno del macho ya está en `musica.js`) | a < 3 m infla el saco vocal (escala de una esfera) y canta «co-quí» (`audio` `co`/`qui` ya existen) en respuesta al gesto de Vittata; la segunda vez que se acerca canta primero él → observado | si Vittata canta 3 veces seguidas (Acción), se le unen los 3 en coro desafinado: viñeta «El coro se descontroló» |
| **Boa puertorriqueña** (*Chilabothrus inornatus*) — **encuentro opcional** | 1 sola, enrollada en una rama alta cerca de la Cueva del Río (`cueva_rio`), fuera de todo camino de misión | duerme; respira (escala 1 %) | no reacciona: nunca persigue, nunca abre la boca. Si Vittata se posa en la misma rama, la boa levanta la cabeza, la mira 2 s y vuelve a dormir → observado. Texto del álbum en tono de respeto («es tímida y come ratas y murciélagos; a las cotorras adultas no las molesta») | ninguno: la boa es el único animal «serio» del bosque, y eso es el gag |

**Rendimiento:** 4 `InstancedMesh` en total (lagartijos, mariposas cerca, mariposas lejos, hojas de coquí) + 1 mesh de boa; ≤ 5 draw calls; sin sombras (`castShadow = false`); se apagan a > 70 m; `G.on('calidad')` reajusta los `count` sin recrear nada. Nada en `G.quiet`.

### Datos para el álbum (texto del juego + fuente + fecha)
| Animal | Texto en el juego (ES) | Fuente (consultada 25-oct-2026) | Estado |
|---|---|---|---|
| Lagartijo común | «Vive en los dos metros bajos de los troncos. El macho despliega un abanico amarillo con borde anaranjado y hace flexiones para marcar su sitio.» | Wikipedia EN, *Puerto Rican crested anole*: «native to Puerto Rico and the U.S. and British Virgin Islands»; «spend the majority of their time on the bottom two meters of tree trunks»; dewlap «mustard or greenish yellow, with a burnt-orange… band along the margin»; machos «display their dewlap and perform "push-ups"». https://en.wikipedia.org/wiki/Puerto_Rican_crested_anole | Verificado (la fuente es Wikipedia: confirmar en una guía del DRNA antes de publicar) |
| Mariposa cebra | «Come polen, no solo néctar, y de noche duerme en grupo en la misma rama, hasta 60 juntas.» | Wikipedia EN, *Heliconius charithonia*: «The adults are unusual among butterflies in that they eat pollen as well as sip nectar»; «Adults roost in groups of up to 60 individuals on a nightly basis»; subespecie *H. c. charithonia* en Puerto Rico. https://en.wikipedia.org/wiki/Heliconius_charithonia | Verificado; **por verificar** que sea común en El Yunque (la alternativa endémica, la mariposa arlequín *Atlantea tulita*, es de bosques de caliza y serpentina, no de El Yunque: https://en.wikipedia.org/wiki/Atlantea_tulita) |
| Coquí común | el texto ya validado del Diario: «Ranita nativa de Puerto Rico. De noche, el macho canta "co-quí".» | `docs/equipo/DIARIO_VALIDACION.md` fila 1 (GISD, USGS, Beard & Pitt 2012) | Verificado. Que cante **de día con lluvia** es lo que justifica verlo con neblina: **por verificar** con una fuente antes de ponerlo en el texto; mientras tanto el texto no lo afirma |
| Boa puertorriqueña | «La serpiente más grande de la isla: hasta 1,9 m. Mata apretando, no tiene veneno, y come ratas y murciélagos. Es tímida.» | Wikipedia EN, *Puerto Rican boa*: «It is the largest snake on the island»; «grows to 1.9 m (6.2 ft)»; «kills its prey using constriction»; «feeds on small mammals such as rodents and bats». UICN: Preocupación menor (2018). https://en.wikipedia.org/wiki/Puerto_Rican_boa | «Sin veneno» es de la familia (boas), no literal en la fuente: **por verificar** en USFWS/DRNA; estatus federal (ESA) **por verificar** |

### Archivos
- **Nuevo** `src/game/fauna.js` (perezoso, `window.AVFauna(G)`): las 4 especies, observación, `G.diario.seccion({ id: 'fauna', html })` con el álbum (tarjetas con silueta, texto y «Fuente»), `test()`. ~400 líneas.
- **Nuevo** `content/cap1/fauna.js`: datos (`AVE.registerPack({ id: 'cap1', fauna: { especies: [...], zonas, textos, fuentes } })`), igual que `coleccionables.js`.
- `src/boot.js`: `aDemanda('src/game/fauna.js', 'AVFauna')` tras `'mundoListo'` (1 línea).
- `content/comun/huevos.js` (pedir al dueño): `fauna: { xp: 15, grupo: 'explorar' }`.
- `src/engine/guardado.js` (dueño Save; pedir): clave del pack `fauna: []` en `claves` (ids observados), como `lugares`.
- `content/cap1/pack.js`: eventos `AnoleContest`, `ButterflyOnBeak`, `CoquiChorusWild`, `BoaMet` y viñetas con 3 textos cada una (listas, humor).
- `content/cap1/misiones.js`: solo leer `BUSHES`; no se toca.

### Prueba (`AV.faunaTest()`)
1. Tras `mundoListo`, `fauna.estado().lagartijos === NIVEL[calidad.nivel]` y todos a ≤ 2,2 m del suelo y a ≤ 0,5 m de un tronco de `G.terreno.trees`.
2. Teletransportar a Vittata a 2 m de un lagartijo, `MOVE.speed = 0`, simular 2,2 s → `S.fauna` incluye `'lagartijo'`, se emitió `'aprendizaje'` con `tipo: 'fauna'` una sola vez.
3. Volar por una nube de mariposas → dispersión (varianza de posiciones ×2) y regreso en < 3 s.
4. `G.clima.fijar('sol')` → coquíes ocultos; `fijar('neblina')` → visibles (si no hay clima cargado, visibles solo con `S.missions.m3`).
5. Boa: posarse en su rama → cabeza levantada 2 s, nunca se desplaza, observado.
6. `setCalidad('bajo')` baja los `count` sin errores; draw calls de fauna ≤ 5 (`G.renderer.stats()`).
7. El álbum muestra 4 tarjetas con «Fuente» y enlace.

### [KELVIN]
- **[KELVIN]** si la boa entra en el capítulo 1 o se guarda para el 2 (encuentro opcional, pero es un animal que algunos padres no querrán ver sin aviso).
- **[KELVIN]** mariposa cebra (común, verificable) o arlequín (endémica, protegida, pero no de El Yunque): arte y canon.
- **[KELVIN]** si el álbum de fauna se funde con el «Álbum de las Amazonas» (mejora 10) o es una sección aparte del Diario.

---

## Ficha 3 · «Save the Parrot»: rescate del pichón

**Tamaño M (1,5–2 días) · Riesgo medio-bajo** (reusa agarre, interacción, retos/records; lo nuevo es el guion y la IA del pichón).

### Qué es
Un reto repetible de 2–3 minutos dentro del mundo libre (no en el Modo Retos, para que el pichón del criadero y el mundo de la historia estén presentes), con récord y «Otra vez». Un pichón de la familia de Iguaca se cayó del nido en el palo colorado de la plaza y hay que **devolverlo al nido** antes de que se moje o se aburra. Sin enemigos: el «peligro» es cómico (el zorzal pardo curioso, la lluvia, el propio pichón que se escapa). Se activa después de la crecida (`S.step ≥ 6`) en un cartel junto al nido del criadero; desde entonces siempre está disponible.

### Guion (fases, ~150 s)
1. **Inicio (10 s).** Iguaca, en bocadillo libre: «¡Un pichón se cayó del nido! Está piando junto a la Poza. ¡Rápido, antes de que llueva!». Cuenta 3-2-1 como en retos, reloj en el HUD (`misiones.renderQuest` ya pinta un objetivo; el reloj es nuevo, 1 línea de HUD). Haz de guía (`G.fx.guide`) al pichón.
2. **Encontrarlo (20–40 s).** El pichón (modelo del criadero en etapa «bebé», `criadero.vestir`/escala; misma cara de Vittata, sin tocar el rig) está en uno de **3 sitios al azar por partida** (poza, techo del taller, charca de las nubes). Pía cada 2 s (`audio` `nido_chispa` reusado + un «pío» nuevo de 2 tonos). Se le ve a 30 m.
3. **Agarrarlo (giro 1: no se deja).** Al llegar, `interaccion` «Agarrar al pichón». La primera vez da un saltito y se aparta 3 m piando contento (cree que es un juego); a la segunda se deja. `G.agarre.agarrar(pichon, { id: 'pichon', enganche: 'patas' al volar })`: en vuelo lo lleva en las patas, como las tablas de la crecida.
4. **Llevarlo (40–60 s, giro 2: el zorzal).** Hay que volar al nido (percha del palo colorado de la plaza, 9 m de altura; `G.solidos.percha` ya ayuda a aterrizar). En el camino, un **zorzal pardo** (sprite con `flota: true`, como Iguaca; o malla simple) se acerca curioso a 2 m: si Vittata vuela recta más de 4 s con él al lado, el pichón se asusta, pía fuerte y hay que ladear o picar una vez para que el zorzal se aburra y se vaya (lo que se premia es volar bien, mejora 6). Nunca ataca ni quita nada.
5. **Giro 3: la lluvia (si `clima.js` está).** Si durante el reto entra llovizna, el pichón se esconde bajo el ala de Vittata (pose de carga ya existe) y suma «+bono seco» si llega al nido sin estar 10 s bajo lluvia. Sin clima: el bono no aparece.
6. **Resultado (10 s).** Al soltarlo en el nido (`'soltado'` con `pos` a < 1,5 m de la percha): el pichón se acurruca, Iguaca y la madre (sprite nuevo o la misma Iguaca, **[KELVIN]**) celebran, `fx.burst('feathers')`, tarjeta: tiempo, «Récord de la casa», medalla (oro < 90 s, plata < 120, bronce llegar), botones «Otra vez» y «Seguir». El tiempo del reto no cuenta para la historia.

**Conexión con el criadero:** cada rescate da `G.emit('aprendizaje', { tipo: 'rescate', id: 'pichon-' + n })` (nuevo tipo, 20 XP, grupo cuidar, **solo las 3 primeras veces por partida** para no inflar la XP) y 1 carga de cuidado (`criadero.cuidar` ya existe). A los 5 rescates (contador en `S.rescates`), se gana la cápsula «Pichón rescatado» (nueva en `huevos.js`, condición `{ rescates: 5 }`; **[KELVIN]** su nombre y piel). Si el jugador ya tiene un compañero (`criadero.companero()`), el compañero va detrás de Vittata durante el reto y al final se acurruca junto al pichón rescatado: dos pichones en el nido es la foto del cómic («Foto» ya existe).

**Récord:** `records.js` `anotar` acepta `r.modo === 'rescate'` → `rescate: { mejor (ms), medalla, oros, jugadas }` en `<almacen>.records` (misma forma que `rio`); «Mis récords» lo pinta en la misma lista. Emite `G.emit('retosResultado', { modo: 'rescate', llego, ms, medalla, prueba })`. El fantasma no aplica (no es un trazado fijo).

**No choca con «Banquete en la selva» (`src/game/banquete.js`, en curso):** el banquete recoge frutos y los lleva al nido o refugio sumando puntos; el rescate lleva **un solo ser vivo** que reacciona, con reloj. Para no pisarse: (a) el rescate no usa frutos ni el contador de puntos del banquete; (b) mientras `S.rescate` está activo, los frutos no se pueden agarrar (`G.agarre.lleva()` ya impide llevar dos cosas, y el rescate pone `G.interaccion.modo` con `activo: () => true` para filtrar lo suyo); (c) los dos usan el mismo nido del criadero como destino, así que el **nido ofrece dos interactuables con ids distintos** (`nido_fruto`, `nido_pichon`) y solo uno es `visible()` según lo que se lleve; (d) ninguno arranca si el otro está activo (`S.banquete`/`S.rescate`). Pedir a quien hace `banquete.js` que exponga `G.banqueteApi.activo()`; si ese nombre cambia, cambiar aquí.

### Archivos
- **Nuevo** `src/game/rescate.js` (perezoso, `window.AVRescate(G)`): fases, pichón (`AVCharacter.create` con la escala de bebé del criadero: pedir `criadero.vestir`/`etapaDe`), zorzal, reloj, tarjeta de resultados (HTML + estilos propios, como `retos.js`), `test()`. ~500 líneas.
- `content/cap1/pack.js`: `rescate: { sitios: ['poza_honda', 'taller', 'charca_nubes'] (POIs del mapa; el taller usa su techo), nido: 'plaza', medallas: { oro: 90000, plata: 120000 }, textos }`, eventos `ChickRescued`, `ChickEscaped`, `ThrasherCurious` y viñetas.
- `src/game/records.js`: rama `rescate` en `anotar`, `entradaDe` y en el panel (~20 líneas).
- `src/game/criadero.js` (dueño huevos; pedir): nada nuevo si `companero()`, `vestir` y `cuidar` bastan; cápsula nueva en `content/comun/huevos.js` + tipo `rescate` en `xp.tipos`.
- `src/engine/guardado.js` (dueño Save; pedir): claves del pack `rescates: 0`.
- `src/boot.js`: `aDemanda('src/game/rescate.js', 'AVRescate')` al pulsar el cartel (1 línea).
- `content/cap1/historia.js`: 1 interactuable «Cartel: Save the Parrot» junto al nido desde `S.step ≥ 6` (3 líneas, carril historia).
- Audio: `G.audio.define('pio', …)` dentro de `rescate.js` (2 tonos sinusoidales, 0,25 s).

### Prueba (`AV.rescateTest()`)
1. Con `S.step = 6` aparece el cartel; `jugar()` pone `S.rescate`, el pichón en uno de los 3 sitios y el reloj a 0.
2. Primer «Agarrar» → el pichón se aparta ≥ 2,5 m y no se agarra; el segundo → `G.agarre.lleva().id === 'pichon'`.
3. Con el pichón en las patas, teletransportar a 1 m de la percha del nido y `soltar()` → fase `fin`, `'retosResultado'` con `modo: 'rescate'`, `records` guarda `rescate.jugadas === 1`, `'aprendizaje'` `tipo: 'rescate'` emitido, `S.rescates === 1`.
4. Zorzal: volar recto 4,5 s con él al lado → pío fuerte; `ladear` (cambio de rumbo > 30°) → el zorzal se va en < 2 s.
5. Con `G.banqueteApi.activo()` en true, `jugar()` devuelve false con aviso; y al revés.
6. «Otra vez» reinicia en < 1 s sin tocar `S.step`, `S.missions` ni el almacén de la partida más que `S.rescates`.
7. 5 rescates → cápsula «Pichón rescatado» en `criadero.estado()`.
8. Compañero presente → sigue a Vittata y al final hay 2 pichones en el nido; `fotoFrente` captura.
Playtest: 2–3 min de duración real; el niño ríe al menos una vez (apuntar en qué giro).

### [KELVIN]
- **[KELVIN]** quién es el pichón (hermano de Iguaca, hijo de la madre del refugio, o un pichón «de otra familia»): canon del `STORY_BIBLE.md`.
- **[KELVIN]** si el zorzal pardo (*Margarops fuscatus*, competidor real de los nidos, ver abajo) puede salir aunque sea «curioso» y nunca malo, o se cambia por otra ave.
- **[KELVIN]** nombre y piel de la cápsula «Pichón rescatado»; si se llama «Save the Parrot» en pantalla (inglés) o «Salva a la cotorra».

Datos con fuente (cómic/álbum, opcional): «La cotorra puertorriqueña anida en huecos de árboles, sobre todo palo colorado, a 7–15 m de altura, y también en cajas de madera del programa de recuperación»; «la hembra incuba 24–28 días y los pichones salen del nido a los 60–65 días»; «en 1975 quedaban 13»; «el zorzal pardo compite por los nidos desde 1973» (Wikipedia EN, *Puerto Rican amazon*, consultado 25-oct-2026, https://en.wikipedia.org/wiki/Puerto_Rican_amazon; **confirmar en USFWS/DRNA antes de publicar**: la ficha de fws.gov que probé dio 404).

---

## Resumen para decidir
| Ficha | Tam. | Riesgo | Archivos nuevos | Toca a otros dueños | Decisiones [KELVIN] |
|---|---|---|---|---|---|
| 2 Fauna | S+ | bajo | `src/game/fauna.js`, `content/cap1/fauna.js` | huevos (1 tipo XP), save (1 clave), boot (1 línea) | boa sí/no, mariposa, álbum |
| 1 Clima | M | medio | `src/game/clima.js` | gráfico (fx 1 línea), huevos (1 tipo), boot (1 línea), musica (25 líneas) | neblina del Bosque enano, arcoíris, canon |
| 3 Rescate | M | medio-bajo | `src/game/rescate.js` | records (20 líneas), huevos (tipo + cápsula), save (1 clave), historia (3 líneas), banquete (`activo()`) | canon del pichón, zorzal, nombre de la cápsula |

Todo lo educativo de las tres fichas va en el álbum y el cómic, nunca como tarjeta que frene el juego (regla de `DIVERSION_CAP1` mejora 3). Lo marcado «por verificar» no entra en textos del juego hasta tener la fuente.
