# Pipeline de edificios de Kelvin: atlas de la versión cercana de alta fidelidad (HD). Ver docs/EDIFICIOS.md § Ciudad completa.
"""Atlas 4x4 de las texturas originales de KitBash3D (difusa y normales) para los modelos _hd: uno por kit.

python3.11 -I edificios_hd_atlas.py <ancient|savage> <assets/models/edificios/tex_hd> [celda=512] [margen=16]   → hd_<kit>.jpg, hd_<kit>_n.jpg
python3.11 -I edificios_hd_atlas.py paleta <assets/models/edificios/tex> [lado=512]   → kb3d_*.jpg y kb3d_*_n.jpg del kit ligero
(tex_hd y no tex/: la build pasa tex/ a WebP y no reescribe las uris de un glTF ya comprimido con meshopt)
El juego publica celda 1024 (atlas 4096), las 16 de Ancient y las 10 de Savage, desde las JPG 4K del Drive.
La fracción del margen es la misma que 512/16: la UV2 de los _hd no se rehace. El look no encoge tex_hd/.

Cada celda guarda la textura de repetición (celda - 2·margen px) con un margen que repite su propio borde (envolvente):
así el filtrado y los mipmaps cercanos no mezclan celdas vecinas. El shader (streaming.js, AV_HD) envuelve la UV original
con fract() dentro de la celda. El orden de KITS[kit]['orden'] es el que usa edificios_hd.py para la UV2 (celda por material).
Texturas: 04_Mapa_3D/AV3DMaxExportBuildings/Torrents/KitBash3D (licencia de Kelvin, solo lectura).
"""
import sys, os
import numpy as np
try:
    import OpenImageIO as oiio
except ImportError:
    oiio = None
try:
    from PIL import Image
except ImportError:
    Image = None

KB3D = os.path.expanduser('~/AmazonaVerse/04_Mapa_3D/AV3DMaxExportBuildings/Torrents/KitBash3D')
KITS = {
    'ancient': dict(dir=os.path.join(KB3D, 'Anncient Temples/KB3DTextures'), orden=[
        'stoneM', 'wallM', 'wallL', 'pillarsM',
        'floorM', 'floorDarkM', 'mudM', 'mudDarkM',
        'damageM', 'damageL', 'decoM', 'blocksL',
        'bricksM', 'beams', 'rockM', 'sculptM']),
    'savage': dict(dir=os.path.join(KB3D, 'Savage/Blender/KB3DTextures'), orden=[
        'WoodPlanks', 'WoodHewn', 'BarkNew', 'BarkCharred',
        'RoofThatched', 'TarpFabricDamaged', 'Rope', 'RockSharp',
        'RockSmooth', 'MudRocky']),
}
ORDEN = KITS['ancient']['orden']
N = 4


def textura(d, nom, tipo):
    """KB3D_<nom>_<Diffuse|basecolor|...>.jpg sin distinguir mayúsculas (Savage mezcla nombres)."""
    claves = ('diffuse', 'basecolor') if tipo == 'Diffuse' else ('normal',)
    for f in sorted(os.listdir(d)):
        b = f.lower()
        if b.startswith(('kb3d_' + nom + '_').lower()) and any(b.endswith('_' + c + '.jpg') for c in claves):
            return os.path.join(d, f)
    raise FileNotFoundError('%s %s en %s' % (nom, tipo, d))


def _resize(path, w, h):
    """Lanczos a w×h (estirado: Rope y WoodHewn no son cuadrados y la UV del kit ya asume la celda cuadrada)."""
    if oiio is not None:
        src = oiio.ImageBuf(path)
        if src.has_error:
            raise RuntimeError(src.geterror())
        roi = oiio.ROI(0, w, 0, h, 0, 1, 0, 3)
        dst = oiio.ImageBufAlgo.resize(src, 'lanczos3', roi=roi)
        return np.clip(dst.get_pixels(oiio.FLOAT)[:, :, :3], 0, 1)
    if Image is None:
        raise RuntimeError('hace falta OpenImageIO (python de Blender) o Pillow')
    im = Image.open(path).convert('RGB').resize((w, h), Image.Resampling.LANCZOS)
    return np.asarray(im, np.float32) / 255.0


def celda(path, cel, mar):
    inn = cel - 2 * mar
    a = _resize(path, inn, inn)
    i = (np.arange(cel) - mar) % inn
    return a[np.ix_(i, i)]


def _guardar(path, arr, q, normal):
    arr = np.clip(arr, 0, 1)
    if oiio is not None:
        h, w = arr.shape[:2]
        spec = oiio.ImageSpec(w, h, 3, oiio.UINT8)
        spec.attribute('Compression', 'jpeg:%d' % q)
        buf = oiio.ImageBuf(spec)
        buf.set_pixels(oiio.ROI(0, w, 0, h, 0, 1, 0, 3), arr)
        if not buf.write(path):
            raise RuntimeError(buf.geterror())
        return
    im = Image.fromarray((arr * 255.0 + 0.5).astype(np.uint8), 'RGB')
    # 4:4:4 en normales (el croma 4:2:0 falsea el relieve). La difusa va 4:2:2.
    # optimize=True revienta el codificador de Pillow en un atlas de 4096.
    im.save(path, 'JPEG', quality=q, subsampling=0 if normal else 1, optimize=False)


# Paleta del kit ligero: el mismo nombre de archivo que ya referencian los .glb (tex/kb3d_*.jpg).
PALETA = [
    ('savage', 'BarkNew', 'kb3d_barknew'),
    ('ancient', 'beams', 'kb3d_beams'),
    ('ancient', 'floorM', 'kb3d_floorm'),
    ('ancient', 'mudM', 'kb3d_mudm'),
    ('savage', 'MudRocky', 'kb3d_mudrocky'),
    ('ancient', 'pillarsM', 'kb3d_pillarsm'),
    ('savage', 'RockSharp', 'kb3d_rocksharp'),
    ('savage', 'RoofThatched', 'kb3d_roofthatched'),
    ('ancient', 'stoneM', 'kb3d_stonem'),
    ('savage', 'TarpFabricDamaged', 'kb3d_tarpfabricdamaged'),
    ('ancient', 'wallL', 'kb3d_walll'),
    ('savage', 'WoodHewn', 'kb3d_woodhewn'),
    ('savage', 'WoodPlanks', 'kb3d_woodplanks'),
]


def atlas(kit, out, cel, mar):
    K = KITS[kit]
    os.makedirs(out, exist_ok=True)
    for tipo, suf, q in (('Diffuse', '', 86), ('Normal', '_n', 90)):
        at = np.zeros((cel * N, cel * N, 3), np.float32)
        for k in range(N * N):  # las celdas que sobran repiten la primera (no las usa ningún material)
            nom = K['orden'][k] if k < len(K['orden']) else K['orden'][0]
            r, c = divmod(k, N)
            at[r * cel:(r + 1) * cel, c * cel:(c + 1) * cel] = celda(textura(K['dir'], nom, tipo), cel, mar)
        p = os.path.join(out, 'hd_%s%s.jpg' % (kit, suf))
        _guardar(p, at, q, tipo == 'Normal')
        print(p, round(os.path.getsize(p) / 1024), 'KB', at.shape[1])


def paleta(out, lado):
    os.makedirs(out, exist_ok=True)
    for kit, nom, stem in PALETA:
        d = KITS[kit]['dir']
        for tipo, suf, q in (('Diffuse', '', 86), ('Normal', '_n', 90)):
            a = _resize(textura(d, nom, tipo), lado, lado)
            p = os.path.join(out, stem + suf + '.jpg')
            _guardar(p, a, q, tipo == 'Normal')
            print(p, round(os.path.getsize(p) / 1024), 'KB')


def parche(carpeta):
    """Añade tex/<stem>_n.jpg al glTF ligero si esa normal está al lado. No toca _hd ni _lejos."""
    import json, struct, base64
    n = 0
    for nombre in sorted(os.listdir(carpeta)):
        if not nombre.endswith('.glb') or nombre.endswith('_hd.glb') or nombre.endswith('_lejos.glb'):
            continue
        path = os.path.join(carpeta, nombre)
        data = open(path, 'rb').read()
        if data[:4] != b'glTF':
            continue
        off, chunks = 12, []
        while off + 8 <= len(data):
            clen, ctype = struct.unpack_from('<II', data, off)
            chunks.append((ctype, data[off + 8:off + 8 + clen]))
            off += 8 + clen
        j = json.loads(chunks[0][1].decode('utf-8'))
        binc = chunks[1][1] if len(chunks) > 1 and chunks[1][0] == 0x004E4942 else None
        images, textures = j.setdefault('images', []), j.setdefault('textures', [])
        uri_tex = {}
        for ti, t in enumerate(textures):
            src = t.get('source')
            if isinstance(src, int) and src < len(images) and images[src].get('uri'):
                uri_tex[images[src]['uri']] = ti
        cambio = False
        for mat in j.get('materials') or []:
            pbr = (mat.get('pbrMetallicRoughness') or {})
            bt = pbr.get('baseColorTexture') or {}
            ti = bt.get('index')
            if not isinstance(ti, int) or ti >= len(textures):
                continue
            src = textures[ti].get('source')
            uri = images[src].get('uri', '') if isinstance(src, int) and src < len(images) else ''
            if not uri.startswith('tex/kb3d_') or uri.endswith('_n.jpg'):
                continue
            nuri = uri[:-4] + '_n.jpg'
            if not os.path.exists(os.path.join(carpeta, nuri)):
                continue
            if nuri not in uri_tex:
                images.append({'uri': nuri, 'name': os.path.splitext(os.path.basename(nuri))[0]})
                textures.append({'source': len(images) - 1, 'sampler': textures[ti].get('sampler', 0)})
                uri_tex[nuri] = len(textures) - 1
            if (mat.get('normalTexture') or {}).get('index') != uri_tex[nuri]:
                mat['normalTexture'] = {'index': uri_tex[nuri]}
                cambio = True
        if not cambio:
            continue
        jb = json.dumps(j, separators=(',', ':')).encode('utf-8')
        jb += b' ' * ((4 - len(jb) % 4) % 4)
        partes = [struct.pack('<III', 0x46546C67, 2, 0), struct.pack('<II', len(jb), 0x4E4F534A) + jb]
        if binc is not None:
            partes.append(struct.pack('<II', len(binc), 0x004E4942) + binc)
        blob = b''.join(partes)
        blob = struct.pack('<III', 0x46546C67, 2, len(blob)) + blob[12:]
        open(path, 'wb').write(blob)
        clave = nombre[:-4]
        js = '(window.AV_EDIFICIOS_B64=window.AV_EDIFICIOS_B64||{})["%s"]="%s";\n' % (clave, base64.b64encode(blob).decode('ascii'))
        open(path[:-4] + '_glb.js', 'w').write(js)
        n += 1
    print('parche', n, 'modelos')


def main():
    cmd = sys.argv[1]
    if cmd == 'paleta':
        paleta(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 512)
        return
    if cmd == 'parche':
        parche(sys.argv[2])
        return
    if cmd not in KITS:
        raise SystemExit('uso: edificios_hd_atlas.py <ancient|savage|paleta> <salida> [celda|lado] [margen]')
    cel = int(sys.argv[3]) if len(sys.argv) > 3 else 512
    mar = int(sys.argv[4]) if len(sys.argv) > 4 else 16
    atlas(cmd, sys.argv[2], cel, mar)


if __name__ == '__main__':
    main()
