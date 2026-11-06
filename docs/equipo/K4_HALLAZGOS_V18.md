# K4-05 · Revisión de código de `src/game/v18/` — hallazgos

Kimi 4a, 6-nov-2026 (~13:55 UTC). Solo lectura. Revisados enteros: `progreso.js` (b93aaa14), `ciclo.js` (3dce2882), `descubrir.js` (1f444494), `amenaza.js` (0f4e2690), `reparar.js` (f706cf99), `nuevas.js` (b518f91d) y `duelo2.js` (2a2da056). Los ocupados por otras sesiones (`combate.js`, `minigolf.js`, `evolucion.js`, `habilidades.js`) no se tocaron.

**Por qué un documento y no BUGS.md:** `BUGS.md` pesa 307 KB y desde la nube no se puede editar entero sin riesgo de truncarlo. Los ids QA-18x son **propuestos** (el siguiente libre a 6-nov es QA-181, según V18_TABLERO.md); quien los vuelque a `BUGS.md` desde la PC debe confirmar el número contra la última fila.

## Hallazgos

### QA-181 (propuesto) · Media · Orden de carga frágil: dependencias capturadas al cargar el módulo
- `amenaza.js:20` — `const S = G.S, H = G.v18hab, V = G.v18`: si `habilidades.js` o `progreso.js` cargaran después, `iniciar()` rompería en `H.luchador(...)`.
- `duelo2.js:22-23` — `const H = G.v18hab, Cb = G.v18combate; const sitio = Cb.sitio`: si `combate.js` no ha cargado, el módulo entero lanza TypeError **al cargar** (leer `.sitio` de undefined) y no llega a instalarse.
- `nuevas.js:35` y `nuevas.js:120` — `const V = G.v18` y el `setTimeout(0)` inicial llama `revisar(false)` → `h.cuando()` → `V.cuantos(...)`: TypeError si `progreso.js` aún no existe.
- Contraste dentro del propio directorio: `descubrir.js` y `reparar.js` sí usan respaldo perezoso (`G.v18 || window.AVV18Progreso(G)`).
- Hoy no falla porque `src/boot.js` los carga en orden. **Propuesta:** mismo respaldo perezoso en los tres, o una línea en `boot.js` que fije el orden como contrato. Sin prueba nueva necesaria (cubierto por las baterías si se hace el respaldo).

### QA-182 (propuesto) · Baja · El aviso «¡Cuidado, va a soplar!» solo sale una vez por sesión
- `amenaza.js:355` pone `A.avisoDicho = true`, pero `iniciar()` (`amenaza.js:189`, el `Object.assign` que reinicia el encuentro) no lo devuelve a `false`. Del segundo encuentro en adelante la ráfaga sopla sin el aviso de texto (el brillo de la nube sí avisa siempre).
- **Propuesta:** si es a propósito, comentarlo junto a la variable; si no, añadir `avisoDicho: false` al `Object.assign` de `iniciar()`.

### QA-183 (propuesto) · Baja · Marcas de victoria guardadas como ítems de inventario
- `ciclo.js:91` — `V.otorgar('duelo_gana_' + sp, 'victoria_' + sp, 1)` usa el inventario V18 (`inv`) solo como marca idempotente; igual en `nuevas.js` (`victoria_duelo`, `victoria_otra`, `victoria_perfecta`) y `amenaza.js` (`victoria_sombra`). Funciona, pero si alguna UI llega a listar `inv` del almacén V18 aparecerían objetos fantasma («victoria_vittata»).
- **Propuesta:** marcas sin ítem (un mapa aparte en el almacén o `n = 0` con convención documentada). Cosmético hoy.

### QA-184 (propuesto) · Baja · Reservas de memoria en cada cuadro
- `amenaza.js:319` — `ANCLAS(A.giro)` crea un array de 4 objetos en cada `mover(dt)`; `amenaza.js:310` — `[-1, 1].forEach(...)` por cuadro en `dibujar`.
- `reparar.js:269` — `pideMover()` crea el array `['w','s','a','d','arrowup',...]` en cada llamada; `reparar.js:347` — `paso()` llama a `centro()` (objeto nuevo) por cuadro con el puente reparado.
- `duelo2.js` — `leerMando()` devuelve `{ x, y, correr }` nuevo por cuadro durante el duelo.
- **Propuesta:** constantes y búferes reutilizados a nivel de módulo. Solapa con K4-13 (rendimiento): quien la haga puede empezar por aquí.

### QA-185 (propuesto) · Muy baja · `leer()` acepta un array como almacén válido
- `progreso.js:25` — `typeof [] === 'object'`, así un JSON que sea un array pasa el filtro y se «migra» con `Object.assign` (índices numéricos como claves). Sin daño real hoy (nadie escribe arrays ahí), pero un `Array.isArray(d)` temprano lo haría a prueba de datos corruptos.
- **Propuesta:** `if (!d || typeof d !== 'object' || Array.isArray(d) || d.v !== V) …`.

## Lo que se buscó y NO se encontró
- **Variables sin definir:** ninguna; todos los símbolos se resuelven dentro del módulo o en `G.*` con guarda.
- **Fugas de oyentes:** los `addEventListener` de `amenaza.js` y `duelo2.js` se quitan en `soltar()`; los `G.on(...)` se registran una sola vez por módulo (guarda `if (G.v18…) return` al inicio).
- **Guardados que dupliquen premios:** ninguno; el diseño es idempotente (`otorgar` por clave, marca en `mundo` antes de sumar al inventario) y las pruebas lo cubren («Repetirla no da el premio otra vez», «Tras recargar no vuelve a cobrar»).
- **Textos sin inglés:** sondeo de 12 cadenas de la V18 en `content/cap1/en.js` (154 KB, main a 6-nov ~13:55 UTC), incluidas las de la tanda C de KIMI-156 («Canto real», «Eco de la Cordillera», «A ras del agua»): todas tienen entrada en inglés.

## Nota de coordinación
Mientras se hacía esta revisión, `nuevas.js` y `reparar.js` cambiaron en main (tanda C del Álbum, KIMI-156; instrumentación de QA-162 en la prueba de `reparar.js`). Los hallazgos se verificaron contra esas versiones (SHA arriba).
