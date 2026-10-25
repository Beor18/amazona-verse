# Pipeline de edificios de Kelvin: atlas de la versión cercana de alta fidelidad (HD). Ver docs/EDIFICIOS.md § Ciudad completa.
"""Atlas 4x4 de las texturas originales de KitBash3D (difusa y normales) para los modelos _hd: uno por kit.

python3.11 -I edificios_hd_atlas.py <ancient|savage> <assets/models/edificios/tex_hd> [celda=512] [margen=16]   → hd_<kit>.jpg, hd_<kit>_n.jpg
(tex_hd y no tex/: la build pasa tex/ a WebP y no reescribe las uris de un glTF ya comprimido con meshopt)

Cada celda guarda la textura de repetición (celda - 2·margen px) con un margen que repite su propio borde (envolvente):
así el filtrado y los mipmaps cercanos no mezclan celdas vecinas. El shader (streaming.js, AV_HD) envuelve la UV original
con fract() dentro de la celda. El orden de KITS[kit]['orden'] es el que usa edificios_hd.py para la UV2 (celda por material).
Texturas: 04_Mapa_3D/AV3DMaxExportBuildings/Torrents/KitBash3D (licencia de Kelvin, solo lectura).
"""
import sys, os
import numpy as np
import OpenImageIO as oiio

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


def celda(path, cel, mar):
    src = oiio.ImageBuf(path)
    if src.has_error:
        raise RuntimeError(src.geterror())
    inn = cel - 2 * mar
    roi = oiio.ROI(0, inn, 0, inn, 0, 1, 0, 3)
    dst = oiio.ImageBufAlgo.resize(src, 'lanczos3', roi=roi)
    a = dst.get_pixels(oiio.FLOAT)[:, :, :3]
    i = (np.arange(cel) - mar) % inn
    return a[i][:, i]


def main():
    kit, out = sys.argv[1], sys.argv[2]
    K = KITS[kit]
    cel = int(sys.argv[3]) if len(sys.argv) > 3 else 512
    mar = int(sys.argv[4]) if len(sys.argv) > 4 else 16
    os.makedirs(out, exist_ok=True)
    for tipo, suf, q in (('Diffuse', '', 88), ('Normal', '_n', 90)):
        at = np.zeros((cel * N, cel * N, 3), np.float32)
        for k in range(N * N):  # las celdas que sobran repiten la primera (no las usa ningún material)
            nom = K['orden'][k] if k < len(K['orden']) else K['orden'][0]
            r, c = divmod(k, N)
            at[r * cel:(r + 1) * cel, c * cel:(c + 1) * cel] = celda(textura(K['dir'], nom, tipo), cel, mar)
        spec = oiio.ImageSpec(cel * N, cel * N, 3, oiio.UINT8)
        spec.attribute('Compression', 'jpeg:%d' % q)
        buf = oiio.ImageBuf(spec)
        buf.set_pixels(oiio.ROI(0, cel * N, 0, cel * N, 0, 1, 0, 3), np.clip(at, 0, 1))
        p = os.path.join(out, 'hd_%s%s.jpg' % (kit, suf))
        if not buf.write(p):
            raise RuntimeError(buf.geterror())
        print(p, round(os.path.getsize(p) / 1024), 'KB')


if __name__ == '__main__':
    main()
