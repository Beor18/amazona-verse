"""Sonidos del JUEGO (no del pitch): síntesis numpy -> assets/audio/<nombre>.ogg y .mp3.

  aterrizar_techo · posarse_rama · despegar · nido_chispa · eclosion_huevo

- Mono, 48 kHz, cortos (< 30 KB cada archivo) y amables para niños: sin graves que retumben
  (paso alto de 90 Hz), sin agudos ásperos (paso bajo de 9,5 kHz), ataques redondeados.
- Volumen consistente: todos a la misma sonoridad "activa" (K-weighted, -20 LU sobre la parte que suena)
  con pico máximo de -4 dBFS antes de codificar (la codificación sube algo los picos).
- Codifica con el audaspace de Blender (OGG Vorbis y MP3, sin bibliotecas externas) y valida decodificando.
- Escribe assets/audio/sonidos.json (tabla de nombres) y assets/audio/sonidos_b64.js (MP3 en base64,
  respaldo para cuando el host no sirva los archivos, igual que los *_glb.js).

Uso: python3.11 -I tools/audio/juego.py
"""
import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

from dsp import SR, eq, kweight, write_wav  # noqa: E402
import sfx as S  # noqa: E402  (reutiliza aleteo, crack, celesta, destellos y salas)

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEST = os.path.join(REPO, "assets", "audio")
BLENDER = os.path.expanduser("~/Applications/Blender.app/Contents/MacOS/Blender")
OBJETIVO = -20.0
PICO_MAX = -4.0
LIMITE_KB = 30


def mono(x):
    return x.mean(axis=1) if x.ndim == 2 else x


def n_(s):
    return int(round(s * SR))


def suave(x):
    """Cadena 'para niños': 90 Hz - 9,5 kHz, y fundidos sin clic."""
    y = eq(mono(x), [("hp", 90, 0.707, 0), ("lp", 9500, 0.707, 0), ("highshelf", 6000, 0.7, -2.0)])
    return S.edge(y, 0.001, 0.04)


def sonoridad_activa(x):
    """Loudness K-weighted de la parte que suena (bloques de 50 ms a menos de 20 dB del máximo)."""
    y = kweight(x)
    w = n_(0.05)
    k = len(y) // w
    p = np.mean(y[: k * w].reshape(k, w) ** 2, axis=1)
    act = p > p.max() * 10 ** (-20 / 10)
    return -0.691 + 10 * np.log10(np.mean(p[act]) + 1e-20)


def nivelar(x):
    g = 10 ** ((OBJETIVO - sonoridad_activa(x)) / 20)
    y = x * g
    pk = np.max(np.abs(y))
    if pk > 10 ** (PICO_MAX / 20):
        y *= 10 ** (PICO_MAX / 20) / pk
    return y


# ---------------------------------------------------------------------------
def tok(mods, dur, ataque=0.0012):
    t = np.arange(n_(dur)) / SR
    y = sum(a * np.sin(2 * np.pi * f * t + 0.7 * i) * np.exp(-t / tau) for i, (f, a, tau) in enumerate(mods))
    return y * np.minimum(1, t / ataque)


def roce(seed, dur=0.035, lo=1800, hi=5000):
    """Roce suave de una pata (garras sobre la corteza): ruido filtrado con subida y bajada redondas."""
    m = n_(dur)
    x = S.bandpass(S.rng(seed).standard_normal(m), lo, hi, 2)
    return x * np.sin(np.pi * np.arange(m) / m) ** 2


def aterrizar_techo():
    n = n_(0.75)
    out = np.zeros(n)
    fl = mono(S.aleteo_seq([8.5, 7.0], 0.17, seed=61, gain_curve=lambda u: 0.75,
                           pan_curve=lambda u: 0.0, bright_curve=lambda u: 0.8))
    out[: len(fl)] += fl[:n] * 0.8
    i = n_(0.20)
    golpe = tok([(105, 1.0, 0.045), (220, 0.45, 0.06), (540, 0.25, 0.05), (1250, 0.10, 0.03)], 0.45)
    out[i:i + len(golpe)] += golpe[: n - i]
    for k, dt in enumerate((0.035, 0.075)):  # las patas se acomodan en el techo
        j = i + n_(dt)
        c = tok([(2600 + 300 * k, 0.5, 0.006), (4100, 0.2, 0.003)], 0.03, 0.0006) * 0.18
        out[j:j + len(c)] += c
    return S.wet(S.st(out), S.IR_CORTA, 0.18)


def posarse_rama():
    n = n_(0.8)
    out = np.zeros(n)
    fl = mono(S.aleteo_seq([7.5, 6.5], 0.14, seed=62, gain_curve=lambda u: 0.6,
                           pan_curve=lambda u: 0.0, bright_curve=lambda u: 0.75))
    out[: len(fl)] += fl[:n] * 0.7
    i = n_(0.17)
    rama = tok([(300, 0.8, 0.035), (760, 0.35, 0.02), (1500, 0.12, 0.01)], 0.25)
    out[i:i + len(rama)] += rama * 0.7
    t = np.arange(n_(0.14)) / SR  # crujido pequeño de la rama que se dobla
    cruj = np.sin(2 * np.pi * np.cumsum(520 + 140 * t / t[-1]) / SR) * np.sin(np.pi * t / t[-1]) ** 2 * 0.08
    j = i + n_(0.02)
    out[j:j + len(cruj)] += cruj
    for k, dt in enumerate((0.05, 0.13, 0.19)):  # roce de patas suave
        r = roce(70 + k, 0.03 + 0.008 * k) * (0.22 - 0.04 * k)
        j = i + n_(dt)
        out[j:j + len(r)] += r
    env = np.exp(-np.arange(n - i) / (0.08 * SR))
    kern = (np.arange(400) / 40.0) * np.exp(1 - np.arange(400) / 40.0)
    gr = (S.rng(63).random(n - i) < 0.05 * env) * S.rng(64).uniform(0.3, 1, n - i) * env
    out[i:] += S.bandpass(np.convolve(gr, kern)[: n - i], 1500, 6000, 2) * 0.08
    return S.wet(S.st(out), S.IR_BOSQUE, 0.15)


def despegar():
    x = S.aleteo_seq([7.6, 7.0, 6.2], 0.62, seed=65, gain_curve=lambda u: 1.0 if u < 0.5 else 1 - 0.5 * (u - 0.5),
                     pan_curve=lambda u: 0.0, bright_curve=lambda u: 0.75 - 0.2 * u)
    y = mono(x)
    m = n_(0.25)  # la rama suelta: hojas al impulsarse
    env = np.exp(-np.arange(m) / (0.07 * SR))
    kern = (np.arange(400) / 40.0) * np.exp(1 - np.arange(400) / 40.0)
    gr = (S.rng(66).random(m) < 0.06 * env) * S.rng(67).uniform(0.3, 1, m) * env
    y[:m] += S.bandpass(np.convolve(gr, kern)[:m], 1500, 6000, 2) * 0.1
    return S.wet(S.st(y), S.IR_BOSQUE, 0.15)


def nido_chispa():
    n = n_(1.1)
    out = np.zeros(n)
    for k, mid in enumerate([81, 86, 90, 93]):  # la, re, fa#, la: pentatónica de re, subiendo
        s = S.cut(S.celesta(mid), 0.9) * (0.5 + 0.08 * k)
        i = n_(0.065 * k)
        L = min(len(s), n - i)
        out[i:i + L] += s[:L]
    out += S.glitter(n, 35, 68, 0.35, 0.05) * 0.08
    return S.wet(S.st(out), S.IR_BOSQUE, 0.3)


def eclosion_huevo():
    n = n_(1.75)
    out = np.zeros(n)
    for t0, sd, nc, g in [(0.0, 71, 6, 0.35), (0.30, 72, 9, 0.5), (0.56, 73, 16, 0.75)]:
        c = S.crack(sd, nc, 0.03, 1.1) * g
        i = n_(t0)
        out[i:i + len(c)] += c[: n - i]
    i = n_(0.62)  # pop redondo
    m = n_(0.09)
    t = np.arange(m) / SR
    f = 300 + 650 * (1 - np.exp(-t / 0.012))
    out[i:i + m] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.028) * np.minimum(1, t / 0.0015) * 0.9
    for k, mid in enumerate([86, 90, 93, 98]):
        s = S.cut(S.celesta(mid), 0.9) * (0.3 - 0.03 * k)
        j = n_(0.68 + 0.06 * k)
        L = min(len(s), n - j)
        out[j:j + L] += s[:L]
    p = S.pio(9) * 0.22
    j = n_(0.95)
    out[j:j + len(p)] += p[: n - j]
    return S.wet(S.st(out), S.IR_BOSQUE, 0.22)


SONIDOS = {
    "aterrizar_techo": (aterrizar_techo, "Vittata aterriza en un techo (aletazos de frenado + golpe hueco de madera)."),
    "posarse_rama": (posarse_rama, "Se posa en una rama: aletazo, rama, crujido y roce de patas suave."),
    "despegar": (despegar, "Despega con aleteo (5 aletazos) y hojas al impulsarse."),
    "nido_chispa": (nido_chispa, "Chispa del nido cuando hay algo nuevo (celesta en pentatónica)."),
    "eclosion_huevo": (eclosion_huevo, "Eclosión: tres cracks, pop, destellos y un pío."),
}

ENC = r'''
import aud, json, os, sys
src, dst = sys.argv[sys.argv.index("--") + 1:][:2]
res = {}
for f in sorted(os.listdir(src)):
    if not f.endswith(".wav"):
        continue
    n = f[:-4]
    s = aud.Sound(os.path.join(src, f))
    o = os.path.join(dst, n + ".ogg")
    m = os.path.join(dst, n + ".mp3")
    s.write(o, 48000, aud.CHANNELS_MONO, aud.FORMAT_FLOAT32, aud.CONTAINER_OGG, aud.CODEC_VORBIS, 72000)
    s.write(m, 48000, aud.CHANNELS_MONO, aud.FORMAT_S16, aud.CONTAINER_MP3, aud.CODEC_MP3, 80000)
    r = {}
    for k, p in (("ogg", o), ("mp3", m)):
        d = aud.Sound(p).data()
        r[k] = {"bytes": os.path.getsize(p), "muestras": int(d.shape[0]), "pico": float(abs(d).max())}
    res[n] = r
print("AVJSON" + json.dumps(res))
'''


def main():
    os.makedirs(DEST, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="av_juego_")
    try:
        info = {}
        for nombre, (fn, desc) in SONIDOS.items():
            x = nivelar(suave(fn()))
            write_wav(os.path.join(tmp, nombre + ".wav"), x, bits=24)
            info[nombre] = {"descripcion": desc, "duracion_s": round(len(x) / SR, 3),
                            "sonoridad_activa_lu": round(sonoridad_activa(x), 1),
                            "pico_wav_dbfs": round(20 * np.log10(np.max(np.abs(x))), 1)}
        enc = os.path.join(tmp, "enc.py")
        open(enc, "w").write(ENC)
        p = subprocess.run([BLENDER, "-b", "--factory-startup", "--python", enc, "--", tmp, DEST],
                           capture_output=True, text=True, timeout=300)
        line = next((l for l in p.stdout.splitlines() if l.startswith("AVJSON")), None)
        if not line:
            sys.exit("Blender no codificó:\n" + p.stdout[-2000:] + p.stderr[-2000:])
        dec = json.loads(line[6:])
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    ok = True
    b64 = {}
    for nombre, d in info.items():
        for k in ("ogg", "mp3"):
            e = dec[nombre][k]
            d[k] = {"archivo": f"{nombre}.{k}", "kb": round(e["bytes"] / 1024, 1),
                    "pico_decodificado": round(20 * np.log10(max(e["pico"], 1e-9)), 1)}
            if e["bytes"] > LIMITE_KB * 1024 or e["pico"] >= 1.0:
                ok = False
        b64[nombre] = base64.b64encode(open(os.path.join(DEST, nombre + ".mp3"), "rb").read()).decode()
        print(f"  {nombre:<16s} {d['duracion_s']:.2f} s  {d['sonoridad_activa_lu']:6.1f} LU  "
              f"ogg {d['ogg']['kb']:5.1f} KB ({d['ogg']['pico_decodificado']} dBFS)  "
              f"mp3 {d['mp3']['kb']:5.1f} KB ({d['mp3']['pico_decodificado']} dBFS)")
    tabla = {
        "_nota": "Sonidos del juego sintetizados con tools/audio/juego.py. Se tocan con G.audio.play(nombre); "
                 "src/engine/audio.js elige .ogg o .mp3 según el navegador y respeta silencio y autoplay.",
        "formato": "mono 48 kHz; OGG Vorbis 72 kbps y MP3 80 kbps",
        "sonidos": info,
    }
    json.dump(tabla, open(os.path.join(DEST, "sonidos.json"), "w"), indent=1, ensure_ascii=False)
    with open(os.path.join(DEST, "sonidos_b64.js"), "w") as f:
        f.write("/* Generado por tools/audio/juego.py: MP3 en base64 para cuando el host no sirve assets/audio/. */\n")
        f.write("window.AV_AUDIO_B64 = " + json.dumps(b64) + ";\n")
    if not ok:
        sys.exit("algún archivo supera 30 KB o recorta al decodificar")


if __name__ == "__main__":
    main()
