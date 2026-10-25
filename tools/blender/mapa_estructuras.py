# Estructuras del mapa Cap. 1 (Blender 4.2, sin ventana). Cada función construye un objeto en
# coordenadas locales: origen en el suelo, frente hacia +Y local, Z arriba. Devuelve (objeto, colisiones).
# Colisiones locales: {'tipo': 'caja', 'c': (x, y, z), 'h': (hx, hy, hz)} | {'tipo': 'cilindro', 'c': (x, y),
# 'r', 'z0', 'z1'} | {'tipo': 'piso', 'c': (x, y), 'h': (hx, hy), 'z'} | {'tipo': 'rampa', 'a', 'b', 'ancho'}.
import bpy, bmesh, math
from mathutils import Matrix, Vector

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)

def material(name, color, rough=0.8, metal=0.0, emit=None, strength=3.0):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = m.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = srgb(color); bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metal
    if emit:
        bs.inputs['Emission Color'].default_value = srgb(emit); bs.inputs['Emission Strength'].default_value = strength
    m.diffuse_color = srgb(color)
    return m

class Builder:
    def __init__(self, name):
        self.name = name; self.bm = bmesh.new(); self.mats = []; self.col = []

    def m(self, name, *a, **k):
        mt = material(name, *a, **k)
        if mt not in self.mats: self.mats.append(mt)
        return self.mats.index(mt)

    def _tag(self, verts, mi):
        fs = set()
        for v in verts:
            fs.update(v.link_faces)
        for f in fs: f.material_index = mi; f.smooth = False

    def box(self, mi, size, loc, rz=0.0, rx=0.0, ry=0.0):
        M = Matrix.Translation(loc) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(ry, 4, 'Y') @ \
            Matrix.Rotation(rx, 4, 'X') @ Matrix.Diagonal((size[0], size[1], size[2], 1))
        r = bmesh.ops.create_cube(self.bm, size=1.0, matrix=M); self._tag(r['verts'], mi); return r

    def cyl(self, mi, r1, r2, h, loc, seg=8, caps=True, rz=0.0, rx=0.0, ry=0.0, smooth=False):
        M = Matrix.Translation(loc) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(ry, 4, 'Y') @ \
            Matrix.Rotation(rx, 4, 'X') @ Matrix.Translation((0, 0, h / 2))
        r = bmesh.ops.create_cone(self.bm, cap_ends=caps, cap_tris=False, segments=seg, radius1=r1, radius2=r2,
                                  depth=h, matrix=M)
        self._tag(r['verts'], mi)
        if smooth:
            for v in r['verts']:
                for f in v.link_faces: f.smooth = True
        return r

    def beam(self, mi, a, b, t, tz=None):
        """Viga de sección t x tz entre los puntos a y b."""
        a = Vector(a); b = Vector(b); d = b - a; L = d.length
        q = d.to_track_quat('Z', 'Y')
        M = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4() @ Matrix.Diagonal((t, tz or t, L, 1))
        r = bmesh.ops.create_cube(self.bm, size=1.0, matrix=M); self._tag(r['verts'], mi); return r

    def rod(self, mi, a, b, r, seg=6):
        a = Vector(a); b = Vector(b); d = b - a; L = d.length
        q = d.to_track_quat('Z', 'Y')
        M = Matrix.Translation(a) @ q.to_matrix().to_4x4() @ Matrix.Translation((0, 0, L / 2))
        res = bmesh.ops.create_cone(self.bm, cap_ends=False, segments=seg, radius1=r, radius2=r, depth=L, matrix=M)
        self._tag(res['verts'], mi); return res

    def prism(self, mi, w, d, h, loc, rz=0.0):
        """Prisma triangular (hastial): base w (X) x d (Y), altura h."""
        x, y, z = loc; c, s = math.cos(rz), math.sin(rz)
        def P(px, py, pz): return Vector((x + px * c - py * s, y + px * s + py * c, z + pz))
        v = [self.bm.verts.new(P(-w / 2, -d / 2, 0)), self.bm.verts.new(P(w / 2, -d / 2, 0)), self.bm.verts.new(P(0, -d / 2, h)),
             self.bm.verts.new(P(-w / 2, d / 2, 0)), self.bm.verts.new(P(w / 2, d / 2, 0)), self.bm.verts.new(P(0, d / 2, h))]
        fs = [self.bm.faces.new((v[0], v[2], v[1])), self.bm.faces.new((v[3], v[4], v[5])),
              self.bm.faces.new((v[0], v[1], v[4], v[3])), self.bm.faces.new((v[1], v[2], v[5], v[4])),
              self.bm.faces.new((v[2], v[0], v[3], v[5]))]
        for f in fs: f.material_index = mi
        return fs

    def ico(self, mi, r, loc, sub=1, scale=(1, 1, 1)):
        M = Matrix.Translation(loc) @ Matrix.Diagonal((scale[0], scale[1], scale[2], 1))
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=sub, radius=r, matrix=M); self._tag(res['verts'], mi)
        return res

    def text(self, mi, body, loc, size, rz=0.0, depth=0.02):
        bpy.ops.object.text_add(location=(0, 0, 0))
        t = bpy.context.object; t.data.body = body; t.data.size = size; t.data.extrude = depth
        t.data.align_x = 'CENTER'; t.data.align_y = 'CENTER'; t.data.resolution_u = 2
        t.rotation_euler = (math.pi / 2, 0, rz); t.location = loc
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(t.evaluated_get(dg))
        me.transform(t.matrix_world)
        n0 = len(self.bm.verts); self.bm.from_mesh(me)
        self.bm.verts.ensure_lookup_table()
        self._tag(self.bm.verts[n0:], mi)
        bpy.data.objects.remove(t); bpy.data.meshes.remove(me)

    def finish(self):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me); self.bm.free()
        for mt in self.mats: me.materials.append(mt)
        ob = bpy.data.objects.new(self.name, me); bpy.context.scene.collection.objects.link(ob)
        return ob

# ------------------------------------------------------------------ Estación de Conservación (refugio base)
def estacion():
    B = Builder('refugio')
    pil = B.m('AV_Madera_Pilotes', '#5b4030', 0.9); piso = B.m('AV_Madera_Piso', '#a77b4f', 0.85)
    pared = B.m('AV_Pared_Turquesa', '#3fa7a3', 0.8); marco = B.m('AV_Marco_Blanco', '#f3efe4', 0.6)
    pers = B.m('AV_Persiana_Amarilla', '#f2c14e', 0.7); techo = B.m('AV_Techo_Zinc_Rojo', '#c8473d', 0.45, 0.3)
    vidrio = B.m('AV_Vidrio_Oscuro', '#1f3a44', 0.15); metal = B.m('AV_Metal_Antena', '#b9bec2', 0.35, 0.8)
    baliza = B.m('AV_Baliza_Roja', '#ff3b2f', 0.3, emit='#ff3b2f', strength=6)
    solar = B.m('AV_Panel_Solar', '#20335c', 0.2, 0.4); tanque = B.m('AV_Tanque_Agua', '#2d2d2d', 0.6)
    letrero = B.m('AV_Letrero_Madera', '#6b4a2e', 0.8); letra = B.m('AV_Letras_Crema', '#f6ead0', 0.6)
    FZ = 1.2   # altura del piso
    for x in (-5.6, -1.9, 1.9, 5.6):
        for y in (-3.9, -0.3, 3.4, 5.6):
            B.cyl(pil, 0.17, 0.15, FZ + 0.9, (x, y, -0.9), seg=8)
    B.box(piso, (12.4, 10.2, 0.24), (0, 0.85, FZ - 0.12))
    for y in (-3.9, -0.3, 3.4, 5.6):
        B.box(pil, (12.2, 0.22, 0.28), (0, y, FZ - 0.38))
    # cuerpo
    B.box(pared, (9.2, 6.0, 3.0), (0, -1.0, FZ + 1.5))
    B.box(marco, (9.4, 6.2, 0.18), (0, -1.0, FZ + 0.09))          # zócalo
    B.box(marco, (9.4, 6.2, 0.16), (0, -1.0, FZ + 2.95))          # cornisa
    for x in (-4.6, 4.6):
        for y in (-4.0, 2.0):
            B.box(marco, (0.2, 0.2, 3.0), (x, y, FZ + 1.5))
    # puerta y ventanas frente (+Y, cara en y=2.0)
    B.box(marco, (1.5, 0.12, 2.35), (0, 2.03, FZ + 1.17)); B.box(letrero, (1.2, 0.14, 2.1), (0, 2.05, FZ + 1.05))
    for x in (-2.9, 2.9):
        B.box(marco, (1.7, 0.12, 1.45), (x, 2.03, FZ + 1.65)); B.box(vidrio, (1.4, 0.14, 1.15), (x, 2.05, FZ + 1.65))
        for sx in (-1.25, 1.25):   # persianas abiertas
            B.box(pers, (0.75, 0.06, 1.3), (x + sx, 2.12, FZ + 1.65))
            for k in range(5): B.box(marco, (0.72, 0.05, 0.03), (x + sx, 2.16, FZ + 1.1 + k * 0.27))
    for x in (-2.6, 0.6, 3.0):   # ventanas traseras
        B.box(marco, (1.3, 0.12, 1.2), (x, -4.03, FZ + 1.7)); B.box(vidrio, (1.05, 0.14, 0.95), (x, -4.05, FZ + 1.7))
        B.box(pers, (1.35, 0.1, 0.18), (x, -4.08, FZ + 2.4))
    for sx in (-1, 1):   # ventanas laterales
        for y in (-2.6, 0.4):
            B.box(marco, (0.12, 1.4, 1.3), (sx * 4.63, y, FZ + 1.65)); B.box(vidrio, (0.14, 1.1, 1.0), (sx * 4.65, y, FZ + 1.65))
    # techo a dos aguas (cumbrera en X)
    pitch = math.radians(24); half = 3.9
    for sy in (-1, 1):
        B.box(techo, (10.6, half / math.cos(pitch) + 0.3, 0.14), (0, -1.0 + sy * half / 2, FZ + 3.0 + half / 2 * math.tan(pitch)), rx=-sy * pitch)
        for k in range(9):   # ondas del zinc
            B.box(techo, (0.06, half / math.cos(pitch) + 0.3, 0.05), (-4.8 + k * 1.2, -1.0 + sy * half / 2, FZ + 3.09 + half / 2 * math.tan(pitch)), rx=-sy * pitch)
    for sx in (-1, 1):
        B.prism(pared, 6.0, 0.2, half * math.tan(pitch) * 0.98, (sx * 4.55, -1.0, FZ + 3.0), rz=math.pi / 2)
    B.box(marco, (10.7, 0.25, 0.22), (0, -1.0, FZ + 3.0 + half * math.tan(pitch) + 0.05))
    # balcón con techo propio, barandas y escalera
    for x in (-5.8, -2.0, 2.0, 5.8):
        B.box(marco, (0.18, 0.18, 2.7), (x, 5.75, FZ + 1.35))
    B.box(techo, (12.6, 4.4, 0.12), (0, 4.0, FZ + 2.75), rx=math.radians(9))
    for (a, b) in (((-6.0, 5.8), (-1.1, 5.8)), ((1.1, 5.8), (6.0, 5.8)), ((-6.0, 2.0), (-6.0, 5.8)), ((6.0, 2.0), (6.0, 5.8))):
        B.beam(marco, (a[0], a[1], FZ + 1.0), (b[0], b[1], FZ + 1.0), 0.09, 0.12)
        B.beam(marco, (a[0], a[1], FZ + 0.55), (b[0], b[1], FZ + 0.55), 0.05, 0.06)
        n = int(math.dist(a, b) / 0.6)
        for k in range(1, n):
            t = k / n; B.box(marco, (0.05, 0.05, 1.0), (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, FZ + 0.5))
    for k in range(5):
        B.box(piso, (2.0, 0.32, 0.12), (0, 6.15 + k * 0.32, FZ - (k + 1) * FZ / 5.5))
    for sx in (-1.05, 1.05):
        B.beam(piso, (sx, 6.0, FZ), (sx, 7.7, 0.0), 0.08, 0.22)
    # letrero
    B.box(letrero, (4.6, 0.12, 0.62), (0, 5.85, FZ + 2.3))
    B.text(letra, 'ESTACIÓN EL YUNQUE', (0, 5.78, FZ + 2.3), 0.36, rz=0.0)
    # paneles solares sobre el techo trasero
    for x in (-2.4, 0.6):
        B.box(solar, (2.4, 1.6, 0.06), (x, -3.0, FZ + 3.92), rx=pitch)
        B.box(marco, (2.5, 1.7, 0.04), (x, -3.0, FZ + 3.88), rx=pitch)
    # tanque de agua
    B.cyl(tanque, 0.85, 0.85, 1.6, (6.4, -3.6, FZ), seg=12); B.cyl(tanque, 0.88, 0.2, 0.25, (6.4, -3.6, FZ + 1.6), seg=12)
    # antena-transmisor (torre de celosía de 15 m con baliza)
    ax, ay, H = -7.6, -3.6, 15.0
    legs = [(-0.55, -0.55), (0.55, -0.55), (0.55, 0.55), (-0.55, 0.55)]
    top = 0.18
    for lx, ly in legs:
        B.beam(metal, (ax + lx, ay + ly, 0), (ax + lx * top / 0.55, ay + ly * top / 0.55, H), 0.07)
    for k in range(8):
        z0 = k * H / 8; z1 = (k + 1) * H / 8
        s0 = 0.55 - (0.55 - top) * k / 8; s1 = 0.55 - (0.55 - top) * (k + 1) / 8
        for i in range(4):
            (lx0, ly0), (lx1, ly1) = legs[i], legs[(i + 1) % 4]
            a = (ax + lx0 / 0.55 * s0, ay + ly0 / 0.55 * s0, z0); b = (ax + lx1 / 0.55 * s1, ay + ly1 / 0.55 * s1, z1)
            B.beam(metal, a, b, 0.035)
    B.beam(metal, (ax, ay, H), (ax, ay, H + 2.6), 0.05)
    B.ico(baliza, 0.22, (ax, ay, H + 2.75), sub=1)
    B.cyl(metal, 0.55, 0.05, 0.35, (ax + 0.35, ay, H - 2.0), seg=10, ry=math.radians(80))
    B.box(metal, (0.4, 0.3, 0.6), (ax, ay, H - 4.0))
    ob = B.finish()
    col = [{'tipo': 'caja', 'c': (0, -1.0, FZ + 1.6), 'h': (4.7, 3.1, 1.6 + FZ / 2)},
           {'tipo': 'piso', 'c': (0, 0.85, 0), 'h': (6.2, 5.1), 'z': FZ},
           {'tipo': 'rampa', 'a': (0, 7.8, 0.0), 'b': (0, 6.0, FZ), 'ancho': 2.0},
           {'tipo': 'cilindro', 'c': (ax, ay), 'r': 0.8, 'z0': 0, 'z1': H + 3},
           {'tipo': 'cilindro', 'c': (6.4, -3.6), 'r': 0.95, 'z0': FZ, 'z1': FZ + 1.9}]
    return ob, col

# ------------------------------------------------------------------ Mirador tipo torre Yokahú
def mirador():
    B = Builder('mirador')
    base = B.m('AV_Piedra_Base', '#8d8577', 0.95); torre = B.m('AV_Piedra_Torre', '#b8ab95', 0.9)
    clara = B.m('AV_Piedra_Clara', '#ddd3bf', 0.85); oscuro = B.m('AV_Hueco_Oscuro', '#2a2622', 0.9)
    teja = B.m('AV_Teja_Roja', '#b5482f', 0.7); madera = B.m('AV_Madera_Puerta', '#5a3b24', 0.8)
    B.cyl(base, 4.6, 4.6, 0.5, (0, 0, -0.3), seg=16); B.cyl(base, 4.0, 4.0, 0.3, (0, 0, 0.2), seg=16)
    TOP = 12.6
    B.cyl(torre, 2.9, 2.45, TOP - 0.5, (0, 0, 0.5), seg=20)
    for z in (0.5, 4.3, 8.4):
        r = 2.92 - 0.45 * (z - 0.5) / (TOP - 0.5)
        B.cyl(clara, r + 0.08, r + 0.06, 0.3, (0, 0, z), seg=20)
    # sillares: hiladas sugeridas con anillos finos
    for k in range(1, 24):
        z = 0.5 + k * 0.5
        if any(abs(z - q) < 0.4 for q in (0.5, 4.3, 8.4)): continue
        r = 2.9 - 0.45 * (z - 0.5) / (TOP - 0.5)
        B.cyl(clara, r + 0.015, r + 0.015, 0.04, (0, 0, z), seg=20, caps=False)
    B.box(madera, (1.3, 0.3, 2.3), (0, 2.82, 1.65)); B.box(clara, (1.7, 0.36, 0.3), (0, 2.84, 2.9))
    for k, a in enumerate((0.7, 2.3, 3.6, 5.1)):   # aspilleras en espiral (escalera interior)
        z = 3.0 + k * 2.1; r = 2.9 - 0.45 * (z - 0.5) / (TOP - 0.5)
        B.box(oscuro, (0.32, 0.25, 1.0), (r * math.sin(a), r * math.cos(a), z), rz=-a)
    # balcón voladizo con almenas y barandal
    B.cyl(clara, 2.45, 3.75, 1.0, (0, 0, TOP - 1.0), seg=20)
    B.cyl(base, 3.75, 3.75, 0.3, (0, 0, TOP), seg=20)
    n = 16
    for i in range(n):
        a = 2 * math.pi * i / n; r = 3.55
        B.box(torre, (0.42, 0.34, 1.05), (r * math.cos(a), r * math.sin(a), TOP + 0.3 + 0.52), rz=a)
        a2 = a + math.pi / n
        B.box(clara, (2 * r * math.sin(math.pi / n) + 0.1, 0.36, 0.16), (r * math.cos(a2), r * math.sin(a2), TOP + 1.43), rz=a2 + math.pi / 2)
    # torrecilla central con techo cónico de tejas
    B.cyl(torre, 1.25, 1.2, 2.5, (0, 0, TOP + 0.3), seg=14)
    B.box(madera, (0.75, 0.2, 1.75), (0, -1.22, TOP + 1.2))
    B.cyl(teja, 1.65, 0.04, 2.0, (0, 0, TOP + 2.8), seg=14)
    B.cyl(clara, 1.32, 1.32, 0.12, (0, 0, TOP + 2.75), seg=14)
    B.beam(oscuro, (0, 0, TOP + 4.7), (0, 0, TOP + 6.0), 0.05)
    B.box(teja, (0.7, 0.03, 0.45), (0.36, 0, TOP + 5.75))
    ob = B.finish()
    col = [{'tipo': 'cilindro', 'c': (0, 0), 'r': 2.9, 'z0': 0, 'z1': TOP + 0.3},
           {'tipo': 'piso', 'c': (0, 0), 'h': (3.6, 3.6), 'z': TOP + 0.3, 'forma': 'disco'},
           {'tipo': 'cilindro', 'c': (0, 0), 'r': 1.3, 'z0': TOP + 0.3, 'z1': TOP + 4.8}]
    return ob, col, TOP + 0.3

# ------------------------------------------------------------------ Casita jíbara
def casita():
    B = Builder('casita')
    pil = B.m('AV_Madera_Pilotes', '#5b4030', 0.9); piso = B.m('AV_Madera_Piso', '#a77b4f', 0.85)
    pared = B.m('AV_Pared_Amarilla_Jibara', '#f0c446', 0.85); tabla = B.m('AV_Tablilla_Crema', '#f6e7bf', 0.8)
    vent = B.m('AV_Ventana_Roja', '#c63a32', 0.7); zinc = B.m('AV_Zinc_Oxidado', '#9a5a3c', 0.6, 0.35)
    oscuro = B.m('AV_Hueco_Oscuro', '#2a2622', 0.9); azul = B.m('AV_Puerta_Azul', '#2f6fb0', 0.7)
    piedra = B.m('AV_Piedra_Fogon', '#7d756b', 0.95); barro = B.m('AV_Barro_Olla', '#8a4b2d', 0.8)
    hamaca = B.m('AV_Tela_Hamaca', '#e0533d', 0.9)
    FZ = 0.9
    for x in (-2.9, 0, 2.9):
        for y in (-2.2, 0.6, 3.6):
            B.cyl(pil, 0.13, 0.12, FZ + 0.6, (x, y, -0.6), seg=6)
    B.box(piso, (6.4, 6.3, 0.18), (0, 0.65, FZ - 0.09))
    W, D, HW = 5.6, 4.0, 2.4
    B.box(pared, (W, D, HW), (0, -0.4, FZ + HW / 2))
    for x in [(-W / 2 + 0.25 + k * 0.5) for k in range(12)]:   # tablillas verticales
        B.box(tabla, (0.07, 0.05, HW), (x, -0.4 + D / 2 + 0.02, FZ + HW / 2))
        B.box(tabla, (0.07, 0.05, HW), (x, -0.4 - D / 2 - 0.02, FZ + HW / 2))
    for x in (-W / 2, W / 2):
        for y in (-0.4 - D / 2, -0.4 + D / 2):
            B.box(tabla, (0.14, 0.14, HW), (x, y, FZ + HW / 2))
    B.box(azul, (0.95, 0.1, 1.95), (0.4, 1.62, FZ + 0.98))
    for x in (-1.7,):
        B.box(oscuro, (1.0, 0.1, 0.95), (x, 1.62, FZ + 1.4))
        B.box(vent, (0.5, 0.06, 1.0), (x - 0.78, 1.7, FZ + 1.4), rz=0.5); B.box(vent, (0.5, 0.06, 1.0), (x + 0.78, 1.7, FZ + 1.4), rz=-0.5)
    for sx in (-1, 1):
        B.box(oscuro, (0.1, 0.9, 0.9), (sx * (W / 2 + 0.02), -0.6, FZ + 1.4))
        B.box(vent, (0.06, 0.95, 0.95), (sx * (W / 2 + 0.06), -0.6, FZ + 1.4))
    # techo a dos aguas con cumbrera en X y alero sobre el balcón
    pitch = math.radians(27); half = 2.35
    B.prism(pared, D, 0.12, half * math.tan(pitch), (-W / 2 + 0.06, -0.4, FZ + HW), rz=math.pi / 2)
    B.prism(pared, D, 0.12, half * math.tan(pitch), (W / 2 - 0.06, -0.4, FZ + HW), rz=math.pi / 2)
    for sy in (-1, 1):
        B.box(zinc, (W + 0.9, half / math.cos(pitch) + 0.45, 0.08), (0, -0.4 + sy * (half / 2 + 0.1), FZ + HW + half * math.tan(pitch) / 2), rx=-sy * pitch)
        for k in range(8):
            B.box(zinc, (0.05, half / math.cos(pitch) + 0.45, 0.04), (-2.8 + k * 0.8, -0.4 + sy * (half / 2 + 0.1), FZ + HW + half * math.tan(pitch) / 2 + 0.05), rx=-sy * pitch)
    B.box(zinc, (W + 1.0, 2.0, 0.07), (0, 2.75, FZ + HW - 0.12), rx=math.radians(12))
    for x in (-2.95, 0.0, 2.95):
        B.box(tabla, (0.13, 0.13, HW - 0.05), (x, 3.6, FZ + HW / 2))
    for a, b in (((-3.0, 3.65), (-0.7, 3.65)), ((0.7, 3.65), (3.0, 3.65))):
        B.beam(tabla, (a[0], a[1], FZ + 0.85), (b[0], b[1], FZ + 0.85), 0.07, 0.08)
        for k in range(1, 6):
            t = k / 6; B.box(tabla, (0.05, 0.05, 0.82), (a[0] + (b[0] - a[0]) * t, a[1], FZ + 0.42))
    for k in range(3):
        B.box(piso, (1.3, 0.3, 0.1), (0, 3.95 + k * 0.3, FZ - (k + 1) * FZ / 3.5))
    # hamaca en el balcón
    for k in range(6):
        t0 = k / 6; t1 = (k + 1) / 6
        def hp(t): return (-2.6 + 2.0 * t, 2.9, FZ + 1.6 - 0.9 * math.sin(math.pi * t))
        B.beam(hamaca, hp(t0), hp(t1), 0.75, 0.03)
    # fogón con olla y barril
    for a in (0.0, 2.1, 4.2):
        B.ico(piedra, 0.22, (4.6 + 0.3 * math.cos(a), 2.4 + 0.3 * math.sin(a), 0.15), sub=1)
    B.cyl(barro, 0.26, 0.3, 0.32, (4.6, 2.4, 0.28), seg=10)
    B.cyl(oscuro, 0.35, 0.35, 0.9, (-3.7, -2.0, 0.0), seg=10)
    B.box(piso, (1.4, 0.35, 0.08), (3.9, 0.2, 0.45)); B.box(pil, (0.08, 0.3, 0.45), (3.4, 0.2, 0.22)); B.box(pil, (0.08, 0.3, 0.45), (4.4, 0.2, 0.22))
    ob = B.finish()
    col = [{'tipo': 'caja', 'c': (0, -0.4, FZ + 1.3), 'h': (W / 2, D / 2, 1.3 + FZ / 2)},
           {'tipo': 'piso', 'c': (0, 0.65, 0), 'h': (3.2, 3.15), 'z': FZ},
           {'tipo': 'rampa', 'a': (0, 4.9, 0.0), 'b': (0, 3.7, FZ), 'ancho': 1.3},
           {'tipo': 'cilindro', 'c': (-3.7, -2.0), 'r': 0.4, 'z0': 0, 'z1': 0.9},
           {'tipo': 'cilindro', 'c': (4.6, 2.4), 'r': 0.5, 'z0': 0, 'z1': 0.6}]
    return ob, col

# ------------------------------------------------------------------ Puente colgante (eje X, piso en z=0 en los extremos)
def puente(L, sag=0.85):
    B = Builder('puente')
    tab = B.m('AV_Madera_Tablones', '#9b6b3f', 0.85); tor = B.m('AV_Madera_Torres', '#5e4129', 0.85)
    soga = B.m('AV_Soga', '#d9c49a', 0.95); cable = B.m('AV_Cable_Acero', '#8c9296', 0.4, 0.8)
    conc = B.m('AV_Concreto', '#a7a39b', 0.95)
    hw = 0.95; half = L / 2
    def deck(x): return -sag * (1 - (x / half) ** 2)
    n = int(L / 0.42)
    for k in range(n + 1):
        x = -half + L * k / n; sl = math.atan(2 * sag * x / half ** 2)
        B.box(tab, (0.34, 2 * hw + 0.1, 0.09), (x, 0, deck(x) - 0.045), ry=sl)
    seg = 16
    for sy in (-hw, hw):
        for k in range(seg):
            x0 = -half + L * k / seg; x1 = -half + L * (k + 1) / seg
            B.beam(tor, (x0, sy, deck(x0) - 0.12), (x1, sy, deck(x1) - 0.12), 0.1, 0.14)
    TH = 2.5
    def cab(x): return deck(x) + 1.05 + (TH - 1.05) * (x / half) ** 2
    for sx in (-1, 1):   # torres en A con travesaño y anclajes
        x = sx * (half + 0.15)
        for sy in (-1, 1):
            B.box(tor, (0.26, 0.26, TH + 1.0), (x, sy * (hw + 0.15), TH / 2 - 0.5))
            B.beam(tor, (x - sx * 0.05, sy * (hw + 0.15), 0.3), (x + sx * 0.9, sy * (hw + 0.15), -0.4), 0.12)
        B.box(tor, (0.24, 2 * hw + 0.8, 0.24), (x, 0, TH + 0.35))
        B.beam(tor, (x, -(hw + 0.15), 0.5), (x, hw + 0.15, TH - 0.3), 0.08)
        B.box(conc, (1.2, 2 * hw + 1.2, 0.7), (x + sx * 2.6, 0, -0.1))
        for sy in (-1, 1):
            B.rod(cable, (x, sy * (hw + 0.15), TH + 0.2), (x + sx * 2.4, sy * (hw + 0.1), 0.2), 0.035)
        B.box(tor, (0.6, 2 * hw + 0.3, 0.12), (x + sx * 0.5, 0, -0.04))
    cs = 18
    for sy in (-(hw + 0.08), hw + 0.08):
        for k in range(cs):
            x0 = -half + L * k / cs; x1 = -half + L * (k + 1) / cs
            B.rod(cable, (x0, sy, cab(x0)), (x1, sy, cab(x1)), 0.035)
            B.rod(soga, (x0, sy * 0.98, deck(x0) + 0.55), (x1, sy * 0.98, deck(x1) + 0.55), 0.025, seg=4)
        for k in range(1, int(L)):
            x = -half + k
            B.beam(soga, (x, sy * 0.97, deck(x)), (x, sy, cab(x)), 0.025)
    ob = B.finish()
    col = [{'tipo': 'puente', 'a': (-half, 0, 0), 'b': (half, 0, 0), 'ancho': 2 * hw, 'comba': sag},
           {'tipo': 'cilindro', 'c': (-half - 0.15, -(hw + 0.15)), 'r': 0.3, 'z0': -0.5, 'z1': TH + 0.5},
           {'tipo': 'cilindro', 'c': (-half - 0.15, hw + 0.15), 'r': 0.3, 'z0': -0.5, 'z1': TH + 0.5},
           {'tipo': 'cilindro', 'c': (half + 0.15, -(hw + 0.15)), 'r': 0.3, 'z0': -0.5, 'z1': TH + 0.5},
           {'tipo': 'cilindro', 'c': (half + 0.15, hw + 0.15), 'r': 0.3, 'z0': -0.5, 'z1': TH + 0.5}]
    return ob, col

# ------------------------------------------------------------------ Muelle (origen al nivel del mar, entra al mar por +Y)
def muelle(L=32.0, Z=1.3):
    B = Builder('muelle')
    tab = B.m('AV_Madera_Muelle', '#b08a5b', 0.85); pil = B.m('AV_Pilote_Oscuro', '#4a3727', 0.9)
    bita = B.m('AV_Metal_Bita', '#3b3f44', 0.4, 0.7); luz = B.m('AV_Farol_Luz', '#ffd98a', 0.3, emit='#ffcf6b', strength=5)
    soga = B.m('AV_Soga', '#d9c49a', 0.95); caja = B.m('AV_Caja_Pesca', '#3f7fb0', 0.8)
    W = 3.0; n = int(L / 0.4)
    for k in range(n):
        y = 0.2 + k * 0.4
        B.box(tab, (W, 0.34, 0.07), (0, y, Z - 0.035), rz=0.0 if k % 3 else 0.01)
    for sx in (-1.25, 0, 1.25):
        B.box(pil, (0.16, L, 0.22), (sx, L / 2, Z - 0.18))
    for k in range(9):
        y = 0.6 + k * (L - 1.2) / 8
        for sx in (-1.45, 1.45):
            B.cyl(pil, 0.17, 0.17, Z + 3.6, (sx, y, -3.5), seg=8)
        B.box(pil, (3.1, 0.16, 0.2), (0, y, Z - 0.35))
    # rampa a la arena
    B.box(tab, (2.4, 3.0, 0.08), (0, -1.3, Z * 0.55 - 0.1), rx=math.radians(-17))
    for y in (6.0, 14.0, 22.0, 30.0):
        for sx in (-1.3, 1.3):
            B.cyl(bita, 0.12, 0.12, 0.35, (sx, y, Z), seg=8); B.cyl(bita, 0.17, 0.17, 0.06, (sx, y, Z + 0.35), seg=8)
    # baranda en el último tramo y farol
    for sx in (-1.45, 1.45):
        B.beam(pil, (sx, L - 7.0, Z + 1.0), (sx, L - 0.2, Z + 1.0), 0.08)
        for k in range(8):
            B.box(pil, (0.09, 0.09, 1.0), (sx, L - 7.0 + k * 0.97, Z + 0.5))
    B.beam(pil, (-1.45, L - 0.2, Z + 1.0), (1.45, L - 0.2, Z + 1.0), 0.08)
    B.cyl(bita, 0.07, 0.06, 3.0, (1.3, L - 1.0, Z), seg=8)
    B.box(bita, (0.5, 0.06, 0.06), (1.12, L - 1.0, Z + 2.95))
    B.box(luz, (0.28, 0.28, 0.4), (0.9, L - 1.0, Z + 2.75)); B.cyl(bita, 0.24, 0.02, 0.18, (0.9, L - 1.0, Z + 2.95), seg=8)
    # escalera al agua, cajas y soga enrollada
    for k in range(5):
        B.box(bita, (0.7, 0.05, 0.05), (-0.6, L + 0.12, Z - 0.3 - k * 0.35))
    for sx in (-0.95, -0.25):
        B.box(bita, (0.05, 0.05, 2.0), (sx, L + 0.12, Z - 1.0))
    B.box(caja, (0.7, 0.5, 0.42), (-0.9, 9.0, Z + 0.21)); B.box(caja, (0.6, 0.45, 0.38), (-0.85, 9.1, Z + 0.61), rz=0.3)
    for k in range(10):
        a0 = 2 * math.pi * k / 10; a1 = 2 * math.pi * (k + 1) / 10
        B.rod(soga, (0.9 + 0.3 * math.cos(a0), 18 + 0.3 * math.sin(a0), Z + 0.06), (0.9 + 0.3 * math.cos(a1), 18 + 0.3 * math.sin(a1), Z + 0.06), 0.06, seg=4)
    ob = B.finish()
    col = [{'tipo': 'piso', 'c': (0, L / 2, 0), 'h': (W / 2, L / 2), 'z': Z},
           {'tipo': 'rampa', 'a': (0, -2.8, Z * 0.1), 'b': (0, 0.1, Z), 'ancho': 2.4}]
    for y in (L - 7.0, L - 0.2):
        pass
    col.append({'tipo': 'caja', 'c': (-1.45, L - 3.6, Z + 0.5), 'h': (0.08, 3.5, 0.5)})
    col.append({'tipo': 'caja', 'c': (1.45, L - 3.6, Z + 0.5), 'h': (0.08, 3.5, 0.5)})
    col.append({'tipo': 'caja', 'c': (0, L - 0.2, Z + 0.5), 'h': (1.45, 0.08, 0.5)})
    return ob, col

# ------------------------------------------------------------------ Ruinas de la hacienda (respaldo para el edificio de Kelvin)
def ruinas():
    import random
    rnd = random.Random(7)
    B = Builder('ruinas')
    pie = B.m('AV_Piedra_Ruina', '#a39885', 0.95); lad = B.m('AV_Ladrillo_Ruina', '#a5573d', 0.9)
    mus = B.m('AV_Musgo_Ruina', '#4f7a3a', 1.0)
    walls = [((-7, -4.5), (7, -4.5)), ((7, -4.5), (7, 4.5)), ((7, 4.5), (1.2, 4.5)), ((-1.2, 4.5), (-7, 4.5)), ((-7, 4.5), (-7, -4.5)),
             ((-1, -4.5), (-1, 1.5))]
    col = []
    for a, b in walls:
        L = math.dist(a, b); n = max(1, int(L / 1.6))
        for k in range(n):
            t0 = k / n; t1 = (k + 1) / n
            h = rnd.choice((0.6, 1.2, 2.2, 3.0, 3.6, 1.8)) if rnd.random() > 0.15 else 0.0
            if h == 0: continue
            p0 = (a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0); p1 = (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)
            ang = math.atan2(b[1] - a[1], b[0] - a[0]); cx = (p0[0] + p1[0]) / 2; cy = (p0[1] + p1[1]) / 2
            B.box(pie, (L / n + 0.02, 0.6, h), (cx, cy, h / 2), rz=ang)
            B.box(lad, (L / n * 0.6, 0.62, 0.25), (cx, cy, h * 0.55), rz=ang)
            if h > 1.5: B.box(mus, (L / n * 0.9, 0.66, 0.12), (cx, cy, h + 0.02), rz=ang)
            col.append({'tipo': 'caja', 'c': (cx, cy, h / 2), 'h': (L / n / 2, 0.3, h / 2), 'rz': ang})
    # arco de la entrada
    B.box(pie, (0.7, 0.7, 3.4), (-1.6, 4.5, 1.7)); B.box(pie, (0.7, 0.7, 3.4), (1.6, 4.5, 1.7))
    for k in range(7):
        a0 = math.pi * k / 7; a1 = math.pi * (k + 1) / 7
        B.beam(lad, (1.6 * math.cos(a0), 4.5, 3.4 + 1.25 * math.sin(a0)), (1.6 * math.cos(a1), 4.5, 3.4 + 1.25 * math.sin(a1)), 0.6, 0.5)
    col += [{'tipo': 'cilindro', 'c': (-1.6, 4.5), 'r': 0.5, 'z0': 0, 'z1': 4.8}, {'tipo': 'cilindro', 'c': (1.6, 4.5), 'r': 0.5, 'z0': 0, 'z1': 4.8}]
    # chimenea del trapiche y bloques caídos
    B.cyl(lad, 1.1, 0.8, 7.5, (4.5, -8.5, 0), seg=10); B.cyl(pie, 1.3, 1.3, 0.8, (4.5, -8.5, 0), seg=10)
    col.append({'tipo': 'cilindro', 'c': (4.5, -8.5), 'r': 1.3, 'z0': 0, 'z1': 7.5})
    for k in range(9):
        B.box(pie, (rnd.uniform(0.4, 0.9), rnd.uniform(0.4, 0.8), rnd.uniform(0.3, 0.6)),
              (rnd.uniform(-9, 9), rnd.uniform(-7, 7), 0.2), rz=rnd.uniform(0, 3), rx=rnd.uniform(-0.3, 0.3))
    ob = B.finish()
    return ob, col
