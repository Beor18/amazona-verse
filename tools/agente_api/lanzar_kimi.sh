#!/bin/bash
# Trabajadores con Kimi (Moonshot) en vez de la API de Anthropic, por su endpoint compatible con Anthropic.
#   tools/agente_api/lanzar_kimi.sh 4
# Antes: confirma en platform.moonshot.ai la URL del endpoint «Anthropic-compatible» y el nombre del modelo, y
# cámbialos abajo con AV_BASE_URL / AV_MODELO si no coinciden. La clave se pide aquí o sale del Llavero
# (servicio amazonaverse-kimi); nunca se escribe en archivos.
# Ojo: el gasto que anota el ejecutor usa precios de Claude, así que sobreestima lo que cobra Kimi (los topes saltan antes).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
export AV_BASE_URL="${AV_BASE_URL:-https://api.moonshot.ai/anthropic}"
export AV_MODELO="${AV_MODELO:-kimi-k2-turbo-preview}"
K="${KIMI_API_KEY:-$(security find-generic-password -a "$USER" -s amazonaverse-kimi -w 2>/dev/null || true)}"
[ -n "$K" ] || { read -rs -p "Pega tu clave de Kimi (no se verá) y pulsa Enter: " K; echo; }
[ -n "$K" ] || { echo "Sin clave no se puede arrancar."; exit 2; }
export ANTHROPIC_API_KEY="$K"
echo "Kimi · $AV_MODELO · $AV_BASE_URL"
exec tools/agente_api/lanzar.sh "${1:-3}"
