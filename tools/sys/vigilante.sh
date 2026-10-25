#!/bin/bash
# vigilante.sh - watchdog liviano para procesos de Blender en macOS (sin dependencias).
#
# Uso:  vigilante.sh start    lanza el watchdog en segundo plano (nohup)
#       vigilante.sh stop     lo detiene y reanuda (SIGCONT) lo que hubiera pausado
#       vigilante.sh status   estado + ultimas lineas del log
#       vigilante.sh once     ejecuta UN ciclo en primer plano (prueba)
#       vigilante.sh loop     bucle en primer plano (lo usa 'start')
#
# Cada 20 s:
#   1. Cualquier proceso cuyo ejecutable se llame "blender*" (el nombre, no la ruta) baja a prioridad de fondo:
#      renice +15 y taskpolicy -b -p <pid> (si existe). Una vez por PID.
#   2. Registra en tests/out/vigilante.log: hora, % libre de memoria, swap, disco libre, RSS de Blender.
#   3. Si memoria libre < 12 % o disco libre < 1 GB: SIGSTOP al Blender con mas RSS.
#      Cuando la memoria libre sube de 30 % (y el disco tiene >= 1.5 GB): SIGCONT, de a uno por ciclo.
#   4. Se autoapaga a las 8 h. Al apagarse reanuda todo lo que pauso. Nunca usa sudo ni borra archivos.
#
# Solo toca procesos de Blender; nunca otras apps. Umbrales ajustables con variables VIGILANTE_*.

set -u
export LC_ALL=C

BASE="${VIGILANTE_BASE:-$HOME/AmazonaVerse/Juego}"
LOG="${VIGILANTE_LOG:-$BASE/tests/out/vigilante.log}"
STATE="${VIGILANTE_STATE:-$BASE/tests/out/.vigilante}"
PATTERN="${VIGILANTE_PATTERN:-blender}"              # prefijo (sin mayusculas) del nombre del ejecutable
INTERVAL="${VIGILANTE_INTERVAL:-20}"                 # segundos entre ciclos
MAX_SECONDS="${VIGILANTE_MAX_SECONDS:-28800}"        # 8 horas
MEM_LOW="${VIGILANTE_MEM_LOW:-12}"                   # % libre: por debajo se pausa
MEM_RESUME="${VIGILANTE_MEM_RESUME:-30}"             # % libre: por encima se reanuda
DISK_MIN_KB="${VIGILANTE_DISK_MIN_KB:-1048576}"      # 1 GB: por debajo se pausa
DISK_RESUME_KB="${VIGILANTE_DISK_RESUME_KB:-1572864}" # 1.5 GB: histeresis para no oscilar
VOL="/System/Volumes/Data"; [ -d "$VOL" ] || VOL="/"

PIDFILE="$STATE/vigilante.pid"
STOPPED="$STATE/pausados.pids"
HANDLED="$STATE/priorizados.pids"
VERBOSE=0
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
HAVE_TP=0; command -v taskpolicy >/dev/null 2>&1 && HAVE_TP=1

mkdir -p "$(dirname "$LOG")" "$STATE"
touch "$STOPPED" "$HANDLED"

log() {
  local line; line="$(date '+%Y-%m-%d %H:%M:%S') | $*"
  printf '%s\n' "$line" >> "$LOG"
  [ "$VERBOSE" = 1 ] && printf '%s\n' "$line"
  return 0
}

num_or() { case "$1" in ''|*[!0-9]*) echo "$2" ;; *) echo "$1" ;; esac; }  # entero o valor por defecto

mem_free_pct() {
  local v
  v=$(memory_pressure 2>/dev/null | awk '/free percentage/ {gsub(/[^0-9]/,"",$NF); print $NF; exit}')
  [ -z "$v" ] && v=$(sysctl -n kern.memorystatus_level 2>/dev/null)
  num_or "$v" 100                                    # si falla la lectura: no actuar
}
swap_str()     { sysctl -n vm.swapusage 2>/dev/null | awk '{print $6 "/" $3}'; }
disk_free_kb() { num_or "$(df -Pk "$VOL" 2>/dev/null | awk 'NR==2 {print $4}')" 999999999; }
kb_to_gb()     { awk -v k="$1" 'BEGIN{printf "%.2fG", k/1048576}'; }

list_blender() {  # imprime: pid rss_kb estado nice   (solo ejecutables cuyo NOMBRE empiece por $PATTERN)
  # QA 2026-10-24: antes se buscaba en toda la ruta y el python de Blender.app (con el que se arranca tests/server.py)
  # contaba como Blender: renice +15, taskpolicy -b y candidato a SIGSTOP. Ahora solo cuenta el nombre del ejecutable.
  ps -axo pid=,rss=,state=,ni=,comm= 2>/dev/null | awk -v pat="$PATTERN" '
    { pid=$1; rss=$2; st=$3; ni=$4; $1=$2=$3=$4=""; sub(/^ +/, "")
      n = split($0, parts, "/"); name = tolower(parts[n])
      if (index(name, tolower(pat)) == 1) print pid, rss, st, ni }'
}

in_list() { printf '%s\n' "$2" | awk -v p="$1" '$1==p {f=1} END {exit !f}'; }
pid_ok()  { ps -p "$1" -o comm= 2>/dev/null | awk -v pat="$PATTERN" '{ n = split($0, parts, "/"); f = index(tolower(parts[n]), tolower(pat)) == 1 } END { exit !f }'; }

prune_state() {   # deja en el archivo $1 solo los PID que siguen vivos en la lista $2
  local f="$1" bl="$2" keep="" p
  while read -r p; do
    [ -z "$p" ] && continue
    if in_list "$p" "$bl"; then keep="$keep$p"$'\n'; else log "INFO pid=$p ya no existe; se quita de $(basename "$f")"; fi
  done < "$f"
  printf '%s' "$keep" > "$f"
}

resume_one() {    # $1=pid  $2=motivo
  if pid_ok "$1" && kill -CONT "$1" 2>/dev/null; then log "ACCION SIGCONT pid=$1 ($2)"
  else log "INFO pid=$1 no se pudo reanudar (ya no existe)"; fi
}

resume_all() {    # reanuda todo lo que este pausado por este vigilante
  local p
  while read -r p; do [ -n "$p" ] && resume_one "$p" "$1"; done < "$STOPPED"
  : > "$STOPPED"
}

cycle() {
  local mem swp dkb BL pid rss st ni total=0 desc="" low=0 reason="" out rc tgt tpid trss
  mem=$(mem_free_pct); swp=$(swap_str); dkb=$(disk_free_kb); BL=$(list_blender)
  prune_state "$HANDLED" "$BL"; prune_state "$STOPPED" "$BL"

  while read -r pid rss st ni; do
    [ -z "$pid" ] && continue
    if ! grep -qx "$pid" "$HANDLED"; then            # 1) prioridad de fondo, una vez por PID
      out=$(renice +15 -p "$pid" 2>&1); rc=$?
      log "ACCION renice +15 pid=$pid (nice previo=$ni) rc=$rc $(printf '%s' "$out" | tr '\n' ' ')"
      if [ "$HAVE_TP" = 1 ]; then
        out=$(taskpolicy -b -p "$pid" 2>&1); rc=$?
        log "ACCION taskpolicy -b -p $pid rc=$rc $(printf '%s' "$out" | tr '\n' ' ')"
      fi
      echo "$pid" >> "$HANDLED"
    fi
    total=$((total + rss))
    desc="$desc${desc:+,}$pid:$((rss / 1024))MB"; case "$st" in T*) desc="$desc(T)" ;; esac
  done <<< "$BL"

  log "mem_libre=${mem}% | swap_usado/total=${swp} | disco_libre=$(kb_to_gb "$dkb") | blender=${desc:-ninguno} | rss_total=$((total / 1024))MB"

  [ "$mem" -lt "$MEM_LOW" ] && { low=1; reason="memoria libre ${mem}% < ${MEM_LOW}%"; }
  [ "$dkb" -lt "$DISK_MIN_KB" ] && { low=1; reason="${reason:+$reason y }disco libre $(kb_to_gb "$dkb") < $(kb_to_gb "$DISK_MIN_KB")"; }

  if [ "$low" = 1 ]; then                              # 3) proteger: pausar el Blender mas pesado en ejecucion
    tgt=$(printf '%s\n' "$BL" | awk 'NF && $3 !~ /^T/' | sort -k2,2 -n -r | head -1)
    if [ -n "$tgt" ]; then
      tpid=${tgt%% *}; trss=$(echo "$tgt" | awk '{print int($2/1024)}')
      if kill -STOP "$tpid" 2>/dev/null; then
        echo "$tpid" >> "$STOPPED"; log "ACCION SIGSTOP pid=$tpid rss=${trss}MB motivo: $reason"
      else log "ERROR no se pudo enviar SIGSTOP a pid=$tpid"; fi
    else
      log "ALERTA $reason pero no hay Blender en ejecucion que pausar"
    fi
  elif [ "$mem" -gt "$MEM_RESUME" ] && [ "$dkb" -ge "$DISK_RESUME_KB" ] && [ -s "$STOPPED" ]; then
    tpid=$(grep . "$STOPPED" | tail -1)                # el ultimo pausado = el mas liviano de los pausados
    resume_one "$tpid" "memoria libre ${mem}% > ${MEM_RESUME}%"
    grep -vx "$tpid" "$STOPPED" > "$STOPPED.new"; cat "$STOPPED.new" > "$STOPPED"; : > "$STOPPED.new"
  fi
}

running_pid() {
  local p; p=$(cat "$PIDFILE" 2>/dev/null)
  [ -n "$p" ] && kill -0 "$p" 2>/dev/null && ps -p "$p" -o command= 2>/dev/null | grep -q 'vigilante.sh' && { echo "$p"; return 0; }
  return 1
}

shutdown() {
  log "FIN vigilante pid=$$ ($1)"
  resume_all "vigilante se apaga"
  : > "$PIDFILE"
  [ -n "${SLEEP_PID:-}" ] && kill "$SLEEP_PID" 2>/dev/null
  exit 0
}

loop() {
  local start now
  if p=$(running_pid) && [ "$p" != "$$" ]; then echo "Ya hay un vigilante corriendo (pid $p)"; exit 1; fi
  echo $$ > "$PIDFILE"; start=$(date +%s)
  trap 'shutdown "senal de parada"' TERM INT
  log "INICIO vigilante pid=$$ cada ${INTERVAL}s, limite $((MAX_SECONDS / 3600))h | pausa si mem<${MEM_LOW}% o disco<$(kb_to_gb "$DISK_MIN_KB"), reanuda si mem>${MEM_RESUME}% | taskpolicy=$HAVE_TP"
  while :; do
    cycle
    now=$(date +%s)
    [ $((now - start)) -ge "$MAX_SECONDS" ] && shutdown "autoapagado tras $((MAX_SECONDS / 3600))h"
    sleep "$INTERVAL" & SLEEP_PID=$!
    wait "$SLEEP_PID"
  done
}

case "${1:-}" in
  start)
    if p=$(running_pid); then echo "Ya corre (pid $p)"; exit 0; fi
    nohup "$SELF" loop >> "$STATE/nohup.out" 2>&1 &
    disown 2>/dev/null; sleep 1
    if p=$(running_pid); then echo "Vigilante iniciado (pid $p). Log: $LOG"; else echo "No arranco; ver $STATE/nohup.out"; exit 1; fi ;;
  stop)
    if p=$(running_pid); then
      kill -TERM "$p"; for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$p" 2>/dev/null || break; sleep 0.5; done
      kill -0 "$p" 2>/dev/null && echo "No respondio al TERM (pid $p)" || echo "Vigilante detenido (pid $p)"
    else echo "No hay vigilante corriendo"; fi
    [ -s "$STOPPED" ] && { VERBOSE=1; resume_all "stop manual"; } ; exit 0 ;;
  status)
    if p=$(running_pid); then echo "Corriendo (pid $p, activo hace $(ps -p "$p" -o etime= | tr -d ' '))"; else echo "Detenido"; fi
    echo "Pausados por el vigilante: $(grep . "$STOPPED" | tr '\n' ' ')"; tail -n 6 "$LOG" ;;
  once) VERBOSE=1; cycle ;;
  loop) loop ;;
  *) echo "Uso: $0 {start|stop|status|once|loop}"; exit 2 ;;
esac
