#!/usr/bin/env bash
# KIMI-326 (Kimi 1): swap temporal de los 6 archivos del aporte de lógica
# «menos cálculo por cuadro» (7e75d282) a su versión previa (7e75d282^)
# para la medición «antes» A/B del perfil Chromebook, y restauración a HEAD.
# Uso: bash tools/build/kimi1_k326_swap.sh atras | restaura | estado
set -e
cd "$(dirname "$0")/../.."
FILES="content/cap1/educativa.js src/engine/fisica.js src/game/guia_controles.js src/game/interaccion.js src/game/rio_vivo.js src/game/zonas.js"
PRE=7e75d282^

cmd="$1"
case "$cmd" in
  atras)
    for f in $FILES; do
      git show "$PRE:$f" > "$f"
    done
    echo "SWAP a pre-7e75d282 ($PRE) aplicado a: $FILES"
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
