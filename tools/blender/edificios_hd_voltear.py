#!/usr/bin/env python3
"""Endereza los _hd que salieron del lector .max girados 180° sobre X (28-oct: los toldos del Campamento se veían
tumbados en el suelo, como hojas marrones). Transformación: (x, y, z) → (x, ymax - y, -z) y normales (nx, -ny, -nz).

    python3 -I tools/blender/edificios_hd_voltear.py [--escribir] <modelo> [<modelo> ...]

Sin --escribir solo mide. Para cada modelo compara la nube de vértices del _hd con la del modelo ligero (la referencia
de la escena, con las matrices de sus nodos) antes y después del giro: solo voltea si el giro baja el error medio del
vecino más cercano por debajo de 0,15 m y al menos a la mitad del de ahora. Reescribe <modelo>_hd_glb.js (lo que carga
el juego) y <modelo>_hd.glb. No cambia índices, UV, materiales ni el número de vértices (caché de programas intacto)."""
import base64, json, re, struct, sys
import numpy as np

DIR = 'assets/models/edificios/'


def leer_js(p):
    s = open(p).read()
    m = re.search(r'^(.*?=")([A-Za-z0-9+/=]+)(";?\s*)$', s, re.S)
    return m.group(1), base64.b64decode(m.group(2)), m.group(3)


def partir(b):
    L = struct.unpack('<I', b[12:16])[0]
    js = json.loads(b[20:20 + L])
    off = 20 + L
    Lb = struct.unpack('<I', b[off:off + 4])[0]
    return js, bytearray(b[off + 8:off + 8 + Lb])


def unir(js, binr):
    j = json.dumps(js, separators=(',', ':')).encode()
    j += b' ' * ((4 - len(j) % 4) % 4)
    binr = bytes(binr) + b'\0' * ((4 - len(binr) % 4) % 4)
    total = 12 + 8 + len(j) + 8 + len(binr)
    return (struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<I', len(j)) + b'JSON' + j
            + struct.pack('<I', len(binr)) + b'BIN\0' + binr)


def acc(js, binr, i):
    a = js['accessors'][i]; v = js['bufferViews'][a['bufferView']]
    assert a['componentType'] == 5126, 'solo float'
    n = {'VEC3': 3, 'VEC2': 2}[a['type']]
    ini = v.get('byteOffset', 0) + a.get('byteOffset', 0); paso = v.get('byteStride', 4 * n)
    arr = np.zeros((a['count'], n), np.float32)
    for k in range(a['count']):
        arr[k] = struct.unpack_from('<%df' % n, binr, ini + k * paso)
    return arr, ini, paso


def escribir_acc(binr, arr, ini, paso):
    for k in range(len(arr)):
        struct.pack_into('<%df' % arr.shape[1], binr, ini + k * paso, *map(float, arr[k]))


def matriz(nodo):
    if 'matrix' in nodo:
        return np.array(nodo['matrix'], np.float64).reshape(4, 4).T
    t = np.array(nodo.get('translation', [0, 0, 0])); s = np.array(nodo.get('scale', [1, 1, 1]))
    x, y, z, w = nodo.get('rotation', [0, 0, 0, 1])
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * s; M[:3, 3] = t
    return M


def nube_ligero(js, binr):
    pts = []
    def visitar(i, P):
        n = js['nodes'][i]; M = P @ matriz(n)
        if 'mesh' in n:
            for pr in js['meshes'][n['mesh']]['primitives']:
                p, _, _ = acc(js, binr, pr['attributes']['POSITION'])
                pts.append((np.c_[p, np.ones(len(p))] @ M.T)[:, :3])
        for c in n.get('children', []):
            visitar(c, M)
    for r in js['scenes'][js.get('scene', 0)]['nodes']:
        visitar(r, np.eye(4))
    return np.vstack(pts)


def error(a, b):
    d = []
    for k in range(0, len(a), 512):
        q = a[k:k + 512]
        d.append(np.sqrt(((q[:, None, :] - b[None, :, :]) ** 2).sum(-1)).min(1))
    return float(np.concatenate(d).mean())


def main():
    escribir = '--escribir' in sys.argv
    for mod in [a for a in sys.argv[1:] if not a.startswith('--')]:
        try:
            medir(mod, escribir)
        except AssertionError as e:
            print('%-16s se salta: %s (malla cuantizada o con otro formato)' % (mod, e))


def medir(mod, escribir):
    if True:
        pre, b, post = leer_js(DIR + mod + '_hd_glb.js')
        js, binr = partir(b)
        _, bl, _ = leer_js(DIR + mod + '_glb.js')
        ref = nube_ligero(*partir(bl))
        pr = js['meshes'][0]['primitives'][0]
        ip, inor = pr['attributes']['POSITION'], pr['attributes'].get('NORMAL')
        pos, pini, ppaso = acc(js, binr, ip)
        ymax = float(js['accessors'][ip]['max'][1])
        girada = pos.copy(); girada[:, 1] = ymax - pos[:, 1]; girada[:, 2] = -pos[:, 2]
        e0, e1 = error(pos.astype(np.float64), ref), error(girada.astype(np.float64), ref)
        ok = e1 < 0.15 and e1 < 0.5 * e0
        print('%-16s error vecino ahora %.3f m · girado %.3f m → %s' % (mod, e0, e1, 'VOLTEAR' if ok else 'no se toca'))
        if not (ok and escribir):
            return
        escribir_acc(binr, girada, pini, ppaso)
        a = js['accessors'][ip]
        a['min'] = [float(v) for v in girada.min(0)]; a['max'] = [float(v) for v in girada.max(0)]
        if inor is not None:
            nor, nini, npaso = acc(js, binr, inor)
            nor[:, 1] *= -1; nor[:, 2] *= -1
            escribir_acc(binr, nor, nini, npaso)
        # los triángulos conservan su sentido: el giro de 180° es una rotación (det +1), no un espejo
        glb = unir(js, binr)
        open(DIR + mod + '_hd.glb', 'wb').write(glb)
        open(DIR + mod + '_hd_glb.js', 'w').write(pre + base64.b64encode(glb).decode() + post)
        print('   escrito', mod + '_hd.glb y _hd_glb.js')


if __name__ == '__main__':
    main()
