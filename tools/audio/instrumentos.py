"""Instrumentos sintetizados (numpy) para la música del pitch de Amazona Verse.

Cuatro puertorriqueño (Karplus-Strong con órdenes dobles y cuerpo), güiro, panderos de plena
(seguidor, punteador, requinto), maracas, bajo, pads de tabla de ondas, marimba, celesta,
pluck moderno, flauta, batería moderna y elementos de tráiler (riser, impacto, platillo).
Cada función devuelve un array mono (o estéreo) a 48 kHz, con caché cuando conviene.
"""
import functools

import numpy as np

from dsp import (SR, adsr, bandpass, eq, fft_apply, highpass, hp_mag, lowpass, lp_mag, n2m,
                 mtof, noise_colored, rng, stft_filter)


# ---------------------------------------------------------------------------
# Karplus-Strong vectorizado por bloques
# ---------------------------------------------------------------------------
def ks_string(freq, dur, decay=2.0, smooth=0.08, bright=0.7, pick=0.17, seed=0, release=0.04):
    """Cuerda pulsada. smooth en [0, 0.25] (filtro de lazo), bright en [0, 1] (excitación)."""
    n = int(dur * SR)
    P = SR / freq
    N = int(np.floor(P - 1))
    d = P - 1 - N
    taps = np.convolve([1 - d, d], [smooth, 1 - 2 * smooth, smooth])
    g = 10 ** (-3 / (decay * freq))
    c = g * taps
    r = rng(seed)
    L0 = max(4, int(round(P)))
    exc = r.uniform(-1, 1, L0)
    # excitación más oscura con menos brillo (media móvil)
    k = int(1 + (1 - bright) * 6)
    if k > 1:
        exc = np.convolve(exc, np.ones(k) / k, mode="same")
    # posición de púa: filtro peine
    pd = max(1, int(pick * P))
    exc = exc - np.concatenate([np.zeros(pd), exc[:-pd]]) * 0.9
    exc -= exc.mean()
    M = N + 3
    Y = np.zeros(M + n)
    X = np.zeros(n)
    X[: min(n, L0)] = exc[: min(n, L0)]
    pos = 0
    while pos < n:
        L = min(N, n - pos)
        i = M + pos
        acc = X[pos:pos + L].copy()
        acc += c[0] * Y[i - N:i - N + L]
        acc += c[1] * Y[i - N - 1:i - N - 1 + L]
        acc += c[2] * Y[i - N - 2:i - N - 2 + L]
        acc += c[3] * Y[i - N - 3:i - N - 3 + L]
        Y[i:i + L] = acc
        pos += L
    y = Y[M:]
    y -= np.mean(y[: min(n, 2000)]) * 0  # sin DC apreciable por el peine
    nr = min(n, int(release * SR))
    y[-nr:] *= np.linspace(1, 0, nr) ** 2
    y[: 24] *= np.linspace(0, 1, 24)  # micro-fade anti-clic
    pk = np.max(np.abs(y)) + 1e-12
    return y / pk


@functools.lru_cache(maxsize=4096)
def _ks_cached(midi, dur_q, decay_q, smooth_q, bright_q, seed):
    return ks_string(float(mtof(midi)), dur_q / 100, decay_q / 100, smooth_q / 1000,
                     bright_q / 100, seed=seed)


def ks_note(midi, dur, decay=2.0, smooth=0.08, bright=0.7, seed=0, cents=0.0):
    """Versión cacheada (cuantiza parámetros). cents desafina por remuestreo lineal."""
    y = _ks_cached(int(midi), int(round(dur * 100)), int(round(decay * 100)),
                   int(round(smooth * 1000)), int(round(bright * 100)), int(seed) % 6)
    if cents:
        ratio = 2 ** (cents / 1200)
        idx = np.arange(0, len(y) - 1, ratio)
        y = np.interp(idx, np.arange(len(y)), y)
    return y


# ---------------------------------------------------------------------------
# Cuatro puertorriqueño
# ---------------------------------------------------------------------------
# Órdenes (de grave a agudo): 5ª B2/B3, 4ª E3/E4, 3ª A3/A3, 2ª D4/D4, 1ª G4/G4
CUATRO_ORDENES = [(47, 59), (52, 64), (57, 57), (62, 62), (67, 67)]

CHORD_Q = {
    "": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 7, 10], "maj7": [0, 4, 7, 11], "m7": [0, 3, 7, 10],
    "sus4": [0, 5, 7], "sus2": [0, 2, 7], "add9": [0, 4, 7, 2], "madd9": [0, 3, 7, 2], "6": [0, 4, 7, 9],
}
PC = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
      "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def parse_chord(name):
    """'F#m7/C#' -> (raíz_pc, [pcs], bajo_pc)"""
    bass = None
    if "/" in name:
        name, b = name.split("/")
        bass = PC[b]
    root = name[:2] if len(name) > 1 and name[1] in "#b" else name[:1]
    q = name[len(root):]
    rp = PC[root]
    pcs = [(rp + i) % 12 for i in CHORD_Q[q]]
    return rp, pcs, (rp if bass is None else bass)


def cuatro_voicing(chord, max_fret=7):
    """Para cada orden, el traste más bajo que da una nota del acorde (posición abierta)."""
    _, pcs, _ = parse_chord(chord)
    v = []
    for lo, hi in CUATRO_ORDENES:
        for f in range(0, max_fret + 1):
            if (lo + f) % 12 in pcs:
                v.append((lo + f, hi + f))
                break
        else:
            v.append(None)
    return v


def cuatro_pluck(midi_pair, dur, vel=0.8, seed=0, bright=0.8, decay=2.2, muted=False):
    """Un orden doble: dos cuerdas (unísono ligeramente desafinado u octava)."""
    lo, hi = midi_pair
    if muted:
        decay, dur, smooth = 0.12, min(dur, 0.18), 0.16
    else:
        smooth = 0.05 + (1 - bright) * 0.08
    a = ks_note(lo, dur, decay=decay, smooth=smooth, bright=bright, seed=seed)
    b = ks_note(hi, dur, decay=decay * 0.9, smooth=smooth, bright=bright, seed=seed + 3,
                cents=3.5 if hi == lo else 1.5)
    m = min(len(a), len(b))
    off = int(0.0012 * SR)  # la púa no toca las dos cuerdas a la vez
    out = np.zeros(m + off)
    out[:m] += a[:m]
    out[off:off + m] += b[:m] * (0.8 if hi != lo else 0.9)
    return out * vel


def cuatro_strum(chord, dur, vel=0.7, direction="down", seed=0, muted=False, spread=0.009, courses=None):
    """Rasgueo: las órdenes suenan escalonadas (abajo = grave→agudo)."""
    v = cuatro_voicing(chord)
    idx = list(range(5)) if direction == "down" else list(range(4, -1, -1))
    if courses is not None:
        idx = [i for i in idx if i in courses]
    r = rng(seed)
    n = int((dur + spread * 6 + 0.01) * SR)
    out = np.zeros(n)
    for j, i in enumerate(idx):
        if v[i] is None:
            continue
        t = j * spread * (1 + 0.25 * r.standard_normal())
        t = max(0.0, t)
        g = vel * (0.85 + 0.3 * r.random()) * (0.8 if direction == "up" else 1.0)
        s = cuatro_pluck(v[i], dur, g, seed=seed + i, bright=0.85 if direction == "down" else 0.9,
                         muted=muted)
        k = int(t * SR)
        L = min(len(s), n - k)
        out[k:k + L] += s[:L]
    return out * 0.45


def cuatro_body(x):
    """Resonancias de caja (cuerpo pequeño de madera) por convolución con modos amortiguados."""
    modos = [(205, 0.030, 1.0), (290, 0.028, 0.7), (470, 0.020, 0.6), (620, 0.018, 0.35),
             (980, 0.012, 0.3), (1450, 0.010, 0.22), (2300, 0.006, 0.16), (3400, 0.004, 0.1)]
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    ir = np.zeros(n)
    ir[0] = 1.0
    r = rng(11)
    for f, tau, a in modos:
        ir += a * 0.012 * np.sin(2 * np.pi * f * t + r.random() * 6.28) * np.exp(-t / tau) * (2 * np.pi * f / 1000)
    from dsp import fftconv
    y = fftconv(x, ir)[: len(x)]
    return eq(y, [("hp", 95, 0.7, 0), ("peak", 3200, 1.0, 2.0), ("highshelf", 9000, 0.7, -2.0)])


# ---------------------------------------------------------------------------
# Percusión puertorriqueña
# ---------------------------------------------------------------------------
MEMBRANA = [1.0, 1.59, 2.14, 2.30, 2.65, 2.92, 3.16, 3.50]

PANDEROS = {"seguidor": 108.0, "punteador": 168.0, "requinto": 255.0}


@functools.lru_cache(maxsize=256)
def pandero(kind="seguidor", hit="abierto", var=0):
    """Pandero de plena (cuero de chivo, sin sonajas). hit: abierto | slap | apagado."""
    f0 = PANDEROS[kind] * (1 + 0.012 * (var - 1.5))
    r = rng(100 + var + 7 * len(kind) + 13 * len(hit))
    dur = {"abierto": 0.55, "slap": 0.22, "apagado": 0.12}[hit]
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    tau1 = {"abierto": 0.16, "slap": 0.05, "apagado": 0.03}[hit] * (108 / PANDEROS[kind]) ** 0.4
    amps = {"abierto": [1, .55, .35, .3, .2, .14, .1, .07],
            "slap": [.5, .5, .55, .5, .45, .4, .35, .3],
            "apagado": [1, .3, .12, .08, .04, .02, .01, .01]}[hit]
    for k, (ratio, a) in enumerate(zip(MEMBRANA, amps)):
        glide = 1 + 0.05 * np.exp(-t / 0.025)
        ph = 2 * np.pi * np.cumsum(f0 * ratio * glide) / SR + r.random() * 6.28
        y += a * np.sin(ph) * np.exp(-t / (tau1 / (1 + 0.5 * k)))
    # contacto de la mano / cuero
    nz = r.standard_normal(n)
    if hit == "slap":
        nz = bandpass(nz, 900, 6000, 2) * np.exp(-t / 0.018) * 1.6
    elif hit == "abierto":
        nz = bandpass(nz, 300, 3500, 2) * np.exp(-t / 0.008) * 0.6
    else:
        nz = bandpass(nz, 150, 1500, 2) * np.exp(-t / 0.012) * 0.8
    y = y / (np.max(np.abs(y)) + 1e-9) + nz
    y[:48] *= np.linspace(0, 1, 48)
    y[-200:] *= np.linspace(1, 0, 200)
    return y / (np.max(np.abs(y)) + 1e-9)


@functools.lru_cache(maxsize=64)
def guiro(kind="corto", var=0):
    """Güiro: impactos sobre las estrías (tren de impulsos con jitter) + resonancia de la higuera."""
    r = rng(300 + var * 17 + (5 if kind == "largo" else 0))
    dur = {"largo": 0.24, "corto": 0.075, "muy_corto": 0.045}[kind]
    rate = {"largo": 110.0, "corto": 125.0, "muy_corto": 140.0}[kind] * (1 + 0.06 * r.standard_normal())
    n = int((dur + 0.05) * SR)
    imp = np.zeros(n)
    t = 0.0
    while t < dur:
        k = int(t * SR)
        x = t / dur
        env = np.sin(np.pi * min(1, x * 1.05)) ** 0.6 if kind == "largo" else np.sin(np.pi * x) ** 0.4
        imp[k] += env * (0.7 + 0.6 * r.random())
        t += (1 / rate) * (1 + 0.12 * r.standard_normal())
    # cada impacto: ráfaga de ruido muy corta
    m = int(0.003 * SR)
    k = np.arange(m)
    # roce de la varilla: ráfaga con subida de ~0,15 ms (no un impulso de una muestra)
    burst = r.standard_normal(m) * np.exp(-k / (0.0014 * SR)) * (1 - np.exp(-k / (0.0003 * SR)))
    y = np.convolve(imp, burst)[:n]
    # cuerpo de higuera: resonancias más estrechas -> "rrrac" de madera, no clics
    y = eq(bandpass(y, 1200, 6500, 2), [("peak", 2400, 5.0, 8.0), ("peak", 4300, 4.0, 6.0),
                                         ("peak", 1600, 3.0, 3.0)])
    y[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return y / (np.max(np.abs(y)) + 1e-9)


@functools.lru_cache(maxsize=64)
def maraca(var=0, length=0.07):
    """Maraca granular: cientos de choques de semillas dentro de una envolvente."""
    r = rng(500 + var)
    n = int((length + 0.06) * SR)
    t = np.arange(n) / SR
    env = np.where(t < 0.006, t / 0.006, np.exp(-(t - 0.006) / (length * 0.45)))
    dens = 9000 * env / env.sum() * len(env) / SR * length
    grains = np.zeros(n)
    probs = np.clip(dens / SR * 60, 0, 1)
    hits = r.random(n) < probs
    grains[hits] = r.uniform(0.3, 1.0, hits.sum()) * env[hits]
    m = int(0.002 * SR)
    kk = np.arange(m)
    g = r.standard_normal(m) * np.exp(-kk / (0.0005 * SR)) * (1 - np.exp(-kk / (0.0001 * SR)))
    y = np.convolve(grains, g)[:n]
    y = bandpass(y, 3500, 12000, 2)
    y[-200:] *= np.linspace(1, 0, 200)
    return y / (np.max(np.abs(y)) + 1e-9)


@functools.lru_cache(maxsize=32)
def cua(var=0):
    """Cuá (palitos de bomba sobre madera): modal corto y seco."""
    r = rng(700 + var)
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    f0 = 1250 * (1 + 0.01 * var)
    y = sum(a * np.sin(2 * np.pi * f0 * k * t + r.random()) * np.exp(-t / tau)
            for k, a, tau in [(1, 1, 0.025), (2.37, 0.5, 0.012), (4.1, 0.25, 0.006)])
    y += bandpass(r.standard_normal(n), 2000, 9000, 2) * np.exp(-t / 0.002) * 0.4
    y[:24] *= np.linspace(0, 1, 24)
    return y / (np.max(np.abs(y)) + 1e-9)


# ---------------------------------------------------------------------------
# Batería moderna
# ---------------------------------------------------------------------------
@functools.lru_cache(maxsize=8)
def kick(kind="tropical"):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.028) if kind == "tropical" else 52 + 70 * np.exp(-t / 0.02)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / (0.22 if kind == "tropical" else 0.12))
    y = np.tanh(y * 1.6) / np.tanh(1.6)
    clk = highpass(rng(41).standard_normal(n), 2500, 2) * np.exp(-t / 0.0025) * 0.25
    y = y + clk
    y[:24] *= np.linspace(0, 1, 24)
    y[-400:] *= np.linspace(1, 0, 400)
    return y / np.max(np.abs(y))


@functools.lru_cache(maxsize=8)
def clap(var=0):
    r = rng(800 + var)
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    env = np.zeros(n)
    for k, dt in enumerate([0.0, 0.009, 0.019, 0.027]):
        i = int(dt * SR)
        env[i:] += np.exp(-(t[: n - i]) / (0.006 if k < 3 else 0.09)) * (0.8 if k < 3 else 1.0)
    y = bandpass(r.standard_normal(n), 800, 5500, 2) * env
    y = eq(y, [("peak", 1300, 1.2, 4)])
    y[-300:] *= np.linspace(1, 0, 300)
    return y / np.max(np.abs(y))


@functools.lru_cache(maxsize=16)
def hat(open_=False, var=0):
    r = rng(900 + var + (50 if open_ else 0))
    n = int((0.32 if open_ else 0.07) * SR)
    t = np.arange(n) / SR
    metal = sum(np.sign(np.sin(2 * np.pi * f * t + r.random() * 6)) for f in [317, 421, 553, 709, 891, 1173])
    y = highpass(metal * 0.3 + r.standard_normal(n), 7000, 3)
    y *= np.exp(-t / (0.09 if open_ else 0.014))
    y[:12] *= np.linspace(0, 1, 12)
    y[-200:] *= np.linspace(1, 0, 200)
    return y / np.max(np.abs(y))


# ---------------------------------------------------------------------------
# Melódicos y armónicos
# ---------------------------------------------------------------------------
@functools.lru_cache(maxsize=512)
def _saw_table(midi, fc, L=4096, square=False):
    f = float(mtof(midi))
    K = int(min(L // 2 - 1, 19000 / f))
    k = np.arange(1, K + 1)
    a = 1.0 / k
    if square:
        a = np.where(k % 2 == 1, a, a * 0.15)
    a *= lp_mag(k * f, fc, 2)
    spec = np.zeros(L // 2 + 1, complex)
    spec[1:K + 1] = a * np.exp(1j * (-np.pi / 2))
    tab = np.fft.irfft(spec, L)
    return tab / (np.max(np.abs(tab)) + 1e-12)


def wt_osc(table, freq, n, phase0=0.0):
    L = len(table)
    if np.isscalar(freq):
        ph = (phase0 + np.arange(n) * (freq / SR)) % 1.0
    else:
        ph = (phase0 + np.cumsum(freq) / SR) % 1.0
    x = ph * L
    i0 = x.astype(np.int64)
    fr = x - i0
    return table[i0 % L] * (1 - fr) + table[(i0 + 1) % L] * fr


def pad_note(midi, dur, attack=0.8, release=1.2, fc=1800.0, voices=3, detune=9.0, seed=0, vib=0.0):
    """Nota de pad estéreo: varias sierras limitadas en banda, desafinadas y abiertas en estéreo."""
    n = int((dur + release) * SR)
    r = rng(seed + midi)
    out = np.zeros((n, 2))
    f = float(mtof(midi))
    tab = _saw_table(int(midi), float(fc))
    t = np.arange(n) / SR
    for v in range(voices):
        c = (v - (voices - 1) / 2) * detune / max(1, (voices - 1) / 2)
        fr = f * 2 ** (c / 1200)
        if vib:
            fr = fr * (1 + vib * np.sin(2 * np.pi * (4.6 + 0.4 * v) * t + r.random() * 6))
        y = wt_osc(tab, fr, n, r.random())
        p = (v / max(1, voices - 1)) * 2 - 1 if voices > 1 else 0
        out[:, 0] += y * np.cos((p * 0.8 + 1) * np.pi / 4)
        out[:, 1] += y * np.sin((p * 0.8 + 1) * np.pi / 4)
    # ataque (nunca más largo que la nota), sustain y release desde el valor alcanzado
    na = int(dur * SR)
    e = np.ones(n)
    a_n = max(1, min(int(attack * SR), int(0.85 * na)))
    e[:a_n] = np.linspace(0, 1, a_n) ** 1.6
    if n > na:
        e[na:] = e[na - 1] * np.linspace(1, 0, n - na) ** 2
    return out * e[:, None] / voices


@functools.lru_cache(maxsize=256)
def marimba(midi, vel_q=8):
    f = float(mtof(midi))
    dur = 1.6
    n = int(dur * SR)
    t = np.arange(n) / SR
    r = rng(midi)
    base = 1.1 * (220 / f) ** 0.5
    y = (np.sin(2 * np.pi * f * t) * np.exp(-t / base)
         + 0.32 * np.sin(2 * np.pi * f * 3.99 * t + r.random()) * np.exp(-t / (base * 0.22))
         + 0.10 * np.sin(2 * np.pi * f * 9.9 * t + r.random()) * np.exp(-t / (base * 0.07)))
    mallet = lowpass(r.standard_normal(n), 2500 + 300 * vel_q, 2) * np.exp(-t / 0.002) * 0.25
    y = y + mallet
    att = int(0.0015 * SR)
    y[:att] *= np.linspace(0, 1, att)
    y[-600:] *= np.linspace(1, 0, 600)
    return y / np.max(np.abs(y))


@functools.lru_cache(maxsize=256)
def celesta(midi):
    f = float(mtof(midi))
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    r = rng(1000 + midi)
    parts = [(1.0, 1.0, 1.9), (2.0, 0.22, 0.7), (2.76, 0.12, 0.35), (5.4, 0.06, 0.12), (8.93, 0.03, 0.05)]
    y = sum(a * np.sin(2 * np.pi * f * k * t + r.random() * 6) * np.exp(-t / tau) for k, a, tau in parts)
    y += highpass(r.standard_normal(n), 4000, 2) * np.exp(-t / 0.0015) * 0.08
    att = int(0.001 * SR)
    y[:att] *= np.linspace(0, 1, att)
    y[-600:] *= np.linspace(1, 0, 600)
    return y / np.max(np.abs(y))


@functools.lru_cache(maxsize=256)
def pluck_synth(midi, dur_q=40):
    """Pluck moderno: sierra aditiva cuyos armónicos altos caen antes (barrido de filtro natural)."""
    f = float(mtof(midi))
    dur = dur_q / 100
    n = int(dur * SR)
    t = np.arange(n) / SR
    K = int(min(36, 9000 / f))
    y = np.zeros((n, 2))
    for side, cents in ((0, -7), (1, 7)):
        fr = f * 2 ** (cents / 1200)
        acc = np.zeros(n)
        for k in range(1, K + 1):
            roll = 1 / np.sqrt(1 + (k * f / 5000) ** 4)  # sin bordes de sierra afilados
            acc += (roll / k) * np.sin(2 * np.pi * fr * k * t + 1.7 * k) * np.exp(-t * (7 + 3.2 * k))
        y[:, side] = acc
    y *= (np.minimum(1, t / 0.004) ** 2)[:, None]
    y[-400:] *= np.linspace(1, 0, 400)[:, None]
    return y / np.max(np.abs(y))


def flauta(midi, dur, vel=0.7, seed=0):
    """Flauta suave: casi senoidal, vibrato tardío y soplo filtrado."""
    f = float(mtof(midi))
    n = int((dur + 0.25) * SR)
    t = np.arange(n) / SR
    r = rng(seed + midi)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t + r.random()) * np.clip((t - 0.25) / 0.4, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    y = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
    breath = bandpass(r.standard_normal(n), f * 1.5, min(12000, f * 6), 2) * 0.05
    y = y + breath
    e = np.ones(n)
    a = int(0.07 * SR)
    e[:a] = np.linspace(0, 1, a) ** 1.5
    na = int(dur * SR)
    e[na:] = np.linspace(1, 0, n - na) ** 2
    return y * e * vel / 1.2


def bajo(midi, dur, vel=0.8, kind="redondo", seed=0):
    """Bajo: fundamental + armónicos con un poco de pulso KS para el ataque."""
    f = float(mtof(midi))
    rel = 0.06
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * f * t
    if kind == "sub":
        y = np.sin(ph) + 0.08 * np.sin(2 * ph)
        y = np.tanh(1.4 * y) / np.tanh(1.4)
    else:
        y = np.sin(ph) + 0.35 * np.sin(2 * ph + 0.2) + 0.12 * np.sin(3 * ph + 0.4) + 0.05 * np.sin(4 * ph)
        y = y * (0.75 + 0.25 * np.exp(-t / 0.25))
        pl = ks_note(int(midi), dur + rel, decay=1.2, smooth=0.2, bright=0.4, seed=seed)
        m = min(len(pl), n)
        y[:m] += 0.5 * pl[:m] * np.exp(-t[:m] / 0.12)
    e = np.ones(n)
    a = int(0.004 * SR)
    e[:a] = np.linspace(0, 1, a)
    na = int(dur * SR)
    e[na:] = np.linspace(1, 0, n - na) ** 2
    if kind != "sub":
        e[:na] *= 0.82 + 0.18 * np.exp(-t[:na] / 0.3)
    return y * e * vel / 1.4


# ---------------------------------------------------------------------------
# Tráiler: riser, impacto, platillo, swell
# ---------------------------------------------------------------------------
def riser(dur, seed=0, f_lo=300.0, f_hi=7000.0):
    """Ruido con banda que sube + tono que sube; termina en el golpe (crescendo exponencial)."""
    n = int(dur * SR)
    nz = noise_colored(n, -1.5, seed)

    def mask(t, f):
        x = np.clip(t / dur, 0, 1)[:, None]
        fc = f_lo * (f_hi / f_lo) ** x
        bw = 0.8
        return np.exp(-0.5 * (np.log2(np.maximum(f[None, :], 1) / fc) / bw) ** 2)

    y = stft_filter(nz, mask, 2048, 512)
    t = np.arange(n) / SR
    fr = 110 * 2 ** (3.0 * t / dur)
    tone = np.sin(2 * np.pi * np.cumsum(fr) / SR) * 0.15
    env = (t / dur) ** 2.2
    y = (y / (np.std(y) + 1e-9) * 0.25 + tone) * env
    y[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
    return y / (np.max(np.abs(y)) + 1e-9)


def impacto(seed=0, size=1.0):
    """Golpe grave de tráiler (boom con caída de tono + cuerpo de ruido)."""
    n = int(3.0 * SR)
    t = np.arange(n) / SR
    f = 38 + 40 * np.exp(-t / 0.08)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.9 * size))
    nz = lowpass(rng(seed).standard_normal(n), 400, 2) * np.exp(-t / 0.15) * 0.5
    snap = bandpass(rng(seed + 1).standard_normal(n), 800, 6000, 2) * np.exp(-t / 0.01) * 0.3
    y = np.tanh(1.3 * (y + nz + snap))
    y[:24] *= np.linspace(0, 1, 24)
    y[-2000:] *= np.linspace(1, 0, 2000)
    return y / np.max(np.abs(y))


def platillo(dur=3.0, seed=0, reverse=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    r = rng(seed)
    metal = sum(np.sin(2 * np.pi * f * t + r.random() * 6) for f in r.uniform(3000, 11000, 40))
    y = highpass(r.standard_normal(n) + metal * 0.08, 3500, 2)
    y = lowpass(y, 14000, 2)
    env = np.exp(-t / (dur * 0.35))
    y *= env
    y[:24] *= np.linspace(0, 1, 24)
    y[-1000:] *= np.linspace(1, 0, 1000)
    y /= np.max(np.abs(y))
    return y[::-1].copy() if reverse else y


def latido(seed=0):
    """Latido suave (dos golpes graves de pandero apagado)."""
    a = pandero("seguidor", "apagado", seed % 4)
    out = np.zeros(int(0.5 * SR))
    out[: len(a)] += a
    k = int(0.18 * SR)
    out[k:k + len(a)] += a[: len(out) - k] * 0.6
    return lowpass(out, 900, 2)


def shimmer(chord_midis, dur, seed=0):
    """Glissando ascendente de celesta sobre las notas del acorde."""
    notes = sorted(chord_midis)
    out = np.zeros(int((dur + 2.6) * SR))
    step = dur / max(1, len(notes))
    for i, m in enumerate(notes):
        s = celesta(int(m))
        k = int(i * step * SR)
        L = min(len(s), len(out) - k)
        out[k:k + L] += s[:L] * (0.5 + 0.5 * i / len(notes))
    return out / (np.max(np.abs(out)) + 1e-9)
