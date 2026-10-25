# Escena original de Kelvin (04_Mapa_3D/migrado/escena_layout.json: 377 instancias de 74 modelos) dentro del mapa Cap. 1.
# El mapa sale de su mismo terreno (mapa_lib: 0,255 m por unidad Max en vez de 0,3048), así que su layout cae sobre sus
# mesetas, su río y sus llanos: se aplica la misma escala S = 0,255/0,3048 a posiciones y tamaños (escala relativa intacta),
# se conserva la rotación de cada instancia y solo se ajusta la altura al terreno nuevo y lo que choca con el agua o los
# senderos (desplazamiento mínimo). Los modelos web (assets/models/edificios) se encajan en el marco del .glb migrado:
# web = k·(migrado − c), con c = centro de la base de la caja del migrado.
import json, struct, os, math
import numpy as np

MIGRADO = os.path.expanduser('~/AmazonaVerse/04_Mapa_3D/migrado')
# asset migrado -> modelo web convertido (docs/EDIFICIOS.md). muelle_troncos es la misma pieza acostada: se usa empalizada
WEB = {'savage_hut_roundthatched': 'bohio_redondo', 'savage_hut_roundthatched_v2': 'bohio_redondo',
       'savage_hut_roundpointed': 'bohio_puntiagudo', 'savage_hut_roundpointed_v2': 'bohio_puntiagudo',
       'savage_bldga': 'casa_paja_a', 'savage_bldgb': 'casa_paja_b', 'savage_hutwithdeck': 'casa_plataforma',
       'savage_hall_long': 'caney_largo', 'savage_hall_round': 'cercado_redondo', 'savage_towera': 'torre_vigia',
       'savage_tieredlookout': 'mirador_escalonado', 'savage_bridge': 'puente_madera',
       'savage_wall_pikessm': 'empalizada', 'savage_wall_pikessm_v2': 'empalizada', 'savage_campb': 'toldo_pequeno',
       'canoa': 'canoa', 'ancient_towera': 'ruina_torre', 'ancient_lookout': 'ruina_mirador', 'ancient_pillarc': 'ruina_pilar',
       'ancient_gateb': 'ruina_portal', 'ancient_altar': 'ruina_altar', 'ancient_mediume': 'templo_mediano', 'ancient_largeb': 'templo_grande'}

def glb_json(path):
    with open(path, 'rb') as f:
        h = f.read(20); jl = struct.unpack('<I', h[12:16])[0]
        return json.loads(f.read(jl))

def node_matrix(n):
    if 'matrix' in n: return np.array(n['matrix'], float).reshape(4, 4).T
    t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    x, y, z, w = r
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * np.array(s); M[:3, 3] = t
    return M

def bbox(js):
    """Caja (min, max) de todas las mallas de la escena del glb, con la jerarquía de nodos."""
    lo = np.full(3, np.inf); hi = np.full(3, -np.inf)
    def walk(i, P):
        n = js['nodes'][i]; W = P @ node_matrix(n)
        if 'mesh' in n:
            for p in js['meshes'][n['mesh']]['primitives']:
                a = js['accessors'][p['attributes']['POSITION']]
                mn, mx = np.array(a['min']), np.array(a['max'])
                for c in range(8):
                    v = np.array([(mx if c & 1 else mn)[0], (mx if c & 2 else mn)[1], (mx if c & 4 else mn)[2], 1.0])
                    w = W @ v; lo[:] = np.minimum(lo, w[:3]); hi[:] = np.maximum(hi, w[:3])
        for ch in n.get('children', []): walk(ch, W)
    sc = js['scenes'][js.get('scene', 0)]
    for i in sc['nodes']: walk(i, np.eye(4))
    return lo, hi

def ajustes(web_dir):
    """Para cada asset migrado: caja, y si hay modelo web, la matriz que lleva el web al marco del migrado."""
    lay = json.load(open(os.path.join(MIGRADO, 'escena_layout.json')))
    out = {}
    for a in lay['assets']:
        lo, hi = bbox(glb_json(os.path.join(MIGRADO, a['archivo'])))
        e = {'lo': lo, 'hi': hi, 'web': None, 'k': None, 'A': None}
        w = WEB.get(a['id'])
        if w and os.path.exists(os.path.join(web_dir, w + '.glb')):
            wl, wh = bbox(glb_json(os.path.join(web_dir, w + '.glb')))
            dm = hi - lo; dw = wh - wl
            k = dw[1] / max(1e-6, dm[1])                          # por la altura
            kxz = (dw[0] + dw[2]) / max(1e-6, dm[0] + dm[2])      # control: ancho + fondo
            c = np.array([(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2])
            cw = np.array([(wl[0] + wh[0]) / 2, wl[1], (wl[2] + wh[2]) / 2])
            # migrado = c + (web - cw) / k
            A = np.eye(4); A[:3, :3] /= k; A[:3, 3] = c - cw / k
            e.update({'web': w, 'k': float(k), 'kxz': float(kxz), 'A': A})
        out[a['id']] = e
    return lay, out

def conversion(web_dir):
    """M (migrado -> web) del agente de edificios (assets/models/edificios/conversion.json); A = M^-1 (web -> migrado)."""
    p = os.path.join(web_dir, 'conversion.json')
    if not os.path.exists(p): return {}
    d = json.load(open(p)); d = d if isinstance(d, list) else [dict(migrado=k, **v) for k, v in d.items()]
    out = {}
    for e in d:
        if not e.get('web') or not e.get('M'): continue
        Mx = np.array(e['M'], float).reshape(4, 4).T
        out[e['migrado']] = {'web': e['web'], 'A': np.linalg.inv(Mx), 'k': e.get('k')}
    return out

def _cluster(P, dist):
    n = len(P); lab = -np.ones(n, int); c = 0
    for i in range(n):
        if lab[i] >= 0: continue
        lab[i] = c; st = [i]
        while st:
            j = st.pop(); d = np.hypot(P[:, 0] - P[j, 0], P[:, 1] - P[j, 1])
            for k in np.nonzero((d < dist) & (lab < 0))[0]: lab[k] = c; st.append(k)
        c += 1
    return lab

RADIO_ZONA = 65.0   # streaming: zonas compactas (radio <= ~80 m) para que la carga sea granular

def _zonas(P, rmax):
    """k-medias con k creciente hasta que todas las zonas quepan en rmax."""
    for k in range(2, 60):
        rs = np.random.RandomState(7); C = P[rs.choice(len(P), k, replace=False)].copy()
        for _ in range(40):
            lab = np.argmin(((P[:, None, :] - C[None]) ** 2).sum(-1), 1)
            C = np.array([P[lab == j].mean(0) if (lab == j).any() else C[j] for j in range(k)])
        r = max(np.hypot(*(P[lab == j] - C[j]).T).max() for j in range(k) if (lab == j).any())
        if r <= rmax: return lab
    return lab

def escena(M, ML, ground, water_level, web_dir, bloqueos, nombres):
    """Coloca la escena de Kelvin. ground(x, y) y water_level(x, y) en coordenadas del mapa (Y norte).
    bloqueos(xs, ys) -> máscara de puntos que chocan (agua, senderos, explanadas, estructuras)."""
    lay, aj = ajustes(web_dir)
    conv = conversion(web_dir)
    for k, v in conv.items():
        if k in aj: aj[k].update({'web': v['web'], 'A': v['A'], 'k': v['k'] or aj[k]['k']})
    S = ML.S_K / 0.3048
    K0 = ML.load_kelvin(blur=0)
    def h_kelvin(x, z):   # terreno original de Kelvin en metros (coordenadas glTF de su escena)
        fx = (x / 0.3048 + 896) / 8.96; fy = (-z / 0.3048 + 960) / 9.6
        return float(ML.bicubic(K0, np.array([fx]), np.array([fy]))[0]) * 0.3048
    out = []; skipped = []
    for idx, ins in enumerate(lay['instancias']):
        a = aj[ins['asset']]
        if not np.all(np.isfinite(a['lo'])) or np.max(a['hi'] - a['lo']) < 0.05:
            skipped.append(ins['asset']); continue
        Mi = np.array(ins['matriz_gltf'], float).reshape(4, 4).T
        lo, hi = a['lo'], a['hi']
        C = np.array([[(hi if c & 1 else lo)[0], (hi if c & 2 else lo)[1], (hi if c & 4 else lo)[2], 1.0] for c in range(8)])
        Wh = (Mi @ C.T).T[:, :3]                      # esquinas en su escena
        base_his = Wh[:, 1].min()
        cx, cz = Wh[:, 0].mean(), Wh[:, 2].mean()
        off = base_his - h_kelvin(cx, cz)             # altura sobre su terreno (pilotes, apilados, hundidos)
        L = Mi[:3, :3] * S; t = Mi[:3, 3] * S
        Mn = np.eye(4); Mn[:3, :3] = L; Mn[:3, 3] = t
        Wn = (Mn @ C.T).T[:, :3]
        yaw = math.atan2(L[0, 2], L[0, 0])
        cy_, sy_ = math.cos(yaw), math.sin(yaw)
        # huella orientada en el plano (coordenadas del juego: x, z)
        u = Wn[:, 0] * cy_ - Wn[:, 2] * sy_; v = Wn[:, 0] * sy_ + Wn[:, 2] * cy_
        uc, vc = (u.min() + u.max()) / 2, (v.min() + v.max()) / 2
        hx, hz_ = (u.max() - u.min()) / 2, (v.max() - v.min()) / 2
        fx0 = uc * cy_ + vc * sy_; fz0 = -uc * sy_ + vc * cy_
        canoa = ins['asset'] == 'canoa'
        # puntos de control de la huella
        gu, gv = np.meshgrid(np.linspace(-1, 1, max(2, int(hx / 1.5) + 2)), np.linspace(-1, 1, max(2, int(hz_ / 1.5) + 2)))
        def pts(dx, dz):
            pu = uc + gu.ravel() * hx * 0.9; pv = vc + gv.ravel() * hz_ * 0.9
            px = pu * cy_ + pv * sy_ + dx; pz = -pu * sy_ + pv * cy_ + dz
            return px, -pz                                # mapa: X = x, Y = -z
        dx = dz = 0.0; ok = True
        if not canoa:
            px, py = pts(0, 0)
            if bloqueos(px, py).any():
                ok = False
                for r in np.arange(1.5, 24.1, 1.5):
                    for k in range(16):
                        a_ = 2 * math.pi * k / 16; tx, tz = r * math.cos(a_), r * math.sin(a_)
                        px, py = pts(tx, tz)
                        if not bloqueos(px, py).any(): dx, dz, ok = tx, tz, True; break
                    if ok: break
        px, py = pts(dx, dz)
        g = np.array([ground(x_, y_) for x_, y_ in zip(px, py)])
        if canoa:
            wl = water_level(fx0 + dx, -(fz0 + dz))
            base = (wl + 0.05) if wl is not None else float(np.percentile(g, 30)) + max(0.0, off * S)
        else:
            # a menos de 2,5 m de su suelo es ruido del muestreo: se asienta en el terreno; más alto es una pieza apilada
            acostada = abs(L[1, 1]) / max(1e-9, np.linalg.norm(L[:, 1])) < 0.5   # estacas acostadas (muelle): sobre el punto más alto
            base = (float(g.max()) + 0.05) if acostada else \
                max(float(np.percentile(g, 25)), float(g.mean()) - 0.6) - 0.08 + (off * S if off * S > 2.5 else min(0.0, off * S))
        dy = base - Wn[:, 1].min()
        Mn[0, 3] += dx; Mn[1, 3] += dy; Mn[2, 3] += dz
        e = {'id': 'k%03d' % idx, 'asset': ins['asset'], 'nodo': ins.get('nodo_max'),
             'matrizMigrado': [round(float(v_), 5) for v_ in Mn.T.ravel()],
             'huella': {'x': round(fx0 + dx, 2), 'z': round(fz0 + dz, 2), 'hx': round(hx, 2), 'hz': round(hz_, 2), 'rotY': round(yaw, 4),
                        'y0': round(float(Wn[:, 1].min() + dy), 2), 'y1': round(float(Wn[:, 1].max() + dy), 2)},
             'ajuste': {'dx': round(dx, 2), 'dy': round(float(dy), 2), 'dz': round(dz, 2)}}
        if not ok: e['oculto'] = 'choca con agua o sendero'
        if a['web']:
            e['modelo'] = a['web']
            e['matriz'] = [round(float(v_), 5) for v_ in (Mn @ a['A']).T.ravel()]
        else:
            e['modelo'] = None
        out.append(e)
    # piezas apiladas: si su base queda alta y lo que las sostiene aún no tiene modelo web, esperan (no se dibujan flotando)
    for e in out:
        if e['asset'] == 'canoa': continue
        hu = e['huella']; gap = hu['y0'] - ground(hu['x'], -hu['z'])
        if gap <= 1.5: continue
        sop = None
        for f in out:
            if f is e: continue
            fh = f['huella']; c, s_ = math.cos(fh['rotY']), math.sin(fh['rotY'])
            du, dv = (hu['x'] - fh['x']) * c - (hu['z'] - fh['z']) * s_, (hu['x'] - fh['x']) * s_ + (hu['z'] - fh['z']) * c
            if abs(du) <= fh['hx'] + 0.5 and abs(dv) <= fh['hz'] + 0.5 and fh['y1'] >= hu['y0'] - 1.0 and fh['y0'] < hu['y0']:
                if sop is None or f.get('modelo'): sop = f
        if sop is None: e['espera'] = 'sin apoyo: flota %.1f m' % gap
        elif not sop.get('modelo'): e['espera'] = 'apoyo pendiente: %s' % sop['asset']
        else: e['_sop'] = sop
    for _ in range(6):   # si lo que la sostiene también espera, espera
        for e in out:
            if e.get('_sop') is not None and e['_sop'].get('espera') and not e.get('espera'):
                e['espera'] = 'apoyo pendiente: %s' % e['_sop']['asset']
    for e in out: e.pop('_sop', None)
    # zonas por cercanía (para la carga por zonas)
    P = np.array([[e['huella']['x'], -e['huella']['z']] for e in out])
    lab = _zonas(P, RADIO_ZONA)
    zonas = {}
    for e, l in zip(out, lab): zonas.setdefault(int(l), []).append(e)
    Z = []
    for l, lst in sorted(zonas.items(), key=lambda kv: -len(kv[1])):
        cx = float(np.mean([e['huella']['x'] for e in lst])); cz = float(np.mean([e['huella']['z'] for e in lst]))
        r = float(max(math.hypot(e['huella']['x'] - cx, e['huella']['z'] - cz) + max(e['huella']['hx'], e['huella']['hz']) for e in lst))
        nm = nombres(cx, -cz, lst)
        Z.append({'id': nm[0], 'nombre': nm[1], 'centro': [round(cx, 1), round(ground(cx, -cz), 1), round(cz, 1)], 'r': round(r, 1), 'instancias': lst})
    ids = {}
    for z in Z:   # ids únicos
        n_ = ids.get(z['id'], 0); ids[z['id']] = n_ + 1
        if n_: z['id'] = '%s_%d' % (z['id'], n_ + 1)
    return {'Z': Z, 'S': S, 'aj': aj, 'saltados': skipped, 'conv': bool(conv)}

DECORATIVOS = ('canoa', 'empalizada', 'muelle_troncos')

def compacto(Z):
    """Forma compacta para streaming.js: una entrada por modelo y zona. inst = [x, y, z, rotY, escala] si es giro en Y con
    escala uniforme; si no, la matriz completa (16, column-major)."""
    out = []
    for z in Z:
        per = {}
        for e in z['instancias']:
            if not e.get('modelo') or e.get('oculto') or e.get('espera'): continue
            Mw = np.array(e['matriz'], float).reshape(4, 4).T; L = Mw[:3, :3]
            sc = np.linalg.norm(L, axis=0); s_ = float(np.cbrt(abs(np.linalg.det(L))))
            R = L / sc
            yaw_ok = abs(R[1, 1] - 1) < 2e-3 and max(abs(R[0, 1]), abs(R[1, 0]), abs(R[1, 2]), abs(R[2, 1])) < 2e-3
            uni = (sc.max() - sc.min()) / max(1e-9, sc.mean()) < 0.01
            if yaw_ok and uni and np.linalg.det(R) > 0:
                it = [round(float(Mw[0, 3]), 3), round(float(Mw[1, 3]), 3), round(float(Mw[2, 3]), 3), round(math.atan2(R[0, 2], R[0, 0]), 4), round(s_, 4)]
            else:
                it = e['matriz']
            per.setdefault(e['modelo'], []).append(it)
        for m, lst in per.items():
            ent = {'grupo': z['id'], 'modelo': m, 'inst': lst, 'orientar': False, 'yExacta': True, 'escalaPack': False}
            if m in DECORATIVOS: ent['decorativo'] = True   # sin techo donde pararse: estacas y canoas (sí chocan)
            out.append(ent)
    return out
