"""Voz en off del pitch: docs/pitch/VO.txt -> un WAV por bloque (macOS `say`, voz Paulina es_MX).

- Lee los bloques "[B01 · SECCIÓN · m:ss.s] texto".
- Corrige la pronunciación (diccionario FONETICA, verificado comparando la salida del TTS).
- Prosodia: "…" = coma + 0,32 s, [pausa] = 0,75 s, [pausa larga] = 1,3 s, MAYÚSCULAS = énfasis
  (sube el tono base 2 pasos y frena el ritmo un 12 %; Paulina ignora [[emph]]).
- Ajusta [[rate]] por bloque para que cada uno quepa en su ventana (hasta el bloque siguiente).
- Procesa (recorte, HPF, EQ, compresión suave, -19 LUFS) y escribe vo/VO_Bxx_SECCION.wav,
  vo/vo_bloques.json, vo/GUION_GRABACION.txt y vo/VO_completa_tts.wav (todos los bloques en su sitio).

Uso: python3.11 -I voz.py [--voz Paulina]
"""
import json
import os
import re
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

from dsp import (OUT, REPO, SR, env_follow, eq, lufs, read_wav, resample, smooth_ar,  # noqa: E402
                 undb, write_wav)

VO_TXT = os.path.join(REPO, "docs", "pitch", "VO.txt")
VOZ = "Paulina"
RATE_BASE = 158        # palabras por minuto del motor (sin contar pausas)
RATE_MAX = 186
RATE_MIN = 146
TARGET_LUFS = -19.0
MARGEN = 0.30          # aire mínimo antes del bloque siguiente (s)

# Pronunciación: probado generando ambas grafías y comparando muestras.
#  - boricua, El Yunque, coquí: el TTS ya los dice bien (salida idéntica a borícua/El Yúnke/kokí).
#  - "Vittata" la lee con doble t; "Vitáta" = vi-TÁ-ta.
#  - "Verse" la lee "Ver-se" (dos sílabas); "Vers" = una sílaba, como en inglés.
#  - "Crombuks" sale idéntico a "Crombúks" (acento en la 2ª); "Crómbuks" = CRÓM-buks, como "Chromebooks".
#  - "Güeb Asémbli" ya va bien (idéntico a "Güeb Asembli"): acento en "sém".
FONETICA = [
    (r"\bCrombuks\b", "Crómbuks"),
    (r"\bVittata\b", "Vitáta"),
    (r"\bAmazona Verse\b", "Amazona Vers"),
    (r"\bcoqui\b", "coquí"),
    (r"\bcoquis\b", "coquíes"),
    (r"\bYunque\b", "Yunque"),
    (r"\bboricua\b", "boricua"),
]

# Ajustes de interpretación por bloque (ritmo preferido y tono base)
# "inicio" adelanta un bloque respecto a VO.txt (máx. 0,6 s, acordado con el comité): B10 entra
# con el primer tiempo del cierre (141.6) y así no hay que acelerarlo.
POR_BLOQUE = {
    "B01": {"rate": 150},              # gancho: dramático, pausado
    "B10": {"inicio": 141.6},
    "B11": {"rate": 150},
    "B12": {"rate": 132, "pbas": -1},  # "la cotorra VUELVE A VOLAR": lento y cálido
}

TAG = re.compile(r"^\[(B\d+)\s*·\s*([^·\]]+?)\s*·\s*(\d+):(\d+(?:\.\d+)?)\]\s*$")
MAYUS = re.compile(r"\b[A-ZÁÉÍÓÚÜÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÜÑ]+)*\b")


def parse_vo(path):
    bloques = []
    cur = None
    for raw in open(path, encoding="utf-8"):
        line = raw.strip()
        m = TAG.match(line)
        if m:
            cur = {"id": m.group(1), "seccion": m.group(2).strip().upper(),
                   "inicio_s": int(m.group(3)) * 60 + float(m.group(4)), "texto": ""}
            bloques.append(cur)
            continue
        if cur is None:
            continue
        if not line or line.startswith("---"):
            if cur["texto"]:
                cur = None
            continue
        cur["texto"] = (cur["texto"] + " " + line).strip()
    return bloques


def slug(s):
    s = s.upper()
    for a, b in zip("ÁÉÍÓÚÜÑ", "AEIOUUN"):
        s = s.replace(a, b)
    return re.sub(r"[^A-Z0-9]+", "_", s).strip("_")


PAUSA_MS = 580         # + ~230 ms del punto = ~0,8 s
AIRE_MS = 150          # respiro extra entre frases cuando la ventana lo permite


def a_tts(texto, rate, pbas=0, aire=0):
    t = texto
    for pat, rep in FONETICA:
        t = re.sub(pat, rep, t)
    t = t.replace('"', "").replace("“", "").replace("”", "")
    if aire:  # antes de traducir [pausa], para no sumar los dos silencios
        t = re.sub(r"([.!?;])\s+(?!\[pausa)(?=\S)", rf"\1 [[slnc {aire}]] ", t)
    t = re.sub(r"\[pausa larga\]", " [[slnc 1300]] ", t)
    t = re.sub(r"\[pausa\]", f" [[slnc {PAUSA_MS}]] ", t)
    # "…" al final del bloque: entonación suspendida (coma) sin silencio extra
    t = re.sub(r"…\s*$", ",", t)
    t = re.sub(r"\s*…\s*", ", [[slnc 320]] ", t)
    slow = int(round(rate * 0.88))

    def enf(m):
        w = m.group(0).lower()
        return f"[[slnc 60]] [[pbas +2]] [[rate {slow}]] {w} [[rate {rate}]] [[pbas -2]]"

    t = MAYUS.sub(enf, t)
    pre = f"[[rate {rate}]] " + (f"[[pbas {pbas:+d}]] " if pbas else "")
    return re.sub(r"\s+", " ", pre + t).strip()


def render_say(texto_tts, voz):
    with tempfile.TemporaryDirectory() as d:
        txt = os.path.join(d, "t.txt")
        wav = os.path.join(d, "t.wav")
        with open(txt, "w", encoding="utf-8") as f:
            f.write(texto_tts)
        subprocess.run(["say", "-v", voz, "--file-format=WAVE", "--data-format=LEI16@48000",
                        "-o", wav, "-f", txt], check=True)
        x, sr = read_wav(wav)
    x = x[:, 0]
    return resample(x, sr, SR) if sr != SR else x


def recorte(x, pre=0.03, post=0.18):
    e = env_follow(x, 0.01)
    thr = np.max(e) * undb(-42)
    idx = np.where(e > thr)[0]
    if idx.size == 0:
        return x, 0.0
    a = max(0, idx[0] - int(pre * SR))
    b = min(len(x), idx[-1] + int(post * SR))
    return x[a:b], (idx[0] - a) / SR


def procesar(x):
    x = x - np.mean(x)
    y = eq(x, [("hp", 80, 0.7, 0), ("hp", 80, 0.7, 0), ("peak", 260, 1.0, -2.0),
               ("peak", 3300, 0.9, 2.0), ("highshelf", 7500, 0.7, 1.5)])
    # compresión suave 2:1 por encima de -26 dBFS RMS
    env = smooth_ar(env_follow(y, 0.02), 0.008, 0.15)
    lvl = 20 * np.log10(np.maximum(env, 1e-6))
    over = np.maximum(0, lvl + 26)
    g = undb(-over * 0.5)
    y = y * g
    # fundidos anti-clic
    fi, fo = int(0.008 * SR), int(0.06 * SR)
    y[:fi] *= np.linspace(0, 1, fi) ** 2
    y[-fo:] *= np.linspace(1, 0, fo) ** 2
    return y


def anclas_por_bloque(tiempos):
    """Palabras ancla que usan los SFX: {"B03": ["vuela", ...]}."""
    out = {}
    for c in tiempos.get("sfx", []):
        a = c.get("ancla")
        if a:
            b, w = a.split("|", 1)
            out.setdefault(b, []).append(w)
    return out


def marca_palabra(texto, palabra, rate, pbas, voz, aire=0):
    """Momento (s desde el inicio del habla) en que empieza `palabra`: se sintetiza el prefijo y se mide."""
    m = re.search(r"\b" + re.escape(palabra) + r"\b", texto, flags=0 if palabra.isupper() else re.IGNORECASE)
    if not m:
        return None
    pre = texto[: m.start()].rstrip()
    if not re.search(r"\w", pre):
        return 0.0
    x = render_say(a_tts(pre, rate, pbas, aire), voz)
    xt, onset = recorte(x, post=0.0)
    # el silencio final del prefijo se recorta: se suma la pausa que sí habría en la frase completa
    pausa = 0.0
    if pre.endswith("[pausa larga]"):
        pausa = 1.6
    elif pre.endswith("[pausa]"):
        pausa = 1.05
    elif pre.endswith("…"):
        pausa = 0.44
    elif pre[-1] in ",;:":
        pausa = 0.12
    elif pre[-1] in ".!?":
        pausa = 0.30 + aire / 1000
    return len(xt) / SR - onset + 0.05 + pausa


def main():
    voz = VOZ
    if "--voz" in sys.argv:
        voz = sys.argv[sys.argv.index("--voz") + 1]
    bloques = parse_vo(VO_TXT)
    if not bloques:
        sys.exit("VO.txt sin bloques")
    for b in bloques:
        b["inicio_guion_s"] = b["inicio_s"]
        ini = POR_BLOQUE.get(b["id"], {}).get("inicio")
        if ini is not None and abs(ini - b["inicio_s"]) <= 0.6:
            b["inicio_s"] = ini
    tiempos = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "tiempos.json")))
    dur_total = tiempos["duracion_s"]
    corte = tiempos["eventos"].get("silencio_musica", [None])[0]
    vo_dir = os.path.join(OUT, "vo")
    os.makedirs(vo_dir, exist_ok=True)
    for f in os.listdir(vo_dir):
        if f.startswith("VO_B") and f.endswith(".wav"):
            os.remove(os.path.join(vo_dir, f))
    stem = np.zeros(int(round(dur_total * SR)))
    anclas = anclas_por_bloque(tiempos)
    info = []
    for i, b in enumerate(bloques):
        fin_ventana = bloques[i + 1]["inicio_s"] if i + 1 < len(bloques) else dur_total - 8.0
        # B11 debe terminar antes del corte de la música
        if corte and b["inicio_s"] < corte < fin_ventana:
            fin_ventana = corte
        ventana = fin_ventana - b["inicio_s"] - MARGEN
        cfg = POR_BLOQUE.get(b["id"], {})
        rate = cfg.get("rate", RATE_BASE)
        pbas = cfg.get("pbas", 0)
        aire = AIRE_MS
        while True:
            tts = a_tts(b["texto"], rate, pbas, aire)
            x = render_say(tts, voz)
            xt, onset = recorte(x)
            habla = len(xt) / SR - onset - 0.18
            if habla <= ventana or rate >= RATE_MAX:
                break
            if aire:            # primero se quita el respiro extra, luego se acelera
                aire = 0
                continue
            rate = min(RATE_MAX, int(rate * min(1.12, max(1.02, habla / ventana + 0.01))) + 1)
        # con mucho aire, más pausado (nunca por debajo de RATE_MIN)
        if "rate" not in cfg and habla < 0.7 * ventana and rate > RATE_MIN:
            rate = max(RATE_MIN, int(rate * habla / (0.8 * ventana)))
            tts = a_tts(b["texto"], rate, pbas, aire)
            x = render_say(tts, voz)
            xt, onset = recorte(x)
            habla = len(xt) / SR - onset - 0.18
        marcas = {}
        for w in anclas.get(b["id"], []):
            mk = marca_palabra(b["texto"], w, rate, pbas, voz, aire)
            if mk is not None:
                marcas[w] = round(b["inicio_s"] + mk, 3)
        y = procesar(xt)
        l = lufs(y)
        y = y * undb(TARGET_LUFS - l)
        pk = np.max(np.abs(y))
        if pk > undb(-3):
            y *= undb(-3) / pk
        nombre = f"VO_{b['id']}_{slug(b['seccion'])}.wav"
        write_wav(os.path.join(vo_dir, nombre), y)
        t0 = b["inicio_s"] - onset
        i0 = int(round(t0 * SR))
        stem[i0:i0 + len(y)] += y[: max(0, min(len(y), len(stem) - i0))]
        palabras = len(re.findall(r"[\wÁÉÍÓÚÜÑáéíóúüñ]+", re.sub(r"\[[^\]]*\]", "", b["texto"])))
        d = {
            "id": b["id"], "seccion": b["seccion"], "archivo": nombre,
            "inicio_voz_s": round(b["inicio_s"], 3), "inicio_guion_s": round(b["inicio_guion_s"], 3),
            "inicio_archivo_s": round(t0, 3), "aire_frases_ms": aire,
            "onset_en_archivo_s": round(onset, 3), "dur_archivo_s": round(len(y) / SR, 3),
            "fin_voz_s": round(b["inicio_s"] + habla, 3), "ventana_s": round(ventana + MARGEN, 3),
            "aire_s": round(ventana + MARGEN - habla, 3), "palabras": palabras,
            "ppm_efectivas": round(palabras / habla * 60, 1), "rate_say": rate,
            "lufs": round(lufs(y), 2), "pico_dbfs": round(20 * np.log10(np.max(np.abs(y))), 2),
            "texto": b["texto"], "texto_tts": tts, "marcas_s": marcas,
        }
        info.append(d)
        aviso = "  <-- NO CABE" if habla > ventana + 0.05 else ""
        print(f"{b['id']} {b['seccion']:<11s} {b['inicio_s']:7.2f}s  habla {habla:5.2f}s / ventana "
              f"{ventana + MARGEN:5.2f}s  rate {rate}  {d['ppm_efectivas']} ppm{aviso}")
    pk = np.max(np.abs(stem))
    write_wav(os.path.join(vo_dir, "VO_completa_tts.wav"), np.stack([stem, stem], 1) * (0.99 / pk if pk > 0.99 else 1))
    json.dump({"voz": voz, "motor": "macOS say", "lufs_bloque": TARGET_LUFS, "bloques": info},
              open(os.path.join(vo_dir, "vo_bloques.json"), "w"), ensure_ascii=False, indent=1)
    with open(os.path.join(vo_dir, "GUION_GRABACION.txt"), "w", encoding="utf-8") as f:
        f.write("GUION DE GRABACIÓN · Amazona Verse · pitch\n")
        f.write("Graba cada bloque en un WAV (mono o estéreo, cualquier frecuencia) con el MISMO nombre\n")
        f.write(f"y ponlo en {os.path.join(OUT, 'vo_kelvin')}/ . Luego: bash tools/audio/generar_todo.sh --mezcla\n")
        f.write("Deja ~0,1 s de silencio antes de hablar; la mezcla alinea el inicio de la voz al tiempo indicado.\n\n")
        for d in info:
            f.write(f"{d['archivo']}\n  empieza {d['inicio_voz_s']:.1f} s · ventana {d['ventana_s']:.1f} s"
                    f" · TTS dura {d['fin_voz_s'] - d['inicio_voz_s']:.1f} s\n  {d['texto']}\n\n")
    total = sum(d["palabras"] for d in info)
    print(f"bloques: {len(info)} · palabras: {total} · voz: {voz}")


if __name__ == "__main__":
    main()
