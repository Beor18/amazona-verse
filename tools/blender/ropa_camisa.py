# Camisa: cuerpo cerrado con forma de torso (medidas del modelo) + mangas cortas; ajustada por fuera del cuerpo,
# con grosor, bordes y pesos copiados de la piel. Blender: Z arriba, frente -Y (glTF z = -Blender y).
import sys, os; sys.path.insert(0, os.path.expanduser('~/AmazonaVerse/Juego/tools/blender'))
from ropa_lib import *
import math
# (z, medio ancho, centro y, medio fondo) — del perfil medido en glTF: y→z, z→-y
T = [(0.29, 0.15, -0.013, 0.145), (0.34, 0.18, -0.008, 0.19), (0.38, 0.188, 0.0, 0.215), (0.42, 0.195, -0.015, 0.22),
     (0.46, 0.212, -0.03, 0.215), (0.505, 0.212, -0.045, 0.2), (0.54, 0.206, -0.054, 0.19), (0.58, 0.19, -0.062, 0.178),
     (0.62, 0.162, -0.053, 0.166), (0.66, 0.13, -0.04, 0.152), (0.70, 0.105, -0.03, 0.13)]


TAIL_LIFT, TAIL_P = 0.17, 4.0   # el bajo de atrás sube 17 cm en arco sobre la cola (antes la cola atravesaba la tela)


def dense_rows(rows, n):
    """Interpola el perfil (z, medio ancho, centro y, medio fondo) en n filas repartidas en altura."""
    z0, z1 = rows[0][0], rows[-1][0]; out = []
    for k in range(n):
        z = z0 + (z1 - z0) * k / (n - 1)
        i = max(0, min(len(rows) - 2, max(j for j in range(len(rows) - 1) if rows[j][0] <= z + 1e-9)))
        a, b = rows[i], rows[i + 1]; t = (z - a[0]) / (b[0] - a[0])
        t = t * t * (3 - 2 * t) * 0.5 + t * 0.5   # entre lineal y suave
        out.append(tuple(a[c] + (b[c] - a[c]) * t for c in range(4)))
    return out


def lift_back_hem(o, z0=T[0][0], ztop=T[-1][0]):
    """Sube el bajo por detrás en arco (máximo en la espalda, a=180°) y reparte el resto de filas hasta el cuello."""
    for v in o.data.vertices:
        a = math.atan2(v.co.x, -v.co.y)          # 0 al frente, ±π atrás
        f = max(0.0, -math.cos(a)) ** TAIL_P
        if f <= 0: continue
        dz = TAIL_LIFT * f * (ztop - v.co.z) / (ztop - z0)
        v.co.z += dz
    o.data.update()


def sleeve_weights(o, bone_l, bone_r, x0=0.15, x1=0.21, z0=0.585, z1=0.625):
    """Como limb_weights, pero sólo en las mangas (z > z0): antes los costados del torso (|x|≈0,2 a la altura de la
    panza) seguían al brazo y, con las alas bajadas, la tela se metía en el cuerpo y dejaba ver los costados."""
    gl = o.vertex_groups.get(bone_l) or o.vertex_groups.new(name=bone_l)
    gr = o.vertex_groups.get(bone_r) or o.vertex_groups.new(name=bone_r)
    for v in o.data.vertices:
        c = v.co.x; w = min(1.0, max(0.0, (abs(c) - x0) / (x1 - x0))) * min(1.0, max(0.0, (v.co.z - z0) / (z1 - z0)))
        if w <= 0: continue
        for g in v.groups: g.weight *= (1 - w)
        (gl if c > 0 else gr).add([v.index], w, 'ADD')
    clean_weights(o)


def camisa(name='camisa'):
    """Construye la camisa con piel sobre el Rig (sin exportar). La usa también ropa_cabeza.py para ajustar el pañuelo."""
    # Presupuesto (≤ 6 000 tris): antes seg=48 + subdivisión daban 13 824. Ahora 56 segmentos y 20 filas interpoladas,
    # sin subdivisión: ~5 400 tris, igual de suave (el alisado de wrap_outside redondea la forma).
    body = lathe(name, dense_rows(T, 20), seg=56)
    lift_back_hem(body)
    sleeves = [tube_between('mangaL', (0.12, -0.017, 0.668), (0.30, -0.013, 0.655), 0.085, 0.072, seg=24, rings=5),
               tube_between('mangaR', (-0.12, -0.017, 0.668), (-0.30, -0.013, 0.655), 0.085, 0.072, seg=24, rings=5)]
    o = join([body] + sleeves, name)
    wrap_outside(o, offset=0.012, smooth=6, thickness=0.007, subdiv=0)
    cyl_uv(o)
    weights_from_body(o)
    sleeve_weights(o, 'armL1', 'armL1.001')  # mangas: siguen al brazo
    o.data.materials.append(mat('TELA', hexrgb('#f4f4f0')))
    shade_smooth(o)
    add_armature(o)
    return o


if __name__ == '__main__':
    o = camisa()
    print('FINAL', len(o.data.vertices), len(o.data.polygons))
    export([o], 'camisa')
