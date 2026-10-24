"""Amazona Verse · librería de ropa para Blender 4.2 (modo sin ventana).

Uso: Blender -b 04_Blender_3D/vittata_rig_final.blend --python tools/blender/ropa_<pieza>.py
Convenciones del rig (Blender): Z arriba, el personaje mira a -Y, pies en z=0, altura 1.4.
  - Ropa ajustada: se recorta del cuerpo real (mismos vértices y pesos del esqueleto), se suaviza,
    se separa del cuerpo, se le da grosor y bordes, y se exporta con piel (skin) sobre el mismo Rig.
  - Piezas rígidas (gorras, zapatos, objetos): se modelan y se pesan al 100 % a un hueso.
Materiales: el juego reemplaza por nombre: TELA (color/estampado elegido), PAJA, ACENTO (2.º color), y
cualquier otro nombre conserva su color de Blender.
UV de la ropa: cilíndrica alrededor del eje Z con el FRENTE en u=0.5 (igual que los estampados de wardrobe.js).
"""
import bpy, bmesh, math, os
from mathutils import Vector

ROOT = os.path.expanduser('~/AmazonaVerse/Juego')
OUT = os.path.join(ROOT, 'assets/models/ropa')
PREV = os.path.join(ROOT, 'tests/out/ropa')
os.makedirs(OUT, exist_ok=True); os.makedirs(PREV, exist_ok=True)

BODY = lambda: bpy.data.objects['Vittata']
RIG = lambda: bpy.data.objects['Rig']


def mat(name, color=(0.8, 0.8, 0.8), rough=0.8, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    m.diffuse_color = (*color, 1)
    return m


def hexrgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x ** 2.2 for x in c)  # sRGB → lineal


def apply_mods(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        if m.type == 'ARMATURE': continue
        bpy.ops.object.modifier_apply(modifier=m.name)


def body_region(name, groups, zmin, zmax, keep=None, exclude=()):
    """Copia del cuerpo con sólo las caras cuyos vértices pertenecen (peso dominante) a `groups`
    y caen en [zmin, zmax]. Conserva los pesos del esqueleto."""
    body = BODY(); me = body.data
    gi = {g.index: g.name for g in body.vertex_groups}
    sel = set()
    for v in me.vertices:
        if not (zmin <= v.co.z <= zmax): continue
        b = max(v.groups, key=lambda g: g.weight, default=None)
        if not b: continue
        gname = gi[b.group]
        if groups is not None and gname not in groups: continue
        if any(gname.startswith(x) for x in exclude): continue
        if keep is None or keep(v.co): sel.add(v.index)
    o = body.copy(); o.data = me.copy(); o.name = name; o.data.name = name
    bpy.context.collection.objects.link(o)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bm.verts.ensure_lookup_table()
    dead = [f for f in bm.faces if not all(v.index in sel for v in f.verts) or f.material_index == 0]
    bmesh.ops.delete(bm, geom=dead, context='FACES')
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bm.to_mesh(o.data); bm.free()
    o.data.materials.clear()
    for m in list(o.modifiers): o.modifiers.remove(m)  # el esqueleto se pone al final (add_armature)
    return o


def add_armature(o):
    o.parent = RIG()
    m = o.modifiers.new('Armature', 'ARMATURE'); m.object = RIG()
    return o


def fit_garment(o, margin=0.02, thickness=0.007, smooth=18, subdiv=1, outside=0.012):
    """Suaviza (borra plumas y picos), separa del cuerpo, asegura que quede por fuera y da grosor con borde."""
    # Laplaciano con bordes fijos y volumen conservado: alisa plumas y picos sin encoger la tela
    sm = o.modifiers.new('suave', 'LAPLACIANSMOOTH'); sm.iterations = smooth; sm.lambda_factor = 1.2; sm.lambda_border = 0.0; sm.use_volume_preserve = True
    d = o.modifiers.new('separa', 'DISPLACE'); d.direction = 'NORMAL'; d.mid_level = 0; d.strength = margin
    sw = o.modifiers.new('fuera', 'SHRINKWRAP'); sw.target = BODY(); sw.wrap_method = 'NEAREST_SURFACEPOINT'; sw.wrap_mode = 'OUTSIDE'; sw.offset = outside
    sm2 = o.modifiers.new('suave2', 'SMOOTH'); sm2.factor = 0.5; sm2.iterations = 4
    so = o.modifiers.new('grosor', 'SOLIDIFY'); so.thickness = thickness; so.offset = 1; so.use_rim = True
    if subdiv:
        sd = o.modifiers.new('sub', 'SUBSURF'); sd.levels = subdiv; sd.render_levels = subdiv
    apply_mods(o)
    return o


def lathe(name, rows, seg=40, cap_top=False, cap_bottom=False):
    """Tubo de anillos elípticos a lo largo de Z: rows = [(z, medio_ancho, centro_y, medio_fondo), ...]
    (Blender: el frente es -Y). Devuelve un objeto de malla limpia, lista para ajustar."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rings = []
    for z, rx, cy, ry in rows:
        ring = []
        for i in range(seg):
            a = i / seg * 2 * math.pi
            ring.append(bm.verts.new((math.sin(a) * rx, cy - math.cos(a) * ry, z)))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(seg):
            bm.faces.new((r0[i], r0[(i + 1) % seg], r1[(i + 1) % seg], r1[i]))
    if cap_top: bm.faces.new(list(reversed(rings[-1])))
    if cap_bottom: bm.faces.new(rings[0])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    return o


def tube_between(name, a, b, r0, r1, seg=24, rings=6):
    """Tubo abierto de a hasta b (manga, pernera, caña de bota)."""
    a = Vector(a); b = Vector(b); axis = (b - a); L = axis.length; axis.normalize()
    up = Vector((0, 0, 1)) if abs(axis.z) < 0.9 else Vector((1, 0, 0))
    u = axis.cross(up).normalized(); v = axis.cross(u).normalized()
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rs = []
    for j in range(rings + 1):
        t = j / rings; c = a + axis * L * t; r = r0 + (r1 - r0) * t
        rs.append([bm.verts.new(c + (u * math.cos(i / seg * 2 * math.pi) + v * math.sin(i / seg * 2 * math.pi)) * r) for i in range(seg)])
    for r0_, r1_ in zip(rs, rs[1:]):
        for i in range(seg): bm.faces.new((r0_[i], r0_[(i + 1) % seg], r1_[(i + 1) % seg], r1_[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    return o


def wrap_outside(o, offset=0.012, smooth=6, thickness=0.007, subdiv=1):
    """Empuja la malla por fuera del cuerpo (donde el cuerpo sobresale), alisa, da grosor y borde."""
    sw = o.modifiers.new('fuera', 'SHRINKWRAP'); sw.target = BODY(); sw.wrap_method = 'NEAREST_SURFACEPOINT'; sw.wrap_mode = 'OUTSIDE'; sw.offset = offset
    sm = o.modifiers.new('suave', 'LAPLACIANSMOOTH'); sm.iterations = smooth; sm.lambda_factor = 0.8; sm.lambda_border = 0.0; sm.use_volume_preserve = True
    sw2 = o.modifiers.new('fuera2', 'SHRINKWRAP'); sw2.target = BODY(); sw2.wrap_method = 'NEAREST_SURFACEPOINT'; sw2.wrap_mode = 'OUTSIDE'; sw2.offset = offset * 0.7
    so = o.modifiers.new('grosor', 'SOLIDIFY'); so.thickness = thickness; so.offset = 1; so.use_rim = True
    if subdiv:
        sd = o.modifiers.new('sub', 'SUBSURF'); sd.levels = subdiv; sd.render_levels = subdiv
    apply_mods(o)
    return o


def weights_from_body(o):
    """Copia los pesos del esqueleto desde la piel del cuerpo más cercana (interpolada por cara)."""
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    dt = o.modifiers.new('pesos', 'DATA_TRANSFER'); dt.object = BODY(); dt.use_vert_data = True
    dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
    bpy.ops.object.datalayout_transfer(modifier=dt.name)
    bpy.ops.object.modifier_apply(modifier=dt.name)
    clean_weights(o)


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for x in objs: x.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join()
    objs[0].name = name; objs[0].data.name = name
    return objs[0]


def cyl_uv(o, zmin=None, zmax=None):
    me = o.data
    uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    while len(me.uv_layers) > 1:
        me.uv_layers.remove([l for l in me.uv_layers if l.name != 'UVMap'][0])
    zs = [v.co.z for v in me.vertices]; zmin = min(zs) if zmin is None else zmin; zmax = max(zs) if zmax is None else zmax
    for p in me.polygons:
        us = []
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            a = math.atan2(-co.x, -co.y)  # 0 al frente; signo para que el texto no salga al revés
            us.append(a / (2 * math.pi) + 0.5)
        # evita la costura (atrás, u≈0/1) estirando la textura por toda la vuelta
        if max(us) - min(us) > 0.5: us = [u + 1 if u < 0.5 else u for u in us]
        for li, u in zip(p.loop_indices, us):
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (u, (co.z - zmin) / max(1e-6, zmax - zmin))


def clean_weights(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)


def rigid(o, bone):
    """Pieza rígida: todo el peso a un hueso y modificador de esqueleto."""
    o.vertex_groups.clear()
    g = o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    o.parent = RIG()
    m = o.modifiers.new('Armature', 'ARMATURE'); m.object = RIG()
    return o


def shade_smooth(o, angle=40):
    for p in o.data.polygons: p.use_smooth = True
    try:
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))
    except Exception:
        pass


def export(objs, name):
    """Exporta las piezas con el Rig (piel), sin animaciones, a assets/models/ropa/<name>.glb
    y una copia base64 <name>_glb.js para el artifact (que no sirve .glb)."""
    rig = RIG()
    if rig.animation_data: rig.animation_data.action = None
    for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    rig.select_set(True); bpy.context.view_layer.objects.active = rig
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                              export_texcoords=True, export_normals=True, export_materials='EXPORT', export_skins=True,
                              export_def_bones=False, export_animations=False, export_morph=False, export_cameras=False, export_lights=False)
    import base64
    with open(path, 'rb') as f: b = base64.b64encode(f.read()).decode()
    with open(os.path.join(OUT, name + '_glb.js'), 'w') as f:
        f.write('(window.AV_ROPA_B64=window.AV_ROPA_B64||{})["%s"]="%s";\n' % (name, b))
    print('EXPORTED', name, os.path.getsize(path))


def preview(objs, name, views=(('frente', (1.1, -3.2, 1.0)), ('espalda', (-1.6, 2.9, 1.2)))):
    """Render rápido (Workbench) del cuerpo con la pieza, para revisarla."""
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'
    sc.render.resolution_x = 520; sc.render.resolution_y = 640; sc.render.resolution_percentage = 100; sc.render.film_transparent = False
    sc.world = sc.world or bpy.data.worlds.new('W')
    cam = bpy.data.objects.get('CamPrev')
    if not cam:
        cam = bpy.data.objects.new('CamPrev', bpy.data.cameras.new('CamPrev')); sc.collection.objects.link(cam)
    sc.camera = cam; cam.data.lens = 50
    for vn, pos in views:
        cam.location = pos
        d = Vector((0, 0, 0.75)) - cam.location
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(PREV, '%s_%s.png' % (name, vn))
        bpy.ops.render.render(write_still=True)


def limb_weights(o, bone_l, bone_r, x0, x1, axis=0):
    """Las mangas/perneras siguen a su hueso: peso que pasa de 0 en |coord|=x0 a 1 en x1 (eje 0 = X)."""
    gl = o.vertex_groups.get(bone_l) or o.vertex_groups.new(name=bone_l)
    gr = o.vertex_groups.get(bone_r) or o.vertex_groups.new(name=bone_r)
    for v in o.data.vertices:
        c = v.co[axis]; w = min(1.0, max(0.0, (abs(c) - x0) / (x1 - x0)))
        if w <= 0: continue
        for g in v.groups: g.weight *= (1 - w)
        (gl if c > 0 else gr).add([v.index], w, 'ADD')
    clean_weights(o)
