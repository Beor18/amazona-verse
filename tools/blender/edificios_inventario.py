# Pipeline de edificios de Kelvin (.max -> migrado fiel + kit web). Ver docs/EDIFICIOS.md. Datos de trabajo en $AV_MAX_WORK.
import os, sys, time, json, collections, struct, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from edificios_maxscene import Scene, decode_polys
from edificios_maxindex import check_mem, rss_peak_gb
t0 = time.time()
sc = Scene(sys.argv[1], os.path.join(os.environ.get('AV_MAX_WORK', os.path.expanduser('~/AmazonaVerse/_trabajo_claude/av_max')), 'index.npz'))
nodes = sc.nodes()
print('nodes', len(nodes))
info = {}
for i in nodes:
    ni = sc.node_info(i)
    info[i] = ni
# world matrices
wm = {}
def world(i):
    if i in wm: return wm[i]
    ni = info.get(i)
    if ni is None: return np.eye(4)
    m = sc.prs_matrix(ni['prs'])
    p = ni['parent']
    if p is not None and p in info:
        m = world(p) @ m
    wm[i] = m
    return m
for i in nodes: world(i)
# objects
objstats = {}
def mstats(o):
    if o in objstats: return objstats[o]
    g = sc.guid(o)
    st = None
    if g in (0x192F60981BF8338D, 0xE44F10B3):
        c = sc.head_tree(o)
        pc = c.first(0x08FE)
        if pc is not None:
            if g == 0xE44F10B3:
                v = pc.first(0x0914); f = pc.first(0x0912)
                n = struct.unpack_from('<I', v.d, 0)[0]
                vv = np.frombuffer(v.d, '<f4', n*3, 4).reshape(-1,3)
                nf = struct.unpack_from('<I', f.d, 0)[0]; ntri = nf
            else:
                v = pc.first(0x0100)
                n = struct.unpack_from('<I', v.d, 0)[0]
                vv = np.frombuffer(v.d, np.dtype([('f','<u4'),('p','<f4',(3,))]), n, 4)['p']
                f = pc.first(0x011A)
                nf = struct.unpack_from('<I', f.d, 0)[0]
                ntri = None
            h = hashlib.md5(bytes(v.d)).hexdigest()[:12]
            st = dict(nv=int(n), nf=int(nf), mn=vv.min(0).tolist() if n else [0,0,0], mx=vv.max(0).tolist() if n else [0,0,0], h=h,
                      nch=[hex(k.t) for k in pc.ch][:0])
    objstats[o] = st
    check_mem(9.0)
    return st
rows = []
modc = collections.Counter(); clsc = collections.Counter()
for i in nodes:
    ni = info[i]
    base, mods = sc.resolve_object(ni['obj']) if ni['obj'] is not None else (None, [])
    cn = sc.clsname(base) if base is not None else None
    clsc[cn] += 1
    for m in mods: modc[m] += 1
    st = mstats(base) if base is not None else None
    W = wm[i] @ ni['offset']
    row = dict(i=i, name=ni['name'], parent=ni['parent'], cls=cn, base=base, mods=mods, mtl=ni['mtl'], layer=ni['layer'],
               pos=wm[i][:3,3].round(2).tolist())
    if st:
        mn, mx = np.array(st['mn']), np.array(st['mx'])
        corners = np.array([[a,b,c,1] for a in (mn[0],mx[0]) for b in (mn[1],mx[1]) for c in (mn[2],mx[2])])
        wc = (W @ corners.T).T[:, :3]
        row.update(nv=st['nv'], nf=st['nf'], h=st['h'], wmn=wc.min(0).round(1).tolist(), wmx=wc.max(0).round(1).tolist())
    rows.append(row)
layers = {}
for r in rows:
    if r['layer'] is not None and r['layer'] not in layers:
        layers[r['layer']] = sc.layer_name(r['layer'])
for r in rows: r['lname'] = layers.get(r['layer'], '')
json.dump(rows, open(os.path.join(os.environ.get('AV_MAX_WORK', os.path.expanduser('~/AmazonaVerse/_trabajo_claude/av_max')), 'inventory.json'), 'w'))
print('classes', clsc.most_common())
print('mods', modc.most_common())
print('layers', collections.Counter(r['lname'] for r in rows).most_common())
print('warn', collections.Counter(sc.warn).most_common(10))
print('secs', round(time.time()-t0,1), 'peakGB', round(rss_peak_gb(),2))
