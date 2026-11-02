# G17d · láminas del creador de cómics.
# Renders fuera de línea del modelo oficial (assets/models/vittata.glb).
# No modifica el glb ni el rig: la pose vive solo en esta sesión de Blender.
# Fondos con la flora y las ruinas del mapa (selva, cascada, costa, río, arco).
# Uso: blender -b --python tools/blender/manga_laminas.py -- assets/manga/laminas [prefijo]
import math
import os
import sys

import bpy
from mathutils import Vector

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VITTATA = os.path.join(RAIZ, 'assets', 'models', 'vittata.glb')
ENT = os.path.join(RAIZ, 'assets', 'models', 'entorno')
EDI = os.path.join(RAIZ, 'assets', 'models', 'edificios')
FLORA = {
    'palma': os.path.join(ENT, 'palma_sierra.glb'),
    'ceiba': os.path.join(ENT, 'ceiba.glb'),
    'helecho': os.path.join(ENT, 'helecho_arboreo.glb'),
    'helecho_suelo': os.path.join(ENT, 'helecho_suelo.glb'),
    'piedra': os.path.join(ENT, 'piedras_rio.glb'),
    'tabonuco': os.path.join(ENT, 'tabonuco.glb'),
    'flamboyan': os.path.join(ENT, 'flamboyan.glb'),
    'roca': os.path.join(ENT, 'roca_musgo_a.glb'),
    'bambu': os.path.join(ENT, 'bambu.glb'),
    'heliconia': os.path.join(ENT, 'heliconia.glb'),
    'portal': os.path.join(EDI, 'ruina_portal_lejos.glb'),
    'torre': os.path.join(EDI, 'ruina_torre_lejos.glb'),
    'pilar': os.path.join(EDI, 'ruina_pilar_lejos.glb'),
}

# id, pose de sesión, fondo, luz cálida
TOMAS = [
    ('01_comienzo', 'vuelo', 'costa', False),
    ('02_camino', 'mira', 'selva', False),
    ('03_confusion', 'rasca', 'cascada', False),
    ('04_intento', 'vuelo', 'bahia', False),
    ('05_velocidad', 'rasante', 'arco', False),
    ('06_meta', 'celebra', 'meta', True),
    ('07_hero', 'celebra', 'hero', True),
]

ORIGINALES = set()


def args_salida():
    resto = []
    if '--' in sys.argv:
        resto = sys.argv[sys.argv.index('--') + 1:]
    salida = os.path.abspath(resto[0]) if resto else os.path.join(RAIZ, 'assets', 'manga', 'laminas')
    filtro = resto[1] if len(resto) > 1 else ''
    return salida, filtro


def limpiar_escena():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def importar_glb(ruta):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=ruta)
    nuevos = [o for o in bpy.data.objects if o not in antes]
    limpios = []
    for o in nuevos:
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
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    if emision:
        em = nt.nodes.new('ShaderNodeEmission')
        em.inputs['Color'].default_value = (*color, 1)
        em.inputs['Strength'].default_value = emision
        nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    else:
        bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
        bsdf.inputs['Base Color'].default_value = (*color, 1)
        bsdf.inputs['Roughness'].default_value = rugosidad
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
    s2r = nt.nodes.new('ShaderNodeShaderToRGB')
    nt.links.new(diff.outputs['BSDF'], s2r.inputs['Shader'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    els = ramp.color_ramp.elements
    els[0].position = 0.22
    els[0].color = (0.42, 0.36, 0.28, 1)
    els[1].position = 0.48
    els[1].color = (0.78, 0.72, 0.6, 1)
    mid = els.new(0.66)
    mid.color = (1, 0.98, 0.92, 1)
    mul = nt.nodes.new('ShaderNodeMixRGB')
    mul.blend_type = 'MULTIPLY'
    mul.inputs['Fac'].default_value = 1
    if img:
        nt.links.new(tex.outputs['Color'], mul.inputs['Color1'])
    else:
        mul.inputs['Color1'].default_value = (0.15, 0.62, 0.22, 1)
    nt.links.new(ramp.outputs['Color'], mul.inputs['Color2'])
    sat = nt.nodes.new('ShaderNodeHueSaturation')
    sat.inputs['Saturation'].default_value = 1.45
    sat.inputs['Value'].default_value = 1.08
    nt.links.new(mul.outputs['Color'], sat.inputs['Color'])
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = 1.12
    nt.links.new(sat.outputs['Color'], em.inputs['Color'])
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    mat.use_backface_culling = False


def tinta():
    if 'av_tinta' in bpy.data.materials:
        return bpy.data.materials['av_tinta']
    return mat_color('av_tinta', (0.04, 0.03, 0.02), emision=1.0)


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
    if calido:
        paradas = [(0.0, (0.98, 0.42, 0.12, 1)), (0.28, (0.98, 0.72, 0.28, 1)), (0.62, (0.18, 0.48, 0.88, 1))]
    else:
        paradas = [(0.0, (0.98, 0.78, 0.42, 1)), (0.32, (0.28, 0.7, 0.96, 1)), (0.7, (0.08, 0.38, 0.86, 1))]
    els = ramp.color_ramp.elements
    els[0].position = paradas[0][0]
    els[0].color = paradas[0][1]
    els[1].position = paradas[-1][0]
    els[1].color = paradas[-1][1]
    medio = els.new(paradas[1][0])
    medio.color = paradas[1][1]
    nt.links.new(sep.outputs['Y'], ramp.inputs['Fac'])
    bg = nt.nodes.new('ShaderNodeBackground')
    bg.inputs['Strength'].default_value = 1.35
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    out = nt.nodes.new('ShaderNodeOutputWorld')
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])


def sol(calido):
    luz = bpy.data.lights.new('sol', 'SUN')
    luz.energy = 5.4 if calido else 4.6
    luz.color = (1.0, 0.72, 0.38) if calido else (1.0, 0.9, 0.7)
    luz.angle = math.radians(6)
    ob = bpy.data.objects.new('sol', luz)
    bpy.context.scene.collection.objects.link(ob)
    ob.rotation_euler = (math.radians(42), math.radians(-24), math.radians(32))
    relleno = bpy.data.lights.new('cielo', 'SUN')
    relleno.energy = 1.6
    relleno.color = (0.62, 0.78, 1.0)
    ob2 = bpy.data.objects.new('cielo_luz', relleno)
    bpy.context.scene.collection.objects.link(ob2)
    ob2.rotation_euler = (math.radians(70), 0, math.radians(200))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.85, location=(4.2, 7.5, 7.2))
    disco = bpy.context.active_object
    disco.name = 'disco_sol'
    disco.data.materials.append(mat_color('disco_sol', (1.0, 0.86, 0.28), emision=6.0))


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


def altura_de(objs):
    zs = []
    for o in objs:
        if o.type != 'MESH':
            continue
        for corner in o.bound_box:
            zs.append((o.matrix_world @ Vector(corner)).z)
    return (max(zs) - min(zs)) if zs else 1.0


def biblioteca():
    col = bpy.data.collections.new('biblio')
    for clave, ruta in FLORA.items():
        if not os.path.isfile(ruta):
            print('FALTA', clave)
            continue
        nuevos = importar_glb(ruta)
        for o in nuevos:
            for c in list(o.users_collection):
                c.objects.unlink(o)
            col.objects.link(o)
            ORIGINALES.add(o)
        FLORA[clave] = nuevos
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        for n in m.node_tree.nodes:
            alfa = n.inputs.get('Alpha') if hasattr(n, 'inputs') else None
            if n.type == 'BSDF_PRINCIPLED' and alfa and alfa.is_linked:
                m.blend_method = 'HASHED'
                m.shadow_method = 'HASHED'


def clonar(clave, loc, alto_meta, giro=0.0):
    origen = FLORA.get(clave)
    if not origen or isinstance(origen, str):
        return []
    mapa = {}
    escena = bpy.context.scene.collection
    for o in origen:
        n = o.copy()
        if o.data:
            n.data = o.data
        mapa[o] = n
        escena.objects.link(n)
    for o, n in mapa.items():
        if o.parent in mapa:
            n.parent = mapa[o.parent]
            n.matrix_parent_inverse = o.matrix_parent_inverse.copy()
    raices = [mapa[o] for o in origen if o.parent not in mapa]
    bpy.context.view_layer.update()
    nuevos = list(mapa.values())
    h = altura_de(nuevos) or 1.0
    s = alto_meta / h
    for r in raices:
        r.location = Vector(loc)
        r.scale = Vector((s, s, s))
        r.rotation_euler.z = giro
    bpy.context.view_layer.update()
    zs = []
    for o in nuevos:
        if o.type != 'MESH':
            continue
        for corner in o.bound_box:
            zs.append((o.matrix_world @ Vector(corner)).z)
    if zs:
        shift = -min(zs)
        for r in raices:
            r.location.z += shift
    return nuevos


def montanas():
    datos = [(-7.5, 13, 6.2, 4.8), (-1.5, 15, 8.4, 6.2), (5.5, 12.5, 5.4, 4.0), (2.2, 11, 3.2, 2.6)]
    for i, (x, y, radio, alto) in enumerate(datos):
        bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=radio, depth=alto, location=(x, y, alto * 0.45))
        ob = bpy.context.active_object
        ob.name = 'monte_%d' % i
        verde = (0.04, 0.28, 0.12) if i % 2 == 0 else (0.1, 0.22, 0.12)
        ob.data.materials.append(mat_color(ob.name + '_m', verde, 0.9))


def suelo_verde():
    plano('suelo', (0.05, 0.42, 0.1), (0, 3.5, 0), (48, 48, 1), 0.85)


def cascada():
    cubo('risco', (0.22, 0.38, 0.24), (1.8, 6.2, 2.6), (4.2, 1.4, 5.6))
    cubo('risco2', (0.18, 0.32, 0.2), (-1.4, 6.6, 1.8), (2.2, 1.6, 3.8))
    for i, xoff in enumerate((-0.15, 0.35, 0.7)):
        bpy.ops.mesh.primitive_plane_add(size=1, location=(1.15 + xoff, 5.45, 2.3), rotation=(math.radians(86), 0, math.radians(3)))
        ob = bpy.context.active_object
        ob.name = 'caida_%d' % i
        ob.scale = (0.7, 1, 4.4)
        ob.data.materials.append(mat_color(ob.name + '_m', (0.75, 0.95, 1.0), emision=2.2))
    plano('poza', (0.02, 0.62, 0.74), (0.2, 2.4, 0.05), (12, 6, 1), 0.05)


def fondo(tipo):
    if tipo == 'hero':
        plano('suelo', (0.1, 0.45, 0.16), (0, 1.2, 0), (8, 8, 1), 0.8)
        clonar('roca', (0.15, 0.8, 0), 0.55, 0.4)
        clonar('heliconia', (-0.8, 1.1, 0), 0.7, 0.2)
        clonar('helecho_suelo', (0.9, 1.0, 0), 0.45, 1.0)
        return
    suelo_verde()
    montanas()
    if tipo == 'costa':
        plano('mar', (0.02, 0.62, 0.82), (0.4, 8, 0.03), (40, 16, 1), 0.04)
        clonar('palma', (-2.2, 1.6, 0), 4.4, 0.5)
        clonar('palma', (2.4, 1.8, 0), 3.8, -0.4)
        clonar('helecho', (1.8, 1.15, 0), 1.7, 0.6)
        clonar('palma', (-2.6, 3.4, 0), 5.2, 0.4)
        clonar('palma', (3.1, 4.2, 0), 4.4, -0.6)
        clonar('palma', (-4.2, 6.5, 0), 6.0, 0.2)
        clonar('flamboyan', (2.4, 3.0, 0), 3.2, 0.8)
        clonar('torre', (-3.8, 6.8, 0), 4.8, 0.3)
        clonar('portal', (1.2, 7.4, 0), 3.6, 0.1)
        clonar('roca', (-1.5, 2.2, 0), 0.7, 0.5)
        clonar('heliconia', (1.6, 2.0, 0), 0.9, 1.2)
    elif tipo == 'selva':
        plano('senda', (0.45, 0.28, 0.12), (0.35, 4.2, 0.04), (2.2, 12, 1), 0.9)
        clonar('bambu', (-1.7, 1.3, 0), 3.2, 0.4)
        clonar('helecho', (1.6, 1.2, 0), 1.8, -0.3)
        clonar('tabonuco', (-2.4, 3.2, 0), 6.2, 0.4)
        clonar('ceiba', (2.6, 3.8, 0), 7.0, -0.3)
        clonar('tabonuco', (-3.2, 6.4, 0), 7.4, 0.8)
        clonar('ceiba', (3.4, 6.8, 0), 6.6, 1.1)
        clonar('bambu', (-1.6, 2.4, 0), 3.4, 0.2)
        clonar('bambu', (1.8, 2.6, 0), 3.1, -0.4)
        clonar('helecho', (1.3, 2.0, 0), 1.8, 0.6)
        clonar('flamboyan', (-1.2, 5.5, 0), 3.6, 0.5)
        clonar('portal', (0.2, 8.2, 0), 4.2, 0.15)
        clonar('roca', (-1.2, 1.8, 0), 0.8, 0.3)
        cubo('poste', (0.42, 0.26, 0.12), (1.55, 2.1, 0.9), (0.08, 0.08, 1.8))
        cubo('tabla', (0.95, 0.95, 0.92), (1.55, 1.95, 1.55), (0.62, 0.06, 0.42))
    elif tipo == 'cascada':
        cascada()
        clonar('helecho', (-1.5, 1.15, 0), 1.9, 0.4)
        clonar('piedra', (1.5, 1.05, 0), 0.7, 0.2)
        clonar('helecho', (-1.8, 2.2, 0), 2.2, 0.5)
        clonar('helecho', (2.6, 2.8, 0), 1.8, -0.4)
        clonar('palma', (3.4, 4.6, 0), 4.6, 0.2)
        clonar('bambu', (-2.4, 3.4, 0), 3.6, 0.7)
        clonar('piedra', (-0.8, 1.6, 0), 0.9, 0.4)
        clonar('roca', (0.6, 1.5, 0), 0.7, 1.1)
        clonar('tabonuco', (-3.4, 5.2, 0), 5.5, 0.3)
    elif tipo == 'bahia':
        plano('mar', (0.0, 0.66, 0.84), (0.2, 7.5, 0.03), (36, 18, 1), 0.04)
        clonar('palma', (-1.9, 1.5, 0), 3.8, 0.4)
        clonar('flamboyan', (1.9, 1.4, 0), 2.6, 0.9)
        clonar('palma', (-2.8, 3.0, 0), 4.8, 0.3)
        clonar('palma', (3.2, 3.6, 0), 4.2, -0.5)
        clonar('flamboyan', (2.2, 2.6, 0), 3.4, 1.0)
        clonar('ceiba', (-4.0, 6.0, 0), 6.4, 0.2)
        cubo('acantilado', (0.22, 0.4, 0.22), (4.6, 6.2, 1.6), (2.4, 1.8, 3.4))
        clonar('torre', (4.4, 6.4, 0), 3.8, 0.4)
        clonar('roca', (-1.4, 1.8, 0), 0.6, 0.2)
    elif tipo in ('arco', 'meta'):
        plano('rio', (0.02, 0.7, 0.78), (0, 4.2, 0.03), (8, 14, 1), 0.04)
        clonar('portal', (0.1, 5.6, 0), 4.4, 0.05)
        clonar('pilar', (-2.2, 4.2, 0), 2.8, 0.2)
        clonar('pilar', (2.3, 4.4, 0), 2.6, -0.2)
        clonar('torre', (-4.2, 7.2, 0), 5.2, 0.4)
        clonar('palma', (-2.0, 1.5, 0), 3.6, 0.4)
        clonar('helecho', (1.7, 1.2, 0), 1.6, 0.5)
        clonar('palma', (-3.4, 2.8, 0), 4.6, 0.3)
        clonar('ceiba', (3.6, 3.4, 0), 5.4, -0.2)
        clonar('helecho', (1.6, 2.2, 0), 1.6, 0.8)
        clonar('piedra', (-1.2, 2.0, 0), 0.8, 0.5)
        if tipo == 'meta':
            bpy.ops.mesh.primitive_plane_add(size=1, location=(2.6, 5.4, 3.4))
            band = bpy.context.active_object
            band.name = 'bandera'
            band.scale = (1.8, 1, 1.05)
            band.rotation_euler = (math.radians(90), 0, 0)
            m = bpy.data.materials.new('ajedrez')
            m.use_nodes = True
            nt = m.node_tree
            ch = nt.nodes.new('ShaderNodeTexChecker')
            ch.inputs['Scale'].default_value = 6
            ch.inputs['Color1'].default_value = (0.08, 0.06, 0.05, 1)
            ch.inputs['Color2'].default_value = (0.96, 0.96, 0.93, 1)
            bsdf = nt.nodes.get('Principled BSDF')
            nt.links.new(ch.outputs['Color'], bsdf.inputs['Base Color'])
            band.data.materials.append(m)


def encuadre(cam, modo, centro):
    c = Vector(centro)
    if modo == 'rasca':
        cam.location = c + Vector((1.45, -2.55, 0.25))
        blanco = c + Vector((-0.15, 0.15, 0.22))
        cam.data.lens = 36
    elif modo == 'mira':
        cam.location = c + Vector((1.85, -2.55, 0.42))
        blanco = c + Vector((0.05, 0.2, 0.02))
        cam.data.lens = 34
    elif modo == 'rasante':
        cam.location = c + Vector((1.7, -3.3, -0.35))
        blanco = c + Vector((-0.15, 0.15, 0.2))
        cam.data.lens = 30
    elif modo == 'celebra':
        cam.location = c + Vector((1.35, -2.35, 0.15))
        blanco = c + Vector((0.0, 0.1, 0.12))
        cam.data.lens = 34
    else:
        cam.location = c + Vector((1.55, -3.15, -0.2))
        blanco = c + Vector((-0.05, 0.15, 0.18))
        cam.data.lens = 30
    cam.rotation_euler = (blanco - cam.location).to_track_quat('-Z', 'Y').to_euler()


def hueso(rig, nombre):
    return rig.pose.bones.get(nombre)


def poner(bone, x=0.0, y=0.0, z=0.0):
    if not bone:
        return
    bone.rotation_mode = 'XYZ'
    bone.rotation_euler = (x, y, z)


def pose_de(rig, modo):
    """Poses de sesión. El glb no se guarda. Ejes medidos en esta Blender: +Z en armL1 sube el ala."""
    if rig.animation_data:
        rig.animation_data.action = None
    rig.data.pose_position = 'POSE'
    for b in rig.pose.bones:
        b.rotation_mode = 'XYZ'
        b.rotation_euler = (0.0, 0.0, 0.0)
        b.location = (0.0, 0.0, 0.0)
    L, R = hueso(rig, 'armL1'), hueso(rig, 'armL1.001')
    EL, ER = hueso(rig, 'armL2'), hueso(rig, 'armL2.001')
    cab, pico = hueso(rig, 'cabeza'), hueso(rig, 'pico')
    esp = hueso(rig, 'espalda1')
    hL, hR = hueso(rig, 'pieL1'), hueso(rig, 'pieL1.001')
    kL, kR = hueso(rig, 'pieL2'), hueso(rig, 'pieL2.001')

    def alas(z, x=0.0):
        poner(L, x, 0, z)
        poner(R, x, 0, -z)

    def patas(hx, kx):
        poner(hL, hx, 0, 0)
        poner(hR, hx, 0, 0)
        poner(kL, kx, 0, 0)
        poner(kR, kx, 0, 0)

    if modo == 'vuelo':
        alas(0.18, -0.22)
        patas(0.95, -1.15)
        poner(pico, 0.26)
        poner(cab, -0.45, 0.05, 0.1)
        poner(esp, 0.12)
        rig.rotation_euler = (math.radians(58), math.radians(-8), math.radians(188))
    elif modo == 'rasante':
        alas(0.32, -0.55)
        patas(1.05, -1.2)
        poner(pico, 0.32)
        poner(cab, -0.5, -0.08, 0.04)
        poner(esp, 0.2)
        rig.rotation_euler = (math.radians(68), math.radians(6), math.radians(170))
    elif modo == 'mira':
        alas(0.22, 0.05)
        poner(pico, 0.06)
        poner(cab, 0.04, 0.9, 0.24)
        poner(esp, 0.08, 0.4, 0)
        rig.rotation_euler = (0, 0, math.radians(205))
    elif modo == 'rasca':
        poner(L, -1.6, 1.4, 1.6)
        poner(EL, 2.0, 0, 0)
        poner(R, 0.2, 0, -0.45)
        poner(ER, 0.35)
        poner(pico, 0.38)
        poner(cab, -0.12, -0.05, -0.18)
        poner(esp, -0.04, 0, -0.08)
        rig.rotation_euler = (0, 0, math.radians(188))
    elif modo == 'celebra':
        poner(L, -0.4, 0.05, 1.12)
        poner(R, -0.2, 0, -0.78)
        poner(EL, 0.15)
        poner(ER, 0.25)
        poner(pico, 0.28)
        poner(cab, -0.14, 0.02, 0.32)
        poner(esp, -0.08, 0, 0.14)
        rig.rotation_euler = (0, 0, math.radians(168))
    else:
        rig.rotation_euler = (0, 0, math.radians(180))
    bpy.context.view_layer.update()


def preparar_pajaro(objs):
    rig = next((o for o in objs if o.type == 'ARMATURE'), None)
    mallas = [o for o in objs if o.type == 'MESH']
    for m in list(bpy.data.materials):
        if m.name.startswith('av_'):
            continue
        if any(slot.material == m for mesh in mallas for slot in mesh.material_slots):
            toon(m)
    bpy.context.view_layer.update()
    return rig, mallas


def apoyar(objs, base_loc, z_suelo):
    for o, loc in base_loc.items():
        o.location = loc.copy()
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
    for o, loc in base_loc.items():
        o.location.x = loc.x
        o.location.y = loc.y
        o.location.z = loc.z + shift


def main():
    salida, filtro = args_salida()
    os.makedirs(salida, exist_ok=True)
    limpiar_escena()
    if not os.path.isfile(VITTATA):
        raise SystemExit('no está el modelo oficial: ' + VITTATA)
    pajaro = importar_glb(VITTATA)
    for o in list(pajaro):
        if o.type == 'MESH' and o.name != 'Vittata':
            bpy.data.objects.remove(o, do_unlink=True)
            pajaro.remove(o)
    rig, mallas = preparar_pajaro(pajaro)
    for o in pajaro:
        ORIGINALES.add(o)
    base_loc = {o: o.location.copy() for o in pajaro if o.parent is None}
    biblioteca()

    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.eevee.taa_render_samples = 16
    sc.eevee.use_gtao = True
    sc.render.resolution_x = 960
    sc.render.resolution_y = 600
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'JPEG'
    sc.render.image_settings.quality = 88
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = 0.15
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
    estilo.color = (0.06, 0.04, 0.03)
    estilo.thickness = 3.2
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
    cam_data.lens = 36
    cam = bpy.data.objects.new('cam', cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam

    for nombre, modo, fondo_id, calido in TOMAS:
        if filtro and not nombre.startswith(filtro):
            continue
        conservar = set(pajaro) | {cam} | ORIGINALES
        for o in list(bpy.data.objects):
            if o not in conservar:
                bpy.data.objects.remove(o, do_unlink=True)
        cielo(calido)
        sol(calido)
        fondo(fondo_id)
        if rig:
            pose_de(rig, modo)
        apoyar(pajaro, base_loc, 0.08 if modo in ('rasca', 'mira', 'celebra') or fondo_id == 'hero' else 1.35)
        if modo in ('vuelo', 'rasante'):
            for o in base_loc:
                o.location.x -= 0.15
        elif modo == 'rasca':
            for o in base_loc:
                o.location.x -= 0.45
        bpy.context.view_layer.update()
        zs, xs, ys = [], [], []
        for o in mallas:
            for corner in o.bound_box:
                w = o.matrix_world @ Vector(corner)
                xs.append(w.x); ys.append(w.y); zs.append(w.z)
        if not xs:
            continue
        centro = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, (min(zs) + max(zs)) / 2)
        if nombre == '07_hero':
            centro = (centro[0], centro[1], centro[2] + 0.05)
        encuadre(cam, modo, centro)
        if nombre == '07_hero':
            cam.data.lens = 46
        ruta = os.path.join(salida, nombre + '.jpg')
        sc.render.filepath = ruta
        bpy.ops.render.render(write_still=True)
        print('LAMINA', ruta)

    print('LISTO', salida)


if __name__ == '__main__':
    main()
