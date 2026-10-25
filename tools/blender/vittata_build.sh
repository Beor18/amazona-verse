#!/bin/zsh
# Pipeline de Vittata: regenera desde cero el modelo jugable a partir del original de Kelvin.
#
# Entradas (solo lectura): ../04_Blender_3D/cotorro_original/cotorro/
#   cotorrofiver.blend, cuerpo_Base_color.jpg, Material.001_Base_color.jpg, cuerpo_Base_color_mejorada.png
# Intermedios: ../_trabajo_claude/vittata_build/ (o AV_VITTATA_BUILD). Se puede borrar: se rehace entero.
# Salidas: assets/models/ (o AV_VITTATA_OUT): vittata.glb, vittata_masks.png, vittata_mounts.json, vittata_glb.js
#   y, con --rig, ../04_Blender_3D/vittata_rig_final.blend (el .blend con rig que usan los scripts de ropa).
#
# Uso:  tools/blender/vittata_build.sh            # escribe en assets/models
#       AV_VITTATA_OUT=/ruta/prueba AV_VITTATA_BUILD=/ruta/build tools/blender/vittata_build.sh   # comparar sin pisar
#       tools/blender/vittata_build.sh --rig      # además actualiza 04_Blender_3D/vittata_rig_final.blend
# Blender 4.2 en ~/Applications/Blender.app (o BLENDER=/ruta/al/binario). Tarda ~1 min.
#
# Pasos (el mismo orden con el que se hizo el modelo del juego):
#   1 o1_prep.py    original → o_clean.blend (limpieza)
#   2 o3_build.py   o_clean → o_anim.blend + landmarks.json (escala 1,4 m, montajes, animaciones; brazos a 60°)
#   3 o6_final.py   o_anim → o_final.blend + vittata_masks.png (+ .glb provisional)
#   4 o7_maskfix.py máscara del pico sin huecos
#   5 beak2.py      o_anim → beakverts.json
#   6 beak3.py      o_anim → jaw.json
#   7 beak5.py      o_final → o_final_pico.blend + vittata.glb FINAL (hueso 'pico')
#   8 mkjson.py     vittata.glb + landmarks.json → vittata_mounts.json
#   9 eyes.py       o_final_pico → eye_lids y bones_extra en vittata_mounts.json
#  10 base64        vittata.glb → vittata_glb.js (para hosts que no sirven .glb)
set -e
HERE=${0:A:h}
REPO=${HERE:h:h}
BL=${BLENDER:-$HOME/Applications/Blender.app/Contents/MacOS/Blender}
PY=${BLENDER_PY:-${BL:h:h}/Resources/4.2/python/bin/python3.11}
BUILD=${AV_VITTATA_BUILD:-${REPO:h}/_trabajo_claude/vittata_build}
OUT=${AV_VITTATA_OUT:-$REPO/assets/models}
SRC=${REPO:h}/04_Blender_3D/cotorro_original/cotorro
export AV_VITTATA_BUILD=$BUILD AV_VITTATA_OUT=$OUT
mkdir -p "$BUILD" "$OUT"
run() { local n=$1; echo "· $n $2"; shift 2; taskpolicy -b nice -n 15 "$BL" -b "$@" > "$BUILD/log_$n.txt" 2>&1 || { echo "ERROR en el paso $n"; tail -30 "$BUILD/log_$n.txt"; exit 1; }
  if grep -q "Traceback" "$BUILD/log_$n.txt"; then echo "ERROR en el paso $n"; grep -A12 Traceback "$BUILD/log_$n.txt"; exit 1; fi }

run 1 limpieza              "$SRC/cotorrofiver.blend" --python "$HERE/o1_prep.py"
run 2 "rig y animaciones"   "$BUILD/o_clean.blend"    --python "$HERE/o3_build.py" -- 60
run 3 "materiales y máscaras" "$BUILD/o_anim.blend"   --python "$HERE/o6_final.py"
run 4 "máscara del pico"    --python "$HERE/o7_maskfix.py"
run 5 "color del pico"      "$BUILD/o_anim.blend"     --python "$HERE/beak2.py"
run 6 mandíbula             "$BUILD/o_anim.blend"     --python "$HERE/beak3.py"
run 7 "hueso pico y .glb"   "$BUILD/o_final.blend"    --python "$HERE/beak5.py"
echo "· 8 montajes";  "$PY" "$HERE/mkjson.py" > /dev/null
run 9 párpados              "$BUILD/o_final_pico.blend" --python "$HERE/eyes.py"
echo "· 10 base64"; { printf 'window.AV_MODEL_B64="'; base64 -i "$OUT/vittata.glb" | tr -d '\n'; printf '";\n'; } > "$OUT/vittata_glb.js"
if [[ "$1" == "--rig" ]]; then
  R="${REPO:h}/04_Blender_3D/vittata_rig_final.blend"; T="$BUILD/rig_final_tmp.blend"; cp "$BUILD/o_final_pico.blend" "$T"
  "$BL" -b "$T" --python-expr "import bpy; bpy.ops.file.pack_all(); bpy.ops.wm.save_mainfile()" > /dev/null 2>&1   # textura empaquetada: sin rutas
  mv "$T" "$R"; rm -f "$T"1; echo "· rig en 04_Blender_3D/vittata_rig_final.blend (textura empaquetada; reemplazo atómico)"
fi
# (logs en BUILD/log_N.txt)
ls -la "$OUT"/vittata.glb "$OUT"/vittata_masks.png "$OUT"/vittata_mounts.json "$OUT"/vittata_glb.js
