"""Amazona Verse · kit de entorno (flora de El Yunque) · librería común.

Uso (sin ventana):
  Blender -b --factory-startup --python tools/blender/entorno_texturas.py   # 1) texturas
  Blender -b --factory-startup --python tools/blender/entorno_modelos.py    # 2) modelos .glb + _glb.js
  Blender -b --factory-startup --python tools/blender/entorno_lamina.py     # 3) lámina de contacto

Convenciones: Z arriba en Blender (Y arriba en el glTF), metros, pivote en la base (0,0,0).
Color de vértice 'Col' → COLOR_0 del glTF: R = AO, G = peso de viento (0 en la base, 1 en las puntas),
B = fase de viento por rama u hoja (0..1), A = 1.  No es color: el juego debe apagar `vertexColors`.
"""
import bpy, math, os, random, struct, zlib, base64, json, sys
import numpy as np
from mathutils import Vector

sys.dont_write_bytecode = True
ROOT = os.path.expanduser('~/AmazonaVerse/Juego')
MODELS = os.path.join(ROOT, 'assets/models/entorno')
TEX = os.path.join(ROOT, 'assets/tex/entorno')
TMP = os.environ.get('AV_TMP', os.path.expanduser('~/AmazonaVerse/_trabajo_claude/entorno'))  # intermedios
for _d in (MODELS, TEX, TMP):
    os.makedirs(_d, exist_ok=True)
TAU = math.tau


# ───────────────────────── color ─────────────────────────
def s2l(x):
    return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4


def hexl(h, k=1.0):
    """'#rrggbb' sRGB → tupla lineal (r,g,b) multiplicada por k."""
    h = h.lstrip('#')
    return tuple(s2l(int(h[i:i + 2], 16) / 255) * k for i in (0, 2, 4))


def lerp3(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def jitter(c, rng, amt=0.12, hue=0.0):
    """Variación de valor (y leve de tono) para un color lineal."""
    k = 1 + rng.uniform(-amt, amt)
    r, g, b = c
    if hue:
        h = rng.uniform(-hue, hue)
        r, b = r * (1 + h), b * (1 - h)
    return (r * k, g * k, b * k)


def smooth(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def lin2srgb_np(a):
    a = np.clip(a, 0, 1)
    return np.where(a <= 0.0031308, a * 12.92, 1.055 * np.power(a, 1 / 2.4) - 0.055)


# ───────────────────────── escena ─────────────────────────
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def cycles(scene, samples=16, gpu=False):
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    scene.cycles.device = 'CPU'
    if gpu:
        try:
            p = bpy.context.preferences.addons['cycles'].preferences
            p.compute_device_type = 'METAL'
            p.get_devices()
            for d in p.devices:
                d.use = True
            scene.cycles.device = 'GPU'
        except Exception as e:  # noqa
            print('GPU no disponible:', e)


# ───────────────────────── nodos (mini DSL) ─────────────────────────
class NT:
    """Atajos para armar árboles de nodos de shader."""

    def __init__(self, mat, clear=True):
        mat.use_nodes = True
        self.nt = mat.node_tree
        if clear:
            self.nt.nodes.clear()
        self.N, self.L = self.nt.nodes, self.nt.links

    def new(self, typ, **kw):
        n = self.N.new(typ)
        for k, v in kw.items():
            setattr(n, k, v)
        return n

    def put(self, sock, v):
        if isinstance(v, bpy.types.NodeSocket):
            self.L.new(v, sock)
        elif v is not None:
            if isinstance(v, tuple) and len(v) == 3 and sock.type == 'RGBA':
                v = (*v, 1.0)
            sock.default_value = v

    def math(self, op, a, b=None, c=None, clamp=False):
        n = self.new('ShaderNodeMath', operation=op, use_clamp=clamp)
        self.put(n.inputs[0], a)
        if b is not None:
            self.put(n.inputs[1], b)
        if c is not None:
            self.put(n.inputs[2], c)
        return n.outputs[0]

    def add(self, a, b): return self.math('ADD', a, b)
    def mul(self, a, b): return self.math('MULTIPLY', a, b)
    def sub(self, a, b): return self.math('SUBTRACT', a, b)

    def vmath(self, op, a, b=None, scale=None):
        n = self.new('ShaderNodeVectorMath', operation=op)
        self.put(n.inputs[0], a)
        if b is not None:
            self.put(n.inputs[1], b)
        if scale is not None:
            self.put(n.inputs[3], scale)
        return n.outputs['Value'] if op in ('DOT_PRODUCT', 'LENGTH', 'DISTANCE') else n.outputs['Vector']

    def vmul(self, a, b): return self.vmath('MULTIPLY', a, b)
    def vadd(self, a, b): return self.vmath('ADD', a, b)
    def vscale(self, a, s): return self.vmath('SCALE', a, scale=s)

    def mix(self, a, b, f):
        """lerp de vectores/colores."""
        n = self.new('ShaderNodeMix', data_type='VECTOR', factor_mode='UNIFORM')
        self.put(n.inputs[0], f)
        self.put(n.inputs[4], a)
        self.put(n.inputs[5], b)
        return n.outputs[1]

    def ramp(self, v, a, b, interp='SMOOTHSTEP', lo=0.0, hi=1.0):
        """map range con smoothstep: (v-a)/(b-a) → [lo,hi]."""
        n = self.new('ShaderNodeMapRange', interpolation_type=interp, clamp=True)
        self.put(n.inputs['Value'], v)
        n.inputs['From Min'].default_value = a
        n.inputs['From Max'].default_value = b
        n.inputs['To Min'].default_value = lo
        n.inputs['To Max'].default_value = hi
        return n.outputs['Result']

    def sep(self, v):
        n = self.new('ShaderNodeSeparateXYZ')
        self.put(n.inputs[0], v)
        return n.outputs[0], n.outputs[1], n.outputs[2]

    def comb(self, x, y, z):
        n = self.new('ShaderNodeCombineXYZ')
        self.put(n.inputs[0], x)
        self.put(n.inputs[1], y)
        self.put(n.inputs[2], z)
        return n.outputs[0]

    def col(self, c):
        return self.comb(*c)

    def attr(self, name, out='Color'):
        return self.new('ShaderNodeAttribute', attribute_name=name).outputs[out]

    def coord(self, out='Object'):
        return self.new('ShaderNodeTexCoord').outputs[out]

    def geo(self, out='Position'):
        return self.new('ShaderNodeNewGeometry').outputs[out]

    def noise(self, vec, w=None, scale=5.0, detail=4.0, rough=0.5, dist=0.0, dims=None, lac=2.0):
        dims = dims or ('4D' if w is not None else '3D')
        n = self.new('ShaderNodeTexNoise', noise_dimensions=dims)
        self.put(n.inputs['Vector'], vec)
        if w is not None:
            self.put(n.inputs['W'], w)
        self.put(n.inputs['Scale'], scale)
        n.inputs['Detail'].default_value = detail
        n.inputs['Roughness'].default_value = rough
        n.inputs['Lacunarity'].default_value = lac
        n.inputs['Distortion'].default_value = dist
        return n.outputs['Fac']

    def voronoi(self, vec, w=None, scale=5.0, feature='F1', rnd=1.0, out='Distance', dims=None, smooth=0.0):
        dims = dims or ('4D' if w is not None else '3D')
        n = self.new('ShaderNodeTexVoronoi', voronoi_dimensions=dims, feature=feature)
        self.put(n.inputs['Vector'], vec)
        if w is not None:
            self.put(n.inputs['W'], w)
        self.put(n.inputs['Scale'], scale)
        n.inputs['Randomness'].default_value = rnd
        if feature == 'SMOOTH_F1':
            n.inputs['Smoothness'].default_value = smooth
        return n.outputs[out]

    def torus(self, uv, ru=1.0, rv=1.0, off=(0, 0, 0, 0)):
        """(u,v) periódicos en [0,1) → coordenadas 4D en un toro: ruido 4D que repite (tileable)."""
        u, v, _ = self.sep(uv)
        a = self.mul(u, TAU)
        b = self.mul(v, TAU)
        x = self.add(self.mul(self.math('COSINE', a), ru), off[0])
        y = self.add(self.mul(self.math('SINE', a), ru), off[1])
        z = self.add(self.mul(self.math('COSINE', b), rv), off[2])
        w = self.add(self.mul(self.math('SINE', b), rv), off[3])
        return self.comb(x, y, z), w

    def emission_out(self, color, strength=1.0):
        e = self.new('ShaderNodeEmission')
        self.put(e.inputs['Color'], color)
        e.inputs['Strength'].default_value = strength
        o = self.new('ShaderNodeOutputMaterial')
        self.L.new(e.outputs[0], o.inputs['Surface'])
        return o


# ───────────────────────── imágenes ─────────────────────────
def load_px(path, linear=False):
    """Lee una imagen a numpy (alto, ancho, 4) con la fila 0 abajo (orden de Blender)."""
    img = bpy.data.images.load(path, check_existing=False)
    if linear:
        img.colorspace_settings.name = 'Non-Color'
    w, h = img.size
    a = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return a.reshape(h, w, 4)


def np_image(arr, name='tmp', noncolor=False):
    h, w = arr.shape[:2]
    if arr.shape[2] == 3:
        arr = np.dstack([arr, np.ones((h, w), np.float32)])
    img = bpy.data.images.new(name, w, h, alpha=True)
    if noncolor:
        img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(np.ascontiguousarray(arr, np.float32).ravel())
    return img


def save_jpg(arr, path, quality=85, noncolor=False):
    """arr: valores ya codificados (sRGB para color) en [0,1]."""
    img = np_image(np.clip(arr, 0, 1), 'tmp_jpg', noncolor)
    img.file_format = 'JPEG'
    img.filepath_raw = path
    img.save(filepath=path, quality=quality)
    bpy.data.images.remove(img)
    return os.path.getsize(path)


def save_png_rgba(arr, path):
    img = np_image(np.clip(arr, 0, 1), 'tmp_png')
    img.file_format = 'PNG'
    img.filepath_raw = path
    s = bpy.context.scene
    s.render.image_settings.compression = 100
    img.save(filepath=path)
    bpy.data.images.remove(img)
    return os.path.getsize(path)


def _png_chunk(t, d):
    return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)


def save_png_indexed(arr, path, colors=256, seed=1):
    """PNG con paleta (8 bits + tRNS): ~3-4 veces más liviano que RGBA para las tarjetas de hojas.
    Cuantiza en RGBA con k-means (el alfa pesa doble para no ensuciar el corte del alphaTest)."""
    h, w = arr.shape[:2]
    px = (np.clip(arr, 0, 1) * 255 + 0.5).astype(np.float32).reshape(-1, 4)
    wt = np.array([1, 1, 1, 2], np.float32)
    X = px * wt
    rng = np.random.default_rng(seed)
    S = X[rng.choice(len(X), min(len(X), 80000), replace=False)]
    C = S[rng.choice(len(S), colors, replace=False)].copy()

    def assign(P):
        out = np.empty(len(P), np.int32)
        cc = (C * C).sum(1)
        for i in range(0, len(P), 65536):
            Q = P[i:i + 65536]
            out[i:i + 65536] = np.argmin(cc[None, :] - 2 * Q @ C.T, 1)
        return out

    for _ in range(12):
        lab = assign(S)
        cnt = np.bincount(lab, minlength=colors)
        sums = np.zeros_like(C)
        np.add.at(sums, lab, S)
        empty = cnt == 0
        C[~empty] = sums[~empty] / cnt[~empty, None]
        if empty.any():
            C[empty] = S[rng.choice(len(S), int(empty.sum()), replace=False)]
    lab = assign(X).reshape(h, w)[::-1]          # PNG va de arriba a abajo
    pal = np.clip(C / wt + 0.5, 0, 255).astype(np.uint8)
    raw = b''.join(b'\x00' + row.astype(np.uint8).tobytes() for row in lab)
    png = (b'\x89PNG\r\n\x1a\n' + _png_chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 3, 0, 0, 0))
           + _png_chunk(b'PLTE', pal[:, :3].tobytes()) + _png_chunk(b'tRNS', pal[:, 3].tobytes())
           + _png_chunk(b'IDAT', zlib.compress(raw, 9)) + _png_chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)
    return len(png)


def save_png_rgb(arr, path):
    """PNG RGB 8 bits con filtro adaptativo por fila (más liviano que el de Blender para láminas grandes)."""
    h, w = arr.shape[:2]
    x = (np.clip(arr[..., :3], 0, 1) * 255 + 0.5).astype(np.uint8)[::-1].reshape(h, w * 3).astype(np.int16)
    left = np.zeros_like(x)
    left[:, 3:] = x[:, :-3]
    up = np.zeros_like(x)
    up[1:] = x[:-1]
    ul = np.zeros_like(x)
    ul[1:, 3:] = x[:-1, :-3]
    p = left + up - ul
    pa, pb, pc = np.abs(p - left), np.abs(p - up), np.abs(p - ul)
    paeth = np.where((pa <= pb) & (pa <= pc), left, np.where(pb <= pc, up, ul))
    cands = [x, x - left, x - up, x - (left + up) // 2, x - paeth]
    cands = [(c % 256).astype(np.uint8) for c in cands]
    score = np.stack([np.abs(c.astype(np.int8).astype(np.int32)).sum(1) for c in cands])
    best = score.argmin(0)
    raw = b''.join(bytes([best[r]]) + cands[best[r]][r].tobytes() for r in range(h))
    png = (b'\x89PNG\r\n\x1a\n' + _png_chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
           + _png_chunk(b'IDAT', zlib.compress(raw, 9)) + _png_chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)
    return len(png)


def pad_rgba(a, thr=0.02):
    """Rellena el color de los píxeles transparentes con el de sus vecinos (evita halos oscuros en mipmaps)."""
    rgb, al = a[..., :3], a[..., 3]
    w = (al > thr).astype(np.float32)

    def pull(c, w):
        h, ww = w.shape
        if h < 2 or ww < 2 or h % 2 or ww % 2:
            m = (c * w[..., None]).sum((0, 1)) / max(w.sum(), 1e-6)
            return np.where(w[..., None] > 0, c, m)
        cs = (c * w[..., None]).reshape(h // 2, 2, ww // 2, 2, 3).sum((1, 3))
        ws = w.reshape(h // 2, 2, ww // 2, 2).sum((1, 3))
        c2 = np.where(ws[..., None] > 0, cs / np.maximum(ws, 1e-6)[..., None], 0)
        c2 = pull(c2, (ws > 0).astype(np.float32))
        up = c2.repeat(2, 0).repeat(2, 1)
        return np.where(w[..., None] > 0, c, up)

    return np.dstack([pull(rgb, w), al])


def height_to_normal(hgt, strength=4.0):
    """Altura tileable (fila 0 = v=0) → normal map en espacio tangente (convención OpenGL/glTF, +Y arriba)."""
    k = np.array([1, 2, 1], np.float32) / 4

    def blur(x, ax):
        return k[0] * np.roll(x, 1, ax) + k[1] * x + k[2] * np.roll(x, -1, ax)

    dx = blur((np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)) * 0.5, 0)
    dy = blur((np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)) * 0.5, 1)
    n = np.dstack([-dx * strength, -dy * strength, np.ones_like(hgt)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * 0.5 + 0.5


# ───────────────────────── mallas ─────────────────────────
class MB:
    """Constructor de mallas: vértices con AO/viento/fase y normal propia, caras con UV por esquina."""

    def __init__(self):
        self.V, self.N, self.C, self.F, self.FUV, self.FM = [], [], [], [], [], []

    def v(self, co, ao=1.0, wind=0.0, ph=0.0, n=None):
        self.V.append(tuple(co))
        self.C.append((min(1.0, max(0.0, ao)), min(1.0, max(0.0, wind)), ph % 1.0, 1.0))
        self.N.append(None if n is None else Vector(n).normalized())
        return len(self.V) - 1

    def f(self, idx, uvs, m=0):
        self.F.append(tuple(idx))
        self.FUV.append(tuple(uvs))
        self.FM.append(m)

    def tris(self):
        return sum(len(f) - 2 for f in self.F)

    def build(self, name, mats):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.V, [], self.F)
        uv = me.uv_layers.new(name='UVMap')
        uv.data.foreach_set('uv', [c for f in self.FUV for p in f for c in p])
        ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        ca.data.foreach_set('color', [c for cc in self.C for c in cc])
        me.color_attributes.active_color = ca
        me.color_attributes.render_color_index = 0
        me.polygons.foreach_set('material_index', self.FM)
        for m in mats:
            me.materials.append(m)
        me.shade_smooth()
        me.update()
        vn = [v.normal.copy() for v in me.vertices]
        me.normals_split_custom_set_from_vertices([n if n is not None else vn[i] for i, n in enumerate(self.N)])
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


def frames(pts):
    """Marcos de transporte paralelo a lo largo de una polilínea."""
    n = len(pts)
    T = [(pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(n)]
    ref = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((1, 0, 0))
    Nn = T[0].cross(ref).normalized()
    out = []
    for i in range(n):
        Nn = (Nn - T[i] * Nn.dot(T[i])).normalized()
        out.append((T[i], Nn, T[i].cross(Nn)))
    return out


def tube(mb, pts, rad, sides, m, uv_rep=1, v_len=1.0, ao=None, wind=None, ph=0.0, prof=None, v0=0.0, cap=False):
    """Cilindro generalizado sobre una polilínea. ao/wind: f(p, t) → valor; prof(ang, i) → factor de radio."""
    n = len(pts)
    fr = frames(pts)
    L = [0.0]
    for i in range(1, n):
        L.append(L[-1] + (pts[i] - pts[i - 1]).length)
    tot = max(L[-1], 1e-6)
    P = []
    for i in range(n):
        T, Nn, B = fr[i]
        ring = []
        for j in range(sides):
            a = TAU * j / sides
            d = Nn * math.cos(a) + B * math.sin(a)
            r = rad[i] * (prof(a, i) if prof else 1.0)
            ring.append(pts[i] + d * r)
        P.append(ring)
    idx = []
    for i in range(n):
        t = L[i] / tot
        T = fr[i][0]
        row = []
        for j in range(sides + 1):
            jj = j % sides
            d1 = P[i][(jj + 1) % sides] - P[i][(jj - 1) % sides]
            d2 = P[min(i + 1, n - 1)][jj] - P[max(i - 1, 0)][jj]
            nn = d1.cross(d2)
            radial = P[i][jj] - pts[i]
            if nn.length < 1e-9:
                nn = radial
            if nn.dot(radial) < 0:
                nn = -nn
            p = P[i][jj]
            row.append(mb.v(p, ao(p, t) if ao else 1.0, wind(p, t) if wind else 0.0, ph, nn))
        idx.append(row)
    for i in range(n - 1):
        for j in range(sides):
            u0, u1 = j / sides * uv_rep, (j + 1) / sides * uv_rep
            va, vb = v0 + L[i] / v_len, v0 + L[i + 1] / v_len
            mb.f((idx[i][j], idx[i][j + 1], idx[i + 1][j + 1], idx[i + 1][j]),
                 ((u0, va), (u1, va), (u1, vb), (u0, vb)), m)
    if cap:  # punta cerrada (abanico al centro)
        c = mb.v(pts[-1] + fr[-1][0] * rad[-1] * 0.5, ao(pts[-1], 1) if ao else 1, wind(pts[-1], 1) if wind else 0, ph,
                 fr[-1][0])
        vv = v0 + tot / v_len
        for j in range(sides):
            mb.f((idx[-1][j], idx[-1][j + 1], c), ((j / sides * uv_rep, vv), ((j + 1) / sides * uv_rep, vv),
                                                   ((j + .5) / sides * uv_rep, vv + 0.05)), m)
    return tot


def grid(mb, nu, nv, pos, uvf, attr, m, flip=False):
    """Rejilla nu×nv: pos(u,v)→Vector, uvf(u,v)→(U,V), attr(u,v,p)→(ao, viento, fase, normal)."""
    ids = []
    for j in range(nv + 1):
        row = []
        for i in range(nu + 1):
            u, v = i / nu, j / nv
            p = pos(u, v)
            a, w, ph, n = attr(u, v, p)
            row.append((mb.v(p, a, w, ph, n), uvf(u, v)))
        ids.append(row)
    for j in range(nv):
        for i in range(nu):
            q = [ids[j][i], ids[j][i + 1], ids[j + 1][i + 1], ids[j + 1][i]]
            if flip:
                q = q[::-1]
            mb.f([x[0] for x in q], [x[1] for x in q], m)


def bez(p0, p1, p2, t):
    return p0 * (1 - t) ** 2 + p1 * (2 * t * (1 - t)) + p2 * t * t


def curve(p0, p1, p2, n):
    return [bez(p0, p1, p2, i / (n - 1)) for i in range(n)]


# ───────────────────────── materiales de exportación ─────────────────────────
def _img(path, noncolor=False):
    img = bpy.data.images.load(path, check_existing=True)
    if noncolor:
        img.colorspace_settings.name = 'Non-Color'
    return img


def mat_tex(name, col_path, nrm_path=None, alpha=False, double=True, rough=0.85, nrm_strength=1.0, cutoff=0.5):
    """Material PBR simple que el exportador glTF entiende: baseColor (+alfa con corte = MASK) y normal map."""
    m = bpy.data.materials.new(name)
    t = NT(m)
    out = t.new('ShaderNodeOutputMaterial')
    b = t.new('ShaderNodeBsdfPrincipled')
    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = 0.25
    t.L.new(b.outputs[0], out.inputs['Surface'])
    tx = t.new('ShaderNodeTexImage')
    tx.image = _img(col_path)
    tx.interpolation = 'Linear'
    t.L.new(tx.outputs['Color'], b.inputs['Base Color'])
    if alpha:
        lt = t.math('LESS_THAN', tx.outputs['Alpha'], cutoff)
        t.L.new(t.math('SUBTRACT', 1.0, lt), b.inputs['Alpha'])
    if nrm_path:
        nt = t.new('ShaderNodeTexImage')
        nt.image = _img(nrm_path, True)
        nm = t.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = nrm_strength
        t.L.new(nt.outputs['Color'], nm.inputs['Color'])
        t.L.new(nm.outputs['Normal'], b.inputs['Normal'])
    m.use_backface_culling = not double
    return m


# ───────────────────────── exportación ─────────────────────────
def glb_info(path):
    d = open(path, 'rb').read()
    jl = struct.unpack('<I', d[12:16])[0]
    j = json.loads(d[20:20 + jl])
    tris = 0
    attrs = set()
    for me in j['meshes']:
        for p in me['primitives']:
            tris += j['accessors'][p['indices']]['count'] // 3
            attrs |= set(p['attributes'])
    mats = [m['name'] for m in j.get('materials', [])]
    imgs = []
    for im in j.get('images', []):
        bv = j['bufferViews'][im['bufferView']]
        imgs.append((im.get('name'), im.get('mimeType'), bv['byteLength']))
    return dict(tris=tris, attrs=sorted(attrs), mats=mats, imgs=imgs, size=len(d),
                alpha=[(m['name'], m.get('alphaMode', 'OPAQUE'), m.get('doubleSided', False)) for m in j.get('materials', [])])


def export_glb(obj, name):
    """Exporta un objeto como <nombre>.glb y escribe <nombre>_glb.js (base64)."""
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    path = os.path.join(MODELS, name + '.glb')
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
        export_normals=True, export_texcoords=True, export_tangents=False, export_materials='EXPORT',
        export_image_format='AUTO', export_vertex_color='ACTIVE', export_all_vertex_colors=False,
        export_animations=False, export_skins=False, export_morph=False, export_cameras=False,
        export_lights=False, export_extras=False)
    b64 = base64.b64encode(open(path, 'rb').read()).decode('ascii')
    with open(os.path.join(MODELS, name + '_glb.js'), 'w') as f:
        f.write('(window.AV_ENTORNO_B64=window.AV_ENTORNO_B64||{})["%s"]="%s";\n' % (name, b64))
    return glb_info(path)
