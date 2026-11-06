#!/usr/bin/env python3
"""BM164: añade la acción «Reparar» (martilleo en bucle, 3 s) a constructor.glb.
Sobre copia: lee assets/models/personajes/constructor.glb, escribe constructor.glb y
constructor_glb.js. No toca malla ni materiales; solo añade accesores y una animación.
Uso: python3 -I tools/build/bm164_reparar.py [ruta_glb_entrada]"""
import json, struct, math, base64, sys, os
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
DIR = os.path.join(RAIZ, 'assets/models/personajes')
ent = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DIR, 'constructor.glb')
d = open(ent, 'rb').read()
lj = struct.unpack('<I', d[12:16])[0]
j = json.loads(d[20:20 + lj])
lb = struct.unpack('<I', d[20 + lj:24 + lj])[0]
bin_ = bytearray(d[28 + lj:28 + lj + lb])
if any(a['name'] == 'Reparar' for a in j['animations']):
    j['animations'] = [a for a in j['animations'] if a['name'] != 'Reparar']
nodo = {n['name']: i for i, n in enumerate(j['nodes'])}
def qmul(a, b):
    x1, y1, z1, w1 = a; x2, y2, z2, w2 = b
    return (w1*x2+x1*w2+y1*z2-z1*y2, w1*y2-x1*z2+y1*w2+z1*x2,
            w1*z2+x1*y2-y1*x2+z1*w2, w1*w2-x1*x2-y1*y2-z1*z2)
def rx(t): return (math.sin(t/2), 0, 0, math.cos(t/2))
def rz(t): return (0, 0, math.sin(t/2), math.cos(t/2))
D = math.radians
DUR, N = 3.0, 72                      # 24 fps, 3 s: 3 martillazos de 1 s
tiempos = [k * DUR / N for k in range(N + 1)]
def curva(nombre, f):
    base = tuple(j['nodes'][nodo[nombre]]['rotation'])
    return [qmul(base, f(t)) for t in tiempos]
def golpe(t):                          # 0 = arriba, 1 = impacto (seco), vuelta suave
    p = (t % 1.0)
    return (1 - math.cos(p / 0.35 * math.pi / 2)) if p < 0.35 else \
        (0.5 + 0.5 * math.cos((p - 0.35) / 0.65 * math.pi))
cur = {
    'HombroR': curva('HombroR', lambda t: rx(D(-115 + 55 * golpe(t)))),
    'HombroL': curva('HombroL', lambda t: rx(D(-55 + 6 * math.sin(2 * math.pi * t)))),
    'Cabeza': curva('Cabeza', lambda t: qmul(rx(D(8 + 5 * golpe(t))), rz(D(3)))),
}
cur['HombroR'][-1] = cur['HombroR'][0]; cur['HombroL'][-1] = cur['HombroL'][0]
cur['Cabeza'][-1] = cur['Cabeza'][0]
def add(datos, tipo, n):
    while len(bin_) % 4: bin_.append(0)
    off = len(bin_)
    for v in datos: bin_.extend(struct.pack('<%df' % n, *(v if n > 1 else (v,))))
    j['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': len(datos) * 4 * n})
    a = {'bufferView': len(j['bufferViews']) - 1, 'componentType': 5126, 'count': len(datos), 'type': tipo}
    if tipo == 'SCALAR': a['min'] = [min(datos)]; a['max'] = [max(datos)]
    j['accessors'].append(a); return len(j['accessors']) - 1
ent_t = add(tiempos, 'SCALAR', 1)
samplers, chans = [], []
for nom, q in cur.items():
    s = add(q, 'VEC4', 4)
    samplers.append({'input': ent_t, 'output': s, 'interpolation': 'LINEAR'})
    chans.append({'sampler': len(samplers) - 1, 'target': {'node': nodo[nom], 'path': 'rotation'}})
j['animations'].append({'name': 'Reparar', 'samplers': samplers, 'channels': chans})
j['buffers'][0]['byteLength'] = len(bin_)
js = json.dumps(j, separators=(',', ':')).encode()
js += b' ' * (-len(js) % 4)
while len(bin_) % 4: bin_.append(0)
tot = 12 + 8 + len(js) + 8 + len(bin_)
out = struct.pack('<4sII', b'glTF', 2, tot) + struct.pack('<I4s', len(js), b'JSON') + js + \
    struct.pack('<I4s', len(bin_), b'BIN\0') + bytes(bin_)
open(os.path.join(DIR, 'constructor.glb'), 'wb').write(out)
open(os.path.join(DIR, 'constructor_glb.js'), 'w').write(
    '(window.AV_PERSONAJES_B64=window.AV_PERSONAJES_B64||{})["constructor"]="'
    + base64.b64encode(out).decode() + '";\n')
print('ok', len(out))
