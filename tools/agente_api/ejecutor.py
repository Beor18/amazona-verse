"""Amazona Verse · ejecutor con el Claude Agent SDK, para gastar créditos de la API (Agent SDK) y no el plan Max.

Se lanza desde la Terminal de Kelvin con su clave ya exportada (este script nunca la pide, la guarda ni la imprime):

  export ANTHROPIC_API_KEY='...'
  tools/agente_api/ejecutar.sh --prueba           # tarea mínima para comprobar en la facturación que cobra el crédito
  tools/agente_api/ejecutar.sh --tarea A1          # una sola tarea de docs/equipo/TAREAS_API.md
  tools/agente_api/ejecutar.sh --carril B --modelo opus --total 50   # todo un carril, en orden, con tope total
  tools/agente_api/ejecutar.sh --carriles A,C,D,E --modelo opus --total 25   # varios carriles a la vez, una sola clave

Reglas que impone, además de las del archivo de tareas: modelo Sonnet, tope de gasto por corrida (max_budget_usd),
configuración aislada (~/.claude-sdk, no la sesión de la app ni el login Max) y bloqueo de comandos peligrosos
(push, borrados, reset/checkout/stash, sudo, cambios en sitio/).
"""
import argparse
import asyncio
import json
import os
import re
import sys
import time
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


# Control de gasto (directiva V8.0): topes en tools/agente_api/limites.json (sin él no corre nada) y registro de cada
# tarea en un archivo fuera del repo. El registro solo cuenta lo corrido desde que existe; lo anterior está en la Console.
GASTOS = Path.home() / 'AmazonaVerse/_herramientas/agent-sdk/gastos.jsonl'
LIMITES = JUEGO / 'tools/agente_api/limites.json'
reservado = 0.0   # topes de las tareas en curso dentro de este proceso (varios carriles a la vez)


def gastado():
    total = hoy = 0.0
    if GASTOS.exists():
        for linea in GASTOS.read_text(encoding='utf-8').splitlines():
            r = json.loads(linea)
            total += r['costo']
            hoy += r['costo'] if r['fecha'].startswith(time.strftime('%Y-%m-%d')) else 0
    return total, hoy


def autorizar(presupuesto, marca=''):
    """Antes de cada tarea: la niega si su tope rebasaría el tope total o el del día; avisa al pasar alerta_pct."""
    try:
        L = json.loads(LIMITES.read_text(encoding='utf-8'))
    except FileNotFoundError:
        print(f'{marca}== PARO: falta tools/agente_api/limites.json. ==', flush=True)
        return False
    total, hoy = gastado()
    for nombre, usado, tope in (('total', total + reservado, L['tope_total_usd']), ('del día', hoy + reservado, L['tope_dia_usd'])):
        if usado + presupuesto > tope:
            print(f'{marca}== PARO: no alcanza el tope {nombre} (${tope}): ${usado:.2f} gastado o en curso + '
                  f'${presupuesto:.2f} de esta tarea. Los topes solo los cambia Kelvin. ==', flush=True)
            return False
        if tope and usado >= tope * L['alerta_pct'] / 100:
            print(f'{marca}== ALERTA: gasto {nombre} ${usado:.2f} de ${tope} ({usado / tope:.0%}). ==', flush=True)
    return True


def registrar(tarea, costo, turnos, estado):
    GASTOS.parent.mkdir(parents=True, exist_ok=True)
    with GASTOS.open('a', encoding='utf-8') as f:
        f.write(json.dumps({'fecha': time.strftime('%Y-%m-%dT%H:%M:%S'), 'tarea': tarea, 'modelo': MODELO,
                            'costo': round(costo, 4), 'turnos': turnos, 'estado': estado}) + '\n')


def resumen():
    total, hoy = gastado()
    print(f'Gastado según el registro: ${total:.2f} en total, ${hoy:.2f} hoy (registro: {GASTOS}).')
    if GASTOS.exists():
        for linea in GASTOS.read_text(encoding='utf-8').splitlines()[-20:]:
            r = json.loads(linea)
            print(f"  {r['fecha']}  {r['tarea']:<6} {r['modelo']:<18} ${r['costo']:>7.2f}  {r['turnos']:>3} turnos  {r['estado']}")


async def correr(prompt, presupuesto, turnos, marca='', tarea='?'):
    """Corre una tarea; devuelve su costo, o None si los topes no la dejan arrancar."""
    global reservado
    clave = os.environ.get('ANTHROPIC_API_KEY', '')
    if not clave.startswith('sk-ant-'):
        sys.exit('Falta la clave. En esta Terminal escribe primero:  export ANTHROPIC_API_KEY=\'tu clave\'')
    if not autorizar(presupuesto, marca):
        return None
    reservado += presupuesto
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

    resultado = {'costo': 0.0, 'turnos': 0, 'estado': 'interrumpida'}
    try:
        await _sesion(opciones, mensajes, marca, presupuesto, resultado)
    except Exception as e:
        resultado['estado'] = f'error: {type(e).__name__}: {str(e)[:160]}'
        raise
    finally:
        reservado -= presupuesto
        registrar(tarea, resultado['costo'], resultado['turnos'], resultado['estado'])
    return resultado['costo']


async def _sesion(opciones, mensajes, marca, presupuesto, resultado):
    async with ClaudeSDKClient(options=opciones) as cliente:
        await cliente.query(mensajes())
        async for m in cliente.receive_response():
            if isinstance(m, AssistantMessage):
                for b in m.content:
                    if isinstance(b, TextBlock) and b.text.strip():
                        print(f'{marca}·', b.text.strip()[:400], flush=True)
                    elif isinstance(b, ToolUseBlock):
                        detalle = b.input.get('command') or b.input.get('file_path') or b.input.get('pattern') or ''
                        print(f'{marca}  [{b.name}] {str(detalle)[:140]}', flush=True)
            elif isinstance(m, ResultMessage):
                costo = m.total_cost_usd if m.total_cost_usd is not None else 0
                resultado.update(costo=costo, turnos=m.num_turns, estado=m.subtype)
                print(f'\n{marca}== Fin: {m.subtype} · {m.num_turns} turnos · costo ${costo:.4f} (tope ${presupuesto}) ==')
                if m.result:
                    print(m.result[:1500])


CARRILES = {'A': ['A1', 'A2', 'A3'], 'B': ['B1', 'B2', 'B3', 'B4'], 'C': ['C1', 'C2', 'C3'], 'D': ['D1', 'D2', 'D3', 'D4'],
            'E': ['E1', 'E2'], 'F': ['F1', 'F2'], 'G': ['G1', 'G2'], 'H': ['H1'],
            'K': ['K1', 'K2'], 'L': ['L1'], 'M': ['M1']}
MODELOS = {'sonnet': 'claude-sonnet-5-5', 'opus': 'claude-opus-5-5'}


def prompt_tarea(t):
    return (f'Lee docs/equipo/TAREAS_API.md y haz SOLO la tarea {t}, de principio a fin, siguiendo sus reglas. '
            'Puede haber cambios tuyos a medias sin commit de una corrida anterior: revísalos y continúa desde ahí. '
            'Al terminar marca su estado en la tabla y resume en 3 líneas.')


def hecha(t):
    """Lee la tabla «Estado» de TAREAS_API.md en el momento: las tareas marcadas «hecha» no se vuelven a correr."""
    tabla = (JUEGO / 'docs/equipo/TAREAS_API.md').read_text(encoding='utf-8')
    return re.search(rf'^\|\s*{t}\s*\|\s*hecha', tabla, re.M) is not None


async def carril(tareas, por_tarea, total, turnos, marca=''):
    gasto = 0.0
    for t in tareas:
        if hecha(t):
            print(f'{marca}== {t} ya está hecha; la salto. ==', flush=True)
            continue
        queda = total - gasto
        if queda < 0.5:
            print(f'\n{marca}== Tope total del carril alcanzado (${gasto:.2f} de ${total}); paro antes de {t}. ==')
            return gasto
        print(f'\n{marca}######## {t} · tope ${min(por_tarea, queda):.2f} · gastado hasta ahora ${gasto:.2f} ########', flush=True)
        try:
            costo = await correr(prompt_tarea(t), min(por_tarea, queda), turnos, marca, t)
        except Exception as e:   # un fallo de una tarea (red, SDK) no tumba el carril ni a los demás
            print(f'\n{marca}== {t} falló ({type(e).__name__}: {str(e)[:200]}); sigo con la siguiente. ==', flush=True)
            continue
        if costo is None:
            return gasto
        gasto += costo
    print(f'\n{marca}== Carril terminado: ${gasto:.2f} gastados ==')
    return gasto


async def varios(letras, por_tarea, total, turnos):
    """Varios carriles a la vez en un solo proceso (una sola clave); --total es el tope de cada carril."""
    gastos = await asyncio.gather(*(carril(CARRILES[l], por_tarea, total, turnos, f'[{l}] ') for l in letras),
                                  return_exceptions=True)
    for l, g in zip(letras, gastos):
        if isinstance(g, BaseException):
            print(f'== Carril {l} terminó con error: {type(g).__name__}: {str(g)[:200]} ==')
    print(f'\n== Todos los carriles terminados: ${sum(g for g in gastos if isinstance(g, float)):.2f} gastados ==')


def main():
    global MODELO
    ap = argparse.ArgumentParser(description='Ejecutor de tareas de Amazona Verse con el Agent SDK (créditos de la API).')
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--gastos', action='store_true', help='muestra lo gastado según el registro y no corre nada')
    g.add_argument('--prueba', action='store_true', help='tarea mínima para verificar el cobro (tope $0,50)')
    g.add_argument('--tarea', help='una tarea de docs/equipo/TAREAS_API.md, por ejemplo A1')
    g.add_argument('--carril', choices=sorted(CARRILES), help='corre en orden todas las tareas de un carril (A a E)')
    g.add_argument('--carriles', help='varios carriles a la vez con una sola clave, por ejemplo A,C,D,E')
    ap.add_argument('--modelo', choices=sorted(MODELOS), default='sonnet', help='sonnet (por defecto) u opus')
    ap.add_argument('--presupuesto', type=float, help='tope en USD por tarea (por defecto 6 con sonnet, 15 con opus)')
    ap.add_argument('--total', type=float, default=50.0, help='tope en USD de todo el carril (por defecto 50)')
    ap.add_argument('--turnos', type=int, default=150)
    a = ap.parse_args()
    MODELO = MODELOS[a.modelo]
    por_tarea = a.presupuesto or (15.0 if a.modelo == 'opus' else 6.0)
    if a.gastos:
        resumen()
    elif a.prueba:
        prompt = ('Lee docs/equipo/TAREAS_API.md y responde en una sola línea cuántas tareas hay y cuál es la primera. '
                  'No edites nada ni ejecutes comandos.')
        asyncio.run(correr(prompt, a.presupuesto or 0.5, 6, tarea='prueba'))
    elif a.carril:
        asyncio.run(carril(CARRILES[a.carril], por_tarea, a.total, a.turnos))
    elif a.carriles:
        letras = [l.strip().upper() for l in a.carriles.split(',') if l.strip()]
        malas = [l for l in letras if l not in CARRILES]
        if malas:
            sys.exit(f'Carriles desconocidos: {", ".join(malas)}')
        asyncio.run(varios(letras, por_tarea, a.total, a.turnos))
    else:
        asyncio.run(correr(prompt_tarea(a.tarea.upper()), por_tarea, a.turnos, tarea=a.tarea.upper()))


if __name__ == '__main__':
    main()
