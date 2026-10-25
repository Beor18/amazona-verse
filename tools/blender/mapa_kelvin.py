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
       'ancient_gateb': 'ruina_portal', 'ancient_altar': 'ruina_altar', 'ancient_mediume': 'templo_mediano', 'ancient_largeb': 'templo_grande',
       'ancient_towerb': 'ruina_torre_b', 'ancient_towere': 'ruina_torre_e', 'ancient_mediumg': 'templo_mediano_g'}
# Los 11 ancient que hoy rompe la conversión quedan como marcadores (modelo null) hasta que Edificios los arregle
DESCARTADOS = set()

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
    d = json.load(open(p))
    if isinstance(d, dict) and 'assets' in d: d = d['assets']
    d = d if isinstance(d, list) else [dict(migrado=k, **v) for k, v in d.items() if isinstance(v, dict)]
    out = {}
    for e in d:
        if not e.get('web') or not e.get('M') or not os.path.exists(os.path.join(web_dir, e['web'] + '.glb')): continue
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

ZONAS_FIJAS = [   # (id, x, z, nombre): sacadas una vez con k-medias (radio <= 65 m) sobre las 376 instancias
    ('kelvin_ruinas_yunque', -4.0, -130.8, 'Ruinas de Kelvin · El Yunque'), ('kelvin_aldea_rio_este', 112.2, 96.9, 'Aldea de Kelvin · el río del este'),
    ('kelvin_aldea_rio_oeste', -134.4, 27.4, 'Aldea de Kelvin · el río del oeste'), ('kelvin_aldea_lomas', -87.2, 90.9, 'Aldea de Kelvin · las Lomas del Oeste'),
    ('kelvin_aldea_rio_este_2', 135.9, 12.6, 'Aldea de Kelvin · el río del este'), ('kelvin_aldea_mina', 78.1, -105.6, 'Aldea de Kelvin · La Mina'),
    ('kelvin_aldea_meandros', -14.3, 16.8, 'Aldea de Kelvin · los meandros'), ('kelvin_ruinas_yunque_2', -74.1, -131.9, 'Ruinas de Kelvin · El Yunque'),
    ('kelvin_aldea_colina', -5.3, 141.2, 'Aldea de Kelvin · la Colina'), ('kelvin_aldea_mina_2', 96.2, -42.9, 'Aldea de Kelvin · La Mina'),
    ('kelvin_aldea_rio_este_3', 37.9, 52.3, 'Aldea de Kelvin · el río del este'), ('kelvin_aldea_rio_oeste_2', -134.0, -40.5, 'Aldea de Kelvin · el río del oeste'),
    ('kelvin_aldea_yunque', -21.0, -70.3, 'Aldea de Kelvin · El Yunque'), ('kelvin_aldea_meandros_2', -74.3, -68.2, 'Aldea de Kelvin · los meandros')]
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
        if ins['asset'] in DESCARTADOS or not np.all(np.isfinite(a['lo'])) or np.max(a['hi'] - a['lo']) < 0.05:
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
        if canoa:   # canoa: sobre agua de verdad (fondo 0,25 m bajo el nivel en toda su huella); si no, se acerca al agua
            def flota(tx, tz):
                wl_ = water_level(fx0 + tx, -(fz0 + tz))
                if wl_ is None: return None
                qx, qy = pts(tx, tz)
                return wl_ if all(ground(a_, b_) < wl_ - 0.25 for a_, b_ in zip(qx, qy)) else None
            if flota(0, 0) is None:
                for r in np.arange(1.0, 12.1, 1.0):
                    hit = next(((r * math.cos(2 * math.pi * k / 16), r * math.sin(2 * math.pi * k / 16)) for k in range(16)
                                if flota(r * math.cos(2 * math.pi * k / 16), r * math.sin(2 * math.pi * k / 16)) is not None), None)
                    if hit: dx, dz = hit; break
            px, py = pts(dx, dz); g = np.array([ground(x_, y_) for x_, y_ in zip(px, py)])
            wl = flota(dx, dz)
            base = (wl + 0.05) if wl is not None else float(np.percentile(g, 30)) - 0.05
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
        e['_his'] = (float(base_his), float(Wh[:, 1].max()), float(Wh[:, 0].min()), float(Wh[:, 0].max()), float(Wh[:, 2].min()), float(Wh[:, 2].max()), float(cx), float(cz))
        e['_apilada'] = (not canoa) and off * S > 2.5
        e['_d'] = (dx, float(dy), dz)
        if not ok: e['oculto'] = 'choca con agua o sendero'
        if a['web']:
            e['modelo'] = a['web']
            e['matriz'] = [round(float(v_), 5) for v_ in (Mn @ a['A']).T.ravel()]
        else:
            e['modelo'] = None
        out.append(e)
    # piezas apiladas: siguen a la pieza que las sostiene en su escena (mismo desplazamiento), así los conjuntos no se
    # desarman al asentar cada pieza en el terreno nuevo; si en su escena no hay apoyo, siguen a la vecina asentada más cercana
    def mover(e, d):
        ddx, ddy, ddz = d[0] - e['_d'][0], d[1] - e['_d'][1], d[2] - e['_d'][2]
        for key in ('matriz', 'matrizMigrado'):
            if e.get(key): e[key][12] = round(e[key][12] + ddx, 5); e[key][13] = round(e[key][13] + ddy, 5); e[key][14] = round(e[key][14] + ddz, 5)
        h = e['huella']; h['x'] = round(h['x'] + ddx, 2); h['z'] = round(h['z'] + ddz, 2); h['y0'] = round(h['y0'] + ddy, 2); h['y1'] = round(h['y1'] + ddy, 2)
        e['ajuste'] = {'dx': round(d[0], 2), 'dy': round(d[1], 2), 'dz': round(d[2], 2)}; e['_d'] = d
    orden = sorted(out, key=lambda e: e['_his'][0])
    for e in orden:
        if not e['_apilada']: continue
        b, _, _, _, _, _, ex, ez = e['_his']; sop = None
        for f in orden:
            if f is e: continue
            fb, ft, x0, x1, z0, z1, _, _ = f['_his']
            if fb < b and ft >= b - 1.0 and x0 - 0.5 <= ex <= x1 + 0.5 and z0 - 0.5 <= ez <= z1 + 0.5:
                if sop is None or ft > sop['_his'][1]: sop = f
        if sop is not None: mover(e, sop['_d'])
        else: e['_apilada'] = False   # sin apoyo en su escena: su altura era ruido del terreno original; se asienta abajo
    # repaso final con las posiciones nuevas (QA-26): de abajo arriba, lo que no tiene apoyo se asienta en el terreno
    # (ni flota ni queda enterrado) y lo que se apoya en otra pieza sigue la corrección de esa pieza
    def suelo_huella(h):
        c, s_ = math.cos(h['rotY']), math.sin(h['rotY']); g_ = []
        for fu in (-0.8, 0, 0.8):
            for fv in (-0.8, 0, 0.8):
                u, v = fu * h['hx'], fv * h['hz']; x = h['x'] + u * c + v * s_; z = h['z'] - u * s_ + v * c
                g_.append(ground(x, -z))
        return np.array(g_)
    def apoyo(e):
        h = e['huella']; best = None
        for f in out:
            if f is e or f.get('oculto'): continue
            fh = f['huella']; c, s_ = math.cos(fh['rotY']), math.sin(fh['rotY'])
            du, dv = (h['x'] - fh['x']) * c - (h['z'] - fh['z']) * s_, (h['x'] - fh['x']) * s_ + (h['z'] - fh['z']) * c
            if abs(du) <= fh['hx'] + 0.3 and abs(dv) <= fh['hz'] + 0.3 and fh['y0'] < h['y0'] - 0.2 and fh['y1'] >= h['y0'] - 0.5:
                if best is None or fh['y1'] > best['huella']['y1']: best = f
        return best
    corr = {}
    for e in sorted(out, key=lambda e: e['huella']['y0']):
        if e['asset'] == 'canoa' and e['huella']['y0'] > ground(e['huella']['x'], -e['huella']['z']) - 0.2 and water_level(e['huella']['x'], -e['huella']['z']) is not None:
            continue   # canoa sobre el agua
        f = apoyo(e)
        if f is not None and f['id'] in corr:
            d = corr[f['id']]
            if e['asset'].startswith('losa'):
                gc = float(suelo_huella(e['huella'])[4]); top = e['huella']['y1'] + d
                if top < gc + 0.05: d += gc + 0.05 - top
        else:
            g_ = suelo_huella(e['huella']); h = e['huella']
            if f is not None: d = 0.0
            else:
                base = max(float(np.percentile(g_, 25)), float(g_.mean()) - 0.6) - 0.08
                alto = h['y1'] - h['y0']; gc = float(g_[4])
                if e['asset'].startswith('losa'):       # losas: zócalos hundidos a propósito; solo que la cara de arriba no quede bajo tierra
                    d = (gc + 0.05 - h['y1']) if h['y1'] < gc + 0.05 else 0.0
                else:
                    base = max(base, gc - 0.25 * alto)  # nunca enterrada: al menos 75 % del alto sobre el suelo del centro
                    d = base - h['y0'] if (h['y0'] - g_.max() > 0.3 or h['y0'] < base - 0.3) else 0.0
        if abs(d) > 1e-3: mover(e, (e['_d'][0], e['_d'][1] + d, e['_d'][2]))
        corr[e['id']] = d
    for e in out:
        for k in ('_his', '_apilada', '_d'): e.pop(k, None)
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
        if sop is None: continue   # el conjunto sigue a su apoyo original (fiel a su escena)
        if not sop.get('modelo'): e['espera'] = 'apoyo pendiente: %s' % sop['asset']
        else: e['_sop'] = sop
    for _ in range(6):   # si lo que la sostiene también espera, espera
        for e in out:
            if e.get('_sop') is not None and e['_sop'].get('espera') and not e.get('espera'):
                e['espera'] = 'apoyo pendiente: %s' % e['_sop']['asset']
    for e in out: e.pop('_sop', None)
    # zonas por cercanía (para la carga por zonas)
    # zonas fijas (estables entre lotes de modelos: streaming y gameplay usan sus ids); centro en coordenadas del juego
    C = np.array([[c[1], c[2]] for c in ZONAS_FIJAS])
    zonas = {}
    for e in out:
        j = int(np.argmin(np.hypot(C[:, 0] - e['huella']['x'], C[:, 1] - e['huella']['z']))); zonas.setdefault(j, []).append(e)
    Z = []
    for j, lst in sorted(zonas.items()):
        zid, cx, cz, nm = ZONAS_FIJAS[j]
        r = float(max(math.hypot(e['huella']['x'] - cx, e['huella']['z'] - cz) + max(e['huella']['hx'], e['huella']['hz']) for e in lst))
        Z.append({'id': zid, 'nombre': nm, 'centro': [cx, round(ground(cx, -cz), 1), cz], 'r': round(r, 1), 'instancias': lst})
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
