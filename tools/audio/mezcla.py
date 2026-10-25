"""Mezcla final del pitch: voz + música (con ducking) + SFX -> pitch_mix.wav y stems.

- Voz: vo/VO_Bxx_*.wav (TTS). Si existe vo_kelvin/<mismo nombre>.wav, usa esa grabación:
  la remuestrea a 48 kHz, la pasa a mono, la nivela a -19 LUFS y alinea su primer sonido
  con el inicio del bloque (inicio_voz_s).
- Música: musica/musica.wav. Ducking por la voz: -9 dB de banda ancha y -4 dB extra en 600-4500 Hz
  (donde vive la inteligibilidad), ataque 80 ms, liberación 450 ms y retención de 250 ms.
- SFX: tiempos.json -> sfx (tiempo absoluto o ancla de palabra medida por voz.py). Bajan 3 dB bajo la voz.
- Master: -14 LUFS integrados y limitador true-peak a -1 dBTP.
- Escribe pitch_mix.wav, stems/{voz,musica,sfx}.wav (misma ganancia que la mezcla, antes del limitador),
  y tiempos.json resuelto (secciones, bloques de voz y SFX en segundos) para el editor.

Uso: python3.11 -I mezcla.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

from dsp import (OUT, SR, env_follow, eq, fft_apply, hp_mag, limiter, lufs, pan_gains,  # noqa: E402
                 read_wav, resample, smooth_ar, true_peak_db, undb, write_wav)

HERE = os.path.dirname(os.path.abspath(__file__))
OBJ_LUFS = -14.0
TECHO_DBTP = -1.0
VO_LUFS = -19.0
MUS_DB = 1.0         # nivel de la música respecto a su archivo (sube en los huecos de la voz)
SFX_DB = 0.0
DUCK_DB = -9.0
DUCK_MID_DB = -4.0
DUCK_SFX_DB = -3.0


def mono(x):
    return x.mean(axis=1) if x.ndim == 2 else x


def cargar_voz(bloques, n):
    vo = np.zeros(n)
    usados = []
    kdir = os.path.join(OUT, "vo_kelvin")
    for b in bloques:
        pk = os.path.join(kdir, b["archivo"])
        if os.path.exists(pk):
            x, sr = read_wav(pk)
            x = resample(mono(x), sr, SR)
            x = x - np.mean(x)
            x = fft_apply(x, lambda f: hp_mag(f, 70, 2))
            x *= undb(VO_LUFS - lufs(x))
            e = env_follow(x, 0.01)
            on = np.where(e > np.max(e) * undb(-40))[0]
            onset = on[0] / SR if on.size else 0.0
            t0 = b["inicio_voz_s"] - onset
            origen = "kelvin"
        else:
            x, _ = read_wav(os.path.join(OUT, "vo", b["archivo"]))
            x = mono(x)
            t0 = b["inicio_archivo_s"]
            origen = "tts"
        i0 = int(round(t0 * SR))
        L = max(0, min(len(x), n - i0))
        vo[i0:i0 + L] += x[:L]
        usados.append({"id": b["id"], "archivo": b["archivo"], "origen": origen, "inicio_voz_s": b["inicio_voz_s"],
                       "fin_voz_s": round(b["inicio_voz_s"] + (len(x) / SR - (b["inicio_voz_s"] - t0)), 3)
                       if origen == "kelvin" else b["fin_voz_s"]})
    return vo, usados


def aplicar_cue(c, x, marcas):
    if "t" in c:
        t = float(c["t"])
    else:
        t = marcas[c["ancla"]] + float(c.get("off", 0.0))
    x = x if x.ndim == 2 else np.stack([x, x], 1)
    x = x.copy()
    if "dur" in c:
        x = x[: int(c["dur"] * SR)]
    n = len(x)
    g = np.ones(n)
    if c.get("fade_in"):
        k = min(n, int(c["fade_in"] * SR))
        g[:k] *= np.linspace(0, 1, k) ** 2
    if c.get("fade_out"):
        k = min(n, int(c["fade_out"] * SR))
        g[-k:] *= np.linspace(1, 0, k) ** 2
    if c.get("env"):
        pts = np.array(c["env"], float)
        g *= undb(np.interp(np.arange(n) / SR, pts[:, 0], pts[:, 1]))
    x *= (g * undb(c.get("gain_db", 0.0)))[:, None]
    p = c.get("pan", 0.0)
    if p:
        gl, gr = pan_gains(p)
        x[:, 0] *= gl * np.sqrt(2)
        x[:, 1] *= gr * np.sqrt(2)
    return t, x


def main():
    T = json.load(open(os.path.join(HERE, "tiempos.json")))
    DUR = T["duracion_s"]
    n = int(round(DUR * SR))
    info_vo = json.load(open(os.path.join(OUT, "vo", "vo_bloques.json")))
    bloques = info_vo["bloques"]
    vo_m, vo_usados = cargar_voz(bloques, n)
    vo = np.stack([vo_m, vo_m], 1)

    marcas = {}
    for b in bloques:
        for w, t in b.get("marcas_s", {}).items():
            marcas[f"{b['id']}|{w}"] = t
    sfx = np.zeros((n, 2))
    duck_extra = np.zeros(n)
    resueltos = []
    cache = {}
    for c in T["sfx"]:
        if c["id"] not in cache:
            cache[c["id"]], _ = read_wav(os.path.join(OUT, "sfx", c["id"] + ".wav"))
        if "ancla" in c and c["ancla"] not in marcas:
            print(f"  aviso: ancla {c['ancla']} sin marca; se omite {c['id']}")
            continue
        t, x = aplicar_cue(c, cache[c["id"]], marcas)
        i0 = int(round(t * SR))
        L = max(0, min(len(x), n - i0))
        sfx[i0:i0 + L] += x[:L] * undb(SFX_DB)
        if c.get("duck"):
            duck_extra[i0:i0 + L] += mono(x[:L])
        resueltos.append({"id": c["id"], "t_s": round(t, 3), "dur_s": round(len(x) / SR, 3),
                          "gain_db": c.get("gain_db", 0.0), **({"ancla": c["ancla"]} if "ancla" in c else {})})

    mus, _ = read_wav(os.path.join(OUT, "musica", "musica.wav"))
    mus = mus[:n] * undb(MUS_DB)
    if len(mus) < n:
        mus = np.concatenate([mus, np.zeros((n - len(mus), 2))])
    # limpieza de extremos (filtros causales: sin pre-eco en los silencios)
    extremos = [("hp", 25, 0.707, 0), ("lp", 18000, 0.707, 0)]
    mus = eq(mus, extremos)
    sfx = eq(sfx, extremos)

    # Ducking ---------------------------------------------------------------
    key = env_follow(vo_m + duck_extra, 0.04)
    act = (key > undb(-45)).astype(float)
    hold = int(0.25 * SR)
    cs = np.concatenate([[0], np.cumsum(act)])
    idx = np.arange(n)
    act = ((cs[np.minimum(n, idx + 1)] - cs[np.maximum(0, idx - hold)]) > 0).astype(float)
    a = np.clip(smooth_ar(act, 0.08, 0.45), 0, 1)
    g_b = undb(DUCK_DB * a)
    g_m = undb(DUCK_MID_DB * a)
    mid = eq(mus, [("hp", 600, 0.707, 0), ("lp", 4500, 0.707, 0)])  # resto = mus - mid: suma exacta
    mus_d = ((mus - mid) + mid * g_m[:, None]) * g_b[:, None]
    # silencio digital garantizado en los huecos pactados de la música
    ev = T["eventos"]
    mus_d[: int(ev["musica_entra_s"] * SR)] = 0
    mus_d[int((ev["silencio_musica"][0] + 0.25) * SR):int(ev["silencio_musica"][1] * SR)] = 0
    sfx_d = sfx * undb(DUCK_SFX_DB * a)[:, None]

    mezcla = vo + mus_d + sfx_d
    # Master: loudness y limitador (iterativo) ------------------------------
    g = undb(OBJ_LUFS - lufs(mezcla))
    for _ in range(5):
        y, gr = limiter(mezcla * g, TECHO_DBTP + -0.2)
        L = lufs(y)
        if abs(L - OBJ_LUFS) < 0.05:
            break
        g *= undb(OBJ_LUFS - L)
    tp = true_peak_db(y)
    if tp > TECHO_DBTP:
        y *= undb(TECHO_DBTP - tp - 0.05)
    # cola y cabeza limpias
    y[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))[:, None] ** 2
    write_wav(os.path.join(OUT, "pitch_mix.wav"), y)
    stems = {"voz": vo * g, "musica": mus_d * g, "sfx": sfx_d * g}
    notas_stems = {}
    for k, s in stems.items():
        pk = np.max(np.abs(s))
        if pk > undb(-0.3):
            notas_stems[k] = f"reducido {20 * np.log10(pk) + 0.3:.2f} dB para no recortar"
            s = s * undb(-0.3) / pk
        write_wav(os.path.join(OUT, "stems", f"{k}.wav"), s)

    # relación voz/música donde habla la voz
    m = a > 0.9
    def lvl(x):
        return 10 * np.log10(np.mean(np.sum(x[m] ** 2, axis=1)) + 1e-20)
    rel_vm = lvl(vo * g) - lvl(mus_d * g)
    rel_vs = lvl(vo * g) - lvl(sfx_d * g)
    reduccion_max = float(-20 * np.log10(np.min(gr)))
    from dsp import kweight
    yv, ym = kweight(vo * g), kweight(mus_d * g)
    por_bloque = {}
    for b in vo_usados:
        i0, i1 = int(b["inicio_voz_s"] * SR), int(b["fin_voz_s"] * SR)
        pv = np.mean(np.sum(yv[i0:i1] ** 2, 1))
        pm = np.mean(np.sum(ym[i0:i1] ** 2, 1)) + 1e-20
        por_bloque[b["id"]] = round(float(10 * np.log10(pv / pm)), 1)
    res = {
        "pitch_mix": {"lufs_i": round(lufs(y), 2), "true_peak_dbtp": round(true_peak_db(y), 2),
                      "limitador_max_db": round(reduccion_max, 2),
                      "limitador_activo_pct": round(100 * float(np.mean(gr < 0.999)), 2),
                      "voz_sobre_musica_db": round(rel_vm, 1), "voz_sobre_sfx_db": round(rel_vs, 1),
                      "ganancia_master_db": round(float(20 * np.log10(g)), 2),
                      "voz_sobre_musica_por_bloque_db": por_bloque},
        "stems": notas_stems,
    }
    print("  pitch_mix.wav:", res["pitch_mix"])
    sec = []
    bar = 60 / T["bpm"] * T["tiempos_por_compas"]
    for s in T["secciones"]:
        sec.append({"id": s["id"], "inicio_s": round(s["inicio_c"] * bar, 3), "fin_s": round(s["fin_c"] * bar, 3),
                    "inicio_c": s["inicio_c"], "fin_c": s["fin_c"]})
    tts = [b["id"] for b in vo_usados if b["origen"] != "kelvin"]
    if not tts:
        estado = "FINAL: voz de reemplazo (vo_kelvin/) en todos los bloques"
    elif T.get("voz_tts_definitiva"):
        estado = ("FINAL v1: voz TTS es_MX (" + str(info_vo.get("voz")) + ") aprobada por Kelvin como definitiva. "
                  "Para cambiarla: WAV en vo_kelvin/ (grabación o voz neural es-PR) y generar_todo.sh --mezcla.")
    else:
        estado = ("GUIA - NO PUBLICAR: voz TTS en " + ", ".join(tts) +
                  ". La final sale con voz real en vo_kelvin/ (generar_todo.sh --mezcla).")
    print("  estado:", estado)
    pub = {
        "estado": estado,
        "_nota": "Tiempos reales de pitch_mix.wav (generado por tools/audio/mezcla.py). Segundos desde 0.",
        "duracion_s": DUR, "bpm": T["bpm"], "compas_s": bar, "eventos": T["eventos"], "secciones": sec,
        "voz": {"motor": info_vo.get("voz"), "bloques": vo_usados},
        "sfx": sorted(resueltos, key=lambda r: r["t_s"]),
        "master": res,
    }
    json.dump(pub, open(os.path.join(OUT, "tiempos.json"), "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
