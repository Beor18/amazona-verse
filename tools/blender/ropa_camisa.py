# Camisa: cuerpo cerrado con forma de torso (medidas del modelo) + mangas cortas; ajustada por fuera del cuerpo,
# con grosor, bordes y pesos copiados de la piel. Blender: Z arriba, frente -Y (glTF z = -Blender y).
import sys, os; sys.path.insert(0, os.path.expanduser('~/AmazonaVerse/Juego/tools/blender'))
from ropa_lib import *
# (z, medio ancho, centro y, medio fondo) — del perfil medido en glTF: y→z, z→-y
T = [(0.29, 0.15, -0.013, 0.145), (0.34, 0.18, -0.008, 0.19), (0.38, 0.188, 0.0, 0.215), (0.42, 0.195, -0.015, 0.22),
     (0.46, 0.212, -0.03, 0.215), (0.505, 0.212, -0.045, 0.2), (0.54, 0.206, -0.054, 0.19), (0.58, 0.19, -0.062, 0.178),
     (0.62, 0.162, -0.053, 0.166), (0.66, 0.13, -0.04, 0.152), (0.70, 0.105, -0.03, 0.13)]
body = lathe('camisa', T, seg=48)
sleeves = [tube_between('mangaL', (0.12, -0.017, 0.668), (0.30, -0.013, 0.655), 0.085, 0.072),
           tube_between('mangaR', (-0.12, -0.017, 0.668), (-0.30, -0.013, 0.655), 0.085, 0.072)]
o = join([body] + sleeves, 'camisa')
wrap_outside(o, offset=0.012, smooth=6, thickness=0.007, subdiv=1)
cyl_uv(o)
weights_from_body(o)
limb_weights(o, 'armL1', 'armL1.001', 0.15, 0.21)  # mangas: siguen al brazo
o.data.materials.append(mat('TELA', hexrgb('#f4f4f0')))
shade_smooth(o)
add_armature(o)
print('FINAL', len(o.data.vertices), len(o.data.polygons))
export([o], 'camisa')
