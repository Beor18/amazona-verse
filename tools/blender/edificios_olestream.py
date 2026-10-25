# Pipeline de edificios de Kelvin (.max -> migrado fiel + kit web). Ver docs/EDIFICIOS.md. Datos de trabajo en $AV_MAX_WORK.
"""Minimal low-memory OLE2 (Compound File) reader for huge .max files.

Only the FAT and the sector chain of the requested stream are kept in memory
(numpy uint32 arrays); stream data is read on demand by offset.
"""
import struct, os
import numpy as np

ENDOFCHAIN = 0xFFFFFFFE
FREESECT = 0xFFFFFFFF


class OleFile:
    def __init__(self, path):
        self.path = path
        self.fp = open(path, 'rb', buffering=0)
        self.filesize = os.path.getsize(path)
        h = self.fp.read(512)
        assert h[:8] == b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1', 'not OLE'
        (self.minor, self.major, self.bo, self.sshift, self.msshift) = struct.unpack_from('<HHHHH', h, 24)
        self.ssize = 1 << self.sshift
        self.mssize = 1 << self.msshift
        (self.ndirsect, self.nfat, self.firstdir, _tsn, self.mscutoff,
         self.firstminifat, self.nminifat, self.firstdifat, self.ndifat) = struct.unpack_from('<IIIIIIIII', h, 40)
        # header occupies first sector-size bytes for v4 (4096)
        self.hdr = h if self.ssize == 512 else h + self.fp.read(self.ssize - 512)
        difat = list(struct.unpack_from('<109I', h, 76))
        sect = self.firstdifat
        per = self.ssize // 4 - 1
        for _ in range(self.ndifat):
            if sect >= ENDOFCHAIN:
                break
            d = struct.unpack('<%dI' % (per + 1), self.getsect(sect))
            difat.extend(d[:per])
            sect = d[per]
        difat = [s for s in difat if s < 0xFFFFFFFA][:self.nfat]
        fat = np.empty(len(difat) * (self.ssize // 4), dtype=np.uint32)
        k = self.ssize // 4
        for i, s in enumerate(difat):
            fat[i * k:(i + 1) * k] = np.frombuffer(self.getsect(s), dtype='<u4')
        self.fat = fat
        # directory
        dchain = self.chain(self.firstdir)
        ddata = b''.join(self.getsect(int(s)) for s in dchain)
        self.entries = []
        for i in range(len(ddata) // 128):
            e = ddata[i * 128:(i + 1) * 128]
            nl = struct.unpack_from('<H', e, 64)[0]
            name = e[:max(0, nl - 2)].decode('utf-16le', 'replace')
            etype = e[66]
            start, slo, shi = struct.unpack_from('<III', e, 116)
            size = slo if self.ssize == 512 else slo | (shi << 32)
            self.entries.append(dict(name=name, type=etype, start=start, size=size))
        self._mini = None

    def getsect(self, s):
        self.fp.seek((s + 1) * self.ssize)
        return self.fp.read(self.ssize)

    def chain(self, start):
        out = []
        s = start
        fat = self.fat
        n = len(fat)
        while s < ENDOFCHAIN and s < n:
            out.append(s)
            s = int(fat[s])
        return np.array(out, dtype=np.uint32)

    def chain_fast(self, start, nsect):
        out = np.empty(nsect, dtype=np.uint32)
        fat = self.fat
        s = start
        i = 0
        while s < ENDOFCHAIN and i < nsect:
            out[i] = s
            i += 1
            s = int(fat[s])
        return out[:i]

    def entry(self, name):
        for e in self.entries:
            if e['name'].lower() == name.lower() and e['type'] in (2, 5):
                return e
        return None

    def read_small_stream(self, name):
        """Whole-stream read (only for small streams)."""
        e = self.entry(name)
        if e is None:
            return None
        if e['size'] < self.mscutoff:
            if self._mini is None:
                root = self.entries[0]
                ch = self.chain(root['start'])
                self._mini = b''.join(self.getsect(int(s)) for s in ch)[:root['size']]
                mch = self.chain(self.firstminifat)
                self._minifat = np.frombuffer(b''.join(self.getsect(int(s)) for s in mch), dtype='<u4')
            out = []
            s = e['start']
            while s < ENDOFCHAIN:
                out.append(self._mini[s * self.mssize:(s + 1) * self.mssize])
                s = int(self._minifat[s])
            return b''.join(out)[:e['size']]
        return StreamReader(self, e).read(0, e['size'])


class StreamReader:
    """Random access into one big FAT stream with run coalescing."""

    def __init__(self, ole, entry):
        self.ole = ole
        self.size = entry['size']
        nsect = (self.size + ole.ssize - 1) // ole.ssize
        self.ch = ole.chain_fast(entry['start'], nsect)
        assert len(self.ch) == nsect, (len(self.ch), nsect)
        self.ss = ole.ssize
        self.fp = ole.fp

    def _runs(self):
        if not hasattr(self, '_rs'):
            d = np.diff(self.ch.astype(np.int64))
            br = np.nonzero(d != 1)[0] + 1
            self._rs = np.concatenate([[0], br]).astype(np.int64)   # run start indices
            self._re = np.concatenate([br, [len(self.ch)]]).astype(np.int64)  # run end (excl)
        return self._rs, self._re

    def read(self, off, n):
        if n <= 0:
            return b''
        ss = self.ss
        end = min(off + n, self.size)
        rs, re_ = self._runs()
        out = []
        pos = off
        ch = self.ch
        while pos < end:
            si = pos // ss
            within = pos - si * ss
            k = int(np.searchsorted(rs, si, side='right')) - 1
            sj_end = int(re_[k])  # exclusive sector idx of this run
            run_bytes = (sj_end - si) * ss - within
            take = min(run_bytes, end - pos)
            self.fp.seek((int(ch[si]) + 1) * ss + within)
            out.append(self.fp.read(take))
            pos += take
        return b''.join(out) if len(out) > 1 else out[0]

    def contiguity(self):
        d = np.diff(self.ch.astype(np.int64))
        return int((d != 1).sum())
