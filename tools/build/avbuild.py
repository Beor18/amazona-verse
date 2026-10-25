"""Amazona Verse · build reproducible del artifact (dueño: Build/Release Engineer; lo llama tools/build/build.sh).

Uso (siempre con el python de Blender y -I; nunca `python3`):
  <python3.11> -I tools/build/avbuild.py --sitio <salida>/site --salida <salida> --ref <ref> --commit <sha> --repo <repo>
                [--sin-optimizar] [--sin-texturas-compartidas] [--estricto] [--sin-cache]

Pasos sobre <salida>/site (ya exportada con git archive por build.sh):
  1. limpiar     quita .glb/.blend (el artifact no sirve .glb: el juego usa las copias base64 *_glb.js); avisa si un
                 *_glb.js no coincide con su .glb.
  2. validar     <script>/<link>/<img> de index.html, rutas literales de src/, content/ y datos, cada *_glb.js es un
                 glTF 2.0 válido, límites del artifact y URLs externas fuera de la lista permitida.
  3. podar       quita las cargas (payloads) que nada alcanza desde index.html, src/ y content/.
  4. texturas    recomprime png/jpg (externas y embebidas en los glTF) con sips, solo si no hay pérdida visible.
  5. compartidas una textura embebida repetida en varios glTF de una carpeta sale a <carpeta>/tex/ una sola vez.
  6. validar de nuevo, manifiesto.json (qué publicar) y reporte-build.{md,json}.
Salida: código 0 si pasa, 1 si falla la validación, 2 si hay un error de uso.
"""
import argparse
import base64
import binascii
import concurrent.futures as cf
import datetime
import fnmatch
import hashlib
import html.parser
import json
import os
import posixpath
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import urllib.parse
import zlib

try:
    import numpy as np
except Exception:  # sin numpy no se puede medir la pérdida: no se recomprime nada
    np = None

VERSION = '1.1.0'
MB = 1024 * 1024
CODE_EXT = {'.js', '.mjs', '.css', '.html', '.htm'}
TEXT_EXT = CODE_EXT | {'.json', '.txt', '.csv', '.svg', '.md'}
REF_EXT = r'js|mjs|css|png|jpe?g|webp|gif|svg|json|glb|gltf|bin|mp3|ogg|wav|m4a|woff2?|ttf|otf|html|txt|csv'
PATH_RE = re.compile(r'(?<![\w./:@-])((?:\./)?(?:assets|src|content)/(?:[\w.-]+/)*[\w.-]+\.(?:' + REF_EXT + r'))(?![\w-])', re.I)
DIR_RE = re.compile(r'''['"`]((?:\./)?(?:assets|src|content)/(?:[\w.-]+/)*)['"`]''')
TOKEN_RE = re.compile(r'[A-Za-z0-9_-]+')
URL_RE = re.compile(r'''https?://[^\s'"`<>()\\]+''', re.I)
CSS_URL_RE = re.compile(r'''url\(\s*(['"]?)([^'")]+?)\1\s*\)|@import\s+(['"])([^'"]+)\3''', re.I)
FETCH_CTX = re.compile(r'''fetch\s*\(|\.src\s*=|\bsrc\s*:|import\s*\(|importScripts|XMLHttpRequest|\.open\s*\(|loadGLB|\.load\s*\(|'''
                       r'''new\s+(?:Worker|WebSocket|EventSource|Image|Audio)\b|sendBeacon|url\s*\(|@import|<(?:script|img|link|iframe|audio|video|source)\b|'''
                       r'''setAttribute\s*\(\s*['"](?:src|href)|\.script\s*\(''', re.I)
VERSION_PIN = re.compile(r'@\d+\.\d+\.\d+|/r\d{2,3}/|/\d+\.\d+\.\d+/')
GLB_HEAD_RE = re.compile(r'''^\s*(?:\(\s*window\.([A-Za-z_$][\w$]*)\s*=\s*window\.\1\s*\|\|\s*\{\s*\}\s*\)\s*\[\s*(["'])([^"']+)\2\s*\]|window\.([A-Za-z_$][\w$]*))\s*=\s*(["'])''')
PNG_SIG = b'\x89PNG\r\n\x1a\n'


# ---------------------------------------------------------------- utilidades
def mb(b):
    return round(b / MB, 2)


def ext_de(p):
    return os.path.splitext(p)[1].lower()


def listar(root):
    out = {}
    for d, _, files in os.walk(root):
        for f in files:
            p = os.path.join(d, f)
            out[os.path.relpath(p, root).replace(os.sep, '/')] = os.path.getsize(p)
    return dict(sorted(out.items()))


def resumen(files):
    return {'archivos': len(files), 'bytes': sum(files.values()), 'mb': mb(sum(files.values()))}


def sha256(b):
    return hashlib.sha256(b).hexdigest()


def leer(p, modo='rb'):
    with open(p, modo) as f:
        return f.read()


def escribir(p, data):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'wb') as f:
        f.write(data)


def stem_de(rel):
    b = posixpath.basename(rel)
    return b[:-7] if b.endswith('_glb.js') else os.path.splitext(b)[0]


def linea_de(txt, pos):
    return txt.count('\n', 0, pos) + 1


def es_especial(u):
    return u.startswith(('data:', 'blob:', '#', 'javascript:', 'mailto:', 'about:', 'tel:')) or u.strip() == ''


def es_externa(u):
    return bool(re.match(r'^(?:https?:)?//', u, re.I))


def host_de(u):
    try:
        return (urllib.parse.urlsplit('https:' + u if u.startswith('//') else u).hostname or '').lower()
    except ValueError:
        return ''


def normalizar(u, base_dir=''):
    u = u.split('#', 1)[0].split('?', 1)[0]
    if u.startswith('/'):
        return None  # absoluta al dominio: en el artifact no se sabe dónde queda la raíz
    p = posixpath.normpath(posixpath.join(base_dir, u)) if base_dir else posixpath.normpath(u)
    return None if p.startswith('..') else p


class Registro:
    def __init__(self):
        self.items = []

    def add(self, nivel, paso, msg, **datos):
        self.items.append(dict({'nivel': nivel, 'paso': paso, 'msg': msg}, **datos))

    def de(self, nivel, paso=None):
        return [i for i in self.items if i['nivel'] == nivel and (paso is None or i['paso'] == paso)]


# ---------------------------------------------------------------- JS sin comentarios
_REGEX_PREV = set('(,=:[!&|?{};+-*%<>~^')
_REGEX_WORDS = {'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await', 'instanceof'}


def js_sin_comentarios(src):
    """Quita // y /* */ respetando cadenas, plantillas y regex literales (conserva los saltos de línea)."""
    out, i, n = [], 0, len(src)
    last, word = '', ''
    while i < n:
        c = src[i]
        if c in '\'"`':
            j = i + 1
            while j < n and src[j] != c:
                if src[j] == '\\':
                    j += 2
                    continue
                if src[j] == '\n' and c != '`':
                    break
                j += 1
            out.append(src[i:j + 1])
            i, last, word = j + 1, 'a', ''
            continue
        if c == '/' and i + 1 < n:
            nx = src[i + 1]
            if nx == '/':
                j = src.find('\n', i)
                j = n if j < 0 else j
                i = j
                continue
            if nx == '*':
                j = src.find('*/', i + 2)
                j = n if j < 0 else j + 2
                out.append('\n' * src.count('\n', i, j) or ' ')
                i = j
                continue
            if last == '' or last in _REGEX_PREV or (last == 'a' and word in _REGEX_WORDS):
                j, clase = i + 1, False
                while j < n:
                    ch = src[j]
                    if ch == '\\':
                        j += 2
                        continue
                    if ch == '\n':
                        break
                    if ch == '[':
                        clase = True
                    elif ch == ']':
                        clase = False
                    elif ch == '/' and not clase:
                        break
                    j += 1
                j += 1
                while j < n and (src[j].isalnum() or src[j] == '_'):
                    j += 1
                out.append(src[i:j])
                i, last, word = j, 'a', ''
                continue
        if c.isalnum() or c in '_$':
            j = i
            while j < n and (src[j].isalnum() or src[j] in '_$'):
                j += 1
            word = src[i:j]
            out.append(word)
            i, last = j, 'a'
            continue
        out.append(c)
        if not c.isspace():
            last, word = c, ''
        i += 1
    return ''.join(out)


def css_sin_comentarios(src):
    return re.sub(r'/\*.*?\*/', lambda m: '\n' * m.group(0).count('\n') or ' ', src, flags=re.S)


class HTMLRefs(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.refs, self.js, self.css, self._en = [], [], [], None

    def handle_starttag(self, tag, attrs):
        a = {k: (v or '') for k, v in attrs}
        ln = self.getpos()[0]
        if tag == 'script':
            if a.get('src'):
                self.refs.append(('script', a['src'], ln))
            else:
                self._en = ('js', ln)
        elif tag == 'link' and a.get('href'):
            self.refs.append(('link:' + a.get('rel', '').lower(), a['href'], ln))
        elif tag in ('img', 'source', 'audio', 'video', 'iframe', 'embed', 'track', 'input') and a.get('src'):
            self.refs.append((tag, a['src'], ln))
        elif tag == 'object' and a.get('data'):
            self.refs.append((tag, a['data'], ln))
        elif tag == 'style':
            self._en = ('css', ln)
        if a.get('style'):
            self.css.append((a['style'], ln))

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self._en = None

    def handle_data(self, data):
        if self._en:
            (self.js if self._en[0] == 'js' else self.css).append((data, self._en[1]))


# ---------------------------------------------------------------- glTF / *_glb.js
def leer_glb_js(texto):
    """Separa un *_glb.js en (prefijo, base64, sufijo, global, clave). Lanza ValueError si no tiene la forma esperada."""
    m = GLB_HEAD_RE.match(texto[:600])
    if not m:
        raise ValueError('no tiene la forma window.X = "…" ni (window.X = window.X || {})["clave"] = "…"')
    q = m.group(5)
    fin = texto.rfind(q)
    if fin <= m.end() or not re.fullmatch(r'''["']\s*;?\s*''', texto[fin:]):
        raise ValueError('la cadena base64 no cierra al final del archivo')
    return texto[:m.end()], texto[m.end():fin], texto[fin:], m.group(1) or m.group(4), m.group(3)


def partir_glb(b):
    """(json dict, bin bytes|None). Lanza ValueError con el motivo si la estructura GLB no es válida."""
    if len(b) < 20:
        raise ValueError('demasiado corto para ser GLB')
    magic, ver, length = struct.unpack_from('<4sII', b, 0)
    if magic != b'glTF':
        raise ValueError('sin la firma glTF')
    if ver != 2:
        raise ValueError('versión GLB %d (se espera 2)' % ver)
    if length != len(b):
        raise ValueError('la cabecera dice %d bytes y hay %d' % (length, len(b)))
    off, chunks = 12, []
    while off < len(b):
        if off + 8 > len(b):
            raise ValueError('trozo truncado')
        clen, ctype = struct.unpack_from('<II', b, off)
        if off + 8 + clen > len(b):
            raise ValueError('trozo de %d bytes fuera del archivo' % clen)
        chunks.append((ctype, b[off + 8:off + 8 + clen]))
        off += 8 + clen
    if not chunks or chunks[0][0] != 0x4E4F534A:
        raise ValueError('el primer trozo no es JSON')
    try:
        j = json.loads(chunks[0][1].decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise ValueError('JSON del glTF ilegible: %s' % e)
    binc = chunks[1][1] if len(chunks) > 1 and chunks[1][0] == 0x004E4942 else None
    return j, binc


_COMP = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
_NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}


def validar_gltf(j, binc):
    """Comprueba índices y rangos del glTF. Devuelve (errores, info)."""
    E = []
    if (j.get('asset') or {}).get('version') != '2.0':
        E.append('asset.version no es 2.0')
    col = {k: j.get(k) or [] for k in ('buffers', 'bufferViews', 'accessors', 'images', 'textures', 'samplers', 'materials',
                                       'meshes', 'nodes', 'skins', 'animations', 'scenes', 'cameras')}

    def idx(v, coll, donde):
        if not isinstance(v, int) or v < 0 or v >= len(col[coll]):
            E.append('%s apunta a %s[%r], que no existe' % (donde, coll, v))
            return False
        return True

    blen = []
    for i, bf in enumerate(col['buffers']):
        L = bf.get('byteLength', 0)
        if 'uri' not in bf:
            if i != 0 or binc is None:
                E.append('buffers[%d] sin uri y sin trozo BIN' % i)
            elif L > len(binc):
                E.append('buffers[0] declara %d bytes y el BIN tiene %d' % (L, len(binc)))
        elif not bf['uri'].startswith('data:'):
            E.append('buffers[%d] usa un archivo externo (%s): el artifact necesita todo dentro del *_glb.js' % (i, bf['uri'][:60]))
        blen.append(L)
    for i, v in enumerate(col['bufferViews']):
        if idx(v.get('buffer'), 'buffers', 'bufferViews[%d]' % i):
            if v.get('byteOffset', 0) + v.get('byteLength', 0) > blen[v['buffer']]:
                E.append('bufferViews[%d] se sale del buffer' % i)
    for i, a in enumerate(col['accessors']):
        if a.get('componentType') not in _COMP or a.get('type') not in _NCOMP or a.get('count', 0) < 1:
            E.append('accessors[%d] con tipo o cantidad inválidos' % i)
            continue
        if 'bufferView' in a and idx(a['bufferView'], 'bufferViews', 'accessors[%d]' % i):
            v = col['bufferViews'][a['bufferView']]
            el = _COMP[a['componentType']] * _NCOMP[a['type']]
            if a['type'].startswith('MAT') and _COMP[a['componentType']] < 4:
                el = None  # matrices de 1-2 bytes llevan relleno por columna: no se comprueba el tamaño exacto
            if el:
                need = a.get('byteOffset', 0) + (v.get('byteStride') or el) * (a['count'] - 1) + el
                if need > v.get('byteLength', 0):
                    E.append('accessors[%d] necesita %d bytes y su bufferView tiene %d' % (i, need, v.get('byteLength', 0)))
    uris, img_bytes = [], 0
    for i, im in enumerate(col['images']):
        if 'bufferView' in im:
            if idx(im['bufferView'], 'bufferViews', 'images[%d]' % i) and binc is not None:
                v = col['bufferViews'][im['bufferView']]
                d = binc[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
                img_bytes += len(d)
                mt = im.get('mimeType')
                if mt == 'image/jpeg' and d[:3] != b'\xff\xd8\xff':
                    E.append('images[%d] dice JPEG y no lo es' % i)
                elif mt == 'image/png' and d[:8] != PNG_SIG:
                    E.append('images[%d] dice PNG y no lo es' % i)
                elif mt not in ('image/jpeg', 'image/png'):
                    E.append('images[%d] con mimeType %r (three r128 solo carga jpeg/png)' % (i, mt))
        elif 'uri' in im:
            if not im['uri'].startswith('data:'):
                uris.append(im['uri'])
        else:
            E.append('images[%d] sin bufferView ni uri' % i)
    for i, t in enumerate(col['textures']):
        if 'source' in t:
            idx(t['source'], 'images', 'textures[%d]' % i)
        if 'sampler' in t:
            idx(t['sampler'], 'samplers', 'textures[%d]' % i)

    def texrefs(o, donde):
        if isinstance(o, dict):
            for k, v in o.items():
                if k.endswith('Texture') and isinstance(v, dict) and 'index' in v:
                    idx(v['index'], 'textures', donde + '.' + k)
                texrefs(v, donde)
        elif isinstance(o, list):
            for v in o:
                texrefs(v, donde)
    for i, m in enumerate(col['materials']):
        texrefs(m, 'materials[%d]' % i)
    for i, m in enumerate(col['meshes']):
        if not m.get('primitives'):
            E.append('meshes[%d] sin primitivas' % i)
        for k, p in enumerate(m.get('primitives') or []):
            d = 'meshes[%d].primitives[%d]' % (i, k)
            if 'POSITION' not in (p.get('attributes') or {}):
                E.append(d + ' sin POSITION')
            for a, v in (p.get('attributes') or {}).items():
                idx(v, 'accessors', d + '.' + a)
            for t in p.get('targets') or []:
                for a, v in t.items():
                    idx(v, 'accessors', d + '.targets.' + a)
            if 'indices' in p:
                idx(p['indices'], 'accessors', d + '.indices')
            if 'material' in p:
                idx(p['material'], 'materials', d + '.material')
    for i, nd in enumerate(col['nodes']):
        for k, c in (('mesh', 'meshes'), ('skin', 'skins'), ('camera', 'cameras')):
            if k in nd:
                idx(nd[k], c, 'nodes[%d].%s' % (i, k))
        for c in nd.get('children') or []:
            idx(c, 'nodes', 'nodes[%d].children' % i)
    for i, s in enumerate(col['skins']):
        for jn in s.get('joints') or []:
            idx(jn, 'nodes', 'skins[%d].joints' % i)
        if 'inverseBindMatrices' in s:
            idx(s['inverseBindMatrices'], 'accessors', 'skins[%d].inverseBindMatrices' % i)
    for i, an in enumerate(col['animations']):
        for k, sm in enumerate(an.get('samplers') or []):
            idx(sm.get('input'), 'accessors', 'animations[%d].samplers[%d].input' % (i, k))
            idx(sm.get('output'), 'accessors', 'animations[%d].samplers[%d].output' % (i, k))
        for k, ch in enumerate(an.get('channels') or []):
            if not isinstance(ch.get('sampler'), int) or not 0 <= ch['sampler'] < len(an.get('samplers') or []):
                E.append('animations[%d].channels[%d] apunta a un sampler que no existe' % (i, k))
            if 'node' in (ch.get('target') or {}):
                idx(ch['target']['node'], 'nodes', 'animations[%d].channels[%d]' % (i, k))
    for i, sc in enumerate(col['scenes']):
        for nd in sc.get('nodes') or []:
            idx(nd, 'nodes', 'scenes[%d]' % i)
    if 'scene' in j:
        idx(j['scene'], 'scenes', 'scene')
    if not col['scenes'] or not col['meshes']:
        E.append('sin escenas o sin mallas')
    ext_req = set(j.get('extensionsRequired') or [])
    soportadas = {'KHR_materials_unlit', 'KHR_texture_transform', 'KHR_mesh_quantization', 'KHR_materials_pbrSpecularGlossiness'}
    if ext_req - soportadas:
        E.append('extensiones obligatorias que three r128 no trae sin decodificador: %s' % ', '.join(sorted(ext_req - soportadas)))
    return E, {'mallas': len(col['meshes']), 'imagenes': len(col['images']), 'bytes_imagenes': img_bytes, 'uris': uris,
               'nodos': len(col['nodes']), 'animaciones': len(col['animations'])}


def armar_glb(j, binc):
    js = json.dumps(j, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    js += b' ' * (-len(js) % 4)
    out = bytearray()
    total = 12 + 8 + len(js) + ((8 + len(binc) + (-len(binc) % 4)) if binc is not None else 0)
    out += struct.pack('<4sII', b'glTF', 2, total)
    out += struct.pack('<II', len(js), 0x4E4F534A) + js
    if binc is not None:
        pad = binc + b'\0' * (-len(binc) % 4)
        out += struct.pack('<II', len(pad), 0x004E4942) + pad
    return bytes(out)


def _remap_bufferviews(o, mapa):
    if isinstance(o, dict):
        for k, v in list(o.items()):
            if k == 'bufferView' and isinstance(v, int):
                o[k] = mapa[v]
            else:
                _remap_bufferviews(v, mapa)
    elif isinstance(o, list):
        for v in o:
            _remap_bufferviews(v, mapa)


def _usos_bufferviews(o, usos):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == 'bufferView' and isinstance(v, int):
                usos[v] = usos.get(v, 0) + 1
            else:
                _usos_bufferviews(v, usos)
    elif isinstance(o, list):
        for v in o:
            _usos_bufferviews(v, usos)


def reescribir_bin(j, binc, nuevos, quitar):
    """Rehace el BIN: nuevos = {bufferView: bytes}; quitar = bufferViews que ya nadie usa. Remapea los índices."""
    views = j['bufferViews']
    orden = sorted((k for k in range(len(views)) if views[k].get('buffer', 0) == 0 and k not in quitar),
                   key=lambda k: views[k].get('byteOffset', 0))
    out = bytearray()
    for k in orden:
        v = views[k]
        d = nuevos.get(k)
        if d is None:
            d = binc[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
        out += b'\0' * (-len(out) % 4)
        v['byteOffset'], v['byteLength'] = len(out), len(d)
        out += d
    out += b'\0' * (-len(out) % 4)
    if quitar:
        mapa, nuevas = {}, []
        for k, v in enumerate(views):
            if k not in quitar:
                mapa[k] = len(nuevas)
                nuevas.append(v)
        j['bufferViews'] = nuevas
        for clave in ('accessors', 'images', 'meshes', 'extensions'):
            if clave in j:
                _remap_bufferviews(j[clave], mapa)
    j['buffers'][0]['byteLength'] = len(out)
    return bytes(out)


def imagenes_embebidas(j, binc):
    out = []
    for i, im in enumerate(j.get('images') or []):
        if 'bufferView' in im and binc is not None:
            v = j['bufferViews'][im['bufferView']]
            out.append((i, im, binc[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]))
    return out


# ---------------------------------------------------------------- imágenes
def png_pixeles(b):
    """(ancho, alto, rgba ndarray HxWx4) para PNG de 8 bits sin entrelazar; None si no se soporta."""
    if np is None or b[:8] != PNG_SIG:
        return None
    pos, idat, ihdr, plte, trns = 8, bytearray(), None, None, None
    while pos + 8 <= len(b):
        L, typ = struct.unpack('>I4s', b[pos:pos + 8])
        data = b[pos + 8:pos + 8 + L]
        pos += 12 + L
        if typ == b'IHDR':
            ihdr = struct.unpack('>IIBBBBB', data)
        elif typ == b'PLTE':
            plte = data
        elif typ == b'tRNS':
            trns = data
        elif typ == b'IDAT':
            idat += data
        elif typ == b'IEND':
            break
    if not ihdr:
        return None
    w, h, bd, ct, _, _, inter = ihdr
    if bd != 8 or inter != 0 or ct not in (0, 2, 3, 4, 6):
        return None
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    try:
        raw = zlib.decompress(bytes(idat))
    except zlib.error:
        return None
    stride = w * ch
    if len(raw) < h * (stride + 1):
        return None
    out = np.zeros((h, stride), np.uint8)
    prev = np.zeros(stride, np.int32)
    p = 0
    for y in range(h):
        f = raw[p]
        line = np.frombuffer(raw, np.uint8, stride, p + 1).astype(np.int32)
        p += stride + 1
        if f == 1:
            line = line.reshape(w, ch)
            line = (np.cumsum(line, axis=0) & 255).reshape(-1)
        elif f == 2:
            line = (line + prev) & 255
        elif f in (3, 4):
            cur = line.tolist()
            pr = prev.tolist()
            for i in range(stride):
                a = cur[i - ch] if i >= ch else 0
                if f == 3:
                    cur[i] = (cur[i] + ((a + pr[i]) >> 1)) & 255
                else:
                    bb = pr[i]
                    c = pr[i - ch] if i >= ch else 0
                    pp = a + bb - c
                    pa, pb, pc = abs(pp - a), abs(pp - bb), abs(pp - c)
                    cur[i] = (cur[i] + (a if pa <= pb and pa <= pc else bb if pb <= pc else c)) & 255
            line = np.array(cur, np.int32)
        elif f != 0:
            return None
        out[y] = line
        prev = line
    px = out.reshape(h, w, ch)
    if ct == 6:
        rgba = px
    elif ct == 2:
        rgba = np.dstack([px, np.full((h, w, 1), 255, np.uint8)])
    elif ct == 0:
        rgba = np.dstack([px, px, px, np.full((h, w, 1), 255, np.uint8)])
    elif ct == 4:
        rgba = np.dstack([px[:, :, :1]] * 3 + [px[:, :, 1:2]])
    else:
        pal = np.frombuffer(plte, np.uint8).reshape(-1, 3)
        alpha = np.full(len(pal), 255, np.uint8)
        if trns:
            alpha[:len(trns)] = np.frombuffer(trns, np.uint8)[:len(pal)]
        rgba = np.dstack([pal[px[:, :, 0]], alpha[px[:, :, 0]][:, :, None]])
    if trns and ct in (0, 2):
        return w, h, rgba, False  # color transparente por tRNS: no se trata como opaca
    return w, h, rgba, bool((rgba[:, :, 3] == 255).all())


def leer_bmp(path):
    b = leer(path)
    off = struct.unpack_from('<I', b, 10)[0]
    w, h = struct.unpack_from('<ii', b, 18)
    bpp = struct.unpack_from('<H', b, 28)[0]
    if bpp not in (24, 32):
        raise ValueError('BMP de %d bits' % bpp)
    row = ((w * bpp // 8) + 3) & ~3
    a = np.frombuffer(b, np.uint8, row * abs(h), off).reshape(abs(h), row)[:, :w * bpp // 8].reshape(abs(h), w, bpp // 8)
    return a[:, :, :3].astype(np.float64)


def limpiar_jpeg(b):
    """Quita APP1 (Exif/XMP) y comentarios de un JPEG; no toca los datos de imagen."""
    if b[:2] != b'\xff\xd8':
        return b
    out, i = bytearray(b[:2]), 2
    while i + 4 <= len(b) and b[i] == 0xFF:
        m = b[i + 1]
        if m == 0xDA:
            break
        if m == 0xFF:
            i += 1
            continue
        L = struct.unpack_from('>H', b, i + 2)[0]
        if m not in (0xE1, 0xFE):
            out += b[i:i + 2 + L]
        i += 2 + L
    out += b[i:]
    return bytes(out)


class Texturas:
    """Recompresión con sips medida con PSNR; resultados en caché por hash (salida idéntica entre builds)."""

    def __init__(self, cfg, cache_dir):
        self.cfg = cfg
        self.cache = cache_dir
        self.hits = self.misses = 0
        self.patron_normal = re.compile(cfg['patron_normal'], re.I)
        if cache_dir:
            os.makedirs(cache_dir, exist_ok=True)

    def _sips(self, args):
        r = subprocess.run(['sips'] + args, capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            raise RuntimeError('sips falló: ' + (r.stderr or r.stdout).strip()[:200])

    def _decodificar(self, src, tmp, tag):
        out = os.path.join(tmp, tag + '.bmp')
        self._sips(['-s', 'format', 'bmp', src, '--out', out])
        return leer_bmp(out)

    @staticmethod
    def _psnr(a, b):
        if a.shape != b.shape:
            return 0.0
        m = float(np.mean((a - b) ** 2))
        return 99.0 if m == 0 else 10 * np.log10(255.0 * 255.0 / m)

    def optimizar(self, data, mime, nombre, embebida):
        """→ dict(datos, mime, cambio, psnr, calidad, motivo)."""
        params = dict(self.cfg, v=VERSION, mime=mime, embebida=embebida, normal=bool(self.patron_normal.search(nombre)))
        params.pop('_nota', None)
        clave = sha256(data + json.dumps(params, sort_keys=True).encode())
        if self.cache:
            meta_p = os.path.join(self.cache, clave + '.json')
            if os.path.exists(meta_p):
                try:
                    meta = json.loads(leer(meta_p, 'r'))
                    datos = leer(os.path.join(self.cache, clave + '.bin')) if meta['cambio'] else data
                    if not meta['cambio'] or sha256(datos) == meta['sha256']:
                        self.hits += 1
                        meta['datos'] = datos
                        return meta
                except (OSError, ValueError, KeyError):
                    pass
        self.misses += 1
        try:
            res = self._optimizar(data, mime, params['normal'], embebida)
        except (RuntimeError, ValueError, OSError, subprocess.SubprocessError) as e:
            return {'datos': data, 'mime': mime, 'cambio': False, 'psnr': None, 'calidad': None, 'motivo': 'error: %s' % e}
        if self.cache:
            if res['cambio']:
                escribir(os.path.join(self.cache, clave + '.bin'), res['datos'])
            meta = {k: v for k, v in res.items() if k != 'datos'}
            meta['sha256'] = sha256(res['datos'])
            escribir(os.path.join(self.cache, clave + '.json'), json.dumps(meta).encode())
        return res

    def _optimizar(self, data, mime, normal, embebida):
        sin = {'datos': data, 'mime': mime, 'cambio': False, 'psnr': None, 'calidad': None, 'motivo': ''}
        if np is None:
            sin['motivo'] = 'sin numpy'
            return sin
        umbral = self.cfg['psnr_normal'] if normal else self.cfg['psnr_color']
        limite = len(data) * (1 - self.cfg['ahorro_min'])
        cands = []
        with tempfile.TemporaryDirectory(prefix='avtex-') as tmp:
            ext = '.jpg' if mime == 'image/jpeg' else '.png'
            orig = os.path.join(tmp, 'o' + ext)
            escribir(orig, data)
            jpeg_ok = mime == 'image/jpeg'
            if mime == 'image/png':
                info = png_pixeles(data)
                if info is None:
                    sin['motivo'] = 'PNG no soportado por el verificador (16 bits o entrelazado)'
                    return sin
                _, _, rgba, opaca = info
                rec = os.path.join(tmp, 'r.png')
                self._sips(['-s', 'format', 'png', orig, '--out', rec])
                rb = leer(rec)
                if len(rb) <= limite:
                    i2 = png_pixeles(rb)
                    if i2 is not None and i2[2].shape == rgba.shape and (i2[2] == rgba).all():
                        cands.append((len(rb), rb, 'image/png', 99.0, None))
                jpeg_ok = embebida and opaca  # un PNG externo conserva su extensión; con alfa no puede ser JPEG
            if jpeg_ok:
                A = self._decodificar(orig, tmp, 'a')
                for q in self.cfg['calidades_jpeg']:
                    c = os.path.join(tmp, 'q%d.jpg' % q)
                    self._sips(['-s', 'format', 'jpeg', '-s', 'formatOptions', str(q), orig, '--out', c])
                    cb = limpiar_jpeg(leer(c))
                    if len(cb) > limite:
                        continue
                    escribir(c, cb)
                    p = self._psnr(A, self._decodificar(c, tmp, 'q%d' % q))
                    if p >= umbral:
                        cands.append((len(cb), cb, 'image/jpeg', round(p, 2), q))
        if not cands:
            sin['motivo'] = 'sin ahorro >= %d%% con PSNR >= %.0f dB' % (self.cfg['ahorro_min'] * 100, umbral)
            return sin
        n, cb, m, p, q = min(cands, key=lambda c: c[0])
        return {'datos': cb, 'mime': m, 'cambio': True, 'psnr': p, 'calidad': q, 'motivo': 'sips' + (' q%d' % q if q else ' sin pérdida')}


# ---------------------------------------------------------------- análisis de referencias
def uris_gltf(path):
    """uris externas (no data:) de imágenes y buffers de un *_glb.js; [] si no decodifica (el error lo da la validación)."""
    try:
        _, b64, _, _, _ = leer_glb_js(leer(path).decode('utf-8'))
        j, _ = partir_glb(base64.b64decode(b64))
    except (ValueError, binascii.Error, UnicodeDecodeError):
        return []
    return [x['uri'] for k in ('images', 'buffers') for x in j.get(k) or [] if x.get('uri') and not es_especial(x['uri'])]


# Sufijos que el código pega a un nombre dinámico ('assets/models/edificios/' + n + '_lejos.glb'): '_lejos'
SUFIJO_RE = re.compile(r'''['"`](_[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*?)(?:_glb\.js|\.glb|\.js|\.png|\.jpe?g|\.json)?['"`]''')


def analizar(sitio, cfg):
    """Recorre lo que alcanza el juego desde index.html, src/ y content/ (punto fijo). Devuelve un dict con todo."""
    files = listar(sitio)
    existe = set(files)
    raices = {'index.html'} | {f for f in files if f.startswith(('src/', 'content/')) and ext_de(f) in CODE_EXT}
    motivo = {f: 'raíz' for f in raices}
    alcanzado, pendientes = set(), sorted(raices)
    refs, rotas, externas, dinamicos, tokens, sufijos = [], [], [], {}, set(), set()
    html_refs = []

    def destino(t):
        if t in existe:
            return t
        if t.endswith('.glb') and t[:-4] + '_glb.js' in existe:
            return t[:-4] + '_glb.js'
        return None

    def ref_local(origen, ln, u, base_dir='', tipo='literal'):
        t = normalizar(u, base_dir)
        if t is None:
            rotas.append({'origen': origen, 'linea': ln, 'ref': u, 'motivo': 'ruta absoluta o fuera del sitio'})
            return
        d = destino(t)
        refs.append({'origen': origen, 'linea': ln, 'ref': t, 'resuelve': d, 'tipo': tipo})
        if d is None:
            m = 'falta %s (el artifact no sirve .glb)' % (t[:-4] + '_glb.js') if t.endswith('.glb') else 'no existe en la build'
            rotas.append({'origen': origen, 'linea': ln, 'ref': t, 'motivo': m})
        elif d not in alcanzado:
            motivo.setdefault(d, 'referencia en %s:%d' % (origen, ln))
            pendientes.append(d)

    def escanear_js(origen, txt, ln0=1):
        s = js_sin_comentarios(txt)
        for m in PATH_RE.finditer(s):
            ref_local(origen, ln0 + linea_de(s, m.start()) - 1, m.group(1))
        for m in DIR_RE.finditer(s):
            d = normalizar(m.group(1)) + '/'
            dinamicos.setdefault(d, []).append('%s:%d' % (origen, ln0 + linea_de(s, m.start()) - 1))
        tokens.update(TOKEN_RE.findall(s))
        sufijos.update(m.group(1) for m in SUFIJO_RE.finditer(s))
        for m in URL_RE.finditer(s):
            ini = s.rfind('\n', 0, m.start()) + 1
            externas.append({'origen': origen, 'linea': ln0 + linea_de(s, m.start()) - 1, 'url': m.group(0), 'tipo': 'js',
                             'contexto_fetch': bool(FETCH_CTX.search(s[max(ini, m.start() - 160):m.start()]))})

    def escanear_css(origen, txt, base_dir, ln0=1):
        s = css_sin_comentarios(txt)
        for m in CSS_URL_RE.finditer(s):
            u = (m.group(2) or m.group(4) or '').strip()
            ln = ln0 + linea_de(s, m.start()) - 1
            if es_especial(u):
                continue
            if es_externa(u):
                externas.append({'origen': origen, 'linea': ln, 'url': u, 'tipo': 'css', 'contexto_fetch': True})
            else:
                ref_local(origen, ln, u, base_dir, 'css')
        tokens.update(TOKEN_RE.findall(s))

    while True:
        while pendientes:
            f = pendientes.pop()
            if f in alcanzado:
                continue
            alcanzado.add(f)
            e = ext_de(f)
            if f.endswith('_glb.js'):
                # Texturas externas del glTF (uri relativa a la carpeta del *_glb.js: el cargador pasa base = esa carpeta)
                for u in uris_gltf(os.path.join(sitio, f)):
                    ref_local(f, 1, u, posixpath.dirname(f), 'gltf')
                continue
            if e not in TEXT_EXT:
                continue
            txt = leer(os.path.join(sitio, f)).decode('utf-8', 'replace')
            base_dir = posixpath.dirname(f)
            if e in ('.html', '.htm'):
                p = HTMLRefs()
                p.feed(txt)
                for tipo, u, ln in p.refs:
                    html_refs.append({'origen': f, 'linea': ln, 'tipo': tipo, 'url': u})
                    if es_especial(u):
                        continue
                    if es_externa(u):
                        externas.append({'origen': f, 'linea': ln, 'url': u, 'tipo': 'html:' + tipo, 'contexto_fetch': True})
                    else:
                        ref_local(f, ln, u, base_dir, 'html:' + tipo)
                for code, ln in p.js:
                    escanear_js(f, code, ln)
                for code, ln in p.css:
                    escanear_css(f, code, base_dir, ln)
            elif e in ('.js', '.mjs'):
                escanear_js(f, txt)
            elif e == '.css':
                escanear_css(f, txt, base_dir)
            else:  # datos (json, txt…): rutas literales, tokens y URLs (estas como enlaces)
                for m in PATH_RE.finditer(txt):
                    ref_local(f, linea_de(txt, m.start()), m.group(1), tipo='dato')
                tokens.update(TOKEN_RE.findall(txt))
                for m in URL_RE.finditer(txt):
                    externas.append({'origen': f, 'linea': linea_de(txt, m.start()), 'url': m.group(0), 'tipo': 'dato', 'contexto_fetch': False})
        # Carpetas con nombre dinámico ('assets/models/ropa/' + nombre + …): entra lo que tenga su nombre como token
        nuevos = False
        for d, donde in sorted(dinamicos.items()):
            for f in existe:
                st = stem_de(f)
                if f in alcanzado or posixpath.dirname(f) + '/' != d:
                    continue
                suf = next((x for x in sorted(sufijos) if st.endswith(x) and st[:-len(x)] in tokens), None)
                if st in tokens or suf:
                    motivo.setdefault(f, 'carpeta dinámica %s + "%s"%s (%s)' % (d, st, ' (nombre + "%s")' % suf if suf and st not in tokens else '', donde[0]))
                    pendientes.append(f)
                    nuevos = True
        if not nuevos:
            break
    return {'files': files, 'alcanzado': alcanzado, 'motivo': motivo, 'refs': refs, 'rotas': rotas, 'externas': externas,
            'dinamicos': dinamicos, 'html_refs': html_refs}


def clasificar_externas(an, cfg):
    H = cfg['hosts_permitidos']
    ok_scripts, ok_estilos, ok_fuentes = set(H['scripts']), set(H['estilos']), set(H['fuentes'])
    todos = ok_scripts | ok_estilos | ok_fuentes
    errores, permitidas, enlaces = [], [], []
    for x in an['externas']:
        h, t, u = host_de(x['url']), x['tipo'], x['url']
        if any(h == n or h.endswith('.' + n) for n in cfg['espacios_xml']):
            continue
        item = dict(x, host=h)
        if t == 'html:script':
            if h not in ok_scripts:
                errores.append(dict(item, motivo='<script> desde un dominio no permitido'))
            elif not VERSION_PIN.search(u):
                errores.append(dict(item, motivo='<script> de CDN sin versión exacta'))
            else:
                permitidas.append(item)
        elif t.startswith('html:link'):
            rel = t.split(':', 2)[-1]
            if 'stylesheet' in rel:
                (permitidas if h in ok_estilos else errores).append(item if h in ok_estilos else dict(item, motivo='hoja de estilo desde un dominio no permitido'))
            elif any(r in rel for r in ('preconnect', 'dns-prefetch', 'preload', 'prefetch', 'modulepreload')):
                (permitidas if h in todos else errores).append(item if h in todos else dict(item, motivo='<link rel=%s> a un dominio no permitido' % rel))
            elif rel in ('icon', 'shortcut icon', 'apple-touch-icon', 'manifest'):
                errores.append(dict(item, motivo='<link rel=%s> externo (descarga desde otro dominio)' % rel))
            else:
                enlaces.append(item)
        elif t.startswith('html:'):
            errores.append(dict(item, motivo='<%s> externo (descarga desde otro dominio)' % t[5:]))
        elif t == 'css':
            (permitidas if h in (ok_estilos | ok_fuentes) else errores).append(item if h in (ok_estilos | ok_fuentes) else dict(item, motivo='url() o @import a otro dominio'))
        elif h in todos:
            permitidas.append(item)
        elif x['contexto_fetch']:
            errores.append(dict(item, motivo='posible descarga desde un dominio no permitido'))
        else:
            enlaces.append(item)
    return errores, permitidas, enlaces


# ---------------------------------------------------------------- pasos
def paso_limpiar(sitio, cfg, reg):
    quitados, comparados = [], 0
    files = listar(sitio)
    for f in files:
        if f.endswith('.glb') and f[:-4] + '_glb.js' in files:
            try:
                _, b64, _, _, _ = leer_glb_js(leer(os.path.join(sitio, f[:-4] + '_glb.js')).decode('utf-8'))
                comparados += 1
                if base64.b64decode(b64) != leer(os.path.join(sitio, f)):
                    reg.add('aviso', 'limpiar', '%s no coincide con %s: el artifact usará la copia base64 (desactualizada respecto al .glb)' % (f[:-4] + '_glb.js', f), archivo=f)
            except (ValueError, binascii.Error, UnicodeDecodeError):
                pass  # el error de forma lo da la validación
        if any(fnmatch.fnmatch(posixpath.basename(f), p) for p in cfg['quitar_siempre']):
            os.remove(os.path.join(sitio, f))
            quitados.append(f)
    for d, subdirs, fs in sorted(os.walk(sitio, topdown=False)):
        if d != sitio and not os.listdir(d):
            os.rmdir(d)
    return {'quitados': len(quitados), 'bytes': sum(files[f] for f in quitados), 'glb_comparados': comparados}


MARCA_RE = re.compile(r'<meta\s+name="ave:(?:sin-glb|build)"[^>]*>\s*', re.I)


def paso_marcar(sitio, ref, commit, reg):
    """Marca index.html de la build: <meta name="ave:sin-glb"> (assets.js va directo al *_glb.js, sin sondear el .glb)
    y <meta name="ave:build"> con el ref y el commit (para saber qué build está publicada)."""
    p = os.path.join(sitio, 'index.html')
    if not os.path.exists(p):
        return None
    if any(f.endswith('.glb') for f in listar(sitio)):
        reg.add('error', 'marcar', 'quedan .glb en la build: no se puede marcar ave:sin-glb')
        return None
    txt = MARCA_RE.sub('', leer(p).decode('utf-8'))
    marca = '<meta name="ave:sin-glb" content="1">\n<meta name="ave:build" content="%s %s">\n' % (
        re.sub(r'[^\w./@+-]', '_', ref)[:60], commit[:12])
    m = re.search(r'<meta\s+charset=[^>]*>\s*', txt, re.I) or re.search(r'<head[^>]*>\s*', txt, re.I) or re.search(r'<html[^>]*>\s*', txt, re.I)
    if not m:
        reg.add('error', 'marcar', 'index.html sin <meta charset>, <head> ni <html>: no sé dónde poner la marca')
        return None
    escribir(p, (txt[:m.end()] + marca + txt[m.end():]).encode('utf-8'))
    return marca.strip().splitlines()


def paso_validar(sitio, cfg, reg, paso, estricto, subdirs_tex=()):
    an = analizar(sitio, cfg)
    files = an['files']
    L = cfg['limites']
    # index.html
    scripts = [r for r in an['html_refs'] if r['origen'] == 'index.html' and r['tipo'] == 'script']
    if not os.path.exists(os.path.join(sitio, 'index.html')):
        reg.add('error', paso, 'no hay index.html en la raíz')
    if not scripts:
        reg.add('error', paso, 'index.html no carga ningún <script src>')
    for r in an['rotas']:
        reg.add('error', paso, 'referencia rota: %s (%s:%s) · %s' % (r['ref'], r['origen'], r['linea'], r['motivo']))
    # glTF
    glb_ok, glb_info, globales = 0, {}, {}
    for f in files:
        if not f.endswith('_glb.js'):
            continue
        try:
            pre, b64, post, glob, clave = leer_glb_js(leer(os.path.join(sitio, f)).decode('utf-8'))
            b = base64.b64decode(b64, validate=True)
            j, binc = partir_glb(b)
            E, info = validar_gltf(j, binc)
            if clave is not None and clave != stem_de(f):
                E.append('la clave ["%s"] no coincide con el nombre del archivo ("%s"): el cargador la busca por nombre' % (clave, stem_de(f)))
            for u in info['uris']:
                t = normalizar(u, posixpath.dirname(f))
                if t is None or t not in files:
                    E.append('textura externa %s no existe en la build' % u)
            for e in E:
                reg.add('error', paso, '%s: %s' % (f, e), archivo=f)
            if not E:
                glb_ok += 1
            if clave is not None:  # los kits (ropa, entorno, edificios, mapa) comparten un global con claves por nombre
                globales.setdefault(posixpath.dirname(f), set()).add(glob)
            glb_info[f] = dict(info, glb_bytes=len(b), global_=glob)
        except (ValueError, binascii.Error, UnicodeDecodeError) as e:
            reg.add('error', paso, '%s no decodifica a un glTF válido: %s' % (f, e), archivo=f)
    for d, gs in globales.items():
        if len(gs) > 1:
            reg.add('aviso', paso, '%s/ mezcla globales base64 (%s)' % (d, ', '.join(sorted(gs))))
    # límites
    tot = sum(files.values())
    if len(files) > L['archivos_max']:
        reg.add('error', paso, '%d archivos (máximo %d por publicación)' % (len(files), L['archivos_max']))
    if tot > L['total_max_mb'] * MB:
        reg.add('error', paso, '%.2f MB (máximo %d MB por publicación)' % (tot / MB, L['total_max_mb']))
    for f, s in files.items():
        if s > L['archivo_max_mb'] * MB:
            reg.add('error', paso, '%s pesa %.2f MB (máximo %d MB por archivo)' % (f, s / MB, L['archivo_max_mb']))
    if tot > L['objetivo_mb'] * MB:
        reg.add('error' if estricto else 'aviso', paso, '%.2f MB, por encima del objetivo de %d MB' % (tot / MB, L['objetivo_mb']))
    # URLs externas
    errores, permitidas, enlaces = clasificar_externas(an, cfg)
    for x in errores:
        reg.add('error', paso, 'URL externa no permitida: %s (%s:%s) · %s' % (x['url'], x['origen'], x['linea'], x['motivo']))
    return {
        'analisis': an, 'archivos': len(files), 'bytes': tot, 'mb': mb(tot),
        'scripts_index': len(scripts), 'referencias': len(an['refs']), 'rotas': len(an['rotas']),
        'glb_validos': glb_ok, 'glb_total': sum(1 for f in files if f.endswith('_glb.js')), 'glb_info': glb_info,
        'externas_permitidas': sorted({x['url'] for x in permitidas}),
        'enlaces_externos': sorted({x['host'] for x in enlaces}), 'enlaces_n': len(enlaces),
        'externas_error': len(errores),
        'carpetas_dinamicas': sorted(an['dinamicos']),
    }


def paso_podar(sitio, cfg, an, reg):
    P = cfg['podar']
    exts = {'.' + e for e in P['extensiones']}
    podados = []
    for f, s in an['files'].items():
        cand = f.endswith('_glb.js') or ext_de(f) in exts
        if any(fnmatch.fnmatch(f, p) for p in P['quitar']):
            motivo = 'config podar.quitar'
        elif not cand or f in an['alcanzado'] or any(fnmatch.fnmatch(f, p) for p in P['conservar']):
            continue
        else:
            gemelo = os.path.splitext(f)[0] + '.js'
            motivo = 'fuente .json con copia .js (no se carga)' if ext_de(f) == '.json' and gemelo in an['files'] else 'nada lo referencia'
        os.remove(os.path.join(sitio, f))
        podados.append({'archivo': f, 'bytes': s, 'motivo': motivo})
    for d, _, _ in sorted(os.walk(sitio, topdown=False)):
        if d != sitio and not os.listdir(d):
            os.rmdir(d)
    return podados


def _trabajos(tx, items, hilos):
    """items: [(clave, datos, mime, nombre, embebida)] únicos → {clave: resultado}."""
    out = {}
    with cf.ThreadPoolExecutor(max_workers=hilos) as ex:
        futs = {ex.submit(tx.optimizar, d, m, n, e): k for k, d, m, n, e in items}
        for fu in cf.as_completed(futs):
            out[futs[fu]] = fu.result()
    return out


def paso_texturas(sitio, cfg, tx, reg, hilos):
    files = listar(sitio)
    externas = [f for f in files if ext_de(f) in ('.png', '.jpg', '.jpeg')]
    glbs = {}
    unicos = {}
    for f in externas:
        d = leer(os.path.join(sitio, f))
        mime = 'image/png' if d[:8] == PNG_SIG else 'image/jpeg' if d[:3] == b'\xff\xd8\xff' else None
        if mime:
            unicos.setdefault((sha256(d), False), (d, mime, f, False))
    for f in files:
        if not f.endswith('_glb.js'):
            continue
        pre, b64, post, _, _ = leer_glb_js(leer(os.path.join(sitio, f)).decode('utf-8'))
        j, binc = partir_glb(base64.b64decode(b64))
        glbs[f] = (pre, post, j, binc)
        for i, im, d in imagenes_embebidas(j, binc):
            if im.get('mimeType') in ('image/png', 'image/jpeg'):
                unicos.setdefault((sha256(d), True), (d, im['mimeType'], im.get('name') or f, True))
    res = _trabajos(tx, [(k, d, m, n, e) for k, (d, m, n, e) in unicos.items()], hilos)
    cambios = []
    for f in externas:
        d = leer(os.path.join(sitio, f))
        r = res.get((sha256(d), False))
        if r and r['cambio']:
            escribir(os.path.join(sitio, f), r['datos'])
            cambios.append({'archivo': f, 'antes': len(d), 'despues': len(r['datos']), 'psnr': r['psnr'], 'calidad': r['calidad'], 'mime': r['mime']})
    for f, (pre, post, j, binc) in glbs.items():
        nuevos = {}
        for i, im, d in imagenes_embebidas(j, binc):
            r = res.get((sha256(d), True))
            if r and r['cambio']:
                nuevos[im['bufferView']] = r['datos']
                cambios.append({'archivo': '%s#%s' % (f, im.get('name') or i), 'antes': len(d), 'despues': len(r['datos']),
                                'psnr': r['psnr'], 'calidad': r['calidad'], 'mime': r['mime'], 'de': im.get('mimeType')})
                im['mimeType'] = r['mime']
        if nuevos:
            binc2 = reescribir_bin(j, binc, nuevos, set())
            b64 = base64.b64encode(armar_glb(j, binc2)).decode('ascii')
            escribir(os.path.join(sitio, f), (pre + b64 + post).encode('utf-8'))
    return {'unicas': len(unicos), 'cambiadas': len(cambios), 'cambios': cambios,
            'ahorro_bytes_crudos': sum(c['antes'] - c['despues'] for c in cambios),
            'psnr_min': min([c['psnr'] for c in cambios if c['psnr']] or [None]) if cambios else None}


def _slug(s):
    return re.sub(r'[^A-Za-z0-9_-]+', '_', s).strip('_')[:40] or 'tex'


def paso_compartidas(sitio, cfg, reg):
    C = cfg['texturas_compartidas']
    files = listar(sitio)
    grupos = []
    for carpeta in C['carpetas']:
        glbs = {}
        uso = {}
        for f in files:
            if posixpath.dirname(f) + '/' != carpeta or not f.endswith('_glb.js'):
                continue
            pre, b64, post, _, _ = leer_glb_js(leer(os.path.join(sitio, f)).decode('utf-8'))
            j, binc = partir_glb(base64.b64decode(b64))
            glbs[f] = (pre, post, j, binc)
            for i, im, d in imagenes_embebidas(j, binc):
                h = sha256(d)
                uso.setdefault(h, {'datos': d, 'mime': im.get('mimeType'), 'nombre': im.get('name') or 'tex', 'glbs': set()})['glbs'].add(f)
        salen = {h: u for h, u in uso.items() if len(u['glbs']) >= C['min_repeticiones']}
        if not salen:
            continue
        for h, u in salen.items():
            ext = '.jpg' if u['mime'] == 'image/jpeg' else '.png'
            u['archivo'] = carpeta + 'tex/' + _slug(u['nombre']) + '-' + h[:10] + ext
            escribir(os.path.join(sitio, u['archivo']), u['datos'])
            grupos.append({'archivo': u['archivo'], 'bytes': len(u['datos']), 'glbs': sorted(u['glbs']), 'repeticiones': len(u['glbs'])})
        for f, (pre, post, j, binc) in glbs.items():
            usos = {}
            _usos_bufferviews({k: v for k, v in j.items() if k != 'bufferViews'}, usos)
            quitar, cambiado = set(), False
            for i, im, d in imagenes_embebidas(j, binc):
                u = salen.get(sha256(d))
                if not u:
                    continue
                bv = im.pop('bufferView')
                im['uri'] = posixpath.relpath(u['archivo'], carpeta.rstrip('/'))
                cambiado = True
                usos[bv] -= 1
                if usos[bv] == 0:
                    quitar.add(bv)
            if cambiado:
                binc2 = reescribir_bin(j, binc, {}, quitar)
                b64 = base64.b64encode(armar_glb(j, binc2)).decode('ascii')
                escribir(os.path.join(sitio, f), (pre + b64 + post).encode('utf-8'))
    return grupos


def duplicados_archivos(sitio):
    por_hash = {}
    for f, s in listar(sitio).items():
        por_hash.setdefault(sha256(leer(os.path.join(sitio, f))), []).append(f)
    return [sorted(v) for v in por_hash.values() if len(v) > 1]


# ---------------------------------------------------------------- reporte
def tabla(filas, cab):
    out = ['| ' + ' | '.join(cab) + ' |', '|' + '|'.join('---' for _ in cab) + '|']
    out += ['| ' + ' | '.join(str(c) for c in f) + ' |' for f in filas]
    return '\n'.join(out)


def escribir_reporte(salida, R):
    md = []
    est = 'PASA' if R['estado'] == 'ok' else 'FALLA'
    md.append('# Build de Amazona Verse · %s\n' % est)
    md.append('- Ref: `%s` → commit `%s` (%s)' % (R['ref'], R['commit'], R['commit_fecha']))
    md.append('- Generada: %s · avbuild %s · %s' % (R['generado'], VERSION, 'optimizada' if R['optimizada'] else 'sin optimizar (proceso manual de hoy)'))
    md.append('- Para publicar: `%s` (%d archivos, %.2f MB) · huella `%s`\n' % (R['manifiesto'], R['final']['archivos'], R['final']['mb'], R['huella'][:16]))
    md.append('## Peso: antes y después\n')
    filas, prev = [], None
    for et in R['etapas']:
        ah = '' if prev is None else '%+.2f MB' % (et['mb'] - prev)
        filas.append([et['nombre'], et['archivos'], '%.2f' % et['mb'], ah])
        prev = et['mb']
    md.append(tabla(filas, ['Etapa', 'Archivos', 'MB', 'Cambio']))
    base, fin = R['etapas'][1], R['etapas'][-1]
    md.append('\nAntes (proceso manual: export sin .glb/.blend): **%.2f MB, %d archivos**. Después: **%.2f MB, %d archivos** (%.1f %% menos). Objetivo: %d MB.\n'
              % (base['mb'], base['archivos'], fin['mb'], fin['archivos'], 100 * (1 - fin['mb'] / base['mb']) if base['mb'] else 0, R['limites']['objetivo_mb']))
    V = R['validacion_final']
    md.append('## Validación final\n')
    md.append(tabla([
        ['`<script src>` de index.html', '%d, todos existen' % V['scripts_index'] if not V['rotas'] else '%d' % V['scripts_index']],
        ['Rutas literales (index, src, content, datos, css)', '%d comprobadas, %d rotas' % (V['referencias'], V['rotas'])],
        ['Carpetas con nombre dinámico (se prueban en test.sh)', ', '.join('`%s`' % d for d in V['carpetas_dinamicas']) or '—'],
        ['*_glb.js → glTF 2.0 válido', '%d de %d' % (V['glb_validos'], V['glb_total'])],
        ['Archivos (máx. %d)' % R['limites']['archivos_max'], V['archivos']],
        ['Total (máx. %d MB, objetivo %d MB)' % (R['limites']['total_max_mb'], R['limites']['objetivo_mb']), '%.2f MB' % V['mb']],
        ['Mayor archivo (máx. %d MB)' % R['limites']['archivo_max_mb'], '%s (%.2f MB)' % (R['mayor'][0], R['mayor'][1] / MB)],
        ['URLs externas no permitidas', V['externas_error']],
        ['URLs externas permitidas', ', '.join(V['externas_permitidas']) or 'ninguna'],
        ['Enlaces externos (citas; no se descargan)', '%d en %s' % (V['enlaces_n'], ', '.join(V['enlaces_externos'])) if V['enlaces_n'] else 'ninguno'],
    ], ['Comprobación', 'Resultado']))
    for nivel, titulo in (('error', 'Errores'), ('aviso', 'Avisos')):
        it = [i for i in R['registro'] if i['nivel'] == nivel]
        if it:
            md.append('\n## %s (%d)\n' % (titulo, len(it)))
            md += ['- [%s] %s' % (i['paso'], i['msg']) for i in it[:200]]
    if R.get('podados'):
        md.append('\n## Podados (%d, %.2f MB)\n' % (len(R['podados']), sum(p['bytes'] for p in R['podados']) / MB))
        md.append(tabla([[p['archivo'], '%.1f KB' % (p['bytes'] / 1024), p['motivo']] for p in R['podados']], ['Archivo', 'Tamaño', 'Motivo']))
    T = R.get('texturas')
    if T:
        md.append('\n## Texturas con sips\n')
        md.append('%d texturas únicas revisadas, %d recomprimidas, %.2f MB menos en crudo (%.2f MB en la build contando base64). PSNR mínimo aceptado: %s dB. Caché: %d aciertos, %d nuevas.\n'
                  % (T['unicas'], T['cambiadas'], T['ahorro_bytes_crudos'] / MB, T['ahorro_build_mb'], T['psnr_min'] if T['psnr_min'] else '—', T['cache_hits'], T['cache_misses']))
        if T['cambios']:
            top = sorted(T['cambios'], key=lambda c: c['despues'] - c['antes'])[:25]
            md.append(tabla([[c['archivo'], '%.1f → %.1f KB' % (c['antes'] / 1024, c['despues'] / 1024), c.get('calidad') or 'sin pérdida',
                              c['psnr'] if c['psnr'] and c['psnr'] < 99 else 'idéntica'] for c in top], ['Textura', 'Tamaño', 'Calidad', 'PSNR dB']))
    G = R.get('compartidas')
    if G:
        md.append('\n## Texturas compartidas (duplicadas entre glTF)\n')
        md.append('%d texturas que se repetían salen a `tex/` una sola vez: %.2f MB menos.\n' % (len(G), R['compartidas_ahorro_mb']))
        md.append(tabla([[g['archivo'], g['repeticiones'], '%.1f KB' % (g['bytes'] / 1024)] for g in sorted(G, key=lambda g: -g['bytes'] * g['repeticiones'])],
                        ['Archivo', 'glTF que la usan', 'Tamaño']))
    md.append('\n## Frente a lo publicado\n')
    if R.get('quitar') is None:
        md.append('Sin `--anterior`: no se calcularon los huérfanos. Antes de publicar, vuelve a correr la build con la lista de archivos del artifact.')
    else:
        md.append('Con `%s`: %d huérfanos que la publicación debe quitar (van como `null` en `artifact.files_map` del manifiesto).\n'
                  % (R['anterior'], len(R['quitar'])))
        md += ['- `%s`' % q for q in R['quitar'][:300]]
    if R.get('duplicados'):
        md.append('\n## Archivos idénticos que siguen en la build\n')
        md += ['- ' + ', '.join(d) for d in R['duplicados']]
    escribir(os.path.join(salida, 'reporte-build.md'), ('\n'.join(md) + '\n').encode('utf-8'))
    R2 = {k: v for k, v in R.items()}
    escribir(os.path.join(salida, 'reporte-build.json'), json.dumps(R2, ensure_ascii=False, indent=1, default=list).encode('utf-8'))


def leer_anterior(path, reg):
    """Rutas de lo publicado: un manifiesto.json anterior, una lista JSON o el texto de la lista de archivos del artifact
    (Artifact list scope=files: líneas «- "ruta"  tipo  bytes») o una ruta por línea."""
    try:
        txt = leer(path).decode('utf-8')
    except OSError as e:
        reg.add('error', 'manifiesto', 'no puedo leer --anterior %s: %s' % (path, e))
        return None
    try:
        j = json.loads(txt)
        if isinstance(j, dict) and 'archivos' in j:
            return [x['ruta'] for x in j['archivos']]
        if isinstance(j, list):
            return [x if isinstance(x, str) else x['ruta'] for x in j]
    except ValueError:
        pass
    out = []
    for ln in txt.splitlines():
        m = re.match(r'^\s*-\s*"([^"]+)"', ln) or re.match(r'^\s*([\w.@-][\w./@-]*\.[A-Za-z0-9]+)\s*$', ln)
        if m:
            out.append(m.group(1))
    if not out:
        reg.add('error', 'manifiesto', '--anterior %s no tiene rutas reconocibles' % path)
        return None
    return out


# ---------------------------------------------------------------- principal
def main():
    ap = argparse.ArgumentParser(description='Build reproducible de Amazona Verse (artifact)')
    ap.add_argument('--sitio', required=True)
    ap.add_argument('--salida', required=True)
    ap.add_argument('--ref', required=True)
    ap.add_argument('--commit', required=True)
    ap.add_argument('--commit-fecha', default='')
    ap.add_argument('--repo', default='')
    ap.add_argument('--config', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json'))
    ap.add_argument('--sin-optimizar', action='store_true')
    ap.add_argument('--sin-texturas-compartidas', action='store_true')
    ap.add_argument('--sin-cache', action='store_true')
    ap.add_argument('--estricto', action='store_true')
    ap.add_argument('--hilos', type=int, default=min(8, os.cpu_count() or 4))
    ap.add_argument('--anterior', help='lo publicado hoy (manifiesto.json anterior o la lista de archivos del artifact): '
                                       'lo que ya no está en esta build sale en artifact.quitar (se publica como null)')
    a = ap.parse_args()
    cfg = json.loads(leer(a.config, 'r'))
    sitio, salida = os.path.abspath(a.sitio), os.path.abspath(a.salida)
    reg = Registro()
    etapas = []

    def etapa(nombre):
        r = resumen(listar(sitio))
        etapas.append(dict(r, nombre=nombre))
        print('  %-44s %4d archivos %8.2f MB' % (nombre, r['archivos'], r['mb']), flush=True)
        return r

    print('· export de %s (%s)' % (a.ref, a.commit[:10]), flush=True)
    etapa('Export de git (con .glb y .blend)')
    lim = paso_limpiar(sitio, cfg, reg)
    lim['marca'] = paso_marcar(sitio, a.ref, a.commit, reg)
    etapa('Sin .glb ni .blend (proceso manual de hoy)')
    print('· validación de la export limpia', flush=True)
    reg_ini = Registro()  # la validación inicial queda en el JSON; el estado lo decide la final (lo que se publica)
    v0 = paso_validar(sitio, cfg, reg_ini, 'inicial', a.estricto)
    print('  %d errores y %d avisos en la export limpia' % (len(reg_ini.de('error')), len(reg_ini.de('aviso'))), flush=True)
    R = {'avbuild': VERSION, 'ref': a.ref, 'commit': a.commit, 'commit_fecha': a.commit_fecha,
         'generado': datetime.datetime.now().astimezone().isoformat(timespec='seconds'), 'optimizada': not a.sin_optimizar,
         'limites': cfg['limites'], 'limpiar': lim}
    if not a.sin_optimizar:
        podados = paso_podar(sitio, cfg, v0['analisis'], reg)
        R['podados'] = podados
        etapa('Podado lo que nada referencia')
        if np is None:
            reg.add('aviso', 'texturas', 'sin numpy: no se recomprimen texturas')
        else:
            print('· texturas con sips (%d hilos)…' % a.hilos, flush=True)
            cache = None if a.sin_cache else os.path.join(os.environ.get('AV_BUILD_CACHE') or os.path.expanduser('~/Library/Caches/amazonaverse-build'), 'tex')
            tx = Texturas(cfg['texturas'], cache)
            antes = sum(listar(sitio).values())
            T = paso_texturas(sitio, cfg, tx, reg, a.hilos)
            T.update(cache_hits=tx.hits, cache_misses=tx.misses, ahorro_build_mb=mb(antes - sum(listar(sitio).values())))
            R['texturas'] = T
            etapa('Texturas recomprimidas con sips')
        if not a.sin_texturas_compartidas:
            antes = sum(listar(sitio).values())
            R['compartidas'] = paso_compartidas(sitio, cfg, reg)
            R['compartidas_ahorro_mb'] = mb(antes - sum(listar(sitio).values()))
            etapa('Texturas duplicadas compartidas')
    print('· validación final', flush=True)
    vf = paso_validar(sitio, cfg, reg, 'final', a.estricto)
    files = listar(sitio)
    archivos = []
    for f, s in files.items():
        archivos.append({'ruta': f, 'bytes': s, 'sha256': sha256(leer(os.path.join(sitio, f)))})
    huella = sha256('\n'.join('%s %s' % (x['ruta'], x['sha256']) for x in archivos).encode())
    anterior = leer_anterior(a.anterior, reg) if a.anterior else None
    rutas = [x['ruta'] for x in archivos]
    quitar = sorted(set(anterior) - set(rutas)) if anterior is not None else None
    errores = reg.de('error')
    estado = 'ok' if not errores else 'fallo'
    mayor = max(files.items(), key=lambda kv: kv[1]) if files else ('—', 0)
    manifiesto = {
        'proyecto': 'Amazona Verse', 'avbuild': VERSION, 'estado': estado,
        'ref': a.ref, 'commit': a.commit, 'commit_fecha': a.commit_fecha, 'generado': R['generado'],
        'raiz': 'site', 'pagina': 'index.html', 'huella': huella,
        'totales': {'archivos': len(archivos), 'bytes': sum(files.values()), 'mb': mb(sum(files.values()))},
        'limites': cfg['limites'],
        'archivos': archivos,
        'artifact': {
            'file_path': os.path.join(sitio, 'index.html'),
            'root': sitio,
            'files': [r for r in rutas if r != 'index.html'],
            # Mapa listo para el parámetro files del Artifact tool (con root = la carpeta site): lo que se sube y, si se
            # pasó --anterior, cada huérfano de la versión publicada como null para que no se quede en el artifact.
            'files_map': dict({r: r for r in rutas if r != 'index.html'}, **{q: None for q in (quitar or [])}),
            'anterior': os.path.abspath(a.anterior) if a.anterior else None,
            'anterior_archivos': len(anterior) if anterior is not None else None,
            'quitar': quitar,
            'title': 'Amazona Verse',
            'icon': 'game',
            'label': ('%s %s' % (a.ref, a.commit[:7]))[:60],
            'description': 'Amazona Verse, capítulo 1 (build %s de %s).' % (a.commit[:7], a.ref),
        },
    }
    escribir(os.path.join(salida, 'manifiesto.json'), json.dumps(manifiesto, ensure_ascii=False, indent=1).encode('utf-8'))
    for v in (v0, vf):
        v.pop('analisis', None)
    R.update(estado=estado, etapas=etapas, final=manifiesto['totales'], huella=huella, mayor=list(mayor),
             manifiesto=os.path.join(salida, 'manifiesto.json'), validacion_inicial=v0, validacion_final=vf,
             registro=reg.items, registro_inicial=reg_ini.items, duplicados=duplicados_archivos(sitio),
             anterior=manifiesto['artifact']['anterior'], quitar=quitar)
    for v in (v0, vf):
        v.pop('glb_info', None)
    escribir_reporte(salida, R)
    print('· %s · %d archivos · %.2f MB · %d errores · %d avisos' % ('PASA' if estado == 'ok' else 'FALLA', len(archivos), sum(files.values()) / MB, len(errores), len(reg.de('aviso'))))
    for e in errores[:30]:
        print('  ERROR [%s] %s' % (e['paso'], e['msg']))
    for w in reg.de('aviso')[:15]:
        print('  aviso [%s] %s' % (w['paso'], w['msg']))
    if quitar is not None:
        print('  frente a lo publicado (%d archivos): %d nuevos o cambiados de ruta, %d huérfanos a quitar (null)'
              % (len(anterior), len(set(rutas) - set(anterior)), len(quitar)))
    else:
        print('  sin --anterior: el manifiesto no sabe qué huérfanos quitar del artifact publicado')
    print('  manifiesto: %s' % os.path.join(salida, 'manifiesto.json'))
    print('  reporte:    %s' % os.path.join(salida, 'reporte-build.md'))
    return 0 if estado == 'ok' else 1


if __name__ == '__main__':
    sys.exit(main())
