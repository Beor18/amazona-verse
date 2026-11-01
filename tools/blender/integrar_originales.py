#!/usr/bin/env python3
"""Integra los GLB originales de edificios, terreno y flora sin Blender ni dependencias nuevas."""
import base64
import io
import json
import math
import re
import struct
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'tools/build/salida/integracion-edificios'
BUILDINGS = WORK / 'edificios.glb'
MAP = WORK / 'mapa.glb'
OUT = ROOT / 'assets/models/edificios'
MAP_OUT = ROOT / 'assets/models/mapa'
FLORA_OUT = ROOT / 'assets/models/entorno'
SCENE = ROOT / 'assets/data/escena_kelvin_cap1.json'
HEIGHT = ROOT / 'assets/data/mapa_cap1_altura.js'
MAP_JS = ROOT / 'assets/data/mapa_cap1.js'
SCALE = 0.255
TERRAIN_REF = '3019fcf'
MODEL_REF = '48ab25e'
STORY_HEIGHT = None


def story_elevations(points):
    global STORY_HEIGHT
    if STORY_HEIGHT is None:
        text = subprocess.check_output(['git', 'show', TERRAIN_REF + ':assets/data/mapa_cap1_altura.js'], cwd=ROOT, text=True)
        match = re.search(r'nx: (\d+), nz: (\d+), x0: ([-\d.]+), z0: ([-\d.]+), paso: ([\d.]+), min: ([-\d.]+), max: ([-\d.]+)', text)
        nx, nz, x0, z0, step, low, high = match.groups()
        nx, nz, x0, z0, step, low, high = int(nx), int(nz), float(x0), float(z0), float(step), float(low), float(high)
        payload = re.search(r'datos: "([A-Za-z0-9+/=]+)"', text).group(1)
        heights = np.frombuffer(base64.b64decode(payload), dtype='<u2').reshape(nz, nx).astype(float)
        STORY_HEIGHT = nx, nz, x0, z0, step, low, high, heights
    nx, nz, x0, z0, step, low, high, heights = STORY_HEIGHT
    fx = np.clip((points[:, 0] - x0) / step, 0, nx - 1.001)
    fz = np.clip((points[:, 2] - z0) / step, 0, nz - 1.001)
    ix, iz = fx.astype(int), fz.astype(int)
    tx, tz = fx - ix, fz - iz
    top = heights[iz, ix] * (1 - tx) + heights[iz, ix + 1] * tx
    bottom = heights[iz + 1, ix] * (1 - tx) + heights[iz + 1, ix + 1] * tx
    return low + (top * (1 - tz) + bottom * tz) / 65535 * (high - low)


def compatible_terrain(points):
    result = points.copy()
    result[:, 1] = story_elevations(result)
    return result


class GLB:
    def __init__(self, path):
        self.path = path
        data = path.read_bytes()
        length = struct.unpack_from('<I', data, 12)[0]
        self.doc = json.loads(data[20:20 + length])
        offset = 20 + length
        size = struct.unpack_from('<I', data, offset)[0]
        self.binary = data[offset + 8:offset + 8 + size]

    def accessor(self, index):
        return read_accessor(self.doc, self.binary, index)


def read_accessor(doc, binary, index):
    acc = doc['accessors'][index]
    view = doc['bufferViews'][acc['bufferView']]
    dtype = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}[acc['componentType']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[acc['type']]
    start = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
    stride = view.get('byteStride', 0)
    if stride and stride != np.dtype(dtype).itemsize * width:
        raw = np.frombuffer(binary, np.uint8, stride * acc['count'], start).reshape(acc['count'], stride)
        return raw[:, :np.dtype(dtype).itemsize * width].copy().view(dtype).reshape(acc['count'], width)
    return np.frombuffer(binary, dtype, acc['count'] * width, start).reshape(acc['count'], width)


def matrix(node):
    if 'matrix' in node:
        return np.array(node['matrix'], float).reshape(4, 4).T
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    rotation = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                         [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                         [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    result = np.eye(4)
    result[:3, :3] = rotation * np.array(node.get('scale', [1, 1, 1]))
    result[:3, 3] = node.get('translation', [0, 0, 0])
    return result


def write_glb(path, doc, binary, global_name=None):
    encoded = json.dumps(doc, separators=(',', ':')).encode()
    encoded += b' ' * ((-len(encoded)) % 4)
    while len(binary) % 4:
        binary.append(0)
    total = 12 + 8 + len(encoded) + 8 + len(binary)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
                     + struct.pack('<II', len(binary), 0x004E4942) + binary)
    if global_name:
        script = path.with_name(path.stem + '_glb.js')
        script.write_text('(window.%s=window.%s||{})["%s"]="%s";\n' % (global_name, global_name, path.stem, base64.b64encode(path.read_bytes()).decode()))


def image_name(image, index):
    name = image.get('name') or 'imagen_%d' % index
    name = re.sub(r'[^A-Za-z0-9_.-]+', '_', name).strip('_')
    return name


IMAGE_CACHE = {}


def export_images(glb, folder, max_size=1024):
    key = str(folder)
    if key in IMAGE_CACHE:
        return IMAGE_CACHE[key]
    folder.mkdir(parents=True, exist_ok=True)
    output = {}
    for index, image in enumerate(glb.doc.get('images', [])):
        name = image_name(image, index)
        view = glb.doc['bufferViews'][image['bufferView']]
        raw = glb.binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
        pil = Image.open(io.BytesIO(raw))
        if max(pil.size) > max_size:
            ratio = max_size / max(pil.size)
            pil = pil.resize((max(1, round(pil.width * ratio)), max(1, round(pil.height * ratio))), Image.LANCZOS)
        mime = image.get('mimeType', 'image/jpeg')
        if mime == 'image/png':
            filename = name + '.png'
            pil.save(folder / filename, optimize=True)
        else:
            filename = name + '.jpg'
            pil.convert('RGB').save(folder / filename, quality=92 if 'Normal' in name or '_n' in name else 90)
        output[index] = {'uri': folder.name + '/' + filename, 'mimeType': mime, 'name': name}
    IMAGE_CACHE[key] = output
    return output


def texture_references(value):
    if isinstance(value, dict):
        if 'index' in value:
            yield value['index']
        for child in value.values():
            yield from texture_references(child)
    elif isinstance(value, list):
        for child in value:
            yield from texture_references(child)


def remap_textures(value, mapping):
    if isinstance(value, dict):
        for key, child in value.items():
            if key == 'index':
                value[key] = mapping[child]
            else:
                remap_textures(child, mapping)
    elif isinstance(value, list):
        for child in value:
            remap_textures(child, mapping)


def subset(glb, root, transform=None, image_folder=None, global_name=None, material_names=None, pivot=None):
    nodes, meshes, accessors, materials, used_images = [], [], [], [], set()

    def walk(index):
        node = dict(glb.doc['nodes'][index])
        node['children'] = []
        new_index = len(nodes)
        nodes.append(node)
        if 'mesh' in node:
            mesh = glb.doc['meshes'][node['mesh']]
            primitives = []
            for primitive in mesh['primitives']:
                new = dict(primitive)
                attributes = dict(new['attributes'])
                for key, value in attributes.items():
                    if value not in accessors:
                        accessors.append(value)
                    attributes[key] = accessors.index(value)
                new['attributes'] = attributes
                if 'indices' in new:
                    if new['indices'] not in accessors:
                        accessors.append(new['indices'])
                    new['indices'] = accessors.index(new['indices'])
                if 'material' in new:
                    if new['material'] not in materials:
                        materials.append(new['material'])
                    new['material'] = materials.index(new['material'])
                    material = glb.doc['materials'][new['material']]
                    for texture in texture_references(material):
                        used_images.add(glb.doc['textures'][texture]['source'])
                primitives.append(new)
            meshes.append({'name': mesh.get('name', node.get('name', 'malla')), 'primitives': primitives})
            node['mesh'] = len(meshes) - 1
        for child in glb.doc['nodes'][index].get('children', []):
            node['children'].append(walk(child))
        return new_index

    walk(root)
    root_matrix = matrix(nodes[0])
    if transform is not None:
        root_matrix = transform @ root_matrix
    if pivot is not None:
        root_matrix = pivot @ root_matrix
    nodes[0].pop('translation', None)
    nodes[0].pop('rotation', None)
    nodes[0].pop('scale', None)
    nodes[0]['matrix'] = [float(value) for value in root_matrix.T.ravel()]
    view_map, binary = {}, bytearray()
    for old_index in accessors:
        acc = dict(glb.doc['accessors'][old_index])
        view = glb.doc['bufferViews'][acc['bufferView']]
        start = view.get('byteOffset', 0)
        raw = glb.binary[start:start + view['byteLength']]
        while len(binary) % 4:
            binary.append(0)
        view_map[acc['bufferView']] = len(view_map)
        acc['bufferView'] = view_map[acc['bufferView']]
        binary.extend(raw)
    new_views = [None] * len(view_map)
    for old_index in accessors:
        acc = glb.doc['accessors'][old_index]
        old_view = acc['bufferView']
        view = glb.doc['bufferViews'][old_view]
        start = view.get('byteOffset', 0)
        raw = glb.binary[start:start + view['byteLength']]
        new_views[view_map[old_view]] = {'buffer': 0, 'byteOffset': 0, 'byteLength': len(raw)}
        if 'target' in view:
            new_views[view_map[old_view]]['target'] = view['target']
    offset = 0
    for view in new_views:
        view['byteOffset'] = offset
        offset += view['byteLength'] + ((-view['byteLength']) % 4)
    new_accessors = []
    for old_index in accessors:
        acc = dict(glb.doc['accessors'][old_index])
        acc['bufferView'] = view_map[acc['bufferView']]
        new_accessors.append(acc)
    images = export_images(glb, image_folder) if image_folder is not None else {}
    used_images.update(range(len(glb.doc.get('images', []))))
    used_images = sorted(used_images)
    image_map = {old: i for i, old in enumerate(used_images)}
    texture_map = {}
    for i, texture in enumerate(glb.doc.get('textures', [])):
        if texture['source'] in image_map:
            texture_map[i] = len(texture_map)
    new_textures = []
    for old, new in sorted(texture_map.items(), key=lambda item: item[1]):
        texture = dict(glb.doc['textures'][old])
        texture['source'] = image_map[texture['source']]
        new_textures.append(texture)
    new_materials = []
    for old in materials:
        material = json.loads(json.dumps(glb.doc['materials'][old]))
        if material_names:
            material['name'] = material_names(material.get('name', ''))
        remap_textures(material, texture_map)
        new_materials.append(material)
    doc = {'asset': {'version': '2.0', 'generator': 'Kimi · integrar_originales.py'},
           'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': nodes, 'meshes': meshes,
           'materials': new_materials, 'textures': new_textures,
           'images': [images[index] for index in used_images] if images else [],
           'samplers': glb.doc.get('samplers', []), 'accessors': new_accessors,
           'bufferViews': new_views, 'buffers': [{'byteLength': len(binary)}]}
    return doc, binary


def geometry_bounds(doc, binary):
    points = []

    def walk(index, parent):
        node = doc['nodes'][index]
        transform = parent @ matrix(node)
        if 'mesh' in node:
            for primitive in doc['meshes'][node['mesh']]['primitives']:
                vertices = read_accessor(doc, binary, primitive['attributes']['POSITION'])
                points.append((np.c_[vertices, np.ones(len(vertices))] @ transform.T)[:, :3])
        for child in node.get('children', []):
            walk(child, transform)

    for root in doc['scenes'][doc.get('scene', 0)]['nodes']:
        walk(root, np.eye(4))
    points = np.concatenate(points)
    return points.min(axis=0), points.max(axis=0)


def reference_model(name):
    import tempfile

    with tempfile.NamedTemporaryFile(suffix='.glb') as reference_file:
        reference = subprocess.run(['git', 'show', MODEL_REF + ':assets/models/edificios/%s_hd.glb' % name], cwd=ROOT, capture_output=True)
        if reference.returncode:
            reference = subprocess.run(['git', 'show', MODEL_REF + ':assets/models/edificios/%s.glb' % name], cwd=ROOT, capture_output=True, check=True)
        reference_file.write(reference.stdout)
        reference_file.flush()
        return GLB(Path(reference_file.name))


def fit_to_reference(doc, binary, reference):
    low, high = geometry_bounds(doc, binary)
    expected_low, expected_high = geometry_bounds(reference.doc, reference.binary)
    scales = (expected_high - expected_low) / np.maximum(high - low, 1e-12)
    pivot = np.diag([*scales, 1.0])
    pivot[:3, 3] = expected_low - low * scales
    return pivot


def update_buildings(glb):
    conversion = json.loads((OUT / 'conversion.json').read_text())['assets']
    scene = json.loads(SCENE.read_text())
    by_node = {}
    for zone in scene['zonas']:
        for instance in zone['instancias']:
            by_node[instance['nodo']] = instance
    roots = {}
    root_names = set()
    for index in glb.doc['scenes'][0]['nodes']:
        node = glb.doc['nodes'][index]
        instance = by_node.get(node.get('name'))
        if instance and instance['asset'] in conversion and instance['asset'] not in roots:
            name = conversion[instance['asset']].get('web')
            if name and name not in root_names:
                roots[instance['asset']] = (index, instance)
                root_names.add(name)
    kit_path = OUT / 'kit.js'
    text = kit_path.read_text()
    start = text.index('window.AV_EDIFICIOS_KIT = ') + len('window.AV_EDIFICIOS_KIT = ')
    kit = json.loads(text[start:text.rindex(';')])
    for asset, (root, instance) in sorted(roots.items()):
        info = conversion[asset]
        name = info['web']
        original_matrix = matrix(glb.doc['nodes'][root])
        transform = np.array(info['M'], float).reshape(4, 4).T @ np.linalg.inv(original_matrix)
        doc, binary = subset(glb, root, transform, OUT / 'tex_original', 'AV_EDIFICIOS_B64')
        path = OUT / (name + '_hd.glb')
        tris = sum(doc['accessors'][p['indices']]['count'] // 3 for m in doc['meshes'] for p in m['primitives'])
        if tris > 20000:
            try:
                for suffix in ('.glb', '_glb.js'):
                    result = subprocess.run(['git', 'show', MODEL_REF + ':assets/models/edificios/' + name + '_hd' + suffix], cwd=ROOT, capture_output=True)
                    if result.returncode:
                        raise subprocess.CalledProcessError(result.returncode, result.args)
                    path.with_name(name + '_hd' + suffix).write_bytes(result.stdout)
                preserved = GLB(path)
                preserved_tris = sum(preserved.doc['accessors'][p['indices']]['count'] // 3 for mesh in preserved.doc['meshes'] for p in mesh['primitives'])
                preserved_kb = round(path.with_name(name + '_hd_glb.js').stat().st_size / 1024, 1)
                kit[name].update(hd=True, original=False, trisHD=preserved_tris, kbHD=preserved_kb)
                print('HD OPTIMIZADO CONSERVADO', name, tris, flush=True)
                continue
            except subprocess.CalledProcessError:
                kit[name].update(hd=False, original=False)
                print('LIGERO CONSERVADO', name, tris, flush=True)
                continue
        pivot = fit_to_reference(doc, binary, reference_model(name))
        doc, binary = subset(glb, root, transform, OUT / 'tex_original', 'AV_EDIFICIOS_B64', pivot=pivot)
        write_glb(path, doc, binary, 'AV_EDIFICIOS_B64')
        kit[name].update(hd=True, trisHD=tris, kbHD=round(path.with_name(name + '_hd_glb.js').stat().st_size / 1024, 1), original=True)
        print('EDIFICIO', asset, name, tris, flush=True)
    kit_path.write_text(text[:start] + json.dumps(kit, ensure_ascii=False, separators=(',', ':')) + text[text.rindex(';'):])


def terrain_colors():
    colors = {}
    for name in ('no', 'ne', 'so', 'se'):
        path = MAP_OUT / ('terreno_%s.glb' % name)
        if not path.exists():
            continue
        glb = GLB(path)
        for mesh in glb.doc['meshes']:
            for primitive in mesh['primitives']:
                p = glb.accessor(primitive['attributes']['POSITION'])
                c = glb.accessor(primitive['attributes']['COLOR_0'])
                for point, color in zip(p, c):
                    key = (math.floor(point[0] / 2), math.floor(point[2] / 2))
                    colors[key] = color
    return colors


def terrain(glb):
    root = next(i for i, node in enumerate(glb.doc['nodes']) if node.get('name') == 'TerrainBuilderSurface')
    doc, binary = subset(glb, root)
    positions, indices, uv, colors, primitives = [], [], [], [], []
    old_colors = terrain_colors()
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            raw = read_accessor(doc, binary, primitive['attributes']['POSITION'])
            p = (np.c_[raw, np.ones(len(raw))] @ matrix(doc['nodes'][0]).T)[:, :3] * SCALE
            p = compatible_terrain(p)
            idx = read_accessor(doc, binary, primitive['indices']).astype(np.uint32).reshape(-1, 3)
            tex = read_accessor(doc, binary, primitive['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in primitive['attributes'] else np.zeros((len(p), 2), np.float32)
            col = np.array([old_colors.get((math.floor(x / 2), math.floor(z / 2)), [160, 40, 40, 20]) for x, z in p[:, [0, 2]]], dtype=np.uint8)
            center = p[idx].mean(axis=1)
            middle = (p.min(0) + p.max(0)) / 2
            for quadrant, sx, sz in [('no', -1, 1), ('ne', 1, 1), ('so', -1, -1), ('se', 1, -1)]:
                selected = ((center[:, 0] - middle[0]) * sx >= 0) & ((center[:, 2] - middle[2]) * sz >= 0)
                if not selected.any():
                    continue
                tri = idx[selected]
                used, remap = np.unique(tri, return_inverse=True)
                primitives.append((quadrant, p[used], tex[used], col[used], remap.reshape(-1, 3), primitive['material']))
    for quadrant in ('no', 'ne', 'so', 'se'):
        parts = [part for part in primitives if part[0] == quadrant]
        p = np.concatenate([part[1] for part in parts])
        tex = np.concatenate([part[2] for part in parts])
        col = np.concatenate([part[3] for part in parts])
        idx = np.concatenate([part[4] + sum(len(other[1]) for other in parts[:i]) for i, part in enumerate(parts)])
        normals = np.cross(p[idx[:, 1]] - p[idx[:, 0]], p[idx[:, 2]] - p[idx[:, 0]])
        normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
        normal_vertices = np.zeros_like(p)
        for axis in range(3):
            np.add.at(normal_vertices, idx[:, axis], normals)
        normal_vertices /= np.maximum(np.linalg.norm(normal_vertices, axis=1, keepdims=True), 1e-12)
        binary, views, accessors = bytearray(), [], []

        def add(array, component, kind, target, normalized=False):
            while len(binary) % 4:
                binary.append(0)
            raw = array.tobytes()
            views.append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(raw), 'target': target})
            binary.extend(raw)
            acc = {'bufferView': len(views) - 1, 'componentType': component, 'count': len(array), 'type': kind}
            if normalized:
                acc['normalized'] = True
            if kind == 'VEC3' and target == 34962:
                acc['min'] = array.min(0).tolist()
                acc['max'] = array.max(0).tolist()
            accessors.append(acc)
            return len(accessors) - 1

        attributes = {'POSITION': add(p.astype(np.float32), 5126, 'VEC3', 34962),
                      'NORMAL': add(normal_vertices.astype(np.float32), 5126, 'VEC3', 34962),
                      'TEXCOORD_0': add(tex.astype(np.float32), 5126, 'VEC2', 34962),
                      'COLOR_0': add(col, 5121, 'VEC4', 34962, True)}
        doc = {'asset': {'version': '2.0', 'generator': 'Kimi · terreno original'},
               'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': 'terreno_' + quadrant}],
               'meshes': [{'primitives': [{'attributes': attributes, 'indices': add(idx.astype(np.uint32).ravel(), 5125, 'SCALAR', 34963), 'material': 0}]}],
               'materials': [{'name': 'AV_Terreno_Splat', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'roughnessFactor': 0.95}}],
               'accessors': accessors, 'bufferViews': views, 'buffers': [{'byteLength': len(binary)}]}
        write_glb(MAP_OUT / ('terreno_%s.glb' % quadrant), doc, binary, 'AV_MAPA_B64')
    return primitives


def heightmap(glb):
    HEIGHT.write_text(subprocess.check_output(['git', 'show', TERRAIN_REF + ':assets/data/mapa_cap1_altura.js'], cwd=ROOT, text=True))


def trees(glb):
    mapping = {
        '033_Lodoicea maldivica': ('palma_sierra', 8.0),
        '035_Citrus limon': ('yagrumo', 8.0),
        '039_Quercus petraea ': ('tabonuco', 11.0),
        'Arch_061_050_07': ('ceiba', 14.0),
        'Archmodels61_006_00': ('flamboyan', 9.0),
        'Archmodels61_023_00': ('bambu', 7.0),
    }
    for root_name, (name, target_height) in mapping.items():
        root = next(i for i, node in enumerate(glb.doc['nodes']) if node.get('name') == root_name)
        doc, binary = subset(glb, root, image_folder=FLORA_OUT / 'tex_original')
        positions = []
        for mesh in doc['meshes']:
            for primitive in mesh['primitives']:
                positions.append(read_accessor(doc, binary, primitive['attributes']['POSITION']))
        p = np.concatenate(positions)
        world = (np.c_[p, np.ones(len(p))] @ matrix(doc['nodes'][0]).T)[:, :3]
        low, high = world.min(0), world.max(0)
        scale = target_height / max(0.01, high[1] - low[1])
        pivot = np.diag([scale, scale, scale, 1.0])
        pivot[:3, 3] = [-(low[0] + high[0]) / 2 * scale, -low[1] * scale, -(low[2] + high[2]) / 2 * scale]
        doc, binary = subset(glb, root, pivot, FLORA_OUT / 'tex_original', 'AV_ENTORNO_B64',
                             lambda name: ('HOJA_' if any(k in name.lower() for k in ('leaf', 'fruit', 'flower')) else 'CORTEZA_') + name)
        write_glb(FLORA_OUT / (name + '_original.glb'), doc, binary, 'AV_ENTORNO_B64')
        print('ARBOL', name, 'altura', target_height, flush=True)


def main():
    buildings = GLB(BUILDINGS)
    update_buildings(buildings)
    terrain(GLB(MAP))
    heightmap(GLB(MAP))
    trees(GLB(MAP))


if __name__ == '__main__':
    main()
