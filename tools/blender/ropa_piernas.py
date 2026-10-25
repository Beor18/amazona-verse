# PANTALONES del ropero (Vittata), con piel. Blender 4.2 sin ventana:
#   cd ~ && Blender -b ~/AmazonaVerse/04_Blender_3D/vittata_rig_final.blend --python ~/AmazonaVerse/Juego/tools/blender/ropa_piernas.py [-- pantalon_corto ...]
# Topología de pantalón: dos perneras (anillos alrededor de la pierna) que arriba se abren en una "D": la mitad de
# afuera sube como cadera (anillos medidos con rayos contra el cuerpo) y la mitad de adentro es la costura del tiro
# (plano x=0, por debajo de la panza). La cintura baja por detrás para dejar salir la cola.
# Pesos: weights_from_body + limb_weights_z (pieL1 / pieL1.001 por altura) y prueba de flexión de piernas.
import sys, os, math
sys.path.insert(0, os.path.expanduser('~/AmazonaVerse/Juego/tools/blender'))
from ropa_lib import *

R = math.radians
CY = -0.01          # eje de la cadera (x=0, y=CY)
ZS = 0.262          # altura donde las perneras se juntan con la cadera


def D(a):
    return Vector((math.sin(a), -math.cos(a), 0))


def M():
    return dict(TELA=mat('TELA', hexrgb('#3d6fa8'), 0.85), COSTURA=mat('COSTURA', hexrgb('#e3b65a'), 0.7),
                BOTON=mat('BOTON', hexrgb('#c9b27a'), 0.35, 0.8))


def ray_in(o, d, L=0.6, bvh=None):
    """Distancia desde o hasta la superficie MÁS EXTERNA en la dirección d (rayo desde afuera hacia o)."""
    bvh = bvh or body_bvh(); d = Vector(d).normalized(); start = Vector(o) + d * L
    h = bvh.ray_cast(start, -d, L)
    return (L - h[3]) if h[0] is not None else 0.0


def waist_z(a, front=0.405, back=0.326):
    return back + (front - back) * (0.5 + 0.5 * math.cos(a)) ** 1.3


def pants_mesh(name, hem_z, hem_c, hem_r, M_=19, K=8, L=6, H=8, gap=0.016):
    """Malla (sin grosor) de los dos lados. hem_c(s) = centro del dobladillo para el lado s."""
    import bmesh
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    for s in (1, -1):
        # anillo D arriba de la pernera
        Q = Vector((0, CY, ZS)); top = []
        for k in range(M_):
            a = math.pi * k / (M_ - 1)
            r = ray_in(Q, D(a) * Vector((s, 1, 1))) + gap
            top.append(Q + (D(a) * Vector((s, 1, 1))) * r)
        for m in range(1, K):
            ps = math.pi * m / K; d = Vector((0, math.cos(ps), -math.sin(ps)))
            top.append(Q + d * (ray_in(Q, d) + gap))
        N = len(top); c = hem_c(s)
        f0 = math.atan2(s * (top[0].x - c.x), -(top[0].y - c.y))
        hem = [c + Vector((s * math.sin(f0 + 2 * math.pi * i / N), -math.cos(f0 + 2 * math.pi * i / N), 0)) * hem_r + Vector((0, 0, hem_z - c.z)) for i in range(N)]
        rows = []
        for l in range(L + 1):
            t = l / L; e = 1 - (1 - t) ** 1.8
            rows.append([h.lerp(p, e) * 1.0 for h, p in zip(hem, top)])
            # la pernera es casi recta abajo y se abre arriba
        V = [[bm.verts.new(p) for p in row] for row in rows]
        for l in range(L):
            for i in range(N): bm.faces.new((V[l][i], V[l][(i + 1) % N], V[l + 1][(i + 1) % N], V[l + 1][i]))
        # cadera: filas abiertas sobre la mitad de afuera
        hip = [V[L][:M_]]
        for j in range(1, H + 1):
            t = j / H; row = []
            for k in range(M_):
                a = math.pi * k / (M_ - 1); z = ZS + (waist_z(a) - ZS) * t
                q = Vector((0, CY, z)); d = D(a) * Vector((s, 1, 1))
                row.append(bm.verts.new(q + d * (ray_in(q, d) + gap)))
            hip.append(row)
        for j in range(H):
            for k in range(M_ - 1): bm.faces.new((hip[j][k], hip[j][k + 1], hip[j + 1][k + 1], hip[j + 1][k]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    orient_out(o, (0, CY, 0.3))
    return o


def surf(bvh, z, a, off, cy=CY):
    """Punto de la superficie del pantalón (bvh) a la altura z y acimut a, separado `off` hacia afuera."""
    d = D(a)
    for dz in [0.0015 * k for k in range(16)]:  # si el rayo pasa por encima del borde, baja un poco
        q = Vector((0, cy, z - dz)); r = ray_in(q, d, bvh=bvh)
        if r > 0: return q + d * (r + off) + Vector((0, 0, dz)), d
    return Vector((0, cy, z)) + d * 0.2, d


def band(name, bvh, z0f, z1f, off, th, seg=40, a0=0.0, a1=2 * math.pi, closed=True):
    rows = []
    for zf in (z0f, z1f):
        row = []
        for i in range(seg if closed else seg + 1):
            a = a0 + (a1 - a0) * i / seg
            row.append(surf(bvh, zf(a), a, off)[0])
        rows.append(row)
    o = grid_mesh(name, rows, close_u=closed); orient_out(o, (0, CY, 0.3))
    add_mod(o, 'SOLIDIFY', thickness=th, offset=1, use_rim=True)
    add_mod(o, 'BEVEL', width=0.0015, segments=1, limit_method='ANGLE', angle_limit=R(60)); apply_mods(o)
    return o


def pocket(name, bvh, a_c, a_w, z0, z1, off, mt, mt_st, nu=5, nv=5):
    G = [[surf(bvh, z0 + (z1 - z0) * j / (nv - 1) - 0.006 * math.sin(math.pi * i / (nu - 1)) * (j == 0), a_c + a_w * (2 * i / (nu - 1) - 1), off)[0]
          for i in range(nu)] for j in range(nv)]
    o = grid_mesh(name, G); orient_out(o, (0, CY, 0.3))
    add_mod(o, 'SOLIDIFY', thickness=0.003, offset=1, use_rim=True); apply_mods(o)
    st = [G[j][0] for j in range(nv - 1, -1, -1)] + [G[0][i] for i in range(1, nu)] + [G[j][nu - 1] for j in range(1, nv)]
    n = [((p - Vector((0, CY, p.z))) * Vector((1, 1, 0))).normalized() for p in st]
    return [set_mat(o, mt), set_mat(tube_path('pespunte', [p + q * 0.0045 for p, q in zip(st, n)], 0.0013, seg=4), mt_st)]


def build(name, long=False):
    mt = M()
    if long:
        hem_z, hem_r = 0.152, 0.037
        hem_c = lambda s: Vector((s * 0.178, 0.012, hem_z))
    else:
        hem_z, hem_r = 0.196, 0.066
        hem_c = lambda s: Vector((s * 0.172, -0.004, hem_z))
    o = pants_mesh(name, hem_z, hem_c, hem_r, L=8 if long else 5)
    push_outside(o, offset=0.016, smooth=3, passes=3)
    orient_out(o, (0, CY, 0.3))
    bvh = BVHTree.FromObject(o, bpy.context.evaluated_depsgraph_get())
    set_mat(o, mt['TELA'])
    add_mod(o, 'SOLIDIFY', thickness=0.006, offset=1, use_rim=True, use_even_offset=True); apply_mods(o)
    parts = [o]
    # cintura (pretina), presillas, botón, bragueta
    parts.append(set_mat(band('pretina', bvh, lambda a: waist_z(a) - 0.026, lambda a: waist_z(a) - 0.0012, 0.005, 0.006), mt['TELA']))
    for a in (R(32), R(78), R(140), R(-32), R(-78), R(-140)):
        p0, d = surf(bvh, waist_z(a) - 0.028, a, 0.013); p1, _ = surf(bvh, waist_z(a) - 0.002, a, 0.013); p1.z += 0.005
        parts.append(set_mat(tube_path('presilla', [p0, (p0 + p1) / 2 + d * 0.002, p1], 0.0035, seg=5), mt['TELA']))
    pb, d = surf(bvh, waist_z(0) - 0.012, 0, 0.011)
    parts.append(set_mat(revolve('boton', pb - d * 0.003, pb + d * 0.004, [(0, 0.008), (0.6, 0.008), (1, 0.006)], seg=12), mt['BOTON']))
    fly = [surf(bvh, z, a, 0.0075)[0] for z, a in ((waist_z(0) - 0.03, R(9)), (0.33, R(9)), (0.305, R(7)), (0.292, R(2)))]
    parts.append(set_mat(tube_path('bragueta', catmull(fly, 3), 0.0014, seg=4), mt['COSTURA']))
    # bolsillos: abertura delantera curva (ribete + pespunte) y parches traseros
    for sg in (1, -1):
        lip = [surf(bvh, waist_z(sg * a) - dz, sg * a, 0.0075)[0] for a, dz in ((R(30), 0.026), (R(40), 0.04), (R(52), 0.055), (R(66), 0.064))]
        parts.append(set_mat(tube_path('bolsillo', catmull(lip, 3), 0.0028, seg=6), mt['TELA']))
        parts += pocket('bolsillo_tras', bvh, sg * R(148), R(15), 0.268, 0.305, 0.0055, mt['TELA'], mt['COSTURA'])
    # costura lateral
    side = [surf(bvh, z, R(90) * sg, 0.0068)[0] for sg in (1,) for z in [0.352 - 0.019 * k for k in range(6)]]
    for sg in (1, -1):
        pts = [Vector((sg * abs(p.x), p.y, p.z)) for p in side]
        parts.append(set_mat(tube_path('costura', pts, 0.0013, seg=4), mt['COSTURA']))
    # dobladillo
    for s in (1, -1):
        c = hem_c(s); n = 24
        def ring(z, r):  # sigue la pernera real (rayo contra el pantalón) con holgura mínima r
            out = []
            for i in range(n):
                d = Vector((math.sin(2 * math.pi * i / n), -math.cos(2 * math.pi * i / n), 0)); q = Vector((c.x, c.y, z))
                rr = max(r, ray_in(q, d, L=0.25, bvh=bvh) + (r - hem_r) * 0.8, ray_in(q, d, L=0.25) + 0.012 + (r - hem_r))
                out.append(q + d * rr)
            return out
        h = 0.02 if not long else 0.014
        cf = grid_mesh('dobladillo', [ring(hem_z - 0.003, hem_r + 0.004), ring(hem_z + h, hem_r + 0.006)], close_u=True)
        orient_out(cf, (c.x, c.y, hem_z + 0.01))
        add_mod(cf, 'SOLIDIFY', thickness=0.005, offset=1, use_rim=True)
        add_mod(cf, 'BEVEL', width=0.0018, segments=1, limit_method='ANGLE', angle_limit=R(60))
        parts.append(set_mat(cf, mt['TELA']))
        parts.append(set_mat(tube_path('pespunte', ring(hem_z + h + 0.004, hem_r + 0.0105)[:] + [ring(hem_z + h + 0.004, hem_r + 0.0105)[0]], 0.0012, seg=4), mt['COSTURA']))
    for p in parts: apply_mods(p)
    o = join(parts, name)
    cyl_uv(o)
    shade_smooth(o, 50)
    return o


def finish(name, long):
    o = build(name, long)
    check_clear([o], eyes=False)
    weights_from_body(o)
    limb_weights_z(o, 'pieL1', 'pieL1.001', 0.25, 0.20, keep=())  # las perneras siguen al muslo
    add_armature(o)
    print('TRIS', name, tri_count(o), 'MATS', [m.name for m in o.data.materials], 'GROUPS', [g.name for g in o.vertex_groups])
    # prueba de flexión: paso adelante / atrás y rodilla doblada (ejes del rig: muslo -X adelanta, rodilla -X levanta)
    walk = {'pieL1': ('X', -0.55), 'pieL2': ('X', -0.6), 'pieL1.001': ('X', 0.55)}
    for pose in (walk, {'pieL1': ('X', 0.55), 'pieL1.001': ('X', -0.55), 'pieL2.001': ('X', -0.6)}):
        check_posed([o], pose, min_out=-0.004)
    pose_bones(walk)
    preview_tiles([o], name, 'flexion', target=(0, -0.02, 0.22), dist=0.9, views=(('l', 75), ('f', -20), ('b', 200)), size=210, elev=0.1)
    rest_pose()
    preview_tiles([o], name, 'piernas', target=(0, -0.02, 0.27), dist=1.15, views=(('f', -15), ('l', 80), ('b', 200)), size=210, elev=0.2)
    export([o], name)
    print('KB', name, round(glb_kb(name), 1))
    bpy.data.objects.remove(o, do_unlink=True)


PIEZAS = {'pantalon_corto': lambda: finish('pantalon_corto', False),
          'pantalon_largo': lambda: finish('pantalon_largo', True)}

if __name__ == '__main__':
    rest_pose()
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for n in (argv or list(PIEZAS)):
        print('=== PIEZA', n); PIEZAS[n]()
    for f in os.listdir(PREV):
        if f.startswith('_tmp_'): os.remove(os.path.join(PREV, f))
