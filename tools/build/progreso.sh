#!/bin/bash
# Amazona Verse · contador de avance (lo pinta la landing en una esquina: web/index.html lee /progreso.json).
#
#   tools/build/progreso.sh [repo] > progreso.json      (sitio.sh lo llama solo al rehacer sitio/)
#
# Sin python (en la Mac el del sistema se cuelga): solo awk sobre los tableros que el equipo ya mantiene.
# - Capítulo 1: hitos de docs/equipo/CAP1_PENDIENTE.md. Hecho = 1, Parcial = 0,5, Falta = 0.
# - Tareas: tabla «Estado» de docs/equipo/TAREAS_API.md. hecha = 1; «a medias» o «parcial» = 0,5; pendiente = 0; «sustituida» no cuenta.
# - Total = media de los dos. Si un tablero cambia de formato, ese dato sale null y el total usa el otro.
set -euo pipefail
R="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cap1=$(awk -F'|' '$2 ~ /^ *[0-9]+ *$/ { e=$4; n++; if (e ~ /Parcial/) s+=0.5; else if (e ~ /Falta/) s+=0; else if (e ~ /Hecho/) s+=1; else n-- }
  END { if (n) printf "%.0f", 100*s/n; else printf "null" }' "$R/docs/equipo/CAP1_PENDIENTE.md" 2>/dev/null || echo null)
tareas=$(awk -F'|' '/^## Estado/ { on=1; next } /^## / { on=0 } on && $2 ~ /^ *[A-Z]+[0-9]+ *$/ { e=tolower($3)
    if (e ~ /sustituid/) next; n++
    if (e ~ /medias|parcial/) s+=0.5; else if (e ~ /^ *hecha/) s+=1 }
  END { if (n) printf "%.0f", 100*s/n; else printf "null" }' "$R/docs/equipo/TAREAS_API.md" 2>/dev/null || echo null)
if [ "$cap1" = null ] && [ "$tareas" = null ]; then total=null
elif [ "$cap1" = null ]; then total=$tareas
elif [ "$tareas" = null ]; then total=$cap1
else total=$(( (cap1 + tareas + 1) / 2 )); fi
# Métrica verificable (Kelvin, 6-nov): si existe docs/equipo/avance.json, el total es el de la temporada (criterios cumplidos / 48: 8 por capítulo, sin la prueba con personas, Kelvin 7-nov)
temp=null; v18=null; pod=null
if [ -f "$R/docs/equipo/avance.json" ]; then
  temp=$(awk '/"temporada"/{match($0,/"cumplidos": *[0-9]+/);c=substr($0,RSTART,RLENGTH);gsub(/[^0-9]/,"",c);match($0,/"total": *[0-9]+/);t=substr($0,RSTART,RLENGTH);gsub(/[^0-9]/,"",t);if(t>0)printf "%.0f",100*c/t;exit}' "$R/docs/equipo/avance.json" 2>/dev/null || echo null)
  v18=$(awk '/"v18"/{match($0,/"cumplidos": *[0-9]+/);c=substr($0,RSTART,RLENGTH);gsub(/[^0-9]/,"",c);match($0,/"total": *[0-9]+/);t=substr($0,RSTART,RLENGTH);gsub(/[^0-9]/,"",t);if(t>0)printf "%.0f",100*c/t;exit}' "$R/docs/equipo/avance.json" 2>/dev/null || echo null)
  pod=$(awk '/"poderes"/{match($0,/"jugables": *[0-9]+/);c=substr($0,RSTART,RLENGTH);gsub(/[^0-9]/,"",c);match($0,/"total": *[0-9]+/);t=substr($0,RSTART,RLENGTH);gsub(/[^0-9]/,"",t);printf "%s/%s",c,t;exit}' "$R/docs/equipo/avance.json" 2>/dev/null || echo "")
  [ -n "$temp" ] && [ "$temp" != null ] && total=$temp
fi
sha=$(git -C "$R" rev-parse --short=7 HEAD 2>/dev/null || echo "")
printf '{"total":%s,"temporada":%s,"v18":%s,"poderes":"%s","cap1":%s,"tareas":%s,"sha":"%s","fecha":"%s"}\n' "$total" "${temp:-null}" "${v18:-null}" "${pod:-}" "$cap1" "$tareas" "$sha" "$(date -u +%Y-%m-%dT%H:%MZ)"
