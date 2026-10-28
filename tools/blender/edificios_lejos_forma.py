# BM2: `_lejos` Ancient con forma. Ver docs/equipo/TAREAS_API.md (BM2).
"""Rehace los `_lejos` de las piezas Ancient desde su `_hd` SIN el remallado por vóxeles (que redondeaba cúpulas y cornisas
y dejaba torres finas). Soldar vértices, disolver lo plano (3°), colapso de aristas hasta el doble de los triángulos del
`_lejos` actual, color de vértice del atlas empujado a crema y el tono/oclusión de edificios_lejos_tono (sombra en huecos).
El tope de triángulos se lee de kit.js (trisLejos) antes de sobrescribir; no se pasa de ×2. Con --kit actualiza kit.js.

Blender -b --python edificios_lejos_forma.py -- [--ids a,b] [--out DIR] [--kit]   (sin --ids: todas las Ancient)
"""
import bpy, bmesh, sys, os, json
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import edificios_hd as H
import edificios_complejo as C
import edificios_lejos as L
from edificios_hd_atlas import KITS
from edificios_lejos_tono import tono, ancient

CREMA = np.array([0.80, 0.70, 0.52])   # lineal; el atlas es arena/ocre y la meta de Kelvin es piedra crema y blanca
MEZCLA = 0.45
FACTOR = 2
VOXEL = 300   # el _lejos de antes usaba 110; más fino conserva cúpulas, cornisas y almenas


def lejos_forma(nombre, ob, kit, tope):
    from mathutils.bvhtree import BVHTree
    for vd in (VOXEL, 220, 160, 120, 90):
        lo = ob.copy()
        lo.data = ob.data.copy()
        lo.modifiers.clear()
        bpy.context.scene.collection.objects.link(lo)
        bpy.context.view_layer.objects.active = lo
        bm = bmesh.new()
        bm.from_mesh(lo.data)
        co = np.array([v.co[:] for v in bm.verts])
        diag = float(np.linalg.norm(co.max(0) - co.min(0)))
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=diag * 0.0008)
        bm.to_mesh(lo.data)
        bm.free()
        vox = diag / vd
        for tipo, aj in (('SOLIDIFY', dict(thickness=vox * 1.2, offset=0.0)), ('REMESH', dict(mode='VOXEL', voxel_size=vox)),
                         ('DECIMATE', dict(decimate_type='DISSOLVE', angle_limit=0.07))):
            md = lo.modifiers.new(tipo.lower(), tipo)
            for k, v in aj.items():
                setattr(md, k, v)
            bpy.ops.object.modifier_apply(modifier=md.name)
        bpy.ops.object.select_all(action='DESELECT')
        lo.select_set(True)
        for _ in range(4):
            t = H.colapsar(lo, tope)
            if t <= tope:
                break
        H.quitar_islas(lo, int(tope * 0.97), protege=0.002)
        if H.tris(lo) <= tope or vd == 90:
            break
        bpy.data.objects.remove(lo, do_unlink=True)   # el colapso se atasca en mallas abiertas: se reintenta con vóxel más grueso
    lo.data.shade_smooth()
    lo.data.materials.clear()
    bvh = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())
    med = L.medias(kit)
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
    col = col * (1 - MEZCLA) + CREMA * MEZCLA * (col.mean(1, keepdims=True) / 0.45).clip(0.7, 1.15)
    mapa = -np.ones(nv, np.int64)
    mapa[usados] = np.arange(len(usados))
    nrm = np.zeros((nv, 3))
    np.add.at(nrm, v, E['cn'][E['lt']])
    nrm = nrm[usados] / np.maximum(1e-8, np.linalg.norm(nrm[usados], axis=1))[:, None]
    I = mapa[v].reshape(-1, 3)
    col_u = tono(E['co'][usados], nrm, col[usados], I.ravel())
    mats = [{'name': 'AV_Lejos', 'doubleSided': True, 'extras': {'avTono': 1}, 'pbrMetallicRoughness': {'baseColorFactor': [0.8, 0.8, 0.8, 1], 'metallicFactor': 0.0, 'roughnessFactor': 0.95}}]
    kb = C.glb(os.path.join(H.OUT, nombre + '_lejos.glb'), nombre + '_lejos', [({'POSITION': E['co'][usados], 'NORMAL': nrm, 'COLOR_0': col_u}, I, 0)], mats, [])
    bpy.data.objects.remove(lo, do_unlink=True)
    return dict(id=nombre, trisLejos=int(len(I)), kbLejos=round(kb[1] / 1024, 1))


def main():
    conv = json.load(open(os.path.join(HERE, '../../assets/models/edificios/conversion.json')))
    kitjs = os.path.normpath(os.path.join(HERE, '../../assets/models/edificios/kit.js'))
    s = open(kitjs).read()
    i = s.index('window.AV_EDIFICIOS_KIT = ') + len('window.AV_EDIFICIOS_KIT = ')
    j = s.rindex(';')
    kit = json.loads(s[i:j])
    ids = H.IDS or ancient()
    recs = []
    for n in ids:
        try:
            H.limpiar()
            asset, M = H.origen(n, conv)
            ps = H.piezas(os.path.join(H.MIG, asset + '.glb'), M)
            obs, _, _ = H.reducir(n, ps, H.PRESUPUESTO.get(n, H.DEFECTO))
            ob = C.unir(list(obs.values()))
            r = lejos_forma(n, ob, H.kit_de(asset), kit[n].get('trisLejosOrig', kit[n]['trisLejos']) * FACTOR)
            r['antes'] = kit[n].get('trisLejosOrig', kit[n]['trisLejos'])
            recs.append(r)
            H.log('LEJOS', json.dumps(r))
        except Exception as e:
            import traceback
            traceback.print_exc()
            H.log('ERROR', n, repr(e))
    if H.A.get('kit') and recs:
        for r in recs:
            kit[r['id']].update(trisLejos=r['trisLejos'], kbLejos=r['kbLejos'], lejos=True, trisLejosOrig=r['antes'])
        open(kitjs, 'w').write(s[:i] + json.dumps(kit, ensure_ascii=False, separators=(',', ':')) + s[j:])


if __name__ == '__main__':
    main()
