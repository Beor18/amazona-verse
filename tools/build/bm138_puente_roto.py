# BM138: variante «rota» del puente colgante (assets/models/mapa/puente.glb -> puente_roto.glb + puente_roto_glb.js).
# Blender -b -P tools/build/bm138_puente_roto.py   (desde la raíz del repo). Parte del modelo existente; solo quita y deforma caras.
import bpy, bmesh, math, random, base64
random.seed(138)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="assets/models/mapa/puente.glb")
o = [o for o in bpy.data.objects if o.type == 'MESH'][0]
bm = bmesh.new(); bm.from_mesh(o.data)
mat = lambda f: o.material_slots[f.material_index].material.name
cx = lambda f: sum(v.co.x for v in f.verts) / len(f.verts)
cy = lambda f: sum(v.co.y for v in f.verts) / len(f.verts)
BANDA = 5.0       # tramo central (m a cada lado del centro) donde el puente está roto
LADO = 1          # lado y>0: la cuerda y el cable caídos
def suave(x, r): t = max(0.0, 1 - abs(x) / r); return t * t * (3 - 2 * t)
# 1) tablones: faltan ~70% en el centro, algunos cuelgan de un borde, y el resto del tramo queda con huecos sueltos
quitar = []; colgar = []
tabl = sorted([f for f in bm.faces if mat(f) == 'AV_Madera_Tablones'], key=cx)
grupos = {}
for f in tabl: grupos.setdefault(round(cx(f), 1), []).append(f)   # las 2 triángulos de un tablón comparten x
for k, fs in grupos.items():
    x = abs(k)
    if x > BANDA + 2.5: continue
    r = random.random()
    p_quitar = 0.9 if x < BANDA - 1.5 else (0.55 if x < BANDA else 0.2)
    if r < p_quitar: quitar += fs
    elif x < BANDA + 1.0 and random.random() < 0.6: colgar.append(fs)
bmesh.ops.delete(bm, geom=quitar, context='FACES')
for fs in colgar:
    fs = [f for f in fs if f.is_valid]
    vs = {v for f in fs for v in f.verts}
    if not vs: continue
    borde = random.choice([-1.0, 1.0])               # cuelga de un borde (y=±1), girando sobre el eje X del tablón
    ang = math.radians(random.uniform(55, 80))
    x0 = sum(v.co.x for v in vs) / len(vs)
    for v in vs:
        dy = v.co.y - borde * 1.0
        if abs(dy) < 1e-4: continue
        s = -1.0 if borde > 0 else 1.0                # hacia abajo
        # girar el vector (0, dy, 0) hacia -Z
        v.co.y = borde * 1.0 + dy * math.cos(ang)
        v.co.z = v.co.z - abs(dy) * math.sin(ang)
# 2) cuerda y cable del lado LADO: el cable se rompe en el centro y la cuerda cae hacia el río
rompe = []
for f in bm.faces:
    m = mat(f)
    if m == 'AV_Cable_Acero' and cy(f) * LADO > 0 and abs(cx(f)) < 1.4: rompe.append(f)
bmesh.ops.delete(bm, geom=rompe, context='FACES')
for v in bm.verts:
    if v.co.y * LADO > 0.5 and abs(v.co.x) < BANDA + 3.0 and v.link_faces and any(mat(f) in ('AV_Soga', 'AV_Cable_Acero') for f in v.link_faces):
        v.co.z -= 1.6 * suave(v.co.x, BANDA + 3.0)
        v.co.y += 0.35 * suave(v.co.x, BANDA + 3.0) * LADO     # se abre hacia fuera
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bm.to_mesh(o.data); bm.free()
bpy.ops.export_scene.gltf(filepath="assets/models/mapa/puente_roto.glb", export_format='GLB', export_yup=True, export_apply=True)
b = open("assets/models/mapa/puente_roto.glb", "rb").read()
open("assets/models/mapa/puente_roto_glb.js", "w").write('(window.AV_MAPA_B64=window.AV_MAPA_B64||{})["puente_roto"]="' + base64.b64encode(b).decode() + '"\n')
print("BM138 caras", len(o.data.polygons), "bytes", len(b))
