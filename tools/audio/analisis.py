"""Validación objetiva del audio (no se puede escuchar: se mide).

Para cada WAV: duración, formato, pico de muestra, true peak (4x), RMS, LUFS integrada,
LUFS corto máximo, LRA, DC, muestras recortadas, clics (picos aislados de la 2ª derivada),
bordes del archivo, bandas de octava, centroide espectral y energía fuera de banda.
Con --secciones mide también el loudness de cada sección de tiempos.json y el silencio de los huecos.

Uso: python3.11 -I analisis.py archivo.wav [más.wav ...] [--secciones] [--json salida.json]
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

from dsp import SR, db, lra, lufs, lufs_max, oversample_abs, read_wav  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OCTAVAS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]


def clics(x, ratio=12.0, floor_db=-50.0):
    m = x.mean(axis=1) if x.ndim == 2 else x
    if len(m) < 2000:
        return []
    d = np.zeros_like(m)
    d[2:] = m[2:] - 2 * m[1:-1] + m[:-2]
    a = d ** 2
    w = int(0.02 * SR)
    cs = np.concatenate([[0], np.cumsum(a)])
    i = np.arange(len(m))
    lo = np.clip(i - w // 2, 0, len(m))
    hi = np.clip(i + w // 2, 0, len(m))
    e = np.sqrt((cs[hi] - cs[lo]) / np.maximum(hi - lo, 1))
    r = np.abs(d) / np.maximum(e, 1e-12)
    cand = np.where((r > ratio) & (np.abs(d) > 10 ** (floor_db / 20)))[0]
    # agrupa candidatos cercanos
    out = []
    last = -10 ** 9
    for c in cand:
        if c - last > int(0.005 * SR):
            out.append(round(c / SR, 4))
        last = c
    return out


def bandas(x):
    m = x.mean(axis=1) if x.ndim == 2 else x
    n = min(len(m), 1 << 22)
    seg = m[:n]
    # Welch simple
    w = 8192
    if len(seg) < w:
        seg = np.pad(seg, (0, w - len(seg)))
    fr = np.lib.stride_tricks.sliding_window_view(seg, w)[:: w // 2] * np.hanning(w)
    P = np.mean(np.abs(np.fft.rfft(fr, axis=1)) ** 2, axis=0)
    f = np.fft.rfftfreq(w, 1 / SR)
    tot = P.sum() + 1e-30
    res = {}
    for fc in OCTAVAS:
        lo, hi = fc / np.sqrt(2), fc * np.sqrt(2)
        res[f"{fc:g}"] = round(float(10 * np.log10(P[(f >= lo) & (f < hi)].sum() / tot + 1e-15)), 1)
    cent = float((P * f).sum() / tot)
    sub20 = float(10 * np.log10(P[f < 22].sum() / tot + 1e-15))
    above19k = float(10 * np.log10(P[f > 19000].sum() / tot + 1e-15))
    return res, round(cent, 0), round(sub20, 1), round(above19k, 1)


def analizar(path, secciones=False):
    x, sr = read_wav(path)
    pk = float(np.max(np.abs(x)))
    tp = float(db(np.max(oversample_abs(x)))) if len(x) > 64 else float(db(pk))
    rms = float(db(np.sqrt(np.mean(x ** 2))))
    dc = float(np.max(np.abs(x.mean(axis=0))))
    clip = int(np.sum(np.abs(x) >= 0.9999))
    b, cent, sub20, hi19 = bandas(x)
    c = clics(x)
    r = {
        "archivo": os.path.basename(path), "duracion_s": round(len(x) / sr, 3), "sr": sr, "canales": x.shape[1],
        "pico_dbfs": round(float(db(pk)), 2), "true_peak_dbtp": round(tp, 2), "rms_dbfs": round(rms, 2),
        "lufs_i": round(lufs(x), 2) if len(x) > 0.4 * SR else None,
        "lufs_corto_max": round(lufs_max(x, 3.0), 2) if len(x) > 3 * SR else None,
        "lra_lu": round(lra(x), 1) if len(x) > 6 * SR else None,
        "dc": round(dc, 6), "muestras_recortadas": clip, "clics": c[:20], "n_clics": len(c),
        "borde_inicio": round(float(np.max(np.abs(x[0]))), 5), "borde_fin": round(float(np.max(np.abs(x[-1]))), 5),
        "bandas_octava_db": b, "centroide_hz": cent, "energia_sub20_db": sub20, "energia_sobre19k_db": hi19,
    }
    if secciones:
        T = json.load(open(os.path.join(HERE, "tiempos.json")))
        bar = 60 / T["bpm"] * T["tiempos_por_compas"]
        sec = {}
        for s in T["secciones"]:
            a, bb = int(s["inicio_c"] * bar * sr), int(s["fin_c"] * bar * sr)
            seg = x[a:bb]
            sec[s["id"]] = {"lufs": round(lufs(seg), 1), "pico_dbfs": round(float(db(np.max(np.abs(seg)))), 1)}
        r["secciones"] = sec
        huecos = {}
        e = T["eventos"]
        for nombre, (a, bb) in {"antes_musica": (0.0, e["musica_entra_s"] - 0.01),
                                "corte_cierre": (e["silencio_musica"][0] + 0.3, e["silencio_musica"][1] - 0.005),
                                "final": (T["duracion_s"] - 0.1, T["duracion_s"])}.items():
            seg = x[int(a * sr):int(bb * sr)]
            huecos[nombre] = round(float(db(np.sqrt(np.mean(seg ** 2)) if seg.size else 0)), 1)
        r["rms_huecos_dbfs"] = huecos
    return r


def resumen(r):
    s = (f"{r['archivo']:<26s} {r['duracion_s']:7.2f}s  pico {r['pico_dbfs']:6.2f}  TP {r['true_peak_dbtp']:6.2f}"
         f"  RMS {r['rms_dbfs']:6.1f}  LUFS {r['lufs_i'] if r['lufs_i'] is not None else '-':>6}"
         f"  DC {r['dc']:.4f}  clip {r['muestras_recortadas']}  clics {r['n_clics']}"
         f"  bordes {r['borde_inicio']:.4f}/{r['borde_fin']:.4f}  cent {r['centroide_hz']:.0f} Hz")
    return s


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    secc = "--secciones" in sys.argv
    out_json = None
    if "--json" in sys.argv:
        out_json = sys.argv[sys.argv.index("--json") + 1]
        args = [a for a in args if a != out_json]
    res = []
    for p in args:
        r = analizar(p, secc)
        res.append(r)
        print(resumen(r))
        if secc:
            print("   secciones:", r["secciones"])
            print("   huecos (RMS dBFS):", r["rms_huecos_dbfs"])
        if r["n_clics"]:
            print("   clics en:", r["clics"])
    if out_json:
        json.dump(res, open(out_json, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
