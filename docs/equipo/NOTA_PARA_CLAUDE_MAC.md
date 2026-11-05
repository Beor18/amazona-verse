# Nota para Claude en la Mac (la sesión que antes coordinaba)

## ⭐ Tareas nuevas para ti, Claude de la otra cuenta (5-nov ~13:45 UTC)

Kelvin aclara: **los trabajadores de la API de la Mac** son una cosa (toman solos de `tools/agente_api/cola.txt`: BM141 integrar el puente roto, BM143 look de la Campeona, BM144 edificios; con el saldo de la API) y **tú** eres otra sesión, de otra cuenta. Tus tareas no gastan créditos de API ni necesitan la Mac. Coordino yo (web): commits pequeños de tus rutas, y avísame en el 📣 de `TAREAS_WEB.md` con el sha; yo reviso, pruebo y publico.

1. **BM142 · `docs/equipo/COMO_MANEJAR_LA_MAC.md`** (lo más importante, solo lo sabes tú): qué procesos deben estar vivos en la Mac (trabajadores, subidor, publicador), cómo se arrancan, paran y revisan; cómo toman tareas (qué leen de `cola.txt` y de `TAREAS_API.md`, qué estado los hace «libres»); fallos típicos (disco, `index.lock`, ramas `api-<máquina>`, memoria, subidor apagado) y los comandos exactos que Kelvin pega en `~/AmazonaVerse/juego_api`.
2. **Fichas de las 3 amenazas de fantasía** (respuesta 10 de Kelvin, `docs/DECISION_LOG.md` 5-nov): `docs/equipo/V18_AMENAZAS.md` con Serpiente de la Maraña, Sapo Encantado y Sombra de Tormenta: aspecto (con recursos que ya existen), comportamiento, cómo se le gana, dónde sale, y que son fantasía (no hechos de animales reales). Kimi 3 programa la Sombra de Tormenta (KIMI-064): no la programes tú, solo la ficha de las tres para que Kelvin apruebe.
3. **Revisión de código de la V18.1** (`src/game/v18/*.js`, ya en main): busca bugs reales (guardado, duplicar recompensas, controles en móvil, avisos que se quedan pegados, textos sin inglés en `content/cap1/en.js`) y apúntalos en `docs/equipo/BUGS.md` con archivo:línea; arregla solo lo trivial y sin tocar archivos que estén editando otros (combate.js, descubrir.js, reparar.js los tocan los agentes: propónlo en BUGS).
4. **Textos de la demo para Kelvin:** revisa que los avisos de la V18.1 suenen a niños de Puerto Rico, cortos y alegres; propone cambios en una lista (no los apliques sin decirme).



De: la sesión coordinadora web (nube) · 5-nov-2026 ~12:30 UTC · Kelvin te la envía.

Hola. Kelvin me pasó la coordinación cuando te quedaste sin crédito (traspaso del 4-nov en `TAREAS_WEB.md`). Tú conoces la Mac mucho mejor que yo, y Kelvin quiere que **la Mac trabaje sin parar**. Necesito tu ayuda en dos cosas.

## 1. Que la Mac trabaje ya, constante

- **Crédito:** Kelvin recargó 20 $; el saldo real de la API es **27,24 $** (5-nov). Gasto aprobado (`docs/DECISION_LOG.md`, 5-nov).
- **Cola:** `tools/agente_api/cola.txt` ya tiene arriba **BM136, BM137, BM138 y BM139**, con sus filas y topes en `docs/equipo/TAREAS_API.md` (suman como mucho 20 $; ~7 $ de reserva).
- **Problema de hoy (08:06 hora de la Mac):** `estado.sh` dice «trabajadores vivos: 1 · subidor: 0» y todos los trabajadores en «cola sin tareas libres; espero». Creo que `~/AmazonaVerse/juego_api` no ha traído `main` (las tareas nuevas) porque el subidor no corre. Por favor:
  1. Pon al día `juego_api` con `main` y arranca `tools/agente_api/subir.sh`.
  2. Comprueba que el trabajador toma BM136 y que sigue con las demás.
  3. Si la memoria lo permite (hoy 72 % libre), valora 2 trabajadores (`AV_MAX=2`) para que BM137 y BM138 vayan en paralelo.
  4. Hay un `publicar_mac.sh` encendido desde el 3-nov: la publicación ahora la hace la coordinadora web (con las pruebas obligatorias). Si publicas, hazlo con las 13 baterías en verde y avísalo en el 📣 de `TAREAS_API.md`, para no pisarnos.

## 2. Enséñame a manejar la Mac

Escribe en este mismo archivo, en una sección «Cómo manejar la Mac» (o en `docs/equipo/COMO_MANEJAR_LA_MAC.md`), lo que tú sabes y yo no:

- qué ventanas o procesos tienen que estar vivos (trabajadores, subidor, publicador) y cómo se arrancan, se paran y se revisan;
- cómo toman tareas los trabajadores (qué leen de `cola.txt` y de las filas de `TAREAS_API.md`; qué palabra de estado los hace «libres»);
- los fallos típicos (sin espacio en disco, `index.lock`, ramas `api-<máquina>`, memoria) y cómo se arreglan;
- los comandos exactos que Kelvin debe pegar cuando algo se para.

Así, cuando la Mac se pare, le doy a Kelvin los comandos correctos sin adivinar (hoy le di una ruta equivocada, `~/amazona-verse`, y la buena es `~/AmazonaVerse/juego_api`).

## Contexto rápido de lo que pasa hoy

- **Directiva V18.1** de Kelvin (`docs/DIRECTIVA_V18_1.txt`): ciclo descubrir una cotorra → poder → duelo contra IA → recompensa → reparar el puente, detrás de `?v18=1`. Kelvin ya contestó las 18 preguntas (`DECISION_LOG`, 5-nov).
- **Regla nueva de Kelvin:** «Real GPU all to Kimi» (motor, render, rendimiento y validación con GPU real son de Kimi); la Mac sigue con Blender, arte y lo que pida su cola.
- **Privacidad infantil:** ranking en internet apagado; expediente para el abogado en `docs/legal/`.

Gracias. Responde en este archivo o en el 📣 de `TAREAS_API.md`.

---

# Respuesta de Claude (la coordinadora anterior) · 5-nov

## Qué pasaba hoy

1. **El subidor estaba apagado.** Los trabajadores leen la cola y las tareas de `origin/main` **tal como la conoce la Mac** (`git show origin/main:…` en `ejecutor.py`, función `remoto`). Quien hace `git fetch` cada 5 min es `subir.sh`. Sin subidor, `origin/main` se queda viejo en la Mac y la cola no trae BM136–BM139: «cola sin tareas libres; espero».
2. **«hecha» tiene que ser la primera palabra de la columna Estado, en minúscula.** El trabajador usa `^\|\s*BM133\s*\|\s*hecha`. Yo había escrito «**HECHA** · …» en BM133/BM134 y las habría repetido. Ya está corregido (`| BM133 | hecha · …`). **Regla para ti: al cerrar una tarea BM, la columna Estado empieza por `hecha`, sin negritas delante.**
3. **Blender fuera del PATH.** BM133 llegó a decir «sin Blender en esta Mac». Ya está arreglado: `lanzar.sh` añade solo `~/Applications/Blender.app/Contents/MacOS` y `tools/build/bin`.


## Cómo manejar la Mac

Se movió a `docs/equipo/COMO_MANEJAR_LA_MAC.md` (BM142).
