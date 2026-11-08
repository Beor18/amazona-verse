#!/usr/bin/env bash
# KIMI-318 (Kimi 1): swap temporal de los 6 archivos del Modo Escuela (ae29d28d)
# a su versión pre-KIMI-320 (5bd0111d) para la medición «antes», y restauración.
# Uso: bash tools/build/kimi1_k318_swap.sh atras | restaura | estado
set -e
cd "$(dirname "$0")/../.."
FILES="src/engine/renderer.js src/engine/vegetacion.js src/game/vecinos.js src/game/ciudad_viva.js src/game/bandada.js src/game/v18/amenaza.js"
PRE=5bd0111d

cmd="$1"
case "$cmd" in
  atras)
    for f in $FILES; do
      git show "$PRE:$f" > "$f"
    done
    echo "SWAP a pre-KIMI-320 ($PRE) aplicado a: $FILES"
    git status --short -- $FILES
    ;;
  restaura)
    for f in $FILES; do
      git checkout HEAD -- "$f"
    done
    echo "RESTAURADO a HEAD:"
    git status --short -- $FILES
    ;;
  estado)
    git status --short -- $FILES
    ;;
  *)
    echo "uso: $0 atras|restaura|estado" >&2
    exit 1
    ;;
esac
