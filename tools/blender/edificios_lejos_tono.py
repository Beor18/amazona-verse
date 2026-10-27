"""Dos tonos y oclusión en los `_lejos` Ancient (F0.5).

El color de vértice que sale del atlas es arena casi plana: arriba y abajo pesan
igual y, a más de 90 m, la ciudad se lee como cartón. Aquí la cara que mira al
cielo se queda en piedra y la que mira al suelo, más la que está metida en un
hueco, pasa a sombra. Solo entra la normal vertical: el rotY de la pieza no la
cambia, así que la luz no gira con el edificio. La sombra del sol de verdad la
recibe la malla (`receiveShadow` en streaming.js); el mapa de sombras no llega
a 100 m.

No usa Blender: reescribe COLOR_0 del glb que ya está y su `_glb.js`.
  python3 tools/blender/edificios_lejos_tono.py
"""
import base64, json, os, struct, sys
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
ED = os.path.normpath(os.path.join(AQUI, '../../assets/models/edificios'))
# Piedra (normal hacia arriba) y sombra (hacia abajo). El hueco oscurece un poco más.
SOMBRA, PIEDRA = 0.62, 1.0
CAVIDAD, BAJO = 0.34, 0.18


def tono(pos, nrm, col, idx):
    """pos, nrm, col: (n, 3+) en el espacio del modelo. idx: triángulos. Devuelve el color, misma forma."""
    pos = np.asarray(pos, np.float64)
    n = np.asarray(nrm, np.float64)
    n = n / np.maximum(1e-8, np.linalg.norm(n, axis=1))[:, None]
    col = np.asarray(col, np.float64)
    idx = np.asarray(idx, np.int64).ravel()
    ny = n[:, 1]
    u = np.clip((ny + 0.15) / 1.05, 0, 1)
    t = u * u * (3 - 2 * u)
    shade = SOMBRA + (PIEDRA - SOMBRA) * t
    nv = len(pos)
    acc = np.zeros((nv, 3))
    cnt = np.zeros(nv)
    i0, i1, i2 = idx[0::3], idx[1::3], idx[2::3]
    for a, b in ((i0, i1), (i1, i2), (i2, i0)):
        np.add.at(acc, a, pos[b]); np.add.at(cnt, a, 1)
        np.add.at(acc, b, pos[a]); np.add.at(cnt, b, 1)
    avg = acc / np.maximum(cnt, 1)[:, None]
    escala = float(np.linalg.norm(pos.max(0) - pos.min(0))) or 1.0
    cav = np.clip(np.sum((avg - pos) * n, axis=1) / (escala * 0.018), 0, 1)
    ao = (1 - CAVIDAD * cav) * (1 - BAJO * np.clip(-ny, 0, 1))
    out = col.copy()
    out[:, :3] = np.clip(col[:, :3] * (shade * ao)[:, None], 0.03, 1)
    return out


def _kit():
    s = open(os.path.join(ED, 'kit.js')).read()
    i = s.index('=') + 1
    j = s.rindex(';')
    return json.loads(s[i:j])


def ancient():
    return [k for k, v in _kit().items() if str(v.get('src', '')).startswith('ancient')]


def _leer(path):
    b = open(path, 'rb').read()
    if b[:4] != b'glTF':
        raise ValueError('no es glb: ' + path)
    off, js, bin_chunk = 12, None, None
    while off < len(b):
        ln, typ = struct.unpack_from('<II', b, off)
        off += 8
        chunk = b[off:off + ln]
        off += ln
        if typ == 0x4E4F534A:
            js = json.loads(chunk)
        elif typ == 0x004E4942:
            bin_chunk = bytearray(chunk)
    return js, bin_chunk


def _acc(js, buf, i):
    a = js['accessors'][i]
    bv = js['bufferViews'][a['bufferView']]
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    ncomp = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    ct = a['componentType']
    dt = {5121: np.uint8, 5123: np.uint16, 5126: np.float32}[ct]
    count = a['count']
    ancho = np.dtype(dt).itemsize * ncomp
    stride = bv.get('byteStride', ancho)
    raw = bytes(buf[start:start + stride * count])
    if stride == ancho:
        arr = np.frombuffer(raw, dt).reshape(count, ncomp).astype(np.float64)
    else:
        arr = np.zeros((count, ncomp))
        for k in range(count):
            arr[k] = np.frombuffer(raw[k * stride:k * stride + ancho], dt)
    if a.get('normalized'):
        arr = arr / (255.0 if ct == 5121 else 65535.0)
    return arr, a, start, stride, ancho


def _escribir_color(buf, a, start, stride, ancho, col):
    ct = a['componentType']
    ncomp = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    if ct == 5126:
        datos = col.astype(np.float32)
    elif ct in (5121, 5123):
        top = 255 if ct == 5121 else 65535
        datos = np.clip(np.round(col * top), 0, top).astype(np.uint8 if ct == 5121 else np.uint16)
    else:
        raise ValueError('COLOR_0 no soportado: ' + str(ct))
    if datos.shape[1] != ncomp:
        raise ValueError('COLOR_0 con %d componentes' % ncomp)
    raw = datos.tobytes()
    if stride == ancho:
        buf[start:start + len(raw)] = raw
    else:
        for k in range(len(datos)):
            buf[start + k * stride:start + k * stride + ancho] = datos[k].tobytes()


def _guardar(path, js, buf):
    jb = json.dumps(js, separators=(',', ':')).encode()
    jb += b' ' * ((-len(jb)) % 4)
    blob = bytes(buf)
    if len(blob) % 4:
        blob += b'\0' * (4 - len(blob) % 4)
    total = 12 + 8 + len(jb) + 8 + len(blob)
    out = struct.pack('<III', 0x46546C67, 2, total)
    out += struct.pack('<II', len(jb), 0x4E4F534A) + jb
    out += struct.pack('<II', len(blob), 0x004E4942) + blob
    open(path, 'wb').write(out)
    js_path = path[:-4] + '_glb.js'
    previo = open(js_path).read()
    clave = previo.split('["', 1)[1].split('"]', 1)[0]
    open(js_path, 'w').write('(window.AV_EDIFICIOS_B64=window.AV_EDIFICIOS_B64||{})["%s"]="%s";\n' % (clave, base64.b64encode(out).decode('ascii')))
    return out


def _luz(ny, y):
    """Contraste del color: el percentil 90 frente al 10. Una torre casi no tiene caras hacia abajo;
    el techo claro y el muro en sombra igual se separan."""
    del ny
    lo, hi = np.percentile(y, [10, 90])
    return float(hi / max(1e-6, lo))


def aplicar(path, forzar=False):
    """Reescribe COLOR_0. Devuelve el informe, o None si ya estaba."""
    js, buf = _leer(path)
    mat = js['materials'][0]
    if not forzar and (mat.get('extras') or {}).get('avTono') == 1:
        return None
    prim = js['meshes'][0]['primitives'][0]
    pos, _, _, _, _ = _acc(js, buf, prim['attributes']['POSITION'])
    nrm, _, _, _, _ = _acc(js, buf, prim['attributes']['NORMAL'])
    col, a, start, stride, ancho = _acc(js, buf, prim['attributes']['COLOR_0'])
    idx, _, _, _, _ = _acc(js, buf, prim['indices'])
    nuevo = tono(pos, nrm, col, idx.ravel())
    _escribir_color(buf, a, start, stride, ancho, nuevo)
    mat.setdefault('extras', {})['avTono'] = 1
    _guardar(path, js, buf)
    y0 = 0.2126 * col[:, 0] + 0.7152 * col[:, 1] + 0.0722 * col[:, 2]
    y1 = 0.2126 * nuevo[:, 0] + 0.7152 * nuevo[:, 1] + 0.0722 * nuevo[:, 2]
    n = nrm / np.maximum(1e-8, np.linalg.norm(nrm, axis=1))[:, None]
    return dict(antes=_luz(n[:, 1], y0), despues=_luz(n[:, 1], y1), y=round(float(y1.mean()), 3))


def aplicar_si_ancient(path, nombre):
    """Para el pipeline de Blender: solo los Ancient. El glb acaba de exportarse, sin el tono."""
    if nombre not in ancient():
        return None
    return aplicar(path, forzar=True)


def main():
    mal = []
    for nombre in ancient():
        path = os.path.join(ED, nombre + '_lejos.glb')
        r = aplicar(path)
        if r is None:
            js, buf = _leer(path)
            prim = js['meshes'][0]['primitives'][0]
            col, _, _, _, _ = _acc(js, buf, prim['attributes']['COLOR_0'])
            nrm, _, _, _, _ = _acc(js, buf, prim['attributes']['NORMAL'])
            n = nrm / np.maximum(1e-8, np.linalg.norm(nrm, axis=1))[:, None]
            y = 0.2126 * col[:, 0] + 0.7152 * col[:, 1] + 0.0722 * col[:, 2]
            r = dict(antes=None, despues=_luz(n[:, 1], y), y=round(float(y.mean()), 3), ya=True)
        marca = 'ya' if r.get('ya') else '%.2f →' % r['antes']
        print('%-22s %s %.2f  Y %.3f' % (nombre, marca, r['despues'], r['y']))
        if r['despues'] < 1.8:
            mal.append(nombre)
        js2 = open(path[:-4] + '_glb.js').read()
        b64 = js2.split('="', 1)[1].rstrip().rstrip('";')
        if base64.b64decode(b64) != open(path, 'rb').read():
            mal.append(nombre + ':js')
    if mal:
        print('SIN CONTRASTE', ', '.join(mal))
        return 1
    print('ok', len(ancient()))
    return 0


if __name__ == '__main__':
    sys.exit(main())
