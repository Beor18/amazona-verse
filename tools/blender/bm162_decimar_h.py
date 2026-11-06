# BM162: decima solo la malla MediumH_RockMd001 del _hd de templo_mediano_h (406 k de 462 k tris), conservando UV y normales.
# Blender -b --python bm162_decimar_h.py -- <entrada.glb> <salida.glb> <ratio>
import bpy, bmesh, sys, json, struct
import numpy as np
ent, sal, ratio = sys.argv[sys.argv.index('--') + 1:][:3]
ratio = float(ratio)
d = open(ent, 'rb').read()
n = struct.unpack('<I', d[12:16])[0]
j = json.loads(d[20:20 + n])
o = 20 + n
bn = struct.unpack('<I', d[o:o + 4])[0]
binc = bytearray(d[o + 8:o + 8 + bn])
mi = [i for i, m in enumerate(j['meshes']) if m['name'] == 'MediumH_RockMd001'][0]
pr = j['meshes'][mi]['primitives'][0]
def leer(ai, dt, w):
    a = j['accessors'][ai]; bv = j['bufferViews'][a['bufferView']]
    s = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(binc, dt, a['count'] * w, s).reshape(-1, w).copy()
P = leer(pr['attributes']['POSITION'], '<f4', 3)
UV = leer(pr['attributes']['TEXCOORD_0'], '<f4', 2)
ia = j['accessors'][pr['indices']]
I = leer(pr['indices'], '<u4' if ia['componentType'] == 5125 else '<u2', 1).reshape(-1, 3).astype(int)
print('antes', len(P), len(I))
me = bpy.data.meshes.new('r'); me.from_pydata(P.tolist(), [], I.tolist())
uvl = me.uv_layers.new(name='uv')
uvl.data.foreach_set('uv', UV[np.array([l.vertex_index for l in me.loops])].ravel())
ob = bpy.data.objects.new('r', me); bpy.context.scene.collection.objects.link(ob)
bpy.context.view_layer.objects.active = ob
md = ob.modifiers.new('d', 'DECIMATE'); md.ratio = ratio; md.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier='d')
me = ob.data; me.calc_loop_triangles()
# vértices únicos por (vértice, uv)
uvd = np.zeros((len(me.loops), 2), 'f4'); me.uv_layers[0].data.foreach_get('uv', uvd.ravel())
tri = np.array([t.loops for t in me.loop_triangles]); vi = np.zeros(len(me.loops), int); me.loops.foreach_get('vertex_index', vi)
pos = np.zeros((len(me.vertices), 3), 'f4'); me.vertices.foreach_get('co', pos.ravel())
nv = np.zeros((len(me.vertices), 3), 'f4'); me.vertices.foreach_get('normal', nv.ravel())
clave = {}; Pn, Nn, Un, In = [], [], [], []
for l in tri.ravel():
    k = (vi[l], round(float(uvd[l][0]), 5), round(float(uvd[l][1]), 5))
    if k not in clave:
        clave[k] = len(Pn); Pn.append(pos[vi[l]]); Nn.append(nv[vi[l]]); Un.append(uvd[l])
    In.append(clave[k])
print('despues', len(Pn), len(In) // 3)
def poner(ai, arr, tipo, comp, target):
    global binc
    while len(binc) % 4: binc.append(0)
    off = len(binc); binc += arr.tobytes()
    a = j['accessors'][ai]; bv = {'buffer': 0, 'byteOffset': off, 'byteLength': arr.nbytes, 'target': target}
    j['bufferViews'].append(bv); a['bufferView'] = len(j['bufferViews']) - 1; a['byteOffset'] = 0
    a['count'] = len(arr) if comp != 1 else arr.size; a['componentType'] = tipo
    if comp > 1:
        a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    else:
        a.pop('min', None); a.pop('max', None)
    j['bufferViews'][-1].pop('byteStride', None)
Pn = np.array(Pn, '<f4'); Nn = np.array(Nn, '<f4'); Un = np.array(Un, '<f4'); In = np.array(In, '<u4')
poner(pr['attributes']['POSITION'], Pn, 5126, 3, 34962)
poner(pr['attributes']['NORMAL'], Nn, 5126, 3, 34962)
poner(pr['attributes']['TEXCOORD_0'], Un, 5126, 2, 34962)
poner(pr['indices'], In, 5125, 1, 34963)
# compacta: quita los bufferViews que ya no usa ningún accesor ni imagen
usados = sorted({a['bufferView'] for a in j['accessors'] if 'bufferView' in a} | {i['bufferView'] for i in j.get('images', []) if 'bufferView' in i})
nb = bytearray(); mapa = {}; nvw = []
for i in usados:
    bv = j['bufferViews'][i]
    while len(nb) % 4: nb.append(0)
    mapa[i] = len(nvw); nvw.append(dict(bv, byteOffset=len(nb))); nb += binc[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
for a in j['accessors']:
    if 'bufferView' in a: a['bufferView'] = mapa[a['bufferView']]
for im in j.get('images', []):
    if 'bufferView' in im: im['bufferView'] = mapa[im['bufferView']]
j['bufferViews'] = nvw; binc = nb
j['buffers'][0]['byteLength'] = len(binc)
js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
while len(binc) % 4: binc.append(0)
out = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(js) + 8 + len(binc)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(binc)) + b'BIN\0' + bytes(binc)
open(sal, 'wb').write(out)
