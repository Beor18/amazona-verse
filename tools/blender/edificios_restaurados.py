#!/usr/bin/env python3
"""3D Make paramétrico: restaura los edificios Ancient y sus apoyos sin Blender ni servicios externos."""
import base64
import json
import math
import re
import struct
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/models/edificios'
SCENE = ROOT / 'assets/data/escena_kelvin_cap1.json'
MAP_JS = ROOT / 'assets/data/mapa_cap1.js'
TARGETS = [
    'templo_grande', 'templo_grande_a', 'templo_grande_d', 'templo_grande_e', 'templo_grande_f',
    'templo_mediano', 'templo_mediano_f', 'templo_mediano_g', 'templo_mediano_h',
    'muro_templo', 'ruina_torre', 'ruina_torre_b', 'ruina_torre_c', 'ruina_torre_e', 'ruina_torre_f',
    'ruina_altar', 'ruina_mirador', 'ruina_pilar', 'ruina_portal',
]
MATERIALS = {
    'wall': {'name': 'AV_Restaurado_Piedra', 'tex': 'kb3d_wallm', 'rough': 0.86},
    'trim': {'name': 'AV_Restaurado_Tallado', 'tex': 'kb3d_decom', 'rough': 0.78},
    'floor': {'name': 'AV_Restaurado_Base', 'tex': 'kb3d_floorm', 'rough': 0.92},
    'stone': {'name': 'AV_Restaurado_Bloques', 'tex': 'kb3d_stonem', 'rough': 0.88},
    'dark': {'name': 'AV_Restaurado_Huecos', 'color': [0.055, 0.043, 0.032, 1], 'rough': 0.96},
}
COLORS = {'wall': [0.68, 0.61, 0.45], 'trim': [0.79, 0.72, 0.55], 'floor': [0.46, 0.43, 0.35],
          'stone': [0.59, 0.53, 0.41], 'dark': [0.09, 0.075, 0.055]}


def read_glb(path):
    data = path.read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + length])
    offset = 20 + length
    size = struct.unpack_from('<I', data, offset)[0]
    binary = data[offset + 8:offset + 8 + size]

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
        return np.array(node['matrix'], float).reshape(4, 4).T
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    rotation = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                         [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                         [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    matrix = np.eye(4)
    matrix[:3, :3] = rotation * np.array(node.get('scale', [1, 1, 1]))
    matrix[:3, 3] = node.get('translation', [0, 0, 0])
    return matrix


def triangles(path):
    doc, accessor = read_glb(path)
    worlds = {}

    def walk(index, parent):
        worlds[index] = parent @ node_matrix(doc['nodes'][index])
        for child in doc['nodes'][index].get('children', []):
            walk(child, worlds[index])

    for root in doc['scenes'][doc.get('scene', 0)]['nodes']:
        walk(root, np.eye(4))
    result = []
    for index, node in enumerate(doc['nodes']):
        if 'mesh' not in node:
            continue
        transform = worlds[index]
        for primitive in doc['meshes'][node['mesh']]['primitives']:
            positions = accessor(primitive['attributes']['POSITION']).astype(float)
            positions = (np.c_[positions, np.ones(len(positions))] @ transform.T)[:, :3]
            indices = accessor(primitive['indices']).reshape(-1, 3).astype(int)
            result.append(positions[indices])
    return np.concatenate(result)


def bounds(path):
    tris = triangles(path).reshape(-1, 3)
    return tris.min(0), tris.max(0)


class Mesh:
    def __init__(self, detail=True):
        self.detail = detail
        self.parts = {name: [] for name in MATERIALS}

    def face(self, points, mat, normals=None):
        points = [np.array(point, float) for point in points]
        normal = np.cross(points[1] - points[0], points[2] - points[0])
        normal /= max(np.linalg.norm(normal), 1e-12)
        if normal @ (np.mean(points, axis=0) - np.mean(points[:2], axis=0)) == 0:
            pass
        count = len(points)
        for i in range(1, count - 1):
            tri = [points[0], points[i], points[i + 1]]
            for point in tri:
                n = normals[len(self.parts[mat]) % len(normals)] if normals else normal
                ax = int(np.argmax(np.abs(n)))
                u, v = [(point[1] / 3, point[2] / 3), (point[0] / 3, point[2] / 3), (point[0] / 3, point[1] / 3)][ax]
                self.parts[mat].append((point.copy(), n.copy(), (u, v)))

    def quad(self, points, mat):
        self.face(points, mat)

    def box(self, center, size, mat='wall'):
        if self.detail and mat == 'trim' and min(size) > 0.08:
            return self.bevel_box(center, size, mat)
        x, y, z = center
        a, b, c = [value / 2 for value in size]
        vertices = [np.array((x + sx * a, y + sy * b, z + sz * c)) for sx, sy, sz in
                    [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1),
                     (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)]]
        for indices in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
            self.quad([vertices[index] for index in indices], mat)

    def bevel_box(self, center, size, mat):
        half = np.array(size, float) / 2
        bevel = min(0.08, float(min(size)) * 0.12)
        center = np.array(center, float)

        def put(points):
            points = [center + point for point in points]
            normal = np.cross(points[1] - points[0], points[2] - points[0])
            if normal @ (np.mean(points, axis=0) - center) < 0:
                points.reverse()
            self.face(points, mat)

        for axis in range(3):
            u, v = [index for index in range(3) if index != axis]
            for sign in (-1, 1):
                points = []
                for su, sv in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
                    point = np.zeros(3)
                    point[axis] = sign * half[axis]
                    point[u] = su * (half[u] - bevel)
                    point[v] = sv * (half[v] - bevel)
                    points.append(point)
                put(points)
        for u, v in ((0, 1), (0, 2), (1, 2)):
            axis = 3 - u - v
            for su, sv in [(-1, -1), (-1, 1), (1, -1), (1, 1)]:
                points = []
                for end, face in ((-1, u), (1, u), (1, v), (-1, v)):
                    point = np.zeros(3)
                    point[axis] = end * (half[axis] - bevel)
                    point[u] = su * (half[u] if face == u else half[u] - bevel)
                    point[v] = sv * (half[v] if face == v else half[v] - bevel)
                    points.append(point)
                put(points)
        for sx, sy, sz in [(-1, -1, -1), (-1, -1, 1), (-1, 1, -1), (-1, 1, 1),
                           (1, -1, -1), (1, -1, 1), (1, 1, -1), (1, 1, 1)]:
            put([np.array((sx * half[0], sy * (half[1] - bevel), sz * (half[2] - bevel))),
                 np.array((sx * (half[0] - bevel), sy * half[1], sz * (half[2] - bevel))),
                 np.array((sx * (half[0] - bevel), sy * (half[1] - bevel), sz * half[2]))])

    def dentils(self, width, depth, y, size, cx=0, cz=0):
        if not self.detail:
            return
        for side in (-1, 1):
            count = max(3, int(width / (size * 2.2)))
            for index in range(count):
                x = cx - width / 2 + width * (index + 0.5) / count
                self.box((x, y, cz + side * depth / 2), (size, size, size), 'trim')
            count = max(3, int(depth / (size * 2.2)))
            for index in range(count):
                z = cz - depth / 2 + depth * (index + 0.5) / count
                self.box((cx + side * width / 2, y, z), (size, size, size), 'trim')

    def relief(self, x, y, z, width, height):
        if not self.detail:
            return
        self.box((x, y, z), (width * 1.35, height * 1.25, 0.045), 'stone')
        points = [np.array((x, y + height / 2, z + 0.03)), np.array((x + width / 2, y, z + 0.03)),
                  np.array((x, y - height / 2, z + 0.03)), np.array((x - width / 2, y, z + 0.03))]
        self.face(points, 'trim')
        self.box((x, y, z + 0.055), (width * 0.18, height * 0.60, 0.025), 'dark')

    def frustum(self, z0, z1, w0, d0, w1, d1, mat='wall', cx=0, cz=0):
        vertices = [np.array((cx + sx * w / 2, z, cz + sz * d / 2)) for z, w, d in ((z0, w0, d0), (z1, w1, d1))
                    for sx, sz in [(-1, -1), (1, -1), (1, 1), (-1, 1)]]
        self.quad([vertices[i] for i in (0, 3, 2, 1)], mat)
        self.quad([vertices[i] for i in (4, 5, 6, 7)], mat)
        for i in range(4):
            j = (i + 1) % 4
            self.quad([vertices[i], vertices[j], vertices[j + 4], vertices[i + 4]], mat)

    def cylinder(self, center, radius, height, mat='trim', segments=16, top=None):
        if not self.detail:
            segments = 8
        x, y, z = center
        top = radius if top is None else top
        lower = [np.array((x + radius * math.cos(2 * math.pi * i / segments), y, z + radius * math.sin(2 * math.pi * i / segments))) for i in range(segments)]
        upper = [np.array((x + top * math.cos(2 * math.pi * i / segments), y + height, z + top * math.sin(2 * math.pi * i / segments))) for i in range(segments)]
        for i in range(segments):
            j = (i + 1) % segments
            self.quad([lower[i], lower[j], upper[j], upper[i]], mat)
        self.face(list(reversed(lower)), mat)
        self.face(upper, mat)

    def column(self, x, z, y, height, radius, mat='trim'):
        self.box((x, y + height * 0.035, z), (radius * 2.8, height * 0.07, radius * 2.8), mat)
        self.cylinder((x, y + height * 0.07, z), radius, height * 0.82, mat, top=radius * 0.88)
        self.box((x, y + height * 0.94, z), (radius * 2.65, height * 0.12, radius * 2.65), mat)

    def cornice(self, width, depth, y, height, mat='trim', cx=0, cz=0):
        self.box((cx, y + height / 2, cz), (width, height, depth), mat)
        size = min(height * 0.42, min(width, depth) * 0.025)
        self.dentils(width * 0.98, depth * 0.98, y + size * 0.1, size, cx, cz)

    def windows(self, width, depth, y0, y1, cx=0, cz=0, rows=3):
        if not self.detail:
            return
        for row in range(rows):
            y = y0 + (y1 - y0) * (row + 0.5) / rows
            height = (y1 - y0) / rows * 0.42
            for side in (-1, 1):
                self.box((cx + side * width / 2, y, cz), (0.035, height, depth * 0.12), 'dark')
                self.box((cx, y, cz + side * depth / 2), (width * 0.12, height, 0.035), 'dark')
        if rows >= 3:
            self.relief(cx, (y0 + y1) / 2, cz + depth / 2 + 0.025, width * 0.12, (y1 - y0) / rows * 0.55)

    def battlements(self, width, depth, y, height, mat='trim', cx=0, cz=0):
        if not self.detail:
            return
        step = max(height * 1.8, min(width, depth) / 5)
        for side in (-1, 1):
            count = max(2, int(width / step))
            for i in range(count + 1):
                x = cx - width / 2 + width * i / count
                self.box((x, y + height / 2, cz + side * depth / 2), (step * 0.52, height, height * 0.65), mat)
            count = max(2, int(depth / step))
            for i in range(1, count):
                z = cz - depth / 2 + depth * i / count
                self.box((cx + side * width / 2, y + height / 2, z), (height * 0.65, height, step * 0.52), mat)


def temple(mesh, w, d, h, variant):
    mesh.frustum(0, h * 0.07, w, d, w * 0.94, d * 0.94, 'floor')
    mesh.frustum(h * 0.07, h * 0.14, w * 0.94, d * 0.94, w * 0.86, d * 0.86, 'stone')
    mesh.box((0, h * 0.36, 0), (w * 0.68, h * 0.44, d * 0.68), 'wall')
    for side in (-1, 1):
        count = max(3, int(w / max(h * 0.12, 2)))
        for i in range(count):
            x = -w * 0.29 + w * 0.58 * i / max(1, count - 1)
            mesh.column(x, side * d * 0.29, h * 0.14, h * 0.46, min(w, d) * 0.025)
        count = max(2, int(d / max(h * 0.15, 2)))
        for i in range(1, count - 1):
            z = -d * 0.29 + d * 0.58 * i / max(1, count - 1)
            mesh.column(side * w * 0.29, z, h * 0.14, h * 0.46, min(w, d) * 0.025)
    mesh.cornice(w * 0.78, d * 0.78, h * 0.58, h * 0.045)
    mesh.frustum(h * 0.625, h * 0.70, w * 0.78, d * 0.78, w * 0.66, d * 0.66, 'stone')
    mesh.windows(w * 0.68, d * 0.68, h * 0.20, h * 0.54, rows=3)
    door_w, door_h = w * 0.14, h * 0.23
    mesh.box((0, h * 0.14 + door_h / 2, d * 0.341), (door_w, door_h, 0.05), 'dark')
    for side in (-1, 1):
        mesh.column(side * door_w * 0.65, d * 0.355, h * 0.14, door_h * 1.1, min(w, d) * 0.022)
    steps = 9 if mesh.detail else 5
    for i in range(steps):
        y = h * 0.14 * (i + 1) / steps
        depth = d * 0.20 * (1 - i / steps)
        mesh.box((0, y / 2, d * 0.46 + depth / 2), (w * 0.23, y, depth), 'floor')
    if variant % 3 == 0:
        for side in (-1, 1):
            mesh.box((side * w * 0.19, h * 0.82, 0), (w * 0.22, h * 0.25, d * 0.34), 'wall')
            mesh.cornice(w * 0.27, d * 0.39, h * 0.945, h * 0.035, cx=side * w * 0.19)
            mesh.battlements(w * 0.25, d * 0.37, h * 0.98, h * 0.02, cx=side * w * 0.19)
    else:
        mesh.box((0, h * 0.82, -d * 0.04), (w * 0.31, h * 0.25, d * 0.39), 'wall')
        mesh.windows(w * 0.31, d * 0.39, h * 0.72, h * 0.92, cz=-d * 0.04, rows=2)
        mesh.cornice(w * 0.39, d * 0.47, h * 0.945, h * 0.035, cz=-d * 0.04)
        mesh.battlements(w * 0.37, d * 0.45, h * 0.98, h * 0.02, cz=-d * 0.04)


def medium_temple(mesh, w, d, h, variant):
    mesh.frustum(0, h * 0.12, w, d, w * 0.88, d * 0.88, 'floor')
    mesh.box((0, h * 0.42, 0), (w * 0.68, h * 0.60, d * 0.68), 'wall')
    for side in (-1, 1):
        for x in (-w * 0.24, 0, w * 0.24):
            mesh.column(x, side * d * 0.29, h * 0.12, h * 0.58, min(w, d) * 0.035)
    mesh.cornice(w * 0.82, d * 0.82, h * 0.70, h * 0.07)
    mesh.frustum(h * 0.77, h * 0.87, w * 0.76, d * 0.76, w * 0.56, d * 0.56, 'stone')
    mesh.box((0, h * 0.93, 0), (w * 0.34, h * 0.14, d * 0.34), 'wall')
    mesh.cornice(w * 0.42, d * 0.42, h * 0.97, h * 0.03)
    mesh.windows(w * 0.68, d * 0.68, h * 0.20, h * 0.64, rows=2)
    mesh.box((0, h * 0.31, d * 0.345), (w * 0.20, h * 0.38, 0.04), 'dark')
    for i in range(6 if mesh.detail else 3):
        y = h * 0.12 * (i + 1) / (6 if mesh.detail else 3)
        mesh.box((0, y / 2, d * (0.48 - i * 0.018)), (w * 0.28, y, d * 0.12), 'floor')


def tower(mesh, w, d, h, variant):
    mesh.frustum(0, h * 0.08, w, d, w * 0.88, d * 0.88, 'floor')
    for side in (-1, 1):
        mesh.box((side * w * 0.30, h * 0.43, 0), (w * 0.12, h * 0.70, d * 0.72), 'wall')
    mesh.box((0, h * 0.43, -d * 0.30), (w * 0.48, h * 0.70, d * 0.12), 'wall')
    for side in (-1, 1):
        mesh.box((side * w * 0.18, h * 0.20, d * 0.30), (w * 0.12, h * 0.24, d * 0.12), 'wall')
    mesh.box((0, h * 0.55, d * 0.30), (w * 0.48, h * 0.46, d * 0.12), 'wall')
    mesh.box((0, h * 0.75, 0), (w * 0.72, h * 0.03, d * 0.72), 'floor')
    for sx in (-1, 1):
        for sz in (-1, 1):
            mesh.column(sx * w * 0.32, sz * d * 0.32, h * 0.08, h * 0.66, min(w, d) * 0.065)
    for level in (0.24, 0.50, 0.75):
        mesh.cornice(w * 0.84, d * 0.84, h * level, h * 0.035)
    mesh.windows(w * 0.72, d * 0.72, h * 0.16, h * 0.70, rows=3)
    mesh.frustum(h * 0.775, h * 0.86, w * 0.88, d * 0.88, w * 0.72, d * 0.72, 'stone')
    mesh.box((0, h * 0.91, 0), (w * 0.54, h * 0.10, d * 0.54), 'wall')
    mesh.cornice(w * 0.66, d * 0.66, h * 0.96, h * 0.025)
    mesh.battlements(w * 0.64, d * 0.64, h * 0.975, h * 0.025)


def wall(mesh, w, d, h, variant):
    mesh.box((0, h * 0.06, 0), (w, h * 0.12, d), 'floor')
    mesh.box((0, h * 0.43, 0), (w * 0.86, h * 0.74, d * 0.38), 'wall')
    for side in (-1, 1):
        mesh.box((0, h * 0.40, side * d * 0.34), (w * 0.86, h * 0.66, d * 0.30), 'wall')
    count = max(3, int(w / max(h * 0.35, 1)))
    for i in range(count + 1):
        x = -w * 0.40 + w * 0.80 * i / count
        mesh.box((x, h * 0.43, d * 0.23), (w * 0.055, h * 0.74, d * 0.16), 'trim')
    mesh.cornice(w * 0.94, d * 0.65, h * 0.80, h * 0.07)
    mesh.cornice(w, d * 0.82, h * 0.87, h * 0.06, 'floor')
    mesh.battlements(w * 0.92, d * 0.72, h * 0.93, h * 0.04)


def portal(mesh, w, d, h, variant):
    mesh.box((0, h * 0.05, 0), (w, h * 0.10, d), 'floor')
    for side in (-1, 1):
        mesh.box((side * w * 0.32, h * 0.43, 0), (w * 0.24, h * 0.76, d * 0.70), 'wall')
        mesh.column(side * w * 0.32, d * 0.32, h * 0.10, h * 0.68, min(w, d) * 0.07)
    mesh.box((0, h * 0.77, 0), (w * 0.88, h * 0.16, d * 0.78), 'trim')
    mesh.frustum(h * 0.85, h * 0.95, w * 0.96, d * 0.88, w * 0.72, d * 0.62, 'stone')
    mesh.cornice(w * 0.76, d * 0.66, h * 0.95, h * 0.05)
    for i in range(7 if mesh.detail else 3):
        a = math.pi * (i + 0.5) / (7 if mesh.detail else 3)
        mesh.box((math.cos(a) * w * 0.19, h * 0.58 + math.sin(a) * h * 0.16, d * 0.37),
                 (w * 0.09, h * 0.08, d * 0.10), 'trim')


def altar(mesh, w, d, h, variant):
    for i, scale in enumerate((1.0, 0.82, 0.64, 0.44)):
        mesh.box((0, h * (i + 0.5) * 0.18, 0), (w * scale, h * 0.18, d * scale), 'floor' if i < 2 else 'wall')
    mesh.cylinder((0, h * 0.72, 0), min(w, d) * 0.15, h * 0.22, 'trim', top=min(w, d) * 0.09)
    mesh.box((0, h * 0.97, 0), (w * 0.22, h * 0.06, d * 0.22), 'trim')


def lookout(mesh, w, d, h, variant):
    mesh.box((0, h * 0.05, 0), (w * 0.70, h * 0.10, d * 0.55), 'floor')
    for sx in (-1, 1):
        for sz in (-1, 1):
            mesh.column(sx * w * 0.26, sz * d * 0.20, h * 0.10, h * 0.64, min(w, d) * 0.07)
    mesh.box((0, h * 0.70, 0), (w, h * 0.12, d), 'floor')
    mesh.cornice(w * 0.94, d * 0.94, h * 0.76, h * 0.06)
    for sx in (-1, 1):
        mesh.box((sx * w * 0.43, h * 0.88, 0), (w * 0.10, h * 0.20, d * 0.88), 'wall')
    for sz in (-1, 1):
        mesh.box((0, h * 0.88, sz * d * 0.43), (w * 0.88, h * 0.20, d * 0.10), 'wall')
    mesh.battlements(w * 0.90, d * 0.90, h * 0.96, h * 0.04)


def pillar(mesh, w, d, h, variant):
    mesh.box((0, h * 0.06, 0), (w, h * 0.12, d), 'floor')
    mesh.column(0, 0, h * 0.12, h * 0.72, min(w, d) * 0.24)
    mesh.cornice(w * 0.84, d * 0.84, h * 0.84, h * 0.07)
    mesh.frustum(h * 0.91, h * 0.98, w * 0.74, d * 0.74, w * 0.48, d * 0.48, 'stone')
    mesh.box((0, h * 0.99, 0), (w * 0.50, h * 0.02, d * 0.50), 'trim')


def build(name, low, high, detail):
    w, h, d = high - low
    mesh = Mesh(detail)
    variant = sum(ord(char) for char in name) % 5
    if name.startswith('templo_grande'):
        temple(mesh, w, d, h, variant)
    elif name.startswith('templo_mediano'):
        medium_temple(mesh, w, d, h, variant)
    elif name.startswith('ruina_torre'):
        tower(mesh, w, d, h, variant)
    elif name == 'muro_templo':
        wall(mesh, w, d, h, variant)
    elif name == 'ruina_portal':
        portal(mesh, w, d, h, variant)
    elif name == 'ruina_altar':
        altar(mesh, w, d, h, variant)
    elif name == 'ruina_mirador':
        lookout(mesh, w, d, h, variant)
    elif name == 'ruina_pilar':
        pillar(mesh, w, d, h, variant)
    points = np.array([point for parts in mesh.parts.values() for point, _, _ in parts])
    mn, mx = points.min(0), points.max(0)
    scale = (high - low) / np.maximum(mx - mn, 1e-6)
    center = (low + high) / 2
    for mat, parts in mesh.parts.items():
        mesh.parts[mat] = [((point - (mn + mx) / 2) * scale + center, normal, uv) for point, normal, uv in parts]
    return mesh


def normal_maps():
    color_atlas = Image.open(OUT / 'tex_hd/hd_ancient.jpg').convert('RGB')
    normal_atlas = Image.open(OUT / 'tex_hd/hd_ancient_n.jpg').convert('RGB')
    extracted = set()
    for name, row, column in (('kb3d_wallm', 0, 1), ('kb3d_decom', 2, 2)):
        box = (column * 512, row * 512, (column + 1) * 512, (row + 1) * 512)
        color_atlas.crop(box).save(OUT / 'tex' / (name + '.jpg'), quality=94)
        normal_atlas.crop(box).save(OUT / 'tex' / (name + '_n.jpg'), quality=94)
        extracted.add(name)
    for info in MATERIALS.values():
        if 'tex' not in info or info['tex'] in extracted:
            continue
        source = OUT / 'tex' / (info['tex'] + '.jpg')
        target = OUT / 'tex' / (info['tex'] + '_n.jpg')
        image = Image.open(source).convert('RGB').resize((512, 512))
        gray = np.asarray(image.convert('L').filter(ImageFilter.GaussianBlur(1.1)), dtype=np.float32) / 255
        dx = (np.roll(gray, -1, 1) - np.roll(gray, 1, 1)) * 2.2
        dy = (np.roll(gray, -1, 0) - np.roll(gray, 1, 0)) * 2.2
        normal = np.dstack((-dx, -dy, np.ones_like(gray)))
        normal /= np.linalg.norm(normal, axis=2, keepdims=True)
        rgb = ((normal * 0.5 + 0.5) * 255).astype(np.uint8)
        Image.fromarray(rgb).save(target, quality=92)


def material_defs():
    defs, textures, images = [], [], []
    for info in MATERIALS.values():
        pbr = {'metallicFactor': 0.0, 'roughnessFactor': info['rough']}
        material = {'name': info['name'], 'pbrMetallicRoughness': pbr, 'doubleSided': True}
        if 'tex' in info:
            base = len(images)
            images.extend([{'uri': 'tex/%s.jpg' % info['tex'], 'mimeType': 'image/jpeg'},
                           {'uri': 'tex/%s_n.jpg' % info['tex'], 'mimeType': 'image/jpeg'}])
            textures.extend([{'sampler': 0, 'source': base}, {'sampler': 0, 'source': base + 1}])
            pbr['baseColorTexture'] = {'index': base}
            pbr['baseColorFactor'] = [1, 1, 1, 1]
            material['normalTexture'] = {'index': base + 1, 'scale': 0.65}
        else:
            pbr['baseColorFactor'] = info['color']
        defs.append(material)
    return defs, textures, images


def export_glb(mesh, path, name, far=False):
    binary = bytearray()
    views, accessors, primitives = [], [], []
    mats, textures, images = ([{'name': 'AV_Lejos', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'roughnessFactor': 1}}], [], []) if far else material_defs()
    mat_names = [mat['name'] for mat in mats]

    def add(array, component, kind, target, normalized=False):
        while len(binary) % 4:
            binary.append(0)
        raw = array.tobytes()
        views.append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(raw), 'target': target})
        binary.extend(raw)
        acc = {'bufferView': len(views) - 1, 'componentType': component, 'count': len(array), 'type': kind}
        if normalized:
            acc['normalized'] = True
        if kind == 'VEC3' and target == 34962 and array is positions:
            acc['min'] = array.min(0).tolist()
            acc['max'] = array.max(0).tolist()
        accessors.append(acc)
        return len(accessors) - 1

    for mat, parts in mesh.parts.items():
        if not parts:
            continue
        positions = np.array([item[0] for item in parts], dtype=np.float32)
        normals = np.array([item[1] for item in parts], dtype=np.float32)
        normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-8)
        attributes = {'POSITION': add(positions, 5126, 'VEC3', 34962), 'NORMAL': add(normals, 5126, 'VEC3', 34962)}
        if far:
            colors = np.array([COLORS[mat]] * len(parts), dtype=np.float32)
            attributes['COLOR_0'] = add(colors, 5126, 'VEC3', 34962)
        else:
            uv = np.array([item[2] for item in parts], dtype=np.float32)
            attributes['TEXCOORD_0'] = add(uv, 5126, 'VEC2', 34962)
        indices = np.arange(len(parts), dtype=np.uint32)
        primitives.append({'attributes': attributes, 'indices': add(indices, 5125, 'SCALAR', 34963),
                           'material': mat_names.index(MATERIALS[mat]['name']) if not far else 0})
    doc = {'asset': {'version': '2.0', 'generator': 'Kimi 3D Make · edificios_restaurados.py'},
           'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'name': name, 'mesh': 0}],
           'meshes': [{'name': name, 'primitives': primitives}], 'materials': mats,
           'accessors': accessors, 'bufferViews': views, 'buffers': [{'byteLength': len(binary)}]}
    if textures:
        doc.update(textures=textures, images=images, samplers=[{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}])
    encoded = json.dumps(doc, separators=(',', ':')).encode()
    encoded += b' ' * ((-len(encoded)) % 4)
    while len(binary) % 4:
        binary.append(0)
    total = 12 + 8 + len(encoded) + 8 + len(binary)
    path.write_bytes(struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
                     + struct.pack('<II', len(binary), 0x004E4942) + binary)
    script = path.with_name(path.stem + '_glb.js')
    script.write_text('(window.AV_EDIFICIOS_B64=window.AV_EDIFICIOS_B64||{})["%s"]="%s";\n' %
                      (path.stem, base64.b64encode(path.read_bytes()).decode()))
    return len(triangles(path))


def update_kit(stats):
    path = OUT / 'kit.js'
    text = path.read_text()
    start = text.index('window.AV_EDIFICIOS_KIT = ') + len('window.AV_EDIFICIOS_KIT = ')
    kit = json.loads(text[start:text.rindex(';')])
    for name, values in stats.items():
        item = kit[name]
        low, high = bounds(OUT / (name + '.glb'))
        item.update(tris=values['near'], trisLejos=values['far'], trisHD=values['hd'], hd=True,
                    kb=round((OUT / (name + '_glb.js')).stat().st_size / 1024, 1),
                    kbLejos=round((OUT / (name + '_lejos_glb.js')).stat().st_size / 1024, 1),
                    kbHD=round((OUT / (name + '_hd_glb.js')).stat().st_size / 1024, 1),
                    radio=round(float(np.linalg.norm(high - low) / 2), 3), alto=round(float(high[1]), 3), lejos=True,
                    restaurado=True)
    path.write_text(text[:start] + json.dumps(kit, ensure_ascii=False, separators=(',', ':')) + text[text.rindex(';'):])


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


def surface_heights(instance, surfaces, ground):
    x, z = instance['huella']['x'], instance['huella']['z']
    heights = [ground(x, z)]
    for other, tris in surfaces:
        if other == instance['id']:
            continue
        if x < tris[:, :, 0].min() or x > tris[:, :, 0].max() or z < tris[:, :, 2].min() or z > tris[:, :, 2].max():
            continue
        a, b, c = tris[:, 0], tris[:, 1], tris[:, 2]
        v0, v1 = b - a, c - a
        px, pz = x - a[:, 0], z - a[:, 2]
        d00, d01, d11 = np.sum(v0 * v0, 1), np.sum(v0 * v1, 1), np.sum(v1 * v1, 1)
        d20, d21 = px * v0[:, 0] + pz * v0[:, 2], px * v1[:, 0] + pz * v1[:, 2]
        denominator = d00 * d11 - d01 * d01
        valid = np.abs(denominator) > 1e-10
        u, v = np.zeros(len(tris)), np.zeros(len(tris))
        u[valid] = (d11[valid] * d20[valid] - d01[valid] * d21[valid]) / denominator[valid]
        v[valid] = (d00[valid] * d21[valid] - d01[valid] * d20[valid]) / denominator[valid]
        inside = valid & (u >= -1e-6) & (v >= -1e-6) & (u + v <= 1 + 1e-6)
        if inside.any():
            heights.extend((a[:, 1] + u * v0[:, 1] + v * v1[:, 1])[inside].tolist())
    return heights


def relocate(zones, ground=None):
    instances = [instance for zone in zones for instance in zone['instancias']]
    relevant = [instance for instance in instances if instance.get('modelo') and not instance.get('oculto') and not instance.get('espera')
                and (instance['asset'].startswith('ancient_') or instance['asset'].startswith('losa_'))]
    surfaces = []
    for instance in relevant:
        matrix = np.array(instance['matriz']).reshape(4, 4).T
        tris = triangles(OUT / (instance['modelo'] + '.glb'))
        tris = (np.c_[tris.reshape(-1, 3), np.ones(tris.size // 3)] @ matrix.T)[:, :3].reshape(-1, 3, 3)
        normals = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
        lengths = np.linalg.norm(normals, axis=1)
        valid = lengths > 1e-8
        tris, normals, lengths = tris[valid], normals[valid], lengths[valid]
        tris = tris[normals[:, 1] / lengths > 0.65]
        if len(tris):
            surfaces.append((instance['id'], tris))
    ground = ground or terrain_height()
    ancient = sorted([instance for instance in relevant if instance['asset'].startswith('ancient_')], key=lambda item: item['huella']['y0'])
    moved = []
    for _ in range(3):
        changes = 0
        for instance in ancient:
            base = instance['huella']['y0']
            heights = surface_heights(instance, surfaces, ground)
            nearest = min(heights, key=lambda height: abs(height - base))
            delta = nearest - base
            if abs(delta) < 0.005:
                continue
            for key in ('matriz', 'matrizMigrado'):
                instance[key][13] = round(instance[key][13] + delta, 5)
            instance['huella']['y0'] = round(instance['huella']['y0'] + delta, 2)
            instance['huella']['y1'] = round(instance['huella']['y1'] + delta, 2)
            instance['ajuste']['dy'] = round(instance['ajuste']['dy'] + delta, 2)
            for identifier, tris in surfaces:
                if identifier == instance['id']:
                    tris[:, :, 1] += delta
            moved.append((instance['id'], delta))
            changes += 1
        if not changes:
            break
    return moved


def update_scene():
    doc = json.loads(SCENE.read_text())
    moved = relocate(doc['zonas'])
    SCENE.write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')))
    sys.path.insert(0, str(ROOT / 'tools/blender'))
    from mapa_kelvin import compacto
    text = MAP_JS.read_text()
    prefix = 'var D = window.AV_MAPA_CAP1 = '
    start = text.index(prefix) + len(prefix)
    end = text.index(';\n', start)
    data = json.loads(text[start:end])
    data['escenaKelvin']['compacto'] = compacto(doc['zonas'])
    data['escenaKelvin']['nota'] += ' Edificios Ancient restaurados con Kimi 3D Make; apoyos ajustados sobre superficies reales.'
    MAP_JS.write_text(text[:start] + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + text[end:])
    return moved


def main():
    normal_maps()
    stats = {}
    for name in TARGETS:
        source = OUT / (name + '.glb')
        low, high = bounds(source)
        detailed = build(name, low, high, True)
        light = build(name, low, high, False)
        near_tris = export_glb(light, source, name)
        hd_tris = export_glb(detailed, OUT / (name + '_hd.glb'), name + '_hd')
        far_tris = export_glb(light, OUT / (name + '_lejos.glb'), name + '_lejos', far=True)
        stats[name] = {'near': near_tris, 'hd': hd_tris, 'far': far_tris}
        print('RESTAURADO', name, near_tris, 'ligero ·', hd_tris, 'HD ·', far_tris, 'lejos', flush=True)
    update_kit(stats)
    moved = update_scene()
    print('APOYOS', len(moved), 'ajustes · máximo', round(max((abs(delta) for _, delta in moved), default=0), 2), 'm')


if __name__ == '__main__':
    main()
