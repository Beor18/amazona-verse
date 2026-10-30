#!/bin/bash
# Arranca N trabajadores de la API en segundo plano desde UNA sola ventana, cada uno con su registro.
#   tools/agente_api/lanzar.sh 3        # arranca 3 más (los que ya estén vivos siguen)
# Los registros quedan en ~/AmazonaVerse/logs_api/. Para ver qué hace cada uno:   tools/agente_api/estado.sh
# Para pararlos todos:                                                          pkill -f ejecutor.py
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
N="${1:-3}"; LOGS="$HOME/AmazonaVerse/logs_api"; mkdir -p "$LOGS"
# La clave se pide UNA vez aquí (o sale del Llavero) y los trabajadores la heredan; nunca se escribe en archivos.
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  ANTHROPIC_API_KEY="$(security find-generic-password -a "$USER" -s amazonaverse-api -w 2>/dev/null || true)"
fi
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then read -rs -p "Pega tu clave de la API (sk-ant-…; no se verá) y pulsa Enter: " ANTHROPIC_API_KEY; echo; fi
[ -n "$ANTHROPIC_API_KEY" ] || { echo "Sin clave no se puede arrancar."; exit 2; }
export ANTHROPIC_API_KEY
for i in $(seq 1 "$N"); do
  F="$LOGS/worker-$(date +%d%H%M%S)-$i.log"
  nohup caffeinate -i tools/agente_api/ejecutar.sh --cola 1 --total 140 > "$F" 2>&1 &
  echo "trabajador $i arrancado → $F"
  sleep 20   # que cada uno tome su tarea antes de arrancar el siguiente (los bloqueos evitan repetir)
done
echo; echo "Listo. Mira qué hace cada uno con:  tools/agente_api/estado.sh"
