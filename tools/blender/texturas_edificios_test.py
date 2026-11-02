#!/usr/bin/env python3
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
TEXTURES = ROOT / 'assets/models/edificios/tex_original'


class BuildingTextureBudgetTest(unittest.TestCase):
    def test_original_textures_fit_gpu_budget(self):
        total = 0
        oversized = []
        for path in sorted(TEXTURES.glob('*.jpg')):
            with Image.open(path) as image:
                width, height = image.size
            if max(width, height) > 1024:
                oversized.append('%s: %dx%d' % (path.name, width, height))
            total += width * height * 4 * 4 / 3
        self.assertFalse(oversized, 'Texturas por encima de 1024 px: ' + '; '.join(oversized))
        self.assertLess(total, 100 * 1024 * 1024,
                        'Memoria estimada con mipmaps: %.2f MiB' % (total / 1024 / 1024))

    def test_reexport_keeps_the_same_texture_budget(self):
        import inspect
        import sys
        sys.path.insert(0, str(ROOT / 'tools/blender'))
        from integrar_originales import export_images
        self.assertEqual(inspect.signature(export_images).parameters['max_size'].default, 512)


if __name__ == '__main__':
    unittest.main()
