#!/bin/zsh
# Pieles de especie: cuece las 22 cotorras de Kelvin sobre la Vittata del juego, UNA cada vez, y hace la lámina de control.
#   tools/blender/pieles_cocer.sh                 # las 22 → assets/textures/pieles/<piel>.jpg + docs/img/pieles_22_lamina.png
#   tools/blender/pieles_cocer.sh Oratrix Aestiva # solo esas (nombre del .blend sin extensión)
#   PIELES_ORIGEN=/otra/carpeta tools/blender/pieles_cocer.sh   (por defecto ~/Downloads/cotorras)
# Los .blend de origen solo se leen (Blender abre, cuece y sale sin guardar). Informe por piel en ../_trabajo_claude/pieles/.
set -e
HERE=${0:A:h}
REPO=${HERE:h:h}
BL=${BLENDER:-$HOME/Applications/Blender.app/Contents/MacOS/Blender}
ORIG=${PIELES_ORIGEN:-$HOME/Downloads/cotorras}
DATOS=${AV_PIEL_DATOS:-${REPO:h}/_trabajo_claude/pieles}
mkdir -p "$DATOS"
if (( $# )); then files=("${@/#/$ORIG/}"); files=("${files[@]/%/.blend}"); else files=("$ORIG"/*.blend); fi
for f in "${files[@]}"; do
  n=${f:t:r}; p=${${n:l}// /_}            # «Ochrocephala panamensis» → ochrocephala_panamensis
  echo "· $n → assets/textures/pieles/$p.jpg"
  taskpolicy -b nice -n 15 "$BL" -b "$f" --python "$HERE/pieles_cocer.py" -- "$p" > "$DATOS/log_$p.txt" 2>&1 || { echo "ERROR en $n"; tail -20 "$DATOS/log_$p.txt"; exit 1; }
  if grep -q "Traceback" "$DATOS/log_$p.txt"; then echo "ERROR en $n"; grep -A12 Traceback "$DATOS/log_$p.txt"; exit 1; fi
  grep -E "PIEL .* (AVISO|OK)" "$DATOS/log_$p.txt" | sed 's/^/    /'
done
echo "· lámina"
taskpolicy -b nice -n 15 "$BL" -b "${REPO:h}/04_Blender_3D/vittata_rig_final.blend" --python "$HERE/pieles_lamina.py" > "$DATOS/log_lamina.txt" 2>&1
grep -E "LAMINA_OK|Traceback|Error" "$DATOS/log_lamina.txt"
ls -la "$REPO/assets/textures/pieles"/*.jpg | awk '{s+=$5} END {printf "  %d pieles, %.2f MB\n", NR, s/1048576}'
