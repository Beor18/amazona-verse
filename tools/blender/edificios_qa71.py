#!/usr/bin/env python3
"""Alinea las cajas de los ligeros QA-71 con sus HD sin cambiar materiales ni geometría local."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/blender'))

from integrar_originales import GLB, OUT, fit_to_reference, geometry_bounds, matrix, write_glb

TARGETS = ['templo_grande', 'templo_grande_f', 'ruina_mirador']


def difference(light, hd):
    light_bounds = geometry_bounds(light.doc, light.binary)
    hd_bounds = geometry_bounds(hd.doc, hd.binary)
    return max(abs(a - b) for pair in zip(light_bounds, hd_bounds) for a, b in zip(*pair))


def main():
    changed = {}
    for name in TARGETS:
        light = GLB(OUT / (name + '.glb'))
        hd = GLB(OUT / (name + '_hd.glb'))
        before = difference(light, hd)
        if before <= 0.3:
            print(name, '%.4f m · sin cambios' % before)
            continue
        pivot = fit_to_reference(light.doc, light.binary, hd)
        root = light.doc['scenes'][light.doc.get('scene', 0)]['nodes'][0]
        node = light.doc['nodes'][root]
        transform = pivot @ matrix(node)
        node.pop('translation', None)
        node.pop('rotation', None)
        node.pop('scale', None)
        node['matrix'] = [float(value) for value in transform.T.ravel()]
        path = OUT / (name + '.glb')
        write_glb(path, light.doc, light.binary, 'AV_EDIFICIOS_B64')
        after = difference(GLB(path), hd)
        if after > 0.3:
            raise RuntimeError('%s conserva un desfase de %.4f m' % (name, after))
        changed[name] = round((OUT / (name + '_glb.js')).stat().st_size / 1024, 1)
        print(name, '%.4f → %.4f m' % (before, after))

    if changed:
        kit_path = OUT / 'kit.js'
        text = kit_path.read_text()
        start = text.index('window.AV_EDIFICIOS_KIT = ') + len('window.AV_EDIFICIOS_KIT = ')
        kit = json.loads(text[start:text.rindex(';')])
        for name, kb in changed.items():
            kit[name]['kb'] = kb
        kit_path.write_text(text[:start] + json.dumps(kit, ensure_ascii=False, separators=(',', ':')) + text[text.rindex(';'):])


if __name__ == '__main__':
    main()
