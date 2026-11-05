# Cómo manejar la Mac (BM142)

Guía para la coordinadora y para Kelvin. La escribió la sesión que coordinaba la Mac antes (5-nov). Si algo cambia en `tools/agente_api/`, actualízala aquí.

**Resumen en 4 líneas**
1. Carpeta: `~/AmazonaVerse/juego_api`. Tienen que estar vivos **1–2 trabajadores, 1 subidor y 0 publicadores**.
2. A la Mac se le da trabajo con una fila en `docs/equipo/TAREAS_API.md` (Estado `libre · Mac`) y su ID en `tools/agente_api/cola.txt`, subidos a `main`.
3. Una tarea está cerrada solo si su Estado empieza por `hecha` (en minúscula, sin negrita delante).
4. Si la cola parece vacía con tareas dentro, casi siempre es que el subidor está apagado o que el router bloquea GitHub (hotspot del iPhone).

**Las reglas del repo siguen vigentes:** nada de claves en archivos ni mensajes, nada se borra para siempre (va a la Papelera) y no se cierran apps de Kelvin.

**Carpeta: `~/AmazonaVerse/juego_api`** (no `~/amazona-verse`). Registros: `~/AmazonaVerse/logs_api/`. Gasto: `~/AmazonaVerse/_herramientas/agent-sdk/gastos.jsonl`.

### Qué tiene que estar vivo

| Proceso | Para qué | Cuántos | Cómo se ve en `estado.sh` |
|---|---|---|---|
| `ejecutor.py --cola` (lo arranca `lanzar.sh`) | Trabajadores: toman tareas BM de la cola y hacen commit (no push) | 1–2 (`AV_MAX`); con 3 o más la Mac se queda sin memoria | «trabajadores vivos: N» |
| `subir.sh` | Cada 5 min: `fetch` y sube los commits a `main` (o a la rama `api-Kelvins-iMac` si `main` se movió y no puede unir); con la carpeta limpia trae `main` | **1, siempre** | «subidor: 1» |
| `publicar_mac.sh --continuo` | Publicar el sitio | **0**: publica la coordinadora en la nube. Con dos publicadores la Mac se quedó sin memoria, y con el de la nube choca en `sitio/` | «publicador: 0» |

Cada trabajador ya corre bajo `caffeinate -i`, así que la Mac no se duerme mientras trabaja. Si Kelvin quiere también la pantalla despierta: `caffeinate -dims` en otra ventana.

### Cómo toman tareas los trabajadores

- **Leen la cola de `tools/agente_api/cola.txt` en `origin/main`**, con un ID por línea y `#` para comentarios. Toman la **primera** tarea que cumpla todo esto:
  - no está «hecha» (columna Estado de `docs/equipo/TAREAS_API.md` que empieza por `hecha`, en la copia local o en `origin/main`);
  - ninguna otra ventana la tiene (bloqueo en `~/AmazonaVerse/_herramientas/agent-sdk/bloqueos/<ID>.pid`);
  - no está aparcada.
- **Aparcar:** si una corrida termina sin cerrarla y gasta menos de 0,50 $, la aparca 45 min. Cada tarea se intenta como mucho 4 veces por ventana.
- **El trabajo:** el prompt dice «lee TAREAS_API.md y haz SOLO la tarea X». Lo que tiene que hacer va en la fila: qué, dónde y criterio de cierre. Las palabras «libre» o «EN CURSO» no cuentan: lo único que importa es que no empiece por `hecha`.
- **Topes de gasto:**
  - Por tarea: la ventana tiene `--total 140`.
  - Globales: `tools/agente_api/limites.json` (total 900 $, día 400 $), leídos de GitHub. Si se superan, sale «frenada por un tope; espero 10 min».
  - El límite real es el saldo de la consola de Anthropic.
- **Para dar trabajo a la Mac:** añade la fila en `TAREAS_API.md` (Estado `libre · Mac`) y su ID arriba en `cola.txt`, y súbelo. A los 5 min el subidor hace `fetch` y el trabajador lo ve, sin reiniciar nada.

### Fallos típicos

| Síntoma | Causa | Arreglo |
|---|---|---|
| «cola sin tareas libres» con tareas en la cola | Subidor apagado (`subidor: 0`) o sin red | Arrancar `subir.sh` (bloque A) |
| `curl` a github.com: «Couldn't connect… No route to host» en ~2 ms | **El router de casa bloquea GitHub** | Conectar la Mac al **hotspot del iPhone**. Arreglo de fondo: control parental o filtro en `http://192.168.1.1` |
| Rebase con `CONFLICT` en `docs/equipo/TAREAS_API.md` | La Mac y la nube editaron la misma fila | Bucle `--ours` del bloque B (queda la versión de GitHub). **Luego revisa que las filas cerradas por la Mac sigan empezando por `hecha`**: el `--ours` se lleva su marca |
| «Your system has run out of application memory» | Dos publicadores, o 3+ trabajadores | Bloque C: parar todo y arrancar 1–2 trabajadores sin publicador |
| `push falló` del publicador, o `sitio/…` «staged content different» | El publicador de la Mac chocó con la nube | `pkill -f publicar_mac.sh` y `git stash push -u -m restos -- sitio` |
| Commits en `origin/api-Kelvins-iMac` que no llegan a `main` | El subidor no pudo unir | Únelos tú desde la nube: `git fetch origin api-Kelvins-iMac && git merge origin/api-Kelvins-iMac`; en conflictos de `TAREAS_API.md`, una fila por tarea, la más nueva |
| `index.lock` | Dos git a la vez | Esperar 20 s. Si no hay ningún `git` vivo (`pgrep -l git`): `rm -f .git/index.lock` |
| Sin espacio («No space left») | Builds y registros | `df -h ~`. Mover a la Papelera `~/AmazonaVerse/logs_api/worker-*.log` viejos y las carpetas de `tools/build/salida/` (nunca borrar para siempre) |
| La pide la clave en cada arranque | La clave no está en el Llavero | Una vez: `security add-generic-password -a "$USER" -s amazonaverse-api -w` (la pide sin mostrarla). Nunca en archivos ni mensajes |
| Trabajador «falló (…)» en bucle | Red o SDK | Mira `tail -40 ~/AmazonaVerse/logs_api/worker-*.log` (el más nuevo) |

### Comandos exactos para Kelvin (Terminal de la Mac, con la Mac en el hotspot si el router bloquea)

**A · Arrancar todo, el de siempre** (también sirve tras un apagón o reinicio):
```bash
cd ~/AmazonaVerse/juego_api
curl -sI https://github.com | head -1
pkill -f publicar_mac.sh; pkill -f subir.sh; pkill -f ejecutor.py; sleep 3
git stash push -u -m "restos publicador" -- sitio 2>/dev/null
git pull --rebase --autostash origin main
nohup tools/agente_api/subir.sh >> ~/AmazonaVerse/logs_api/subidor.log 2>&1 &
AV_MAX=2 tools/agente_api/lanzar.sh 2
sleep 90; tools/agente_api/estado.sh | head -12
```
(El `curl` tiene que decir `HTTP/2 200`. Si el `pull` da CONFLICT, pega el bloque B y luego desde la línea `nohup`.)

**B · Si el pull o el rebase da CONFLICT:**
```bash
cd ~/AmazonaVerse/juego_api
for i in 1 2 3 4 5 6 7 8; do
  git diff --name-only --diff-filter=U | grep -q . || break
  git checkout --ours docs/equipo/TAREAS_API.md; git add docs/equipo/TAREAS_API.md
  GIT_EDITOR=true git rebase --continue && break
done
git push origin HEAD:main || (git pull --rebase --autostash origin main && git push origin HEAD:main)
git status -sb | head -3
```
(Si el choque es en otro archivo, el bucle se para: mándale la salida a la coordinadora.)

**C · Si la Mac va lenta o sale «sin memoria»:**
```bash
cd ~/AmazonaVerse/juego_api
pkill -f publicar_mac.sh; pkill -f ejecutor.py; sleep 3
AV_MAX=1 tools/agente_api/lanzar.sh 1
tools/agente_api/estado.sh | head -8
```

**D · Solo mirar (no gasta nada):**
```bash
cd ~/AmazonaVerse/juego_api && tools/agente_api/estado.sh | head -15 && git status -sb | head -3
```
Qué tiene que salir:
- «trabajadores vivos: 1 o 2», «subidor: 1» y «publicador: 0»;
- algún `######## BM13x` reciente;
- `## main...origin/main`, o con «ahead» unos minutos hasta que el subidor suba.

### Para ti, coordinadora, cada ronda

- Mira el último commit de la Mac (`git log origin/main --author="Kelvin Garcia" -3`; los de la Mac suelen llevar «BM» en el mensaje) y la rama `origin/api-Kelvins-iMac`.
- Si pasa más de 1 h sin nada de la Mac teniendo tareas libres en la cola, pide a Kelvin la salida del bloque D y, según lo que salga, dale el A o el C.
- Mantén siempre 2 o más tareas BM no «hecha» arriba en `cola.txt`, con filas autosuficientes (qué archivos, cómo se prueba, criterio de cierre y tope en $).
- En las tareas BM, nada de lo que es de Kimi: motor, render, rendimiento y validación con GPU real («Real GPU all to Kimi»).
