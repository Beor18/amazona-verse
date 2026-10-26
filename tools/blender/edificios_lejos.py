# Pipeline de edificios de Kelvin: lejanos desde la geometría original. Ver docs/EDIFICIOS.md § Ciudad completa.
"""<modelo>_lejos desde la misma geometría que el _hd (edificios_hd.reducir), no desde el ligero por vóxeles: la silueta
de las torres y los templos se reconoce desde el otro lado de la isla. Con grosor, remallado por vóxeles (diagonal/110),
colapso al presupuesto y color de vértice = color medio de la textura original de la cara más cercana (celda del atlas
tex_hd/hd_<kit>.jpg, en lineal). Un material AV_Lejos, mismo pivote (conversion.json), sin comprimir (lo comprime la build).

Blender -b --python edificios_lejos.py -- --ids templo_grande_a,ruina_torre [--out DIR] [--kit]
  --kit: actualiza trisLejos y kbLejos en kit.js.
"""
import bpy, sys, os, json, math
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import edificios_hd as H
import edificios_complejo as C
from edificios_hd_atlas import KITS, N as NATLAS

TEXHD = os.path.normpath(os.path.join(HERE, '../../assets/models/edificios/tex_hd'))
_medias = {}
VOXEL = float(H.A.get('voxel', 110))   # diagonal / VOXEL: el grosor (1,6 vóxeles) cierra los muros y no quedan cáscaras huecas


def medias(kit):
    """Color medio (lineal) de cada celda del atlas del kit."""
    if kit not in _medias:
        import OpenImageIO as oiio
        a = oiio.ImageBuf(os.path.join(TEXHD, 'hd_%s.jpg' % kit)).get_pixels(oiio.FLOAT)[:, :, :3]
        c = a.shape[0] // NATLAS
        m = {}
        for k, nom in enumerate(KITS[kit]['orden']):
            r, q = divmod(k, NATLAS)
            v = a[r * c:(r + 1) * c, q * c:(q + 1) * c].reshape(-1, 3).mean(0)
            m[nom] = np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
        _medias[kit] = m
    return _medias[kit]


def objetivo(tris_hd):
    return int(min(2000, max(300, tris_hd * 0.08)))


def lejos(nombre, ob, kit, meta):
    from mathutils.bvhtree import BVHTree
    lo = ob.copy()
    lo.data = ob.data.copy()
    lo.modifiers.clear()
    bpy.context.scene.collection.objects.link(lo)
    co = np.array([v.co[:] for v in ob.data.vertices])
    diag = float(np.linalg.norm(co.max(0) - co.min(0)))
    bpy.context.view_layer.objects.active = lo
    vox = diag / VOXEL
    for tipo, aj in (('SOLIDIFY', dict(thickness=vox * 1.6, offset=0.0)), ('REMESH', dict(mode='VOXEL', voxel_size=vox))):
        md = lo.modifiers.new(tipo.lower(), tipo)
        for k, v in aj.items():
            setattr(md, k, v)
        bpy.ops.object.modifier_apply(modifier=md.name)
    for _ in range(4):
        if H.colapsar(lo, meta) <= meta:
            break
    H.quitar_islas(lo, int(meta * 0.97), protege=0.002)
    lo.data.shade_smooth()
    lo.data.materials.clear()
    bvh = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())
    med = medias(kit)
    cols = np.array([med.get(m.name, med[KITS[kit]['orden'][0]]) for m in ob.data.materials])
    mi = np.empty(len(ob.data.polygons), np.int32)
    ob.data.polygons.foreach_get('material_index', mi)
    E = C.esquinas(lo)
    v = E['vi'][E['lt']]
    nv = len(E['co'])
    usados = np.unique(v)
    col = np.zeros((nv, 3))
    for k in usados:
        _, _, cara, _ = bvh.find_nearest(E['co'][k])
        col[k] = cols[mi[cara]] if cara is not None else cols[0]
    mapa = -np.ones(nv, np.int64)
    mapa[usados] = np.arange(len(usados))
    nrm = np.zeros((nv, 3))
    np.add.at(nrm, v, E['cn'][E['lt']])
    nrm = nrm[usados] / np.maximum(1e-8, np.linalg.norm(nrm[usados], axis=1))[:, None]
    I = mapa[v].reshape(-1, 3)
    mats = [{'name': 'AV_Lejos', 'doubleSided': True, 'pbrMetallicRoughness': {'baseColorFactor': [0.8, 0.8, 0.8, 1], 'metallicFactor': 0.0, 'roughnessFactor': 0.95}}]
    kb = C.glb(os.path.join(H.OUT, nombre + '_lejos.glb'), nombre + '_lejos', [({'POSITION': E['co'][usados], 'NORMAL': nrm, 'COLOR_0': col[usados]}, I, 0)], mats, [])
    bpy.data.objects.remove(lo, do_unlink=True)
    return dict(id=nombre, trisLejos=int(len(I)), kbLejos=round(kb[1] / 1024, 1))


def main():
    conv = json.load(open(os.path.join(HERE, '../../assets/models/edificios/conversion.json')))
    recs = []
    for n in H.IDS:
        try:
            H.limpiar()
            asset, M = H.origen(n, conv)
            ps = H.piezas(os.path.join(H.MIG, asset + '.glb'), M)
            obs, _, _ = H.reducir(n, ps, H.PRESUPUESTO.get(n, H.DEFECTO))
            ob = C.unir(list(obs.values()))
            ob.data.calc_loop_triangles()
            r = lejos(n, ob, H.kit_de(asset), objetivo(len(ob.data.loop_triangles)))
            recs.append(r)
            H.log('LEJOS', json.dumps(r))
        except Exception as e:
            import traceback
            traceback.print_exc()
            H.log('ERROR', n, repr(e))
    if H.A.get('kit') and recs:
        p = os.path.join(H.OUT, 'kit.js')
        s = open(p).read()
        i = s.index('window.AV_EDIFICIOS_KIT = ') + len('window.AV_EDIFICIOS_KIT = ')
        j = s.rindex(';')
        kit = json.loads(s[i:j])
        for r in recs:
            kit[r['id']].update(trisLejos=r['trisLejos'], kbLejos=r['kbLejos'], lejos=True)
        open(p, 'w').write(s[:i] + json.dumps(kit, ensure_ascii=False, separators=(',', ':')) + s[j:])


if __name__ == '__main__':
    main()
