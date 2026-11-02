#!/bin/sh
# Renderiza una piel en prueba con el modelo real y el look vibrant_toon: frente, lado, espalda, 3/4 y cara.
#   tools/pieles/ren.sh <textura.jpg> <id_piel> [prefijo]
# Necesita que <id_piel> exista en PIELES (src/personaje/pieles.js) y en content/comun/especies.js (campo piel).
TEXA=$(realpath "$1"); cd "$(dirname "$0")"; export NODE_PATH=$(npm root -g)
P=${3:-$2}
python3 -I mkjobs.py "$2" "$P" && TEX="$TEXA" PIEL="$2" timeout 600 node run.js "out/j_$P.json" 2>&1 | grep -v "^ok\|404"; python3 -I tira.py "$P"
