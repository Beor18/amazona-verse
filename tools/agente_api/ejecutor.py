"""Amazona Verse · ejecutor con el Claude Agent SDK, para gastar créditos de la API (Agent SDK) y no el plan Max.

Se lanza desde la Terminal de Kelvin con su clave ya exportada (este script nunca la pide, la guarda ni la imprime):

  export ANTHROPIC_API_KEY='...'
  tools/agente_api/ejecutar.sh --prueba           # tarea mínima para comprobar en la facturación que cobra el crédito
  tools/agente_api/ejecutar.sh --tarea 1          # hace solo la tarea 1 de docs/equipo/TAREAS_API.md
  tools/agente_api/ejecutar.sh --tarea 2 --presupuesto 8

Reglas que impone, además de las del archivo de tareas: modelo Sonnet, tope de gasto por corrida (max_budget_usd),
configuración aislada (~/.claude-sdk, no la sesión de la app ni el login Max) y bloqueo de comandos peligrosos
(push, borrados, reset/checkout/stash, sudo, cambios en sitio/).
"""
import argparse
import asyncio
import os
import re
import sys
from pathlib import Path

from claude_agent_sdk import (AssistantMessage, ClaudeAgentOptions, ClaudeSDKClient, PermissionResultAllow,
                              PermissionResultDeny, ResultMessage, TextBlock, ToolUseBlock)

JUEGO = Path(__file__).resolve().parents[2]
MODELO = 'claude-sonnet-5-5'
REGLAS = """
Trabajas en el repo de Amazona Verse (~/AmazonaVerse/Juego) como agente de la sesión de terminal con créditos de la API.
Sigue al pie de la letra docs/equipo/TAREAS_API.md y docs/equipo/COORDINACION.md. En resumen:
- Una sola rama, main. Commits pequeños solo de tus archivos o líneas; termina cada mensaje de commit con la línea
  «Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>». Nunca push, nunca sitio/, nunca reset/checkout/stash.
- Antes de cada commit de código: tools/build/build.sh HEAD y tools/build/test.sh tools/build/salida/<ref>/ --extra; las 13
  baterías en verde. Procesos pesados con «taskpolicy -b nice -n 15». Nunca el python3 del sistema.
- No borres nada de forma permanente; nada de descargas, cuentas ni claves.
- Sé breve y eficiente con el gasto: lee solo lo necesario, no repitas baterías sin motivo.
- Al terminar, marca la tarea en la tabla «Estado» de docs/equipo/TAREAS_API.md (commit y una línea de resultado) y
  termina con un resumen de 3 líneas.
"""
PELIGROSOS = [r'\bgit\s+push\b', r'\bgit\s+(reset|stash)\b', r'\bgit\s+checkout\b', r'\bsudo\b', r'\brm\s', r'\brmdir\b',
              r'\bunlink\b', r'\bfind\b.*-delete', r'\bcurl\b', r'\bwget\b', r'\bpip\b', r'\bnpm\b', r'\bbrew\b', r'(^|\s)sitio/']


async def permiso(tool, entrada, _ctx):
    """Bash pasa por aquí: se niega lo peligroso. Edición fuera del repo o dentro de sitio/ también se niega."""
    if tool == 'Bash':
        cmd = entrada.get('command', '')
        for p in PELIGROSOS:
            if re.search(p, cmd):
                return PermissionResultDeny(message=f'Bloqueado por el ejecutor ({p}). Pídeselo a la sesión principal.')
        return PermissionResultAllow()
    if tool in ('Write', 'Edit', 'MultiEdit', 'NotebookEdit'):
        ruta = Path(entrada.get('file_path', '')).resolve()
        if JUEGO not in ruta.parents or (JUEGO / 'sitio') in ruta.parents:
            return PermissionResultDeny(message='Solo se edita dentro del repo y nunca en sitio/.')
    return PermissionResultAllow()


async def correr(prompt, presupuesto, turnos):
    clave = os.environ.get('ANTHROPIC_API_KEY', '')
    if not clave.startswith('sk-ant-'):
        sys.exit('Falta la clave. En esta Terminal escribe primero:  export ANTHROPIC_API_KEY=\'tu clave\'')
    config = Path.home() / '.claude-sdk'
    config.mkdir(exist_ok=True)
    opciones = ClaudeAgentOptions(
        model=MODELO, cwd=str(JUEGO), max_budget_usd=presupuesto, max_turns=turnos,
        system_prompt={'type': 'preset', 'preset': 'claude_code', 'append': REGLAS},
        setting_sources=[], permission_mode='acceptEdits', can_use_tool=permiso,
        allowed_tools=['Read', 'Glob', 'Grep', 'Write', 'Edit', 'MultiEdit', 'TodoWrite'],
        env={'ANTHROPIC_API_KEY': clave, 'CLAUDE_CONFIG_DIR': str(config)},
    )

    async def mensajes():
        yield {'type': 'user', 'message': {'role': 'user', 'content': prompt}}

    async with ClaudeSDKClient(options=opciones) as cliente:
        await cliente.query(mensajes())
        async for m in cliente.receive_response():
            if isinstance(m, AssistantMessage):
                for b in m.content:
                    if isinstance(b, TextBlock) and b.text.strip():
                        print('·', b.text.strip()[:400], flush=True)
                    elif isinstance(b, ToolUseBlock):
                        detalle = b.input.get('command') or b.input.get('file_path') or b.input.get('pattern') or ''
                        print(f'  [{b.name}] {str(detalle)[:140]}', flush=True)
            elif isinstance(m, ResultMessage):
                costo = m.total_cost_usd if m.total_cost_usd is not None else 0
                print(f'\n== Fin: {m.subtype} · {m.num_turns} turnos · costo ${costo:.4f} (tope ${presupuesto}) ==')
                if m.result:
                    print(m.result[:1500])


def main():
    ap = argparse.ArgumentParser(description='Ejecutor de tareas de Amazona Verse con el Agent SDK (créditos de la API).')
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--prueba', action='store_true', help='tarea mínima para verificar el cobro (tope $0,50)')
    g.add_argument('--tarea', type=int, help='número de tarea de docs/equipo/TAREAS_API.md')
    ap.add_argument('--presupuesto', type=float, help='tope de gasto en USD para esta corrida (por defecto 6)')
    ap.add_argument('--turnos', type=int, default=120)
    a = ap.parse_args()
    if a.prueba:
        prompt = ('Lee docs/equipo/TAREAS_API.md y responde en una sola línea cuántas tareas hay y cuál es la primera. '
                  'No edites nada ni ejecutes comandos.')
        asyncio.run(correr(prompt, a.presupuesto or 0.5, 6))
    else:
        prompt = (f'Lee docs/equipo/TAREAS_API.md y haz SOLO la tarea {a.tarea}, de principio a fin, siguiendo sus reglas. '
                  'Al terminar marca su estado en la tabla y resume en 3 líneas.')
        asyncio.run(correr(prompt, a.presupuesto or 6.0, a.turnos))


if __name__ == '__main__':
    main()
