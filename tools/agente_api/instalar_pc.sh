#!/bin/bash
# Prepara una PC con Windows (Ubuntu en WSL) o cualquier Linux para correr trabajadores de la API de Amazona Verse.
# Se corre UNA vez, dentro de Ubuntu:
#   curl -fsSL https://raw.githubusercontent.com/Beor18/amazona-verse/main/tools/agente_api/instalar_pc.sh | bash
# Instala git, gh, python con claude-agent-sdk y el Chromium de Playwright (para las 13 baterías), clona el repo en
# ~/amazona-verse y deja listo tools/agente_api/ejecutar_pc.sh. La clave de la API NO se guarda aquí: la pide al arrancar.
set -euo pipefail
echo "== 1/4 paquetes del sistema (pide la contraseña de Ubuntu) =="
sudo apt-get update -qq
sudo apt-get install -y -qq git python3 python3-venv python3-pip curl ca-certificates gh >/dev/null
echo "== 2/4 python con el Agent SDK y Playwright =="
python3 -m venv "$HOME/av-venv"
"$HOME/av-venv/bin/pip" install -q --upgrade pip
"$HOME/av-venv/bin/pip" install -q claude-agent-sdk playwright
"$HOME/av-venv/bin/python" -m playwright install --with-deps chromium
echo "== 3/4 GitHub (se abre el navegador para entrar con tu cuenta) =="
gh auth status >/dev/null 2>&1 || gh auth login -h github.com -p https -w
gh auth setup-git
echo "== 4/4 el repo =="
if [ -d "$HOME/amazona-verse/.git" ]; then git -C "$HOME/amazona-verse" pull -q --rebase origin main
else git clone -q https://github.com/Beor18/amazona-verse.git "$HOME/amazona-verse"; fi
git -C "$HOME/amazona-verse" config user.name "Kelvin García (API en la PC)"
git -C "$HOME/amazona-verse" config user.email "kelvingarcia728@gmail.com"
echo
echo "Listo. Para trabajar, abre una ventana de Ubuntu por cada trabajador y escribe:"
echo "  cd ~/amazona-verse && tools/agente_api/ejecutar_pc.sh"
echo "y en UNA ventana más, el subidor:"
echo "  cd ~/amazona-verse && tools/agente_api/subir.sh"
