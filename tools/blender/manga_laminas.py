# G17c · láminas del creador de cómics.
# Renders fuera de línea del modelo oficial (assets/models/vittata.glb).
# No modifica el glb ni el rig: la pose vive solo en esta sesión de Blender.
# Uso: blender -b --python tools/blender/manga_laminas.py -- assets/manga/laminas
import math
import os
import sys

import bpy
from mathutils import Vector

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VITTATA = os.path.join(RAIZ, 'assets', 'models', 'vittata.glb')
FLORA = {
    'palma': os.path.join(RAIZ, 'assets', 'models', 'entorno', 'palma_sierra.glb'),
    'ceiba': os.path.join(RAIZ, 'assets', 'models', 'entorno', 'ceiba.glb'),
    'helecho': os.path.join(RAIZ, 'assets', 'models', 'entorno', 'helecho_arboreo.glb'),
    'piedra': os.path.join(RAIZ, 'assets', 'models', 'entorno', 'piedras_rio.glb'),
    'tabonuco': os.path.join(RAIZ, 'assets', 'models', 'entorno', 'tabonuco.glb'),
    'flamboyan': os.path.join(RAIZ, 'assets', 'models', 'entorno', 'flamboyan.glb'),
    'roca': os.path.join(RAIZ, 'assets', 'models', 'entorno', 'roca_musgo_a.glb'),
}

# id, archivo, animación, fotograma, encuadre, fondo, luz cálida
TOMAS = [
    ('01_comienzo', 'Welcome', 12, 'vuelo', 'costa', False),
    ('02_camino', 'Curious', 18, 'suelo', 'selva', False),
    ('03_confusion', 'Curious', 8, 'cara', 'cascada', False),
    ('04_intento', 'Welcome', 20, 'vuelo', 'bahia', False),
    ('05_velocidad', 'Welcome', 16, 'rasante', 'arco', False),
    ('06_meta', 'Celebrate', 14, 'meta', 'meta', True),
]


def args_salida():
    if '--' in sys.argv:
        resto = sys.argv[sys.argv.index('--') + 1:]
        if resto:
            return os.path.abspath(resto[0])
    return os.path.join(RAIZ, 'assets', 'manga', 'laminas')


def limpiar_escena():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def importar_glb(ruta):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=ruta)
    nuevos = [o for o in bpy.data.objects if o not in antes]
    limpios = []
    for o in nuevos:
        # El importador de esta Blender deja un icosaedro suelto que no está en el glb.
        if o.type == 'MESH' and o.name.startswith('Icosphere') and len(o.data.vertices) < 80 and not o.material_slots:
            bpy.data.objects.remove(o, do_unlink=True)
            continue
        limpios.append(o)
    return limpios


def mat_color(nombre, color, rugosidad=0.6, emision=0.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*color, 1)
    em.inputs['Strength'].default_value = emision if emision else 1.0
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rugosidad
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    if emision:
        nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    else:
        nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return m


def toon(mat):
    """Cel sobre la textura que ya trae el material. No crea una cotorra nueva."""
    if not mat or not mat.use_nodes:
        return
    img = None
    for n in mat.node_tree.nodes:
        if n.type == 'TEX_IMAGE' and n.image:
            img = n.image
            break
    nt = mat.node_tree
    nt.nodes.clear()
    nt.links.clear()
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    diff = nt.nodes.new('ShaderNodeBsdfDiffuse')
    diff.inputs['Roughness'].default_value = 1.0
    diff.inputs['Color'].default_value = (1, 1, 1, 1)
    s2r = nt.nodes.new('ShaderNodeShaderToRGB')
    nt.links.new(diff.outputs['BSDF'], s2r.inputs['Shader'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    els = ramp.color_ramp.elements
    els[0].position = 0.18
    els[0].color = (0.72, 0.72, 0.76, 1)
    els[1].position = 0.46
    els[1].color = (0.9, 0.9, 0.92, 1)
    mid = els.new(0.68)
    mid.color = (1, 1, 1, 1)
    mul = nt.nodes.new('ShaderNodeMixRGB')
    mul.blend_type = 'MULTIPLY'
    mul.inputs['Fac'].default_value = 1
    if img:
        nt.links.new(tex.outputs['Color'], mul.inputs['Color1'])
    else:
        mul.inputs['Color1'].default_value = (0.2, 0.7, 0.28, 1)
    nt.links.new(ramp.outputs['Color'], mul.inputs['Color2'])
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = 1.05
    nt.links.new(mul.outputs['Color'], em.inputs['Color'])
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    mat.use_backface_culling = False


def tinta():
    if 'av_tinta' in bpy.data.materials:
        return bpy.data.materials['av_tinta']
    return mat_color('av_tinta', (0.05, 0.04, 0.03), emision=1.0)


def contorno(obj, grueso):
    dup = obj.copy()
    dup.data = obj.data.copy()
    dup.name = obj.name + '_tinta'
    obj.users_collection[0].objects.link(dup)
    dup.parent = obj.parent
    dup.matrix_parent_inverse = obj.matrix_parent_inverse.copy()
    for mod in list(dup.modifiers):
        if mod.type != 'ARMATURE':
            dup.modifiers.remove(mod)
    sol = dup.modifiers.new('contorno', 'SOLIDIFY')
    sol.thickness = grueso
    sol.offset = 1
    sol.use_flip_normals = True
    sol.material_offset = 0
    dup.data.materials.clear()
    m = tinta()
    m.use_backface_culling = True
    dup.data.materials.append(m)
    return dup


def cielo(calido):
    w = bpy.data.worlds.new('cielo')
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    coord = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coord.outputs['Window'], sep.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.08
    ramp.color_ramp.elements[1].position = 0.62
    if calido:
        ramp.color_ramp.elements[0].color = (0.98, 0.55, 0.22, 1)
        ramp.color_ramp.elements[1].color = (0.25, 0.55, 0.92, 1)
    else:
        ramp.color_ramp.elements[0].color = (0.98, 0.86, 0.55, 1)
        ramp.color_ramp.elements[1].color = (0.20, 0.55, 0.95, 1)
    nt.links.new(sep.outputs['Y'], ramp.inputs['Fac'])
    bg = nt.nodes.new('ShaderNodeBackground')
    bg.inputs['Strength'].default_value = 1.2
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    out = nt.nodes.new('ShaderNodeOutputWorld')
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])


def sol(calido):
    luz = bpy.data.lights.new('sol', 'SUN')
    luz.energy = 4.2 if not calido else 5.0
    luz.color = (1.0, 0.78, 0.48) if calido else (1.0, 0.93, 0.78)
    luz.angle = math.radians(8)
    ob = bpy.data.objects.new('sol', luz)
    bpy.context.scene.collection.objects.link(ob)
    ob.rotation_euler = (math.radians(48), math.radians(-18), math.radians(28))
    relleno = bpy.data.lights.new('cielo', 'SUN')
    relleno.energy = 2.4
    relleno.color = (0.75, 0.86, 1.0)
    ob2 = bpy.data.objects.new('cielo_luz', relleno)
    bpy.context.scene.collection.objects.link(ob2)
    ob2.rotation_euler = (math.radians(78), 0, math.radians(180))


def plano(nombre, color, loc, scale, rugosidad=0.7):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = nombre
    ob.scale = scale
    ob.data.materials.append(mat_color(nombre + '_m', color, rugosidad))
    return ob


def cubo(nombre, color, loc, scale):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = nombre
    ob.scale = scale
    ob.data.materials.append(mat_color(nombre + '_m', color, 0.55))
    return ob


def cilindro(nombre, color, loc, scale, verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=1, depth=1, location=loc)
    ob = bpy.context.active_object
    ob.name = nombre
    ob.scale = scale
    ob.data.materials.append(mat_color(nombre + '_m', color, 0.5))
    return ob


def altura_de(objs):
    zs = []
    for o in objs:
        if o.type != 'MESH':
            continue
        for corner in o.bound_box:
            zs.append((o.matrix_world @ Vector(corner)).z)
    return (max(zs) - min(zs)) if zs else 1.0


def colocar_flora(clave, loc, alto_meta, giro=0.0):
    ruta = FLORA.get(clave)
    if not ruta or not os.path.isfile(ruta):
        return []
    nuevos = importar_glb(ruta)
    raiz = None
    for o in nuevos:
        if o.parent is None:
            raiz = o
            break
    if raiz is None and nuevos:
        raiz = nuevos[0]
    if raiz:
        h = altura_de(nuevos) or 1.0
        s = alto_meta / h
        raiz.location = Vector(loc)
        raiz.scale = Vector((s, s, s))
        raiz.rotation_euler.z = giro
        bpy.context.view_layer.update()
        # Apoya la planta en z = 0.
        zs = []
        for o in nuevos:
            if o.type != 'MESH':
                continue
            for corner in o.bound_box:
                zs.append((o.matrix_world @ Vector(corner)).z)
        if zs:
            raiz.location.z += -min(zs)
    return nuevos


def fondo(tipo):
    plano('suelo', (0.16, 0.58, 0.24), (0, 2, 0), (40, 40, 1))
    if tipo == 'costa':
        plano('mar', (0.10, 0.58, 0.88), (0, 8, 0.02), (36, 14, 1), 0.08)
        colocar_flora('palma', (-2.4, 3.2, 0), 4.2, 0.4)
        colocar_flora('palma', (2.8, 4.0, 0), 3.6, -0.5)
        cubo('faro', (0.75, 0.58, 0.32), (-3.6, 5.5, 1.6), (0.45, 0.45, 3.2))
        cubo('torre', (0.48, 0.36, 0.26), (-3.6, 5.5, 3.4), (0.6, 0.6, 0.4))
    elif tipo == 'selva':
        plano('senda', (0.48, 0.34, 0.16), (0.2, 3.2, 0.03), (1.6, 8, 1), 0.85)
        colocar_flora('tabonuco', (-2.2, 3.6, 0), 4.8, 0.4)
        colocar_flora('ceiba', (2.4, 4.2, 0), 5.2, -0.3)
        colocar_flora('helecho', (1.5, 2.4, 0), 1.5, 0.8)
        colocar_flora('roca', (-1.4, 2.2, 0), 0.7, 0.2)
        cubo('poste', (0.42, 0.26, 0.12), (1.35, 1.8, 0.85), (0.08, 0.08, 1.7))
        cubo('tabla', (0.95, 0.95, 0.92), (1.35, 1.65, 1.45), (0.55, 0.06, 0.38))
    elif tipo == 'cascada':
        plano('agua', (0.12, 0.66, 0.82), (0, 1.6, 0.02), (10, 4, 1), 0.06)
        cubo('risco', (0.32, 0.48, 0.30), (0, 3.6, 2.2), (3.2, 0.7, 4.4))
        cubo('caida', (0.86, 0.94, 0.98), (0, 3.15, 2.0), (0.7, 0.12, 3.6))
        colocar_flora('helecho', (-1.6, 2.0, 0), 1.8, 0.6)
        colocar_flora('palma', (2.2, 3.2, 0), 3.4, -0.4)
        colocar_flora('roca', (-1.3, 1.2, 0), 0.8, 0.3)
    elif tipo == 'bahia':
        plano('mar', (0.08, 0.62, 0.86), (0, 6, 0.02), (24, 12, 1), 0.08)
        colocar_flora('palma', (-2.6, 2.8, 0), 4.0, 0.2)
        colocar_flora('flamboyan', (2.6, 3.4, 0), 3.6, 1.1)
        cubo('acantilado', (0.30, 0.50, 0.28), (4.2, 5.5, 1.4), (2.2, 1.6, 2.8))
    elif tipo in ('arco', 'meta'):
        plano('rio', (0.12, 0.70, 0.78), (0, 3.5, 0.02), (6, 10, 1), 0.06)
        cubo('pilar_i', (0.62, 0.46, 0.30), (-1.7, 3.6, 1.5), (0.55, 0.55, 3.0))
        cubo('pilar_d', (0.62, 0.46, 0.30), (1.7, 3.6, 1.5), (0.55, 0.55, 3.0))
        cubo('dintel', (0.52, 0.38, 0.26), (0, 3.6, 3.15), (4.0, 0.6, 0.45))
        colocar_flora('palma', (-3.2, 2.4, 0), 3.8, 0.3)
        colocar_flora('ceiba', (3.4, 3.2, 0), 4.6, -0.2)
        if tipo == 'meta':
            bpy.ops.mesh.primitive_plane_add(size=1, location=(2.4, 5.2, 3.2))
            band = bpy.context.active_object
            band.name = 'bandera'
            band.scale = (1.6, 1, 0.9)
            band.rotation_euler = (math.radians(90), 0, 0)
            m = bpy.data.materials.new('ajedrez')
            m.use_nodes = True
            nt = m.node_tree
            ch = nt.nodes.new('ShaderNodeTexChecker')
            ch.inputs['Scale'].default_value = 6
            ch.inputs['Color1'].default_value = (0.08, 0.07, 0.06, 1)
            ch.inputs['Color2'].default_value = (0.95, 0.95, 0.92, 1)
            bsdf = nt.nodes.get('Principled BSDF')
            nt.links.new(ch.outputs['Color'], bsdf.inputs['Base Color'])
            band.data.materials.append(m)


def encuadre(cam, modo, centro):
    c = Vector(centro)
    if modo == 'cara':
        cam.location = c + Vector((0.95, -1.55, 0.05))
        blanco = c + Vector((0, 0.05, 0.12))
    elif modo == 'suelo':
        cam.location = c + Vector((1.55, -2.45, 0.25))
        blanco = c + Vector((0, 0.1, -0.05))
    elif modo == 'rasante':
        cam.location = c + Vector((1.9, -1.95, -0.05))
        blanco = c + Vector((-0.1, 0.15, -0.08))
    elif modo == 'meta':
        cam.location = c + Vector((1.45, -2.35, 0.28))
        blanco = c + Vector((0, 0.1, -0.02))
    else:
        cam.location = c + Vector((1.65, -2.55, 0.28))
        blanco = c + Vector((0, 0.08, -0.08))
    cam.rotation_euler = (blanco - cam.location).to_track_quat('-Z', 'Y').to_euler()
    return blanco


def pose(rig, nombre, frame, modo):
    if rig.animation_data is None:
        rig.animation_data_create()
    accion = bpy.data.actions.get(nombre + '_Rig') or bpy.data.actions.get(nombre)
    if accion:
        rig.animation_data.action = accion
    bpy.context.scene.frame_set(frame)
    # La cámara está en −Y: se gira el rig para que la cara mire hacia ella.
    # El giro vive en la sesión; el glb no se guarda.
    rig.rotation_euler.z = math.radians(180)
    if modo in ('vuelo', 'rasante'):
        rig.rotation_euler.x = math.radians(16 if modo == 'vuelo' else 26)
    else:
        rig.rotation_euler.x = 0
    bpy.context.view_layer.update()


def preparar_pajaro(objs):
    rig = next((o for o in objs if o.type == 'ARMATURE'), None)
    mallas = [o for o in objs if o.type == 'MESH']
    for m in bpy.data.materials:
        if m.name.startswith('av_'):
            continue
        toon(m)
    # El glb llega con la cotorra de pie. Medimos y dejamos el pecho cerca del origen.
    bpy.context.view_layer.update()
    xs, ys, zs = [], [], []
    for o in mallas:
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            xs.append(w.x); ys.append(w.y); zs.append(w.z)
    alto = (max(zs) - min(zs)) if zs else 1
    return rig, mallas, alto


def apoyar(objs, base_z, z_suelo):
    for o, z0 in base_z.items():
        o.location.z = z0
    bpy.context.view_layer.update()
    zs = []
    for o in objs:
        if o.type != 'MESH' or o.name.endswith('_tinta'):
            continue
        for corner in o.bound_box:
            zs.append((o.matrix_world @ Vector(corner)).z)
    if not zs:
        return
    shift = z_suelo - min(zs)
    for o, z0 in base_z.items():
        o.location.z = z0 + shift


def main():
    salida = args_salida()
    os.makedirs(salida, exist_ok=True)
    limpiar_escena()
    if not os.path.isfile(VITTATA):
        raise SystemExit('no está el modelo oficial: ' + VITTATA)
    pajaro = importar_glb(VITTATA)
    for o in list(pajaro):
        if o.type == 'MESH' and o.name != 'Vittata':
            bpy.data.objects.remove(o, do_unlink=True)
            pajaro.remove(o)
    rig, mallas, alto = preparar_pajaro(pajaro)
    tintas = [o for o in bpy.data.objects if o.name.endswith('_tinta')]
    pajaro = list(pajaro) + tintas
    base_z = {o: o.location.z for o in pajaro if o.parent is None}
    print('ALTO', round(alto, 3), 'RIG', rig.name if rig else None, 'RAICES', list(base_z))

    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.eevee.taa_render_samples = 24
    sc.eevee.use_gtao = True
    sc.render.resolution_x = 960
    sc.render.resolution_y = 600
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'JPEG'
    sc.render.image_settings.quality = 86
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = 0.35
    sc.render.use_freestyle = True
    vl = sc.view_layers[0]
    vl.use_freestyle = True
    fs = vl.freestyle_settings
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('contorno')
    if ls.linestyle is None:
        ls.linestyle = bpy.data.linestyles.new('tinta')
    ls.select_silhouette = True
    ls.select_border = True
    ls.select_crease = False
    ls.select_edge_mark = False
    ls.select_external_contour = True
    estilo = ls.linestyle
    estilo.color = (0.08, 0.05, 0.03)
    estilo.thickness = 2.8
    col = bpy.data.collections.new('pajaro')
    sc.collection.children.link(col)
    for o in list(pajaro):
        for c in list(o.users_collection):
            c.objects.unlink(o)
        col.objects.link(o)
    ls.select_by_collection = True
    ls.collection = col
    ls.collection_negation = 'INCLUSIVE'

    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens = 42
    cam = bpy.data.objects.new('cam', cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam

    for nombre, anim, frame, modo, fondo_id, calido in TOMAS:
        # Cada lámina parte del mismo modelo: se quita el decorado, no el pájaro.
        conservar = set(pajaro) | {cam}
        for o in list(bpy.data.objects):
            if o not in conservar and not o.name.endswith('_tinta'):
                bpy.data.objects.remove(o, do_unlink=True)
            elif o.name.endswith('_tinta') and o not in pajaro:
                conservar.add(o)
        cielo(calido)
        sol(calido)
        fondo(fondo_id)
        for m in bpy.data.materials:
            if not m.use_nodes:
                continue
            for n in m.node_tree.nodes:
                alfa = n.inputs.get('Alpha') if hasattr(n, 'inputs') else None
                if n.type == 'BSDF_PRINCIPLED' and alfa and alfa.is_linked:
                    m.blend_method = 'HASHED'
                    m.shadow_method = 'HASHED'
        if rig:
            pose(rig, anim, frame, modo)
        apoyar(pajaro, base_z, 1.45 if modo in ('vuelo', 'rasante') else 0.02)
        bpy.context.view_layer.update()
        zs, xs, ys = [], [], []
        for o in mallas:
            for corner in o.bound_box:
                w = o.matrix_world @ Vector(corner)
                xs.append(w.x); ys.append(w.y); zs.append(w.z)
        centro = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, (min(zs) + max(zs)) / 2 + (0.05 if modo != 'cara' else 0.2))
        encuadre(cam, modo, centro)
        if modo == 'cara':
            cam.data.lens = 58
        elif modo == 'rasante':
            cam.data.lens = 36
        else:
            cam.data.lens = 42
        ruta = os.path.join(salida, nombre + '.jpg')
        sc.render.filepath = ruta
        bpy.ops.render.render(write_still=True)
        print('LAMINA', ruta)

    print('LISTO', salida)


if __name__ == '__main__':
    main()
