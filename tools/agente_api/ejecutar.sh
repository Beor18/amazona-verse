#!/bin/bash
# Lanza tools/agente_api/ejecutor.py con el entorno aislado del Agent SDK (~/AmazonaVerse/_herramientas/agent-sdk/venv).
# Uso: export ANTHROPIC_API_KEY='...' && tools/agente_api/ejecutar.sh --prueba | --tarea N [--presupuesto USD]
set -euo pipefail
PY="$HOME/AmazonaVerse/_herramientas/agent-sdk/venv/bin/python"
[ -x "$PY" ] || { echo "Falta el entorno del Agent SDK en ~/AmazonaVerse/_herramientas/agent-sdk/venv" >&2; exit 2; }
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
exec "$PY" -I tools/agente_api/ejecutor.py "$@"
