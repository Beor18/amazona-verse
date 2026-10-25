# Renders de revisión del mapa Cap. 1 (Eevee). Importa los .glb exportados (así se validan) y coloca flora
# de muestra (proxies estilizados, NO el kit final de assets/models/entorno) según las densidades del mapa.
# Uso: Blender -b -P tools/blender/mapa_render.py -- [vistas separadas por coma] [muestras]
#   vistas: aerea, cenital, spawn, mina, playa, cumbre
import bpy, bmesh, numpy as np, os, sys, math, json, random
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import mapa_lib as ML
from mapa_estructuras import material, srgb
from mathutils import Vector, Matrix, Euler
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
MOD = os.path.join(ROOT, 'assets', 'models', 'mapa'); IMG = os.path.join(ROOT, 'docs', 'img')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VIEWS = argv[0].split(',') if argv else ['aerea', 'cenital', 'spawn', 'mina', 'playa']
SAMPLES = int(argv[1]) if len(argv) > 1 else 48

bpy.ops.wm.read_homefile(use_empty=True)
sc = bpy.context.scene
M, H = ML.build()
ML.splat(M, H)
DATA = json.loads(open(os.path.join(ROOT, 'assets', 'data', 'mapa_cap1.js')).read().split('window.AV_MAPA_CAP1 = ', 1)[1].split(';\n', 1)[0])

def imp(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MOD, name + '.glb'))
    return [o for o in bpy.data.objects if o not in before]

# ------------------------------------------------------------------ materiales de vista previa
def node_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    return m, nt

def terrain_material():
    m, nt = node_mat('Vista_Terreno_Splat'); N = nt.nodes; L = nt.links
    out = N.new('ShaderNodeOutputMaterial'); bs = N.new('ShaderNodeBsdfPrincipled'); L.new(bs.outputs[0], out.inputs[0])
    bs.inputs['Roughness'].default_value = 0.92
    ca = N.new('ShaderNodeVertexColor'); ca.layer_name = 'Color'
    sep = N.new('ShaderNodeSeparateColor'); L.new(ca.outputs['Color'], sep.inputs[0])
    geo = N.new('ShaderNodeNewGeometry'); sxyz = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Position'], sxyz.inputs[0])
    tc = N.new('ShaderNodeTexCoord')
    def noise(scale, det=3):
        t = N.new('ShaderNodeTexNoise'); t.inputs['Scale'].default_value = scale; t.inputs['Detail'].default_value = det
        L.new(tc.outputs['Object'], t.inputs['Vector']); return t
    def mix(fac, a, b):
        mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'
        L.new(fac, mx.inputs['Factor'])
        for k, v in ((6, a), (7, b)):
            if isinstance(v, tuple): mx.inputs[k].default_value = v
            else: L.new(v, mx.inputs[k])
        return mx.outputs[2]
    def ramp(fac, c0, c1):
        r = N.new('ShaderNodeValToRGB'); L.new(fac, r.inputs[0])
        r.color_ramp.elements[0].color = srgb(c0); r.color_ramp.elements[1].color = srgb(c1); return r.outputs[0]
    n1 = noise(0.08); n2 = noise(0.6, 4); n3 = noise(0.02, 2)
    grass = ramp(n1.outputs['Fac'], '#4e8a2e', '#7fae3f')
    moss = ramp(n2.outputs['Fac'], '#3d6b2b', '#5c8a3a')
    hi = N.new('ShaderNodeMapRange'); L.new(sxyz.outputs['Z'], hi.inputs[0]); hi.inputs[1].default_value = 55; hi.inputs[2].default_value = 72
    grass = mix(hi.outputs[0], grass, moss)
    dirt = ramp(n2.outputs['Fac'], '#7d5a3a', '#a57d52')
    wv = N.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Z'; wv.inputs['Scale'].default_value = 0.09
    wv.inputs['Distortion'].default_value = 6; wv.inputs['Detail'].default_value = 2; L.new(tc.outputs['Object'], wv.inputs['Vector'])
    strata = N.new('ShaderNodeMath'); strata.operation = 'MULTIPLY'; strata.inputs[1].default_value = 0.6; L.new(wv.outputs['Fac'], strata.inputs[0])
    sm = N.new('ShaderNodeMath'); sm.operation = 'ADD'; L.new(strata.outputs[0], sm.inputs[0]); L.new(n2.outputs['Fac'], sm.inputs[1])
    rock = ramp(sm.outputs[0], '#6f6a62', '#b2aa9b')
    sand = ramp(n1.outputs['Fac'], '#d9c79a', '#efe2bd')
    c = mix(sep.outputs[1], grass, dirt)
    c = mix(sep.outputs[2], c, rock)
    alpha = N.new('ShaderNodeVertexColor'); alpha.layer_name = 'Color'
    c = mix(alpha.outputs['Alpha'], c, sand)
    # bajo el agua: el fondo se tiñe de turquesa a azul con la profundidad
    dep = N.new('ShaderNodeMapRange'); L.new(sxyz.outputs['Z'], dep.inputs[0]); dep.inputs[1].default_value = 0.2; dep.inputs[2].default_value = -7
    wcol = ramp(dep.outputs[0], '#7fd0c4', '#1d5f86')
    dep2 = N.new('ShaderNodeMapRange'); L.new(sxyz.outputs['Z'], dep2.inputs[0]); dep2.inputs[1].default_value = 0.1; dep2.inputs[2].default_value = -1.2
    c = mix(dep2.outputs[0], c, wcol)
    L.new(c, bs.inputs['Base Color'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.25; L.new(n2.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs[0], bs.inputs['Normal'])
    return m

def water_material(sea=False):
    m, nt = node_mat('Vista_Mar' if sea else 'Vista_Agua'); N = nt.nodes; L = nt.links
    out = N.new('ShaderNodeOutputMaterial'); bs = N.new('ShaderNodeBsdfPrincipled'); L.new(bs.outputs[0], out.inputs[0])
    bs.inputs['Base Color'].default_value = srgb('#2a8fa0' if not sea else '#2aa3b5'); bs.inputs['Roughness'].default_value = 0.06
    bs.inputs['Alpha'].default_value = 0.55 if sea else 0.7
    bs.inputs['IOR'].default_value = 1.33
    tc = N.new('ShaderNodeTexCoord'); wave = N.new('ShaderNodeTexNoise'); wave.inputs['Scale'].default_value = 0.35 if sea else 0.8
    wave.inputs['Detail'].default_value = 4; L.new(tc.outputs['Object'], wave.inputs['Vector'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.18; L.new(wave.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs[0], bs.inputs['Normal'])
    if not sea:
        ca = N.new('ShaderNodeVertexColor'); ca.layer_name = 'Color'; sep = N.new('ShaderNodeSeparateColor'); L.new(ca.outputs['Color'], sep.inputs[0])
        mp_ = N.new('ShaderNodeMapping'); mp_.inputs['Scale'].default_value = (2.5, 2.5, 0.25); L.new(tc.outputs['Object'], mp_.inputs['Vector'])
        st = N.new('ShaderNodeTexNoise'); st.inputs['Scale'].default_value = 3.0; st.inputs['Detail'].default_value = 3; L.new(mp_.outputs[0], st.inputs['Vector'])
        ff = N.new('ShaderNodeMath'); ff.operation = 'MULTIPLY'; L.new(sep.outputs[0], ff.inputs[0]); L.new(st.outputs['Fac'], ff.inputs[1])
        ff2 = N.new('ShaderNodeMath'); ff2.operation = 'MULTIPLY_ADD'; ff2.inputs[1].default_value = 1.3; ff2.inputs[2].default_value = 0.0; L.new(ff.outputs[0], ff2.inputs[0])
        mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; L.new(ff2.outputs[0], mx.inputs['Factor'])
        mx.inputs[6].default_value = srgb('#2a8fa0'); mx.inputs[7].default_value = srgb('#f2fbff'); L.new(mx.outputs[2], bs.inputs['Base Color'])
        al = N.new('ShaderNodeMath'); al.operation = 'MAXIMUM'; al.inputs[1].default_value = 0.72; L.new(sep.outputs[0], al.inputs[0]); L.new(al.outputs[0], bs.inputs['Alpha'])
    m.surface_render_method = 'BLENDED' if sea else 'DITHERED'
    return m

# ------------------------------------------------------------------ escena: terreno, agua, estructuras
TM = terrain_material()
for cid in ('terreno_no', 'terreno_ne', 'terreno_so', 'terreno_se'):
    for o in imp(cid):
        if o.type == 'MESH': o.data.materials.clear(); o.data.materials.append(TM)
WM = water_material()
for o in imp('agua'):
    if o.type == 'MESH': o.data.materials.clear(); o.data.materials.append(WM)
bpy.ops.mesh.primitive_plane_add(size=3000, location=(0, 0, 0)); sea = bpy.context.object; sea.data.materials.append(water_material(True))
bpy.ops.mesh.primitive_plane_add(size=3000, location=(0, 0, -11.5)); bpy.context.object.data.materials.append(material('Vista_Fondo_Marino', '#1d5f86', 1.0))
REPL = {c for c, v in DATA['colocaciones'].items() if v.get('edificioKelvin')} if os.environ.get('MAPA_PROPIAS') != '1' else set()
KROOT = os.path.join(ROOT, 'assets', 'models', 'edificios')
for e in DATA['edificiosKelvin'] if os.environ.get('MAPA_PROPIAS') != '1' else []:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, e['glb']))
    for o in [o for o in bpy.data.objects if o not in before and o.parent is None]:
        x, y, z = e['pos']; o.location = (x, -z, y); o.rotation_mode = 'XYZ'; o.rotation_euler = (0, 0, e['rotY'])
# escena original de Kelvin (modelos web con la matriz del mapa; los pendientes no se dibujan)
C4 = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
WEBOBJ = {}
def web_object(m):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'edificios', m + '.glb'))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    if len(meshes) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in new:
        if o != ob and o.name in bpy.data.objects: bpy.data.objects.remove(o)
    ob.hide_render = True; ob.hide_viewport = True
    return ob
nk = 0
for z_ in DATA.get('escenaKelvin', {}).get('zonas', []) if os.environ.get('MAPA_PROPIAS') != '1' else []:
    for e in z_['instancias']:
        if not e.get('modelo') or e.get('oculto') or e.get('espera'): continue
        if e['modelo'] not in WEBOBJ: WEBOBJ[e['modelo']] = web_object(e['modelo'])
        o = bpy.data.objects.new('kel_' + e['id'], WEBOBJ[e['modelo']].data); sc.collection.objects.link(o)
        a_ = e['matriz']; Mg = Matrix([[a_[c * 4 + r] for c in range(4)] for r in range(4)])
        o.matrix_world = C4 @ Mg @ C4.inverted(); nk += 1
print('escena de Kelvin en la vista:', nk)
for e in DATA['estructuras']:
    if e['id'] in REPL: continue
    objs = imp(e['id'])
    roots = [o for o in objs if o.parent is None]
    if e.get('mundo'): continue
    x, y, z = e['pos']
    for o in roots:
        o.location = (x, -z, y); o.rotation_mode = 'XYZ'; o.rotation_euler = (0, 0, e['rotY'])

# ------------------------------------------------------------------ flora de muestra (proxies)
FMAT = {}
def fm(name, col, rough=0.85):
    if name not in FMAT: FMAT[name] = material('Vista_' + name, col, rough)
    return FMAT[name]

def proxy(name, build):
    bm = bmesh.new(); mats = []
    def put(res, mname, col):
        m = fm(mname, col)
        if m not in mats: mats.append(m)
        mi = mats.index(m)
        fs = set()
        for v in res['verts']: fs.update(v.link_faces)
        for f in fs: f.material_index = mi
    build(bm, put)
    me = bpy.data.meshes.new('px_' + name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    for p in me.polygons: p.use_smooth = False
    ob = bpy.data.objects.new('px_' + name, me); return ob

def cone(bm, r1, r2, h, loc, seg=7, rot=(0, 0, 0)):
    Mx = Matrix.Translation(loc) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Translation((0, 0, h / 2))
    return bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h, matrix=Mx)
def blob(bm, r, loc, sc=(1, 1, 1), sub=1):
    return bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r, matrix=Matrix.Translation(loc) @ Matrix.Diagonal((*sc, 1)))
def leaf(bm, L_, w, loc, yaw, pitch, th=0.04):
    Mx = Matrix.Translation(loc) @ Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(-pitch, 4, 'Y') @ Matrix.Translation((L_ / 2, 0, 0)) @ Matrix.Diagonal((L_, w, th, 1))
    return bmesh.ops.create_cube(bm, size=1, matrix=Mx)

R = random.Random(5)
def b_tabonuco(bm, put):
    put(cone(bm, 0.32, 0.18, 11, (0, 0, 0)), 'corteza_tabonuco', '#bdb6a6')
    for k in range(3):
        a = k * 2.1 + 0.3; put(cone(bm, 0.12, 0.06, 3.5, (0, 0, 8.2), seg=5, rot=(0.7 * math.sin(a), 0.7 * math.cos(a), 0)), 'corteza_tabonuco', '#bdb6a6')
    for k in range(6):
        a = k * 1.05; r = 0 if k == 0 else 2.6
        put(blob(bm, 3.0, (r * math.cos(a), r * math.sin(a), 11.5 + R.uniform(-0.6, 1.2)), (1.25, 1.25, 0.6)), 'copa_tabonuco', '#2f6b2c' if k % 2 else '#3a7a30')
def b_palma(bm, put):
    put(cone(bm, 0.18, 0.13, 7.5, (0, 0, 0), seg=6, rot=(0.05, 0.04, 0)), 'tronco_palma', '#8b7d66')
    put(cone(bm, 0.2, 0.16, 1.0, (0.37, 0.3, 7.4), seg=6), 'capitel_palma', '#7d9a3a')
    for k in range(10):
        a = k * 2 * math.pi / 10 + R.uniform(-0.15, 0.15)
        put(leaf(bm, 3.6, 0.55, (0.37, 0.3, 8.3), a, R.uniform(-0.15, 0.45)), 'fronda_palma', '#4f8f34')
def b_yagrumo(bm, put):
    put(cone(bm, 0.22, 0.16, 10, (0, 0, 0), seg=6), 'corteza_yagrumo', '#c9c5b3')
    for k in range(6):
        a = k * 1.05
        put(cone(bm, 1.1, 0.2, 0.25, (1.0 * math.cos(a), 1.0 * math.sin(a), 10 + 0.4 * (k % 2)), seg=7), 'hoja_yagrumo', '#6f8f63' if k % 2 else '#a5b89a')
def b_helecho_g(bm, put):
    put(cone(bm, 0.14, 0.12, 4.2, (0, 0, 0), seg=6), 'tronco_helecho', '#4a3a2c')
    for k in range(12):
        a = k * 2 * math.pi / 12
        put(leaf(bm, 2.6, 0.5, (0, 0, 4.2), a, R.uniform(-0.1, 0.35)), 'fronda_helecho', '#79b443')
def b_ceiba(bm, put):
    put(cone(bm, 1.7, 0.75, 13, (0, 0, 0), seg=8), 'corteza_ceiba', '#9c9483')
    for k in range(4):
        a = k * math.pi / 2 + 0.4
        put(leaf(bm, 2.4, 0.25, (0, 0, 0.0), a, -0.9, th=1.6), 'corteza_ceiba', '#9c9483')
    for k in range(8):
        a = k * 0.8; r = 0 if k == 0 else 6.5
        put(blob(bm, 5.0, (r * math.cos(a), r * math.sin(a), 15.5 + R.uniform(-1, 1)), (1.3, 1.3, 0.45)), 'copa_ceiba', '#3d7a33')
def b_flamboyan(bm, put):
    put(cone(bm, 0.4, 0.25, 4.0, (0, 0, 0), seg=7), 'corteza_flamboyan', '#7a6150')
    for k in range(7):
        a = k * 0.9; r = 0 if k == 0 else 3.4
        put(blob(bm, 2.8, (r * math.cos(a), r * math.sin(a), 5.2 + R.uniform(-0.3, 0.6)), (1.25, 1.25, 0.5)), 'flor_flamboyan', '#e3482a' if k % 3 else '#c73a22')
def b_bambu(bm, put):
    for k in range(14):
        a = R.uniform(0, 6.28); r = R.uniform(0, 0.9); h = R.uniform(8, 11.5)
        tilt = (math.sin(a) * 0.12, -math.cos(a) * 0.12, 0)
        put(cone(bm, 0.07, 0.05, h, (r * math.cos(a), r * math.sin(a), 0), seg=5, rot=(tilt[1], tilt[0], 0)), 'cana_bambu', '#a9c43f')
        put(blob(bm, 1.1, (r * math.cos(a) + math.sin(a) * h * 0.12, r * math.sin(a) - math.cos(a) * h * 0.12, h), (1, 1, 0.6)), 'hoja_bambu', '#6f9f2e')
def b_heliconia(bm, put):
    for k in range(6):
        a = k * 1.05
        put(leaf(bm, 1.3, 0.35, (0, 0, 0.5), a, -0.9 + R.uniform(-0.2, 0.2)), 'hoja_heliconia', '#3f8a35')
    for k in range(3):
        put(cone(bm, 0.12, 0.02, 0.5, (0.2 * math.cos(k * 2), 0.2 * math.sin(k * 2), 1.2 + 0.15 * k), seg=4, rot=(0.5, 0, k)), 'flor_heliconia', '#e8432f' if k != 1 else '#f2c230')
def b_bromelia(bm, put):
    put(blob(bm, 0.12, (0, 0, 0.15)), 'centro_bromelia', '#d2453a')
    for k in range(10):
        put(leaf(bm, 0.6, 0.12, (0, 0, 0.05), k * 0.63, -0.6 - 0.2 * (k % 2)), 'hoja_bromelia', '#7aa13a' if k % 3 else '#b8503a')
def b_helechos(bm, put):
    for k in range(8):
        put(leaf(bm, 1.1, 0.28, (0, 0, 0.05), k * 0.785 + R.uniform(-0.1, 0.1), -0.55), 'fronda_suelo', '#5e9e38')
def b_rocas(bm, put):
    res = blob(bm, 1.0, (0, 0, 0.2), (1.2, 1.0, 0.7), sub=2)
    for v in res['verts']: v.co *= 1 + 0.18 * math.sin(v.co.x * 3.1 + v.co.y * 2.3) * math.cos(v.co.z * 2.7)
    put(res, 'roca', '#8b867c')
def b_troncos(bm, put):
    put(cone(bm, 0.35, 0.3, 5.0, (-2.5, 0, 0.3), seg=7, rot=(0, math.pi / 2, 0)), 'tronco_caido', '#6a4f38')
    put(blob(bm, 0.45, (0, 0, 0.55), (3.5, 0.9, 0.35)), 'musgo', '#4f7f37')
BUILD = {'tabonuco': b_tabonuco, 'tabonuco_enano': b_tabonuco, 'palma_sierra': b_palma, 'yagrumo': b_yagrumo,
         'helecho_gigante': b_helecho_g, 'ceiba': b_ceiba, 'flamboyan': b_flamboyan, 'bambu': b_bambu,
         'heliconia': b_heliconia, 'bromelia': b_bromelia, 'helechos': b_helechos, 'rocas': b_rocas, 'troncos': b_troncos}
SCALE = {'tabonuco': (0.8, 1.2), 'tabonuco_enano': (0.3, 0.45), 'palma_sierra': (0.8, 1.25), 'yagrumo': (0.8, 1.2),
         'helecho_gigante': (0.7, 1.2), 'ceiba': (0.9, 1.1), 'flamboyan': (0.8, 1.1), 'bambu': (0.8, 1.2), 'heliconia': (0.8, 1.3),
         'bromelia': (0.8, 1.6), 'helechos': (0.7, 1.4), 'rocas': (0.4, 2.2), 'troncos': (0.7, 1.2)}

px_col = bpy.data.collections.new('proxies'); sc.collection.children.link(px_col)
M.footprints = {e['id']: (e['pos'][0], -e['pos'][2], {'refugio': 8.5, 'mirador': 5.5, 'casita': 6, 'puente': 4, 'muelle': 3, 'ruinas': 11}.get(e['id'], 0)) for e in DATA['estructuras'] if not e.get('mundo')}
for z_ in DATA.get('escenaKelvin', {}).get('zonas', []):
    for e in z_['instancias']:
        h_ = e['huella']; M.footprints['esc_' + e['id']] = (h_['x'], -h_['z'], max(h_['hx'], h_['hz']) * 0.85 + 1.0)
for p_ in DATA['pois']:
    if p_['id'] == 'parada_claro': ML.CLAROS.append((p_['pos'][0], -p_['pos'][2], 12.0))
DEN, FREE, FX, FY = ML.flora(M, H, step=2)
rng = np.random.RandomState(11)
import base64, re
_hj = open(os.path.join(ROOT, 'assets', 'data', 'mapa_cap1_altura.js')).read()
_m = {k: float(re.search(k + r': (-?[0-9.]+)', _hj).group(1)) for k in ('nx', 'nz', 'x0', 'z0', 'paso', 'min', 'max')}
HMJ = np.frombuffer(base64.b64decode(re.search(r'datos: "([^"]+)"', _hj).group(1)), '<u2').reshape(int(_m['nz']), int(_m['nx'])) * (_m['max'] - _m['min']) / 65535 + _m['min']
def hz(x, y):   # altura desde assets/data/mapa_cap1_altura.js (valida el mapa de alturas exportado)
    fx = (np.asarray(x) - _m['x0']) / _m['paso']; fz = (-np.asarray(y) - _m['z0']) / _m['paso']
    i = np.clip(fx.astype(int), 0, HMJ.shape[1] - 2); j = np.clip(fz.astype(int), 0, HMJ.shape[0] - 2); tx = fx - i; tz = fz - j
    return (HMJ[j, i] * (1 - tx) + HMJ[j, i + 1] * tx) * (1 - tz) + (HMJ[j + 1, i] * (1 - tx) + HMJ[j + 1, i + 1] * tx) * tz
PTS = {}
for sp in ML.SPECIES:
    d = DEN[sp] * 4 / 100.0       # instancias esperadas por celda de 2 m
    k = rng.poisson(np.clip(d, 0, 4))
    jj, ii = np.nonzero(k)
    reps = k[jj, ii]
    x = np.repeat(FX[jj, ii], reps) + rng.uniform(-1, 1, reps.sum()); y = np.repeat(FY[jj, ii], reps) + rng.uniform(-1, 1, reps.sum())
    PTS[sp] = (x, y)
CLEAR = [((146, -181), (140, -150)), ((76, -142), (93.6, -118.5)), ((89, 70), (72, 99)), ((150, -230), (148, -200)), ((-125, -192), (-125, -175))]   # líneas de cámara sin plantas cercanas
def clear_mask(x, y):
    keep = np.ones(len(x), bool)
    for (ax_, ay_), (bx_, by_) in CLEAR:
        abx, aby = bx_ - ax_, by_ - ay_; L2 = abx * abx + aby * aby
        t = np.clip(((x - ax_) * abx + (y - ay_) * aby) / L2, 0, 1)
        d = np.hypot(x - (ax_ + t * abx), y - (ay_ + t * aby))
        keep &= d > 3.5 + 6 * t
    return keep
for sp in PTS:
    if sp in ('helechos', 'bromelia', 'rocas'): continue
    k_ = clear_mask(*PTS[sp]); PTS[sp] = (PTS[sp][0][k_], PTS[sp][1][k_])
for sp, x, y, s in ML.HEROES:
    PTS[sp] = (np.r_[PTS[sp][0], x], np.r_[PTS[sp][1], y])
def gn_instancer(name, pts, proxy_ob, smin, smax):
    x, y = pts
    if len(x) == 0: return
    z = hz(x, y) - 0.15
    me = bpy.data.meshes.new('pts_' + name); me.vertices.add(len(x)); me.vertices.foreach_set('co', np.c_[x, y, z].astype(np.float32).ravel())
    a = me.attributes.new('rot', 'FLOAT', 'POINT'); a.data.foreach_set('value', rng.uniform(0, 6.283, len(x)).astype(np.float32))
    b = me.attributes.new('scl', 'FLOAT', 'POINT'); b.data.foreach_set('value', rng.uniform(smin, smax, len(x)).astype(np.float32))
    ob = bpy.data.objects.new('flora_' + name, me); sc.collection.objects.link(ob)
    ng = bpy.data.node_groups.new('gn_' + name, 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    N = ng.nodes; L = ng.links
    gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput')
    iop = N.new('GeometryNodeInstanceOnPoints'); oi = N.new('GeometryNodeObjectInfo'); oi.inputs['Object'].default_value = proxy_ob
    rot = N.new('GeometryNodeInputNamedAttribute'); rot.data_type = 'FLOAT'; rot.inputs['Name'].default_value = 'rot'
    scl = N.new('GeometryNodeInputNamedAttribute'); scl.data_type = 'FLOAT'; scl.inputs['Name'].default_value = 'scl'
    cmb = N.new('ShaderNodeCombineXYZ'); L.new(rot.outputs['Attribute'], cmb.inputs['Z'])
    L.new(gi.outputs[0], iop.inputs['Points']); L.new(oi.outputs['Geometry'], iop.inputs['Instance'])
    L.new(cmb.outputs[0], iop.inputs['Rotation']); L.new(scl.outputs['Attribute'], iop.inputs['Scale'])
    L.new(iop.outputs[0], go.inputs[0])
    mod = ob.modifiers.new('gn', 'NODES'); mod.node_group = ng
KIT = os.path.join(ROOT, 'assets', 'models', 'entorno')
KMAP = {'tabonuco': 'tabonuco', 'tabonuco_enano': 'arbol_enano', 'palma_sierra': 'palma_sierra', 'yagrumo': 'yagrumo', 'helecho_gigante': 'helecho_arboreo',
        'ceiba': 'ceiba', 'flamboyan': 'flamboyan', 'bambu': 'bambu', 'heliconia': 'heliconia', 'bromelia': 'bromelia', 'helechos': 'helecho_suelo',
        'rocas': 'roca_musgo_a', 'troncos': 'tronco_caido'}
KSCALE = {'tabonuco': (0.9, 1.2), 'tabonuco_enano': (0.85, 1.15), 'palma_sierra': (0.85, 1.2), 'yagrumo': (0.85, 1.15), 'helecho_gigante': (0.8, 1.15),
          'ceiba': (0.95, 1.1), 'flamboyan': (0.9, 1.1), 'bambu': (0.85, 1.15), 'heliconia': (0.8, 1.25), 'bromelia': (0.8, 1.4), 'helechos': (0.8, 1.4),
          'rocas': (0.5, 1.2), 'troncos': (0.8, 1.1)}
def kit_object(name):
    f = os.path.join(KIT, name + '.glb')
    if not os.path.exists(f): return None
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=f)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.parent = None; ob.matrix_world = ob.matrix_world.copy()
    for o in new:
        if o != ob and o.name in bpy.data.objects: bpy.data.objects.remove(o)
    ob.location = (0, 0, 0); ob.rotation_mode = 'XYZ'
    for slot in ob.material_slots:   # vista previa: solo textura (COLOR_0 del kit lo interpreta el motor)
        mt = slot.material
        if not mt or not mt.use_nodes: continue
        for lk in list(mt.node_tree.links):
            if lk.from_node.bl_idname in ('ShaderNodeVertexColor', 'ShaderNodeAttribute'):
                sock = lk.to_socket; mt.node_tree.links.remove(lk)
                try: sock.default_value = (1, 1, 1, 1)
                except Exception:
                    try: sock.default_value = 1.0
                    except Exception: pass
    for c in ob.users_collection: c.objects.unlink(ob)
    px_col.objects.link(ob); return ob
KOBJ = {}
for sp in ML.SPECIES:
    kn = KMAP[sp]
    if kn not in KOBJ: KOBJ[kn] = kit_object(kn) or proxy(sp, BUILD[sp])
    if KOBJ[kn].name not in px_col.objects: px_col.objects.link(KOBJ[kn])
    if sp == 'rocas':
        x, y = PTS[sp]; wdr = ML.flora.__globals__['np'].zeros(len(x))
        near = (hz(x, y) < 0.5) | np.array([M.water_d[int(np.clip(b + 264, 0, 528)), int(np.clip(a + 264, 0, 528))] < 4 for a, b in zip(x, y)])
        pr = kit_object('piedras_rio') or KOBJ[kn]; rb = kit_object('roca_musgo_b') or KOBJ[kn]
        gn_instancer('piedras_rio', (x[near], y[near]), pr, 0.5, 1.0)
        far = ~near; half = np.arange(far.sum()) % 2 == 0
        gn_instancer('rocas_a', (x[far][half], y[far][half]), KOBJ[kn], *KSCALE[sp]); gn_instancer('rocas_b', (x[far][~half], y[far][~half]), rb, *KSCALE[sp])
        continue
    gn_instancer(sp, PTS[sp], KOBJ[kn], *KSCALE[sp])
px_col.hide_render = True
print('flora instanciada', {k: len(v[0]) for k, v in PTS.items()})

# niebla del bosque nublado: nubes bajas alrededor de la cumbre
vol = bpy.data.materials.new('Vista_Nube'); vol.use_nodes = True; nt = vol.node_tree
for n_ in list(nt.nodes): nt.nodes.remove(n_)
o_ = nt.nodes.new('ShaderNodeOutputMaterial'); pv = nt.nodes.new('ShaderNodeVolumePrincipled'); pv.inputs['Density'].default_value = 0.012; pv.inputs['Emission Strength'].default_value = 0.25; pv.inputs['Emission Color'].default_value = (0.9, 0.95, 1, 1)
pv.inputs['Color'].default_value = (1, 1, 1, 1); nt.links.new(pv.outputs[0], o_.inputs['Volume'])
for cx, cy, cz, r in (((-30, 150, 122, 22), (-60, 172, 112, 16), (10, 190, 100, 18)) if VIEWS == ['aerea'] or VIEWS[0] == 'aerea' else ()):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=(cx, cy, cz)); c = bpy.context.object
    c.scale = (r * 1.4, r, r * 0.35); c.data.materials.append(vol)

# ------------------------------------------------------------------ Vittata para escala (1.75 m)
def vittata(loc, yaw):
    objs = imp('../vittata') if False else None
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'vittata.glb'))
    new = [o for o in bpy.data.objects if o not in before]
    root = [o for o in new if o.parent is None]
    for o in root:
        o.scale = (1.75 / 1.19,) * 3; o.location = loc; o.rotation_mode = 'XYZ'; o.rotation_euler = (0, 0, yaw)
    return new

# ------------------------------------------------------------------ luz, cielo, render
sc.render.engine = 'BLENDER_EEVEE_NEXT'
ee = sc.eevee; ee.taa_render_samples = SAMPLES
ee.use_shadows = True
try:
    ee.use_raytracing = True; ee.ray_tracing_options.resolution_scale = '2'
except Exception: pass
ee.volumetric_end = 900; ee.volumetric_tile_size = '8'
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
w = bpy.data.worlds.new('cielo'); sc.world = w; w.use_nodes = True; wn = w.node_tree
sky = wn.nodes.new('ShaderNodeTexSky'); sky.sky_type = 'NISHITA'; sky.sun_elevation = math.radians(38); sky.sun_rotation = math.radians(215)
sky.altitude = 200; sky.air_density = 1.0; sky.dust_density = 0.6; sky.ozone_density = 1.5
wn.links.new(sky.outputs[0], wn.nodes['Background'].inputs[0]); wn.nodes['Background'].inputs[1].default_value = 0.35
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 5.0; sun.data.angle = math.radians(1.5); sun.data.color = (1.0, 0.95, 0.86)
sun.rotation_euler = Euler((math.radians(57), 0, math.radians(305)))
w.mist_settings.start = 250; w.mist_settings.depth = 1400
sc.view_layers[0].use_pass_mist = True
sc.use_nodes = True; ct = sc.node_tree
for n_ in list(ct.nodes): ct.nodes.remove(n_)
rl = ct.nodes.new('CompositorNodeRLayers'); cp = ct.nodes.new('CompositorNodeComposite')
mx = ct.nodes.new('CompositorNodeMixRGB'); mx.blend_type = 'MIX'; mx.inputs[2].default_value = (0.56, 0.72, 0.9, 1)
pw = ct.nodes.new('CompositorNodeMath'); pw.operation = 'MULTIPLY'; pw.inputs[1].default_value = 0.45
ct.links.new(rl.outputs['Mist'], pw.inputs[0]); ct.links.new(pw.outputs[0], mx.inputs[0]); ct.links.new(rl.outputs['Image'], mx.inputs[1]); ct.links.new(mx.outputs[0], cp.inputs[0])
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.clip_start = 0.1; cam.data.clip_end = 3000

def look(cam, eye, target, lens):
    cam.location = eye; d = Vector(target) - Vector(eye)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = lens

def render(name, w_=1600, h_=900):
    sc.render.resolution_x = w_; sc.render.resolution_y = h_; sc.render.resolution_percentage = 100
    sc.render.filepath = os.path.join(IMG, name); sc.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True); print('render', name)

def P(x, y, dz): return (x, y, float(hz(np.array([x]), np.array([y]))[0]) + dz)
labels = []
if 'aerea' in VIEWS:
    cam.data.type = 'PERSP'; mx.inputs[0].default_value = 0
    look(cam, (300, -540, 360), (-5, 15, 0), 33); render('mapa_aerea.png')
if 'spawn' in VIEWS:
    sp = DATA['spawn']; vx, vy = sp['x'], -sp['z']
    ex, ey = 146.0, -183.0
    v = vittata(P(ex + 1.6, ey + 6.5, 0.02), math.radians(192))
    look(cam, P(ex, ey, 3.3), (150, -110, 13), 24); render('mapa_vista_spawn.png')
    for o in v: bpy.data.objects.remove(o, do_unlink=True)
if 'mina' in VIEWS:
    pm = [p for p in DATA['agua']['pozas'] if p['id'] == 'poza_la_mina'][0]
    cx, cy = pm['x'], -pm['z']
    v = vittata(P(cx + 12.0, cy - 13.5, 0.02), math.radians(215))
    look(cam, P(cx + 18, cy - 22, 4.2), (cx - 2, cy + 6, pm['nivel'] + 4.0), 27); render('mapa_vista_la_mina.png')
    for o in v: bpy.data.objects.remove(o, do_unlink=True)
if 'playa' in VIEWS:
    mu = [e for e in DATA['estructuras'] if e['id'] == 'muelle'][0]
    mxp, myp = mu['pos'][0], -mu['pos'][2]
    v = vittata((mxp + 0.2, myp - 22, 1.3), math.radians(160))
    look(cam, (mxp + 1.5, myp - 31, 3.4), (mxp - 25, myp + 70, 18), 26); render('mapa_vista_playa.png')
    for o in v: bpy.data.objects.remove(o, do_unlink=True)
if 'aldea' in VIEWS:
    v = vittata(P(-123.0, -183.0, 0.02), math.radians(172))
    look(cam, P(-126, -192, 3.0), (-125, -150, 4.0 + float(hz(np.array([-125]), np.array([-150]))[0])), 26); render('mapa_vista_aldea.png')
    for o in v: bpy.data.objects.remove(o, do_unlink=True)
def zona(zid):
    return next(z_ for z_ in DATA['escenaKelvin']['zonas'] if z_['id'] == zid)
if 'kelvin_lejos' in VIEWS:
    cam.data.type = 'PERSP'; mx.inputs[0].default_value = 0
    look(cam, (-120, -250, 150), (0, 70, 20), 30); render('mapa_kelvin_lejos.png')
if 'kelvin_suelo' in VIEWS:
    z_ = zona(os.environ.get('MAPA_ZONA', 'kelvin_aldea_rio_este')); cx, cy = z_['centro'][0], -z_['centro'][2]
    if os.environ.get('MAPA_CENTRO'): cx, cy = [float(v) for v in os.environ['MAPA_CENTRO'].split(',')]
    ox, oy = [float(v) for v in os.environ.get('MAPA_OFF', '-20,-24').split(',')]
    ex, ey = cx + ox, cy + oy
    dl_ = math.hypot(cx - ex, cy - ey); lat = float(os.environ.get('MAPA_VLAT', '0'))
    vx_, vy_ = ex + 0.2 * (cx - ex) + lat * (cy - ey) / dl_, ey + 0.2 * (cy - ey) - lat * (cx - ex) / dl_
    v = vittata(P(vx_, vy_, 0.02), math.atan2(-(cx - vx_), (cy - vy_)) + math.pi)
    look(cam, P(ex - 0.1 * (cx - ex), ey - 0.1 * (cy - ey), 3.4), P(cx, cy, 3.0), 26); render(os.environ.get('MAPA_SALIDA', 'mapa_kelvin_suelo.png'))
    for o in v: bpy.data.objects.remove(o, do_unlink=True)
if 'cumbre' in VIEWS:
    look(cam, P(-20, 152, 3.0), P(80, -60, -40), 28); render('mapa_vista_cumbre.png')
if 'propias' in VIEWS:   # estructuras propias (respaldo) en fila, sobre pasto
    for o in list(sc.objects): o.hide_render = True
    bpy.ops.mesh.primitive_plane_add(size=400, location=(30, 0, 0)); g = bpy.context.object; g.data.materials.append(material('Vista_Pasto', '#6aa23f', 0.95)); g.hide_render = False
    xs_ = {'refugio': (2, 12, -15), 'mirador': (-20, 16, 0), 'casita': (22, 6, -25), 'puente': (6, -10, 0), 'muelle': (26, -12, -90)}
    for sid, (x0, y0, r0) in xs_.items():
        for o in [o for o in imp(sid) if o.parent is None]:
            o.hide_render = False; o.location = (x0, y0, 0 if sid != 'muelle' else -1.0); o.rotation_mode = 'XYZ'
            o.rotation_euler = (0, 0, math.radians(r0))
    sun.hide_render = False; cam.hide_render = False
    cam.data.type = 'PERSP'; mx.inputs[0].default_value = 0
    look(cam, (22, -58, 17), (14, 4, 4), 30); render('mapa_estructuras_propias.png', 1600, 800)
if 'cenital' in VIEWS:
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2 * ML.HALF; cam.location = (0, 0, 600); cam.rotation_euler = (0, 0, 0)
    mx.inputs[0].default_value = 0; pw.inputs[1].default_value = 0.0
    for c in [o for o in bpy.data.objects if o.name.startswith('Icosphere')]: c.hide_render = True
    lab = material('Vista_Etiqueta', '#ffffff', 0.5, emit='#ffffff', strength=1.0)
    sh = material('Vista_Sombra', '#10241c', 0.9)
    pin = material('Vista_Pin', '#ffd23f', 0.4, emit='#ffd23f', strength=2.0)
    LBL = [('Villa Raíz · Estación', 167, -183), ('Muelle', 150, -228), ('Puente', 158, -126), ('Terreno A', 181, -136), ('Terreno B', 77, -181),
           ('Yucayeque taíno', -125, -166), ('Ruinas del Pacto', -23, -26), ('Templo de la Niebla', -137, 167),
           ('Mirador Yokahú', 14, -172), ('Casita jíbara', -104, -138), ('Cueva del Río', -226, -80), ('Bahía Bio', -160, -207),
           ('Poza Honda', 187, -112), ('Poza del Dajao', 77, 12), ('Cascada La Mina', 72, 100), ('Charca de las Nubes', -6, 186),
           ('El Yunque', -32, 150), ('Los Picachos', 60, 231), ('Ruinas de la Mesa', 192, 4), ('Cueva del Mar', 226, -14), ('Arrecife', 150, -246),
           ('Río de los Meandros', -110, 30), ('Terrazas de palma', 140, 128), ('Lomas del Oeste', -110, -100)]
    for t, x, y in LBL:
        for dx, dy, m_, z in ((0.9, -0.9, sh, 199), (0, 0, lab, 200)):
            bpy.ops.object.text_add(location=(x + dx, y + 7 + dy, z)); o = bpy.context.object
            o.data.body = t; o.data.size = 9; o.data.align_x = 'CENTER'; o.data.extrude = 0.05
            o.data.materials.append(m_)
        bpy.ops.mesh.primitive_cylinder_add(radius=2.6, depth=1, location=(x, y, 198)); bpy.context.object.data.materials.append(pin)
    sun.rotation_euler = Euler((math.radians(40), 0, math.radians(135)))
    render('mapa_cenital.png', 1400, 1400)
