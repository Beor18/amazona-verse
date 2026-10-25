#!/bin/zsh
# usage: run_batches.sh MODE BATCHFILE OUTDIR [extra args]
MODE=$1; BF=$2; OUT=$3; shift 3
W=$(cd "$(dirname "$0")" && pwd)
while read -r IDS; do
  [ -z "$IDS" ] && continue
  for i in {1..60}; do
    FREE=$(memory_pressure | awk -F': ' '/free percentage/{gsub("%","",$2); print $2}')
    [ "$FREE" -ge 25 ] && break
    echo "waiting memory free=$FREE%"; sleep 10
  done
  echo "=== batch $IDS (free ${FREE}%)"
  taskpolicy -b nice -n 15 ~/Applications/Blender.app/Contents/MacOS/Blender -b --python $W/edificios_build.py -- --mode $MODE --ids "$IDS" --out "$OUT" "$@" 2>&1 | grep "\[build\]\|Traceback\|Error" 
done < "$BF"
echo "=== FIN $(date)"
