#!/usr/bin/env python3
"""Loops cortos y sin audio para la web del producto, a partir de los cuadros capturados del pitch.

  python3 tools/video/loops.py                          # todos los loops (cuadros de frames/web1, el hero de v1)
  python3 tools/video/loops.py --solo historia,ropero   # algunos
Los cuadros salen de tools/video/guiones/loops.json: capturar.py --ver web1 --guion tools/video/guiones/loops.json.
Ropero: solo la pava. La gorra con la bandera no va en la web mientras el abogado no revise el Reglamento 5282
(docs/BANDERA_PR_GUIA.md, sección 6: nada de anuncios con la bandera).

Cada loop: 1280x720, 30 fps, sin texto ni HUD, con cierre limpio. Los últimos cuadros se funden con los primeros, así el
último cuadro casi coincide con el primero. Salen un MP4 H.264 (yuv420p, índice al principio, menos de 4 MB), un WebM VP9
y un póster JPG del primer cuadro (menos de 200 KB), en ~/AmazonaVerse/Web/assets/video/.
"""
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import montaje  # noqa: E402  (faststart, rutas y Blender)

WEB = os.path.expanduser('~/AmazonaVerse/Web/assets/video')
FPS = 30
MAX_MB = 4.0
# id: lista de (toma, desde_s, hasta_s) en segundos de la captura (incluido el margen); 'fundido' = cierre del loop;
# 'ver' = versión de los cuadros (si no, la de --ver)
LOOPS = {
    'hero': {'ver': 'v1', 'tramos': [('gancho_vuelo_mirador', 0.2, 5.8), ('mundo_dron_dosel', 0.4, 4.0)], 'fundido': 0.6},
    # La inventora en su taller y, volando, se para en la punta del techo (Villa Raíz y los edificios de Kelvin al fondo)
    'historia': {'tramos': [('mundo_taller_idea', 0.3, 4.5), ('web_techo_taller', 0.9, 5.6)], 'fundido': 0.5, 'poster': 7.6},
    # Se posa en la percha del dosel (misión de la gota) y sube con el vapor hasta la nube
    'aprender': {'tramos': [('web_percha_dosel', 0.8, 5.2), ('aprender_vapor_nube', 0.3, 4.3)], 'fundido': 0.5, 'poster': 3.0},
    # Pava y guayabera, bailando en la plaza (sin la gorra con la bandera)
    'ropero': {'tramos': [('mundo_ropero_pava', 0.3, 3.9), ('mercado_baile_plaza', 0.5, 4.9)], 'fundido': 0.5, 'poster': 1.0},
    # El nido del criadero en Villa Raíz y la eclosión real del huevo
    'criadero': {'tramos': [('web_nido_mundo', 0.6, 4.2), ('criadero_seq', 1.2, 7.2)], 'fundido': 0.6, 'poster': 8.3},
}


def en_blender(argv):
    import argparse
    import bpy
    ap = argparse.ArgumentParser()
    ap.add_argument('--ver', default='web1')
    ap.add_argument('--solo')
    ap.add_argument('--solo-poster', action='store_true', help='rehacer solo los pósteres JPG')
    a = ap.parse_args(argv)
    os.makedirs(WEB, exist_ok=True)
    for nombre, L in LOOPS.items():
        if a.solo and nombre not in a.solo.split(','):
            continue
        fdir = os.path.join(montaje.TRABAJO, 'frames', L.get('ver', a.ver))
        bpy.ops.wm.read_factory_settings(use_empty=True)
        sc = bpy.context.scene
        sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1280, 720, 100
        sc.render.fps, sc.render.fps_base = FPS, 1
        sc.view_settings.view_transform = 'Standard'
        sc.sequencer_colorspace_settings.name = 'sRGB'
        seqs = sc.sequence_editor_create().sequences
        # Lista plana de cuadros de todos los tramos
        cuadros = []
        for toma, d0, d1 in L['tramos']:
            d = os.path.join(fdir, toma)
            fs = sorted(x for x in os.listdir(d) if x.endswith('.jpg'))
            cuadros += [os.path.join(d, x) for x in fs[int(d0 * FPS):int(d1 * FPS)]]
        x = int(L['fundido'] * FPS)
        n = len(cuadros) - x                 # duración del loop
        def tira(nom, lista, canal, inicio):
            s = seqs.new_image(nom, lista[0], canal, inicio, fit_method='FIT')
            for c in lista[1:]:
                # elements guarda solo el nombre: cada tramo (carpeta distinta) va en su propia tira
                s.elements.append(os.path.basename(c))
            return s
        # Tiras por carpeta (Blender necesita un directorio por tira de imágenes)
        pos, canal = 1, 2
        grupos = []
        for c in cuadros[:n]:
            if grupos and os.path.dirname(grupos[-1][-1]) == os.path.dirname(c):
                grupos[-1].append(c)
            else:
                grupos.append([c])
        for i, gp in enumerate(grupos):
            tira(f'{nombre}_{i}', gp, canal, pos)
            pos += len(gp)
        # Cierre del loop: la cola (cuadros n..n+x) va encima del principio y se desvanece
        cola = cuadros[n:]
        gcola = []
        for c in cola:
            if gcola and os.path.dirname(gcola[-1][-1]) == os.path.dirname(c):
                gcola[-1].append(c)
            else:
                gcola.append([c])
        p = 1
        for i, gp in enumerate(gcola):
            s = tira(f'{nombre}_cola{i}', gp, 6 + i, p)
            s.blend_type = 'ALPHA_OVER'
            for f in range(p, p + len(gp) + 1):
                s.blend_alpha = max(0.0, 1.0 - (f - 1) / max(1, x))
                s.keyframe_insert('blend_alpha', frame=f)
            p += len(gp)
        sc.frame_start, sc.frame_end = 1, n
        r = sc.render
        r.image_settings.file_format = 'FFMPEG'
        r.use_file_extension = False
        ff = r.ffmpeg
        for ext, fmt, codec in () if a.solo_poster else (('mp4', 'MPEG4', 'H264'), ('webm', 'WEBM', 'WEBM')):
            ff.format, ff.codec = fmt, codec
            ff.constant_rate_factor = 'NONE'
            kb = 2800 if ext == 'mp4' else 2300   # VP9 rinde más por bit y se pasa del objetivo: se le pide menos
            ff.video_bitrate, ff.maxrate, ff.minrate, ff.buffersize = kb, int(kb * 1.25), 0, kb * 8
            ff.gopsize = FPS
            ff.ffmpeg_preset = 'GOOD'
            ff.audio_codec = 'NONE'
            r.filepath = os.path.join(WEB, f'{nombre}.{ext}')
            bpy.ops.render.render(animation=True)
        # Póster: el cuadro del segundo 'poster' del loop (por defecto, el primero)
        sc.frame_set(1 + int(round(L.get('poster', 0) * FPS)))
        r.image_settings.file_format = 'JPEG'
        r.image_settings.quality = 72
        r.filepath = os.path.join(WEB, f'{nombre}.jpg')
        bpy.ops.render.render(write_still=True)


def main():
    if '--' in sys.argv:
        en_blender(sys.argv[sys.argv.index('--') + 1:])
        return
    cmd = ['taskpolicy', '-b', 'nice', '-n', '15', montaje.BLENDER, '-b', '--factory-startup', '--python-exit-code', '1',
           '--python', os.path.abspath(__file__), '--'] + sys.argv[1:]
    rc = subprocess.call(cmd)
    if rc:
        sys.exit(f'Blender terminó con error {rc}')
    grandes = []
    for f in sorted(os.listdir(WEB)):
        p = os.path.join(WEB, f)
        if f.split('.')[0] not in LOOPS:
            continue
        if f.endswith('.mp4'):
            montaje.faststart(p)
        mb = os.path.getsize(p) / 1e6
        print(f'{p}  {mb:.2f} MB')
        if f.endswith(('.mp4', '.webm')) and mb >= MAX_MB:
            grandes.append(f)
    if grandes:
        sys.exit(f'Pasan de {MAX_MB} MB: {", ".join(grandes)}')


if __name__ == '__main__':
    main()
