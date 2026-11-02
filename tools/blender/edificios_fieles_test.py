#!/usr/bin/env python3
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/blender'))
from integrar_originales import GLB, geometry_bounds

SOURCE = ROOT / 'tools/build/salida/integracion-edificios/edificios.glb'
MODELS = ROOT / 'assets/models/edificios'
TARGETS = [
    'templo_grande', 'templo_grande_a', 'templo_grande_d', 'templo_grande_e', 'templo_grande_f',
    'templo_mediano', 'templo_mediano_f', 'templo_mediano_g', 'templo_mediano_h',
    'muro_templo', 'ruina_torre', 'ruina_torre_b', 'ruina_torre_c', 'ruina_torre_e', 'ruina_torre_f',
    'ruina_altar', 'ruina_mirador', 'ruina_pilar', 'ruina_portal',
]
QA71 = ['templo_grande', 'templo_grande_f', 'ruina_mirador']


def triangles(doc, mesh_index):
    return sum(doc['accessors'][primitive['indices']]['count'] // 3
               for primitive in doc['meshes'][mesh_index]['primitives'])


def node_triangles(doc, index):
    node = doc['nodes'][index]
    own = triangles(doc, node['mesh']) if 'mesh' in node else 0
    return own + sum(node_triangles(doc, child) for child in node.get('children', []))


class FaithfulBuildingsTest(unittest.TestCase):
    def test_hd_matches_transfernow_geometry(self):
        source = GLB(SOURCE)
        conversion = json.loads((MODELS / 'conversion.json').read_text())['assets']
        scene = json.loads((ROOT / 'assets/data/escena_kelvin_cap1.json').read_text())
        instances = {instance['nodo']: instance for zone in scene['zonas'] for instance in zone['instancias']}
        expected = {}
        for index in source.doc['scenes'][0]['nodes']:
            node = source.doc['nodes'][index]
            instance = instances.get(node.get('name'))
            if not instance or instance['asset'] not in conversion:
                continue
            name = conversion[instance['asset']].get('web')
            if name in TARGETS and name not in expected:
                expected[name] = node_triangles(source.doc, index)

        self.assertEqual(set(expected), set(TARGETS))
        for name in TARGETS:
            current = GLB(MODELS / (name + '_hd.glb'))
            actual = sum(triangles(current.doc, mesh) for mesh in range(len(current.doc['meshes'])))
            self.assertEqual(actual, expected[name], name + ' sigue decimado respecto a TransferNow')

    def test_qa71_light_and_hd_share_bounds(self):
        for name in QA71:
            light = GLB(MODELS / (name + '.glb'))
            hd = GLB(MODELS / (name + '_hd.glb'))
            light_bounds = geometry_bounds(light.doc, light.binary)
            hd_bounds = geometry_bounds(hd.doc, hd.binary)
            difference = max(abs(a - b) for pair in zip(light_bounds, hd_bounds) for a, b in zip(*pair))
            self.assertLessEqual(difference, 0.3, '%s difiere %.4f m entre ligero y HD' % (name, difference))


if __name__ == '__main__':
    unittest.main()
