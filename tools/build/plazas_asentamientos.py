"""AY2 (MAPA_PLAN_COMPLETO F2.3): plaza y props de cada asentamiento de la escena de Kelvin.

Busca, en cada una de las 14 zonas de assets/data/mapa_cap1.js (escenaKelvin.compacto, zonasEdificios), el hueco que dejó el
layout: una plaza (el claro más amplio cerca del centro de las piezas) y 2-4 sitios para props del kit (toldo_pequeno,
losa_piedra, canoa). No mueve ninguna pieza de Kelvin: solo mira dónde no hay nada. Comprueba:
  - holgura con cada pieza (huella horizontal del radio del kit, sin la altura, × escala) y entre los props;
  - relieve plano bajo el prop (mapa_cap1_altura.js) y fuera del agua (río, quebrada y pozas; la canoa, en la orilla);
  - lejos de los POIs, lugares, misiones y senderos (no tapa nada jugable).
Imprime el bloque PLAZAS para content/cap1/mundo.js (lo usa mundo.suelo.plazas y reubicar). Uso:
  ~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11 -I tools/build/plazas_asentamientos.py
"""
import base64, json, math, os, re, struct, sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def leer_js(ruta, marca):
    s = open(os.path.join(RAIZ, ruta), encoding='utf-8').read()
    i = s.index(marca) + len(marca)
    return s, i


def mapa():
    s, i = leer_js('assets/data/mapa_cap1.js', 'window.AV_MAPA_CAP1 = ')
    return json.JSONDecoder().raw_decode(s[i:])[0]


def kit():
    s, i = leer_js('assets/models/edificios/kit.js', 'window.AV_EDIFICIOS_KIT = ')
    return json.JSONDecoder().raw_decode(s[i:])[0]


def alturas():
    s = open(os.path.join(RAIZ, 'assets/data/mapa_cap1_altura.js'), encoding='utf-8').read()
    num = lambda k: float(re.search(k + r':\s*(-?[\d.]+)', s).group(1))
    nx, nz, x0, z0, paso, mn, mx = (num(k) for k in ('nx', 'nz', 'x0', 'z0', 'paso', 'min', 'max'))
    b = base64.b64decode(re.search(r'datos:\s*"([^"]+)"', s).group(1))
    v = struct.unpack('<%dH' % (len(b) // 2), b)
    nx, nz = int(nx), int(nz)

    def h(x, z):
        fx = min(max((x - x0) / paso, 0), nx - 1.001); fz = min(max((z - z0) / paso, 0), nz - 1.001)
        ix, iz = int(fx), int(fz); tx, tz = fx - ix, fz - iz
        g = lambda a, c: mn + v[a + c * nx] / 65535 * (mx - mn)
        return (g(ix, iz) * (1 - tx) + g(ix + 1, iz) * tx) * (1 - tz) + (g(ix, iz + 1) * (1 - tx) + g(ix + 1, iz + 1) * tx) * tz
    return h


def dist_seg(px, pz, ax, az, bx, bz):
    ux, uz = bx - ax, bz - az; L = ux * ux + uz * uz or 1
    t = max(0, min(1, ((px - ax) * ux + (pz - az) * uz) / L))
    return math.hypot(px - ax - ux * t, pz - az - uz * t), t


def main():
    D, K, H = mapa(), kit(), alturas()
    A = D['agua']
    cauces = [A['rio']['puntos'], A['quebrada']['puntos']]

    def agua(x, z):  # distancia (m) al borde del agua (< 0 dentro) y dirección del cauce más cercano
        best, dirv = 1e9, (1, 0)
        for pts in cauces:
            for a, b in zip(pts, pts[1:]):
                d, t = dist_seg(x, z, a[0], a[1], b[0], b[1])
                d -= a[3] + (b[3] - a[3]) * t
                if d < best: best, dirv = d, (b[0] - a[0], b[1] - a[1])
        for p in A['pozas']:
            d = math.hypot(x - p['x'], z - p['z']) - p['r']
            if d < best: best = d
        return best, dirv

    # puntos que no se tapan: POIs, lugares, misiones (recursos, hallazgos, arbustos, perchas, guía) y senderos
    libres = [(p['pos'][0], p['pos'][2], 6) for p in D['pois'] if not p['id'].startswith('kelvin_')]
    libres += [(l['x'], l['z'], (l.get('r') or 4) + 4) for l in D['lugares'].values() if 'x' in l]
    M = D['misiones']
    for k in ('RESOURCES', 'FIELD', 'BUSHES', 'perchas'):
        for e in M.get(k) or []:
            if isinstance(e, dict) and 'x' in e: libres.append((e['x'], e['z'], 4))
    for e in M.get('KEEP_CLEAR') or []:
        if isinstance(e, dict) and 'x' in e: libres.append((e['x'], e['z'], (e.get('r') or 3) + 2))
    sendas = [s for s in D['senderos'].values()]

    # piezas por zona: (x, z, radio de huella, modelo)
    piezas = {}
    for e in D['escenaKelvin']['compacto']:
        n, g = e['modelo'], e['grupo']
        if not n: continue
        for v in e['inst']:
            if len(v) >= 16: x, z, esc = v[12], v[14], math.hypot(v[0], v[1], v[2])
            else: x, z, esc = v[0], v[2], (v[4] if len(v) > 4 else 1)
            k = K.get(n, {}); r, al = k.get('radio', 5), k.get('alto', 0)
            hz = math.sqrt(max(r * r - al * al, (0.3 * r) ** 2))  # radio del kit = esfera desde la base: la huella es la parte horizontal
            piezas.setdefault(g, []).append((x, z, hz * esc * 0.85, n))

    def pendiente(x, z, r):
        hs = [H(x + r * math.cos(a), z + r * math.sin(a)) for a in [k * math.pi / 4 for k in range(8)]] + [H(x, z)]
        return max(hs) - min(hs)

    ESC = 0.8366  # escala de la escena de Kelvin (todas sus piezas van a 0,8366 en matrizMigrado)
    out, resumen, todos = [], [], []  # todos: los props ya puestos en otras zonas (La Mina y La Mina 2 comparten orilla)
    for zid, Z in D['zonasEdificios'].items():
        P = piezas.get(zid, [])
        cx = sum(p[0] for p in P) / len(P); cz = sum(p[1] for p in P) / len(P)
        R0 = Z['radio']
        piedra = sum(1 for p in P if re.match(r'(templo|ruina|muro_templo|plataforma|bloque|losa|complejo)', p[3])) > len(P) / 2

        def holgura(x, z, extra=()):
            c = min([math.hypot(x - p[0], z - p[1]) - p[2] for p in P] + [99])
            for q in extra: c = min(c, math.hypot(x - q[0], z - q[1]) - q[2])
            return c

        def jugable(x, z, r):
            if any(math.hypot(x - a, z - b) < rr + r for a, b, rr in libres): return False
            for s in sendas:
                for a, b in zip(s, s[1:]):
                    if dist_seg(x, z, a[0], a[2], b[0], b[2])[0] < r + 1.5: return False
            return True

        cand = []
        paso = 1.5
        k = int(R0 / paso) + 1
        for i in range(-k, k + 1):
            for j in range(-k, k + 1):
                x, z = cx + i * paso, cz + j * paso
                if math.hypot(x - Z['centro'][0], z - Z['centro'][1]) > R0 * 0.95: continue
                w, _ = agua(x, z)
                cand.append((x, z, holgura(x, z), w))

        # plaza: el claro más amplio (hasta 12 m) cerca del centro de las piezas, plano y en seco
        # (rodeado de piezas: al menos 3 a menos de 30 m y en 3 cuadrantes, para que quede dentro y no en el borde de la zona)
        best = None
        for laxo in (0, 1, 2):
            for x, z, c, w in cand:
                if w < 3 or c < (4, 2.5, 2)[laxo]: continue
                cerca = [p for p in P if math.hypot(x - p[0], z - p[1]) < 30]
                if len(cerca) < min(3, len(P)): continue
                if laxo < 2 and len({(p[0] > x, p[1] > z) for p in cerca}) < 3: continue  # piezas en 3 de los 4 cuadrantes
                r = min(c, 12)
                if pendiente(x, z, min(r, 6)) > (2.5, 4.5, 8)[laxo]: continue
                s = min(r, 7) - 0.35 * math.hypot(x - cx, z - cz)
                if not best or s > best[0]: best = (s, x, z, r)
            if best: break
        plaza = None
        if best:
            plaza = {'x': round(best[1], 1), 'z': round(best[2], 1), 'r': round(max(6, min(12, best[3] + 2)), 1), 'laxo': laxo}

        # props: 2 a 4, en el borde de la plaza y en los huecos más cercanos al centro
        tipos = (['losa_piedra', 'toldo_pequeno', 'losa_piedra'] if piedra else ['toldo_pequeno', 'toldo_pequeno', 'toldo_pequeno'])  # la losa (Ancient) no va en aldeas de madera
        canoas = [p for p in P if p[3] == 'canoa']
        if canoas: tipos = ['canoa'] + tipos
        else: tipos = tipos + ['toldo_pequeno']
        tope = 2 if len(P) < 15 else 3 if len(P) < 30 else 4  # 2-4 según el tamaño del asentamiento
        puestos = []
        fx, fz = (plaza['x'], plaza['z']) if plaza else (cx, cz)
        for n in tipos:
            rp = K[n]['radio'] * ESC * (0.62 if n == 'losa_piedra' else 0.75)
            mejor = None
            for x, z, c, w in cand:
                if n == 'canoa':
                    if not (0.3 < w < 2.5): continue
                    if min(math.hypot(x - q[0], z - q[1]) for q in canoas) > 14: continue
                else:
                    if w < rp + 1.5: continue
                h = holgura(x, z, puestos + todos)
                if h < rp + (0.6 if n == 'canoa' else 1.2): continue
                if pendiente(x, z, rp) > (1.2 if n == 'losa_piedra' else 1.6) * (2.5 if not plaza or plaza.get('laxo') else 1): continue
                if not jugable(x, z, rp): continue
                s = -abs(math.hypot(x - fx, z - fz) - (plaza['r'] if plaza else 6) * (0.0 if n == 'losa_piedra' else 0.9))
                if not mejor or s > mejor[0]: mejor = (s, x, z)
            if not mejor: continue
            puestos.append((mejor[1], mejor[2], rp, n))
            if len(puestos) >= tope: break
        todos.extend(puestos)
        props = []
        for x, z, rp, n in puestos:
            # la canoa, paralela a la orilla; lo demás mira a la plaza
            rot = (math.atan2(*agua(x, z)[1]) + math.pi / 2 if n == 'canoa' else math.atan2(fx - x, fz - z)) % (2 * math.pi)
            props.append([n, round(x, 1), round(H(x, z) + 0.5, 1), round(z, 1), round(rot, 2)])  # y: el suelo + 0,5 (streaming toma el menor)
        out.append({'id': zid, 'plaza': plaza, 'props': props})
        resumen.append('%-26s %-6s plaza %s  props %d: %s' % (zid, 'piedra' if piedra else 'madera', plaza and (plaza['x'], plaza['z'], plaza['r']), len(props), ', '.join(p[0] for p in props)))

    print('\n'.join(resumen), file=sys.stderr)
    print('  const PLAZAS = [')
    for e in out:
        p = e['plaza']
        print("    { id: '%s', plaza: %s, props: %s }," % (e['id'], '{ x: %s, z: %s, r: %s }' % (p['x'], p['z'], p['r']) if p else 'null',
              json.dumps(e['props'], separators=(', ', ': ')).replace('"', "'")))
    print('  ];')


if __name__ == '__main__':
    main()
