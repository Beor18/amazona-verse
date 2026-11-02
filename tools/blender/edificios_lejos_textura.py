# Pipeline de edificios de Kelvin: lejanos Ancient con la textura del atlas (BM105). Ver docs/EDIFICIOS.md.
"""Añade al <modelo>_lejos.glb Ancient UV propias y la celda del atlas (TEXCOORD_1, igual que el _hd), para que se dibuje
con el material AV_HD_Ancient (hd_ancient.jpg: el mismo atlas, el mismo tono vibrant_toon que el modelo cercano) y no
como un bloque crema de color de vértice.

La geometría del lejano no se toca (misma silueta, mismos triángulos). Se desuelda por triángulo: cada uno lleva UNA celda
(la del material de la cara original más cercana a su centro, BVH sobre la geometría del _hd) y una UV plana según su eje
dominante, en unidades del modelo (ESCALA por repetición; el shader hace fract() dentro de la celda). Sin COLOR_0: el
tono lo pone el shader Ancient y la sombra de huecos sale de la normal.

Blender -b --python edificios_lejos_textura.py -- --ids templo_grande_a,ruina_torre_b [--escala 5]
"""
import bpy, sys, os, json, struct
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import edificios_hd as H
import edificios_complejo as C
from edificios_hd_atlas import KITS, N as NATLAS

ESCALA = float(H.A.get('escala', 5))   # unidades del modelo por repetición de la textura


def leer(p):
    j, acc = H.leer_glb(p)
    at = j['meshes'][0]['primitives'][0]['attributes']
    idx = acc(j['meshes'][0]['primitives'][0]['indices']).astype(np.int64).reshape(-1, 3)
    return acc(at['POSITION']).astype(np.float64), acc(at['NORMAL']).astype(np.float64), idx


def texturizar(n, ob):
    from mathutils.bvhtree import BVHTree
    ruta = os.path.join(H.OUT, n + '_lejos.glb')
    P, Nv, I = leer(ruta)
    bvh = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())
    orden = KITS['ancient']['orden']
    celda_mat = np.array([orden.index(m.name) if m.name in orden else 0 for m in ob.data.materials], np.int32)
    mi = np.empty(len(ob.data.polygons), np.int32)
    ob.data.polygons.foreach_get('material_index', mi)
    tri = P[I]                                   # (t, 3, 3)
    cen = tri.mean(1)
    nf = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    nf /= np.maximum(1e-12, np.linalg.norm(nf, axis=1))[:, None]
    celda = np.zeros(len(I), np.int32)
    for t in range(len(I)):
        _, _, cara, _ = bvh.find_nearest(cen[t].tolist())
        celda[t] = celda_mat[mi[cara]] if cara is not None else 0
    eje = np.abs(nf).argmax(1)
    # un vértice por (vértice, celda, eje): comparte los de triángulos vecinos con la misma celda y proyección
    clave = np.stack([I.ravel(), np.repeat(celda, 3), np.repeat(eje, 3)], 1)
    _, primero, inv = np.unique(clave, axis=0, return_index=True, return_inverse=True)
    vi, ce, ej = clave[primero].T
    pos = P[vi]
    uv = np.zeros((len(pos), 2))
    for k, cols in enumerate([(1, 2), (0, 2), (0, 1)]):   # eje X → (y, z), Y → (x, z), Z → (x, y)
        s = ej == k
        uv[s] = pos[s][:, list(cols)] / ESCALA
    nrm = Nv[vi]
    uv2 = np.stack([(ce % NATLAS) / NATLAS, (ce // NATLAS) / NATLAS], 1)
    mat = {'name': 'AV_HD_Ancient', 'doubleSided': True,
           'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0.0, 'roughnessFactor': 1.0},
           'normalTexture': {'index': 1}}
    idx = inv.reshape(-1, 3)
    kb = glb(os.path.join(H.OUT, n + '_lejos.glb'), n + '_lejos',
             {'POSITION': pos, 'NORMAL': nrm, 'TEXCOORD_0': uv, 'TEXCOORD_1': uv2}, idx, mat)
    return dict(id=n, tris=int(len(I)), kb=round(kb[0] / 1024, 1), celdas=np.bincount(celda, minlength=16).tolist())


def glb(path, clave, attrs, idx, mat):
    """Mismo GLB sin comprimir de C.glb, pero con el sampler del _hd (clamp: el shader envuelve con fract) y las dos texturas del atlas."""
    r = C.glb(path, clave, [(attrs, idx, 0)], [mat], ['tex_hd/hd_ancient.jpg', 'tex_hd/hd_ancient_n.jpg'])
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    j['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}]
    for im in j['images']:
        im['mimeType'] = 'image/jpeg'
        im.pop('name', None)
    jb = json.dumps(j, separators=(',', ':')).encode()
    jb += b' ' * ((-len(jb)) % 4)
    o = 20 + n
    bl = struct.unpack('<I', b[o:o + 4])[0]
    binc = b[o + 8:o + 8 + bl]
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(binc)))
        f.write(struct.pack('<II', len(jb), 0x4E4F534A) + jb)
        f.write(struct.pack('<II', len(binc), 0x004E4942) + binc)
    import base64
    out = open(path, 'rb').read()
    open(path[:-4] + '_glb.js', 'w').write('(window.AV_EDIFICIOS_B64=window.AV_EDIFICIOS_B64||{})["%s"]="%s";\n' % (clave, base64.b64encode(out).decode('ascii')))
    return len(out), os.path.getsize(path[:-4] + '_glb.js')


def main():
    conv = json.load(open(os.path.join(HERE, '../../assets/models/edificios/conversion.json')))
    for n in H.IDS:
        try:
            H.limpiar()
            asset, M = H.origen(n, conv)
            if H.kit_de(asset) != 'ancient':
                H.log('SALTA (no Ancient)', n)
                continue
            ps = H.piezas(os.path.join(H.MIG, asset + '.glb'), M)
            obs, _, _ = H.reducir(n, ps, H.PRESUPUESTO.get(n, H.DEFECTO))
            ob = C.unir(list(obs.values()))
            H.log('LEJOS-TEX', json.dumps(texturizar(n, ob)))
        except Exception as e:
            import traceback
            traceback.print_exc()
            H.log('ERROR', n, repr(e))


if __name__ == '__main__':
    main()
