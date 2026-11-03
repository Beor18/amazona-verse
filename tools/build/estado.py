"""Amazona Verse · panel «Así vamos» de la landing (web/index.html lee /estado.json al pulsar la pastilla de avance).

    <python3.11> -I tools/build/estado.py [repo] > estado.json      (sitio.sh lo llama solo al rehacer sitio/)

Solo biblioteca estándar. Lee los tableros que el equipo ya mantiene y saca, por carril, lo que está en construcción,
lo pendiente o bloqueado y lo hecho hace poco:
- docs/equipo/TAREAS_API.md, tabla «Estado» (| BMnnn | estado | commit | resultado |): carril Mac, salvo que el estado
  o el resultado digan nube, web o Grok.
- docs/equipo/TAREAS_KIMI.md (KIMI-Task-*), TAREAS_CURSOR_GROK.md (CG-*) y TAREAS_WEB.md (W*).
- docs/equipo/CAP1_PENDIENTE.md: solo el recuento de hitos del capítulo 1.

VA A UN SITIO PÚBLICO. Solo salen títulos cortos de tareas del juego: se descarta toda fila que hable de licencias,
facturas, proveedores, dinero, temas legales, decisiones de Kelvin, claves o costes de la API, correos o nombres de
personas (DENY abajo). El título es la primera frase en **negrita** de la tarea, sin rutas, código ni markdown.
La fecha de cada fila es la del último commit que la tocó (git blame); si no hay git, la que diga el texto.
"""
import datetime as dt
import json
import os
import re
import subprocess
import sys

R = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", ".."))
EQ = os.path.join(R, "docs", "equipo")
AST = dt.timezone(dt.timedelta(hours=-4))  # Puerto Rico, sin horario de verano
HECHAS_POR_CARRIL = 15
CARRILES = ["Nube", "Mac", "Kimi", "Grok/Cursor", "Web"]

# Privacidad. DENY: si la descripción de la tarea (sin código ni paréntesis) o su título lo menciona, la fila NO sale.
DENY = re.compile(
    r"licenc|licens|factur|invoice|proveedor|provider|torrent|precio|price|\$|\busd\b|d[oó]lar|monetiz|suscrip|"
    r"patrocin|sponsor|contrat|legal|abogad|copyright|derechos de autor|coppa|pendientes_kelvin|"
    r"decisi[oó]n de kelvin|api[ _-]?key|claves? (?:de|del) (?:la )?api|clave secreta|secret[ _-]?key|"
    r"cr[eé]ditos? de la api|cuota|gasto|kitbash|archmodels|savage|turbosquid|sketchfab|correo|e-?mail|@|cryptochef",
    re.I)
# DENY_TITULO: además, el título público no lleva nombres de personas ni temas de dinero (los nombres solo en créditos).
DENY_TITULO = re.compile(
    r"kelvin|garc[ií]a|analeah|nathanael|fernando|jorge|smarlin|seguros|pago|cobr|compra|tienda real|cr[eé]dito|"
    r"privacidad|datos personales|token|secret\b|coste|costo|clave", re.I)

MES = {"ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6, "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11,
       "dic": 12, "jan": 1, "apr": 4, "aug": 8, "dec": 12}


def leer(nombre):
    try:
        with open(os.path.join(EQ, nombre), encoding="utf-8") as f:
            return f.read().split("\n")
    except OSError:
        return None


def blame(nombre):
    """Línea (1-based) -> datetime del último commit que la tocó. {} si no hay git."""
    try:
        out = subprocess.run(["git", "-C", R, "blame", "--line-porcelain", "--", os.path.join("docs", "equipo", nombre)],
                             capture_output=True, text=True, timeout=60).stdout
    except Exception:
        return {}
    fechas, actual, linea = {}, None, None
    for l in out.split("\n"):
        m = re.match(r"^[0-9a-f]{40} \d+ (\d+)", l)
        if m:
            linea = int(m.group(1))
        elif l.startswith("committer-time "):
            actual = dt.datetime.fromtimestamp(int(l.split()[1]), AST)
        elif l.startswith("\t") and linea:
            fechas[linea] = actual
    return fechas


def fecha_texto(s):
    """«2-nov», «02-11», «2026-11-02» -> date (año actual), o None."""
    hoy = dt.datetime.now(AST).date()
    m = re.search(r"\b(20\d\d)-(\d\d)-(\d\d)\b", s)
    try:
        if m:
            return dt.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        m = re.search(r"\b(\d{1,2})[- ]([a-zA-Z]{3})", s)
        if m and m.group(2).lower() in MES:
            return dt.date(hoy.year, MES[m.group(2).lower()], int(m.group(1)))
        m = re.search(r"\b(\d{1,2})-(\d{1,2})\b", s)
        if m and 1 <= int(m.group(2)) <= 12:
            return dt.date(hoy.year, int(m.group(2)), int(m.group(1)))
    except ValueError:
        pass
    return None


def estado(s):
    """Estado normalizado, o None si la fila no cuenta (sustituida, descartada, pasada a otro tablero)."""
    e = re.sub(r"[*`]", "", s).strip().lower()
    if re.search(r"sustituid|descartad|no es de este carril|^pasa a|duplicad|cancelad", e):
        return None
    if re.match(r"en curso", e):
        return "en construcción"
    if re.match(r"(hecha|hecho|integrad)", e):
        return "hecha"
    if re.search(r"bloquead", e):
        return "bloqueada"
    return "pendiente"  # libre, espera, después de…, parcial, a medias


CODIGO = {"_hd": "HD", "_lejos": "lejanos"}
ID = r"(?:QA|BM|CG|KIMI-Task|AZ|G)-?\d+[a-z]?\b"


def codigo(m):
    c = m.group(1)
    if c in CODIGO:
        return CODIGO[c]
    if re.match(r"(src/engine/)?\w+\.js$", c):  # «que `streaming.js` no reconoce» -> «que el motor no reconoce»
        return "el motor"
    return "" if re.search(r"[/.()=<>{}]|Test$|^AV\.", c) else c.replace("_", " ").strip()


def limpiar(t):
    t = re.sub(r"<br\s*/?>.*", "", t)
    t = re.sub(r"\[[^\]]*\](?!\()", "", t)     # [notas internas]
    t = re.sub(r"\([^()]*\)", "", t)            # paréntesis: rutas, quién, cuándo
    t = re.sub(r"`([^`]*)`", codigo, t)         # código y rutas: fuera; un nombre suelto se queda en texto
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)
    t = re.sub(r"[*#>]|(?<!\w)_|_(?!\w)", "", t)
    t = re.sub(r"\S+/\S+\.\w+", "", t)          # rutas sin comillas
    t = re.sub(r"^\s*\d{1,2}-[a-z]{3}\s*:\s*", "", t)  # «1-nov: …»
    t = re.sub(r"(?:(?<=\s)|^)" + ID + r"(?:\s*(?:,|y|e|\+)\s*" + ID + r")*\s*[·:,]?\s*", "", t)  # ids sueltos
    t = re.sub(r"\b\w+(?:Test|\.js|\.py|\.md)\b|\bTransferNow\b", "", t)  # nombres de pruebas, archivos y servicios
    t = re.sub(r"\s{2,}", " ", t)
    for _ in range(2):  # preposiciones que se quedaron sin su complemento
        t = re.sub(r"\b(de|del|en|con|y|e|a)\s+(?=[,.:;]|$|(?:y|e|que|para|en|de|del|con|a)\b)", "", t)
    t = re.sub(r"\s+([,.:;»])", r"\1", t)
    t = re.sub(r"\s{2,}", " ", t).strip(" ·:,;.-—")
    if len(t) > 90:
        t = t[:88].rsplit(" ", 1)[0].rstrip(" ,;:·-") + "…"
    return t[:1].upper() + t[1:] if t else t


def titulo(desc, tid=None, negrita=True):
    """Primera frase en negrita; si no la hay (o se queda vacía), la primera frase del texto."""
    def sin_prefijo(t):
        if tid:
            t = re.sub(r"^\s*" + re.escape(tid) + r"\b\s*(\([^)]*\))?\s*[·:,.\-—]?\s*", "", t)
        return re.sub(r"^\s*(Mac|Nube|Web|Grok|Kimi|Cursor)\b\s*(\([^)]*\))?\s*[:,·]\s*", "", t)  # «Mac (GPU…): …»
    m = re.search(r"\*\*(.+?)\*\*", desc) if negrita else None
    t = limpiar(sin_prefijo(m.group(1))) if m else ""
    if len(t) < 4:
        resto = sin_prefijo(desc[m.end():] if m else desc)
        resto = re.sub(r"\([^()]*\)|`[^`]*`", lambda x: x.group(0) if x.group(0)[0] == "`" else "", resto)
        t = limpiar(re.split(r"(?<![\d])(?<!\bcap)(?<!\bcaps)(?<!\bp\. ej)[.;:](?=\s|$)|\s—\s", resto.replace("**", ""), maxsplit=1, flags=re.I)[0])
    return t


def celdas(l):
    c = [x.strip() for x in l.strip().strip("|").split("|")]
    return c if len(c) >= 2 else None


def publicable(desc, t):
    if not t or len(t) < 4:
        return False
    base = re.sub(r"`[^`]*`", "", re.sub(r"\([^()]*\)", "", desc))[:500]
    return not (DENY.search(t) or DENY_TITULO.search(t) or DENY.search(base))


def fila(tid, carril, crudo, desc, n, fechas, extra="", negrita=True, t=None):
    e = estado(crudo)
    if e is None:
        return None
    t = t or titulo(desc, tid, negrita)
    if not publicable(desc, t):
        return None
    f = fechas.get(n)
    d = f.date() if f else fecha_texto(crudo + " " + extra)
    return {"id": tid, "carril": carril, "estado": e, "titulo": t, "fecha": d.isoformat() if d else None, "_n": n}


ALIAS = {}  # BMnnn -> título de la fila de Kimi/Grok/Web que «PASA A LA MAC (BMnnn)»


def api():
    L = leer("TAREAS_API.md")
    if not L:
        return []
    texto = "\n".join(L)
    fechas, out, on = blame("TAREAS_API.md"), [], False
    for i, l in enumerate(L, 1):
        if l.startswith("## "):
            on = l.startswith("## Estado")
            continue
        c = celdas(l) if on and l.startswith("|") else None
        if not c or not re.fullmatch(r"[A-Z]+\d+", c[0]):
            continue
        tid, crudo = c[0], c[1]
        res = c[3] if len(c) > 3 else ""
        m = re.search(r"\*\*" + re.escape(tid) + r"\b[^*]*\*\*[^\n]*", texto)  # definición: «**BM126 · Datos corregidos:**»
        bajo = crudo.lower()
        carril = ("Nube" if re.search(r"\bnube\b", bajo) or re.match(r"nube\b", res.lower())
                  else "Grok/Cursor" if re.search(r"\bgrok\b|\bcursor\b", bajo)
                  else "Web" if re.search(r"\bweb\b", bajo) or re.match(r"web\b", res.lower())
                  else "Mac")
        al = ALIAS.get(tid)
        desc, t = (al[1], al[0]) if al else (m.group(0), titulo(m.group(0), tid)) if m else (res, None)
        if not al and m and len(t) < 4:  # «**AY1 (F0.1…):**» sin texto detrás: se usa el resultado
            desc, t = res, None
        r = fila(tid, carril, crudo, desc, i, fechas, res[:30], negrita=bool(m) and t is not None, t=t)
        if r:
            out.append(r)
    return out


def tablero(nombre, patron, carril):
    L = leer(nombre)
    if not L:
        return []
    fechas, out = blame(nombre), []
    for i, l in enumerate(L, 1):
        c = celdas(l) if l.startswith("|") else None
        if not c or len(c) < 3 or not re.fullmatch(patron, c[0]):
            continue
        m = re.search(r"pasa a la mac \((BM\d+)", c[1], re.I)
        if m:
            ALIAS[m.group(1)] = (titulo(c[2], c[0]), c[2])
        r = fila(c[0], carril, c[1], c[2], i, fechas, c[1])
        if r:
            out.append(r)
    return out


def cap1():
    L = leer("CAP1_PENDIENTE.md")
    if not L:
        return None
    h = p = f = 0
    tabla = False
    for l in L:
        if tabla and not l.startswith("|"):
            break  # solo la primera tabla (los hitos); la de decisiones de Kelvin no cuenta
        c = celdas(l) if l.startswith("|") else None
        if c and len(c) >= 3 and re.fullmatch(r"\d+", c[0]):
            tabla = True
        if not c or len(c) < 3 or not re.fullmatch(r"\d+", c[0]):
            continue
        e = c[2].lower()
        if "parcial" in e:
            p += 1
        elif "falta" in e:
            f += 1
        elif "hecho" in e:
            h += 1
    return {"hitos": h + p + f, "hechos": h, "parciales": p, "faltan": f} if h + p + f else None


def main():
    otras = tablero("TAREAS_KIMI.md", r"KIMI-Task-\d+", "Kimi") + \
        tablero("TAREAS_CURSOR_GROK.md", r"CG-\d+", "Grok/Cursor") + tablero("TAREAS_WEB.md", r"W\d+", "Web") + tablero("TAREAS_NUBE.md", r"N\d+", "Nube")
    filas = api() + otras  # api() después: usa los ALIAS de los otros tableros
    hoy = dt.datetime.now(AST).date().isoformat()
    por = {k: [] for k in CARRILES}
    res = {"en_construccion": 0, "pendientes": 0, "bloqueadas": 0, "hechas_hoy": 0, "hechas": 0}
    for k in CARRILES:
        mias = [r for r in filas if r["carril"] == k]
        vivas = [r for r in mias if r["estado"] != "hecha"]
        hechas = sorted((r for r in mias if r["estado"] == "hecha"), key=lambda r: (r["fecha"] or "", r["_n"]), reverse=True)
        res["en_construccion"] += sum(r["estado"] == "en construcción" for r in vivas)
        res["pendientes"] += sum(r["estado"] == "pendiente" for r in vivas)
        res["bloqueadas"] += sum(r["estado"] == "bloqueada" for r in vivas)
        res["hechas_hoy"] += sum(r["fecha"] == hoy for r in hechas)
        res["hechas"] += len(hechas)
        for r in vivas + hechas[:HECHAS_POR_CARRIL]:
            por[k].append({x: r[x] for x in ("id", "estado", "titulo", "fecha")})
    try:
        sha = subprocess.run(["git", "-C", R, "rev-parse", "--short=7", "HEAD"], capture_output=True, text=True,
                             timeout=20).stdout.strip()
    except Exception:
        sha = ""
    out = {"generado": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "sha": sha, "hoy": hoy,
           "resumen": res, "cap1": cap1(), "por_agente": por}
    if not filas:
        sys.exit("estado.py: no encontré ninguna tarea en docs/equipo/")
    json.dump(out, sys.stdout, ensure_ascii=False, separators=(",", ":"))
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
