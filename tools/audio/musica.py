"""Música original del pitch de Amazona Verse (síntesis numpy, 100 BPM, re mayor).

Sigue el mapa de tools/audio/tiempos.json (secciones en compases de 2,4 s):
  gancho (c0-11: silencio hasta c4, cuatro solo y pad) · mundo (c11-20: plena completa)
  aprender (c20-36: marimba, picado de cuatro, cuá) · criadero (c36-41: celesta, latido, florece)
  tecnología (c41-49: pluck y sub, energía baja) · mercado (c49-59: plena electrónica)
  cierre (c59-69: tema emotivo, corte seco 152.4-153.6, despegue, golpe de logo en c66).

Escribe OUT/musica/musica.wav, los subgrupos OUT/musica/grupo_*.wav y OUT/musica/musica_info.json.
Uso: python3.11 -I musica.py
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

import instrumentos as I  # noqa: E402
from dsp import (OUT, SR, eq, fftconv, lufs, make_ir, place, rng, true_peak_db, undb,  # noqa: E402
                 write_wav)

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, "tiempos.json")))
BPM = T["bpm"]
SPB = 60.0 / BPM
BAR = SPB * T["tiempos_por_compas"]
DUR = T["duracion_s"]
N = int(round(DUR * SR))
SEC = {s["id"]: (s["inicio_c"], s["fin_c"]) for s in T["secciones"]}
CORTE = T["eventos"]["silencio_musica"]
ENTRA = T["eventos"]["musica_entra_s"]
LOGO = T["eventos"]["logo_s"]

GRUPOS = ["cuatro", "perc", "bat", "bajo", "pad", "teclas", "fx"]
B = {g: np.zeros((N, 2)) for g in GRUPOS}
R = rng(2024)


def tb(c, beat=0.0):
    return c * BAR + beat * SPB


def put(g, sig, t, db=0.0, pan=0.0, jitter=0.0):
    if jitter:
        t += R.normal(0, jitter)
    place(B[g], sig, t, float(undb(db)), pan)


def hum(db_range=1.5):
    return R.uniform(-db_range, db_range)


# ---------------------------------------------------------------------------
# Armonía
# ---------------------------------------------------------------------------
ACORDES = {}


def acordes(c0, lista):
    """lista de compases; cada elemento 'D' o 'Asus4 A' (dos mitades)."""
    for i, s in enumerate(lista):
        partes = s.split()
        ACORDES[c0 + i] = partes


def acorde(c, beat=0.0):
    p = ACORDES.get(c, ["D"])
    return p[min(len(p) - 1, int(beat // (4 / len(p))))]


def tonos(ch, lo, hi):
    _, pcs, _ = I.parse_chord(ch)
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


def bajo_de(ch, lo=33, hi=45):
    _, _, bpc = I.parse_chord(ch)
    for m in range(lo, hi + 1):
        if m % 12 == bpc:
            return m
    return lo


def quinta(ch, lo=33, hi=50):
    rp, _, _ = I.parse_chord(ch)
    r = bajo_de(ch.split("/")[0], lo, hi)
    return r + 7


acordes(4, ["Bm", "G", "D", "A", "Bm", "G", "Asus4 A"])                         # gancho c4-10
acordes(11, ["D", "D", "G", "A7", "D", "D", "G", "A7", "D"])                      # mundo c11-19
acordes(20, ["G", "A", "F#m", "Bm", "G", "A", "D", "D",
             "Em", "A", "F#m", "Bm", "G", "A", "D", "Asus4 A"])                   # aprender c20-35
acordes(36, ["D", "Bm", "G", "A", "D"])                                           # criadero c36-40
acordes(41, ["Bm", "G", "D", "A", "Bm", "G", "D", "A"])                           # tecnología c41-48
acordes(49, ["Bm", "G", "D", "A", "Bm", "G", "D", "A", "Em", "A"])                # mercado c49-58
acordes(59, ["G", "A", "Bm", "D/F#", "G", "G", "A", "D", "D", "D"])               # cierre c59-68


# ---------------------------------------------------------------------------
# Instrumentos con patrón
# ---------------------------------------------------------------------------
def melodia(c0, notas, g="cuatro", db=0.0, pan=-0.12, tremolo_desde=None, octava=0, flauta_db=None):
    """notas: lista de (nombre o None, duración en corcheas). Empieza en el compás c0."""
    t8 = SPB / 2
    pos = 0.0
    for nom, d in notas:
        if nom is not None:
            m = I.n2m(nom) if isinstance(nom, str) else nom
            m += 12 * octava
            t = tb(c0) + pos * t8
            dur = d * t8
            if tremolo_desde is not None and dur >= tremolo_desde:
                k = 0
                tt = 0.0
                while tt < dur - 0.02:
                    v = 0.55 if k % 2 == 0 else 0.4
                    s = I.cuatro_pluck((m, m), 0.35, v, seed=k % 4, bright=0.8, decay=1.0)
                    put(g, s, t + tt, db - 2 + hum(0.8), pan, 0.003)
                    tt += SPB / 6
                    k += 1
            else:
                s = I.cuatro_pluck((m, m), max(0.5, dur + 0.6), 0.8, seed=int(pos) % 5, bright=0.85,
                                   decay=1.8 + 0.4 * (m < 66))
                put(g, s, t, db + hum(1.0), pan, 0.004)
            if flauta_db is not None:
                put("teclas", I.flauta(m + 12, dur * 0.95, 0.7, seed=int(pos)), t, flauta_db, 0.2)
        pos += d


TEMA_A = [("F#5", 2), ("E5", 1), ("D5", 1), ("B4", 3), ("D5", 1),
          ("E5", 2), ("D5", 1), ("B4", 1), ("G4", 3), ("A4", 1),
          ("F#4", 2), ("A4", 1), ("D5", 1), ("F#5", 3), ("E5", 1),
          ("E5", 4), ("C#5", 2), ("A4", 2)]
TEMA_CIERRE = [("D5", 2), ("B4", 1), ("D5", 1), ("G5", 3), ("F#5", 1),
               ("E5", 3), ("C#5", 1), ("A4", 2), ("B4", 1), ("C#5", 1),
               ("D5", 2), ("C#5", 1), ("B4", 1), ("F#5", 4),
               ("E5", 2), ("D5", 2), ("A4", 4),
               ("B4", 2), ("D5", 2)]
TEMA_VUELO = [("G5", 2), ("F#5", 1), ("G5", 1), ("B5", 3), ("A5", 1),
              ("A5", 2), ("E5", 1), ("F#5", 1), ("G5", 2), ("A5", 2)]
TEMA_FINAL = [("F#4", 2), ("A4", 1), ("D5", 1), ("F#5", 3), ("E5", 1), ("D5", 8)]


def pad(c0, c1, db=0.0, lo=50, hi=69, attack=1.2, release=1.6, fc=1600.0, voices=3, vib=0.0, max_notas=4):
    """Pad: une compases consecutivos con el mismo acorde."""
    c = c0
    while c < c1:
        partes = ACORDES.get(c, ["D"])
        if len(partes) == 1:
            ch = partes[0]
            c_end = c + 1
            while c_end < c1 and ACORDES.get(c_end, [""]) == [ch]:
                c_end += 1
            spans = [(tb(c), tb(c_end), ch)]
            c = c_end
        else:
            spans = [(tb(c, 2 * i), tb(c, 2 * i + 2), p) for i, p in enumerate(partes)]
            c += 1
        for t0, t1, ch in spans:
            ns = tonos(ch, lo, hi)
            # voces repartidas: hasta max_notas notas espaciadas
            if len(ns) > max_notas:
                idx = np.linspace(0, len(ns) - 1, max_notas).round().astype(int)
                ns = [ns[i] for i in idx]
            for m in ns:
                s = I.pad_note(m, t1 - t0 + 0.15, attack=attack, release=release, fc=fc, voices=voices,
                               seed=m, vib=vib)
                put("pad", s, t0 - 0.05, db - 3 * np.log2(len(ns)))


def bajo_linea(c0, c1, patron, db=0.0, kind="redondo"):
    """patron: lista de (corchea_inicio, duración_corcheas, 'r'|'5'|'8'|'3')."""
    t8 = SPB / 2
    for c in range(c0, c1):
        for st8, d, grado in patron:
            ch = acorde(c, st8 / 2)
            r = bajo_de(ch)
            if grado == "5":
                m = bajo_de(ch.split("/")[0]) + 7
                if m > 47:
                    m -= 12
            elif grado == "8":
                m = r + 12
            elif grado == "3":
                _, pcs, _ = I.parse_chord(ch)
                m = r + ((pcs[1] - pcs[0]) % 12)
            else:
                m = r
            put("bajo", I.bajo(m, d * t8 * 0.92, 0.85, kind=kind, seed=c), tb(c) + st8 * t8, db + hum(0.8))


def rasgueo(c0, c1, patron, db=0.0, pan=-0.2):
    """patron: lista de (semicorchea, 'D'|'U'|'x' (apagado), velocidad)."""
    t16 = SPB / 4
    for c in range(c0, c1):
        for st16, kind, v in patron:
            ch = acorde(c, st16 / 4)
            if kind == "x":
                s = I.cuatro_strum(ch, 0.15, v, "down", seed=c + st16, muted=True, spread=0.005)
            elif kind == "U":
                s = I.cuatro_strum(ch, 0.9, v, "up", seed=c + st16, courses=[2, 3, 4], spread=0.007)
            else:
                s = I.cuatro_strum(ch, 1.4, v, "down", seed=c + st16)
            put("cuatro", s, tb(c) + st16 * t16, db + hum(1.0), pan, 0.004)


def plena(c0, c1, db=0.0, requinto_cada=4, guiro=True, maracas=True, seguidor=True, punteador=True, fills=True):
    t16 = SPB / 4
    for c in range(c0, c1):
        t0 = tb(c)
        if seguidor:
            for s16, hit, v in [(0, "apagado", -4), (2, "abierto", 0), (6, "abierto", -1), (8, "apagado", -5),
                                (10, "abierto", 0), (14, "abierto", -1), (15, "apagado", -9)]:
                put("perc", I.pandero("seguidor", hit, (c + s16) % 4), t0 + s16 * t16, db + v + hum(), -0.2, 0.004)
        if punteador:
            for s16, hit, v in [(0, "apagado", -8), (4, "slap", -2), (7, "slap", -8), (8, "apagado", -8),
                                (12, "slap", -2), (15, "slap", -7)]:
                put("perc", I.pandero("punteador", hit, (c + s16) % 4), t0 + s16 * t16, db + v - 2 + hum(), 0.28, 0.004)
        if guiro:
            for b in range(4):
                put("perc", I.guiro("largo", (c + b) % 4), t0 + b * SPB, db - 9 + hum(1), 0.45, 0.003)
                put("perc", I.guiro("corto", (c + b + 1) % 4), t0 + b * SPB + 2 * t16, db - 12 + hum(1), 0.45, 0.003)
                put("perc", I.guiro("muy_corto", (c + b + 2) % 4), t0 + b * SPB + 3 * t16, db - 14 + hum(1), 0.45, 0.003)
        if maracas:
            for e in range(8):
                put("perc", I.maraca((c + e) % 6), t0 + e * 2 * t16, db - 15 + (2 if e % 2 else 0) + hum(), 0.55, 0.004)
        if fills and requinto_cada and (c - c0) % requinto_cada == requinto_cada - 1:
            requinto_fill(c, db)
        elif fills:
            for s16, hit in [(3, "slap"), (11, "slap"), (14, "abierto")]:
                put("perc", I.pandero("requinto", hit, (c + s16) % 4), t0 + s16 * t16, db - 9 + hum(), -0.45, 0.004)


def requinto_fill(c, db=0.0, desde=8):
    t16 = SPB / 4
    rr = rng(900 + c)
    for s16 in range(desde, 16):
        if rr.random() < 0.82:
            hit = "slap" if rr.random() < 0.6 else "abierto"
            put("perc", I.pandero("requinto", hit, s16 % 4), tb(c) + s16 * t16,
                db - 6 + (s16 - desde) * 0.5 + hum(), -0.45, 0.003)


def bateria(c0, c1, db=0.0, kick="4", clap=True, hats="16", open_hat=True, kick_kind="tropical"):
    t16 = SPB / 4
    kicks = []
    for c in range(c0, c1):
        t0 = tb(c)
        steps = {"4": [0, 4, 8, 12], "2": [0, 8], "dembow": [0, 6, 8, 14], "": []}[kick]
        for s in steps:
            put("bat", I.kick(kick_kind), t0 + s * t16, db)
            kicks.append(t0 + s * t16)
        if clap:
            for s in (4, 12):
                put("bat", I.clap(c % 2), t0 + s * t16, db - 6 + hum(0.5), 0.0)
        if hats:
            for s in range(16 if hats == "16" else 0, 16):
                pass
            st = range(16) if hats == "16" else range(0, 16, 2)
            for s in st:
                acc = 0 if s % 4 == 2 else (-6 if s % 2 else -3)
                put("bat", I.hat(False, s % 3), t0 + s * t16, db - 15 + acc + hum(1), 0.3, 0.002)
        if open_hat:
            for s in (2, 6, 10, 14):
                put("bat", I.hat(True, s % 2), t0 + s * t16, db - 19 + hum(1), 0.35, 0.002)
    return kicks


def arpegio_marimba(c0, c1, db=0.0, lo=67, hi=88):
    t8 = SPB / 2
    for c in range(c0, c1):
        for e in range(8):
            ch = acorde(c, e / 2)
            ns = tonos(ch, lo, hi)
            seq = ns[:5] + ns[3:0:-1]
            m = seq[e % len(seq)]
            put("teclas", I.marimba(m), tb(c) + e * t8, db + (0 if e % 2 == 0 else -3) + hum(1),
                -0.3 if e % 2 else 0.3, 0.003)


def arpegio_celesta(c0, c1, db=0.0, lo=74, hi=98, paso=0.5):
    t = paso * SPB
    for c in range(c0, c1):
        k = int(4 / paso)
        for e in range(k):
            ch = acorde(c, e * paso)
            ns = tonos(ch, lo, hi)
            seq = ns[:6] + ns[4:0:-1]
            m = seq[e % len(seq)]
            put("teclas", I.celesta(m), tb(c) + e * t, db + (0 if e % 2 == 0 else -2.5) + hum(1),
                -0.5 + (e % 4) / 3, 0.003)


def arpegio_pluck(c0, c1, db=0.0, lo=59, hi=79, acentos=(0, 3, 6, 8, 11, 14), dbcurve=None):
    t16 = SPB / 4
    for c in range(c0, c1):
        extra = dbcurve(c) if dbcurve else 0.0
        for s in range(16):
            ch = acorde(c, s / 4)
            ns = tonos(ch, lo, hi)
            seq = [ns[0], ns[min(2, len(ns) - 1)], ns[min(3, len(ns) - 1)], ns[1], ns[min(4, len(ns) - 1)], ns[1]]
            m = seq[s % len(seq)]
            put("teclas", I.pluck_synth(m, 30), tb(c) + s * t16,
                db + extra + (0 if s in acentos else -7) + hum(0.7), 0.0)


# ---------------------------------------------------------------------------
# Secciones
# ---------------------------------------------------------------------------
def sec_gancho():
    c0, c1 = SEC["gancho"]
    ce = int(round(ENTRA / BAR))  # c4
    put("fx", I.impacto(1, 0.7), tb(ce), -10)
    put("fx", I.platillo(3.5, 2), tb(ce), -22, 0.2)
    pad(ce, c1, db=-4, attack=2.2, fc=1300)
    melodia(ce, TEMA_A, db=-3, pan=-0.12)
    # segunda vuelta más llena: güiro y seguidor suaves, bajo, contestación del cuatro
    c2 = ce + 4
    bajo_linea(c2, c1, [(0, 6, "r"), (6, 2, "5")], db=-4)
    for c in range(c2, c1):
        for b in range(4):
            put("perc", I.guiro("largo", (c + b) % 4), tb(c, b), -20 + 2 * (c - c2), 0.45, 0.003)
        for s16, hit in [(2, "abierto"), (10, "abierto")]:
            put("perc", I.pandero("seguidor", hit, s16 % 4), tb(c) + s16 * SPB / 4, -14 + 2 * (c - c2), -0.2)
    melodia(c2, [("B4", 3), ("D5", 1), ("F#5", 4), ("G5", 3), ("F#5", 1), ("D5", 4)], db=-6, pan=-0.12)
    requinto_fill(c1 - 1, -4, desde=8)
    rlen = 2 * BAR
    put("fx", I.riser(rlen, 3), tb(c1) - rlen, -15)
    put("fx", I.platillo(1.8, 4, reverse=True), tb(c1) - 1.8, -20, -0.2)


def sec_mundo():
    c0, c1 = SEC["mundo"]
    put("fx", I.impacto(5, 0.8), tb(c0), -11)
    put("fx", I.platillo(3.0, 6), tb(c0), -18, 0.25)
    plena(c0, c1 - 1, db=-2)
    rasgueo(c0, c1 - 1, [(0, "D", 0.8), (4, "D", 0.6), (6, "U", 0.45), (8, "x", 0.6), (10, "D", 0.6),
                         (12, "D", 0.65), (14, "U", 0.5)], db=-5)
    bajo_linea(c0, c1 - 1, [(0, 3, "r"), (3, 1, "5"), (4, 2, "r"), (6, 1, "3"), (7, 1, "5")], db=-2)
    pad(c0, c1, db=-14, fc=1400)
    # adornos del cuatro al final de las frases (en huecos de la voz)
    for c in (c0 + 3, c0 + 7):
        if c < c1:
            t16 = SPB / 4
            for k, nom in enumerate(["E5", "D5", "C#5", "B4", "A4", "G4", "F#4", "E4"]):
                s = I.cuatro_pluck((I.n2m(nom), I.n2m(nom)), 0.5, 0.65, seed=k, bright=0.9, decay=1.2)
                put("cuatro", s, tb(c, 2) + k * t16, -6 + hum(0.8), -0.12, 0.003)
    # último compás: corte en el tiempo 3 y repique de requinto
    cl = c1 - 1
    for t_beat in (0, 2):
        put("cuatro", I.cuatro_strum(acorde(cl), 1.2, 0.8, "down", seed=7 + t_beat), tb(cl, t_beat), -4, -0.2)
        put("perc", I.pandero("seguidor", "abierto", 1), tb(cl, t_beat), -2, -0.2)
        put("perc", I.pandero("punteador", "slap", 2), tb(cl, t_beat), -4, 0.28)
        put("bajo", I.bajo(bajo_de(acorde(cl)), 0.5, 0.9, seed=3), tb(cl, t_beat), -2)
    requinto_fill(cl, -3, desde=12)


def sec_aprender():
    c0, c1 = SEC["aprender"]
    arpegio_marimba(c0, c1, db=-9)
    pad(c0, c1, db=-15, fc=1200)
    bajo_linea(c0, c1, [(0, 3, "r"), (4, 3, "5")], db=-5)
    t16 = SPB / 4
    for c in range(c0, c1):
        for s in (0, 8):
            put("bat", I.kick("suave"), tb(c) + s * t16, -9)
        for s in (4, 12):
            put("perc", I.cua(c % 3), tb(c) + s * t16, -11 + hum(), 0.35, 0.003)
        for s in (2, 6, 10, 14):
            put("perc", I.guiro("corto", (c + s) % 4), tb(c) + s * t16, -14 + hum(), 0.45, 0.003)
        for s in range(16):
            put("perc", I.maraca(s % 6, 0.05), tb(c) + s * t16, -21 + (3 if s % 4 == 0 else 0) + hum(), 0.55, 0.003)
    # picado del cuatro en los contratiempos
    rasgueo(c0, c1, [(2, "x", 0.55), (6, "x", 0.5), (10, "x", 0.55), (14, "x", 0.5)], db=-4, pan=-0.25)
    # segunda mitad: contracanto de celesta y seguidor suave
    mid = c0 + 8
    melodia(mid, [("D6", 4), ("C#6", 2), ("A5", 2), ("B5", 6), ("A5", 2), ("F#5", 8), (None, 8)] * 2,
            g="cuatro", db=-11, pan=0.1)
    for c in range(mid, c1):
        for s16, hit in [(2, "abierto"), (10, "abierto")]:
            put("perc", I.pandero("seguidor", hit, s16 % 4), tb(c) + s16 * t16, -12 + hum(), -0.2)
    # transición al criadero: brillo ascendente
    put("teclas", I.shimmer(tonos("A", 69, 93), 1.2), tb(c1 - 1, 2.6), -14, 0.0)


def sec_criadero():
    c0, c1 = SEC["criadero"]
    pad(c0, c1, db=-9, fc=1500, attack=1.5, voices=4, vib=0.0015)
    arpegio_celesta(c0, c1, db=-17)
    for c in range(c0, c0 + 2):
        for b in (0, 2):
            put("perc", I.latido(c + b), tb(c, b), -6, 0.0)
    for c in range(c0, c1):
        put("bajo", I.bajo(bajo_de(acorde(c)), BAR * 0.95, 0.7, kind="sub"), tb(c), -6)
    # florece con la eclosión (c38 = c0 + 2)
    cf = c0 + 2
    put("teclas", I.shimmer(tonos("G", 74, 98), 0.9), tb(cf) - 0.9, -12, 0.0)
    put("cuatro", I.cuatro_strum("G", 2.5, 0.8, "down", seed=1), tb(cf), -6, -0.15)
    melodia(cf, [("B4", 3), ("D5", 1), ("G5", 4), ("A5", 3), ("G5", 1), ("E5", 4), ("F#5", 8)], db=-8, pan=-0.1,
            tremolo_desde=1.15)
    for c in range(cf, c1):
        for s16, hit in [(2, "abierto"), (10, "abierto")]:
            put("perc", I.pandero("seguidor", hit, s16 % 4), tb(c) + s16 * SPB / 4, -13 + hum(), -0.2)
        for b in range(4):
            put("perc", I.guiro("corto", (c + b) % 4), tb(c, b + 0.5), -20, 0.45, 0.003)


def sec_tecnologia():
    c0, c1 = SEC["tecnologia"]
    arpegio_pluck(c0, c1, db=-13, dbcurve=lambda c: min(0, -4 + (c - c0) * 0.8))
    pad(c0, c1, db=-12, fc=2200, attack=0.6)
    for c in range(c0, c1):
        put("bajo", I.bajo(bajo_de(acorde(c)), BAR * 0.96, 0.75, kind="sub"), tb(c), -6)
    bateria(c0 + 2, c1, db=-14, kick="", clap=False, hats="8", open_hat=False)
    bateria(c0 + 4, c1, db=-10, kick="2", clap=False, hats="", open_hat=False, kick_kind="suave")
    for c in range(c0 + 4, c1):
        for s16 in (4, 12):
            put("perc", I.cua(c % 3), tb(c) + s16 * SPB / 4, -16, 0.35, 0.003)
    rlen = 1 * BAR
    put("fx", I.riser(rlen, 9, 400, 6000), tb(c1) - rlen, -18)


def sec_mercado():
    c0, c1 = SEC["mercado"]
    put("fx", I.impacto(11, 0.6), tb(c0), -13)
    put("fx", I.platillo(2.5, 12), tb(c0), -20, -0.2)
    cb = c1 - 2  # compases de subida (Em, A)
    kicks = bateria(c0, cb, db=-5)
    plena(c0, cb, db=-6, maracas=False, requinto_cada=4)
    arpegio_pluck(c0, c1, db=-10)
    pad(c0, c1, db=-11, fc=2600, attack=0.3, release=0.8)
    bajo_linea(c0, cb, [(0, 3, "r"), (3, 3, "r"), (6, 2, "5")], db=-3, kind="sub")
    # riff del cuatro (tema en semicorcheas) en la segunda mitad
    cr = c0 + 4
    riff = [("F#5", 1), ("E5", 1), ("D5", 1), ("B4", 1), (None, 2), ("D5", 1), ("E5", 1),
            ("F#5", 2), (None, 2), ("A5", 1), ("F#5", 1), ("E5", 1), ("D5", 1)]
    for k in range(4):
        melodia(cr + k, riff, db=-8, pan=-0.12)
    rasgueo(c0, cb, [(0, "x", 0.5), (4, "D", 0.5), (8, "x", 0.5), (10, "U", 0.4), (12, "D", 0.5)], db=-10)
    # subida: bajo sostenido, redoble de palmadas y riser
    for c in range(cb, c1):
        put("bajo", I.bajo(bajo_de(acorde(c)), BAR * 0.95, 0.8, kind="sub"), tb(c), -4)
        put("bat", I.kick("tropical"), tb(c), -6)
    t16 = SPB / 4
    for s in range(32):
        frac = s / 32
        put("bat", I.clap(s % 2), tb(cb) + s * t16, -20 + 12 * frac, 0.0)
    requinto_fill(c1 - 1, -2, desde=4)
    put("fx", I.riser(2 * BAR, 13), tb(c1) - 2 * BAR, -14)
    # sidechain: el pad y el bajo respiran con el bombo
    return kicks


def sec_cierre():
    c0, c1 = SEC["cierre"]
    c_corte = int(np.floor(CORTE[0] / BAR))       # c63
    c_vuelo = int(round(CORTE[1] / BAR))          # c64
    c_logo = int(round(LOGO / BAR))               # c66
    # parte emotiva c59-c63
    pad(c0, c_corte + 1, db=-6, fc=1500, attack=1.8, voices=4, vib=0.002)
    melodia(c0, TEMA_CIERRE, db=-4, pan=-0.1, tremolo_desde=2.4)
    for c in range(c0, c_corte + 1):
        put("bajo", I.bajo(bajo_de(acorde(c)), BAR * 0.95, 0.7), tb(c), -7)
    for c in range(c0 + 2, c_corte + 1):
        for b in range(4):
            put("perc", I.guiro("largo", (c + b) % 4), tb(c, b), -21 + 2 * (c - c0), 0.45, 0.003)
        for s16, hit in [(2, "abierto"), (10, "abierto")]:
            put("perc", I.pandero("seguidor", hit, s16 % 4), tb(c) + s16 * SPB / 4, -15 + 2 * (c - c0), -0.2)
    # golpe en el c63 tiempo 1 y corte en el tiempo 2 (lo aplica la compuerta)
    put("cuatro", I.cuatro_strum("G", 1.3, 0.85, "down", seed=3), tb(c_corte), -4, -0.2)
    put("perc", I.pandero("seguidor", "abierto", 2), tb(c_corte), -4, -0.2)
    put("perc", I.pandero("punteador", "slap", 1), tb(c_corte, 1), -6, 0.28)
    # despegue c64-c65: banda completa + tema alto con flauta
    put("fx", I.impacto(21, 0.8), tb(c_vuelo), -9)
    put("fx", I.platillo(3.0, 22), tb(c_vuelo), -16, 0.2)
    plena(c_vuelo, c_logo, db=-3, requinto_cada=2)
    bateria(c_vuelo, c_logo, db=-8, clap=False, hats="8", open_hat=False)
    rasgueo(c_vuelo, c_logo, [(0, "D", 0.8), (4, "D", 0.6), (6, "U", 0.45), (8, "x", 0.6), (10, "D", 0.6),
                              (12, "D", 0.65), (14, "U", 0.5)], db=-6)
    bajo_linea(c_vuelo, c_logo, [(0, 3, "r"), (3, 1, "5"), (4, 2, "r"), (6, 1, "3"), (7, 1, "5")], db=-3)
    pad(c_vuelo, c_logo, db=-8, fc=2200, attack=0.15)
    melodia(c_vuelo, TEMA_VUELO, db=-4, pan=-0.1, flauta_db=-10)
    put("fx", I.riser(BAR, 23, 500, 8000), tb(c_logo) - BAR, -17)
    # golpe de logo: acorde grande que respira, sin ritmo
    put("fx", I.impacto(31, 1.3), tb(c_logo), -6)
    put("fx", I.platillo(4.5, 32), tb(c_logo), -14, 0.0)
    put("cuatro", I.cuatro_strum("D", 4.0, 0.95, "down", seed=11), tb(c_logo), -2, -0.15)
    put("bajo", I.bajo(bajo_de("D"), 3 * BAR, 0.9), tb(c_logo), -3)
    put("bajo", I.bajo(bajo_de("D") - 12 + 12, 3 * BAR, 0.6, kind="sub"), tb(c_logo), -6)
    for m in tonos("D", 50, 74):
        put("pad", I.pad_note(m, 2.6 * BAR, attack=0.05, release=2.2, fc=2400, voices=4, seed=m), tb(c_logo), -14)
    put("teclas", I.flauta(I.n2m("D6"), 1.6 * BAR, 0.7), tb(c_logo), -11, 0.2)
    put("perc", I.pandero("seguidor", "abierto", 0), tb(c_logo), -2, -0.2)
    put("perc", I.pandero("requinto", "slap", 0), tb(c_logo), -4, -0.45)
    # cola: última frase del tema y rasgueo final suave
    melodia(c_logo + 1, TEMA_FINAL, db=-6, pan=-0.1, tremolo_desde=3.5)
    put("cuatro", I.cuatro_strum("D", 2.8, 0.6, "down", seed=13, spread=0.03), tb(c1 - 1, 0.5), -8, -0.15)
    put("teclas", I.celesta(I.n2m("D7")), tb(c1 - 1, 1.0), -18, 0.3)


# ---------------------------------------------------------------------------
# Mezcla de la música
# ---------------------------------------------------------------------------
NIVELES = {"cuatro": 0.0, "perc": 0.0, "bat": -2.0, "bajo": -3.0, "pad": -2.0, "teclas": -2.0, "fx": -1.0}


def sidechain(x, kicks, depth_db=-5.0, rel=0.16):
    g = np.ones(len(x))
    k = int(0.6 * SR)
    t = np.arange(k) / SR
    # parte de 1 (sin escalón), baja en ~5 ms y se recupera con `rel`
    curve = 1 - (1 - undb(depth_db)) * (1 - np.exp(-t / 0.0025)) * np.exp(-t / rel)
    for tk in kicks:
        i = int(tk * SR)
        L = min(k, len(g) - i)
        if L > 0:
            g[i:i + L] = np.minimum(g[i:i + L], curve[:L])
    return x * g[:, None]


def compuerta(x):
    """Silencio absoluto antes de la entrada, en el corte del cierre y tras el final."""
    n = len(x)
    g = np.ones(n)
    i_in = int(ENTRA * SR)
    g[:i_in] = 0
    a, b = int(CORTE[0] * SR), int(CORTE[1] * SR)
    f = int(0.22 * SR)
    g[a:a + f] *= np.linspace(1, 0, f) ** 2
    g[a + f:b] = 0
    r_ = int(0.004 * SR)
    g[b:b + r_] *= np.linspace(0, 1, r_)
    end_fade = int(1.6 * SR)
    e = n - int(0.15 * SR)
    g[e - end_fade:e] *= np.linspace(1, 0, end_fade) ** 2
    g[e:] = 0
    return x * g[:, None]


def main():
    t_ini = time.time()
    sec_gancho()
    sec_mundo()
    sec_aprender()
    sec_criadero()
    sec_tecnologia()
    kicks = sec_mercado()
    sec_cierre()
    print(f"  notas renderizadas en {time.time() - t_ini:.1f} s")
    hall = make_ir(rt60=2.2, predelay=0.022, hf_ratio=0.4, lo_cut=220, hi_cut=8000, seed=3)
    room = make_ir(rt60=0.8, predelay=0.008, hf_ratio=0.5, lo_cut=250, hi_cut=9000, seed=4)
    envio = {"cuatro": (hall, 0.22), "perc": (room, 0.16), "bat": (room, 0.07), "bajo": (None, 0),
             "pad": (hall, 0.28), "teclas": (hall, 0.28), "fx": (hall, 0.18)}
    eqs = {
        "cuatro": None,  # cuerpo aparte
        "perc": [("hp", 70, 0.7, 0), ("peak", 3000, 1.0, -1.5)],
        "bat": [("hp", 35, 0.7, 0)],
        "bajo": [("hp", 32, 0.7, 0), ("lp", 2200, 0.7, 0), ("peak", 220, 1.2, -1.5)],
        "pad": [("hp", 140, 0.7, 0), ("peak", 2800, 0.8, -3.0), ("highshelf", 7000, 0.7, -2.0)],
        "teclas": [("hp", 180, 0.7, 0)],
        "fx": [("hp", 28, 0.7, 0)],
    }
    os.makedirs(os.path.join(OUT, "musica"), exist_ok=True)
    total = np.zeros((N, 2))
    c0m, c1m = SEC["mercado"]
    for g in GRUPOS:
        x = B[g]
        if g == "cuatro":
            x = I.cuatro_body(x)
        elif eqs[g]:
            x = eq(x, eqs[g])
        if g in ("pad", "bajo"):
            # bombeo solo en el mercado
            m = np.zeros(N, bool)
            m[int(tb(c0m) * SR):int(tb(c1m - 2) * SR)] = True
            xs = sidechain(x, kicks, -6 if g == "pad" else -4)
            x = np.where(m[:, None], xs, x)
        ir, w = envio[g]
        if ir is not None and w > 0:
            wv = fftconv(x.mean(axis=1), ir)[:N]
            x = x + w * wv
        x = x * undb(NIVELES[g])
        B[g] = x
        total += x
    # hueco para la voz y control de graves
    total = eq(total, [("peak", 2600, 0.8, -1.5), ("lowshelf", 90, 0.7, -1.0)])
    total = compuerta(total)
    for g in GRUPOS:
        B[g] = compuerta(B[g])
    # nivel de la música sola: -16 LUFS, pico < -3 dBTP (la mezcla final ajusta)
    l = lufs(total)
    gain = undb(-16.0 - l)
    total *= gain
    tp = true_peak_db(total)
    if tp > -3.0:
        total *= undb(-3.0 - tp)
        gain *= undb(-3.0 - tp)
    write_wav(os.path.join(OUT, "musica", "musica.wav"), total)
    for g in GRUPOS:
        y = B[g] * gain
        pk = np.max(np.abs(y))
        write_wav(os.path.join(OUT, "musica", f"grupo_{g}.wav"), y * (0.99 / pk if pk > 0.99 else 1))
    info = {"bpm": BPM, "duracion_s": DUR, "lufs": round(lufs(total), 2), "true_peak_dbtp": round(true_peak_db(total), 2),
            "secciones_s": {k: [round(tb(a), 3), round(tb(b), 3)] for k, (a, b) in SEC.items()},
            "acordes": {str(k): v for k, v in sorted(ACORDES.items())}}
    json.dump(info, open(os.path.join(OUT, "musica", "musica_info.json"), "w"), indent=1, ensure_ascii=False)
    print(f"  musica.wav: {info['lufs']} LUFS, {info['true_peak_dbtp']} dBTP, {DUR} s  ({time.time() - t_ini:.1f} s)")


if __name__ == "__main__":
    main()
