#!/bin/bash
# Lanza tools/agente_api/ejecutor.py con el entorno aislado del Agent SDK (~/AmazonaVerse/_herramientas/agent-sdk/venv).
# Uso: export ANTHROPIC_API_KEY='...' && tools/agente_api/ejecutar.sh --prueba | --tarea N [--presupuesto USD]
set -euo pipefail
PY="$HOME/AmazonaVerse/_herramientas/agent-sdk/venv/bin/python"
[ -x "$PY" ] || { echo "Falta el entorno del Agent SDK en ~/AmazonaVerse/_herramientas/agent-sdk/venv" >&2; exit 2; }
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
# Sin clave en el entorno, se busca en el Llavero de macOS (servicio «amazonaverse-api»; Kelvin la guarda una vez con
#   security add-generic-password -a "$USER" -s amazonaverse-api -w
# que la pide sin mostrarla). Si no está, se pide aquí sin mostrarla. Nunca se imprime ni se guarda en archivos.
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  ANTHROPIC_API_KEY="$(security find-generic-password -a "$USER" -s amazonaverse-api -w 2>/dev/null || true)"
  export ANTHROPIC_API_KEY
fi
if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -t 0 ]; then
  read -rs -p "Pega tu clave de la API (empieza con sk-ant-; no se verá) y pulsa Enter: " ANTHROPIC_API_KEY; echo
  export ANTHROPIC_API_KEY
fi
echo "Arrancando… la primera respuesta puede tardar 20–40 s."
exec "$PY" -I tools/agente_api/ejecutor.py "$@"
