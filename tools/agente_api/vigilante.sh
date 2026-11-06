#!/bin/bash
# Vigilante de la Mac (6-nov, Kelvin: «quiero que lea constante su trabajo desde un archivo del git y continúe con su
# próxima tarea»). Lo lanza launchd cada 10 min (tools/agente_api/instalar_vigilante.sh) y no gasta crédito: solo mira.
#   1. Trae la cola y las tareas de GitHub (git fetch).
#   2. Si ningún trabajador está a mitad de una tarea, pone la copia al día con main. Los restos sueltos van a
#      `git stash` (no se borra nada) y los commits sin subir se conservan (rebase).
#   3. Si el subidor está apagado, lo arranca.
#   4. Si hay menos de AV_MAX trabajadores (2 por defecto), arranca los que falten. La clave sale del Llavero
#      (servicio «amazonaverse-api»); nunca se escribe en archivos. Sin clave en el Llavero no arranca ninguno.
# Los trabajadores solo gastan cuando hay tareas libres en tools/agente_api/cola.txt; sin tareas esperan sin gastar.
# Registro: ~/AmazonaVerse/logs_api/vigilante.log
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
LOGS="$HOME/AmazonaVerse/logs_api"; mkdir -p "$LOGS"
log() { echo "$(date '+%d/%m %H:%M') $*" >> "$LOGS/vigilante.log"; }
BLOQ="$HOME/AmazonaVerse/_herramientas/agent-sdk/bloqueos"
MAX="${AV_MAX:-2}"

ocupado() {   # ¿algún trabajador vivo tiene una tarea tomada?
  for f in "$BLOQ"/*.pid; do
    [ -f "$f" ] || continue
    p=$(cat "$f" 2>/dev/null)
    [ -n "$p" ] && kill -0 "$p" 2>/dev/null && return 0
  done
  return 1
}

# 1. GitHub
if ! git fetch -q origin main 2>/dev/null; then log "sin red con GitHub (¿hotspot?); reintento en 10 min"; exit 0; fi

# 2. Al día con main, solo si nadie está trabajando en una tarea
if ! ocupado && ! git merge-base --is-ancestor origin/main HEAD; then
  [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] && git rebase --abort 2>/dev/null
  if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard | head -1)" ]; then
    git stash push -q -u -m "vigilante $(date '+%d-%m %H:%M')" && log "restos sueltos guardados en git stash"
  fi
  if git pull -q --rebase origin main; then log "al día con main ($(git rev-parse --short HEAD))"
  else git rebase --abort 2>/dev/null; log "no pude unir con main; el subidor sube a su rama y la nube la une"; fi
fi

# 3. Subidor
if ! pgrep -f 'agente_api/subir.sh' > /dev/null; then
  nohup tools/agente_api/subir.sh >> "$LOGS/subidor.log" 2>&1 < /dev/null &
  log "subidor arrancado"
fi

# 4. Trabajadores
VIVOS=$(pgrep -f 'ejecutor.py --cola' | wc -l | tr -d ' ')
if [ "$VIVOS" -lt "$MAX" ]; then
  CL=$(security find-generic-password -a "$USER" -s amazonaverse-api -w 2>/dev/null || true)
  if [ "${#CL}" -lt 20 ]; then
    log "la clave del Llavero (amazonaverse-api) falta o está vacía: no arranco trabajadores"
  else
    ANTHROPIC_API_KEY="$CL" AV_MAX="$MAX" tools/agente_api/lanzar.sh $((MAX - VIVOS)) >> "$LOGS/vigilante.log" 2>&1 < /dev/null
    log "trabajadores: había $VIVOS, arranqué hasta $MAX"
  fi
  unset CL
fi
exit 0
