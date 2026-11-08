# V18.2 · Diseño técnico breve del prototipo (directiva §14)
Fuente: `docs/DIRECTIVA_V18_2.md`. Alcance: Vittata con 3 etapas, Arausiaca con Escudo de plumas, XP y niveles, un desbloqueo visible, la alianza Eco Protector contra la Campeona, guardado, teclado y táctil. Todo va detrás de `?v18=1` y sin modelos nuevos, compras ni azar. Basado en el código real de `progreso.js`, `habilidades.js`, `combate.js`, `nuevas.js`, `fx_poderes.js`, `descubrir.js` y `boot.js` (6-nov).

## 1. Módulo y ganchos
- **Nuevo `src/game/v18/evolucion.js` → `window.AVV18Evolucion(G)` → `G.v18evo`.** Contiene la curva, la XP, los topes, las etapas, la alianza, los avisos y el test. Registra `eco_protector` con `G.v18hab.registrar` (API pública), así que habilidades.js no necesita conocer la alianza.
- **boot.js (1 línea):** `cargarV18Evo = () => Promise.all([cargarCombate(), cargarV18Descubrir(), cargarV18Fx()]).then(evo18)`, `AV.v18EvolucionTest`, y `alPrimerGesto` solo si `v18On`. Sin la bandera no se carga nada.
- **habilidades.js (unas 6 líneas). El motor consulta y no decide.** Helper `ver(f, h) = (G.v18evo && f.nivel) ? G.v18evo.ajustar(f, h) : h`. `ajustar` devuelve `Object.create(h)` con los números de la etapa. El `efecto` heredado lee `this.alcance`, `this.cono`… y toma los valores ajustados sin copiar código. `listo()` y `usar()` usan `ver(f, h)` para el coste, la espera y el efecto. `listo()` acepta `f.alianza === id` además de `f.poder === id`. `recibir()` y `paso()` no cambian. Sin `f.nivel` (rival IA, duelo2.js, minigolf.js, amenazas, Vittata de nivel 1), todo es idéntico a hoy.
- **combate.js (unas 25 líneas):** `nuevoJugador()` añade `G.v18evo?.paraDuelo(sp)` → `{ nivel, variante, alianza }`. Solo el jugador; la Campeona no sube. `ctxDe` añade `desviar(origen, dir, alcance, cono)`, que quita las semillas rivales dentro del cono (con fx `leaves`). En habilidades.js, `desviar` queda en `nada` por defecto. Tecla **H** capturada solo durante el duelo, igual que la G (QA-173). Botón de la alianza en el HUD (§6). Línea de nivel y XP en el HUD (§7). `terminar()` añade al evento `v18combate` los campos `dura`, `interrupciones` y `quitadas` (los oyentes actuales los ignoran).
- **descubrir.js (unas 4 líneas):** `abrirSeleccion()` añade `G.v18evo?.htmlFicha(id)` a cada cotorra y `G.v18evo?.htmlAlianza()` al final.
- **progreso.js (unas 10 líneas):** el esquema pasa a v2 (§2).

## 2. Datos y migración
Los datos de evolución viven en el progreso V18, en la misma clave `<almacen>.v18`, como `d.evo`:
```
evo: { esp: { <sp>: { xp: 0, nivel: 1, mejoras: { eco_amplificado: true, ... }, variante: null } },
       alianzas: { eco_protector: 'bloqueada'|'disponible'|'desbloqueada' }, alianzaSel: null,
       marcas: { <claveUnaVez>: true }, dia: { fecha: 'AAAA-MM-DD', por: { <fuente>: xp } }, retro: false }
```
- **progreso.js:** Sube `V` a 2. `migrar(d)` crea `evo` con los valores por defecto si falta y pone `d.v = 2`. `leer()` añade `'evo'` a la lista de claves que fuerza a objeto. API nueva: `evo()` (lectura) y `cambiarEvo(fn)`, que muta, guarda y emite `v18 {tipo:'evo'}`.
- **Partidas viejas:** v1 → v2 conserva intactos `especies`, `inv`, `otorgados`, `mundo` y `sel`; solo se añade `evo`. Una build anterior que lea un v2 vuelve a poner `v = 1` y conserva `evo` sin tocarlo, porque `Object.assign` mantiene las claves extra.
- **Saneado de `evo`:** `xp` entero ≥ 0 o se pone 0; `nivel` se recalcula siempre a partir de `xp` (nunca se confía en el guardado) y se limita a 40; las variantes desconocidas pasan a `null`.
- **XP retroactiva (una vez, `retro`):** las marcas ya cumplidas (puente, Sombra, Serpiente, Sapo, especies desbloqueadas) dan su XP de hito a la cotorra elegida, con un único aviso. Son finitas: unos 1.000 XP como máximo, nivel 16 aprox.

## 3. Curva de XP y fuentes
- **XP total para el nivel n:** `T(n) = 20·(n−1) + 3·(n−1)·(n−2)`. Valores: nivel 10 = 396, nivel 20 = 1.406, nivel 30 = 3.016, nivel 40 = 5.226.
- La XP va a la cotorra elegida (`G.v18.seleccionada()`).
- La XP de un duelo se suma al terminar. La etapa nueva se aplica en el siguiente duelo («Otra vez»), nunca a mitad de un combate.

| Fuente (evento existente) | XP | Tope |
|---|---|---|
| Duelo IA ganado (`v18combate` win, sin `duelo:2`) | 60 | Mitad desde la 5.ª victoria del día; máx. 360/día en duelos |
| Duelo IA perdido | 25 | Solo si `quitadas ≥ 1` y `dura ≥ 20 s`; si no, 0 |
| 1.ª victoria con cada especie (`duelo_gana_<sp>`, ciclo.js) | 50 | Una vez por especie |
| Especie desbloqueada (`v18` especie → seleccionable) | 40 | Una vez por especie |
| Material recogido / puente reparado (`v18` mundo, reparar.js) | 10 / 120 | Una vez por clave |
| Sombra dispersa / Serpiente deshecha / Sapo despierto | 150 / 100 / 100 | Una vez |
| Reto de dos cotorras (`reto_dos_cotorras`) | 100 | Una vez |
| Minigolf nido / mejora de récord (`v18minigolf` nido) | 30 / +30 | 3 nidos/día |
| Desafío de entrenamiento Eco Protector | 80 | Una vez |
| Duelo de 2 jugadores, gritos sueltos, rebotes | 0 | Para que no se pueda farmear |

- **Tope global diario de lo repetible: 700 XP.** Los hitos de una sola vez no cuentan para este tope.
- **Ritmo esperado:** Nivel 10: 1.ª sesión (la Arausiaca y 5 o 6 duelos). Nivel 20: al cerrar el contenido V18.1 y algunos duelos, en 2 o 3 sesiones. Nivel 30 o más: varias semanas de juego normal.
- **Modo de prueba documentado:** `AV.G.v18evo.prueba({ especie: 'vittata', nivel: 20, alianza: true })` fija la XP a `T(n)` y deja la alianza desbloqueada. Marca `evo.prueba = true` y lo dice en la consola. `AV.G.v18evo.prueba(null)` restaura. Para el video de subida de nivel: `prueba({ especie: 'vittata', xp: 356 })` (40 XP antes del nivel 10) y luego ganar un duelo (+60).

## 4. Vittata: tres etapas jugables (Grito del Yunque, base actual)
| Etapa | Alcance | Cono | Vel. onda | Empuje | Interrumpe | Coste / espera | Qué cambia al jugar |
|---|---|---|---|---|---|---|---|
| 1–9 Grito del Yunque | 7 m | 0,82 (±35°) | 16 | 15 | 1,1 s | 35 / 5 s | Base: hay que acercarse y apuntar |
| 10–19 **Eco Amplificado** | 9 m | 0,74 (±42°) | 16 | 17 | 1,2 s | 35 / 5,5 s | Más fácil acertar desde lejos; espera algo más larga |
| 20–29 **Eco Dirigido** | 11 m | 0,90 (±26°) | 22 | 18 | 1,4 s | 40 / 6 s | Cono estrecho, exige apuntar mejor; **desvía las semillas rivales** de su trayectoria (`ctx.desviar`) |
| 30+ Grito Maestro (opcional) | Dirigido + eco secundario a 0,4 s (empuje 8, sin interrumpir) | | | | | 45 / 7 s | Combo táctico; solo si sobra tiempo |

- **Elección de variante:** desde el nivel 20, en Mis cotorras se elige Amplificado o Dirigido (`variante`; por defecto Dirigido). Así se prueban estrategias distintas.
- **Topes de equilibrio, fijos en el código y comprobados en el test:** El grito nunca quita plumas. Espera ≥ 5 s, coste ≥ 35, alcance ≤ 11 m, interrupción ≤ 1,4 s. Llega en ≥ 0,45 s a distancia máxima, así que se puede esquivar. Plumas (5), energía, recarga, golpe de ala y semilla son iguales en todos los niveles. El Escudo de plumas sigue reduciendo cualquier etapa.
- **Ventaja máxima por nivel:** sobre +25 % de eficacia del poder. El nivel no decide el duelo.
- **Visual:** misma Vittata, mismo rig y animación del pico. Cambia solo `G.v18fx.onda(…, alcance)` (los anillos llegan más lejos) y el nombre del poder en el HUD.

## 5. Arausiaca: Escudo de plumas
- **Base, sin cambios:** 2,5 s, para 1 golpe normal y reduce el grito (empuje ×0,4, mareo ×0,35), coste 35, espera 7 s. Sigue siendo la Campeona cuando juegas una Isleña.
- **Opcional, solo si es la elegida:** Nivel 10, «Escudo firme»: 3,0 s. Nivel 20: al bloquear un golpe normal recupera 15 de energía.
- Mismos topes: un golpe por escudo, Ala fuerte lo rompe, sin invulnerabilidad.

## 6. Alianza Eco Protector (Vittata + Arausiaca)
- **Desbloqueo:**
  1. Vittata seleccionable y nivel ≥ 10 (Eco Amplificado).
  2. Arausiaca ≥ seleccionable (descubrir.js).
  3. Con eso, la alianza pasa a `disponible` y aparece el aviso: «La Campeona quiere entrenarte con una alianza».
  4. **Desafío de entrenamiento:** ganar a la Campeona con Vittata con `interrupciones ≥ 2`.
  5. Al cumplirlo pasa a `desbloqueada`, con una tarjeta «¡Nueva alianza: Eco Protector!» (el desbloqueo visible), y queda elegida.
- **Elección:** en Mis cotorras, fila «Alianza» con un interruptor. Solo aparece con Vittata elegida y la alianza desbloqueada. Se guarda en `alianzaSel`.
- **Control:** Teclado: **H** (libre en el juego; capturada solo en el duelo). Escritorio: 4.º botón en `.vd-bot`. Táctil: botón propio `.vd-ali` (≥ 56 px) dentro del panel del duelo, bajo la energía del jugador. No tapa el Diario ni los botones grandes. Si la alianza no está elegida, el botón no existe y H no hace nada.
- **Coste, duración y recarga:** 60 de energía; espera propia de 14 s. Pone el `grito_yunque` en espera de 5 s, para que no se encadene con el grito. No se puede usar con un escudo ya activo.
- **Efecto:** Lanza la onda de la etapa actual de Vittata (mismo `efecto` del grito vía `ver()`). Pone en Vittata un escudo temporal de **2,0 s** (`yo.escudo = 2`, menos que los 2,5 s de Arausiaca), que para 1 golpe normal o reduce un grito, con la regla común `recibir()`. Ala fuerte lo rompe. No quita plumas y no da invulnerabilidad.
- **Apoyo visual de Arausiaca, sin modelo nuevo:** `G.v18fx.escudo(jugador, 2)` (plumas de luz) más `G.v18fx.onda` y `fx('feathers')`. En el HUD, el retrato existente `assets/retratos/v18/arausiaca.png` con «¡Arausiaca te cubre!» durante 1,2 s. Evento `v18poder { id: 'eco_protector', apoyo: 'arausiaca' }`.
- **Rival para probarla:** la Campeona (arausiaca), que ya usa su escudo contra las semillas y contra Vittata. Las dos se miden con la misma regla.

## 7. Interfaz mínima
- **HUD del duelo:** Bajo el nombre del jugador: «Nv 12 · Eco Amplificado» y una barra fina de XP (`.vd-xp`). Al terminar: «+60 XP» en el panel de fin.
- **Mis cotorras:** En cada cotorra, nivel, barra de XP y etapa. Etapas bloqueadas en gris, con «Nivel 10» o «Nivel 20». Fila de alianza.
- **Subida de nivel:** `toast` «¡Vittata subió al nivel 10!», `fx('gold')` sobre el jugador y sonido `unlock`. Al cruzar 10, 20 o 30, una tarjeta con la etapa nueva y qué hace, en una frase.
- **Textos:** todos en español, con su inglés en `content/cap1/en.js` (por ejemplo «Eco Amplificado» → «Amplified Echo», «Eco Dirigido» → «Focused Echo», «Eco Protector» → «Protective Echo»). Los números van como `{}`.

## 8. Pruebas `AV.v18EvolucionTest()` (las recoge `--extra`)
1. Curva: `T(10) = 396`, `T(20) = 1406`, `T(40) = 5226`; `nivel(xp)` es monótono y se limita a 40.
2. Migración: un v1 sintético con especies, inventario y mundo pasa a v2 con todo intacto y `evo` por defecto. Un `evo` corrupto (xp negativa, nivel 99, variante rara) se sanea.
3. Guardar → `recargar()` → se conservan XP, nivel, variante, alianza y `alianzaSel`. Se restaura la clave original al acabar, como en `v18Test`.
4. Topes:
   - 20 victorias en un día dan como máximo 360 XP de duelo.
   - Una derrota sin quitar plumas da 0.
   - El duelo de 2 da 0.
   - Los hitos no se repiten.
   - Al cambiar de fecha se reinician los topes diarios.
5. Etapas:
   - `ajustar()` en los niveles 1, 10 y 20 da los números de §4.
   - Sin `f.nivel`, devuelve el mismo objeto `h`.
   - Los topes (espera ≥ 5, alcance ≤ 11, plumas 0) se cumplen en todas las etapas.
6. En el duelo real (`G.v18combate.iniciar({ especie: 'vittata', sinCuenta: true })`):
   - Con nivel 20, el grito alcanza a 10 m y no a 12 m.
   - Una semilla rival dentro del cono desaparece.
   - Con nivel 1, se comporta igual que hoy.
7. Subida de nivel: al ganar con XP en 380 se pasa a nivel 10, con `toast` y evento `v18 {tipo:'evo'}`. La etapa cambia en el siguiente `iniciar`.
8. Alianza:
   - Bloqueada sin Arausiaca o con nivel < 10.
   - Pasa a `disponible`, luego el desafío (interrupciones ≥ 2) la deja en `desbloqueada`.
   - H y el botón la lanzan: onda, escudo de 2 s, energía −60, espera de 14 s, grito en espera.
   - Con un escudo activo no sale.
   - Ala fuerte rompe su escudo.
9. Táctil simulado: `.vd-ali` es visible, no se solapa con `#b-diario` ni con los botones grandes, y mide ≥ 44 px.
10. Regresión: `AV.v18Test`, `v18CombateTest`, `v18NuevasTest`, `v18Duelo2Test`, `v18MinigolfTest` y `v18CicloTest` siguen en verde, y `saveTest` también.

## 9. Riesgos y mitigación
- **Romper partidas:** el v2 solo añade `evo`. El test 2 cubre la migración y la vuelta atrás.
- **Romper el combate:** los ganchos son opcionales (`G.v18evo?.`). Con nivel 1 o sin evo, los números son exactamente los de hoy, y lo verifica `v18CombateTest`.
- **Desequilibrio:** topes fijos en §4 y §6. La Campeona no sube. Pendiente: medir el % de victorias en los niveles 1, 10 y 20 en las pruebas de equilibrio (entregable 5).
- **Farmeo:** topes diarios, 0 XP en duelos vacíos y en el duelo de 2. La fecha es local: cambiar el reloj solo adelanta los topes diarios, no los hitos (aceptable, sin competición online).
- **Conflicto de teclas:** H no se usa hoy (grep en engine/game/ui). Se captura solo en el duelo.
- **Móvil:** un botón más y ningún draw call nuevo. Los fx se reutilizan (InstancedMesh ya existentes).
- **Decisiones para Kelvin (no tomadas aquí):** los nombres definitivos en inglés, si el Grito Maestro entra en el prototipo, las otras 5 alianzas y los elementos de fantasía. Quedan fuera del prototipo.

## 10. Resultado del prototipo (6-nov, sin publicar)
Código: `src/game/v18/evolucion.js` (nuevo) y ganchos en `progreso.js` (v2 + `evo()`/`cambiarEvo()`/`copia()`), `habilidades.js` (`ver()`, `f.alianza`, `puede`, `ctx.desviar`/`ctx.apoyo`), `combate.js` (nivel del jugador, H, `.vd-ali`, línea Nv/XP, `{especie, dura, interrupciones, quitadas}` en win/loss, apoyo con el retrato existente), `descubrir.js` (ficha y fila de alianza en Mis cotorras), `boot.js`, `content/cap1/en.js` (24 textos). Cambios respecto al diseño: el botón de la alianza es uno solo, dentro del panel del jugador, en computadora y en táctil (56 px en táctil); la tarjeta de etapa/alianza va arriba y no bloquea; el Grito Maestro (30+) no entra (sigue Eco Dirigido).
- **Medido en el duelo real** (`AV.v18EvolucionTest`, 45/45): alcance que acierta nv 1 = 7 m (no 9), nv 10 = 9 m (no 11), nv 20 = 11 m (no 13); empuje a 7 m 3,70 → 4,19 → 4,43 m; interrupción 1,1 → 1,2 → 1,4 s; a 38° solo acierta el Eco Amplificado y a 30° el Eco Dirigido falla (cono estrecho); el Eco Dirigido deshace la semilla rival de su cono. El grito nunca quita plumas.
- **XP**: 20 victorias/día = 360 (60 ×4, 30 ×4, luego 0); derrota sin plumas o < 20 s = 0, peleada = 25; duelo de 2 = 0; minigolf 3 nidos/día; tope repetible 700/día; hitos una vez. Ritmo simulado con las fuentes reales: nv 10 tras la 1.ª sesión, 17 tras la 2.ª, 21 tras la 3.ª.
- **Eco Protector**: −60 energía, recarga 14 s, grito en espera 5 s, escudo 2,0 s que para un golpe (Ala fuerte lo rompe), no sale con escudo puesto. Quien solo lo machaca (con el grito) pierde contra la Campeona en ~8 s sin quitarle plumas.
- **Equilibrio (pendiente con personas)**: las dos jugadoras automáticas de ritmo humano (cuerpo a cuerpo y a distancia) ganan 6/6 en nv 1, 10 y 20 en ~8-12 s: la Campeona actual es floja contra puntería perfecta, así que el % de victorias no separa niveles; el nivel se nota en interrupciones y duración. Medir con niños y, si hace falta, subir la IA (no la toca este prototipo).
- **Decisiones de Kelvin** (sin tomar): nombres en inglés (provisionales «Amplified Echo», «Focused Echo», «Protective Echo»), Grito Maestro, las otras 5 alianzas, elementos de fantasía.

## 11. Producto (bloque B.1, 8-nov, sin publicar)
Código: `src/game/v18/evolucion.js` (el bloque de comentario de arriba documenta las etapas y las 6 alianzas), `combate.js` (`stats.poderJ` en el evento de fin y retrato de la compañera de cada alianza), `progreso.js` (prueba de migración) y `content/cap1/en.js`.
- **Niveles 1–40 en las 34 especies:** Aprendiz (1–9, el poder de hoy) · Despertar (10, número principal ×1,12 y espera ×0,92) · Guardián (20, ×1,24, espera ×0,88 y secundaria por técnica) · Maestro (30, ×1,35 con tope por poder, espera ×0,85 y destellos dorados). Vittata y Arausiaca conservan sus etapas; Vittata suma Grito Maestro en el 30 (11 m, ±35°, deshace semillas).
- **Seis alianzas, una por elemento:** Eco Protector (eco), Lluvia Guiada (naturaleza), Viento Cruzado (viento), Destello del Pitón (luz), Marea de Lluvia (agua) y Ráfaga Volcánica (fuego). Todas cuestan 60, recargan 14 s, bloquean el poder propio 5 s y quitan como mucho 1 pluma. Explorando, la compañera añade un efecto con los fx que ya existen.
- **XP nueva:** hoyo de minigolf completo 40, oro 60, victoria perfecta 50 y 3 duelos ganados 60 (una vez). Las demás, igual que en el prototipo.
- **Pruebas:** `AV.v18EvolucionTest` (curva 1–40, las 34 especies, secundarias medidas, las 6 alianzas en el duelo real y explorando, XP de cada actividad, migración, ficha) y `AV.v18Test` (v1 → v2 y conservación de `evo`).
- **Para Kelvin (sin decidir):** los nombres de las 5 alianzas nuevas y sus parejas, sus nombres en inglés y qué elemento lleva cada una; si el desafío de las alianzas debe ser una misión propia en vez de «ganar usando tu poder 2 veces»; el equilibrio con personas (la Campeona actual pierde contra los bots en todos los niveles).
