# Pipeline de edificios de Kelvin. Crea edificios_import_max_stream.py (no versionado) copiando la extensión
# io_scene_max instalada (GPL) y aplicándole el parche de streaming: la escena se lee bajo demanda desde el
# índice de edificios_maxindex en vez de construir el árbol entero de 2,4 GB. Uso: python3 edificios_parche_importer.py
import os
SRC = os.path.expanduser('~/Library/Application Support/Blender/4.2/extensions/blender_org/io_scene_max/import_max.py')
DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'edificios_import_max_stream.py')
s = open(SRC).read()
s = s.replace("from pathlib import Path\n", "from pathlib import Path, PureWindowsPath\n")
for k in ('bitmap', 'glossmap', 'transmap', 'normalmap', 'shinmap'):
    s = s.replace("material.set('%s', Path(" % k, "material.set('%s', PureWindowsPath(" % k)
old = s[s.index("def get_node(index):"):s.index("def get_node_parent(node):")]
new = '''class LazySceneChildren:
    def __init__(self, scene_index, max_cached=6000, big=1 << 20):
        self.si, self.cache, self.max_cached, self.big = scene_index, {}, max_cached, big

    def __len__(self):
        return len(self.si)

    def __getitem__(self, i):
        c = self.cache.get(i)
        if c is not None:
            return c
        chunk = ChunkReader().get_next_chunk(0x2, self.si.raw(i), 0, 1, i, SceneChunk, ByteArrayChunk)[1]
        if int(self.si.size[i]) < self.big:
            if len(self.cache) >= self.max_cached:
                self.cache.clear()
            self.cache[i] = chunk
        return chunk


class LazySceneRoot:
    def __init__(self, scene_index):
        self.children = LazySceneChildren(scene_index)


def get_node(index):
    if isinstance(index, tuple):
        index = index[0]
    if index is None or index == 0xFFFFFFFF:
        return None
    if index < len(SCENE_LIST[0].children):
        return SCENE_LIST[0].children[index]
    return None


def init_streaming(filename, scene_index):
    global SCENE_LIST, META_DATA
    maxfile = ImportMaxFile(filename)
    read_class_data(maxfile, filename)
    read_config(maxfile, filename)
    read_directory(maxfile, filename)
    read_class_directory(maxfile, filename)
    metasid = min(max(entry.sid for entry in maxfile.direntries if entry is not None), 11)
    META_DATA = read_chunks(maxfile, maxfile.direntries[metasid].name, superId=metasid) if metasid >= 0xA else []
    SCENE_LIST = [LazySceneRoot(scene_index)]
    maxfile.close()
    return maxfile


'''
s = s.replace(old, new)
open(DST, 'w').write(s)
print('ok', DST)
