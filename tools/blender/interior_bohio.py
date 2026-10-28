"""Amazona Verse · BM4 · interior de un bohío de Villa Raíz (exporta .glb + _glb.js).

  Blender -b --factory-startup --python tools/blender/interior_bohio.py

Un solo objeto, pivote en el centro del suelo, metros, a la escala ×1,75 del bohío_redondo de Villa Raíz
(radio interior 2,4 m, pared 1,7 m, vértice del techo a 3,2 m; la puerta, de 1,2 × 2,0 m, mira a -Y de Blender = +Z de glTF).
Piezas: suelo de tierra, pared de caña, techo de paja con cabrios, hamaca entre dos postes, fogón (piedras, leños, brasa),
tres vasijas, un cesto y un banco. Un atlas propio de 1024 (JPEG, 4×4 celdas de 256, pintado por código con la paleta del kit Savage).
Nombres de las piezas dentro del mesh: no hay; las zonas para tocar (hamaca, fogón, tinaja) quedan en `INTERIOR_ZONAS` (impreso y en el JSON).
"""
import bpy, bmesh, math, os, sys, json, random
from mathutils import Vector
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import entorno_lib as L  # noqa: E402

RIN, WALL_H, APEX = 2.4, 1.7, 3.2
DOOR_W, DOOR_H = 1.2, 2.0
rng = random.Random(44)

# ---------- atlas ----------
# celda -> (color base, color 2, patrón)
CELDAS = {
    0: ((0.36, 0.26, 0.17), (0.30, 0.21, 0.13), 'ruido'),    # tierra apisonada
    1: ((0.55, 0.42, 0.20), (0.40, 0.30, 0.14), 'hebras'),   # paja
    2: ((0.52, 0.36, 0.20), (0.42, 0.28, 0.15), 'veta'),     # madera clara
    3: ((0.30, 0.20, 0.12), (0.22, 0.14, 0.08), 'veta'),     # madera oscura
    4: ((0.62, 0.33, 0.20), (0.52, 0.26, 0.15), 'ruido'),    # barro terracota
    5: ((0.38, 0.22, 0.14), (0.78, 0.60, 0.36), 'banda'),    # barro con banda
    6: ((0.62, 0.50, 0.28), (0.45, 0.34, 0.18), 'trenza'),   # fibra del cesto
    7: ((0.74, 0.62, 0.42), (0.62, 0.20, 0.14), 'rayas'),    # tela de la hamaca
    8: ((0.42, 0.42, 0.40), (0.30, 0.30, 0.29), 'ruido'),    # piedra
    9: ((0.95, 0.42, 0.08), (0.45, 0.10, 0.04), 'brasa'),    # brasa
    10: ((0.70, 0.60, 0.40), (0.55, 0.45, 0.28), 'hebras'),  # cuerda
    11: ((0.46, 0.34, 0.20), (0.34, 0.24, 0.14), 'cana'),    # pared de caña
    12: ((0.10, 0.08, 0.07), (0.20, 0.16, 0.13), 'ruido'),   # carbón y ceniza
}


def pintar_atlas(path):
    n, c = 1024, 256
    img = np.zeros((n, n, 3), np.float32)
    r = np.random.RandomState(7)
    yy, xx = np.mgrid[0:c, 0:c].astype(np.float32)
    for i in range(16):
        a, b, pat = CELDAS.get(i, CELDAS[0])
        a, b = np.array(a, np.float32), np.array(b, np.float32)
        ru = r.rand(c // 8, c // 8)
        ru = np.kron(ru, np.ones((8, 8)))
        fino = r.rand(c, c)
        if pat == 'ruido':
            t = 0.6 * ru + 0.4 * fino
        elif pat == 'hebras':
            t = 0.5 * (r.rand(1, c) * np.ones((c, 1))) + 0.5 * fino
        elif pat == 'veta':
            t = 0.55 * (0.5 + 0.5 * np.sin(yy * 0.35 + 3 * ru)) + 0.45 * fino * 0.5
        elif pat == 'banda':
            t = ((yy > 70) & (yy < 110)) | ((yy > 150) & (yy < 175))
            t = t.astype(np.float32) * 0.9 + 0.1 * fino
        elif pat == 'trenza':
            t = 0.5 + 0.5 * np.sin((xx + yy) * 0.28) * np.sign(np.sin((xx - yy) * 0.28 + 1))
            t = 0.7 * t + 0.3 * fino
        elif pat == 'rayas':
            t = (np.sin(xx * 0.16) > 0.35).astype(np.float32) * 0.9 + 0.1 * fino
        elif pat == 'brasa':
            t = np.clip(0.3 + 0.8 * ru * fino * 1.4, 0, 1)
        elif pat == 'cana':
            t = 0.5 + 0.5 * np.sin(xx * 0.5 + 2 * ru[::-1])
            t = 0.7 * t + 0.3 * fino
        t = np.clip(t, 0, 1)[..., None]
        cel = a * (1 - t) + b * t
        # borde de la celda con el color medio (sin sangrado al filtrar)
        row, col = divmod(i, 4)
        img[row * c:(row + 1) * c, col * c:(col + 1) * c] = cel
    px = np.ones((n, n, 4), np.float32)
    px[..., :3] = img[::-1]  # Blender: origen abajo
    im = bpy.data.images.new('atlas_bohio_interior', n, n)
    im.pixels = px.ravel()
    im.filepath_raw = path
    im.file_format = 'JPEG'
    bpy.context.scene.render.image_settings.quality = 88
    im.save()
    return im


# ---------- geometría ----------
class Malla:
    def __init__(self):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new('UVMap')

    def _cara(self, vs, cell, uvs, flip=False):
        if flip:
            vs, uvs = vs[::-1], uvs[::-1]
        try:
            f = self.bm.faces.new(vs)
        except ValueError:
            return None
        row, col = divmod(cell, 4)
        for lo, (u, v) in zip(f.loops, uvs):
            lo[self.uv].uv = ((col + 0.06 + 0.88 * u) / 4, 1 - (row + 1 - (0.06 + 0.88 * v)) / 4 - 0 if False else (3 - row + 0.06 + 0.88 * v) / 4)
        f.smooth = True
        return f

    def revolve(self, perfil, pos, cell, segs=14, flip=False, a0=0.0, a1=math.tau, jit=0.0, elip=1.0):
        """Superficie de revolución; perfil = [(radio, z)] de abajo arriba; pos = centro de la base."""
        px, py, pz = pos
        anillos = []
        for k, (rad, z) in enumerate(perfil):
            fila = []
            for s in range(segs + 1):
                a = a0 + (a1 - a0) * s / segs
                j = 1 + jit * (rng.random() - 0.5) if (0 < s < segs) else 1.0
                fila.append(self.bm.verts.new((px + rad * j * math.cos(a), py + rad * j * elip * math.sin(a), pz + z)))
            anillos.append(fila)
        # el último vértice de la vuelta completa se suelda con el primero
        if abs((a1 - a0) - math.tau) < 1e-6:
            for fila in anillos:
                fila[-1] = fila[0]
        nk = len(perfil)
        for k in range(nk - 1):
            for s in range(segs):
                vs = [anillos[k][s], anillos[k][s + 1], anillos[k + 1][s + 1], anillos[k + 1][s]]
                if len(set(vs)) < 3:
                    continue
                vs = list(dict.fromkeys(vs))
                uvs = [(s / segs, k / (nk - 1)), ((s + 1) / segs, k / (nk - 1)),
                       ((s + 1) / segs, (k + 1) / (nk - 1)), (s / segs, (k + 1) / (nk - 1))]
                if len(vs) == 3:
                    uvs = uvs[:3]
                self._cara(vs, cell, uvs[:len(vs)], flip)

    def tapa(self, rad, z, pos, cell, segs=10, arriba=True):
        self.revolve([(0.0, z), (rad, z)], pos, cell, segs, flip=not arriba)

    def caja(self, c, d, cell, rot=0.0):
        """c = centro, d = (ancho x, fondo y, alto z), rot = giro en Z."""
        hx, hy, hz = d[0] / 2, d[1] / 2, d[2] / 2
        ca, sa = math.cos(rot), math.sin(rot)
        P = {}
        for ix in (-1, 1):
            for iy in (-1, 1):
                for iz in (-1, 1):
                    x, y = ix * hx, iy * hy
                    P[(ix, iy, iz)] = self.bm.verts.new((c[0] + x * ca - y * sa, c[1] + x * sa + y * ca, c[2] + iz * hz))
        q = [((-1, -1, -1), (1, -1, -1), (1, -1, 1), (-1, -1, 1)), ((1, -1, -1), (1, 1, -1), (1, 1, 1), (1, -1, 1)),
             ((1, 1, -1), (-1, 1, -1), (-1, 1, 1), (1, 1, 1)), ((-1, 1, -1), (-1, -1, -1), (-1, -1, 1), (-1, 1, 1)),
             ((-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)), ((-1, 1, -1), (1, 1, -1), (1, -1, -1), (-1, -1, -1))]
        for f in q:
            self._cara([P[k] for k in f], cell, [(0, 0), (1, 0), (1, 1), (0, 1)])

    def varilla(self, p0, p1, rad, cell, segs=6, rad1=None):
        """Cilindro orientado de p0 a p1."""
        a, b = Vector(p0), Vector(p1)
        ax = (b - a)
        L_ = ax.length
        z = ax.normalized()
        t = Vector((1, 0, 0)) if abs(z.x) < 0.9 else Vector((0, 1, 0))
        x = z.cross(t).normalized()
        y = z.cross(x)
        r1 = rad if rad1 is None else rad1
        filas = []
        for k, rr in enumerate((rad, r1)):
            filas.append([self.bm.verts.new(a + z * (L_ * k) + (x * math.cos(math.tau * s / segs) + y * math.sin(math.tau * s / segs)) * rr)
                          for s in range(segs)])
        for s in range(segs):
            s2 = (s + 1) % segs
            self._cara([filas[0][s], filas[0][s2], filas[1][s2], filas[1][s]], cell, [(s / segs, 0), ((s + 1) / segs, 0), ((s + 1) / segs, 1), (s / segs, 1)])
        for fila, flip in ((filas[0], True), (filas[1], False)):
            self._cara(fila, cell, [(0.5 + 0.5 * math.cos(math.tau * s / segs), 0.5 + 0.5 * math.sin(math.tau * s / segs)) for s in range(segs)], flip)

    def malla_tela(self, p0, p1, ancho, comba, cell, nu=10, nv=4):
        """Hoja doble cara colgada entre p0 y p1 (catenaria simple)."""
        a, b = Vector(p0), Vector(p1)
        d = b - a
        lat = Vector((-d.y, d.x, 0)).normalized()
        V = [[None] * (nv + 1) for _ in range(nu + 1)]
        for i in range(nu + 1):
            t = i / nu
            base = a + d * t
            caida = -comba * 4 * t * (1 - t)
            for j in range(nv + 1):
                w = (j / nv - 0.5) * ancho * (0.55 + 0.45 * math.sin(math.pi * t) ** 0.5)
                # los bordes suben un poco al sentarse alguien
                V[i][j] = self.bm.verts.new(base + lat * w + Vector((0, 0, caida + 0.10 * (abs(j / nv - 0.5) * 2) ** 2 * math.sin(math.pi * t))))
        for i in range(nu):
            for j in range(nv):
                vs = [V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1]]
                uvs = [(i / nu, j / nv), ((i + 1) / nu, j / nv), ((i + 1) / nu, (j + 1) / nv), (i / nu, (j + 1) / nv)]
                self._cara(vs, cell, uvs)
                self._cara(vs, cell, uvs, flip=True)


def construir():
    M = Malla()
    # suelo
    M.revolve([(0.0, 0.0), (RIN + 0.15, 0.0)], (0, 0, 0), 0, segs=24, flip=True)
    # pared de caña (cara interior), con hueco de puerta hacia -Y
    gap = DOOR_W / RIN  # ángulo aproximado
    centro = -math.pi / 2
    a0, a1 = centro + gap / 2, centro - gap / 2 + math.tau
    M.revolve([(RIN, 0.0), (RIN, WALL_H)], (0, 0, 0), 11, segs=26, flip=True, a0=a0, a1=a1)
    # dintel sobre la puerta
    M.revolve([(RIN, DOOR_H - 0.1), (RIN, WALL_H + 0.05)], (0, 0, 0), 3, segs=2, flip=True, a0=centro - gap / 2, a1=centro + gap / 2)
    # techo de paja (cara interior), del borde de la pared al vértice
    M.revolve([(RIN + 0.1, WALL_H - 0.05), (RIN * 0.55, WALL_H + (APEX - WALL_H) * 0.5), (0.05, APEX)], (0, 0, 0), 1, segs=24, flip=True)
    # cabrios y aro de atado
    for k in range(10):
        a = math.tau * k / 10 + 0.15
        M.varilla((RIN * math.cos(a), RIN * math.sin(a), WALL_H - 0.05), (0.05 * math.cos(a), 0.05 * math.sin(a), APEX - 0.08), 0.045, 2, segs=5, rad1=0.03)
    for h, rr in ((WALL_H + 0.45, 1.8), (WALL_H + 1.0, 1.0)):
        puntos = [(rr * math.cos(math.tau * k / 14), rr * math.sin(math.tau * k / 14)) for k in range(14)]
        for k in range(14):
            p, q = puntos[k], puntos[(k + 1) % 14]
            M.varilla((p[0], p[1], h), (q[0], q[1], h), 0.028, 10, segs=4)
    # poste central bajo y postes de la hamaca (a la izquierda del eje de la puerta, fondo del bohío)
    ph0, ph1 = (-1.75, 1.0, 0.0), (1.55, 1.25, 0.0)
    for p in (ph0, ph1):
        M.varilla((p[0], p[1], 0), (p[0], p[1], 1.55), 0.085, 3, segs=7, rad1=0.07)
    ha, hb = (ph0[0], ph0[1], 1.12), (ph1[0], ph1[1], 1.12)
    M.malla_tela(ha, hb, 0.85, 0.42, 7, nu=12, nv=4)
    M.varilla((ph0[0], ph0[1], 1.45), (ph0[0] + 0.40, ph0[1] + 0.02, 1.12), 0.012, 10, segs=4)
    M.varilla((ph1[0], ph1[1], 1.45), (ph1[0] - 0.40, ph1[1] + 0.02, 1.12), 0.012, 10, segs=4)
    # fogón: tres piedras grandes y cinco pequeñas en anillo, leños en estrella, brasa
    fx, fy = 0.0, -0.1
    for k in range(8):
        a = math.tau * k / 8
        r_ = 0.45
        M.revolve([(0.0, 0.0), (0.17, 0.02), (0.20, 0.10), (0.13, 0.20), (0.0, 0.22)], (fx + r_ * math.cos(a), fy + r_ * math.sin(a), 0), 8, segs=7, jit=0.25, elip=0.8)
    M.revolve([(0.0, 0.02), (0.36, 0.02)], (fx, fy, 0), 12, segs=12, flip=True)  # ceniza
    M.revolve([(0.0, 0.05), (0.22, 0.045), (0.26, 0.03)], (fx, fy, 0), 9, segs=10, flip=True)  # brasa
    for k in range(4):
        a = math.tau * k / 4 + 0.4
        M.varilla((fx + 0.36 * math.cos(a), fy + 0.36 * math.sin(a), 0.07), (fx + 0.04 * math.cos(a), fy + 0.04 * math.sin(a), 0.14), 0.045, 3, segs=6, rad1=0.035)
    # tres vasijas (tinaja grande, olla, cuenco), junto a la pared opuesta a la puerta
    tinaja = [(0.0, 0.0), (0.17, 0.0), (0.30, 0.12), (0.38, 0.32), (0.36, 0.52), (0.26, 0.68), (0.17, 0.78), (0.19, 0.84), (0.0, 0.84)]
    M.revolve(tinaja, (1.35, 1.55, 0), 5, segs=14, jit=0.04)
    M.revolve([(0.0, 0.0), (0.12, 0.0), (0.22, 0.10), (0.25, 0.26), (0.18, 0.42), (0.20, 0.46)], (0.82, 1.82, 0), 4, segs=12, jit=0.04)
    M.revolve([(0.0, 0.0), (0.10, 0.0), (0.22, 0.10), (0.26, 0.17), (0.0, 0.17)], (-0.35, -1.55, 0), 4, segs=12)
    M.revolve([(0.0, 0.0), (0.26, 0.0), (0.26, 0.03)], (-0.35, -1.55, 0), 4, segs=2)  # (sin efecto: asegura base)
    # cesto de fibra
    M.revolve([(0.0, 0.0), (0.18, 0.0), (0.25, 0.14), (0.30, 0.30), (0.32, 0.42)], (-1.7, -0.25, 0), 6, segs=12, jit=0.03)
    M.revolve([(0.32, 0.42), (0.29, 0.40), (0.18, 0.04)], (-1.7, -0.25, 0), 6, segs=12, flip=True)
    # banco: tabla gruesa y cuatro patas
    bc = (1.45, -0.55, 0.0)
    rot = math.radians(-70)
    M.caja((bc[0], bc[1], 0.42), (0.95, 0.30, 0.07), 2, rot)
    for dx in (-0.38, 0.38):
        for dy in (-0.09, 0.09):
            x = bc[0] + dx * math.cos(rot) - dy * math.sin(rot)
            y = bc[1] + dx * math.sin(rot) + dy * math.cos(rot)
            M.varilla((x, y, 0.0), (x, y, 0.40), 0.035, 3, segs=5, rad1=0.03)
    return M


def main():
    L.reset()
    atlas = os.path.join(L.TEX, 'bohio_interior_atlas.jpg')
    os.makedirs(L.TEX, exist_ok=True)
    im = pintar_atlas(atlas)
    M = construir()
    bmesh.ops.recalc_face_normals(M.bm, faces=M.bm.faces[:0])  # normales según el orden de los vértices
    me = bpy.data.meshes.new('bohio_interior')
    M.bm.to_mesh(me)
    M.bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new('bohio_interior', me)
    bpy.context.scene.collection.objects.link(ob)
    # Z arriba de Blender → Y arriba de glTF lo hace el exportador; la puerta (-Y de Blender) queda en +Z de glTF
    mat = bpy.data.materials.new('BOHIO_INTERIOR')
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = im
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.9
    mat.use_backface_culling = False
    me.materials.append(mat)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    info = L.export_glb(ob, 'bohio_interior')
    zonas = {
        'hamaca': {'centro': [0.0, 1.12, 1.1], 'radio': 0.9},
        'fogon': {'centro': [0.0, -0.1, 0.1], 'radio': 0.7},
        'tinaja': {'centro': [1.35, 1.55, 0.4], 'radio': 0.6},
        'cesto': {'centro': [-1.7, -0.25, 0.2], 'radio': 0.5},
        'banco': {'centro': [1.45, -0.55, 0.4], 'radio': 0.6},
        'puerta': {'centro': [0.0, -RIN, 1.0], 'ancho': DOOR_W, 'alto': DOOR_H},
        'nota': 'coordenadas en el marco de Blender (x, y, z arriba); en glTF (x, z, -y). Metros, a ×1,75.',
    }
    json.dump(zonas, open(os.path.join(L.MODELS, 'bohio_interior_zonas.json'), 'w'), indent=1)
    print('BM4 TRIS', tris, 'VERTS', len(me.vertices), info)


main()
