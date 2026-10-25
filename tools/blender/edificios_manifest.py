# Pipeline de edificios de Kelvin (.max -> migrado fiel + kit web). Ver docs/EDIFICIOS.md.
"""Genera assets/models/edificios/kit.js (AV_EDIFICIOS_KIT) y conversion.json (migrado -> web) a partir de
los _report_web_*.json del pipeline y de los GLB del repo.

python3.11 -I edificios_manifest.py <dir_repo_edificios> <work_dir> <report_dir> [<report_dir> ...]
"""
import json, os, sys, glob, struct, re
import numpy as np

D, WORK = sys.argv[1], sys.argv[2]
REPORT_DIRS = sys.argv[3:]
UNIT = 0.3048
C = np.array([[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1]], float)   # Z-up -> Y-up
Ci = np.linalg.inv(C)
S = np.diag([UNIT, UNIT, UNIT, 1.0])
Si = np.linalg.inv(S)


def glb_json(p):
    b = open(p, 'rb').read()
    jl = struct.unpack_from('<I', b, 12)[0]
    return json.loads(b[20:20 + jl])


def stats(name):
    js = glb_json(os.path.join(D, name + '.glb'))
    tris = sum(js['accessors'][p['indices']]['count'] // 3 for m in js['meshes'] for p in m['primitives'])
    acc = [js['accessors'][p['attributes']['POSITION']] for m in js['meshes'] for p in m['primitives']]
    mn = np.min([a['min'] for a in acc], 0)
    mx = np.max([a['max'] for a in acc], 0)
    corners = np.array([[x, y, z] for x in (mn[0], mx[0]) for y in (mn[1], mx[1]) for z in (mn[2], mx[2])])
    mats = sorted({js['materials'][p['material']]['name'] for m in js['meshes'] for p in m['primitives'] if 'material' in p})
    return tris, float(np.linalg.norm(corners, axis=1).max()), float(mx[1]), mats, (mx - mn).tolist()


rep = {}
for d in REPORT_DIRS:
    for f in sorted(glob.glob(os.path.join(d, '_report_web_*.json'))):
        for r in json.load(open(f)):
            if 'error' not in r and r.get('id'):
                rep[r['id']] = r
names = sorted(n[:-4] for n in os.listdir(D) if n.endswith('.glb') and not n.endswith(('_lejos.glb', '_hd.glb')))
kit = {}
for n in names:
    t, rad, alto, mats, size = stats(n)
    lj = os.path.join(D, n + '_lejos.glb')
    tl = stats(n + '_lejos')[0] if os.path.exists(lj) else 0
    kit[n] = dict(tris=t, trisLejos=tl, lejos=os.path.exists(lj), radio=round(rad, 2), alto=round(alto, 2),
                  kb=round(os.path.getsize(os.path.join(D, n + '_glb.js')) / 1024, 1),
                  kbLejos=round(os.path.getsize(os.path.join(D, n + '_lejos_glb.js')) / 1024, 1) if os.path.exists(lj) else 0,
                  mats=mats, src=rep.get(n, {}).get('src'))
    if os.path.exists(os.path.join(D, n + '_hd.glb')):  # versión cercana de alta fidelidad (edificios_hd.py)
        kit[n].update(hd=True, trisHD=stats(n + '_hd')[0], kbHD=round(os.path.getsize(os.path.join(D, n + '_hd_glb.js')) / 1024, 1))
open(os.path.join(D, 'kit.js'), 'w').write(
    '/* Kit de edificios de Kelvin (generado por tools/blender/edificios_manifest.py): tris, lejano, radio y alto en m desde el pivote (centro de la base). */\n'
    'window.AV_EDIFICIOS_KIT = ' + json.dumps(kit, ensure_ascii=False, separators=(',', ':')) + ';\n')

# ---------------------------------------------------------------- conversion migrado -> web
A = {a['id']: a for a in json.load(open(os.path.join(WORK, 'assets.json')))}


MIG = os.path.expanduser('~/AmazonaVerse/04_Mapa_3D/migrado/')


def _q2m(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def mig_bbox(aid, skip=('lashing', 'debris', 'damage', 'deco', 'beams', 'sculpt', 'bricks')):
    js = glb_json(os.path.join(MIG, aid + '.glb'))
    P = []
    for nd in js['nodes']:
        if 'mesh' not in nd or any(x in nd.get('name', '').lower() for x in skip):
            continue
        T = np.eye(4)
        if 'matrix' in nd:
            T = np.array(nd['matrix']).reshape(4, 4).T
        else:
            T[:3, :3] = _q2m(nd.get('rotation', [0, 0, 0, 1])) @ np.diag(nd.get('scale', [1, 1, 1]))
            T[:3, 3] = nd.get('translation', [0, 0, 0])
        for p in js['meshes'][nd['mesh']]['primitives']:
            a = js['accessors'][p['attributes']['POSITION']]
            for c in [[x, y, z, 1] for x in (a['min'][0], a['max'][0]) for y in (a['min'][1], a['max'][1]) for z in (a['min'][2], a['max'][2])]:
                P.append((T @ np.array(c))[:3])
    P = np.array(P)
    return P.min(0), P.max(0)


def align_fix(M, aid, Mb, bid):
    """Residual translation so the mapped bbox of the variant matches the mapped bbox of its base."""
    def mapped(Mx, a):
        mn, mx = mig_bbox(a)
        cs = np.array([[x, y, z, 1] for x in (mn[0], mx[0]) for y in (mn[1], mx[1]) for z in (mn[2], mx[2])])
        t = (Mx @ cs.T).T[:, :3]
        return t.min(0), t.max(0)
    vmn, vmx = mapped(M, aid)
    bmn, bmx = mapped(Mb, bid)
    d = ((bmn + bmx) - (vmn + vmx)) / 2
    F = np.eye(4); F[:3, 3] = d
    return F @ M, float(np.abs((bmx - bmn) - (vmx - vmn)).max())


def M_base(r):
    k = float(r.get('k', 1.0))
    R = np.eye(4)
    if r.get('lay_flat'):
        a = np.radians(-90)
        R[:3, :3] = [[1, 0, 0], [0, np.cos(a), -np.sin(a)], [0, np.sin(a), np.cos(a)]]
    sh = np.r_[r['shift_zup'], 0.0]
    M = k * (C @ R @ Ci)
    M[3, 3] = 1.0
    M[:3, 3] = -(C @ sh)[:3]
    return M


def members_sorted(a):
    return sorted(a['members'], key=lambda m: (m['key'], tuple(np.round(np.array(m['local'])[:3, 3] / a['s0'], 1))))


def T_variant(v, b, D_=None):
    """glTF coords of migrado v -> glTF coords of migrado b. Members are paired by mesh key; the transform of
    the first pair is checked against all the other pairs (deviation)."""
    Dm = np.eye(4) if D_ is None else np.linalg.inv(D_)
    mv, mb = A[v]['members'], A[b]['members']
    if D_ is not None and len(mv) == 1 and len(mb) == 1:   # boxes: keys hold the dimensions, pair directly
        mv = [dict(mv[0], key='box')]
        mb = [dict(mb[0], key='box')]
    byk = {}
    LO = lambda m: np.array(m['local']) @ np.array(m['offset'])   # object TM incl. the node pivot offset
    for y in mb:
        byk.setdefault(y['key'], []).append(LO(y))
    cands = []
    for x in mv:
        for Lb in byk.get(x['key'], []):
            cands.append(C @ S @ Lb @ Dm @ np.linalg.inv(LO(x)) @ Si @ Ci)
    if not cands:
        return None, 1e9
    best, bdev = None, 1e9
    for T0 in cands:     # the T that explains most pairs
        dev = []
        for x in mv:
            Lv = LO(x)
            d = min((float(np.abs(C @ S @ Lb @ Dm @ np.linalg.inv(Lv) @ Si @ Ci - T0).max()) for Lb in byk.get(x['key'], [])), default=1e9)
            dev.append(d)
        m = float(np.max(dev))
        if m < bdev:
            best, bdev = T0, m
    return best, bdev


def box_dims(aid):
    k = A[aid]['members'][0]['key']
    L, W, H = json.loads(k[4:])
    return np.diag([W, L, H, 1.0])


web_of = {r['src']: n for n, r in rep.items() if n in kit and n != 'muelle_troncos'}
VARIANTS = {'savage_hut_roundthatched_v2': 'savage_hut_roundthatched', 'savage_hut_roundpointed_v2': 'savage_hut_roundpointed',
            'savage_entranceb_v2': 'savage_entranceb', 'savage_campc_v2': 'savage_campc',
            'savage_wall_pikessm_v2': 'savage_wall_pikessm', 'ancient_largee_v2': 'ancient_largee'}
BOXV = {'losa_piso_v4': 'losa_piso_v3', 'losa_piso_v5': 'losa_piso_v3', 'losa_piso_v6': 'losa_piso_v2', 'losa_piso_v7': 'losa_piso_v2'}
out = {'_nota': 'web = M · p_migrado (glTF, metros, Y arriba, column-major). En el web: inst_web = inst_migrado · M^-1. '
                'k = escala uniforme, c = punto del migrado que va al pivote web (centro de la base). '
                'uniforme=false: M deforma (losas de piedra reutilizadas con otras proporciones).', 'assets': {}}
for aid in sorted(A):
    e = None
    if aid in web_of:
        r = rep[web_of[aid]]
        M = M_base(r)
        e = dict(web=web_of[aid], uniforme=True, nota='')
    elif aid in VARIANTS and VARIANTS[aid] in web_of:
        b = VARIANTS[aid]
        T, dev = T_variant(aid, b)
        Mb = M_base(rep[web_of[b]])
        M, dsize = align_fix(Mb @ T, aid, Mb, b)
        e = dict(web=web_of[b], uniforme=True, nota='variante de %s (desviación %.3f, tamaño %.2f m)' % (b, dev, dsize))
    elif aid in BOXV and BOXV[aid] in web_of:
        b = BOXV[aid]
        Dv, Db = box_dims(aid), box_dims(b)
        T, dev = T_variant(aid, b, D_=Dv @ np.linalg.inv(Db))
        Mb = M_base(rep[web_of[b]])
        M, _ = align_fix(Mb @ T, aid, Mb, b)
        e = dict(web=web_of[b], uniforme=False, nota='caja con otras proporciones que %s' % b)
    if e is None:
        out['assets'][aid] = dict(web=None, nota='descartado (geometría degenerada)' if 'largej' in aid else 'sin modelo web')
        continue
    k = float(np.cbrt(abs(np.linalg.det(M[:3, :3]))))
    c = (np.linalg.inv(M) @ np.r_[0, 0, 0, 1.0])[:3]
    e.update(k=round(k, 5), c=[round(float(x), 4) for x in c], M=[round(float(x), 6) for x in M.T.ravel()])
    if web_of.get(aid) == 'empalizada':
        e['nota'] = 'muelle_troncos es la misma pieza acostada (-90° en X)'
    out['assets'][aid] = e
json.dump(out, open(os.path.join(D, 'conversion.json'), 'w'), indent=1, ensure_ascii=False)
miss = [a for a, e in out['assets'].items() if not e.get('web')]
print('kit', len(kit), 'conversion', len(out['assets']), 'sin web', miss)
print('media js KB', round(np.mean([v['kb'] for v in kit.values()]), 1), 'max', max(v['kb'] for v in kit.values()),
      'tris max', max(v['tris'] for v in kit.values()))
