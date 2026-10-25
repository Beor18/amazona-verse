# Pipeline de edificios de Kelvin (.max -> migrado fiel + kit web). Ver docs/EDIFICIOS.md. Datos de trabajo en $AV_MAX_WORK.
"""Scene-level helpers on top of SceneIndex: nodes, transforms, meshes, materials.

Pure python + numpy (no bpy) so it can run in Blender's interpreter or standalone.
"""
import struct, math
import numpy as np
from edificios_maxindex import SceneIndex, parse_chunks, Chunk, check_mem

NONE = 0xFFFFFFFF
EDIT_POLY = 0x192F60981BF8338D
POLY_MESH = 0x5D21369A
EDIT_MESH = 0xE44F10B3


def s16(d):
    return bytes(d).decode('utf-16le', 'ignore')


def quat_to_mat(x, y, z, w):
    # standard quaternion (w,x,y,z) -> 3x3 for column vectors
    n = x * x + y * y + z * z + w * w
    if n < 1e-12:
        return np.eye(3)
    s = 2.0 / n
    return np.array([
        [1 - s * (y * y + z * z), s * (x * y - z * w), s * (x * z + y * w)],
        [s * (x * y + z * w), 1 - s * (x * x + z * z), s * (y * z - x * w)],
        [s * (x * z - y * w), s * (y * z + x * w), 1 - s * (x * x + y * y)]])


def euler_xyz(rx, ry, rz):
    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def trs(pos, rot3, scl):
    m = np.eye(4)
    m[:3, :3] = rot3 @ np.diag(scl)
    m[:3, 3] = pos
    return m


class Scene:
    def __init__(self, path, index_npz=None):
        self.si = SceneIndex(path)
        if index_npz:
            self.si.load(index_npz)
        else:
            self.si.build()
        self._cache = {}
        self.warn = []

    # ------------------------------------------------------------ basics
    def guid(self, i):
        if i is None or i < 0 or i >= len(self.si):
            return None
        return self.si.cls(i)[1]

    def clsname(self, i):
        if i is None or i < 0 or i >= len(self.si):
            return None
        t = int(self.si.typ[i])
        if t == 0x2032:
            return 'DerivedObject'
        if t == 0x2033:
            return 'DerivedObjectWS'
        return self.si.cls(i)[0]

    def small(self, i, maxsize=8 << 20):
        """Parsed tree for a small top-level object (cached)."""
        if i in self._cache:
            return self._cache[i]
        if int(self.si.size[i]) > maxsize:
            return None
        t = self.si.tree(i)
        if len(self._cache) > 20000:
            self._cache.clear()
        self._cache[i] = t
        return t

    def refs(self, i):
        """Reference list (index -> scene idx) of top-level object i, as dict."""
        c = self.small(i)
        if c is None:
            c = self.head_tree(i)
        out = {}
        if c is None or not c.ch:
            return out
        r = c.first(0x2034)
        if r is not None:
            vals = struct.unpack('<%dI' % (len(r.d) // 4), r.d)
            for k, v in enumerate(vals):
                if v != NONE:
                    out[k] = v
            return out
        r = c.first(0x2035)
        if r is not None:
            vals = struct.unpack('<%dI' % (len(r.d) // 4), r.d)
            for k in range(1, len(vals) - 1, 2):
                if vals[k + 1] != NONE:
                    out[vals[k]] = vals[k + 1]
        return out

    def head_tree(self, i):
        """For big objects: parse full tree (no cache)."""
        return self.si.tree(i)

    # ------------------------------------------------------------ controllers
    def bezier_float(self, i, default=0.0):
        if i is None:
            return default
        g = self.guid(i)
        c = self.small(i)
        if c is None:
            return default
        if g == 0x2007:
            v = c.first(0x7127)
            if v is not None and v.ch:
                f = v.first(0x2501)
                if f is not None and len(f.d) >= 4:
                    return struct.unpack_from('<f', f.d, 0)[0]
            # keyframed: take first key value? search 0x2501 anywhere
            f = c.first(0x2501)
            if f is not None and len(f.d) >= 4:
                return struct.unpack_from('<f', f.d, 0)[0]
            self.warn.append('bezier float without 0x7127/0x2501 at %d' % i)
            return default
        if g == 0x71F11549498702E7:  # float wire
            r = self.refs(i)
            return self.bezier_float(r.get(0), default)
        self.warn.append('float ctrl %s at %d' % (self.clsname(i), i))
        return default

    def floats(self, c, t):
        f = c.first(t)
        if f is None:
            return None
        return struct.unpack('<%df' % (len(f.d) // 4), f.d)

    def position(self, i):
        g = self.guid(i)
        if g == 0xFFEE238A118F7E02:  # Position XYZ
            r = self.refs(i)
            return np.array([self.bezier_float(r.get(k)) for k in range(3)])
        c = self.small(i)
        if g in (0x2008, 0x442312):
            v = self.floats(c, 0x2503)
            if v:
                return np.array(v[:3])
        if g == 0x4B4B1002:  # list
            r = self.refs(i)
            return self.position(r.get(0)) if 0 in r else np.zeros(3)
        if i is not None:
            self.warn.append('pos ctrl %s' % self.clsname(i))
        return np.zeros(3)

    def rotation(self, i):
        g = self.guid(i)
        if g == 0x2012:  # Euler XYZ
            r = self.refs(i)
            # Max Euler XYZ sub-controllers are stored left-handed (same as Max quats):
            # value -90 on X turns Y-up kit data upright, so negate (verified on KB3D huts/bridge).
            return euler_xyz(*[-self.bezier_float(r.get(k)) for k in range(3)])
        c = self.small(i)
        if g == 0x442313 or g == 0x2009:  # TCB / Bezier rotation (quat xyzw)
            v = self.floats(c, 0x2504)
            if v:
                x, y, z, w = v[:4]
                return quat_to_mat(-x, -y, -z, w)
        if g == 0x3A90416731381913:
            return self.rotation(self.refs(i).get(0))
        if g == 0x4B4B1003:
            r = self.refs(i)
            return self.rotation(r.get(0)) if 0 in r else np.eye(3)
        if i is not None:
            self.warn.append('rot ctrl %s' % self.clsname(i))
        return np.eye(3)

    def scale(self, i):
        g = self.guid(i)
        if g == 0xFEEE238B118F7C01:
            r = self.refs(i)
            return np.array([self.bezier_float(r.get(k), 1.0) for k in range(3)])
        c = self.small(i)
        if g in (0x2010, 0x442315):
            v = self.floats(c, 0x2501) or self.floats(c, 0x2505)
            if v:
                # scale (sx,sy,sz) + axis quaternion (ignored if identity)
                s = np.array(v[:3])
                if len(v) >= 7 and abs(abs(v[6]) - 1.0) > 1e-4 and (s.max() - s.min()) > 1e-4:
                    self.warn.append('non-uniform scale with axis rotation at %d' % i)
                return s
        if i is not None:
            self.warn.append('scl ctrl %s' % self.clsname(i))
        return np.ones(3)

    def prs_matrix(self, i):
        if i is None:
            return np.eye(4)
        g = self.guid(i)
        if g == 0x2005:
            r = self.refs(i)
            return trs(self.position(r.get(0)), self.rotation(r.get(1)), self.scale(r.get(2)))
        self.warn.append('tm ctrl %s at %d' % (self.clsname(i), i))
        return np.eye(4)

    # ------------------------------------------------------------ nodes
    def nodes(self):
        out = []
        for i in range(len(self.si)):
            g = self.si.cls(i)
            if g[1] == 0x1 and g[2] == 0x1:
                out.append(i)
        return out

    def node_info(self, i):
        c = self.small(i)
        name = ''
        parent = None
        n = c.first(0x0962)
        if n is not None:
            name = s16(n.d)
        p = c.first(0x0960)
        if p is not None and len(p.d) >= 4:
            v = struct.unpack_from('<I', p.d, 0)[0]
            parent = None if v == NONE else v
        r = self.refs(i)
        off = np.eye(4)
        pos = self.floats(c, 0x096A)
        rot = self.floats(c, 0x096B)
        scl = self.floats(c, 0x096C)
        if pos or rot or scl:
            P = np.array(pos[:3]) if pos else np.zeros(3)
            if rot:
                x, y, z, w = rot[:4]
                R = quat_to_mat(-x, -y, -z, w)  # Max quats are left-handed (conjugate)
            else:
                R = np.eye(3)
            S = np.array(scl[:3]) if scl else np.ones(3)
            off = trs(P, R, S)
        flags = None
        return dict(idx=i, name=name, parent=parent, prs=r.get(0), obj=r.get(1),
                    mtl=r.get(3), layer=r.get(6), offset=off, refs=r, rawrot=rot, rawscl=scl)

    def resolve_object(self, obj):
        """Follow derived objects to the base object. Returns (base_idx, [modifier names])."""
        mods = []
        seen = 0
        while obj is not None and seen < 32:
            seen += 1
            t = int(self.si.typ[obj])
            if t in (0x2032, 0x2033):
                r = self.refs(obj)
                if not r:
                    return None, mods
                ks = sorted(r)
                for k in ks[:-1]:
                    mods.append(self.clsname(r[k]))
                obj = r[ks[-1]]
                continue
            return obj, mods
        return obj, mods

    def layer_name(self, i):
        if i is None:
            return ''
        c = self.small(i)
        if c is None:
            return ''
        for t in (0x1010, 0x1230, 0x0962, 0x4001):
            n = c.first(t)
            if n is not None and n.d is not None:
                return s16(n.d)
        return ''

    # ------------------------------------------------------------ meshes
    def poly_mesh(self, i, want_uv=True):
        """Decode an Editable Poly object into numpy arrays.
        Returns dict(verts (N,3) f4, face_sizes (F,), face_idx (sum,), mat (F,),
                     uvs list of (coords (M,3), face_uv_idx (sum,)))."""
        c = self.head_tree(i)
        pc = c.first(0x08FE)
        if pc is None:
            return None
        out = dict(verts=None, fs=None, fi=None, mat=None, uv=[], smooth=None)
        maps = []
        cords = []
        uvids = []
        for k in pc.ch or []:
            t = k.t
            if t == 0x0100:
                n = struct.unpack_from('<I', k.d, 0)[0]
                a = np.frombuffer(k.d, dtype=np.dtype([('f', '<u4'), ('p', '<f4', (3,))]), count=n, offset=4)
                out['verts'] = np.array(a['p'], dtype=np.float32)
            elif t == 0x011A:
                out['fs'], out['fi'], out['mat'], out['smooth'] = decode_polys(k.d)
            elif t == 0x0124:
                maps.append(struct.unpack_from('<i', k.d, 0)[0])
            elif t == 0x0128:
                n = struct.unpack_from('<I', k.d, 0)[0]
                cords.append(np.frombuffer(k.d, dtype='<f4', count=n * 3, offset=4).reshape(-1, 3).copy())
            elif t == 0x012B:
                uvids.append(np.frombuffer(k.d, dtype='<u4').copy())  # [cnt, i0..] per face
        if out['verts'] is None or out['fs'] is None:
            return None
        if want_uv:
            for m, crd, ids in zip(maps, cords, uvids):
                fi = decode_poly_data(ids, out['fs'])
                if fi is not None:
                    out['uv'].append((m, crd, fi))
        return out

    def edit_mesh(self, i):
        c = self.head_tree(i)
        mc = c.first(0x08FE)
        if mc is None:
            return None
        g = self.guid(i)
        cnt = 0x0916 if g == 0x19 else 0x2394
        uvm = 0x0918 if g == 0x19 else 0x2396
        v = mc.first(0x0914)
        f = mc.first(0x0912)
        if v is None or f is None:
            return None
        n = struct.unpack_from('<I', v.d, 0)[0]
        verts = np.frombuffer(v.d, dtype='<f4', count=n * 3, offset=4).reshape(-1, 3).copy()
        nf = struct.unpack_from('<I', f.d, 0)[0]
        fa = np.frombuffer(f.d, dtype=np.dtype([('v', '<u4', (3,)), ('e', '<u4'), ('s', '<u4'), ('fl', '<u2'), ('m', '<u2')]), count=nf, offset=4) \
            if (len(f.d) - 4) == nf * 24 else \
            np.frombuffer(f.d, dtype=np.dtype([('v', '<u4', (3,)), ('e', '<u4'), ('fl', '<u2'), ('m', '<u2')]), count=nf, offset=4)
        out = dict(verts=verts, fs=np.full(nf, 3, np.int32), fi=fa['v'].reshape(-1).astype(np.int64),
                   mat=fa['m'].astype(np.int32), uv=[], smooth=None)
        maps = []
        cords = []
        uvids = []
        for k in mc.ch:
            if k.t in (0x0924, 0x0959):
                maps.append(struct.unpack_from('<i', k.d, 0)[0])
            elif k.t == cnt:
                m = struct.unpack_from('<I', k.d, 0)[0]
                cords.append(np.frombuffer(k.d, dtype='<f4', count=m * 3, offset=4).reshape(-1, 3).copy())
            elif k.t == uvm:
                m = struct.unpack_from('<I', k.d, 0)[0]
                uvids.append(np.frombuffer(k.d, dtype='<u4', count=m * 3, offset=4).astype(np.int64))
        for m, crd, ids in zip(maps or [1] * len(cords), cords, uvids):
            if len(ids) == len(out['fi']):
                out['uv'].append((m, crd, ids))
        return out

    def mesh(self, i):
        g = self.guid(i)
        if g in (EDIT_POLY, POLY_MESH):
            return self.poly_mesh(i)
        if g in (EDIT_MESH, 0x19):
            return self.edit_mesh(i)
        return None


def decode_polys(d):
    """0x011A chunk: count, then per face: n, n*u32 verts, u16 flags, [opt fields]."""
    b = memoryview(d)
    cnt = struct.unpack_from('<I', b, 0)[0]
    off = 4
    fs = np.empty(cnt, np.int32)
    mat = np.zeros(cnt, np.int32)
    sm = np.zeros(cnt, np.uint32)
    idx = []
    unpack = struct.unpack_from
    k = 0
    L = len(b)
    while off < L and k < cnt:
        n = unpack('<I', b, off)[0]
        off += 4
        idx.append(np.frombuffer(b, dtype='<u4', count=n, offset=off))
        off += 4 * n
        fl = unpack('<H', b, off)[0]
        off += 2
        if fl & 0x01:
            off += 4
        if fl & 0x08:
            mat[k] = unpack('<H', b, off)[0]
            off += 2
        if fl & 0x10:
            sm[k] = unpack('<I', b, off)[0]
            off += 4
        if fl & 0x20:
            off += 4 * 2 * (n - 3)
        if n > 0:
            fs[k] = n
            k += 1
    fs = fs[:k]
    return fs, (np.concatenate(idx).astype(np.int64) if idx else np.zeros(0, np.int64)), mat[:k], sm[:k]


def decode_poly_data(ids, fs):
    """0x012B: per face [n, n indices]. Returns flat indices if consistent with fs."""
    nf = len(fs)
    total = int(fs.sum())
    if len(ids) != nf + total:
        return None
    # positions of counts: cumulative
    starts = np.empty(nf, np.int64)
    starts[0] = 0
    if nf > 1:
        starts[1:] = np.cumsum(fs[:-1] + 1)
    if not np.array_equal(ids[starts].astype(np.int64), fs.astype(np.int64)):
        return None
    mask = np.ones(len(ids), bool)
    mask[starts] = False
    return ids[mask].astype(np.int64)
