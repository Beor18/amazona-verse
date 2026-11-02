#!/usr/bin/env python3
import base64
import json
import math
import re
import struct
import subprocess
import tempfile
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / 'assets/models/edificios'
TARGETS = [
    'templo_grande', 'templo_grande_a', 'templo_grande_d', 'templo_grande_e', 'templo_grande_f',
    'templo_mediano', 'templo_mediano_f', 'templo_mediano_g', 'templo_mediano_h',
    'muro_templo', 'ruina_torre', 'ruina_torre_b', 'ruina_torre_c', 'ruina_torre_e', 'ruina_torre_f',
    'ruina_altar', 'ruina_mirador', 'ruina_pilar', 'ruina_portal',
]


def read_glb(path):
    data = path.read_bytes()
    json_len = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + json_len])
    offset = 20 + json_len
    bin_len = struct.unpack_from('<I', data, offset)[0]
    binary = data[offset + 8:offset + 8 + bin_len]

    def accessor(index):
        acc = doc['accessors'][index]
        view = doc['bufferViews'][acc['bufferView']]
        dtype = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}[acc['componentType']]
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[acc['type']]
        start = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
        return np.frombuffer(binary, dtype, acc['count'] * width, start).reshape(-1, width)

    return doc, accessor


def node_matrix(node):
    if 'matrix' in node:
        return np.array(node['matrix'], dtype=float).reshape(4, 4).T
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    rotation = np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])
    matrix = np.eye(4)
    matrix[:3, :3] = rotation * np.array(node.get('scale', [1, 1, 1]))
    matrix[:3, 3] = node.get('translation', [0, 0, 0])
    return matrix


def triangles(path):
    doc, accessor = read_glb(path)
    worlds = {}

    def walk(index, parent):
        matrix = parent @ node_matrix(doc['nodes'][index])
        worlds[index] = matrix
        for child in doc['nodes'][index].get('children', []):
            walk(child, matrix)

    for root in doc['scenes'][doc.get('scene', 0)]['nodes']:
        walk(root, np.eye(4))
    output = []
    for index, node in enumerate(doc['nodes']):
        if 'mesh' not in node:
            continue
        transform = worlds[index]
        for primitive in doc['meshes'][node['mesh']]['primitives']:
            positions = accessor(primitive['attributes']['POSITION']).astype(float)
            positions = (np.c_[positions, np.ones(len(positions))] @ transform.T)[:, :3]
            indices = accessor(primitive['indices']).reshape(-1, 3).astype(int)
            output.append(positions[indices])
    return np.concatenate(output)


def component_fraction(tris):
    positions = tris.reshape(-1, 3)
    quantized = np.round(positions / 0.003).astype(np.int64)
    _, ids = np.unique(quantized, axis=0, return_inverse=True)
    parent = np.arange(ids.max() + 1)

    def root(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    for face in ids.reshape(-1, 3):
        a, b, c = [root(int(index)) for index in face]
        parent[b] = a
        parent[c] = a
    roots = np.array([root(int(index)) for index in ids])
    face_roots = roots[::3]
    labels, inverse = np.unique(face_roots, return_inverse=True)
    boxes = []
    for index in range(len(labels)):
        points = tris[inverse == index].reshape(-1, 3)
        boxes.append((points.min(0), points.max(0)))
    groups = np.arange(len(labels))

    def group(index):
        while groups[index] != index:
            groups[index] = groups[groups[index]]
            index = groups[index]
        return index

    for i, (lo_a, hi_a) in enumerate(boxes):
        for j in range(i + 1, len(boxes)):
            lo_b, hi_b = boxes[j]
            if np.all(hi_a + 0.025 >= lo_b) and np.all(hi_b + 0.025 >= lo_a):
                a, b = group(i), group(j)
                if a != b:
                    groups[b] = a
    final = np.array([group(index) for index in inverse])
    _, counts = np.unique(final, return_counts=True)
    return counts.max() / len(tris)


def terrain_height():
    text = (ROOT / 'assets/data/mapa_cap1_altura.js').read_text()
    match = re.search(r'nx: (\d+), nz: (\d+), x0: ([-\d.]+), z0: ([-\d.]+), paso: ([\d.]+), min: ([-\d.]+), max: ([-\d.]+)', text)
    nx, nz, x0, z0, step, low, high = match.groups()
    nx, nz, x0, z0, step, low, high = int(nx), int(nz), float(x0), float(z0), float(step), float(low), float(high)
    encoded = re.search(r'datos: "([A-Za-z0-9+/=]+)"', text).group(1)
    heights = np.frombuffer(base64.b64decode(encoded), dtype='<u2').reshape(nz, nx).astype(float)
    heights = low + heights / 65535 * (high - low)

    def height(x, z):
        fx, fz = (x - x0) / step, (z - z0) / step
        ix, iz = int(np.clip(fx, 0, nx - 2)), int(np.clip(fz, 0, nz - 2))
        tx, tz = fx - ix, fz - iz
        return float(heights[iz, ix] * (1 - tx) * (1 - tz) + heights[iz, ix + 1] * tx * (1 - tz)
                     + heights[iz + 1, ix] * (1 - tx) * tz + heights[iz + 1, ix + 1] * tx * tz)

    return height


def upward_surfaces(instances):
    surfaces = []
    for instance in instances:
        if not instance.get('modelo') or instance.get('oculto') or instance.get('espera'):
            continue
        path = MODELS / (instance['modelo'] + '.glb')
        if not path.exists():
            continue
        matrix = np.array(instance['matriz']).reshape(4, 4).T
        tris = triangles(path)
        tris = (np.c_[tris.reshape(-1, 3), np.ones(tris.size // 3)] @ matrix.T)[:, :3].reshape(-1, 3, 3)
        normals = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
        lengths = np.linalg.norm(normals, axis=1)
        valid = lengths > 1e-8
        tris, normals, lengths = tris[valid], normals[valid], lengths[valid]
        upward = normals[:, 1] / lengths > 0.65
        tris = tris[upward]
        if len(tris):
            surfaces.append((instance['id'], tris))
    return surfaces


def support_error(instance, surfaces, ground):
    x, z, base = instance['huella']['x'], instance['huella']['z'], instance['huella']['y0']
    heights = [ground(x, z)]
    for other, tris in surfaces:
        if other == instance['id']:
            continue
        if x < tris[:, :, 0].min() or x > tris[:, :, 0].max() or z < tris[:, :, 2].min() or z > tris[:, :, 2].max():
            continue
        a, b, c = tris[:, 0], tris[:, 1], tris[:, 2]
        v0, v1 = b - a, c - a
        px, pz = x - a[:, 0], z - a[:, 2]
        d00 = np.sum(v0 * v0, axis=1)
        d01 = np.sum(v0 * v1, axis=1)
        d11 = np.sum(v1 * v1, axis=1)
        d20 = px * v0[:, 0] + pz * v0[:, 2]
        d21 = px * v1[:, 0] + pz * v1[:, 2]
        denominator = d00 * d11 - d01 * d01
        valid = np.abs(denominator) > 1e-10
        u = np.zeros(len(tris))
        v = np.zeros(len(tris))
        u[valid] = (d11[valid] * d20[valid] - d01[valid] * d21[valid]) / denominator[valid]
        v[valid] = (d00[valid] * d21[valid] - d01[valid] * d20[valid]) / denominator[valid]
        inside = valid & (u >= -1e-6) & (v >= -1e-6) & (u + v <= 1 + 1e-6)
        if inside.any():
            y = a[:, 1] + u * v0[:, 1] + v * v1[:, 1]
            heights.extend(y[inside].tolist())
    nearest = min(heights, key=lambda height: abs(height - base))
    return abs(nearest - base)


class RestoredBuildingsTest(unittest.TestCase):
    def test_structures_keep_original_connectivity(self):
        failures = []
        for name in TARGETS:
            raw = subprocess.check_output(['git', 'show', 'dbdfecf:assets/models/edificios/%s.glb' % name], cwd=ROOT)
            with tempfile.NamedTemporaryFile(suffix='.glb') as reference_file:
                reference_file.write(raw)
                reference_file.flush()
                reference = component_fraction(triangles(Path(reference_file.name)))
            current = component_fraction(triangles(MODELS / (name + '.glb')))
            if current + 0.01 < reference:
                failures.append('%s: pieza principal %.1f%% < %.1f%% original' % (name, current * 100, reference * 100))
        self.assertFalse(failures, 'Edificios desarmados: ' + '; '.join(failures))

    def test_lod_triangle_budgets(self):
        source_budget = {
            'templo_grande': 184792, 'templo_grande_a': 89477, 'templo_grande_d': 212822,
            'templo_grande_e': 128423, 'templo_grande_f': 144286, 'templo_mediano_h': 462218,
        }
        failures = []
        for name in TARGETS:
            near = len(triangles(MODELS / (name + '.glb')))
            high = len(triangles(MODELS / (name + '_hd.glb')))
            far = len(triangles(MODELS / (name + '_lejos.glb')))
            if near > 5000 or high > source_budget.get(name, 85000) or far > 10000:
                failures.append('%s: ligero %d, HD %d, lejos %d' % (name, near, high, far))
        self.assertFalse(failures, 'Presupuesto superado: ' + '; '.join(failures))

    def test_tower_keeps_validated_placement(self):
        doc = json.loads((ROOT / 'assets/data/escena_kelvin_cap1.json').read_text())
        tower = next(instance for zone in doc['zonas'] for instance in zone['instancias'] if instance['id'] == 'k127')
        self.assertEqual(tower['modelo'], 'ruina_torre')
        self.assertAlmostEqual(tower['matriz'][13], 98.05356, places=5)


if __name__ == '__main__':
    unittest.main()
