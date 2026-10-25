# Pipeline de edificios de Kelvin (.max -> migrado fiel + kit web). Ver docs/EDIFICIOS.md. Datos de trabajo en $AV_MAX_WORK.
"""Render GLB files to labelled tiles and compose a contact sheet.

Blender -b --python render_tiles.py -- --glbs a.glb,b.glb --labels "A|B" --out sheet.png [--cols 4] [--tile 480x360]
"""
import bpy, sys, os, math, json
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
args = {}
k = None
for a in argv:
    if a.startswith('--'):
        k = a[2:]
        args[k] = True
    elif k:
        args[k] = a
        k = None
glbs = args['glbs'].split(',')
labels = args.get('labels', '').split('|') if args.get('labels') else [os.path.basename(g) for g in glbs]
OUT = args['out']
COLS = int(args.get('cols', 4))
TW, TH = [int(x) for x in args.get('tile', '480x360').split('x')]
ENGINE = args.get('engine', 'BLENDER_EEVEE_NEXT')
TMP = os.path.splitext(OUT)[0] + '_tiles'
os.makedirs(TMP, exist_ok=True)

sc = bpy.context.scene
sc.render.engine = ENGINE
try:
    sc.eevee.taa_render_samples = 16
except Exception:
    pass
sc.render.resolution_x, sc.render.resolution_y = TW, TH
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.view_settings.view_transform = 'Standard'
world = bpy.data.worlds.new('w')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs[0].default_value = (0.78, 0.86, 0.92, 1)
bg.inputs[1].default_value = 0.9


def clear():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves, bpy.data.lights, bpy.data.cameras):
        for d in list(coll):
            try:
                coll.remove(d)
            except Exception:
                pass


tiles = []
for i, g in enumerate(glbs):
    clear()
    bpy.ops.import_scene.gltf(filepath=g)
    meshes = [o for o in sc.objects if o.type == 'MESH']
    pts = []
    for o in meshes:
        for c in o.bound_box:
            pts.append(o.matrix_world @ Vector(c))
    P = np.array(pts)
    mn, mx = P.min(0), P.max(0)
    ctr = Vector(((mn + mx) / 2).tolist())
    rad = float(np.linalg.norm(mx - mn)) / 2 or 1.0
    # ground
    bpy.ops.mesh.primitive_plane_add(size=rad * 6, location=(ctr.x, ctr.y, mn[2] - 0.01))
    gp = sc.objects[-1] if False else bpy.context.active_object
    gm = bpy.data.materials.new('ground')
    gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.36, 0.45, 0.28, 1)
    gp.data.materials.append(gm)
    # camera 3/4 view
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    cam.data.lens = 50
    d = rad * 3.3
    az, el = math.radians(-40), math.radians(24)
    cam.location = ctr + Vector((d * math.cos(el) * math.sin(az) * -1, -d * math.cos(el) * math.cos(az), d * math.sin(el)))
    direction = ctr - cam.location
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    sc.collection.objects.link(sun)
    # label
    lab = labels[i] if i < len(labels) else os.path.basename(g)
    cu = bpy.data.curves.new('lab', 'FONT')
    cu.body = lab.replace('  ', '\n', 1)
    cu.size = 0.05
    to = bpy.data.objects.new('lab', cu)
    sc.collection.objects.link(to)
    to.parent = cam
    to.location = (-0.34, -0.17, -1.0)
    lm = bpy.data.materials.new('lab')
    lm.use_nodes = True
    nt = lm.node_tree
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs[0].default_value = (0.02, 0.02, 0.02, 1)
    nt.links.new(em.outputs[0], nt.nodes['Material Output'].inputs[0])
    cu.materials.append(lm)
    p = os.path.join(TMP, '%03d.png' % i)
    sc.render.filepath = p
    bpy.ops.render.render(write_still=True)
    tiles.append(p)

# compose
rows = (len(tiles) + COLS - 1) // COLS
sheet = np.ones((rows * TH, COLS * TW, 4), np.float32)
for i, p in enumerate(tiles):
    im = bpy.data.images.load(p)
    px = np.array(im.pixels[:], np.float32).reshape(TH, TW, 4)
    r, c = divmod(i, COLS)
    y0 = (rows - 1 - r) * TH
    sheet[y0:y0 + TH, c * TW:(c + 1) * TW] = px
    bpy.data.images.remove(im)
out = bpy.data.images.new('sheet', COLS * TW, rows * TH, alpha=True)
out.pixels.foreach_set(sheet.ravel())
out.filepath_raw = OUT
out.file_format = 'PNG'
out.save()
print('SHEET', OUT)
