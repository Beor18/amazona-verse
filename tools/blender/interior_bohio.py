"""BM4 · interior de bohío de Villa Raíz (hamaca, fogón, 3 vasijas, cesto, banco), kit Savage a ×1,75.
Uso:  Blender -b --factory-startup --python tools/blender/interior_bohio.py
Salida: assets/models/entorno/bohio_interior.glb (+ _glb.js), bohio_interior_zonas.json, atlas en assets/tex/entorno.
Z arriba en Blender (Y arriba en el glTF). Pivote en el centro del suelo. Puerta hacia -Y de Blender.
Atlas propio 1024: 4 baldosas de 512 con texturas del kit Savage (KB3D): tablas, madera labrada, tela, barro.
"""
import bpy, bmesh, math, os, sys, json
import numpy as np
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import entorno_lib as L

ROOT = os.path.expanduser('~/AmazonaVerse/juego_api')
L.MODELS = os.path.join(ROOT, 'assets/models/entorno'); L.TEX = os.path.join(ROOT, 'assets/tex/entorno')
KB = os.path.expanduser('~/AmazonaVerse/04_Mapa_3D/AV3DMaxExportBuildings/Torrents/KitBash3D/Savage/Blender/KB3DTextures')
S = 1.75                    # escala de Villa Raíz (carril M)
R = 1.37 * S                # radio interior ≈ 2,4 m
TILES = {'tablas': (0, 1, 'KB3D_WoodPlanks_diffuse.jpg'), 'labrada': (1, 1, 'KB3D_WoodHewn_Diffuse.jpg'),
         'tela': (0, 0, 'KB3D_TarpFabricDamaged_diffuse.jpg'), 'barro': (1, 0, 'KB3D_MudRocky_Diffuse.jpg')}

# ── atlas ──
L.reset()
atlas = np.zeros((1024, 1024, 3), np.float32)
for k, (cx, cy, fn) in TILES.items():
    a = L.load_px(os.path.join(KB, fn))[..., :3]
    h, w = a.shape[:2]; s = min(h, w)
    a = a[:s, :s]; ii = (np.arange(512) * s // 512)
    t = a[ii][:, ii]
    if k == 'barro': t = t.mean(axis=2, keepdims=True) * np.array([1.75, 1.0, 0.62])      # terracota
    if k == 'tela': t = t * np.array([1.0, 0.85, 0.7])
    atlas[cy * 512:(cy + 1) * 512, cx * 512:(cx + 1) * 512] = np.clip(t, 0, 1)
atlas = atlas[::-1]  # fila 0 de la imagen = arriba; cy=0 abajo en UV
tex_path = os.path.join(L.TEX, 'bohio_interior_atlas.jpg')
L.save_jpg(atlas, tex_path, quality=82)

# ── malla ──
bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UV')
def tile_uv(k, u, v):
    cx, cy, _ = TILES[k]
    return ((cx + 0.06 + 0.88 * (u % 1.0)) / 2, (cy + 0.06 + 0.88 * (v % 1.0)) / 2)
def quad(vs, k, rep=1.0):
    vv = [bm.verts.new(p) for p in vs]
    f = bm.faces.new(vv)
    uv = [(0, 0), (1, 0), (1, 1), (0, 1)] if len(vv) == 4 else [(0.5 + 0.5 * math.cos(i / len(vv) * math.tau), 0.5 + 0.5 * math.sin(i / len(vv) * math.tau)) for i in range(len(vv))]
    for l, (u, v) in zip(f.loops, uv):
        l[uvl].uv = tile_uv(k, u * rep, v * rep)
    return f
def box(c, sz, k, rot=0.0, rep=1.0):
    cx, cy, cz = c; hx, hy, hz = sz[0] / 2, sz[1] / 2, sz[2] / 2
    co, si = math.cos(rot), math.sin(rot)
    P = lambda x, y, z: (cx + x * co - y * si, cy + x * si + y * co, cz + z)
    p = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz), P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)]
    for idx in ((4, 5, 6, 7), (3, 2, 1, 0)[::-1] and (0, 3, 2, 1), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        quad([p[i] for i in idx], k, rep)
def lathe(c, prof, k, seg=12, rep=1.0, cap_top=False):
    """prof: [(radio, altura)] de abajo arriba; cierra el fondo."""
    cx, cy, cz = c
    ring = lambda r, z, i: (cx + r * math.cos(i / seg * math.tau), cy + r * math.sin(i / seg * math.tau), cz + z)
    for j in range(len(prof) - 1):
        for i in range(seg):
            (r0, z0), (r1, z1) = prof[j], prof[j + 1]
            f = quad([ring(r0, z0, i), ring(r0, z0, i + 1), ring(r1, z1, i + 1), ring(r1, z1, i)][::-1], k, rep)
            for l, (u, v) in zip(f.loops, [(i / seg, j / (len(prof) - 1)), ((i + 1) / seg, j / (len(prof) - 1)), ((i + 1) / seg, (j + 1) / (len(prof) - 1)), (i / seg, (j + 1) / (len(prof) - 1))][::-1]):
                l[uvl].uv = tile_uv(k, u * rep, v)
    r, z = prof[0]
    for i in range(seg):
        f = bm.faces.new([bm.verts.new((cx, cy, cz + z)), bm.verts.new(ring(r, z, i + 1)), bm.verts.new(ring(r, z, i))])
        for l in f.loops: l[uvl].uv = tile_uv(k, 0.5, 0.5)
def pol(r, a, z=0.0): return (r * math.cos(a), r * math.sin(a), z)

# suelo de tierra apisonada (disco) y aro de tablas en el umbral
lathe((0, 0, 0), [(R, 0.0), (R, 0.0)], 'barro', seg=20)  # tapa (fondo); superficie hacia arriba abajo
for i in range(20):
    a0, a1 = i / 20 * math.tau, (i + 1) / 20 * math.tau
    if abs(math.sin((a0 + a1) / 2 + math.pi / 2)) < 0.0 and False: pass
    f = bm.faces.new([bm.verts.new((0, 0, 0.005)), bm.verts.new((R * math.cos(a0), R * math.sin(a0), 0.005)), bm.verts.new((R * math.cos(a1), R * math.sin(a1), 0.005))][::-1])
    for l in f.loops: l[uvl].uv = tile_uv('barro', 0.5, 0.5)
# 8 vigas (sin poste central: el fogón va al centro) hacia la pared (tejado visto desde dentro)
H = 3.1 * S * 0.62
for i in range(8):
    a = i / 8 * math.tau + 0.2
    x0, y0 = 0.6 * math.cos(a), 0.6 * math.sin(a)
    x1, y1 = (R - 0.05) * math.cos(a), (R - 0.05) * math.sin(a)
    n = 6
    p0, p1 = (x0, y0, H), (x1, y1, 2.05)
    mid = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2)
    ln = math.dist(p0, p1)
    # viga como caja alargada: aproximada por dos tramos
    for t0, t1 in ((0, 0.5), (0.5, 1)):
        q0 = tuple(p0[j] + (p1[j] - p0[j]) * t0 for j in range(3)); q1 = tuple(p0[j] + (p1[j] - p0[j]) * t1 for j in range(3))
        w = 0.05
        nx, ny = -math.sin(a) * w, math.cos(a) * w
        quad([(q0[0] - nx, q0[1] - ny, q0[2]), (q0[0] + nx, q0[1] + ny, q0[2]), (q1[0] + nx, q1[1] + ny, q1[2]), (q1[0] - nx, q1[1] - ny, q1[2])], 'labrada')
        quad([(q0[0] + nx, q0[1] + ny, q0[2]), (q0[0] - nx, q0[1] - ny, q0[2]), (q1[0] - nx, q1[1] - ny, q1[2]), (q1[0] + nx, q1[1] + ny, q1[2])], 'labrada')

# hamaca: dos postes y una tela con caída (lado +X/+Y)
hc = (0.0, 1.45, 0.0)
for sx in (-1, 1):
    lathe((sx * 1.15, 1.45 + 0.0, 0), [(0.07, 0), (0.06, 1.1), (0.07, 1.5)], 'labrada', seg=6)
nu, nv = 14, 4
rows = []
for j in range(nv + 1):
    row = []
    for i in range(nu + 1):
        u = i / nu; x = -1.15 + 2.3 * u
        sag = 1.35 - 0.62 * math.sin(math.pi * u) ** 1.0
        w = 0.34 * math.sin(math.pi * (j / nv)) ** 0.6 + 0.02
        y = 1.45 + (j / nv - 0.5) * 0.78 * (0.55 + 0.45 * math.sin(math.pi * u))
        z = sag + 0.16 * (1 - abs(2 * j / nv - 1)) ** 2 * -1 * math.sin(math.pi * u) + 0.12 * (abs(2 * j / nv - 1)) * math.sin(math.pi * u)
        row.append((x, y, z))
    rows.append(row)
for j in range(nv):
    for i in range(nu):
        f = quad([rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]], 'tela')
        f2 = quad([rows[j][i], rows[j + 1][i], rows[j + 1][i + 1], rows[j][i + 1]], 'tela')
        for ff, (a, b) in ((f, (i, j)), (f2, (i, j))):
            for l, (du, dv) in zip(ff.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
                l[uvl].uv = tile_uv('tela', (a + du) / nu, (b + dv) / nv)

# fogón: aro de 9 piedras + leña cruzada (centro -Y/+X leve)
fc = (0.0, -0.1, 0.0)
for i in range(9):
    a = i / 9 * math.tau
    lathe((fc[0] + 0.42 * math.cos(a), fc[1] + 0.42 * math.sin(a), 0), [(0.14, 0), (0.17, 0.08), (0.13, 0.19), (0.05, 0.22)], 'barro', seg=6)
for i, a in enumerate((0.2, 1.3, 2.4, 3.5)):
    box((fc[0], fc[1], 0.06 + i * 0.045), (0.7, 0.07, 0.07), 'labrada', rot=a)
# vasijas (3, a la izquierda del acceso, junto a la pared -X)
vas = [((-1.65, 0.85), 0.34, 0.62), ((-1.85, 0.25), 0.26, 0.5), ((-1.5, 1.45), 0.22, 0.4)]
for (x, y), r, h in vas:
    lathe((x, y, 0), [(r * 0.55, 0), (r * 0.9, h * 0.18), (r, h * 0.45), (r * 0.82, h * 0.8), (r * 0.55, h * 0.95), (r * 0.65, h)], 'barro', seg=12)
# cesto de tejido (+X, junto a la pared)
cc = (1.75, 0.55)
lathe((cc[0], cc[1], 0), [(0.2, 0), (0.3, 0.12), (0.34, 0.3), (0.32, 0.4)], 'labrada', seg=10, rep=3)
# banco de tablas (-Y/-X, junto al acceso, contra la pared)
bx, by, ang = 1.45, -1.25, -math.atan2(1.25, 1.45) + math.pi / 2
box((bx, by, 0.42), (1.2, 0.34, 0.07), 'tablas', rot=ang - math.pi / 2 + math.pi / 2 - math.pi / 2, rep=1)
for dx in (-0.45, 0.45):
    c, s = math.cos(ang - math.pi / 2), math.sin(ang - math.pi / 2)
    box((bx + dx * c, by + dx * s, 0.2), (0.09, 0.3, 0.4), 'tablas', rot=ang - math.pi / 2)

mesh = bpy.data.meshes.new('bohio_interior'); bm.normal_update(); bm.to_mesh(mesh); bm.free()
ob = bpy.data.objects.new('bohio_interior', mesh); bpy.context.scene.collection.objects.link(ob)
bpy.context.view_layer.objects.active = ob
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.0005); bpy.ops.mesh.quads_convert_to_tris(); bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.shade_flat()
mat = L.mat_tex('bohio_interior', tex_path, None, alpha=False, double=True, rough=0.9)
ob.data.materials.append(mat)
info = L.export_glb(ob, 'bohio_interior')
print(info)
zonas = {
    '_nota': 'Coordenadas en metros en el sistema del glTF (Y arriba; z_gltf = -y_blender). Bohío a x1,75: radio %.2f m, puerta 1,2x2,0 hacia +Z del glTF.' % R,
    'radio': round(R, 2), 'escala': S, 'puerta': {'ancho': 1.2, 'alto': 2.0, 'direccion': [0, 0, 1]},
    'zonas': [
        {'id': 'hamaca', 'centro': [0.0, 0.9, -1.45], 'radio': 1.3, 'accion': 'descansar'},
        {'id': 'fogon', 'centro': [0.0, 0.0, 0.1], 'radio': 0.7, 'accion': 'calentar'},
        {'id': 'vasijas', 'centro': [-1.7, 0.3, -0.85], 'radio': 0.7, 'accion': 'mirar'},
        {'id': 'cesto', 'centro': [1.75, 0.2, -0.55], 'radio': 0.45, 'accion': 'mirar'},
        {'id': 'banco', 'centro': [1.45, 0.2, 1.25], 'radio': 0.7, 'accion': 'sentarse'}]}
json.dump(zonas, open(os.path.join(L.MODELS, 'bohio_interior_zonas.json'), 'w'), indent=1, ensure_ascii=False)
