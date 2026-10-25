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
    m['av_srgb'] = 1  # color con la curva sRGB exacta (el juego no le aplica la corrección de los .glb viejos de gamma 2,2)
    return m


def hexrgb(h):
    """'#rrggbb' (sRGB, como en el juego) → color lineal con la curva sRGB exacta (glTF guarda baseColorFactor en lineal)."""
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


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


def export(objs, name, morph=False):
    """Exporta las piezas con el Rig (piel), sin animaciones, a assets/models/ropa/<name>.glb
    y una copia base64 <name>_glb.js para el artifact (que no sirve .glb). morph=True exporta las shape keys
    como morph targets (p. ej. 'camisa' en el pañuelo: se separa para ir por encima de la camisa).
    Las propiedades personalizadas (material['av_srgb']) salen como extras del glTF."""
    rig = RIG()
    if rig.animation_data: rig.animation_data.action = None
    for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    rig.select_set(True); bpy.context.view_layer.objects.active = rig
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                              export_texcoords=True, export_normals=True, export_materials='EXPORT', export_skins=True,
                              export_def_bones=False, export_animations=False, export_morph=morph, export_morph_normal=False,
                              export_extras=True, export_cameras=False, export_lights=False)
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


# ---------------------------------------------------------------------------
# Extras para piezas de cabeza (gorras, sombreros, lentes) — añadidos sin cambiar lo anterior.
from mathutils.bvhtree import BVHTree

EYES = [(Vector((s * 0.150, -0.105, 1.200)), Vector((s * 0.446, -0.893, -0.058)).normalized()) for s in (1, -1)]
EYE_R = 0.066
_BVH = [None]


def rest_pose():
    rig = RIG()
    if rig.animation_data: rig.animation_data.action = None
    for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()


def body_bvh():
    """BVH del cuerpo en pose de reposo (coordenadas de mundo)."""
    if _BVH[0] is None:
        rest_pose()
        dg = bpy.context.evaluated_depsgraph_get()
        b = BODY().evaluated_get(dg); me = b.to_mesh()
        mw = BODY().matrix_world
        _BVH[0] = BVHTree.FromPolygons([mw @ v.co for v in me.vertices], [tuple(p.vertices) for p in me.polygons])
        b.to_mesh_clear()
    return _BVH[0]


def head_radius(z, a, cy=0.04):
    """Distancia horizontal desde (0, cy, z) a la superficie más externa del cuerpo en el acimut a
    (a=0 al frente -Y, a=+90° hacia +X)."""
    d = Vector((math.sin(a), -math.cos(a), 0)); o = Vector((0, cy, z)) + d * 1.0
    hit = body_bvh().ray_cast(o, -d, 1.0)
    return (1.0 - hit[3]) if hit[0] is not None else 0.0


def tube_path(name, pts, r, seg=8, closed=False, cap=True):
    """Tubo a lo largo de una polilínea (costuras, ribetes, aros). r puede ser número o lista por punto."""
    pts = [Vector(p) for p in pts]; n = len(pts)
    rs = r if isinstance(r, (list, tuple)) else [r] * n
    tang = []
    for i in range(n):
        if closed: t = pts[(i + 1) % n] - pts[i - 1]
        else: t = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]
        tang.append(t.normalized())
    ref = Vector((0, 0, 1)) if abs(tang[0].z) < 0.9 else Vector((1, 0, 0))
    u = tang[0].cross(ref).normalized(); frames = []
    for i in range(n):  # transporte paralelo
        if i: u = (u - tang[i] * u.dot(tang[i])).normalized()
        frames.append((u, tang[i].cross(u).normalized()))
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rings = []
    for p, (u, v), rr in zip(pts, frames, rs):
        rings.append([bm.verts.new(p + (u * math.cos(k / seg * 2 * math.pi) + v * math.sin(k / seg * 2 * math.pi)) * rr) for k in range(seg)])
    pairs = list(zip(rings, rings[1:])) + ([(rings[-1], rings[0])] if closed else [])
    for r0, r1 in pairs:
        for k in range(seg): bm.faces.new((r0[k], r0[(k + 1) % seg], r1[(k + 1) % seg], r1[k]))
    if cap and not closed:
        bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    return o


def grid_mesh(name, P, close_u=False, pole=None):
    """Malla de cuadros desde una rejilla P[j][i] de puntos (j filas, i columnas).
    close_u cierra la vuelta en i; pole=(punto) cierra la última fila en abanico."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    V = [[bm.verts.new(p) for p in row] for row in P]; nu = len(P[0])
    for j in range(len(V) - 1):
        for i in range(nu if close_u else nu - 1):
            i1 = (i + 1) % nu
            bm.faces.new((V[j][i], V[j][i1], V[j + 1][i1], V[j + 1][i]))
    if pole is not None:
        pv = bm.verts.new(pole)
        for i in range(nu if close_u else nu - 1):
            bm.faces.new((V[-1][i], V[-1][(i + 1) % nu], pv))
    bm.normal_update()
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    return o


def push_outside(o, offset=0.008, smooth=4, passes=2):
    """Shrinkwrap OUTSIDE contra el cuerpo + alisado, sin dar grosor (para copas de gorra y sombrero)."""
    for k in range(passes):
        sw = o.modifiers.new('fuera%d' % k, 'SHRINKWRAP'); sw.target = BODY(); sw.wrap_method = 'NEAREST_SURFACEPOINT'
        sw.wrap_mode = 'OUTSIDE'; sw.offset = offset
        if smooth and k < passes - 1:
            sm = o.modifiers.new('suave%d' % k, 'LAPLACIANSMOOTH'); sm.iterations = smooth; sm.lambda_factor = 0.6
            sm.lambda_border = 0.0; sm.use_volume_preserve = True
    apply_mods(o)
    return o


def add_mod(o, kind, **kw):
    m = o.modifiers.new(kind.lower(), kind)
    for k, v in kw.items(): setattr(m, k, v)
    return m


def tri_count(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def inside_parity(p):
    """Dentro/fuera por paridad de cruces en 5 direcciones (mayoría)."""
    bvh = body_bvh(); votes = 0
    for d in (Vector((1, 0, 0)), Vector((-1, 0, 0)), Vector((0, 0, 1)), Vector((0, -1, 0)), Vector((0, 1, 0))):
        o = Vector(p); n = 0
        for _ in range(64):
            loc, nrm, idx, dist = bvh.ray_cast(o, d, 5.0)
            if loc is None: break
            n += 1; o = loc + d * 1e-4
        votes += n % 2
    return votes >= 3


def check_clear(objs, eyes=True, min_out=0.002, eye_min=0.076):
    """Comprueba que ningún vértice quede dentro del cuerpo (normal de la cara más cercana) y,
    si eyes, a menos de eye_min de los centros de ojo. Devuelve (n_dentro, peor, n_ojo, min_ojo)."""
    bvh = body_bvh(); inside = 0; worst = 1.0; near = 0; emin = 9.0; wp = None
    for o in objs:
        mw = o.matrix_world
        for v in o.data.vertices:
            p = mw @ v.co
            loc, nrm, idx, dist = bvh.find_nearest(p)
            if loc is None: continue
            sd = dist if (p - loc).dot(nrm) >= 0 else -dist
            if sd < -0.02 and not inside_parity(p): sd = dist  # lámina fina (plumas): falso positivo
            if sd < worst: worst = sd; wp = p
            if sd < min_out: inside += 1
            for c, _n in EYES:
                e = (p - c).length; emin = min(emin, e)
                if e < eye_min: near += 1
    print('CHECK inside(<%.3f)=%d worst=%.4f at %s eye(<%.3f)=%d eye_min=%.4f' % (min_out, inside, worst, tuple(round(x, 3) for x in wp) if wp else None, eye_min, near, emin))
    return inside, worst, near, emin


def preview_head(objs, name, size=260, target=(0, -0.04, 1.24), dist=1.25,
                 views=(('frente', -8), ('lado', 90), ('tres', 145)), dist2=None):
    """Renders pequeños cerca de la cabeza (frente, lado, 3/4 de atrás) unidos en UNA imagen
    tests/out/ropa/<name>_cabeza.png. views = (nombre, acimut en grados; 0 = frente)."""
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'
    sc.render.resolution_x = size; sc.render.resolution_y = size; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    cam = bpy.data.objects.get('CamPrev')
    if not cam:
        cam = bpy.data.objects.new('CamPrev', bpy.data.cameras.new('CamPrev')); sc.collection.objects.link(cam)
    sc.camera = cam; cam.data.lens = 50
    t = Vector(target); tiles = []
    import numpy as np
    for vn, az in views:
        a = math.radians(az)
        cam.location = t + Vector((math.sin(a) * dist, -math.cos(a) * dist, 0.28 * dist / 1.25))
        cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
        fp = os.path.join(PREV, '_tmp_%s.png' % vn)
        sc.render.filepath = fp; bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(fp); px = np.array(im.pixels[:]).reshape(size, size, 4)
        tiles.append(px); bpy.data.images.remove(im); os.remove(fp)
    out = np.concatenate(tiles, axis=1)
    im = bpy.data.images.new('prev_' + name, size * len(tiles), size, alpha=True)
    im.pixels = out.ravel().tolist()
    im.filepath_raw = os.path.join(PREV, '%s_cabeza.png' % name); im.file_format = 'PNG'; im.save()
    bpy.data.images.remove(im)


def sphere(name, center, r, scale=(1, 1, 1), seg=12, rings=6):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    for v in bm.verts: v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2])) + Vector(center)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    return o


def orient_out(o, center):
    """Voltea las normales si apuntan hacia `center` (mallas abiertas tipo casquete)."""
    me = o.data; c = Vector(center)
    s = sum((p.center - c).dot(p.normal) for p in me.polygons)
    if s < 0:
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    me.update()


def hat_uv(o, scale=1.0):
    """UV de sombrero: u = vuelta (frente 0.5), v = altura + radio horizontal (sirve en copa y ala)."""
    cyl_uv(o)
    me = o.data; uv = me.uv_layers['UVMap']
    for li, l in enumerate(me.loops):
        co = me.vertices[l.vertex_index].co
        uv.data[li].uv = (uv.data[li].uv[0], (co.z + math.hypot(co.x, co.y - 0.03)) * scale)


def check_lens(objs, lateral=0.07):
    """Lentes: para cada vértice delante de un ojo (a menos de `lateral` del eje del ojo) mide el aire
    hasta el cuerpo a lo largo de la normal del ojo. Debe ser ≥ 0.010 (1 cm)."""
    bvh = body_bvh(); amin = 9.0; n_ = 0
    for o in objs:
        mw = o.matrix_world
        for v in o.data.vertices:
            p = mw @ v.co
            for c, n in EYES:
                q = p - c; along = q.dot(n); lat = (q - n * along).length
                if lat > lateral or along < 0: continue
                hit = bvh.ray_cast(p, -n, 0.3)
                d = hit[3] if hit[0] is not None else 0.3
                amin = min(amin, d); n_ += 1
    print('LENS verts_delante_ojo=%d aire_min=%.4f' % (n_, amin))
    return amin


# ---------------------------------------------------------------------------
# Extras para calzado, pantalones, espalda y mano (ropa_pies/piernas/espalda/mano) — añadidos sin cambiar lo anterior.

def frame_from(n):
    """Base ortonormal (u, v, n) con n como eje."""
    n = Vector(n).normalized(); ref = Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))
    u = n.cross(ref).normalized(); return u, n.cross(u).normalized(), n


def set_mat(o, m):
    o.data.materials.clear(); o.data.materials.append(m); return o


def revolve(name, a, b, prof, seg=24, cap0=True, cap1=True):
    """Sólido de revolución alrededor del eje a→b. prof = [(t, r), ...] con t en [0,1] a lo largo del eje.
    Tapas en abanico (polo) si cap0/cap1 y el radio del extremo no es 0."""
    a = Vector(a); b = Vector(b); ax = b - a; u, v, n = frame_from(ax)
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rings = []
    for t, r in prof:
        c = a + ax * t
        rings.append([bm.verts.new(c + (u * math.cos(k / seg * 2 * math.pi) + v * math.sin(k / seg * 2 * math.pi)) * r) for k in range(seg)])
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(seg): bm.faces.new((r0[k], r0[(k + 1) % seg], r1[(k + 1) % seg], r1[k]))
    if cap0:
        p = bm.verts.new(a + ax * prof[0][0])
        for k in range(seg): bm.faces.new((rings[0][(k + 1) % seg], rings[0][k], p))
    if cap1:
        p = bm.verts.new(a + ax * prof[-1][0])
        for k in range(seg): bm.faces.new((rings[-1][k], rings[-1][(k + 1) % seg], p))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    return o


def rbox(name, center, size, bevel=0.01, segs=2, axes=None, subdiv=0):
    """Caja de bordes redondeados. size = medidas completas (x, y, z); axes = (ex, ey, ez) opcional para girarla."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for vv in bm.verts: vv.co = Vector((vv.co.x * size[0], vv.co.y * size[1], vv.co.z * size[2]))
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if bevel: add_mod(o, 'BEVEL', width=bevel, segments=segs, limit_method='NONE')
    if subdiv: add_mod(o, 'SUBSURF', levels=subdiv)
    apply_mods(o)
    ex, ey, ez = axes or (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
    c = Vector(center)
    for vv in o.data.vertices:
        x, y, z = vv.co; vv.co = c + Vector(ex) * x + Vector(ey) * y + Vector(ez) * z
    o.data.update()
    return o


def prism(name, outline, z0, z1, frame=None, bevel=0.0, segs=2):
    """Prisma desde un contorno 2D [(x, y)...] extruido de z0 a z1 en el marco (origen, ex, ey, ez)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    org, ex, ey, ez = frame or (Vector((0, 0, 0)), Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
    P = lambda x, y, z: Vector(org) + Vector(ex) * x + Vector(ey) * y + Vector(ez) * z
    lo = [bm.verts.new(P(x, y, z0)) for x, y in outline]; hi = [bm.verts.new(P(x, y, z1)) for x, y in outline]
    n = len(outline)
    for i in range(n): bm.faces.new((lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i]))
    bm.faces.new(list(reversed(lo))); bm.faces.new(hi)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if bevel:
        add_mod(o, 'BEVEL', width=bevel, segments=segs, limit_method='ANGLE', angle_limit=math.radians(40)); apply_mods(o)
    return o


def ribbon(name, pts, nrm, width, th=0.004, side=None):
    """Correa plana a lo largo de pts; nrm = normal por punto (la cara mira hacia ahí). Grosor hacia afuera."""
    rows = []
    for i, (p, n) in enumerate(zip(pts, nrm)):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        s = t.cross(n).normalized()
        rows.append([p - s * width / 2, p + s * width / 2])
    o = grid_mesh(name, rows)
    # normales hacia nrm
    me = o.data; sgn = sum(pl.normal.dot(nrm[min(len(nrm) - 1, pl.vertices[0] // 2)]) for pl in me.polygons)
    if sgn < 0:
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    add_mod(o, 'SOLIDIFY', thickness=th, offset=1, use_rim=True)
    add_mod(o, 'BEVEL', width=min(0.0015, th * 0.4), segments=1, limit_method='ANGLE', angle_limit=math.radians(50))
    apply_mods(o)
    return o


def catmull(keys, n_per=6):
    """Curva suave que pasa por los puntos clave."""
    P = [Vector(k) for k in keys]; out = []
    for i in range(len(P) - 1):
        p0 = P[max(i - 1, 0)]; p1 = P[i]; p2 = P[i + 1]; p3 = P[min(i + 2, len(P) - 1)]
        for k in range(n_per):
            t = k / n_per; t2 = t * t; t3 = t2 * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-1]); return out


def body_path(keys, gap=0.02, n_per=6, fixed=(0, -1), iters=3):
    """Camino suave por fuera del cuerpo: interpola los puntos clave y lleva cada punto a la superficie
    más cercana + gap (salvo los índices de `fixed`, p. ej. los extremos que se anclan a una pieza).
    Devuelve (puntos, normales)."""
    bvh = body_bvh(); pts = catmull(keys, n_per); n = len(pts)
    fx = set(i % n for i in fixed)
    for _ in range(iters):
        new = []
        for i, p in enumerate(pts):
            if i in fx: new.append(p); continue
            loc, nr, idx, d = bvh.find_nearest(p)
            new.append(loc + nr * gap if loc is not None else p)
        pts = [new[0]] + [(new[i - 1] + 2 * new[i] + new[i + 1]) / 4 if i not in fx else new[i] for i in range(1, n - 1)] + [new[-1]]
    nrm = []
    for p in pts:
        loc, nr, idx, d = bvh.find_nearest(p); nrm.append(nr if nr is not None else Vector((0, 0, 1)))
    return pts, nrm


def cyl_uv_at(o, cx, cy, u_mid=0.0, sx=1.0, zmin=None, zmax=None):
    """UV cilíndrica alrededor de un eje vertical en (cx, cy): u=0.5 en el acimut u_mid (rad, 0 = frente -Y,
    +90° = +X·sx). sx=-1 para piezas espejadas (la textura no sale al revés)."""
    me = o.data
    uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    zs = [v.co.z for v in me.vertices]; zmin = min(zs) if zmin is None else zmin; zmax = max(zs) if zmax is None else zmax
    for p in me.polygons:
        us = []
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            a = math.atan2(sx * (co.x - cx), -(co.y - cy)) - u_mid
            us.append(((a / (2 * math.pi) + 0.5) % 1.0))
        if max(us) - min(us) > 0.5: us = [u + 1 if u < 0.5 else u for u in us]
        for li, u in zip(p.loop_indices, us):
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (u, (co.z - zmin) / max(1e-6, zmax - zmin))


def ensure_uv(o):
    me = o.data
    if not me.uv_layers: me.uv_layers.new(name='UVMap')
    me.uv_layers[0].name = 'UVMap'


def limb_weights_z(o, bone_l, bone_r, z0, z1, x_soft=0.05, keep=('pieL',)):
    """Como limb_weights, para piernas: la rampa va por ALTURA (0 en z0 → 1 en z1, z1 < z0) y el lado por el
    signo de X (bone_l en +X). Sólo pasa al hueso de la pierna el peso que no es ya de pierna (`keep`)."""
    gl = o.vertex_groups.get(bone_l) or o.vertex_groups.new(name=bone_l)
    gr = o.vertex_groups.get(bone_r) or o.vertex_groups.new(name=bone_r)
    names = {g.index: g.name for g in o.vertex_groups}
    for v in o.data.vertices:
        w = min(1.0, max(0.0, (z0 - v.co.z) / (z0 - z1)))
        w *= min(1.0, abs(v.co.x) / x_soft)
        if w <= 0: continue
        moved = 0.0
        for g in v.groups:
            if names[g.group].startswith(keep): continue
            moved += g.weight * w; g.weight *= (1 - w)
        if moved > 0: (gl if v.co.x > 0 else gr).add([v.index], moved, 'ADD')
    clean_weights(o)


def preview_tiles(objs, name, suffix, target, dist, views, size=210, elev=0.25):
    """Como preview_head pero con sufijo y elevación libres: tests/out/ropa/<name>_<suffix>.png.
    views = (nombre, acimut°) con 0 = frente; elev = altura de la cámara relativa a dist."""
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'
    sc.render.resolution_x = size; sc.render.resolution_y = size; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    cam = bpy.data.objects.get('CamPrev')
    if not cam:
        cam = bpy.data.objects.new('CamPrev', bpy.data.cameras.new('CamPrev')); sc.collection.objects.link(cam)
    sc.camera = cam; cam.data.lens = 50
    t = Vector(target); tiles = []
    import numpy as np
    for vn, az in views:
        a = math.radians(az)
        cam.location = t + Vector((math.sin(a) * dist, -math.cos(a) * dist, elev * dist))
        cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
        fp = os.path.join(PREV, '_tmp_%s.png' % vn)
        sc.render.filepath = fp; bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(fp); px = np.array(im.pixels[:]).reshape(size, size, 4)
        tiles.append(px); bpy.data.images.remove(im); os.remove(fp)
    out = np.concatenate(tiles, axis=1)
    im = bpy.data.images.new('prev_' + name, size * len(tiles), size, alpha=True)
    im.pixels = out.ravel().tolist()
    im.filepath_raw = os.path.join(PREV, '%s_%s.png' % (name, suffix)); im.file_format = 'PNG'; im.save()
    bpy.data.images.remove(im)


def pose_bones(rot):
    """Pone la pose {hueso: (eje 'X'|'Y'|'Z', ángulo)} sobre el reposo (rotación local del hueso)."""
    from mathutils import Quaternion
    rest_pose(); rig = RIG()
    for bn, (ax, ang) in rot.items():
        pb = rig.pose.bones[bn]; pb.rotation_mode = 'QUATERNION'
        axis = {'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[ax]
        pb.rotation_quaternion = Quaternion(axis, ang)
    bpy.context.view_layer.update()


def check_posed(objs, rot, min_out=0.0):
    """Con la pose `rot`, cuenta vértices de la ropa (deformada) dentro del cuerpo (deformado)."""
    pose_bones(rot)
    dg = bpy.context.evaluated_depsgraph_get()
    b = BODY().evaluated_get(dg); me = b.to_mesh(); mw = BODY().matrix_world
    bvh = BVHTree.FromPolygons([mw @ v.co for v in me.vertices], [tuple(p.vertices) for p in me.polygons])
    b.to_mesh_clear(); bad = 0; worst = 1.0; tot = 0
    for o in objs:
        e = o.evaluated_get(dg); m2 = e.to_mesh()
        for v in m2.vertices:
            p = o.matrix_world @ v.co; loc, nrm, idx, dist = bvh.find_nearest(p)
            if loc is None: continue
            sd = dist if (p - loc).dot(nrm) >= 0 else -dist
            tot += 1; worst = min(worst, sd)
            if sd < min_out: bad += 1
        e.to_mesh_clear()
    print('POSED', rot, 'inside=%d/%d worst=%.4f' % (bad, tot, worst))
    return bad, worst


def glb_kb(name):
    p = os.path.join(OUT, name + '.glb')
    return os.path.getsize(p) / 1024 if os.path.exists(p) else 0


# ---------------------------------------------------------------------------------------------- contrato de UV de TELA
# Acordado con el TA (wardrobe.js), 2026-10-24: escala métrica fija, 1 unidad de u = 1,2 m y 1 de v = 0,6 m (lienzo de
# 512×256 isotrópico), V sin invertir (arriba de la prenda = arriba), y en Blender u crece hacia la IZQUIERDA de quien mira
# la cara desde fuera (el juego gira 180° las UV de TELA/PAJA al cargar: así el asta de la bandera queda a la izquierda).
# La bandera (estilo 'pr') se dibuja centrada en (0.5, 0.5) con el alto `av_flag_h` (m) que lleve el material TELA.
UV_MU, UV_MV = 1.2, 0.6


def tela_metric(m, flag_h=None):
    """Marca el material TELA con el contrato métrico (extras av_uv y, si hay bandera, av_flag_h en metros)."""
    m['av_uv'] = 1
    if flag_h: m['av_flag_h'] = round(float(flag_h), 4)
    return m


def uv_planar_metric(o, origin, right, up, mat_names=None):
    """UV métrica plana: u = 0.5 − (p−origin)·right/1.2, v = 0.5 + (p−origin)·up/0.6. `right` es la derecha de quien
    mira la cara desde fuera; `origin` es el centro de la bandera. mat_names: sólo esas caras (None = todas)."""
    me = o.data; uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    org = Vector(origin); rt = Vector(right).normalized(); up = Vector(up).normalized()
    names = [m.name if m else '' for m in me.materials]
    for p in me.polygons:
        if mat_names and names[p.material_index] not in mat_names: continue
        for li in p.loop_indices:
            q = me.vertices[me.loops[li].vertex_index].co - org
            uv.data[li].uv = (0.5 - q.dot(rt) / UV_MU, 0.5 + q.dot(up) / UV_MV)


def skin_part(o, block=('cabeza.001', 'cabeza', 'pico'), to='espalda2'):
    """Pesos de la piel más cercana para correas y tiras que van sobre el cuerpo (siguen hombros y pecho al animarse),
    sin seguir a la cabeza: el peso de los huesos de `block` pasa a `to`. Deja la pieza sin modificador de esqueleto."""
    o.vertex_groups.clear()
    weights_from_body(o)
    names = {g.index: g.name for g in o.vertex_groups}
    gt = o.vertex_groups.get(to) or o.vertex_groups.new(name=to)
    for v in o.data.vertices:
        moved = 0.0
        for g in v.groups:
            if names.get(g.group) in block: moved += g.weight; g.weight = 0.0
        if moved: gt.add([v.index], moved, 'ADD')
    for b in block:
        g = o.vertex_groups.get(b)
        if g: o.vertex_groups.remove(g)
    clean_weights(o)
    return o


def rigid_part(o, bone):
    """Como rigid() pero sin modificador (para juntar con piezas pesadas por piel y poner el esqueleto al final)."""
    o.vertex_groups.clear()
    g = o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    return o


def target_bvh(objs):
    """BVH de unas mallas (coordenadas de mundo) para pegar parches encima."""
    verts, polys = [], []
    for o in objs:
        me = o.data; mw = o.matrix_world; base = len(verts)
        verts += [mw @ v.co for v in me.vertices]; polys += [tuple(base + i for i in p.vertices) for p in me.polygons]
    return BVHTree.FromPolygons(verts, polys)


def flag_patch(name, center, right, up, h, onto=None, off=0.002, nu=12, nv=8, th=0.0012):
    """Parche de la bandera de Puerto Rico (contrato con el TA): material BANDERA, 3:2 (ancho = 1,5·h), UV (0,0) abajo
    en el asta y (1,1) arriba al vuelo, sin giro (el juego le pone la textura fiel). `right`/`up` son la derecha y el
    arriba de quien lo mira de frente (el asta queda a su izquierda). Con `onto` (BVH) se pega a `off` de esa superficie
    siguiendo su curvatura (parche cosido); si no, queda plano. Grosor `th` hacia dentro, con canto."""
    c = Vector(center); rt = Vector(right).normalized(); up = Vector(up).normalized()
    up = (up - rt * up.dot(rt)).normalized(); n = rt.cross(up)   # n: hacia quien mira
    w = 1.5 * h
    me = bpy.data.meshes.new(name); bm = bmesh.new(); V = []
    for j in range(nv + 1):
        row = []
        for i in range(nu + 1):
            p = c + rt * (w * (i / nu - 0.5)) + up * (h * (j / nv - 0.5))
            if onto is not None:
                hit = onto.ray_cast(p + n * 0.06, -n, 0.15)
                if hit[0] is not None:
                    nn = hit[1] if hit[1].dot(n) > 0 else -hit[1]
                    p = hit[0] + nn * off
            row.append(bm.verts.new(p))
        V.append(row)
    uvl = bm.loops.layers.uv.new('UVMap')
    for j in range(nv):
        for i in range(nu):
            f = bm.faces.new((V[j][i], V[j][i + 1], V[j + 1][i + 1], V[j + 1][i]))
            for lp, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uvl].uv = (a / nu, b / nv)
    bm.normal_update()
    if sum(f.normal.dot(n) for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if th:
        add_mod(o, 'SOLIDIFY', thickness=th, offset=-1, use_rim=True)
        add_mod(o, 'BEVEL', width=th * 0.45, segments=1, limit_method='ANGLE', angle_limit=math.radians(60))
        apply_mods(o)
    return set_mat(o, mat('BANDERA', hexrgb('#ffffff'), 0.75))
