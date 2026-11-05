# Auditoría técnica de datos · Amazona Verse

Fecha: 5-nov-2026 · Hecha por la sesión coordinadora (nube) a pedido de Kelvin («Directiva de privacidad infantil», 5-nov). Es una revisión técnica para el abogado, **no** una declaración de cumplimiento legal.

Estados: **VERIFICADO** (comprobado en código o ejecución), **PENDIENTE** (falta confirmar con acceso que la nube no tiene), **BLOQUEADO** (no se puede comprobar desde aquí).

## 1. Ranking en internet: sigue desactivado

| Qué | Evidencia | Estado | Responsable | Próximo paso |
| --- | --- | --- | --- | --- |
| Envío de récords desde el juego | `src/game/records.js`: `publicarRanking` devuelve `'desactivado'` sin tocar la red mientras `G.RANKING_EN_LINEA` no sea `true`; nadie lo enciende (commit 58b9b290) | VERIFICADO | Nube | Mantener apagado |
| Botón «Publicar en el ranking» | No se muestra en `retos.js`, `flight.js` ni `river_rush.js` con el interruptor apagado (58b9b290) | VERIFICADO | Nube | — |
| Página `web/ranking.html` | Dice «en pausa», no pide nada a Supabase y tiene `noindex`; la portada ya no la enlaza (d14a7e1f, sube en la próxima publicación) | VERIFICADO en código; PENDIENTE de publicar | Nube | Publicar |
| Código del ranking | Conservado e inactivo, como pidió Kelvin | VERIFICADO | — | — |

## 2. Peticiones del navegador al cargar

Medido con Chromium automatizado el 5-nov (`audit_priv.json` en el scratchpad de la sesión), contra el árbol de `main` servido en local, con el ranking ya oculto:

| Página | Servidores a los que pide | Envíos (POST/PUT) | Cookies |
| --- | --- | --- | --- |
| Juego (`/juego/`, creador y 8 s de juego) | Solo el propio sitio (193 peticiones) | Ninguno | Ninguna |
| Portada (`/`) | Solo el propio sitio (24) | Ninguno | Ninguna |
| Ranking (`/ranking.html`) | Solo el propio sitio (5) | Ninguno | Ninguna |

Estado: **VERIFICADO** en local. **BLOQUEADO** contra el sitio publicado: la red de este entorno no deja abrir `vercel.app` (403). Comprobación equivalente hecha sobre `sitio/` (lo que se publica): sin Vercel Analytics, Speed Insights, Google Analytics/Tag Manager, Plausible, Hotjar, Segment, Facebook ni Clarity. Los dominios externos que aparecen son enlaces a fuentes (fws.gov, drna.pr.gov, iucnredlist.org…) y a patrocinadores, que solo se abren si alguien hace clic. **PENDIENTE:** que alguien con acceso a la cuenta de Vercel confirme que Web Analytics y Speed Insights están desactivados en el panel.

## 3. Almacenamiento en el aparato

Todo se queda en el navegador del jugador; nada de esto se envía:

| Dónde | Claves | Qué guarda |
| --- | --- | --- |
| `localStorage` | `amazonaverse.save`, `ep2.save` … `ep6.save` | Partida de cada capítulo (perfil del personaje con un nombre inventado elegido de listas, progreso, ropa) |
| `localStorage` | `amazonaverse.temporada`, `.capitulo`, `.menu` | Capítulos terminados y preferencias de menú |
| `localStorage` | `amazonaverse.aula.cap1` … | Progreso del Aula y del Modo Maestro (respuestas, nivel, estación de una lista) |
| `localStorage` | `.criadero`, `.retos`, `.records`, `.trucos`, `.escondite`, `.ciudadVisitas`, `.marana`, `.vecinos`, `.humor`, `.equipos`, `.v18` | Criadero, récords locales, descubrimientos, bandada de la casa, progreso V18.1 |
| `localStorage` | `.rankalias`, `.rankdisp` | Apodo de lista fija y código de aparato al azar del ranking. **Solo se crean si alguien intentó publicar en el ranking**; con el ranking apagado no salen del aparato |
| `localStorage` | `av-web-lang` | Idioma de la portada |
| `sessionStorage` | `ave.look` | Aspecto del personaje durante la sesión |
| Caché del service worker (`sw.js`) | Archivos del propio sitio | Para jugar más rápido; sin datos del jugador |
| IndexedDB, cookies | — | No se usan (medido) |

Estado: **VERIFICADO**. Borrar: «Nuevo estudiante» en el juego, o borrar los datos del sitio en el navegador.

## 4. Supabase (servidor del ranking)

| Qué | Evidencia | Estado |
| --- | --- | --- |
| Proyecto | `muxxdjyxwjxaoziczkcz` (de Fernando), esquema propio `amazona` (`tools/supabase/README.md`) | VERIFICADO (documentación) |
| Tabla `amazona.records` | Guarda reto, marca, duración, apodo de lista fija, **hash SHA-256 con sal del código de aparato y de la IP**, fecha. RLS activado sin políticas: no se lee ni escribe por la API REST (`tools/supabase/migracion.sql`) | VERIFICADO (código) |
| Función `amazona-records` | Valida, limita 20 envíos/hora por aparato y 60 por IP, calcula los hashes (`tools/supabase/amazona-records/index.ts`) | VERIFICADO (código) |
| Plazo de conservación | No hay borrado automático en el código: las filas se quedan indefinidamente | VERIFICADO: **falta política** |
| Filas existentes | Si hubo envíos mientras el ranking estuvo activo (antes del 5-nov), siguen guardadas | **BLOQUEADO**: requiere acceso al panel de Supabase |
| Registros del proveedor (logs de la función, IP) | Supabase guarda registros técnicos según su plan | **PENDIENTE**: revisar en el panel y en las condiciones del proveedor |
| Quién tiene acceso administrativo | — | **PENDIENTE**: Fernando / Kelvin |

**Próximo paso recomendado:** que Fernando cuente las filas de `amazona.records` y, mientras no haya revisión legal, las borre o las archive fuera del servidor; y que se decida si se apaga la función.

## 5. Vercel (alojamiento)

| Qué | Evidencia | Estado |
| --- | --- | --- |
| Configuración | `sitio/vercel.json`: solo caché y cabeceras `nosniff` y `strict-origin-when-cross-origin` | VERIFICADO |
| Registros de peticiones (IP, navegador) | Vercel guarda registros técnicos según el plan contratado | **PENDIENTE**: confirmar en el panel plazo y acceso |
| Analytics / Speed Insights | No hay su código en `sitio/` | VERIFICADO en archivos; **PENDIENTE** confirmar en el panel |
| Quién despliega | Las sesiones coordinadoras con el token de la cuenta | **PENDIENTE**: lista de personas con acceso |

## 6. Otras salidas de datos

| Qué | Evidencia | Estado |
| --- | --- | --- |
| Formulario de contacto de la portada | `web/assets/js/web.js`: solo envía si `CFG.formulario` tiene valor; está vacío | VERIFICADO (apagado) |
| Compartir el cómic y los récords | Menú del sistema o descarga, detrás de la puerta de adulto; no pasa por ningún servidor | VERIFICADO |
| Fuentes de letra | Servidas desde el propio sitio, sin Google Fonts (cab363a0) | VERIFICADO |
| Bibliotecas | Three.js y demás van dentro del sitio (`assets/vendor/`); no hay CDN externos en el juego | VERIFICADO (medición de la sección 2) |
| Chat, cuentas, publicidad, analítica | No existen en el código | VERIFICADO |
