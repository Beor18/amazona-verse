# Pipeline de edificios de Kelvin (.max -> migrado fiel + kit web). Ver docs/EDIFICIOS.md. Datos de trabajo en $AV_MAX_WORK.
"""Streaming index + light-weight chunk tree for huge .max Scene streams.

Pass 1 (index_scene): walks only the headers of the top-level children of the
Scene stream (each child is one scene object: node, mesh, material, controller...)
and records offset/size/class index into numpy arrays.  Nothing else is kept.
"""
import struct, sys, time, resource
import numpy as np
from edificios_olestream import OleFile, StreamReader

U31 = 0x7FFFFFFF
U63 = 0x7FFFFFFFFFFFFFFF


def rss_peak_gb():
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1e9  # macOS: bytes


class MemGuard(Exception):
    pass


def check_mem(limit_gb=9.0):
    p = rss_peak_gb()
    if p > limit_gb:
        raise MemGuard('peak RSS %.2f GB > %.1f GB' % (p, limit_gb))
    return p


class Chunk:
    __slots__ = ('t', 'c', 'd', 'ch')

    def __init__(self, t, c, d):
        self.t = t
        self.c = c
        self.d = d
        self.ch = None

    def first(self, t):
        if self.ch:
            for k in self.ch:
                if k.t == t:
                    return k
        return None

    def all(self, t):
        return [k for k in (self.ch or []) if k.t == t]


def parse_chunks(buf, off=0, end=None, depth=0, maxdepth=64):
    """Parse a chunk list from a bytes/memoryview without copying data."""
    if end is None:
        end = len(buf)
    mv = buf if isinstance(buf, memoryview) else memoryview(buf)
    out = []
    while off + 6 <= end:
        typ, siz = struct.unpack_from('<Hi', mv, off)
        hdr = 6
        if siz == 0:
            siz, = struct.unpack_from('<q', mv, off + 6)
            hdr = 14
            cont = siz < 0
            size = siz & U63
        else:
            cont = siz < 0
            size = siz & U31
        if size < hdr or off + size > end:
            # malformed: treat remainder as raw
            out.append(Chunk(typ, False, mv[off:end]))
            break
        c = Chunk(typ, cont, mv[off + hdr:off + size])
        if cont and depth < maxdepth:
            c.ch = parse_chunks(mv, off + hdr, off + size, depth + 1, maxdepth)
            c.d = None
        out.append(c)
        off += size
    return out


def read_header(sr, off):
    b = sr.read(off, 14)
    typ, siz = struct.unpack_from('<Hi', b, 0)
    if siz == 0:
        siz, = struct.unpack_from('<q', b, 6)
        return typ, siz < 0, siz & U63, 14
    return typ, siz < 0, siz & U31, 6


class SceneIndex:
    def __init__(self, path):
        self.ole = OleFile(path)
        self.sr = StreamReader(self.ole, self.ole.entry('Scene'))
        self.classes = self._read_classes()
        self.dlls = self._read_dlls()

    def _read_classes(self):
        data = self.ole.read_small_stream('ClassDirectory3') or self.ole.read_small_stream('ClassDirectory')
        out = []
        for c in parse_chunks(data):
            name = ''
            dll = cid = sup = None
            for k in (c.ch or []):
                if k.t == 0x2042:
                    name = bytes(k.d).decode('utf-16le', 'ignore')
                elif k.t == 0x2060:
                    dll, cid, sup = struct.unpack_from('<iQI', k.d, 0)
            out.append((name, cid, sup, dll))
        return out

    def _read_dlls(self):
        data = self.ole.read_small_stream('DllDirectory')
        out = []
        for c in parse_chunks(data):
            if c.ch:
                d = {}
                for k in c.ch:
                    if k.t in (0x2037, 0x2039):
                        d[k.t] = bytes(k.d).decode('utf-16le', 'ignore')
                out.append(d)
        return out

    def build(self):
        sr = self.sr
        typ, cont, size, hdr = read_header(sr, 0)
        assert cont, 'Scene root not container'
        end = size
        off = hdr
        offs, sizes, types, hdrs = [], [], [], []
        while off < end:
            t, c, s, h = read_header(sr, off)
            offs.append(off); sizes.append(s); types.append(t); hdrs.append(h)
            if s <= 0:
                break
            off += s
        self.off = np.array(offs, dtype=np.int64)
        self.size = np.array(sizes, dtype=np.int64)
        self.typ = np.array(types, dtype=np.int32)
        self.hdr = np.array(hdrs, dtype=np.int8)
        return len(offs)

    def save(self, p):
        np.savez(p, off=self.off, size=self.size, typ=self.typ, hdr=self.hdr)

    def load(self, p):
        z = np.load(p)
        self.off, self.size, self.typ, self.hdr = z['off'], z['size'], z['typ'], z['hdr']

    def __len__(self):
        return len(self.off)

    def raw(self, i):
        """Raw bytes of top-level child i INCLUDING its header."""
        return self.sr.read(int(self.off[i]), int(self.size[i]))

    def tree(self, i):
        b = self.raw(i)
        return parse_chunks(b)[0]

    def cls(self, i):
        t = int(self.typ[i])
        if t < len(self.classes):
            return self.classes[t]
        return ('?%04X' % t, t, 0, -1)
