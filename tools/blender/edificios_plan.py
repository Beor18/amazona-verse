# Pipeline de edificios de Kelvin (.max -> migrado fiel + kit web). Ver docs/EDIFICIOS.md. Datos de trabajo en $AV_MAX_WORK.
"""Group scene roots into unique assets (dedupe identical groups) + placements."""
import os, sys, json, collections, re, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from edificios_maxscene import Scene

MAX = '/Users/kelvingarciapr/AmazonaVerse/04_Mapa_3D/AV3DMaxExportBuildings/AV3DMaxExportBuildings.max'
W = os.path.join(os.environ.get('AV_MAX_WORK', os.path.expanduser('~/AmazonaVerse/_trabajo_claude/av_max')), '')
sc = Scene(MAX, W + 'index.npz')
rows = json.load(open(W + 'inventory.json'))
byi = {r['i']: r for r in rows}
info = {r['i']: sc.node_info(r['i']) for r in rows}

wm = {}


def world(i):
    if i in wm:
        return wm[i]
    ni = info.get(i)
    m = sc.prs_matrix(ni['prs'])
    p = ni['parent']
    if p is not None and p in info:
        m = world(p) @ m
    wm[i] = m
    return m


kids = collections.defaultdict(list)
for r in rows:
    if r['parent'] in byi:
        kids[r['parent']].append(r['i'])


def desc(i):
    out = []
    for k in kids[i]:
        out.append(k)
        out += desc(k)
    return out


def box_params(base):
    """Box primitive (old ParamBlock): {0: length, 1: width, 2: height, ...}."""
    pb = sc.refs(base).get(0)
    if pb is None:
        return []
    c = sc.small(pb)
    out = []
    for k in c.ch or []:
        if k.t == 0x2 and k.ch:
            i = v = None
            for kk in k.ch:
                if kk.t == 0x3:
                    i = struct.unpack_from('<I', kk.d, 0)[0]
                elif kk.t == 0x100 and len(kk.d) >= 4:
                    v = struct.unpack_from('<f', kk.d, 0)[0]
                elif kk.t == 0x101 and len(kk.d) >= 4:
                    v = struct.unpack_from('<i', kk.d, 0)[0]
            if i is not None and i < 3:
                out.append((i, v))
    return out


def mesh_key(r):
    if r.get('h'):
        return 'm:' + r['h']
    if r['cls'] == 'Box':
        bp = box_params(r['base'])
        return 'box:' + json.dumps([round(v, 3) if isinstance(v, float) else v for _, v in (bp or [])])
    return 'x:' + str(r['cls'])


def members_of(root):
    d = desc(root)
    cand = [root] + d if not d else d
    out = []
    Wr = world(root)
    iWr = np.linalg.inv(Wr)
    for i in cand:
        r = byi[i]
        if r['cls'] in (None, 'Dummy'):
            continue
        L = iWr @ world(i)
        out.append(dict(node=i, name=r['name'], base=r['base'], mtl=r['mtl'], key=mesh_key(r),
                        mods=r['mods'], local=L.tolist(), offset=info[i]['offset'].tolist(), nf=r.get('nf', 0)))
    out.sort(key=lambda m: (m['key'], [round(x, 2) for x in np.array(m['local'])[:3, 3]]))
    return out


def sig_of(members):
    return tuple((m['key'], tuple(np.round(np.array(m['local'])[:3, :].ravel(), 2))) for m in members)


roots = [r for r in rows if r['parent'] not in byi]
assets = collections.OrderedDict()
for r in sorted(roots, key=lambda r: r['name']):
    mem = members_of(r['i'])
    if not mem:
        continue
    s = sig_of(mem)
    a = assets.get(s)
    Wr = world(r['i'])
    if a is None:
        # bake the canonical instance's (uniform) root scale into the asset so every GLB is at
        # real-world size; placements then carry only the relative scale.
        s0 = float(np.cbrt(abs(np.linalg.det(Wr[:3, :3])))) or 1.0
        S0 = np.diag([s0, s0, s0, 1.0])
        for m in mem:
            m['local'] = (S0 @ np.array(m['local'])).tolist()
        a = assets[s] = dict(members=mem, instances=[], roots=[], s0=s0)
    iS0 = np.diag([1 / a['s0'], 1 / a['s0'], 1 / a['s0'], 1.0])
    a['instances'].append(dict(root=r['name'], node=r['i'], world=(Wr @ iS0).tolist(), root_scale_max=a['s0']))

# loose-piece hash -> group member names (to name loose pieces)
hname = {}
for r in rows:
    if r.get('h') and r['parent'] in byi:
        hname.setdefault(r['h'], r['name'])


def clean(n):
    return re.sub(r'[\d.]+$', '', n)


def common_prefix(names):
    toks = [clean(n).split('_') for n in names]
    pre = []
    for parts in zip(*toks):
        if all(p == parts[0] for p in parts):
            pre.append(parts[0])
        else:
            break
    return '_'.join(pre)


out = []
used = collections.Counter()
for s, a in assets.items():
    mem = a['members']
    names = [m['name'] for m in mem]
    root0 = a['instances'][0]['root']
    if len(mem) > 1:
        pre = common_prefix(names)
        if not pre or pre == 'Component':
            pre = common_prefix(names) or clean(root0)
        if root0.startswith('Group'):
            pre = 'Complejo_' + root0
    else:
        m = mem[0]
        n = clean(m['name'])
        if m['key'].startswith('m:') and m['key'][2:] in hname and n.startswith('SavageG1'):
            n = clean(hname[m['key'][2:]])
        pre = n
    low = root0.lower()
    tex = ''
    kit = 'KitBash3D Savage' if (low.startswith('savage') or any(x in ' '.join(names) for x in ('Savage', 'Hay', 'Lashing', 'Pikes'))) else 'KitBash3D Ancient Temples'
    if root0.startswith('Box0'):
        kit = 'propio (Box Max)'
    nm = re.sub(r'[^a-z0-9]+', '_', pre.lower()).strip('_')
    prefix = 'savage_' if 'Savage' in kit else ('ancient_' if 'Ancient' in kit else '')
    if nm.startswith('component_'):
        nm = nm[len('component_'):]
    nm = prefix + nm if not nm.startswith(prefix) else nm
    if root0.startswith('Box0'):
        nm = 'canoa' if any(m['mods'] and 'TurboSmooth' in m['mods'] for m in mem) else 'losa_piso'
    used[nm] += 1
    if used[nm] > 1:
        nm = '%s_v%d' % (nm, used[nm])
    out.append(dict(id=nm, kit=kit, root0=root0, members=mem, instances=a['instances'], s0=a['s0'],
                    faces=sum(m['nf'] or 0 for m in mem)))
json.dump(out, open(W + 'assets.json', 'w'))
for a in out:
    print('%-34s %-26s inst=%3d parts=%3d faces=%7d  e.g. %s' % (a['id'], a['kit'], len(a['instances']), len(a['members']), a['faces'], a['root0']))
print('assets', len(out), 'unique faces', sum(a['faces'] for a in out), 'instances', sum(len(a['instances']) for a in out))
print('box params sample', box_params(byi[[r['i'] for r in rows if r['name'] == 'Box042'][0]]['base']))
