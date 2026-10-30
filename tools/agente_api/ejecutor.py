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
import subprocess
import sys
import time
from pathlib import Path

from claude_agent_sdk import (AssistantMessage, ClaudeAgentOptions, ClaudeSDKClient, PermissionResultAllow,
                              PermissionResultDeny, ResultMessage, TextBlock, ToolUseBlock)

JUEGO = Path(__file__).resolve().parents[2]
MODELO = 'claude-sonnet-5-5'
REGLAS = """
NUNCA corras nada en segundo plano (run_in_background, &, «aviso cuando termine»): aquí no llegan avisos y la tarea se cierra sin commit. Build y pruebas en primer plano con timeout largo; espera, haz commit y luego termina.
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
        # 29-oct: los topes se leen de origin/main (la Mac no puede hacer pull con ventanas editando): subirlos desde GitHub basta
        L = json.loads(remoto('tools/agente_api/limites.json') or LIMITES.read_text(encoding='utf-8'))
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


def registrar(tarea, costo, turnos, estado, texto=''):
    GASTOS.parent.mkdir(parents=True, exist_ok=True)
    with GASTOS.open('a', encoding='utf-8') as f:
        f.write(json.dumps({'fecha': time.strftime('%Y-%m-%dT%H:%M:%S'), 'tarea': tarea, 'modelo': MODELO,
                            'costo': round(costo, 4), 'turnos': turnos, 'estado': estado, 'resultado': (texto or '')[:3000]}) + '\n')


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
        model=MODELO, cwd=str(JUEGO), max_budget_usd=presupuesto, max_turns=turnos, max_buffer_size=32 * 1024 * 1024,
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
        registrar(tarea, resultado['costo'], resultado['turnos'], resultado['estado'], resultado.get('texto', ''))
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
                resultado.update(costo=costo, turnos=m.num_turns, estado=m.subtype, texto=m.result or '')
                print(f'\n{marca}== Fin: {m.subtype} · {m.num_turns} turnos · costo ${costo:.4f} (tope ${presupuesto}) ==')
                if m.result:
                    print(m.result[:1500])


CARRILES = {'A': ['A1', 'A2', 'A3'], 'B': ['B1', 'B2', 'B3', 'B4'], 'C': ['C1', 'C2', 'C3'], 'D': ['D1', 'D2', 'D3', 'D4'],
            'E': ['E1', 'E2'], 'F': ['F1', 'F2'], 'G': ['G1', 'G2'], 'H': ['H1'],
            'K': ['K1', 'K2'], 'L': ['L1'], 'M': ['M1'],
            'N': ['N1'], 'O': ['O1'], 'P': ['P1'], 'Q': ['Q1'], 'R': ['R1'], 'T': ['T1'], 'U': ['U1'], 'V': ['V1'], 'W': ['W1', 'W2'], 'Z': ['Z1', 'Z2'], 'X': ['X1'], 'Y': ['Y1'],
            'AB': ['AB1', 'AB2'], 'AC': ['AC1', 'AC2'], 'AD': ['AD1', 'AD2'], 'AE': ['AE1'], 'AF': ['AF1'],
            'AG': ['AG1', 'AG2'], 'AH': ['AH1', 'AH2'], 'AI': ['AI1', 'AI2'], 'AJ': ['AJ1', 'AJ2', 'AJ3'], 'AL': ['AL1'], 'AM': ['AM1'], 'AO': ['AO1', 'AO2'], 'AQ': ['AQ1'], 'AT': ['AT1'], 'AV': ['AV1', 'AV2'], 'AW': ['AW1', 'AW2', 'AW3'], 'AY': ['AY1', 'AY2'], 'AZ': ['AZ1'], 'BB': ['BB1', 'BB2'], 'BC': ['BC1', 'BC2'], 'BD': ['BD1', 'BD2']}
MODELOS = {'sonnet': 'claude-sonnet-5-5', 'opus': 'claude-opus-5-5'}


def remoto(ruta):
    """El archivo tal como está en origin/main (subir.sh hace fetch cada 5 min). 29-oct: con 3 trabajadores la carpeta
    nunca está limpia y no se puede hacer pull, así que la cola y las tareas nuevas de la coordinadora se leen de aquí."""
    try:
        return subprocess.run(['git', 'show', f'origin/main:{ruta}'], cwd=JUEGO, capture_output=True, text=True,
                              timeout=20).stdout
    except Exception:
        return ''


def prompt_tarea(t):
    return (f'Lee docs/equipo/TAREAS_API.md y haz SOLO la tarea {t}, de principio a fin, siguiendo sus reglas. '
            f'Si {t} no está en tu copia, la versión al día es la de GitHub: «git show origin/main:docs/equipo/TAREAS_API.md» '
            '(y lo mismo para PEDIDOS.md); no hagas pull ni rebase, otras ventanas están editando. '
            'Puede haber cambios tuyos a medias sin commit de una corrida anterior: revísalos y continúa desde ahí. '
            'Si la tarea depende de otra que no está hecha, anótalo UNA vez en la tabla y termina sin más. '
            'Solo tareas BM: las AP son de otro equipo; no toques content/, src/ui/ ni web/ (zonas en docs/equipo/COLABORACION_DOS_EQUIPOS.md); '
            'si descubres un fallo de esa zona, anótalo al final de PEDIDOS.md («para Apoyo») y sigue. '
            'Al terminar marca su estado en la tabla y resume en 3 líneas.')


def hecha(t):
    """Lee la tabla «Estado» de TAREAS_API.md (la local y la de origin/main): las marcadas «hecha» no se repiten."""
    patron = rf'^\|\s*{t}\s*\|\s*hecha'
    tabla = (JUEGO / 'docs/equipo/TAREAS_API.md').read_text(encoding='utf-8')
    return bool(re.search(patron, tabla, re.M) or re.search(patron, remoto('docs/equipo/TAREAS_API.md'), re.M))


BLOQUEOS = Path.home() / 'AmazonaVerse/_herramientas/agent-sdk/bloqueos'


EN_CURSO = set()   # tareas tomadas por los trabajadores de este mismo proceso (--cola N comparte el pid)


def tomar(t):
    """Bloqueo por tarea entre ventanas de Terminal: si otra corrida viva ya tiene la tarea, no se repite
    (26-oct: varias ventanas hicieron la misma tarea a la vez). Dentro del mismo proceso manda EN_CURSO
    (27-oct: los 4 trabajadores de --cola 4 tomaron AZ1 a la vez porque el pid era el suyo)."""
    if t in EN_CURSO:
        return False
    BLOQUEOS.mkdir(parents=True, exist_ok=True)
    f = BLOQUEOS / f'{t}.pid'
    try:
        pid = int(f.read_text().strip())
        if pid != os.getpid():
            os.kill(pid, 0)   # sigue viva: la tarea es suya
            return False
    except (FileNotFoundError, ValueError, ProcessLookupError):
        pass
    except PermissionError:
        return False
    f.write_text(str(os.getpid()))
    EN_CURSO.add(t)
    return True


def soltar(t):
    EN_CURSO.discard(t)
    f = BLOQUEOS / f'{t}.pid'
    try:
        if f.read_text().strip() == str(os.getpid()):
            f.unlink()
    except FileNotFoundError:
        pass


async def carril(tareas, por_tarea, total, turnos, marca=''):
    gasto = 0.0
    for t in tareas:
        if hecha(t):
            print(f'{marca}== {t} ya está hecha; la salto. ==', flush=True)
            continue
        if not tomar(t):
            print(f'{marca}== {t} la está haciendo otra ventana de Terminal; la salto. ==', flush=True)
            continue
        queda = total - gasto
        if queda < 0.5:
            print(f'\n{marca}== Tope total del carril alcanzado (${gasto:.2f} de ${total}); paro antes de {t}. ==')
            soltar(t)
            return gasto
        print(f'\n{marca}######## {t} · tope ${min(por_tarea, queda):.2f} · gastado hasta ahora ${gasto:.2f} ########', flush=True)
        try:
            costo = await correr(prompt_tarea(t), min(por_tarea, queda), turnos, marca, t)
        except Exception as e:   # un fallo de una tarea (red, SDK) no tumba el carril ni a los demás
            print(f'\n{marca}== {t} falló ({type(e).__name__}: {str(e)[:200]}); sigo con la siguiente. ==', flush=True)
            continue
        finally:
            soltar(t)
        if costo is None:
            return gasto
        gasto += costo
    print(f'\n{marca}== Carril terminado: ${gasto:.2f} gastados ==')
    return gasto


COLA = JUEGO / os.environ.get('AV_COLA', 'tools/agente_api/cola.txt')   # AV_COLA: otra cola (la nube usa cola_nube.txt)


INTENTOS, ESPERA, MAX_INTENTOS = {}, {}, 4   # por tarea, dentro de esta ventana (ver trabajador)


async def trabajador(n, por_tarea, total, turnos):
    """Modo continuo: toma la primera tarea de tools/agente_api/cola.txt que no esté hecha ni tomada; si no hay,
    espera 3 min y vuelve a mirar. La sesión coordinadora va añadiendo tareas a la cola; así la ventana no se cierra."""
    marca, gasto, vacia = f'[cola {n}] ', 0.0, 0
    while total - gasto >= 0.5:
        try:
            texto = remoto(str(COLA.relative_to(JUEGO))) or COLA.read_text(encoding='utf-8')   # la de GitHub manda
            ids = [l.split('#')[0].strip().upper() for l in texto.splitlines()]
        except FileNotFoundError:
            ids = []
        ahora = time.monotonic()
        t = next((i for i in ids if i and not hecha(i) and ESPERA.get(i, 0) <= ahora
                  and INTENTOS.get(i, 0) < MAX_INTENTOS and tomar(i)), None)
        if not t:
            if vacia % 10 == 0:
                print(f'{marca}== cola sin tareas libres; espero ==', flush=True)
            vacia += 1
            await asyncio.sleep(180)
            continue
        vacia = 0
        print(f'\n{marca}######## {t} · tope ${min(por_tarea, total - gasto):.2f} · gastado ${gasto:.2f} ########', flush=True)
        try:
            costo = await correr(prompt_tarea(t), min(por_tarea, total - gasto), turnos, marca, t)
        except Exception as e:
            print(f'\n{marca}== {t} falló ({type(e).__name__}: {str(e)[:200]}); sigo. ==', flush=True)
            costo = 0.0
        finally:
            soltar(t)
        if costo is None:   # tope de gasto (limites.json)
            # 29-oct: antes la ventana se cerraba y Kelvin la veía parada con crédito en la consola. Ahora espera 10 min y
            # vuelve a mirar (los topes se leen de GitHub): cuando se suban, sigue sola. Solo se cierra con el tope de la ventana.
            print(f'{marca}== frenada por un tope de limites.json; espero 10 min y reviso otra vez (no cierres la ventana) ==', flush=True)
            await asyncio.sleep(600)
            continue
        gasto += costo
        if not hecha(t):
            # 29-oct: BM12 se tomó 44 veces seguidas en 10 min solo para anotar «sigue bloqueada». Una corrida barata que
            # no la termina (miró y se fue) la aparca 45 min; cualquier tarea sin terminar se intenta como mucho
            # MAX_INTENTOS veces por ventana. Así se pasa a la siguiente de la cola en vez de gastar en bucle.
            INTENTOS[t] = INTENTOS.get(t, 0) + 1
            if costo < 0.5:
                ESPERA[t] = time.monotonic() + 45 * 60
                print(f'{marca}== {t} sin terminar y sin trabajo hecho (${costo:.2f}); la aparco 45 min ==', flush=True)
    print(f'\n{marca}== tope de la ventana alcanzado: ${gasto:.2f} ==')
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
    g.add_argument('--cola', type=int, help='modo continuo: N trabajadores toman tareas de tools/agente_api/cola.txt sin cerrarse')
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
    elif a.cola:
        async def _cola():
            await asyncio.gather(*(trabajador(i + 1, por_tarea, a.total, a.turnos) for i in range(a.cola)))
        asyncio.run(_cola())
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
