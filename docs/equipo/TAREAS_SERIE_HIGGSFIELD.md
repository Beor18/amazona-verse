# TAREAS · Serie animada de Amazona Verse con Higgsfield

**Encargo de Kelvin (27-nov):** probar una serie animada para YouTube e Instagram, y más adelante quizás vender los derechos a la televisión. Se hace con Higgsfield, a partir de lo que ya tenemos: personajes, mundo e historia. Si hace falta, se crean personajes nuevos.

- **Quién la lleva:** la sesión de Claude web. Es la dueña de esta tarea y coordina sola.
- **Objetivo:** que niños y adultos se queden pegados.
- **Orden:** primero todo lo que salga gratis, luego una prueba.

## Reglas de esta tarea
1. **Créditos de Higgsfield.**
   - Primero mira el saldo y las generaciones gratis (`balance` y `show_plans_and_credits`).
   - Usa solo lo gratis (`use_free_gens`, `max_credits: 0`) hasta que Kelvin apruebe un presupuesto.
   - Antes de cualquier generación con créditos, pásale a Kelvin el precio (`estimate_*_cost`) y espera su «sí».
2. **Canon, historia, arte, dinero y legal son de Kelvin.**
   - Se proponen y él escoge.
   - Los personajes nuevos y los diseños (Iguaca, la Abuela, el Papá) son propuestas hasta que él diga sí. Se anotan en `docs/CANON_REGISTRY.md` como PROVISIONAL.
3. **Vittata no se cambia.** Las referencias salen de `assets/models/vittata.glb` tal cual.
4. **Propiedad intelectual (clave para la televisión).**
   - **Las cotorras son de Kelvin:** él pagó los modelos y las pieles (los 22 .blend, `vittata.glb` y `assets/textures/pieles/`). Están aprobadas para subir a Higgsfield y para la serie (Kelvin, 27-nov).
   - No subas a Higgsfield renders de los templos ni de los árboles de KitBash3D y Archmodels. Tampoco las cotorras cosplay (Mario, Joker…): el modelo es de Kelvin, pero el personaje es de Nintendo y DC. Su licencia comercial no está comprobada (`docs/ASSET_AUDIT.md`, `docs/COMIC_SERIES_BIBLE.md`).
   - Los fondos de la serie se generan nuevos en Higgsfield, inspirados en Puerto Rico y en `docs/img/referencia_mapa_kelvin.jpg`.
5. **Bandera de Puerto Rico:** solo si sale fiel (`docs/BANDERA_PR_GUIA.md`).
6. **Público de todas las edades.** El gancho es la aventura y el humor. Nada de «aprende ciencia» y nada que asuste o sea violento.
7. **No publiques en redes nada.** Ni TikTok, ni Instagram, ni YouTube. Kelvin decide qué sale y cuándo.
8. Si tu sesión tiene el skill `higgsfield-academy-kelvin` o `estudio-kelvin`, úsalo para ahorrar créditos.

## Fuentes (todo en este repo)
| Qué | Dónde |
|---|---|
| Vittata 3D | `assets/models/vittata.glb` |
| Ingeniera, Tuerca, Chispa, Maestro Moon, Constructor, Guardián del vuelo, Máquina del puerto | `assets/models/personajes/*.glb` |
| Retratos ya hechos | `assets/retratos/v18/*.jpg` |
| Pieles de las 36 especies (Iguaca y su familia son *A. vittata*) | `assets/textures/pieles/*.jpg`, `content/comun/especies.js` |
| Ficha de cada personaje (rol, estados, diálogos) | `content/comun/personajes_v18.js` |
| Historia y temporadas | `docs/STORY_BIBLE.md`, `docs/CANON_REGISTRY.md` |
| Guion del cap. 1 y del cómic | `docs/CHAPTER_01_SCRIPT.md`, `docs/COMIC_SERIES_BIBLE.md`, `content/cap1/dialogos_cap1.json` |
| Paleta y letras | `docs/COMIC_SERIES_BIBLE.md` (verde selva, naranja pico, rojo frente, azul río, dorado) |
| Música y efectos (Suno) | `assets/audio/`, `docs/BANDA_SONORA.md` |
| Mapa de referencia (estilo) | `docs/img/referencia_mapa_kelvin.jpg` |

Los .blend originales de Kelvin no están en el repo. Hoy no hacen falta.

## Fases
- [ ] **S1 · Paquete de personajes (gratis).**
  - Renderiza cada personaje desde su .glb con el Chromium de la sesión (Three.js), sobre fondo neutro: de frente, de lado, de 3/4 y en una pose de acción.
  - Guárdalo en `docs/serie/personajes/<id>/`.
  - Escribe una ficha corta por personaje en `docs/serie/PERSONAJES.md`: aspecto, personalidad, cómo habla y qué quiere.
- [ ] **S2 · Subir a Higgsfield (gratis).**
  - Sube esas imágenes (`media_upload` → `media_confirm`).
  - Crea un elemento o personaje por cada uno (`elements_create`), para que salgan iguales en cada toma.
  - Anota los ids en `docs/serie/HIGGSFIELD_IDS.md`. Son ids, no claves.
- [ ] **S3 · Biblia de la serie.**
  - `docs/serie/BIBLIA_SERIE.md`: premisa, tono, el formato (episodios de 60 a 90 s para redes y 11 min para la televisión) y cómo cada episodio termina con gancho.
  - **3 ideas de piloto** para que Kelvin escoja.
  - Parte de la temporada 1 «El mundo roto»: Vittata quiere hacerlo todo sola y aprende a trabajar con Iguaca y los 36.
- [ ] **S4 · Personajes que faltan (propuesta).**
  - Iguaca, la Abuela y el Papá: todos *A. vittata*, pero que se distingan de Vittata por la edad, el porte o un rasgo propio.
  - Haz 2 o 3 propuestas de cada uno con generaciones gratis. Kelvin escoge.
- [ ] **S5 · Prueba (con el «sí» de Kelvin).**
  - Guion gráfico de 6 a 8 tomas de la idea escogida.
  - Pasa el presupuesto a Kelvin y, si dice sí, genera un teaser de 30 a 60 s, con música de Suno del repo.
- [ ] **S6 · Paquete para vender a la televisión (después).**
  - Una página de presentación con la biblia, los personajes, el teaser y el plan de la temporada.
  - Más la lista de licencias que hay que tener limpias.

## Al avanzar
- Marca cada fase con el commit y una línea de resultado.
- Registra la tarea en `REGISTRO_TAREAS.md`.
- Avisa a Kelvin en 3 líneas al cerrar cada fase, sobre todo cuando le toque escoger.
- Commits pequeños, solo de `docs/serie/` y de este archivo. Haz `git pull --rebase` antes de cada push.
- No toques `src/`, `sitio/` ni el juego.

## Bitácora
- 27-nov · La coordinadora (Claude Code) abre la tarea por encargo de Kelvin. El piloto de 60 a 90 s queda propuesto. La llevará Claude web.
