#!/bin/bash
# Lanza tools/agente_api/ejecutor.py con el entorno aislado del Agent SDK (~/AmazonaVerse/_herramientas/agent-sdk/venv).
# Uso: export ANTHROPIC_API_KEY='...' && tools/agente_api/ejecutar.sh --prueba | --tarea N [--presupuesto USD]
set -euo pipefail
PY="$HOME/AmazonaVerse/_herramientas/agent-sdk/venv/bin/python"
[ -x "$PY" ] || { echo "Falta el entorno del Agent SDK en ~/AmazonaVerse/_herramientas/agent-sdk/venv" >&2; exit 2; }
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
# Sin clave en el entorno, se pide aquí sin mostrarla en pantalla; no se guarda en ningún archivo.
if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -t 0 ]; then
  read -rs -p "Pega tu clave de la API (empieza con sk-ant-; no se verá) y pulsa Enter: " ANTHROPIC_API_KEY; echo
  export ANTHROPIC_API_KEY
fi
echo "Arrancando… la primera respuesta puede tardar 20–40 s."
exec "$PY" -I tools/agente_api/ejecutor.py "$@"
