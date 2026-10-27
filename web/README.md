# Amazona Verse · página web

Landing del producto para escuelas, familias, aliados e inversionistas. Es HTML, CSS y JS estático en un solo `index.html`, con imágenes y video en `assets/`. No hace falta build ni dependencias; lo único externo son las fuentes de Google Fonts (Fredoka y Atkinson Hyperlegible, las mismas del juego).

## Antes de publicar
Edita el bloque `window.AV_WEB` al final de `index.html`:

| Clave | Qué es | Valor hoy |
|---|---|---|
| `correo` | Correo público de contacto | `''` · **por confirmar (lo decide Kelvin)**. Vacío muestra "Correo por confirmar". |
| `formulario` | Envío real del formulario de contacto | `''` en el artifact. En hosting: `'netlify'` o la URL de Formspree. |

Con `formulario` vacío el formulario queda oculto y el contacto es el correo en texto con botón **Copiar** y un mensaje modelo copiable.

## Verlo en local
```
~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11 -m http.server 8790 --directory ~/AmazonaVerse/Web
```
Abre http://127.0.0.1:8790. Con doble clic sobre `index.html` también funciona, pero no se comprueba si existen los videos.

## Publicar
**Netlify (recomendado).** Arrastra la carpeta `Web/` a app.netlify.com/drop, o conecta el repo con *Publish directory* `.` y sin comando de build. `netlify.toml` ya trae cabeceras de caché y seguridad. Para el formulario, pon `formulario: 'netlify'`: Netlify detecta el `<form name="contacto" data-netlify="true">` al desplegar y guarda los mensajes en *Forms*.

**GitHub Pages.** Sube el contenido de `Web/` a un repo y activa *Settings → Pages → Deploy from branch* (`main`, carpeta raíz). El archivo `.nojekyll` evita que Jekyll toque los assets. GitHub Pages no recibe formularios: usa Formspree (`formulario: 'https://formspree.io/f/XXXX'`) o deja solo el correo.

**Vista previa como Claude artifact.** Publica `index.html` con sus assets como archivos de apoyo (`files`: `assets/img/*`, `assets/favicon.svg`, `assets/og.jpg` `assets/video/videos.json` y, cuando existan, los videos). Ahí los formularios no envían, `mailto:` puede fallar y `<a download>` no funciona; por eso el contacto es texto copiable. Deja `formulario: ''`.

**Dominio.** Cuando haya dominio, cambia `og:image` a una URL absoluta (`https://dominio/assets/og.jpg`) para que las redes muestren la imagen.

## Video
Los loops van en `assets/video/` con estos nombres: `hero.mp4` y `hero.webm` (tomas `gancho_vuelo_mirador` y `mundo_dron_dosel` de `Juego/docs/pitch/TOMAS.json`). Formato: H.264 yuv420p con faststart, sin audio, ≤4 MB, 6–10 s en bucle; WebM VP9 opcional. Al dejar el archivo, añade su entrada en `assets/video/videos.json`, por ejemplo `"hero": {"mp4": "assets/video/hero.mp4", "webm": "assets/video/hero.webm"}`. Con `null` (o sin servidor) se ve el póster; así no hay peticiones 404. Solo carga cuando la sección se acerca a la pantalla, no se reproduce sola con *movimiento reducido* y siempre tiene botón de pausa.

**Video pitch (2:45).** Va en Prensa y queda oculto hasta que `videos.json` traiga `"pitch"` con `mp4`, `poster` y `vtt`. Los subtítulos `pitch.es.vtt` y `pitch.en.vtt` ya están hechos: texto de `Juego/docs/pitch/VO.txt` con la grafía real; tiempos de los bloques de `_trabajo_claude/pitch/audio/tiempos.json` (FINAL v1) y pausas medidas en `stems/voz.wav`. Si cambia la mezcla, vuelve a ajustarlos con esos dos archivos. Se reproduce solo cuando la persona pulsa Play y muestra los subtítulos del idioma elegido.

Hoy hay cinco loops: hero, historia, aprender, ropero y criadero. Para añadir otro, copia un bloque `.loop-fig` (`.screen.loop[data-video]`), cambia `data-key` y el póster, y añade la clave en `videos.json`.

## Reglas de contenido
- Vittata y los personajes se usan tal cual vienen del juego; no se retocan.
- Bandera de PR: solo `assets/img/bandera-pr.svg`, copia exacta de `Juego/docs/img/bandera_pr_referencia.svg` (ver `Juego/docs/BANDERA_PR_GUIA.md`), escalada sin deformar y nunca junto a algo que se venda.
- Nada de cripto, NFT ni cajas sorpresa. Sin cifras ni testimonios inventados: cada dato lleva su fuente.
- Decisiones de la web: `docs/DECISION_LOG.md`. Capturas de revisión: `docs/*.png` y, con `tools/build/web_capturas.py` (375 px y escritorio, comprueba desborde horizontal), `Juego/docs/img/web_*.jpg`.

## Estructura
```
index.html            homepage enfocado (ES/EN con el selector; el texto de cada idioma está en el HTML): una propuesta,
                      «Jugar gratis», los 6 capítulos, minijuegos y top récords, conservación corta, escuelas (resumen),
                      fundadores, sponsors y contacto corto. Historia, ropero, criadero, flora y tecnología van en desplegables.
cotorra.html          conservación: la cotorra puertorriqueña, por qué está en peligro, el programa y cómo ayudar (con fuentes)
escuelas.html         aprender (objetivos y misión), Modo Maestro, piloto gratis, aliados, prensa y contacto completo
retos.html            tarjeta para compartir los minijuegos (redirige a index.html#minijuegos)
sitemap.xml, robots.txt  SEO; sitio.sh los copia a la raíz del sitio publicado
assets/css/web.css    estilos compartidos por las tres páginas
assets/js/web.js      idioma, menú móvil, videos diferidos (en móvil no se descargan los loops), copiar, contacto
assets/img/           imágenes optimizadas (JPEG/PNG) y bandera SVG
assets/video/         loops del juego y videos.json (pendientes del editor de video)
assets/og.jpg         imagen para redes (1200×630)
assets/favicon.svg
netlify.toml, .nojekyll
docs/                 DECISION_LOG.md y capturas
```
