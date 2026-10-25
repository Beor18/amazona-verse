"""DSP mínimo para el audio del pitch de Amazona Verse (solo numpy, sin scipy).

Todo es determinista (semillas fijas), a 48 kHz y en float64.
Filtros estáticos en el dominio de la frecuencia (FFT), filtros variables por STFT,
reverb por convolución con IR sintética, loudness BS.1770-4 y limitador true-peak.
"""
import os
import wave

import numpy as np

SR = 48000

# Rutas comunes -----------------------------------------------------------
HOME = os.path.expanduser("~")
REPO = os.path.join(HOME, "AmazonaVerse", "Juego")
TOOLS = os.path.join(REPO, "tools", "audio")
OUT = os.path.join(HOME, "AmazonaVerse", "_trabajo_claude", "pitch", "audio")


def rng(seed):
    return np.random.default_rng(seed)


def db(x):
    return 20 * np.log10(np.maximum(np.abs(x), 1e-12))


def undb(d):
    return 10 ** (np.asarray(d, dtype=float) / 20)


def next_pow2(n):
    return 1 << int(np.ceil(np.log2(max(2, n))))


def secs(n):
    return int(round(n * SR))


# WAV ---------------------------------------------------------------------
def write_wav(path, x, sr=SR, bits=24):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    peak = float(np.max(np.abs(x))) if x.size else 0.0
    if peak > 1.0:
        raise ValueError(f"clipping al escribir {path}: pico {peak:.4f}")
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    if bits == 16:
        data = np.clip(np.round(x * 32767), -32768, 32767).astype("<i2").tobytes()
        sw = 2
    else:
        i = np.clip(np.round(x * 8388607), -8388608, 8388607).astype("<i4")
        data = np.ascontiguousarray(i).view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
        sw = 3
    with wave.open(path, "wb") as w:
        w.setnchannels(x.shape[1])
        w.setsampwidth(sw)
        w.setframerate(sr)
        w.writeframes(data)


def read_wav(path):
    """Devuelve (x[n, canales] float64 en [-1, 1], sr)."""
    with wave.open(path, "rb") as w:
        nch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    if sw == 2:
        x = np.frombuffer(raw, "<i2").astype(np.float64) / 32768
    elif sw == 3:
        b = np.frombuffer(raw, np.uint8).reshape(-1, 3).astype(np.int32)
        i = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)
        i = np.where(i >= 1 << 23, i - (1 << 24), i)
        x = i.astype(np.float64) / 8388608
    elif sw == 4:
        x = np.frombuffer(raw, "<i4").astype(np.float64) / 2147483648
    else:
        x = (np.frombuffer(raw, np.uint8).astype(np.float64) - 128) / 128
    return x.reshape(-1, nch), sr


def resample(x, sr_in, sr_out=SR):
    """Remuestreo limitado en banda por FFT (con relleno para evitar el efecto circular)."""
    if sr_in == sr_out:
        return x
    x = np.asarray(x, float)
    mono = x.ndim == 1
    x2 = x[:, None] if mono else x
    pad = sr_in // 10
    xp = np.concatenate([x2, np.zeros((pad, x2.shape[1]))])
    n = len(xp)
    m = int(round(n * sr_out / sr_in))
    X = np.fft.rfft(xp, axis=0)
    k = m // 2 + 1
    Y = np.zeros((k, x2.shape[1]), complex)
    kk = min(k, X.shape[0])
    Y[:kk] = X[:kk]
    if sr_out < sr_in:  # antialias suave cerca del nuevo Nyquist
        f = np.linspace(0, 1, kk)
        Y[:kk] *= (1 / np.sqrt(1 + (f / 0.92) ** 40))[:, None]
    y = np.fft.irfft(Y, m, axis=0) * (m / n)
    y = y[: int(round(len(x2) * sr_out / sr_in))]
    return y[:, 0] if mono else y


# Filtros -----------------------------------------------------------------
def fft_apply(x, H_fn, pad=SR // 2):
    """Aplica una respuesta H(f) (real = fase cero, compleja = IIR equivalente)."""
    x = np.asarray(x, float)
    mono = x.ndim == 1
    x2 = x[:, None] if mono else x
    n = x2.shape[0]
    N = next_pow2(n + pad)
    f = np.fft.rfftfreq(N, 1 / SR)
    H = H_fn(f)
    y = np.fft.irfft(np.fft.rfft(x2, N, axis=0) * H[:, None], N, axis=0)[:n]
    return y[:, 0] if mono else y


def lp_mag(f, fc, order=2):
    return 1 / np.sqrt(1 + (f / fc) ** (2 * order))


def hp_mag(f, fc, order=2):
    with np.errstate(divide="ignore"):
        r = np.where(f > 0, fc / np.maximum(f, 1e-9), 1e9)
    return 1 / np.sqrt(1 + r ** (2 * order))


def lowpass(x, fc, order=2):
    return fft_apply(x, lambda f: lp_mag(f, fc, order))


def highpass(x, fc, order=2):
    return fft_apply(x, lambda f: hp_mag(f, fc, order))


def bandpass(x, lo, hi, order=2):
    return fft_apply(x, lambda f: hp_mag(f, lo, order) * lp_mag(f, hi, order))


def biquad(kind, f0, q=0.707, gain_db=0.0):
    """Coeficientes RBJ (b, a) normalizados."""
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    cw, sw = np.cos(w0), np.sin(w0)
    al = sw / (2 * q)
    sA = np.sqrt(A)
    if kind == "peak":
        b = [1 + al * A, -2 * cw, 1 - al * A]
        a = [1 + al / A, -2 * cw, 1 - al / A]
    elif kind == "lowshelf":
        b = [A * ((A + 1) - (A - 1) * cw + 2 * sA * al), 2 * A * ((A - 1) - (A + 1) * cw),
             A * ((A + 1) - (A - 1) * cw - 2 * sA * al)]
        a = [(A + 1) + (A - 1) * cw + 2 * sA * al, -2 * ((A - 1) + (A + 1) * cw),
             (A + 1) + (A - 1) * cw - 2 * sA * al]
    elif kind == "highshelf":
        b = [A * ((A + 1) + (A - 1) * cw + 2 * sA * al), -2 * A * ((A - 1) + (A + 1) * cw),
             A * ((A + 1) + (A - 1) * cw - 2 * sA * al)]
        a = [(A + 1) - (A - 1) * cw + 2 * sA * al, 2 * ((A - 1) - (A + 1) * cw),
             (A + 1) - (A - 1) * cw - 2 * sA * al]
    elif kind == "lp":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + al, -2 * cw, 1 - al]
    elif kind == "hp":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + al, -2 * cw, 1 - al]
    elif kind == "bp":
        b = [al, 0.0, -al]
        a = [1 + al, -2 * cw, 1 - al]
    else:
        raise ValueError(kind)
    b, a = np.array(b, float), np.array(a, float)
    return b / a[0], a / a[0]


def biquad_resp(ba, f):
    b, a = ba
    z = np.exp(-2j * np.pi * f / SR)
    return (b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z)


def eq(x, bands):
    """bands: lista de (tipo, f0, q, ganancia_db). Respuesta de fase mínima (como un EQ analógico)."""
    if not bands:
        return x

    def H(f):
        h = np.ones_like(f, dtype=complex)
        for b in bands:
            h *= biquad_resp(biquad(*b), f)
        return h

    return fft_apply(x, H)


def stft_filter(x, mask_fn, nfft=2048, hop=512):
    """Filtro variable en el tiempo. mask_fn(t[F], f[K]) -> ganancias [F, K]. x mono."""
    x = np.asarray(x, float)
    n = len(x)
    win = np.hanning(nfft + 1)[:-1]
    pad = nfft
    nf = int(np.ceil((n + pad) / hop)) + 1
    xp = np.zeros((nf - 1) * hop + nfft + pad)
    xp[pad:pad + n] = x
    nf = 1 + (len(xp) - nfft) // hop
    idx = np.arange(nfft)[None, :] + hop * np.arange(nf)[:, None]
    S = np.fft.rfft(xp[idx] * win, axis=1)
    t = (np.arange(nf) * hop + nfft / 2 - pad) / SR
    f = np.fft.rfftfreq(nfft, 1 / SR)
    S *= mask_fn(t, f)
    yf = np.fft.irfft(S, nfft, axis=1) * win
    y = np.zeros(len(xp) + nfft)
    wsum = np.zeros_like(y)
    w2 = win * win
    r = nfft // hop
    for j in range(r):
        sub = yf[j::r]
        start = j * hop
        flat = sub.reshape(-1)
        # cada fila de sub empieza en start + k*nfft
        y[start:start + flat.size] += flat
        wsum[start:start + flat.size] += np.tile(w2, sub.shape[0])
    y = y / np.maximum(wsum, 1e-3)
    return y[pad:pad + n]


def onepole_lp_series(x, fc):
    """One-pole en bucle (solo para señales cortas o de control)."""
    a = np.exp(-2 * np.pi * np.asarray(fc, float) / SR) * np.ones(len(x))
    y = np.empty(len(x))
    s = 0.0
    xl = x.tolist()
    al = a.tolist()
    for i in range(len(xl)):
        s = xl[i] + al[i] * (s - xl[i])
        y[i] = s
    return y


# Ruido -------------------------------------------------------------------
def noise_colored(n, slope_db_oct=-3.0, seed=0):
    """Ruido con pendiente espectral (−3 dB/oct = rosa, −6 = marrón)."""
    r = rng(seed)
    N = next_pow2(n)
    X = np.fft.rfft(r.standard_normal(N))
    f = np.fft.rfftfreq(N, 1 / SR)
    g = np.where(f > 0, (np.maximum(f, 20) / 1000) ** (slope_db_oct / 6.0206), 0)
    y = np.fft.irfft(X * g, N)[:n]
    return y / (np.std(y) + 1e-12)


# Convolución y reverb ------------------------------------------------------
def fftconv(x, h):
    x = np.asarray(x, float)
    h = np.asarray(h, float)
    x2 = x[:, None] if x.ndim == 1 else x
    h2 = h[:, None] if h.ndim == 1 else h
    n = x2.shape[0] + h2.shape[0] - 1
    N = next_pow2(n)
    X = np.fft.rfft(x2, N, axis=0)
    Hh = np.fft.rfft(h2, N, axis=0)
    if X.shape[1] == 1 and Hh.shape[1] > 1:
        X = np.repeat(X, Hh.shape[1], axis=1)
    if Hh.shape[1] == 1 and X.shape[1] > 1:
        Hh = np.repeat(Hh, X.shape[1], axis=1)
    y = np.fft.irfft(X * Hh, N, axis=0)[:n]
    return y


def make_ir(rt60=1.8, predelay=0.018, hf_ratio=0.45, lo_cut=200.0, hi_cut=9000.0,
            width=1.0, seed=7, early=True):
    """IR estéreo sintética: ruido con caída dependiente de la frecuencia + reflexiones tempranas."""
    n = int(rt60 * 1.15 * SR)
    r = rng(seed)
    ir = np.zeros((n, 2))
    for c in range(2):
        nz = r.standard_normal(n)

        def mask(t, f, c=c):
            k = np.clip(np.log2(np.maximum(f, 1) / 800) / 3.3, 0, 1)
            rt = rt60 * (1 - (1 - hf_ratio) * k)
            g = 10 ** (-3 * np.maximum(t[:, None], 0) / rt[None, :])
            return g * (hp_mag(f, lo_cut, 2) * lp_mag(f, hi_cut, 2))[None, :]

        ir[:, c] = stft_filter(nz, mask, 1024, 256)
    fade = np.minimum(1, np.arange(n) / (0.012 * SR)) ** 2
    ir *= fade[:, None]
    if early:
        taps = r.uniform(0.004, 0.045, 10)
        for i, tt in enumerate(sorted(taps)):
            k = int(tt * SR)
            g = 0.5 * (1 - tt / 0.05)
            ir[k, i % 2] += g * np.std(ir[:, 0]) * 40
    mid = ir.mean(axis=1, keepdims=True)
    side = ir - mid
    ir = mid + side * width
    ir = np.concatenate([np.zeros((int(predelay * SR), 2)), ir])
    ir /= np.sqrt(np.sum(ir ** 2) / 2) + 1e-12
    return ir


def reverb(x, ir, wet=0.2, dry=1.0):
    x = np.asarray(x, float)
    x2 = np.repeat(x[:, None], 2, axis=1) if x.ndim == 1 else x
    w = fftconv(x2.mean(axis=1) if x2.shape[1] == 2 else x2[:, 0], ir)[: len(x2)]
    return dry * x2 + wet * w


# Envolventes y utilidades ----------------------------------------------------
def adsr(n, a=0.005, d=0.1, s=0.7, r=0.2, sr=SR):
    """Envolvente ADSR de n muestras (la release cae dentro de n)."""
    na, nd, nr = max(1, int(a * sr)), max(1, int(d * sr)), max(1, int(r * sr))
    ns = max(0, n - na - nd - nr)
    e = np.concatenate([
        np.linspace(0, 1, na, endpoint=False) ** 1.5,
        1 - (1 - s) * (1 - np.exp(-5 * np.arange(nd) / nd)) / (1 - np.exp(-5)),
        np.full(ns, s),
    ])
    last = e[-1] if e.size else s
    e = np.concatenate([e, last * np.linspace(1, 0, nr) ** 2])
    return e[:n] if e.size >= n else np.concatenate([e, np.zeros(n - e.size)])


def fade(x, fin=0.003, fout=0.01):
    x = np.array(x, float, copy=True)
    a, b = int(fin * SR), int(fout * SR)
    if a > 0:
        x[:a] *= (np.linspace(0, 1, a) ** 2)[:, None] if x.ndim == 2 else np.linspace(0, 1, a) ** 2
    if b > 0:
        x[-b:] *= (np.linspace(1, 0, b) ** 2)[:, None] if x.ndim == 2 else np.linspace(1, 0, b) ** 2
    return x


def pan_gains(p):
    th = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.cos(th), np.sin(th)


def to_stereo(x, pan=0.0):
    if x.ndim == 2:
        return x
    gl, gr = pan_gains(pan)
    return np.stack([x * gl, x * gr], axis=1)


def place(bus, sig, t0, gain=1.0, pan=0.0):
    """Suma sig (mono o estéreo) en bus[n, 2] desde t0 segundos."""
    s = to_stereo(np.asarray(sig, float), pan) * gain
    i0 = int(round(t0 * SR))
    if i0 < 0:
        s = s[-i0:]
        i0 = 0
    i1 = min(len(bus), i0 + len(s))
    if i1 > i0:
        bus[i0:i1] += s[: i1 - i0]


def mtof(m):
    return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)


NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def n2m(name):
    """'F#4' -> 66"""
    p = NOTE[name[0]]
    i = 1
    while i < len(name) and name[i] in "#b":
        p += 1 if name[i] == "#" else -1
        i += 1
    return p + 12 * (int(name[i:]) + 1)


def soft_clip(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


# Loudness BS.1770-4 ----------------------------------------------------------
_K1 = (np.array([1.53512485958697, -2.69169618940638, 1.19839281085285]),
       np.array([1.0, -1.69065929318241, 0.73248077421585]))
_K2 = (np.array([1.0, -2.0, 1.0]), np.array([1.0, -1.99004745483398, 0.99007225036621]))


def kweight(x):
    assert SR == 48000
    return fft_apply(x, lambda f: biquad_resp(_K1, f) * biquad_resp(_K2, f), pad=SR)


def _block_powers(x, win_s, hop_s):
    y = kweight(x)
    y2 = y[:, None] if y.ndim == 1 else y
    cs = np.concatenate([np.zeros((1, y2.shape[1])), np.cumsum(y2 ** 2, axis=0)])
    w, h = int(win_s * SR), int(hop_s * SR)
    if len(y2) < w:
        return np.array([np.sum(np.mean(y2 ** 2, axis=0))])
    starts = np.arange(0, len(y2) - w + 1, h)
    z = (cs[starts + w] - cs[starts]) / w
    return z.sum(axis=1)


def lufs(x):
    """Loudness integrada (LUFS) con compuertas absoluta y relativa."""
    p = _block_powers(x, 0.4, 0.1)
    lk = -0.691 + 10 * np.log10(np.maximum(p, 1e-20))
    g = p[lk > -70]
    if g.size == 0:
        return -np.inf
    rel = -0.691 + 10 * np.log10(np.mean(g)) - 10
    g2 = p[(lk > -70) & (lk > rel)]
    return float(-0.691 + 10 * np.log10(np.mean(g2)))


def lufs_max(x, win_s=3.0):
    p = _block_powers(x, win_s, 0.1)
    return float(np.max(-0.691 + 10 * np.log10(np.maximum(p, 1e-20))))


def lra(x):
    p = _block_powers(x, 3.0, 0.1)
    lk = -0.691 + 10 * np.log10(np.maximum(p, 1e-20))
    g = p[lk > -70]
    if g.size < 2:
        return 0.0
    rel = -0.691 + 10 * np.log10(np.mean(g)) - 20
    v = lk[(lk > -70) & (lk > rel)]
    return float(np.percentile(v, 95) - np.percentile(v, 10))


def oversample_abs(x, factor=4, chunk=1 << 17, ov=256):
    """|x| sobremuestreado por FFT, reducido a máximo por muestra original. x[n, c]."""
    x2 = x[:, None] if x.ndim == 1 else x
    n = len(x2)
    out = np.zeros(n)
    for s in range(0, n, chunk):
        a, b = max(0, s - ov), min(n, s + chunk + ov)
        seg = x2[a:b]
        m = len(seg)
        X = np.fft.rfft(seg, axis=0)
        Y = np.zeros((m * factor // 2 + 1, seg.shape[1]), complex)
        Y[: X.shape[0]] = X
        y = np.fft.irfft(Y, m * factor, axis=0) * factor
        pk = np.max(np.abs(y), axis=1).reshape(m, factor).max(axis=1)
        lo, hi = s - a, s - a + min(chunk, n - s)
        out[s:s + (hi - lo)] = pk[lo:hi]
    return np.maximum(out, np.max(np.abs(x2), axis=1))


def true_peak_db(x):
    return float(db(np.max(oversample_abs(x))))


def limiter(x, ceiling_db=-1.0, lookahead_ms=2.0, release_ms=120.0):
    """Limitador true-peak con lookahead (offline). x[n, c]."""
    c = float(undb(ceiling_db))
    p = oversample_abs(x)
    greq = np.minimum(1.0, c / np.maximum(p, 1e-9))
    L = max(16, int(lookahead_ms * SR / 1000))
    D = 16
    n = len(greq)
    # mínimo hacia adelante en [n, n+L]
    padded = np.concatenate([greq, np.ones(L)])
    nb = int(np.ceil((n + L) / D))
    pb = np.concatenate([padded, np.ones(nb * D - len(padded))]).reshape(nb, D).min(axis=1)
    kb = int(np.ceil(L / D)) + 1
    fw = np.lib.stride_tricks.sliding_window_view(np.concatenate([pb, np.ones(kb)]), kb).min(axis=1)[:nb]
    # liberación exponencial con ataque instantáneo (a ritmo decimado)
    coef = 1 - np.exp(-D / (release_ms * SR / 1000))
    sm = np.empty(nb)
    g = 1.0
    fl = fw.tolist()
    for i in range(nb):
        t = fl[i]
        g = g + (1 - g) * coef
        if t < g:
            g = t
        sm[i] = g
    gs = np.repeat(sm, D)[:n]
    # media móvil hacia atrás de L+1 muestras: garantiza g <= greq
    cs = np.concatenate([np.zeros(L + 1), np.cumsum(np.concatenate([np.ones(L + 1), gs]))])
    gf = (cs[2 * (L + 1):] - cs[(L + 1):-(L + 1)]) / (L + 1)
    gf = gf[:n]
    y = (x if x.ndim == 2 else x[:, None]) * gf[:, None]
    return y, gf


def env_follow(x, win_s=0.03):
    """Envolvente RMS por media móvil (centrada)."""
    x2 = x if x.ndim == 1 else np.sqrt(np.mean(x ** 2, axis=1))
    w = max(1, int(win_s * SR))
    cs = np.concatenate([[0.0], np.cumsum(x2.astype(float) ** 2)])
    pad = w // 2
    i = np.clip(np.arange(len(x2)) + pad, 0, len(x2))
    j = np.clip(np.arange(len(x2)) - (w - pad), 0, len(x2))
    return np.sqrt(np.maximum(cs[i] - cs[j], 0) / w)


def smooth_ar(env, attack_s, release_s, D=48):
    """Suavizado ataque/liberación de una curva de control (a ritmo decimado D)."""
    n = len(env)
    nb = int(np.ceil(n / D))
    e = np.concatenate([env, np.full(nb * D - n, env[-1])]).reshape(nb, D).max(axis=1)
    ca = 1 - np.exp(-D / (attack_s * SR))
    cr = 1 - np.exp(-D / (release_s * SR))
    out = np.empty(nb)
    s = float(e[0])
    el = e.tolist()
    for i in range(nb):
        t = el[i]
        s += (t - s) * (ca if t > s else cr)
        out[i] = s
    # interpolación lineal de vuelta a ritmo de muestra
    xs = (np.arange(nb) + 0.5) * D
    return np.interp(np.arange(n), xs, out)
