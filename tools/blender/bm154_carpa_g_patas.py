"""BM154: carpa_g: quita las patas rotas (material KB3D_BarkNew) y pone 6 postes nuevos bajo el borde de la lona.

Blender -b --python tools/blender/bm154_carpa_g_patas.py"""
import base64, json, math, struct
from pathlib import Path
import bpy, bmesh
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/models/edificios'
name = 'carpa_g'
bpy.ops.wm.read_factory_settings(use_empty=True)
ORIG = (OUT / (name + '.glb')).read_bytes()
bpy.ops.import_scene.gltf(filepath=str(OUT / (name + '.glb')))
ob = [o for o in bpy.data.objects if o.type == 'MESH'][0]
me = ob.data
bark = [i for i, m in enumerate(me.materials) if m.name.startswith('KB3D_BarkNew')][0]
bm = bmesh.new()
bm.from_mesh(me)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index == bark], context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
for k in range(6):
    a = k * math.pi / 3 + math.pi / 6
    c = Vector((2.3 * math.cos(a), 2.3 * math.sin(a), 1.0))
    m = bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.16, radius2=0.1, depth=2.0, calc_uvs=True, matrix=Matrix.Translation(c))
    for f in {f for v in m['verts'] for f in v.link_faces}:
        f.material_index = bark
bm.to_mesh(me)
bm.free()
me.calc_loop_triangles()
bpy.ops.export_scene.gltf(filepath=str(OUT / (name + '.glb')), export_format='GLB', export_yup=True, export_apply=True,
                          export_materials='EXPORT', export_image_format='NONE')


def trozos(d):
    n = struct.unpack('<I', d[12:16])[0]
    return json.loads(d[20:20 + n]), d[20 + n:]


# el glb original apunta a tex/*.jpg por uri: se copian sus texturas y materiales (por nombre) para no meter las imágenes en el binario
oj, _ = trozos(ORIG)
nj, resto = trozos((OUT / (name + '.glb')).read_bytes())
por_nombre = {m['name']: m for m in oj['materials']}
nj['materials'] = [por_nombre[m['name']] for m in nj['materials']]
for k in ('textures', 'images', 'samplers'):
    nj[k] = oj[k]
je = json.dumps(nj, separators=(',', ':')).encode()
je += b' ' * (-len(je) % 4)
bin_ = resto
cuerpo = struct.pack('<II', len(je), 0x4E4F534A) + je + bin_
(OUT / (name + '.glb')).write_bytes(b'glTF' + struct.pack('<II', 2, 12 + len(cuerpo)) + cuerpo)
data = (OUT / (name + '.glb')).read_bytes()
(OUT / (name + '_glb.js')).write_text('(window.AV_EDIFICIOS_B64=window.AV_EDIFICIOS_B64||{})["%s"]="%s";\n' % (name, base64.b64encode(data).decode()))
kp = OUT / 'kit.js'
t = kp.read_text()
s = t.index('window.AV_EDIFICIOS_KIT = ') + len('window.AV_EDIFICIOS_KIT = ')
kit = json.loads(t[s:t.rindex(';')])
kit[name].update({'tris': len(me.loop_triangles), 'kb': round((OUT / (name + '_glb.js')).stat().st_size / 1024, 1)})
kp.write_text(t[:s] + json.dumps(kit, ensure_ascii=False, separators=(',', ':')) + t[t.rindex(';'):])
print('LISTO', len(me.loop_triangles), kit[name]['kb'])
