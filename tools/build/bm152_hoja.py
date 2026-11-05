"""BM152: hoja de contacto de los retratos (corre con el python de Blender: usa bpy.types.Image y numpy)."""
import bpy, numpy as np, os
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
E = ['agilis', 'farinosa', 'barbadensis', 'xantholora', 'arausiaca']
W = 256; hoja = np.zeros((W, W * len(E), 4), np.float32); hoja[..., :3] = [0.93, 0.95, 0.9]; hoja[..., 3] = 1
for i, e in enumerate(E):
    im = bpy.data.images.load(os.path.join(R, 'assets/retratos/v18', e + '.png')); a = np.array(im.pixels[:], np.float32).reshape(W, W, 4)
    al = a[..., 3:4]; hoja[:, i * W:(i + 1) * W, :3] = a[..., :3] * al + hoja[:, i * W:(i + 1) * W, :3] * (1 - al)
out = bpy.data.images.new('h', W * len(E), W); out.pixels = hoja.ravel(); out.file_format = 'JPEG'
out.filepath_raw = os.path.join(R, 'docs/img/v18/retratos.jpg'); out.save()
