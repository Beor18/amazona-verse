# Pieles de especie · lámina de control: las 22 pieles (y la Vittata de referencia) sobre la Vittata del juego.
# Comando (solo lectura: el .blend del rig no se guarda):
#   taskpolicy -b nice -n 15 Blender -b 04_Blender_3D/vittata_rig_final.blend --python tools/blender/pieles_lamina.py -- [salida.png] [pieles,…]
# Por especie, 4 vistas con la malla y el rig del juego (Workbench, textura tal cual, sin tinte):
#   frente 3/4 (pose Idle) · espalda 3/4 (Idle) · cara 3/4 (ojos, anillo y pico) · alas abiertas desde atrás (T, costuras).
# Debajo de cada fila: nombre, distancia media entre superficies, rayos perdidos y salto de las costuras (de
# ../_trabajo_claude/pieles/<piel>.json, que escribe pieles_cocer.py). Salida por defecto: docs/img/pieles_22_lamina.png.
import os, sys, json, math
import bpy
import numpy as np
from mathutils import Vector, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(REPO, 'docs', 'img', 'pieles_22_lamina.png')
DIR = os.path.join(REPO, 'assets', 'textures', 'pieles')
DATOS = os.environ.get('AV_PIEL_DATOS') or os.path.normpath(os.path.join(REPO, '..', '_trabajo_claude', 'pieles'))
TMP = os.path.join(DATOS, '_lamina'); os.makedirs(TMP, exist_ok=True)
REF = os.path.normpath(os.path.join(REPO, '..', '04_Blender_3D', 'cotorro_original', 'cotorro', 'cuerpo_Base_color_mejorada.png'))
PIELES = ARGS[1].split(',') if len(ARGS) > 1 else sorted(os.path.splitext(f)[0] for f in os.listdir(DIR) if f.endswith('.jpg'))
V = 220  # px por vista

sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sh = sc.display.shading
sh.light = 'STUDIO'; sh.color_type = 'TEXTURE'; sh.show_cavity = False; sh.show_specular_highlight = False
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = V
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'
sc.render.use_freestyle = False

vit = bpy.data.objects['Vittata']; rig = bpy.data.objects['Rig']
for o in list(sc.objects):
    if o not in (vit, rig) and o.type in ('MESH', 'CURVE', 'FONT', 'EMPTY', 'LIGHT', 'CAMERA'):
        o.hide_render = True
nodos = [n for m in vit.data.materials for n in m.node_tree.nodes if n.type == 'TEX_IMAGE']
cam_d = bpy.data.cameras.new('cam_lamina'); cam_d.type = 'ORTHO'
cam = bpy.data.objects.new('cam_lamina', cam_d); sc.collection.objects.link(cam); sc.camera = cam
idle = bpy.data.actions.get('Idle')


def pose(nombre):
    if not rig.animation_data:
        rig.animation_data_create()
    if nombre == 'T':
        rig.animation_data.action = None
        for pb in rig.pose.bones:
            pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
        sc.frame_set(0)
    else:
        rig.animation_data.action = idle
        sc.frame_set(int(idle.frame_range[0]) + 10 if idle else 0)


def mirar(pos, objetivo, escala):
    cam.location = Vector(pos)
    d = Vector(objetivo) - Vector(pos)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam_d.ortho_scale = escala


# Blender: Z arriba, la cotorra mira a -Y. Ojos a z≈1,20; pico z≈0,85–1,19.
VISTAS = [
    ('Idle', (-2.2, -3.0, 1.2), (0, 0, 0.72), 1.75),       # frente 3/4
    ('Idle', (2.4, 3.0, 1.3), (0, 0, 0.72), 1.75),         # espalda 3/4
    ('T', (-1.0, -1.9, 1.3), (0, -0.12, 1.08), 0.8),      # cara 3/4 (ojos, anillo y pico)
    ('T', (0.7, 3.0, 2.2), (0, 0, 0.72), 1.95),           # alas abiertas desde atrás (costuras de alas y espalda)
]


def render(nombre):
    f = os.path.join(TMP, nombre + '.png')
    sc.render.filepath = f
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(f); a = np.array(im.pixels[:], np.float32).reshape(V, V, 4); bpy.data.images.remove(im)
    return a


def fila(piel, img):
    for n in nodos:
        n.image = img
    out = []
    for i, (p, pos, obj, esc) in enumerate(VISTAS):
        pose(p); mirar(pos, obj, esc)
        out.append(render('%s_%d' % (piel, i)))
    return np.concatenate(out, axis=1)


# ---------- rótulos: un objeto de texto renderizado aparte (Workbench, color del material) ----------
txt_d = bpy.data.curves.new('rotulo', 'FONT'); txt_d.size = 0.5; txt_d.align_x = 'LEFT'; txt_d.align_y = 'CENTER'
txt = bpy.data.objects.new('rotulo', txt_d); sc.collection.objects.link(txt)
tm = bpy.data.materials.new('rotulo'); tm.diffuse_color = (0.08, 0.1, 0.09, 1); txt_d.materials.append(tm)
txt.hide_render = True


def texto(t, ancho=4 * V, alto=22):
    """Renderiza t en una franja ancho×alto (ortográfica frente al texto, lejos de la cotorra)."""
    vit.hide_render = True; txt.hide_render = False
    txt.location = (100, 0, 0); txt.rotation_euler = (math.radians(90), 0, 0); txt_d.body = t
    rx, ry = sc.render.resolution_x, sc.render.resolution_y
    sc.render.resolution_x, sc.render.resolution_y = ancho, alto
    sh.color_type = 'MATERIAL'; sh.light = 'FLAT'
    esc = ancho / alto * 0.62  # 0,62 u de alto para letras de 0,5
    cam.location = (100 + esc / 2 - 0.15, -5, 0); cam.rotation_euler = (math.radians(90), 0, 0); cam_d.ortho_scale = esc
    f = os.path.join(TMP, '_rotulo.png'); sc.render.filepath = f
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(f); a = np.array(im.pixels[:], np.float32).reshape(alto, ancho, 4); bpy.data.images.remove(im)
    sc.render.resolution_x, sc.render.resolution_y = rx, ry
    sh.color_type = 'TEXTURE'; sh.light = 'STUDIO'
    vit.hide_render = False; txt.hide_render = True
    return a


def pegar(lienzo, im, x, y):  # y desde abajo
    h, w = im.shape[:2]; h = min(h, lienzo.shape[0] - y); w = min(w, lienzo.shape[1] - x)
    al = im[:h, :w, 3:4]
    lienzo[y:y + h, x:x + w, :3] = lienzo[y:y + h, x:x + w, :3] * (1 - al) + im[:h, :w, :3] * al


def leer(p):
    try:
        return json.load(open(os.path.join(DATOS, p + '.json')))
    except Exception:
        return None


md5 = {}
for p in PIELES:
    j = leer(p)
    if j and j.get('color', {}).get('md5'):
        md5.setdefault(j['color']['md5'], []).append(p)
for h, ps in md5.items():
    print('LAMINA', 'AVISO color repetido' if len(ps) > 1 else 'color único', ps, h, flush=True)
filas = []
ref = bpy.data.images.load(REF)
filas.append(('vittata (referencia, sin piel)', fila('vittata', ref)))
for p in PIELES:
    img = bpy.data.images.load(os.path.join(DIR, p + '.jpg'))
    img.colorspace_settings.name = 'sRGB'
    j = leer(p)
    rot = p.replace('_', ' ')
    if j:
        rot += '  ·  dist %.2f%%  ·  perdidos %.2f%%  ·  costura %.1f (vit %.1f)' % (
            j['distancia']['media_pct'], j['rayos_perdidos']['pct_isla'], j['costuras']['salto_piel']['media'],
            j['costuras'].get('salto_vittata_original', {}).get('media', float('nan')))
    filas.append((rot, fila(p, img)))
    bpy.data.images.remove(img)
    print('LAMINA', p, flush=True)

# 2 columnas de especies; cada celda = 4 vistas + rótulo
COLS = 2
CW, CH = 4 * V, V + 22
nrows = math.ceil(len(filas) / COLS)
M = 16
Wt, Ht = COLS * CW + (COLS + 1) * M, nrows * CH + (nrows + 1) * M + 40
L = np.ones((Ht, Wt, 4), np.float32); L[..., :3] = (0.93, 0.94, 0.92)
for i, (rot, im) in enumerate(filas):
    c, r = i % COLS, i // COLS
    x = M + c * (CW + M); y = Ht - 40 - (r + 1) * (CH + M)
    L[y:y + CH, x:x + CW, :3] = (0.985, 0.985, 0.975)
    pegar(L, im, x, y + 22)
    pegar(L, texto(rot), x + 6, y)
pegar(L, texto('Amazona Verse · %d pieles cocidas sobre la Vittata del juego · frente, espalda, cara y alas abiertas' % (len(filas) - 1), Wt - 2 * M, 30), M, Ht - 36)
out = bpy.data.images.new('lamina', Wt, Ht, alpha=False)
out.pixels.foreach_set(L.ravel())
out.filepath_raw = OUT; out.file_format = 'PNG'
os.makedirs(os.path.dirname(OUT), exist_ok=True)
out.save()
print('LAMINA_OK', OUT, Wt, Ht, os.path.getsize(OUT), flush=True)
