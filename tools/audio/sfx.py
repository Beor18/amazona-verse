"""Efectos de sonido sintetizados (numpy) para el pitch de Amazona Verse.

Coquí (co grave constante + quí agudo que sube), aleteo, río, chapoteo, burbujas, lluvia, vapor,
eclosión del huevo (crack + pop + destellos), UI de madera/celesta, viento del bosque, ráfaga de
huracán, y la lectura en voz alta del juego (TTS en inglés). Escribe en OUT/sfx/*.wav (24 bit, estéreo).

Uso: python3.11 -I sfx.py
"""
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

from dsp import (OUT, SR, bandpass, eq, fftconv, highpass, lowpass, lufs, make_ir,  # noqa: E402
                 noise_colored, pan_gains, read_wav, resample, rng, stft_filter, undb, write_wav)
from instrumentos import celesta, marimba  # noqa: E402

SFX = os.path.join(OUT, "sfx")
IR_BOSQUE = make_ir(rt60=1.3, predelay=0.012, hf_ratio=0.35, lo_cut=250, hi_cut=7000, seed=21)
_k = np.arange(160)
GAMMA = (_k / 12.0) * np.exp(1 - _k / 12.0)  # grano con subida suave (~0,25 ms) y caída
IR_CORTA = make_ir(rt60=0.5, predelay=0.004, hf_ratio=0.5, lo_cut=300, hi_cut=9000, seed=22)


def n_(s):
    return int(round(s * SR))


def st(x, pan=0.0):
    gl, gr = pan_gains(pan)
    return np.stack([x * gl, x * gr], axis=1)


def wet(x, ir, amount):
    x2 = x if x.ndim == 2 else st(x)
    w = fftconv(x2.mean(axis=1), ir)[: len(x2)]
    return x2 + amount * w


def edge(x, fin=0.002, fout=0.02):
    x = np.array(x, float, copy=True)
    a, b = n_(fin), n_(fout)
    sh = (slice(None),) + ((None,) if x.ndim == 2 else ())
    if a:
        x[:a] *= (np.linspace(0, 1, a) ** 2)[sh]
    if b:
        x[-b:] *= (np.linspace(1, 0, b) ** 2)[sh]
    return x


def cut(x, secs, fo=0.04):
    """Recorta a `secs` con fundido de salida (nunca un corte seco)."""
    y = np.array(x[: n_(secs)], float, copy=True)
    k = min(len(y), n_(fo))
    y[-k:] *= np.linspace(1, 0, k) ** 2
    return y


def glitter(n, dens=30.0, seed=0, decay=0.6, start=0.0):
    """Destellos: granos senoidales agudos (6-11 kHz) muy cortos, no impulsos."""
    r = rng(seed)
    out = np.zeros(n)
    t = start
    while True:
        t += r.exponential(1 / dens)
        i = n_(t)
        if i >= n - n_(0.02):
            break
        m = n_(0.012)
        tt = np.arange(m) / SR
        g = np.sin(2 * np.pi * r.uniform(6000, 11000) * tt) * np.sin(np.pi * tt / tt[-1]) ** 2
        out[i:i + m] += g * r.uniform(0.2, 1.0) * np.exp(-(t - start) / decay)
    return out


def pad_tail(x, secs):
    z = np.zeros((n_(secs),) + x.shape[1:])
    return np.concatenate([x, z])


def guardar(nombre, x, modo="pico", objetivo=-1.0):
    x = highpass(x if x.ndim == 2 else st(x), 20, 2)
    x = edge(x, 0.001, 0.03)
    if modo == "lufs":
        x = x * undb(objetivo - lufs(x))
        pk = np.max(np.abs(x))
        if pk > undb(-1):
            x *= undb(-1) / pk
    else:
        x = x * undb(objetivo) / (np.max(np.abs(x)) + 1e-12)
    write_wav(os.path.join(SFX, nombre + ".wav"), x)
    print(f"  {nombre:<20s} {len(x) / SR:5.2f} s  pico {20 * np.log10(np.max(np.abs(x))):6.2f} dBFS"
          f"  {lufs(x):6.1f} LUFS")
    return x


# ---------------------------------------------------------------------------
# Coquí
# ---------------------------------------------------------------------------
def coqui_call(f_co=1150.0, f_qui0=1880.0, f_qui1=2280.0, seed=0, co_d=0.10, gap=0.075, qui_d=0.17):
    """Un canto 'co-quí': 'co' casi constante; 'quí' más agudo y con barrido ascendente."""
    r = rng(seed)
    tot = co_d + gap + qui_d + 0.02
    n = n_(tot)
    t = np.arange(n) / SR
    f = np.zeros(n)
    a = np.zeros(n)
    i1, i2, i3 = n_(co_d), n_(co_d + gap), n_(co_d + gap + qui_d)
    x = np.linspace(0, 1, i1)
    f[:i1] = f_co * (1.0 + 0.01 * x - 0.03 * x ** 4)
    a[:i1] = np.minimum(1, x / 0.08) * np.minimum(1, (1 - x) / 0.2) * (0.85 + 0.15 * x)
    x = np.linspace(0, 1, i3 - i2)
    f[i2:i3] = f_qui0 + (f_qui1 - f_qui0) * (1 - np.exp(-3.2 * x)) / (1 - np.exp(-3.2))
    f[i2:i3] *= 1 - 0.015 * x ** 6
    a[i2:i3] = np.minimum(1, x / 0.06) * np.minimum(1, (1 - x) / 0.18) * 1.25
    f[i1:i2] = np.linspace(f[i1 - 1], f[i2], i2 - i1)
    f[i3:] = f[i3 - 1]
    ph = 2 * np.pi * np.cumsum(f) / SR + r.random()
    y = (np.sin(ph) + undb(-22) * np.sin(2 * ph + 0.4) + undb(-34) * np.sin(3 * ph + 1.1)) * a
    # leve aspereza del saco vocal
    y *= 1 + 0.06 * np.sin(2 * np.pi * 95 * t)
    return y


def coqui_coro(dur=14.0, seed=5):
    r = rng(seed)
    n = n_(dur + 1.5)
    out = np.zeros((n, 2))
    ranas = []
    for k in range(26):
        dist = r.uniform(0.15, 1.0) if k > 2 else r.uniform(0.0, 0.2)
        ranas.append(dict(p=r.uniform(-0.9, 0.9), g=undb(-20 * dist), d=dist,
                          s=r.uniform(0.92, 1.08), per=r.uniform(1.6, 3.4), ph=r.uniform(0, 3)))
    for k, rn in enumerate(ranas):
        t = rn["ph"]
        while t < dur:
            c = coqui_call(1150 * rn["s"], 1880 * rn["s"], 2280 * rn["s"] * r.uniform(0.98, 1.03),
                           seed=seed * 100 + k, co_d=r.uniform(0.09, 0.115), gap=r.uniform(0.06, 0.09),
                           qui_d=r.uniform(0.15, 0.19))
            if rn["d"] > 0.5:
                c = lowpass(c, 6000 - 3000 * rn["d"], 1)
            i = n_(t)
            seg = st(c * rn["g"], rn["p"])
            out[i:i + len(seg)] += seg[: n - i]
            t += rn["per"] * r.uniform(0.85, 1.15)
    amb = lowpass(noise_colored(n, -3, seed + 1), 1500, 1) * 0.004
    out += np.stack([amb, np.roll(amb, 977)], 1)
    out = wet(out, IR_BOSQUE, 0.35)
    out = out[: n_(dur)]
    fi, fo = n_(0.4), n_(1.5)
    out[:fi] *= np.linspace(0, 1, fi)[:, None]
    out[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
    return out


# ---------------------------------------------------------------------------
# Aleteo
# ---------------------------------------------------------------------------
def flap(seed=0, size=1.0, bright=1.0):
    """Un aletazo: empuje de aire grave + revoloteo de plumas."""
    r = rng(seed)
    d = 0.16 * size
    n = n_(d + 0.05)
    t = np.arange(n) / SR
    env = (t / (0.35 * d)) ** 2 * np.exp(-(t / (0.35 * d)) * 2) * 1.85
    push = bandpass(r.standard_normal(n), 120 * size ** -0.3, 1100 * bright, 2) * env
    # plumas: ruido modulado rápido (aleteo de barbas) en 2-7 kHz
    flutter = 0.65 + 0.35 * np.tanh(3 * np.sin(2 * np.pi * r.uniform(70, 110) * t))
    feath = bandpass(r.standard_normal(n), 1800, 7000 * bright, 2) * flutter
    feath *= np.exp(-((t - 0.45 * d) / (0.22 * d)) ** 2) * 0.35
    thump = np.sin(2 * np.pi * 85 * t) * np.exp(-t / 0.03) * np.minimum(1, t / 0.004) * 0.25
    return edge(push + feath + thump, 0.0005, 0.04)


def aleteo_seq(rates, dur, seed=0, gain_curve=None, pan_curve=None, bright_curve=None):
    r = rng(seed)
    n = n_(dur + 0.4)
    out = np.zeros((n, 2))
    t = 0.0
    k = 0
    while t < dur:
        x = t / dur
        rate = np.interp(x, np.linspace(0, 1, len(rates)), rates)
        g = gain_curve(x) if gain_curve else 1.0
        p = pan_curve(x) if pan_curve else 0.0
        b = bright_curve(x) if bright_curve else 1.0
        f = flap(seed * 1000 + k, size=r.uniform(0.9, 1.1), bright=b) * g * r.uniform(0.85, 1.1)
        i = n_(t)
        seg = st(f, p)
        out[i:i + len(seg)] += seg[: n - i]
        t += (1 / rate) * r.uniform(0.95, 1.05)
        k += 1
    return out


def aleteo_despegue():
    x = aleteo_seq([7.5, 7.0, 5.8, 5.2], 2.0, seed=31,
                   gain_curve=lambda u: (1.0 if u < 0.45 else np.exp(-(u - 0.45) * 3.2)),
                   pan_curve=lambda u: -0.1 + 0.5 * u, bright_curve=lambda u: 1.0 - 0.45 * u)
    # rama que suelta: hojas
    r = rng(32)
    m = n_(0.5)
    gr = (r.random(m) < 0.04) * r.uniform(0.3, 1, m)
    leaves = bandpass(np.convolve(gr, GAMMA)[:m], 2000, 8000, 2)
    leaves *= np.exp(-np.arange(m) / (0.12 * SR)) * 0.25
    x[:m] += st(leaves, -0.2)
    return wet(x, IR_BOSQUE, 0.18)


def aleteo_bandada():
    out = np.zeros((n_(4.6), 2))
    r = rng(41)
    for b in range(5):
        off = r.uniform(0, 0.6)
        dur = 3.4
        p0, p1 = r.uniform(-1, -0.5), r.uniform(0.5, 1)
        peak = r.uniform(0.4, 0.6)
        x = aleteo_seq([r.uniform(5.2, 6.4)] * 2, dur, seed=50 + b,
                       gain_curve=lambda u, pk=peak: np.exp(-((u - pk) / 0.28) ** 2),
                       pan_curve=lambda u, a=p0, c=p1: a + (c - a) * u,
                       bright_curve=lambda u, pk=peak: 0.6 + 0.4 * np.exp(-((u - pk) / 0.3) ** 2))
        i = n_(off)
        out[i:i + len(x)] += x[: len(out) - i] * r.uniform(0.6, 1.0)
    return wet(out, IR_BOSQUE, 0.3)


# ---------------------------------------------------------------------------
# Agua
# ---------------------------------------------------------------------------
def burbuja(f0, tau, seed=0, rise=0.25):
    """Burbuja (resonancia de Minnaert): seno amortiguado con frecuencia que sube."""
    n = n_(min(0.25, tau * 6))
    t = np.arange(n) / SR
    f = f0 * (1 + rise * (t / (tau * 3)))
    ph = 2 * np.pi * np.cumsum(f) / SR + rng(seed).random() * 6
    return np.sin(ph) * np.exp(-t / tau) * np.minimum(1, t / 0.0008)


def burbujas_campo(dur, rate, fmin, fmax, seed=0, taumin=0.006, taumax=0.03, gmin=-24, density_curve=None):
    r = rng(seed)
    n = n_(dur + 0.3)
    out = np.zeros((n, 2))
    t = 0.0
    k = 0
    while t < dur:
        dc = density_curve(t / dur) if density_curve else 1.0
        if dc <= 0.01:
            t += 0.01
            continue
        t += r.exponential(1 / (rate * dc))
        f0 = np.exp(r.uniform(np.log(fmin), np.log(fmax)))
        tau = np.exp(r.uniform(np.log(taumin), np.log(taumax))) * (800 / f0) ** 0.3
        b = burbuja(f0, tau, seed * 7919 + k) * undb(r.uniform(gmin, 0))
        i = n_(t)
        seg = st(b, r.uniform(-0.8, 0.8))
        out[i:i + len(seg)] += seg[: n - i]
        k += 1
    return out[: n_(dur)]


def rio(dur=20.0):
    n = n_(dur)
    rush = []
    for c in range(2):
        nz = noise_colored(n, -3, 60 + c)

        def mask(t, f, c=c):
            mod = 1 + 0.25 * np.sin(2 * np.pi * (0.31 + 0.07 * c) * t[:, None] + c) \
                + 0.15 * np.sin(2 * np.pi * 1.7 * t[:, None] + 2 * c)
            band = np.exp(-0.5 * (np.log2(np.maximum(f, 1) / 900) / 1.6) ** 2)
            return mod * band[None, :]

        rush.append(stft_filter(nz, mask, 2048, 512))
    rush = np.stack(rush, 1) * 0.05
    gurgle = burbujas_campo(dur, 140, 250, 2600, seed=61, gmin=-30)
    out = rush + gurgle * 0.35
    out = highpass(out, 120, 2)
    out = wet(out, IR_CORTA, 0.2)
    return out


def chapoteo():
    r = rng(70)
    n = n_(1.8)
    t = np.arange(n) / SR
    imp = r.standard_normal(n) * np.exp(-t / 0.07) * np.minimum(1, t / 0.002)

    def mask(tt, f):
        fc = 1500 + 7000 * np.exp(-np.maximum(tt, 0)[:, None] / 0.06)
        return 1 / np.sqrt(1 + (f[None, :] / fc) ** 4) * (1 - np.exp(-f[None, :] / 150))

    body = stft_filter(imp, mask, 1024, 256)
    plunk = burbuja(330, 0.05, 71, rise=0.6) * 0.9
    plunk = np.concatenate([np.zeros(n_(0.03)), plunk])
    spray = burbujas_campo(1.4, 70, 1500, 6000, seed=72, taumin=0.003, taumax=0.012, gmin=-20,
                           density_curve=lambda u: np.exp(-u * 3.5))
    slosh = lowpass(r.standard_normal(n), 700, 2) * np.exp(-t / 0.35) * (1 + 0.5 * np.sin(2 * np.pi * 6 * t)) * 0.25
    out = st(body * 0.8 + slosh)
    out[: len(plunk)] += st(plunk)
    i = n_(0.04)
    out[i:i + len(spray)] += spray * 0.6
    return wet(out, IR_CORTA, 0.25)


def burbujas_buceo(dur=5.0):
    n = n_(dur)
    amb = lowpass(noise_colored(n, -6, 80), 450, 2)
    amb *= 0.06 * (1 + 0.3 * np.sin(2 * np.pi * 0.4 * np.arange(n) / SR))
    out = st(amb)
    out[:, 1] = np.roll(out[:, 1], 1200)
    r = rng(81)
    t = 0.15
    k = 0
    while t < dur - 0.5:
        burst = burbujas_campo(0.6, 60, 380, 1600, seed=90 + k, taumin=0.01, taumax=0.04, gmin=-14,
                               density_curve=lambda u: np.exp(-u * 2.5))
        i = n_(t)
        out[i:i + len(burst)] += burst[: n - i] * 0.5
        t += r.uniform(1.0, 1.6)
        k += 1
    out = lowpass(out, 2800, 2)
    return wet(out, IR_CORTA, 0.3)


def gotas_lluvia(dur=3.0):
    n = n_(dur)
    r = rng(100)
    hiss = bandpass(noise_colored(n, -1, 101), 2500, 10000, 2) * 0.03
    out = st(hiss)
    out[:, 1] = np.roll(out[:, 1], 777)
    drops = burbujas_campo(dur, 120, 1800, 6500, seed=102, taumin=0.002, taumax=0.008, gmin=-22)
    out += drops * 0.5
    clk = np.zeros(n)
    idx = r.integers(0, n, int(dur * 90))
    clk[idx] = r.uniform(0.2, 1, idx.size)
    clk = bandpass(np.convolve(clk, np.exp(-np.arange(48) / 8))[:n], 3000, 9000, 2) * 0.25
    out += st(clk, 0.2)
    out *= np.minimum(1, np.arange(n) / n_(0.3))[:, None]
    return wet(out, IR_CORTA, 0.2)


def whoosh(dur=0.9, f0=300, f1=3500, seed=110, pan0=-0.6, pan1=0.6, peak_at=0.55):
    n = n_(dur)
    nz = noise_colored(n, -1.5, seed)

    def mask(t, f):
        x = np.clip(t / dur, 0, 1)[:, None]
        fc = f0 * (f1 / f0) ** np.where(x < peak_at, x / peak_at, 1 - (x - peak_at) / (1 - peak_at) * 0.6)
        return np.exp(-0.5 * (np.log2(np.maximum(f[None, :], 1) / fc) / 0.9) ** 2)

    y = stft_filter(nz, mask, 1024, 256)
    t = np.arange(n) / SR
    env = np.where(t < peak_at * dur, (t / (peak_at * dur)) ** 2, np.exp(-(t - peak_at * dur) / (0.18 * dur)))
    y *= env
    p = np.linspace(pan0, pan1, n)
    gl, gr = pan_gains(p)
    return np.stack([y * gl, y * gr], 1)


def vapor_sube():
    w = whoosh(1.5, 350, 5000, 120, -0.2, 0.2, 0.75)
    n = len(w)
    t = np.arange(n) / SR
    f = 900 * 2 ** (2.2 * t / 1.5)
    sh = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.04 * np.sin(np.pi * t / 1.5) ** 2
    w += st(sh)
    return wet(w, IR_BOSQUE, 0.3)


# ---------------------------------------------------------------------------
# Huevo
# ---------------------------------------------------------------------------
def crack(seed=0, n_clicks=10, spread=0.03, size=1.0):
    r = rng(seed)
    n = n_(spread + 0.12)
    out = np.zeros(n)
    for k in range(n_clicks):
        i = n_(abs(r.normal(0, spread / 2.5)))
        m = n_(0.004)
        c = r.standard_normal(m) * np.exp(-np.arange(m) / (0.0004 * SR)) * r.uniform(0.3, 1)
        out[i:i + m] += c[: n - i]
    out = eq(bandpass(out, 1500, 9000, 2), [("peak", 3800, 2.0, 5.0)])
    t = np.arange(n) / SR
    tok = np.sin(2 * np.pi * 720 * size ** -0.5 * t) * np.exp(-t / 0.012) * 0.35
    return out / (np.max(np.abs(out)) + 1e-9) + tok


def huevo_crack():
    out = np.zeros(n_(1.2))
    for t, s, nc in [(0.0, 1, 8), (0.38, 2, 12), (0.62, 3, 16)]:
        c = crack(200 + s, nc, 0.025 + 0.01 * s) * (0.6 + 0.2 * s)
        i = n_(t)
        out[i:i + len(c)] += c[: len(out) - i]
    return wet(st(out), IR_CORTA, 0.25)


def pio(seed=0):
    """Piar de pichón: dos chirridos cortos que suben y bajan."""
    out = np.zeros(n_(0.3))
    for k, t0 in enumerate([0.0, 0.13]):
        n = n_(0.08)
        t = np.arange(n) / SR
        f = 3200 + 900 * np.sin(np.pi * t / 0.08) * (1.05 if k else 1)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.08) ** 1.5
        i = n_(t0)
        out[i:i + n] += y * (0.8 if k else 1)
    return out


def huevo_pop():
    n = n_(2.6)
    out = np.zeros((n, 2))
    c = crack(210, 22, 0.05, 1.2)
    out[: len(c)] += st(c * 0.9)
    # pop: tono que sube rápido + soplo
    i0 = n_(0.09)
    m = n_(0.09)
    t = np.arange(m) / SR
    f = 260 + 700 * (1 - np.exp(-t / 0.012))
    pop = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.025) * np.minimum(1, t / 0.001)
    puff = bandpass(rng(211).standard_normal(m), 400, 3000, 2) * np.exp(-t / 0.012) * 0.4
    out[i0:i0 + m] += st(pop + puff)
    # destellos (celesta ascendente en re mayor)
    for k, mid in enumerate([86, 90, 93, 98]):
        s = cut(celesta(mid), 1.8) * (0.32 - 0.04 * k)
        i = n_(0.16 + 0.06 * k)
        L = min(len(s), n - i)
        out[i:i + L] += st(s[:L], -0.4 + 0.27 * k)
    out += st(glitter(n, 40, 212, 0.5, 0.15) * 0.18, 0.3)
    pp = pio(5) * 0.22
    i = n_(0.55)
    out[i:i + len(pp)] += st(pp, 0.15)
    return wet(out, IR_BOSQUE, 0.25)


# ---------------------------------------------------------------------------
# UI
# ---------------------------------------------------------------------------
def madera(f0=2100, dur=0.06, seed=0, body=600):
    n = n_(dur)
    t = np.arange(n) / SR
    r = rng(seed)
    y = (np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.012)
         + 0.45 * np.sin(2 * np.pi * f0 * 2.53 * t + r.random()) * np.exp(-t / 0.005)
         + 0.6 * np.sin(2 * np.pi * body * t) * np.exp(-t / 0.018))
    y += highpass(r.standard_normal(n), 3000, 2) * np.exp(-t / 0.0012) * 0.3
    return y * np.minimum(1, t / 0.0005)


def ui_click():
    return wet(st(madera(2100, 0.08, 301)), IR_CORTA, 0.12)


def ui_tick():
    return wet(st(madera(3300, 0.05, 302, body=1100) * 0.8), IR_CORTA, 0.1)


def ui_confirmar():
    out = np.zeros((n_(1.2), 2))
    for k, (m, t) in enumerate([(81, 0.0), (88, 0.075)]):
        s = cut(marimba(m), 1.0) * (0.8 + 0.2 * k)
        i = n_(t)
        out[i:i + len(s)] += st(s, -0.15 + 0.3 * k)
    return wet(out, IR_BOSQUE, 0.2)


def ui_logro():
    out = np.zeros((n_(2.0), 2))
    for k, m in enumerate([86, 90, 93, 98]):
        s = cut(celesta(m), 1.6) * (0.7 + 0.1 * k)
        i = n_(0.055 * k)
        out[i:i + len(s)] += st(s, -0.5 + 0.33 * k)
    m0 = cut(marimba(74), 0.8) * 0.5
    out[: len(m0)] += st(m0)
    return wet(out, IR_BOSQUE, 0.3)


def ui_encaje():
    out = np.zeros((n_(0.5), 2))
    n = n_(0.12)
    t = np.arange(n) / SR
    thump = np.sin(2 * np.pi * (120 + 80 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.03) * np.minimum(1, t / 0.001)
    out[:n] += st(thump * 0.8)
    c = madera(1600, 0.07, 303, body=450)
    out[: len(c)] += st(c * 0.7)
    c2 = madera(2600, 0.06, 304, body=900)
    i = n_(0.055)
    out[i:i + len(c2)] += st(c2 * 0.55, 0.1)
    b = cut(marimba(93), 0.35) * 0.25
    i = n_(0.09)
    out[i:i + len(b)] += st(b, 0.2)
    return wet(out, IR_CORTA, 0.15)


def ui_whoosh():
    return whoosh(0.55, 500, 4500, 130, -0.5, 0.5, 0.6)


def whoosh_transicion():
    return wet(whoosh(1.3, 200, 3000, 140, -0.8, 0.8, 0.6), IR_BOSQUE, 0.2)


# ---------------------------------------------------------------------------
# Viento
# ---------------------------------------------------------------------------
def curva_suave(n_pts, dur, seed, lo=0.3, hi=1.0, period=5.0):
    r = rng(seed)
    k = int(dur / period * 3) + 4
    xs = np.linspace(0, dur, k)
    ys = r.uniform(lo, hi, k)
    t = np.linspace(0, dur, n_pts)
    # interpolación coseno
    idx = np.clip(np.searchsorted(xs, t) - 1, 0, k - 2)
    u = (t - xs[idx]) / (xs[idx + 1] - xs[idx])
    u = (1 - np.cos(np.pi * u)) / 2
    return ys[idx] * (1 - u) + ys[idx + 1] * u


def viento_bosque(dur=40.0):
    n = n_(dur)
    out = np.zeros((n, 2))
    gust = curva_suave(n, dur, 151, 0.25, 1.0, 5.5)
    for c in range(2):
        nz = noise_colored(n, -3, 150 + c)
        g_c = np.roll(gust, n_(0.35) * c)

        def mask(t, f, g_c=g_c):
            g = np.interp(t, np.arange(n) / SR, g_c)[:, None]
            fc = 300 + 900 * g
            band = np.exp(-0.5 * (np.log2(np.maximum(f[None, :], 1) / fc) / 1.5) ** 2)
            return band * g * hp_mag_(f)[None, :]

        out[:, c] = stft_filter(nz, mask, 2048, 512) * 0.12
        # hojas: crujido granular que crece con la ráfaga
        r = rng(160 + c)
        dens = 0.002 + 0.03 * g_c ** 2
        grains = (r.random(n) < dens) * r.uniform(0.2, 1, n)
        leaves = bandpass(np.convolve(grains, GAMMA)[:n], 2200, 9000, 2)
        out[:, c] += leaves * 0.05
    return out


def hp_mag_(f):
    with np.errstate(divide="ignore"):
        return 1 / np.sqrt(1 + (70 / np.maximum(f, 1)) ** 4)


def rafaga_huracan(dur=6.5):
    n = n_(dur)
    t = np.arange(n) / SR
    env = np.where(t < 2.6, (t / 2.6) ** 2.2, np.exp(-(t - 2.6) / 1.4))
    out = np.zeros((n, 2))
    for c in range(2):
        nz = noise_colored(n, -4.5, 170 + c)

        def mask(tt, f, c=c):
            e = np.interp(tt, t, env)[:, None]
            fc = 220 + 700 * e + 40 * np.sin(2 * np.pi * 0.7 * tt[:, None] + c)
            howl = 1 + 2.5 * np.exp(-0.5 * (np.log2(np.maximum(f[None, :], 1) / (fc * 1.6)) / 0.18) ** 2)
            band = np.exp(-0.5 * (np.log2(np.maximum(f[None, :], 1) / fc) / 1.7) ** 2)
            return band * howl * (0.15 + e) * hp_mag_(f)[None, :]

        out[:, c] = stft_filter(nz, mask, 2048, 512) * 0.2
        r = rng(180 + c)
        grains = (r.random(n) < 0.05 * env ** 2) * r.uniform(0.2, 1, n) * env
        debris = bandpass(np.convolve(grains, GAMMA)[:n], 1500, 8000, 2)
        out[:, c] += debris * 0.06
    return out


# ---------------------------------------------------------------------------
# Voces del juego (TTS)
# ---------------------------------------------------------------------------
def tts(texto, voz, extra=""):
    with tempfile.TemporaryDirectory() as d:
        w = os.path.join(d, "t.wav")
        subprocess.run(["say", "-v", voz, "--file-format=WAVE", "--data-format=LEI16@48000", "-o", w,
                        extra + texto], check=True)
        x, sr = read_wav(w)
    x = resample(x[:, 0], sr, SR)
    e = np.abs(x) > 0.01
    idx = np.where(e)[0]
    return x[max(0, idx[0] - n_(0.02)): idx[-1] + n_(0.12)]


def juego_lectura_en():
    """Lectura en voz alta del juego (Modo Maestro, inglés): suena a altavoz de tableta, no a narradora."""
    x = tts("Water rises as vapor.", "Samantha", "[[rate 184]] ")
    x = bandpass(x, 300, 7500, 2)
    x = eq(x, [("peak", 1800, 1.0, 3.0), ("peak", 450, 1.0, -2.0)])
    return wet(st(x), IR_CORTA, 0.12)


def vittata_wepa():
    """'¡Wepa!' de Vittata (opcional): TTS con tono alto y remuestreo para un timbre de personaje."""
    x = tts("¡Wepa!", "Paulina", "[[rate 190]] [[pbas +6]] ")
    y = resample(x, SR, int(SR / 1.22))  # +3,4 semitonos y formantes más pequeños
    y = eq(y, [("hp", 150, 0.7, 0), ("peak", 3000, 1.0, 2.0)])
    return wet(st(y), IR_BOSQUE, 0.1)


# ---------------------------------------------------------------------------
# Pedidos del comité (v2 de tomas)
# ---------------------------------------------------------------------------
def corte_golpe(seed=0):
    """Golpe de corte para el montaje de verbos: pulso grave + chasquido de cuero + aire."""
    n = n_(0.6)
    t = np.arange(n) / SR
    r = rng(400 + seed)
    f = 70 + 90 * np.exp(-t / 0.02)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09) * np.minimum(1, t / 0.0015)
    snap = bandpass(r.standard_normal(n), 900, 6000, 2) * np.exp(-t / 0.012) * 0.45
    air = bandpass(r.standard_normal(n), 400, 3000, 2) * np.exp(-t / 0.06) * 0.12
    return wet(st(np.tanh(1.5 * (body + snap + air))), IR_CORTA, 0.18)


def ui_premio():
    """Premio (la pava): arpegio de celesta y marimba que sube y brilla unos 3 s."""
    out = np.zeros((n_(3.6), 2))
    for k, m in enumerate([74, 78, 81, 86, 90, 93, 98]):
        s = cut(celesta(m), 2.4) * (0.55 + 0.06 * k)
        i = n_(0.07 * k)
        out[i:i + len(s)] += st(s, -0.6 + 0.2 * k)
    for k, m in enumerate([62, 69, 74]):
        s = cut(marimba(m), 1.2) * 0.45
        i = n_(0.14 * k)
        out[i:i + len(s)] += st(s, 0.0)
    nn = len(out)
    out += st(glitter(nn, 45, 410, 1.2, 0.05) * 0.15, 0.25)
    return wet(out, IR_BOSQUE, 0.35)


def pop_crecer(nivel=1):
    """'Pop' de crecimiento (juvenil, adulta): sin cáscara, más agudo en cada etapa."""
    n = n_(1.6)
    out = np.zeros((n, 2))
    m = n_(0.09)
    t = np.arange(m) / SR
    k = 2 ** (nivel * 3 / 12)
    f = (260 + 700 * (1 - np.exp(-t / 0.012))) * k
    pop = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.025) * np.minimum(1, t / 0.001)
    puff = bandpass(rng(420 + nivel).standard_normal(m), 400, 3000, 2) * np.exp(-t / 0.012) * 0.35
    out[:m] += st(pop + puff)
    base = {0: [81, 86, 90], 1: [86, 90, 93]}.get(nivel, [90, 93, 98])
    for j, mid in enumerate(base):
        s = cut(celesta(mid), 1.3) * (0.28 - 0.04 * j)
        i = n_(0.05 + 0.05 * j)
        L = min(len(s), n - i)
        out[i:i + L] += st(s[:L], -0.3 + 0.3 * j)
    return wet(out, IR_BOSQUE, 0.22)


def aleteo_corto():
    x = aleteo_seq([6.0, 5.6], 0.75, seed=37, gain_curve=lambda u: 1.0 - 0.3 * u,
                   pan_curve=lambda u: 0.1, bright_curve=lambda u: 0.95)
    return wet(x, IR_BOSQUE, 0.15)


def aterrizaje():
    """Aterrizaje en una rama: aletazos de frenado, golpe en la madera y hojas. El apoyo cae a 0.40 s."""
    n = n_(1.3)
    out = np.zeros((n, 2))
    fl = aleteo_seq([8.0, 6.0], 0.36, seed=38, gain_curve=lambda u: 0.7 + 0.3 * u,
                    pan_curve=lambda u: 0.0, bright_curve=lambda u: 1.0)
    out[: len(fl)] += fl[:n]
    i = n_(0.40)
    m = n_(0.25)
    t = np.arange(m) / SR
    r = rng(440)
    thump = (np.sin(2 * np.pi * 120 * t) * np.exp(-t / 0.05) * 0.8
             + np.sin(2 * np.pi * 340 * t + 1) * np.exp(-t / 0.03) * 0.35
             + np.sin(2 * np.pi * 760 * t + 2) * np.exp(-t / 0.015) * 0.2) * np.minimum(1, t / 0.001)
    out[i:i + m] += st(thump)
    k = n - i
    env = np.exp(-np.arange(k) / (0.09 * SR))
    kern = (np.arange(400) / 40.0) * np.exp(1 - np.arange(400) / 40.0)  # roce de hoja (~1 ms)
    for c in range(2):
        gr = (r.random(k) < 0.06 * env) * r.uniform(0.3, 1, k) * env
        out[i:, c] += bandpass(np.convolve(gr, kern)[:k], 1500, 6500, 2) * 0.12
    return wet(out, IR_BOSQUE, 0.2)


def teclado(dur=2.6, seed=0):
    """Tecleo en una Chromebook: teclas de plástico con fondo de carrera; algún espacio más grave."""
    r = rng(430 + seed)
    n = n_(dur + 0.2)
    out = np.zeros((n, 2))
    t = 0.05
    k = 0
    while t < dur:
        es_espacio = r.random() < 0.12
        m = n_(0.03)
        tt = np.arange(m) / SR
        f1 = r.uniform(2600, 3600) if not es_espacio else r.uniform(1300, 1700)
        click = (np.sin(2 * np.pi * f1 * tt) * np.exp(-tt / 0.0025)
                 + bandpass(r.standard_normal(m), 2000, 9000, 2) * np.exp(-tt / 0.0012) * 0.6)
        bottom = np.sin(2 * np.pi * (180 if es_espacio else 260) * tt) * np.exp(-tt / 0.006) * 0.5
        y = (click + bottom) * np.minimum(1, tt / 0.0004) * r.uniform(0.6, 1.0) * (1.2 if es_espacio else 1)
        i = n_(t)
        seg = st(y, r.uniform(-0.25, 0.25))
        out[i:i + m] += seg[: n - i]
        # el soltar la tecla, más suave
        j = i + n_(r.uniform(0.045, 0.07))
        out[j:j + m] += seg[: max(0, min(m, n - j))] * 0.3
        t += r.uniform(0.075, 0.17) + (0.25 if r.random() < 0.08 else 0)
        k += 1
    out *= np.minimum(1, (n - np.arange(n)) / n_(0.15))[:, None]
    return wet(out, IR_CORTA, 0.1)


def main():
    os.makedirs(SFX, exist_ok=True)
    print("SFX ->", SFX)
    guardar("coqui_1", wet(st(pad_tail(coqui_call(seed=1), 0.6)), IR_BOSQUE, 0.18))
    guardar("coqui_2", wet(st(lowpass(pad_tail(coqui_call(1085, 1790, 2190, seed=2, co_d=0.11), 0.6), 7000, 1)),
                           IR_BOSQUE, 0.35))
    guardar("coqui_coro", coqui_coro(), "lufs", -20)
    guardar("aleteo_despegue", aleteo_despegue())
    guardar("aleteo_bandada", aleteo_bandada())
    guardar("aleteo_vuelo", aleteo_seq([5.6, 5.6], 3.0, seed=36, pan_curve=lambda u: 0.0, bright_curve=lambda u: 0.85))
    guardar("rio", rio(), "lufs", -20)
    guardar("chapoteo", chapoteo())
    guardar("burbujas_buceo", burbujas_buceo(), "lufs", -20)
    guardar("gotas_lluvia", gotas_lluvia(), "lufs", -20)
    guardar("vapor_sube", vapor_sube())
    guardar("huevo_crack", huevo_crack())
    guardar("huevo_pop", huevo_pop())
    guardar("ui_click", ui_click(), objetivo=-3)
    guardar("ui_tick", ui_tick(), objetivo=-3)
    guardar("ui_confirmar", ui_confirmar(), objetivo=-3)
    guardar("ui_logro", ui_logro(), objetivo=-3)
    guardar("ui_encaje", ui_encaje(), objetivo=-3)
    guardar("ui_whoosh", ui_whoosh(), objetivo=-3)
    guardar("whoosh_transicion", whoosh_transicion(), objetivo=-3)
    guardar("viento_bosque", viento_bosque(), "lufs", -20)
    guardar("rafaga_huracan", rafaga_huracan(), "lufs", -18)
    guardar("juego_lectura_en", juego_lectura_en(), "lufs", -20)
    guardar("vittata_wepa", vittata_wepa(), "lufs", -20)
    guardar("corte_golpe", corte_golpe(), objetivo=-1)
    guardar("ui_premio", ui_premio(), objetivo=-3)
    guardar("pop_bebe", pop_crecer(0), objetivo=-1)
    guardar("pop_juvenil", pop_crecer(1), objetivo=-1)
    guardar("pop_adulta", pop_crecer(2), objetivo=-1)
    guardar("aleteo_corto", aleteo_corto())
    guardar("aterrizaje", aterrizaje())
    guardar("teclado", teclado(), "lufs", -20)


if __name__ == "__main__":
    main()
