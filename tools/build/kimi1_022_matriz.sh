#!/usr/bin/env bash
# Kimi 1 · KIMI-022: matriz A/B limpia hd400. Una celda por proceso; log por celda.
set -u
cd "$(dirname "$0")/../.." || exit 1
LOG=docs/img/kimi022/limpieza_matriz.log
: > "$LOG"
correr() {
  local desc="$1"; shift
  echo "[$(date -u +%H:%M:%S)] INICIA $desc :: $*" >> "$LOG"
  node tools/build/kimi1_022.js "$@" >> "$LOG" 2>&1
  echo "[$(date -u +%H:%M:%S)] FIN $desc (exit $?)" >> "$LOG"
}
correr medio-hd0-a --modo escritorio --calidad media --hd400 0 --etiqueta limpia-m0-a
correr medio-hd1-a --modo escritorio --calidad media --hd400 1 --etiqueta limpia-m1-a
correr medio-hd0-b --modo escritorio --calidad media --hd400 0 --etiqueta limpia-m0-b
correr medio-hd1-b --modo escritorio --calidad media --hd400 1 --etiqueta limpia-m1-b
correr alto-hd0 --modo escritorio --calidad alta --hd400 0 --etiqueta limpia-a0
correr alto-hd1 --modo escritorio --calidad alta --hd400 1 --etiqueta limpia-a1
echo "[$(date -u +%H:%M:%S)] MATRIZ COMPLETA" >> "$LOG"
