#!/usr/bin/env python3
"""Reexporta los 18 HD Ancient desde TransferNow, sin decimar ni tocar los otros LOD."""
import json
import sys
import tempfile
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/blender'))

from integrar_originales import GLB, OUT, SCENE, fit_to_reference, matrix, reference_model, subset, write_glb

SOURCE = Path(__file__).resolve().parents[2] / 'tools/build/salida/integracion-edificios/edificios.glb'
TARGETS = [
    'templo_grande', 'templo_grande_a', 'templo_grande_d', 'templo_grande_e', 'templo_grande_f',
    'templo_mediano', 'templo_mediano_f', 'templo_mediano_g', 'templo_mediano_h',
    'muro_templo', 'ruina_torre', 'ruina_torre_b', 'ruina_torre_c', 'ruina_torre_e', 'ruina_torre_f',
    'ruina_altar', 'ruina_mirador', 'ruina_pilar', 'ruina_portal',
]


def main():
    glb = GLB(SOURCE)
    conversion = json.loads((OUT / 'conversion.json').read_text())['assets']
    scene = json.loads(SCENE.read_text())
    by_node = {instance['nodo']: instance for zone in scene['zonas'] for instance in zone['instancias']}
    roots = {}
    for index in glb.doc['scenes'][0]['nodes']:
        node = glb.doc['nodes'][index]
        instance = by_node.get(node.get('name'))
        if not instance or instance['asset'] not in conversion:
            continue
        name = conversion[instance['asset']].get('web')
        if name in TARGETS and name not in roots:
            roots[name] = (index, instance)
    missing = set(TARGETS) - set(roots)
    if missing:
        raise RuntimeError('Modelos ausentes en TransferNow: ' + ', '.join(sorted(missing)))

    counts = {}
    with tempfile.TemporaryDirectory(prefix='kimi-fieles-') as temporary:
        image_folder = Path(temporary) / 'tex_original'
        for name in TARGETS:
            root, instance = roots[name]
            transform = np.array(conversion[instance['asset']]['M'], float).reshape(4, 4).T @ np.linalg.inv(matrix(glb.doc['nodes'][root]))
            doc, binary = subset(glb, root, transform, image_folder, 'AV_EDIFICIOS_B64')
            pivot = fit_to_reference(doc, binary, reference_model(name))
            doc, binary = subset(glb, root, transform, image_folder, 'AV_EDIFICIOS_B64', pivot=pivot)
            path = OUT / (name + '_hd.glb')
            write_glb(path, doc, binary, 'AV_EDIFICIOS_B64')
            counts[name] = sum(doc['accessors'][primitive['indices']]['count'] // 3
                               for mesh in doc['meshes'] for primitive in mesh['primitives'])
            print(name, counts[name], 'tris', flush=True)

    kit_path = OUT / 'kit.js'
    text = kit_path.read_text()
    start = text.index('window.AV_EDIFICIOS_KIT = ') + len('window.AV_EDIFICIOS_KIT = ')
    kit = json.loads(text[start:text.rindex(';')])
    for name, tris in counts.items():
        kb = round((OUT / (name + '_hd_glb.js')).stat().st_size / 1024, 1)
        kit[name].update(hd=True, original=tris <= 20000, trisHD=tris, kbHD=kb)
    kit_path.write_text(text[:start] + json.dumps(kit, ensure_ascii=False, separators=(',', ':')) + text[text.rindex(';'):])


if __name__ == '__main__':
    main()
