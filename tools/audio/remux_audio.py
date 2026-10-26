#!/usr/bin/env python3
"""Cambia SOLO el audio de un MP4 del pitch, sin tocar ni recodificar la imagen (sin ffmpeg, solo la librería estándar
y `afconvert`, que ya trae macOS).

  python3.11 -I tools/audio/remux_audio.py ENTRADA.mp4 SALIDA.mp4 [--wav pitch_mix.wav] [--kbps 128]
  python3.11 -I tools/audio/remux_audio.py --info ARCHIVO.mp4        # duración, códecs, resolución, peso, índice (moov)

Cómo lo hace: codifica el WAV a AAC-LC 48 kHz estéreo (afconvert) y arma un MP4 nuevo con el índice (moov) al principio:
la pista de video se copia byte a byte (muestras intactas), la pista de audio vieja se descarta y la nueva se entrelaza
por tiempo, para que se pueda reproducir en la web mientras se descarga.
"""
import argparse
import os
import struct
import subprocess
import sys
import tempfile

WAV = os.path.expanduser('~/AmazonaVerse/_trabajo_claude/pitch/audio/pitch_mix.wav')
CONT = {b'moov', b'trak', b'mdia', b'minf', b'stbl', b'edts', b'dinf'}


def atoms(buf, ini=0, fin=None):
    fin = len(buf) if fin is None else fin
    i = ini
    while i + 8 <= fin:
        n, t = struct.unpack('>I4s', buf[i:i + 8])
        h = 8
        if n == 1:
            n = struct.unpack('>Q', buf[i + 8:i + 16])[0]
            h = 16
        elif n == 0:
            n = fin - i
        yield t, i, i + h, i + n
        i += n


def hijos(buf, a):
    return list(atoms(buf, a[2], a[3]))


def hallar(buf, a, *ruta):
    for t in ruta:
        a = next((x for x in hijos(buf, a) if x[0] == t), None)
        if a is None:
            return None
    return a


def pista(buf, trak):
    """Lee las tablas de una pista: tipo, escala, duración, entrada de muestra y trozos (offset, bytes, tiempo)."""
    mdhd = hallar(buf, trak, b'mdia', b'mdhd')
    v = buf[mdhd[2]]
    esc, dur = struct.unpack('>II', buf[mdhd[2] + 12:mdhd[2] + 20]) if v == 0 else (
        struct.unpack('>I', buf[mdhd[2] + 20:mdhd[2] + 24])[0], struct.unpack('>Q', buf[mdhd[2] + 24:mdhd[2] + 32])[0])
    tipo = buf[hallar(buf, trak, b'mdia', b'hdlr')[2] + 8:][:4]
    stbl = hallar(buf, trak, b'mdia', b'minf', b'stbl')
    d = {t: (a, b, c) for t, a, b, c in atoms(buf, stbl[2], stbl[3])}
    stsd = buf[d[b'stsd'][1]:d[b'stsd'][2]]
    # stts
    a, b, c = d[b'stts']
    ne = struct.unpack('>I', buf[b + 4:b + 8])[0]
    stts = [struct.unpack('>II', buf[b + 8 + 8 * k:b + 16 + 8 * k]) for k in range(ne)]
    # stsz
    a, b, c = d[b'stsz']
    fijo, nm = struct.unpack('>II', buf[b + 4:b + 12])
    tam = [fijo] * nm if fijo else list(struct.unpack('>%dI' % nm, buf[b + 12:b + 12 + 4 * nm]))
    # stsc
    a, b, c = d[b'stsc']
    ne = struct.unpack('>I', buf[b + 4:b + 8])[0]
    stsc = [struct.unpack('>III', buf[b + 8 + 12 * k:b + 20 + 12 * k]) for k in range(ne)]
    # stco / co64
    if b'stco' in d:
        a, b, c = d[b'stco']
        n = struct.unpack('>I', buf[b + 4:b + 8])[0]
        offs = list(struct.unpack('>%dI' % n, buf[b + 8:b + 8 + 4 * n]))
    else:
        a, b, c = d[b'co64']
        n = struct.unpack('>I', buf[b + 4:b + 8])[0]
        offs = list(struct.unpack('>%dQ' % n, buf[b + 8:b + 8 + 8 * n]))
    # muestras por trozo y tiempo de inicio de cada trozo
    por = []
    for i in range(n):
        k = max(j for j, e in enumerate(stsc) if e[0] <= i + 1)
        por.append(stsc[k][1])
    durs = []
    for cnt, delta in stts:
        durs += [delta] * cnt
    trozos, m, t = [], 0, 0
    for i in range(n):
        s = sum(tam[m:m + por[i]])
        trozos.append((t, offs[i], s))
        t += sum(durs[m:m + por[i]])
        m += por[i]
    return dict(tipo=tipo, esc=esc, dur=dur, stsd=stsd, tam=tam, por=por, trozos=trozos, trak=trak, muestras=nm, tdur=t)


def reconstruir(buf, a, nuevos):
    """Copia el átomo `a`, cambiando los trozos de stco/co64 por stco con `nuevos` y recorriendo contenedores."""
    t, ini, cuerpo, fin = a
    if t in (b'stco', b'co64') and nuevos is not None:
        cuerpo_n = struct.pack('>II', 0, len(nuevos)) + struct.pack('>%dI' % len(nuevos), *nuevos)
        return struct.pack('>I4s', 8 + len(cuerpo_n), b'stco') + cuerpo_n
    if t in CONT:
        cuerpo_n = b''.join(reconstruir(buf, h, nuevos) for h in hijos(buf, a))
        return struct.pack('>I4s', 8 + len(cuerpo_n), t) + cuerpo_n
    return buf[ini:fin]


def info(ruta):
    buf = open(ruta, 'rb').read()
    top = [t.decode() for t, *_ in atoms(buf)]
    moov = next(x for x in atoms(buf) if x[0] == b'moov')
    mvhd = hallar(buf, moov, b'mvhd')
    esc, dur = struct.unpack('>II', buf[mvhd[2] + 12:mvhd[2] + 20])
    print(f'{os.path.basename(ruta)}: {len(buf) / 1e6:.2f} MB ({len(buf)} B) · átomos {top} · '
          f'índice al principio: {top.index("moov") < top.index("mdat")} · duración {dur / esc:.3f} s')
    for tr in hijos(buf, moov):
        if tr[0] != b'trak':
            continue
        p = pista(buf, tr)
        ent = p['stsd'][8:]
        cod = ent[4:8].decode()
        extra = ''
        if p['tipo'] == b'vide':
            w, h = struct.unpack('>HH', ent[8 + 24:8 + 28])
            extra = f'{w}x{h}'
        elif p['tipo'] == b'soun':
            ch, _, _, _, sr = struct.unpack('>HHHHI', ent[8 + 16:8 + 28])
            extra = f'{ch} canales {sr >> 16} Hz'
        s = sum(t[2] for t in p['trozos'])
        sec = p['tdur'] / p['esc']
        print(f"  {p['tipo'].decode()} {cod} {extra} · {sec:.3f} s · {p['muestras']} muestras · "
              f"{s * 8 / sec / 1000:.0f} kb/s · {len(p['trozos'])} trozos")


def mp4_audio(wav, kbps):
    tmp = tempfile.mkdtemp()
    m4a = os.path.join(tmp, 'a.m4a')
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac@48000', '-b', str(kbps * 1000), '-s', '0', '-q', '127',
                    '-c', '2', wav, m4a], check=True)
    return m4a


def remux(entrada, salida, wav, kbps):
    vb = open(entrada, 'rb').read()
    m4a = mp4_audio(wav, kbps)
    ab = open(m4a, 'rb').read()
    vmoov = next(x for x in atoms(vb) if x[0] == b'moov')
    amoov = next(x for x in atoms(ab) if x[0] == b'moov')
    vtr = [pista(vb, t) for t in hijos(vb, vmoov) if t[0] == b'trak']
    video = next(p for p in vtr if p['tipo'] == b'vide')
    atr = next(pista(ab, t) for t in hijos(ab, amoov) if t[0] == b'trak' and
               pista(ab, t)['tipo'] == b'soun')
    # entrelazado por tiempo (en segundos) de los trozos de las dos pistas
    lista = []
    for nombre, p, b in (('v', video, vb), ('a', atr, ab)):
        for i, (t, off, s) in enumerate(p['trozos']):
            lista.append((t / p['esc'], 0 if nombre == 'v' else 1, nombre, i, b[off:off + s]))
    lista.sort(key=lambda x: (x[0], x[1]))
    ftyp = next((vb[a[1]:a[3]] for a in atoms(vb) if a[0] == b'ftyp'), b'')

    def armar(base):
        """Devuelve (moov, mdat) con los offsets calculados a partir de `base` (inicio del cuerpo del mdat)."""
        pos, nuevos = base, {'v': [None] * len(video['trozos']), 'a': [None] * len(atr['trozos'])}
        for _, _, n, i, dat in lista:
            nuevos[n][i] = pos
            pos += len(dat)
        mv = reconstruir(vb, video['trak'], nuevos['v'])
        # audio: pista nueva con otro ID y la duración en la escala del mvhd de la película
        tk = bytearray(reconstruir(ab, atr['trak'], nuevos['a']))
        i = tk.find(b'tkhd') + 4
        ver = tk[i]
        mvhd = hallar(vb, vmoov, b'mvhd')
        mesc = struct.unpack('>I', vb[mvhd[2] + 12:mvhd[2] + 16])[0]
        dur_a = round(atr['tdur'] / atr['esc'] * mesc)
        if ver == 0:
            struct.pack_into('>I', tk, i + 12, 2)
            struct.pack_into('>I', tk, i + 20, dur_a)
        else:
            struct.pack_into('>I', tk, i + 20, 2)
            struct.pack_into('>Q', tk, i + 28, dur_a)
        # la lista de edición (retardo del codificador) viene en la escala del mvhd del archivo de audio: pasarla a la nuestra
        amvhd = hallar(ab, amoov, b'mvhd')
        aesc = struct.unpack('>I', ab[amvhd[2] + 12:amvhd[2] + 16])[0]
        j = tk.find(b'elst')
        if j > 0:
            j += 4
            vv = tk[j]
            ne = struct.unpack('>I', tk[j + 4:j + 8])[0]
            for k in range(ne):
                if vv == 0:
                    o = j + 8 + 12 * k
                    sd = struct.unpack('>I', tk[o:o + 4])[0]
                    struct.pack_into('>I', tk, o, round(sd * mesc / aesc))
                else:
                    o = j + 8 + 20 * k
                    sd = struct.unpack('>Q', tk[o:o + 8])[0]
                    struct.pack_into('>Q', tk, o, round(sd * mesc / aesc))
        dur_v = struct.unpack('>I', vb[mvhd[2] + 16:mvhd[2] + 20])[0]
        mvh = bytearray(vb[mvhd[1]:mvhd[3]])
        struct.pack_into('>I', mvh, 8 + 16, max(dur_v, dur_a))          # duración de la película
        n_id = len(mvh) - 4
        struct.pack_into('>I', mvh, n_id, 3)                             # próximo ID de pista
        cuerpo = bytes(mvh) + mv + bytes(tk)
        # el resto de átomos del moov de video (udta…) se descarta: no hace falta para reproducir
        return struct.pack('>I4s', 8 + len(cuerpo), b'moov') + cuerpo

    mdat_cuerpo = b''.join(x[4] for x in lista)
    moov = armar(0)
    base = len(ftyp) + len(moov) + 8
    moov = armar(base)
    assert len(moov) == len(armar(0))
    with open(salida, 'wb') as f:
        f.write(ftyp)
        f.write(moov)
        f.write(struct.pack('>I4s', 8 + len(mdat_cuerpo), b'mdat'))
        f.write(mdat_cuerpo)
    os.remove(m4a)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('entrada', nargs='?')
    ap.add_argument('salida', nargs='?')
    ap.add_argument('--wav', default=WAV)
    ap.add_argument('--kbps', type=int, default=128)
    ap.add_argument('--info', action='store_true')
    a = ap.parse_args()
    if a.info:
        info(a.entrada)
        return
    remux(a.entrada, a.salida, a.wav, a.kbps)
    info(a.salida)


if __name__ == '__main__':
    sys.exit(main())
