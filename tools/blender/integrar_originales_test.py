#!/usr/bin/env python3
import base64
import json
import re
import struct
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/blender'))
from integrar_originales import GLB, matrix
MODELS = ROOT / 'assets/models/edificios'
MAP = ROOT / 'assets/models/mapa'


def glb_json(path):
    data = path.read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    return json.loads(data[20:20 + length])


def triangles(doc):
    return sum(doc['accessors'][primitive['indices']]['count'] // 3
               for mesh in doc['meshes'] for primitive in mesh['primitives'])


class OriginalAssetsTest(unittest.TestCase):
    def test_73_original_buildings_cover_current_kit(self):
        conversion = json.loads((MODELS / 'conversion.json').read_text())
        kit = json.loads((MODELS / 'kit.js').read_text().split('window.AV_EDIFICIOS_KIT = ', 1)[1].rsplit(';', 1)[0])
        expected = sorted({entry['web'] for entry in conversion['assets'].values() if entry.get('web') and kit[entry['web']].get('original')})
        self.assertGreater(len(expected), 10)
        total = 0
        for name in expected:
            path = MODELS / (name + '_hd.glb')
            self.assertTrue(path.exists(), name)
            doc = glb_json(path)
            total += triangles(doc)
            self.assertLessEqual(triangles(doc), 20000, name)
            self.assertTrue(doc.get('images'), name)
            for image in doc['images']:
                self.assertIn('uri', image, name)
                self.assertTrue((MODELS / image['uri']).exists(), image['uri'])

    def test_preserved_hd_stays_enabled_and_described(self):
        kit = json.loads((MODELS / 'kit.js').read_text().split('window.AV_EDIFICIOS_KIT = ', 1)[1].rsplit(';', 1)[0])
        checked = 0
        for name, entry in kit.items():
            path = MODELS / (name + '_hd.glb')
            if entry.get('original') or not path.exists():
                continue
            checked += 1
            self.assertTrue(entry.get('hd'), name + ' tiene HD pero está desactivado')
            self.assertEqual(entry.get('trisHD'), triangles(glb_json(path)), name)
            expected_kb = round(path.with_name(name + '_hd_glb.js').stat().st_size / 1024, 1)
            self.assertAlmostEqual(entry.get('kbHD'), expected_kb, delta=0.1, msg=name)
        self.assertGreater(checked, 10)

    def test_original_buildings_keep_validated_bounds(self):
        kit = json.loads((MODELS / 'kit.js').read_text().split('window.AV_EDIFICIOS_KIT = ', 1)[1].rsplit(';', 1)[0])

        def bounds(glb):
            points = []

            def walk(index, parent):
                node = glb.doc['nodes'][index]
                transform = parent @ matrix(node)
                if 'mesh' in node:
                    for primitive in glb.doc['meshes'][node['mesh']]['primitives']:
                        vertices = glb.accessor(primitive['attributes']['POSITION'])
                        points.append((np.c_[vertices, np.ones(len(vertices))] @ transform.T)[:, :3])
                for child in node.get('children', []):
                    walk(child, transform)

            for root in glb.doc['scenes'][glb.doc.get('scene', 0)]['nodes']:
                walk(root, np.eye(4))
            points = np.concatenate(points)
            return points.min(axis=0), points.max(axis=0)

        for name, entry in kit.items():
            if not entry.get('original'):
                continue
            with tempfile.NamedTemporaryFile(suffix='.glb') as reference_file:
                reference = subprocess.run(['git', 'show', 'HEAD:assets/models/edificios/%s_hd.glb' % name], cwd=ROOT, capture_output=True)
                if reference.returncode:
                    reference = subprocess.run(['git', 'show', 'HEAD:assets/models/edificios/%s.glb' % name], cwd=ROOT, capture_output=True, check=True)
                reference_file.write(reference.stdout)
                reference_file.flush()
                expected = bounds(GLB(Path(reference_file.name)))
            actual = bounds(GLB(MODELS / (name + '_hd.glb')))
            for axis in range(3):
                self.assertAlmostEqual(actual[0][axis], expected[0][axis], delta=0.02, msg='%s, mínimo eje %d' % (name, axis))
                self.assertAlmostEqual(actual[1][axis], expected[1][axis], delta=0.02, msg='%s, máximo eje %d' % (name, axis))

    def test_heightmap_preserves_story_elevation(self):
        def sample(text, x, z):
            match = re.search(r'nx: (\d+), nz: (\d+), x0: ([-\d.]+), z0: ([-\d.]+), paso: ([\d.]+), min: ([-\d.]+), max: ([-\d.]+)', text)
            nx, nz, x0, z0, step, low, high = match.groups()
            nx, nz, x0, z0, step, low, high = int(nx), int(nz), float(x0), float(z0), float(step), float(low), float(high)
            payload = re.search(r'datos: "([A-Za-z0-9+/=]+)"', text).group(1)
            heights = np.frombuffer(base64.b64decode(payload), dtype='<u2').reshape(nz, nx).astype(float)
            heights = low + heights / 65535 * (high - low)
            fx = max(0, min(nx - 1.001, (x - x0) / step))
            fz = max(0, min(nz - 1.001, (z - z0) / step))
            ix, iz, tx, tz = int(fx), int(fz), fx % 1, fz % 1
            return float((heights[iz, ix] * (1 - tx) + heights[iz, ix + 1] * tx) * (1 - tz)
                         + (heights[iz + 1, ix] * (1 - tx) + heights[iz + 1, ix + 1] * tx) * tz)

        reference = subprocess.check_output(['git', 'show', '3019fcf:assets/data/mapa_cap1_altura.js'], cwd=ROOT, text=True)
        current = (ROOT / 'assets/data/mapa_cap1_altura.js').read_text()
        for x, z in [(157, 100), (90, 124), (-17, -116), (120, 162)]:
            self.assertAlmostEqual(sample(current, x, z), sample(reference, x, z), delta=0.03, msg='altura en %s,%s' % (x, z))

    def test_original_terrain_and_heightmap(self):
        paths = [MAP / ('terreno_%s.glb' % name) for name in ('no', 'ne', 'so', 'se')]
        total = sum(triangles(glb_json(path)) for path in paths)
        self.assertEqual(total, 80000)
        text = (ROOT / 'assets/data/mapa_cap1_altura.js').read_text()
        match = re.search(r'datos: "([A-Za-z0-9+/=]+)"', text)
        self.assertIsNotNone(match)
        values = base64.b64decode(match.group(1))
        self.assertGreater(len(values), 1000)
        self.assertNotEqual(len(set(values)), 1)


if __name__ == '__main__':
    unittest.main()
