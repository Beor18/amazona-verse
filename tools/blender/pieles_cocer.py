# Pieles de especie · cuece el color de UNA de las 22 cotorras de Kelvin sobre el UV de la Vittata del juego.
# El modelo y el rig de Vittata no cambian: solo sale un JPEG de 1024 que el juego pone como mapa de color (src/personaje/pieles.js).
#
# Comando (uno cada vez; lo llama tools/blender/pieles_cocer.sh para las 22):
#   taskpolicy -b nice -n 15 Blender -b "~/Downloads/cotorras/<Especie>.blend" --python tools/blender/pieles_cocer.py -- <id> [salida.jpg]
#   <id>: nombre del archivo de salida (assets/textures/pieles/<id>.jpg), p. ej. aestiva u ochrocephala_panamensis.
#
# Entradas (solo lectura; nunca se guardan):
#   - el .blend de la especie: malla «Amazon parrots» (11 551 vértices, UV propio, Color 4096 empaquetado);
#   - 04_Blender_3D/vittata_rig_final.blend (o AV_VITTATA_RIG): malla «Vittata» del juego con su UV (la del vittata.glb).
# Cómo:
#   1. Fuente en reposo: sin Armature (el archivo abre en pose de vuelo), sin Subdivision y sin shape keys (nivel 0, el UV tal
#      como se pintó). Su Base Color se lleva a una Emission (si hay nodos entre la imagen y el BSDF, se respetan).
#   2. Alineación: la malla nueva y la original de Kelvin (cotorrofiver) comparten coordenadas locales (misma caja, 0,57 % de
#      diferencia media de superficie). La Vittata del juego es esa original escalada a 1,4 m: se lleva la fuente al espacio del
#      juego con la caja (escala uniforme + traslación, sin giro) y se informa la distancia real entre superficies.
#   3. Cocción Cycles EMIT «selected to active» a 2048 (jaula = extrusión + distancia máxima de rayo) y reducción 2×2 en lineal
#      a 1024 (antialias: Cycles no usa mipmaps al leer la textura de 4096). Margen EXTEND de 16 px a 1024; lo que no es isla
#      se rellena con el color medio (sin bordes negros en los mipmaps).
#   4. Revisión: texels de isla sin impacto (rayos perdidos), salto de color en las costuras del UV (contra el mismo dato de la
#      textura original del juego) y color medio de pico, ojos, anillo y patas. Todo en ../_trabajo_claude/pieles/<id>.json
#      (AV_PIEL_DATOS), fuera del repo; lo lee la lámina (pieles_lamina.py).
# Avisos del informe (docs/equipo/COTORRAS_22_INFORME.md) que corrige: el material de Rhodocorytha se llama «xantholora.001»
# → se busca la textura por la malla, no por el nombre, se renombra en memoria y se compara el hash con el de Xantholora.
import os, sys, json, math, time, hashlib
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

T0 = time.time()
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if not ARGS:
    raise SystemExit('uso: Blender -b <Especie>.blend --python pieles_cocer.py -- <id> [salida.jpg]')
PID = ARGS[0]
OUT = ARGS[1] if len(ARGS) > 1 else os.path.join(REPO, 'assets', 'textures', 'pieles', PID + '.jpg')
DATOS = os.environ.get('AV_PIEL_DATOS') or os.path.normpath(os.path.join(REPO, '..', '_trabajo_claude', 'pieles'))  # informe por especie (fuera del repo)
RIG = os.environ.get('AV_VITTATA_RIG') or os.path.normpath(os.path.join(REPO, '..', '04_Blender_3D', 'vittata_rig_final.blend'))
TAM, COCER = 1024, 2048                 # salida y resolución de cocción (2× para el antialias)
CALIDAD = int(os.environ.get('AV_PIEL_CALIDAD', '85'))
EXTRUSION, RAYO = 0.03, 0.09            # m en el espacio del juego (Vittata de 1,4 m): jaula 3 cm hacia fuera, rayo de 9 cm
SRC_FILE = bpy.data.filepath
INFO = {'id': PID, 'origen': os.path.basename(SRC_FILE), 'avisos': []}
log = lambda *a: print('PIEL', PID, *a, flush=True)


def aviso(t):
    INFO['avisos'].append(t); log('AVISO', t)


# ---------- 1. fuente ----------
def malla_fuente():
    o = bpy.data.objects.get('Amazon parrots')
    if o is None:  # respaldo: la malla con Armature hacia RigCotorra que más vértices tenga (nunca el esculpido CotorroHP)
        cands = [x for x in bpy.data.objects if x.type == 'MESH' and x.name != 'CotorroHP' and any(m.type == 'ARMATURE' for m in x.modifiers)]
        o = max(cands, key=lambda x: len(x.data.vertices))
        aviso('sin «Amazon parrots»; uso %s' % o.name)
    return o


src = malla_fuente()
me_src = src.data
INFO['fuente'] = {'objeto': src.name, 'vertices': len(me_src.vertices), 'uv': [u.name for u in me_src.uv_layers]}
for m in src.modifiers:
    if m.type in ('ARMATURE', 'SUBSURF', 'MULTIRES'):
        m.show_viewport = False; m.show_render = False
if me_src.shape_keys:
    for kb in me_src.shape_keys.key_blocks[1:]:
        kb.value = 0.0
mats = [s.material for s in src.material_slots if s.material]
if len(mats) != 1:
    aviso('la fuente tiene %d materiales' % len(mats))
mat = mats[0]
INFO['material'] = mat.name
stem = os.path.splitext(INFO['origen'])[0].split()[0].lower()
if stem not in mat.name.lower():
    aviso('material «%s» con nombre de otra especie (archivo %s): se renombra en memoria y no se guarda' % (mat.name, INFO['origen']))
    mat.name = stem + '.piel'
nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
link = next((l for l in nt.links if l.to_node == bsdf and l.to_socket.name == 'Base Color'), None)
if link is None:
    raise SystemExit('Base Color sin textura en %s' % mat.name)


def imagen_aguas_arriba(sock):
    seen, pila = set(), [sock.node]
    while pila:
        n = pila.pop()
        if n in seen:
            continue
        seen.add(n)
        if n.type == 'TEX_IMAGE' and n.image:
            return n
        pila += [l.from_node for l in nt.links if l.to_node == n]
    return None


tex = imagen_aguas_arriba(link.from_socket)
if tex is None:
    raise SystemExit('no encuentro la imagen del Base Color')
img = tex.image
img_md5 = hashlib.md5(bytes(img.packed_file.data)).hexdigest() if img.packed_file else None
INFO['color'] = {'imagen': img.name, 'tam': list(img.size), 'md5': img_md5, 'nodos_entre': link.from_node.type != 'TEX_IMAGE'}
log('fuente', src.name, len(me_src.vertices), 'v · material', mat.name, '· color', img.name, tuple(img.size), img_md5)
if img.size[0] > COCER:  # misma lectura que una textura con mipmap del nivel que se va a cocer
    img.scale(COCER, COCER)
tex.interpolation = 'Cubic'
emi = nt.nodes.new('ShaderNodeEmission')
nt.links.new(link.from_socket, emi.inputs['Color'])
outn = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output)
for l in list(outn.inputs['Surface'].links):
    nt.links.remove(l)
nt.links.new(emi.outputs['Emission'], outn.inputs['Surface'])
if 'Displacement' in outn.inputs:
    for l in list(outn.inputs['Displacement'].links):
        nt.links.remove(l)

# ---------- 2. destino: la Vittata del juego (copia en memoria del .blend del rig) ----------
with bpy.data.libraries.load(RIG, link=False) as (src_lib, dst_lib):
    dst_lib.objects = ['Vittata']
vit = dst_lib.objects[0]
if vit is None:
    raise SystemExit('no hay objeto Vittata en ' + RIG)
bpy.context.scene.collection.objects.link(vit)
vit.parent = None
for m in list(vit.modifiers):
    vit.modifiers.remove(m)
if vit.data.shape_keys:
    for kb in vit.data.shape_keys.key_blocks[1:]:
        kb.value = 0.0
vit.matrix_world = Matrix.Identity(4)
me_v = vit.data
INFO['destino'] = {'vertices': len(me_v.vertices), 'uv': me_v.uv_layers.active.name, 'materiales': [m.name for m in me_v.materials]}


def cos(me):
    a = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', a); return a.reshape(-1, 3)


cs, cv = cos(me_src), cos(me_v)
smin, smax, vmin, vmax = cs.min(0), cs.max(0), cv.min(0), cv.max(0)
esc = (vmax - vmin) / (smax - smin)
k = float(esc.mean())
if esc.max() / esc.min() > 1.01:
    aviso('las cajas no son proporcionales: %s' % np.round(esc, 4).tolist())
tr = (vmin + vmax) / 2 - k * (smin + smax) / 2
src.parent = None
src.matrix_world = Matrix.Translation(Vector(tr.tolist())) @ Matrix.Diagonal((k, k, k, 1.0))
INFO['alineacion'] = {'escala': round(k, 6), 'escala_ejes': np.round(esc, 5).tolist(), 'traslacion': np.round(tr, 5).tolist()}

# distancia real entre superficies (vértices del juego → superficie de la fuente)
dg = bpy.context.evaluated_depsgraph_get()
bm = bmesh.new(); bm.from_object(src, dg); bm.transform(src.matrix_world)
bvh_src = BVHTree.FromBMesh(bm); bm.free()
d = np.array([bvh_src.find_nearest(Vector(p))[3] for p in cv])
diag = float(np.linalg.norm(vmax - vmin))
INFO['distancia'] = {'media_pct': round(float(d.mean() / diag * 100), 3), 'p95_pct': round(float(np.percentile(d, 95) / diag * 100), 3),
                     'max_cm': round(float(d.max() * 100), 2), 'p95_cm': round(float(np.percentile(d, 95) * 100), 2), 'diag_m': round(diag, 4)}
log('alineación', INFO['alineacion'], 'distancia', INFO['distancia'])
if np.percentile(d, 99) > RAYO * 0.8:
    aviso('el 1 %% de la superficie está a más de %.1f cm: subir RAYO' % (np.percentile(d, 99) * 100))

# ---------- 3. cocción ----------
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 1
sc.cycles.use_denoising = False
sc.render.bake.use_selected_to_active = True
sc.render.bake.cage_extrusion = EXTRUSION
sc.render.bake.max_ray_distance = RAYO
sc.render.bake.margin = 32
sc.render.bake.margin_type = 'EXTEND'
sc.render.bake.use_clear = False
sc.render.threads_mode = 'FIXED'
sc.render.threads = 2
bake = bpy.data.images.new('piel_bake', COCER, COCER, alpha=True, float_buffer=True)
bake.colorspace_settings.name = 'Linear Rec.709'
bake.pixels.foreach_set(np.tile(np.array([1.0, 0.0, 1.0, 0.0], np.float32), COCER * COCER))  # centinela: alfa 0
for i, m in enumerate(list(me_v.materials)):  # materiales propios del destino (copia en memoria)
    mm = m.copy(); me_v.materials[i] = mm
    n = mm.node_tree.nodes.new('ShaderNodeTexImage'); n.image = bake
    mm.node_tree.nodes.active = n
bpy.ops.object.select_all(action='DESELECT')
src.select_set(True); vit.select_set(True)
bpy.context.view_layer.objects.active = vit
t = time.time()
bpy.ops.object.bake(type='EMIT')
INFO['segundos_coccion'] = round(time.time() - t, 1)
log('cocido en', INFO['segundos_coccion'], 's')
px = np.array(bake.pixels[:], np.float32).reshape(COCER, COCER, 4)

# cobertura del UV del destino (rasterizada a 2048) para contar rayos perdidos
me_v.calc_loop_triangles()
uvd = me_v.uv_layers.active.data
TRI = np.array([[uvd[l].uv[:] for l in t.loops] for t in me_v.loop_triangles], np.float64)
TMAT = np.array([t.material_index for t in me_v.loop_triangles])


def raster(W, tris):
    M = np.zeros((W, W), bool)
    for P in tris * W:
        x0, y0 = np.maximum(np.floor(P.min(0)).astype(int), 0); x1, y1 = np.minimum(np.ceil(P.max(0)).astype(int), W - 1)
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = P
        den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(den) < 1e-12:
            continue
        l1 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / den; l2 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / den
        M[y0:y1 + 1, x0:x1 + 1] |= (l1 >= 0) & (l2 >= 0) & (1 - l1 - l2 >= 0)
    return M


isla = raster(COCER, TRI)
perdidos = isla & (px[..., 3] < 0.5)
INFO['rayos_perdidos'] = {'texels': int(perdidos.sum()), 'pct_isla': round(float(perdidos.sum() / max(1, isla.sum()) * 100), 3)}
log('rayos perdidos', INFO['rayos_perdidos'])
# reducción 2×2 en lineal → 1024; lo cubierto (isla + margen) pesa por su alfa
f = COCER // TAM
a = px[..., 3:4]
num = (px[..., :3] * a).reshape(TAM, f, TAM, f, 3).sum((1, 3)); den = a.reshape(TAM, f, TAM, f, 1).sum((1, 3))
lin = np.where(den > 0, num / np.maximum(den, 1e-6), 0)
cub = den[..., 0] > 0
isla1 = raster(TAM, TRI)
media = lin[isla1].mean(0)
lin[~cub] = media
INFO['sin_cubrir_pct'] = round(float((~cub).mean() * 100), 2)


def a_srgb(x):
    x = np.clip(x, 0, 1); return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


srgb = a_srgb(lin)

# ---------- 4. revisión: costuras, pico, ojos y patas ----------
def muestra(im, uv):  # bilineal, uv en [0,1] (fila 0 = v 0, como Blender)
    W = im.shape[0]; x = np.clip(uv[:, 0] * W - 0.5, 0, W - 1.001); y = np.clip(uv[:, 1] * W - 0.5, 0, W - 1.001)
    x0, y0 = x.astype(int), y.astype(int); fx, fy = (x - x0)[:, None], (y - y0)[:, None]
    return (im[y0, x0] * (1 - fx) * (1 - fy) + im[y0, x0 + 1] * fx * (1 - fy) + im[y0 + 1, x0] * (1 - fx) * fy + im[y0 + 1, x0 + 1] * fx * fy)


bmv = bmesh.new(); bmv.from_mesh(me_v); uvl = bmv.loops.layers.uv.active
pares = []
for e in bmv.edges:
    if len(e.link_loops) != 2:
        continue
    va, vb = e.verts
    lados = []
    for l in e.link_loops:  # UV de los dos extremos de la arista en cada cara, por vértice
        uv = {l.vert: l[uvl].uv.copy(), l.link_loop_next.vert: l.link_loop_next[uvl].uv.copy()}
        lados.append((uv[va], uv[vb]))
    (a1, b1), (a2, b2) = lados
    if (a1 - a2).length > 1e-5 or (b1 - b2).length > 1e-5:
        pares.append((a1[:], b1[:], a2[:], b2[:]))
bmv.free()
INFO['costuras'] = {'aristas': len(pares)}
if pares:
    P = np.array(pares)
    ts = np.linspace(0.2, 0.8, 4)[:, None, None]
    lado1 = (P[None, :, 0] * (1 - ts) + P[None, :, 1] * ts).reshape(-1, 2)
    lado2 = (P[None, :, 2] * (1 - ts) + P[None, :, 3] * ts).reshape(-1, 2)

    def salto(im):
        dd = np.abs(muestra(im, lado1) - muestra(im, lado2)).mean(1) * 255
        return {'media': round(float(dd.mean()), 2), 'p95': round(float(np.percentile(dd, 95)), 2), 'max': round(float(dd.max()), 1)}
    INFO['costuras']['salto_piel'] = salto(srgb)
    # referencia: la textura de la Vittata del juego (la misma que carga o6_final.py), con su mismo UV
    ref = os.path.normpath(os.path.join(REPO, '..', '04_Blender_3D', 'cotorro_original', 'cotorro', 'cuerpo_Base_color_mejorada.png'))
    orig = bpy.data.images.load(ref, check_existing=True) if os.path.exists(ref) else None
    if orig is not None and orig.size[0] > 0:
        o_px = np.array(orig.pixels[:], np.float32).reshape(orig.size[1], orig.size[0], orig.channels)[..., :3]
        INFO['costuras']['salto_vittata_original'] = salto(o_px)
    log('costuras', INFO['costuras'])


# zonas: pico (material del pico), ojos y anillo (alrededor de los ojos de vittata_mounts.json), patas (debajo del cuerpo)
def color_hex(c):
    return '#%02x%02x%02x' % tuple(int(round(float(x) * 255)) for x in np.clip(c, 0, 1))


zonas = {}
beak_i = [i for i, m in enumerate(me_v.materials) if m.name.startswith('Material.001')]
if beak_i:
    mk = raster(TAM, TRI[TMAT == beak_i[0]])
    zonas['pico'] = color_hex(srgb[mk].mean(0)) if mk.any() else None
try:
    mounts = json.load(open(os.path.join(REPO, 'assets', 'models', 'vittata_mounts.json')))
    eyes = mounts.get('eyes') or {}
except Exception:
    eyes = {}
# posición 3D de cada texel (baricéntrica sobre el triángulo del UV) para medir por zonas del cuerpo
pos3 = np.full((TAM, TAM, 3), np.nan)
V = cv
for t, P in zip(me_v.loop_triangles, TRI * TAM):
    x0, y0 = np.maximum(np.floor(P.min(0)).astype(int), 0); x1, y1 = np.minimum(np.ceil(P.max(0)).astype(int), TAM - 1)
    if x1 < x0 or y1 < y0:
        continue
    xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    (ax, ay), (bx, by), (cx, cy) = P
    den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(den) < 1e-12:
        continue
    l1 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / den; l2 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / den; l3 = 1 - l1 - l2
    ins = (l1 >= 0) & (l2 >= 0) & (l3 >= 0)
    if not ins.any():
        continue
    vv = V[[me_v.loops[l].vertex_index for l in t.loops]]
    sub = pos3[y0:y1 + 1, x0:x1 + 1]
    sub[ins] = l1[ins, None] * vv[0] + l2[ins, None] * vv[1] + l3[ins, None] * vv[2]
ok = ~np.isnan(pos3[..., 0])
if eyes:
    # vittata_mounts.json está en el espacio del glTF (Y arriba, Z adelante); la malla de Blender es Z arriba, -Y adelante
    E = [np.array([e[0], -e[2], e[1]]) for e in eyes.values()]
    de = np.min([np.linalg.norm(np.nan_to_num(pos3) - e, axis=-1) for e in E], axis=0)
    # globo del ojo: caras cuyo UV cae en los discos de los ojos de la textura del juego (los mismos de o3_build.py)
    IRIS = np.array([(0.415, 0.326), (0.186, 0.326)])
    tri_uvc = TRI.mean(1)
    globo_t = np.min(np.linalg.norm(tri_uvc[:, None, :] - IRIS[None], axis=-1), axis=1) < 0.085
    globo = raster(TAM, TRI[globo_t]) & ok
    r_e = float(np.percentile(de[globo], 95)) if globo.any() else 0.04
    zonas['ojo'] = color_hex(srgb[globo].mean(0)) if globo.any() else None
    # anillo: piel de la cabeza justo alrededor del globo (lo que se ve al parpadear); lo usan los párpados en pieles.js
    an = ok & ~globo & (de >= r_e) & (de < r_e + 0.025)
    zonas['anillo'] = color_hex(np.median(srgb[an], 0)) if an.any() else None
    zonas['radio_globo_cm'] = round(r_e * 100, 2)
zonas['patas'] = color_hex(srgb[ok & (pos3[..., 2] < 0.16)].mean(0)) if (ok & (pos3[..., 2] < 0.16)).any() else None
zonas['cuerpo'] = color_hex(srgb[isla1].mean(0))
INFO['zonas'] = zonas
log('zonas', zonas)

# ---------- salida ----------
os.makedirs(os.path.dirname(OUT), exist_ok=True)
rgba = np.dstack([srgb, np.ones((TAM, TAM, 1))]).astype(np.float32)
outimg = bpy.data.images.new('piel_' + PID, TAM, TAM, alpha=False)
outimg.colorspace_settings.name = 'sRGB'
outimg.pixels.foreach_set(rgba.ravel())
outimg.filepath_raw = OUT
outimg.file_format = 'JPEG'
outimg.save(filepath=OUT, quality=CALIDAD)
INFO['salida'] = {'archivo': os.path.relpath(OUT, REPO), 'bytes': os.path.getsize(OUT), 'tam': TAM, 'calidad': CALIDAD}
INFO['segundos'] = round(time.time() - T0, 1)
os.makedirs(DATOS, exist_ok=True)
json.dump(INFO, open(os.path.join(DATOS, PID + '.json'), 'w'), indent=1, ensure_ascii=False)
log('OK', INFO['salida'], 'en', INFO['segundos'], 's')
# Nada se guarda: el .blend de origen queda tal cual (el proceso termina sin wm.save).
