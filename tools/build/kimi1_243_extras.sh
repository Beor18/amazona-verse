#!/usr/bin/env bash
# KIMI-243 parte A (Kimi 1): extras cortas con GPU real, una por página limpia.
# Uso: bash tools/build/kimi1_243_extras.sh <etiqueta>
set -u
ETIQUETA="${1:-r1}"
SALIDA="tools/build/salida/kimi1-243-$ETIQUETA"
mkdir -p "$SALIDA"
LISTA="v18CicloTest v18RepararTest v18AmenazaTest v18NuevasTest v18Duelo2Test v18FxTest v18CombateTest v18DescubrirTest v18MinigolfTest v18GuardianTest v18PuertoTest v18EvolucionTest v18MoonTest v18ArcoTest v18PoderesTest v18ChispaTest bandadaTest ciudadVivaTest vecinosTest equiposTest trenTest momentosTest comunidadesTest controlesTest accesibilidadTest lookTest floraTest ambienteTest idiomaTest"
: > "$SALIDA/resumen.txt"
for B in $LISTA; do
  echo "== $B ==" | tee -a "$SALIDA/resumen.txt"
  timeout 240 node tools/build/kimi2_una_bateria.js "$B" > "$SALIDA/$B.log" 2>&1
  EC=$?
  { echo "exit=$EC"; tail -4 "$SALIDA/$B.log" | tr '\n' ' '; echo; } | tee -a "$SALIDA/resumen.txt"
done
echo "LISTA COMPLETA" | tee -a "$SALIDA/resumen.txt"
