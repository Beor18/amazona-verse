#!/usr/bin/env python3
"""Restaura los 18 ligeros originales anteriores a la plantilla paramétrica y conserva los HD actuales."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/blender'))

from integrar_originales import GLB, OUT, write_glb
from edificios_fieles import TARGETS
from edificios_qa71 import main as align_qa71

REFERENCE = 'dbdfecf'


def main():
    counts = {}
    for name in TARGETS:
        path = OUT / (name + '.glb')
        path.write_bytes(subprocess.check_output(['git', 'show', '%s:assets/models/edificios/%s.glb' % (REFERENCE, name)], cwd=ROOT))
        glb = GLB(path)
        write_glb(path, glb.doc, glb.binary, 'AV_EDIFICIOS_B64')
        counts[name] = {
            'tris': sum(glb.doc['accessors'][primitive['indices']]['count'] // 3
                        for mesh in glb.doc['meshes'] for primitive in mesh['primitives']),
            'kb': round((OUT / (name + '_glb.js')).stat().st_size / 1024, 1),
            'restaurado': True,
        }
        print(name, counts[name]['tris'], 'tris')

    kit_path = OUT / 'kit.js'
    text = kit_path.read_text()
    start = text.index('window.AV_EDIFICIOS_KIT = ') + len('window.AV_EDIFICIOS_KIT = ')
    kit = json.loads(text[start:text.rindex(';')])
    for name, metadata in counts.items():
        metadata['original'] = kit[name].get('trisHD', 20001) <= 20000
        kit[name].update(metadata)
    kit_path.write_text(text[:start] + json.dumps(kit, ensure_ascii=False, separators=(',', ':')) + text[text.rindex(';'):])
    align_qa71()


if __name__ == '__main__':
    main()
