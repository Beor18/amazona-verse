#!/bin/bash
# Amazona Verse · pruebas de una build en Chrome sin interfaz (dueño: Build/Release Engineer). Ver docs/equipo/BUILD.md.
#
#   tools/build/test.sh <carpeta> [--extra] [--solo-medir] [--puerto N] [--informe DIR]
#   tools/build/test.sh --limpiar      (cierra solo los Chrome avtest-chrome-* huérfanos, padre 1, con más de 30 min)
#
# <carpeta>: salida de build.sh (o una carpeta con index.html). Sirve la build en un puerto libre, abre un Chrome propio
# (perfil temporal, DevTools en un puerto que elige el sistema; nunca el 9333) y corre selfTest, missionTest,
# accessoryTest, templateTest, eduTest, maestroTest, criaderoTest, movementTest, saveTest, comicTest y e2eTest tras el
# flujo de jugador nuevo, y mide la carga inicial y el heap. Escribe reporte-test.{md,json} y capturas junto a la build.
# Al salir (también con INT, TERM o tiempo agotado) cierra su Chrome y su perfil temporal.
# Salida: 0 pasa, 1 falla, 2 no se pudo correr.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

uso() { sed -n '4,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }
[ $# -ge 1 ] || { uso; exit 2; }
case "$1" in -h|--help) uso; exit 0 ;; esac

# --limpiar: solo Chrome avtest-chrome-* huérfanos (padre 1) con más de 30 min de vida; no toca nada más.
if [ "$1" = "--limpiar" ]; then
  n=0
  while read -r pid ppid et; do
    [ "$ppid" = 1 ] || continue
    min="$(printf '%s' "$et" | awk -F'[-:]' '{ if (NF==4) print $1*1440+$2*60+$3; else if (NF==3) print $1*60+$2; else print $1 }')"
    [ "${min:-0}" -gt 30 ] || continue
    if kill -TERM "$pid" 2>/dev/null; then n=$((n+1)); fi
  done < <(ps -axo pid=,ppid=,etime=,command= | awk '/--user-data-dir=[^ ]*avtest-chrome-/ && !/awk/ { print $1, $2, $3 }')
  echo "· Chrome huérfanos cerrados: $n"
  exit 0
fi

[ -d "$1" ] || { avb_err "no existe la carpeta $1"; exit 2; }

PY="$(avb_python)" || exit 2

# Carpeta temporal propia: el perfil de Chrome (avtest-chrome-*) cae dentro; al salir se cierra todo lo que la use.
TMP_RUN="$(mktemp -d "${TMPDIR:-/tmp}/avtest-run.XXXXXX")"
export TMPDIR="$TMP_RUN"
HIJO=""
limpiar_salida() {
  trap - EXIT INT TERM
  [ -z "$HIJO" ] || kill -TERM "$HIJO" 2>/dev/null || true
  pkill -TERM -f "user-data-dir=$TMP_RUN" 2>/dev/null || true
  sleep 1
  pkill -KILL -f "user-data-dir=$TMP_RUN" 2>/dev/null || true
  rm -rf "$TMP_RUN"
}
trap limpiar_salida EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"$PY" -I "$AVB_DIR/avtest.py" --config "$AVB_DIR/config.json" "$@" &
HIJO=$!
rc=0
wait "$HIJO" || rc=$?
HIJO=""
exit "$rc"
