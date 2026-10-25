#!/usr/bin/env python3
"""Montaje del pitch en el Video Sequence Editor de Blender (sin ventana) y exportación a MP4 H.264.

Un solo comando (lanza Blender por su cuenta, en segundo plano y con prioridad baja):
  python3 tools/video/montaje.py --ver v1                     # TOMAS.json + cuadros de frames/v1 + audio del sonido
  python3 tools/video/montaje.py --ver v0 --edl tools/video/guiones/v0.json   # montaje propio de un guion de prueba
Opciones: --salida N (número de versión del MP4; por defecto el de --ver), --audio ruta.wav, --sin-audio,
          --sin-ligero, --solo-ligero, --hasta SEG (montar solo los primeros SEG segundos, para revisar).

Entradas
  - EDL: docs/pitch/TOMAS.json (comité) o la sección "montaje" de un guion de captura. Tiempos en segundos de video.
  - Guion de captura (tools/video/guiones/pitch.json): márgenes de cada toma y ajustes de montaje por toma
    ("montaje": { entrada, transicion, zoom: [desde, hasta], desenfoque, dividida: [izq, der], grafico, oscurecer }).
  - Cuadros: ~/AmazonaVerse/_trabajo_claude/pitch/frames/<ver>/<toma>/00000.jpg y gfx/*.png (títulos y logo).
  - Clips externos opcionales: ~/AmazonaVerse/_trabajo_claude/pitch/externos/<toma>.mp4|.mov (sustituyen a la toma).
  - Audio: ~/AmazonaVerse/_trabajo_claude/pitch/audio/pitch_mix.wav (si no existe, sale sin audio).
Salidas
  - ~/AmazonaVerse/Pitch/AmazonaVerse_Pitch_v<N>.mp4 (1920x1080, 30 fps, H.264 CRF alto, AAC 48 kHz)
  - ~/AmazonaVerse/Pitch/AmazonaVerse_Pitch_v<N>_ligero.mp4 (1280x720, ~2 Mb/s, para compartir: < 50 MB)
  Ambos con el índice (moov) al principio para reproducir en la web mientras se descarga.
"""
import json
import os
import struct
import subprocess
import sys

BLENDER = os.path.expanduser('~/Applications/Blender.app/Contents/MacOS/Blender')
JUEGO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TRABAJO = os.path.expanduser('~/AmazonaVerse/_trabajo_claude/pitch')
SALIDA = os.path.expanduser('~/AmazonaVerse/Pitch')
FPS = 30


def leer_args(argv):
    import argparse
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--ver', required=True, help='versión de los cuadros (frames/<ver>)')
    ap.add_argument('--edl', default='docs/pitch/TOMAS.json', help='TOMAS.json o un guion con sección "montaje"')
    ap.add_argument('--guion', default='tools/video/guiones/pitch.json', help='guion de captura (márgenes y ajustes)')
    ap.add_argument('--salida', help='número o nombre de la versión del MP4 (por defecto, el de --ver)')
    ap.add_argument('--audio', default=os.path.join(TRABAJO, 'audio', 'pitch_mix.wav'))
    ap.add_argument('--sin-audio', action='store_true')
    ap.add_argument('--sin-ligero', action='store_true')
    ap.add_argument('--solo-ligero', action='store_true')
    ap.add_argument('--hasta', type=float, help='montar solo hasta este segundo (revisión rápida)')
    ap.add_argument('--blend', action='store_true', help='guardar también el .blend del montaje junto al MP4')
    return ap.parse_args(argv)


def ruta_juego(p):
    return p if os.path.isabs(p) else os.path.join(JUEGO, p)


# ─────────────────────────── índice al principio (faststart) ───────────────────────────
def faststart(path):
    """Mueve el átomo moov delante de mdat y corrige los desplazamientos de stco/co64 (como qt-faststart)."""
    with open(path, 'rb') as f:
        data = f.read()
    atoms, i = [], 0
    while i < len(data):
        size, kind = struct.unpack('>I4s', data[i:i + 8])
        hdr = 8
        if size == 1:
            size = struct.unpack('>Q', data[i + 8:i + 16])[0]
            hdr = 16
        elif size == 0:
            size = len(data) - i
        atoms.append((kind, i, size))
        i += size
    kinds = [a[0] for a in atoms]
    if b'moov' not in kinds or b'mdat' not in kinds or kinds.index(b'moov') < kinds.index(b'mdat'):
        return False
    moov = next(a for a in atoms if a[0] == b'moov')
    moov_data = bytearray(data[moov[1]:moov[1] + moov[2]])
    delta = moov[2]

    def parchear(buf, ini, fin):
        j = ini
        while j < fin - 8:
            sz, tp = struct.unpack('>I4s', buf[j:j + 8])
            if sz < 8:
                break
            if tp in (b'trak', b'mdia', b'minf', b'stbl', b'moov', b'edts', b'udta'):
                parchear(buf, j + 8, j + sz)
            elif tp == b'stco':
                n = struct.unpack('>I', buf[j + 12:j + 16])[0]
                for k in range(n):
                    o = j + 16 + 4 * k
                    buf[o:o + 4] = struct.pack('>I', struct.unpack('>I', buf[o:o + 4])[0] + delta)
            elif tp == b'co64':
                n = struct.unpack('>I', buf[j + 12:j + 16])[0]
                for k in range(n):
                    o = j + 16 + 8 * k
                    buf[o:o + 8] = struct.pack('>Q', struct.unpack('>Q', buf[o:o + 8])[0] + delta)
            j += sz
    parchear(moov_data, 8, len(moov_data))
    out = bytearray()
    for kind, ini, size in atoms:
        if kind == b'moov':
            continue
        if kind == b'mdat':
            out += moov_data
        out += data[ini:ini + size]
    tmp = path + '.tmp'
    with open(tmp, 'wb') as f:
        f.write(out)
    os.replace(tmp, path)
    return True


# ─────────────────────────── EDL normalizada ───────────────────────────
def cargar_edl(a):
    """Devuelve {duracion, tomas: [...], titulos: [...], logo, secciones} con tiempos en segundos."""
    with open(ruta_juego(a.edl), encoding='utf-8') as f:
        edl = json.load(f)
    guion = {}
    gpath = ruta_juego(a.guion)
    if 'montaje' in edl:
        guion = edl
    elif os.path.exists(gpath):
        with open(gpath, encoding='utf-8') as f:
            guion = json.load(f)
    gtomas = {t['id']: t for t in guion.get('tomas', [])}
    out = {'duracion': 0, 'tomas': [], 'titulos': [], 'logo': None, 'secciones': edl.get('secciones', [])}
    if 'montaje' in edl:            # guion de prueba con su propio montaje
        m = edl['montaje']
        out['duracion'] = m['duracion']
        for t in m['tomas']:
            g = gtomas.get(t['toma'], {})
            out['tomas'].append(dict(t, id=t['toma'], margen=g.get('margen') or guion.get('margen'), aj=dict(g.get('montaje', {}), **t)))
        out['titulos'] = [dict(x) for x in m.get('titulos', [])]
        out['logo'] = m.get('logo')
        return out
    out['duracion'] = edl['duracion']
    out['logo'] = edl.get('logo')
    if guion.get('opciones_montaje', {}).get('logo') is False:   # el logo ya va dentro de un título (p. ej. cierre_logo)
        out['logo'] = None
    for t in edl['tomas']:
        g = gtomas.get(t['id'], {})
        aj = dict(g.get('montaje', {}))
        negro = (t.get('como_capturar') or {}).get('camara') == 'negro' or aj.get('negro')
        captura = g.get('captura_de', t['id'])     # varias tomas del comité pueden salir de la misma captura
        out['tomas'].append({'id': t['id'], 'toma': captura, 'inicio': t['inicio'], 'dur': t['dur'], 'negro': bool(negro),
                             'margen': g.get('margen') or guion.get('margen'), 'aj': aj, 'seccion': t.get('seccion')})
        tit = t.get('titulo')
        if tit and tit.get('texto') and not aj.get('sin_titulo'):
            out['titulos'].append({'grafico': aj.get('grafico', 't_' + t['id']), 'inicio': t['inicio'] + aj.get('titulo_inicio', tit.get('inicio', 0.3)),
                                   'dur': tit.get('dur', 2.0), 'estilo': tit.get('estilo')})
    return out


# ─────────────────────────── Blender ───────────────────────────
def montar(a):
    import bpy

    edl = cargar_edl(a)
    fdir = os.path.join(TRABAJO, 'frames', a.ver)
    manif = {}
    mpath = os.path.join(fdir, 'manifest.json')
    if os.path.exists(mpath):
        with open(mpath, encoding='utf-8') as f:
            manif = {t['id']: t for t in json.load(f).get('tomas', [])}
    dur_total = min(edl['duracion'], a.hasta) if a.hasta else edl['duracion']
    n_total = int(round(dur_total * FPS))
    fr = lambda s: int(round(s * FPS)) + 1   # segundos de video -> cuadro de Blender (empieza en 1)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1920, 1080, 100
    sc.render.fps, sc.render.fps_base = FPS, 1
    sc.frame_start, sc.frame_end = 1, n_total
    sc.render.use_sequencer, sc.render.use_compositing = True, False
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.display_settings.display_device = 'sRGB'
    sc.sequencer_colorspace_settings.name = 'sRGB'
    se = sc.sequence_editor_create()
    seqs = se.sequences
    avisos = []

    fondo = seqs.new_effect('negro', 'COLOR', 1, frame_start=1, frame_end=n_total + 1)
    fondo.color = (0, 0, 0)

    def clave(obj, prop, valores):
        """valores = [(cuadro, valor), ...]"""
        for f, v in valores:
            setattr(obj, prop, v)
            obj.keyframe_insert(prop, frame=f)

    canal = 2
    prev = None
    for k, t in enumerate(edl['tomas']):
        ini, dur = t['inicio'], t['dur']
        if ini >= dur_total:
            break
        if t.get('negro'):
            prev = None
            continue
        aj = t['aj']
        tr = float(aj.get('transicion', 0) or 0)          # fundido encadenado con la anterior, centrado en el corte
        margen = t.get('margen') or [0, 0]
        entrada = float(aj.get('entrada', margen[0]))      # segundo de la captura donde empieza la toma
        a0, a1 = ini - tr / 2, ini + dur + (float(edl['tomas'][k + 1]['aj'].get('transicion', 0) or 0) / 2 if k + 1 < len(edl['tomas']) else 0)
        a1 = min(a1, dur_total)
        canal = 3 if canal == 2 else 2
        fuentes = aj.get('dividida') or [t['toma']]
        strips = []
        for j, toma in enumerate(fuentes):
            ext = None
            for e in ('.mp4', '.mov', '.m4v'):
                p = os.path.join(TRABAJO, 'externos', t['id'] + e)
                if os.path.exists(p):
                    ext = p
            if ext and len(fuentes) == 1:
                s = seqs.new_movie(t['id'], ext, canal, fr(a0))
                s.frame_offset_start = int(round(max(0, entrada - tr / 2) * FPS)) if aj.get('entrada_externo') else 0
                s.frame_final_duration = max(1, fr(a1) - fr(a0))
                s.fit_method = 'FIT'
                strips.append(s)
                continue
            d = os.path.join(fdir, toma)
            cuadros = sorted(x for x in os.listdir(d) if x.endswith('.jpg')) if os.path.isdir(d) else []
            if not cuadros:
                avisos.append(f'FALTA la captura de {toma} (toma {t["id"]}): queda en negro')
                continue
            i0 = int(round((entrada - tr / 2) * FPS))
            n = fr(a1) - fr(a0)
            if i0 < 0:
                avisos.append(f'{t["id"]}: sin margen para el fundido; empieza en el cuadro 0')
                i0 = 0
            sel = cuadros[i0:i0 + n]
            if len(sel) < n:
                avisos.append(f'{t["id"]}: la captura de {toma} es corta ({len(cuadros)} cuadros); se congela el último {n - len(sel)} cuadros')
                sel = sel + [cuadros[-1]] * (n - len(sel)) if sel else [cuadros[-1]] * n
            s = seqs.new_image(f'{t["id"]}_{j}', os.path.join(d, sel[0]), canal + j * 4, fr(a0), fit_method='ORIGINAL')
            for c in sel[1:]:
                s.elements.append(c)
            s.colorspace_settings.name = 'sRGB'
            strips.append(s)
        if not strips:
            prev = None
            continue
        # Pantalla dividida: mitad central de cada captura, lado a lado
        if len(strips) == 2:
            for j, s in enumerate(strips):
                s.crop.min_x, s.crop.max_x = 480, 480
                s.transform.offset_x = -480 if j == 0 else 480
                s.blend_type = 'ALPHA_OVER'
        # Toma dentro de un marco (p. ej. ventana de navegador): se escala al hueco y el marco va encima
        if aj.get('marco'):
            ax, ay, aw, ah = aj['marco']['area']
            for s in strips:
                s.transform.scale_x = s.transform.scale_y = aw / 1920
                s.transform.offset_x = ax + aw / 2 - 960
                s.transform.offset_y = -(ay + ah / 2 - 540)
            mp = os.path.join(fdir, 'gfx', aj['marco']['grafico'] + '.png')
            if os.path.exists(mp):
                mk = seqs.new_image(f'{t["id"]}_marco', mp, canal + 12, fr(a0), fit_method='ORIGINAL')
                mk.frame_final_duration = max(1, fr(a1) - fr(a0))
                mk.blend_type, mk.alpha_mode = 'ALPHA_OVER', 'STRAIGHT'
                if tr > 0:
                    clave(mk, 'blend_alpha', [(fr(a0), 0.0), (fr(a0 + tr), 1.0)])
            else:
                avisos.append(f'FALTA el marco {mp}')
        base = strips[0]
        # Zoom digital lento (p. ej. sobre un dato del Diario): escala [desde, hasta] y punto de interés en px
        if aj.get('zoom'):
            z0, z1 = aj['zoom']
            cx, cy = aj.get('zoom_centro', [960, 540])
            for s in strips:
                for f, z in ((fr(ini), z0), (fr(ini + dur), z1)):
                    s.transform.scale_x = s.transform.scale_y = z
                    s.transform.offset_x = (960 - cx) * (z - 1)
                    s.transform.offset_y = (cy - 540) * (z - 1)
                    for p in ('scale_x', 'scale_y', 'offset_x', 'offset_y'):
                        s.transform.keyframe_insert(p, frame=f)
        # Fundido encadenado o desde negro: opacidad de la toma que entra
        for s in strips:
            if s.blend_type != 'ALPHA_OVER':
                # Encadenado con la toma anterior (CROSS) o, tras negro, opacidad sobre el fondo negro (ALPHA_OVER)
                s.blend_type = ('CROSS' if prev is not None else 'ALPHA_OVER') if tr > 0 or aj.get('fundido_salida') else 'REPLACE'
            if tr > 0:
                clave(s, 'blend_alpha', [(fr(a0), 0.0), (fr(a0 + tr), 1.0)])
            if aj.get('fundido_salida'):
                fs = float(aj['fundido_salida'])
                clave(s, 'blend_alpha', [(fr(a1 - fs), 1.0), (fr(a1), 0.0)])
        top = strips[-1]
        if aj.get('desenfoque'):
            b = seqs.new_effect(f'{t["id"]}_blur', 'GAUSSIAN_BLUR', canal + 8, frame_start=fr(a0), frame_end=fr(a1), seq1=top)
            d0, d1 = (aj['desenfoque'] if isinstance(aj['desenfoque'], list) else [aj['desenfoque']] * 2)
            for f, v in ((fr(a0), d0), (fr(a1), d1)):
                b.size_x = b.size_y = v
                b.keyframe_insert('size_x', frame=f)
                b.keyframe_insert('size_y', frame=f)
            if tr > 0:
                b.blend_type = 'CROSS'
                clave(b, 'blend_alpha', [(fr(a0), 0.0), (fr(a0 + tr), 1.0)])
        prev = base

    # Títulos (PNG transparentes con la tipografía del juego): fundido y subida suave
    gfx = os.path.join(fdir, 'gfx')
    for i, ti in enumerate(edl['titulos']):
        p = os.path.join(gfx, ti['grafico'] + '.png')
        if ti['inicio'] >= dur_total:
            continue
        if not os.path.exists(p):
            avisos.append(f'FALTA el gráfico {ti["grafico"]}.png')
            continue
        s = seqs.new_image(f'tit_{i}', p, 20 + i % 4, fr(ti['inicio']), fit_method='ORIGINAL')
        s.frame_final_duration = max(1, int(round(ti['dur'] * FPS)))
        s.blend_type, s.alpha_mode = 'ALPHA_OVER', 'STRAIGHT'
        f0, f1 = fr(ti['inicio']), fr(ti['inicio'] + ti['dur'])
        clave(s, 'blend_alpha', [(f0, 0.0), (f0 + 8, 1.0), (f1 - 9, 1.0), (f1, 0.0)])
        for f, y in ((f0, -16.0), (f0 + 12, 0.0)):
            s.transform.offset_y = y
            s.transform.keyframe_insert('offset_y', frame=f)

    # Logo: aparece con escala suave y queda hasta el final
    lg = edl.get('logo')
    lp = os.path.join(gfx, 'logo.png')
    if lg and os.path.exists(lp) and lg['inicio'] < dur_total:
        s = seqs.new_image('logo', lp, 30, fr(lg['inicio']), fit_method='ORIGINAL')
        f0, f1 = fr(lg['inicio']), min(fr(lg['inicio'] + lg['dur']), n_total + 1)
        s.frame_final_duration = max(1, f1 - f0)
        s.blend_type, s.alpha_mode = 'ALPHA_OVER', 'STRAIGHT'
        k = lg.get('escala', 0.62)
        s.transform.offset_y = lg.get('offset_y', 90)
        clave(s, 'blend_alpha', [(f0, 0.0), (f0 + 14, 1.0)] + ([(f1 - 12, 1.0), (f1, 0.0)] if lg.get('salida') else []))
        for f, z in ((f0, k * 0.9), (f0 + 24, k), (f1, k * 1.03)):
            s.transform.scale_x = s.transform.scale_y = z
            s.transform.keyframe_insert('scale_x', frame=f)
            s.transform.keyframe_insert('scale_y', frame=f)
    elif lg:
        avisos.append('FALTA gfx/logo.png')

    # Audio del ingeniero de sonido
    if not a.sin_audio and os.path.exists(a.audio):
        snd = seqs.new_sound('mezcla', a.audio, 40, 1)
        if snd.frame_final_end > n_total + 1:
            snd.frame_final_end = n_total + 1
    elif not a.sin_audio:
        avisos.append(f'sin audio: no existe {a.audio}')

    for m in avisos:
        print('AVISO', m)
    return sc, edl, avisos


def exportar(sc, destino, ligero, con_audio):
    import bpy
    r = sc.render
    r.image_settings.file_format = 'FFMPEG'
    ff = r.ffmpeg
    ff.format, ff.codec = 'MPEG4', 'H264'
    ff.gopsize, ff.use_max_b_frames, ff.max_b_frames = FPS, True, 2
    if ligero:
        r.resolution_percentage = 100
        r.resolution_x, r.resolution_y = 1280, 720
        ff.constant_rate_factor = 'NONE'
        ff.video_bitrate, ff.minrate, ff.maxrate, ff.buffersize = 2000, 0, 3000, 2000 * 8
        ff.ffmpeg_preset = 'GOOD'
        ff.audio_bitrate = 128
    else:
        r.resolution_x, r.resolution_y, r.resolution_percentage = 1920, 1080, 100
        ff.constant_rate_factor = 'HIGH'
        ff.ffmpeg_preset = 'GOOD'
        ff.audio_bitrate = 256
    ff.audio_codec = 'AAC' if con_audio else 'NONE'
    ff.audio_mixrate, ff.audio_channels = 48000, 'STEREO'
    r.use_file_extension = False
    r.filepath = destino
    bpy.ops.render.render(animation=True)


def en_blender(argv):
    a = leer_args(argv)
    nombre = a.salida or a.ver.lstrip('v')
    os.makedirs(SALIDA, exist_ok=True)
    sc, edl, avisos = montar(a)
    con_audio = not a.sin_audio and os.path.exists(a.audio)
    base = os.path.join(SALIDA, f'AmazonaVerse_Pitch_v{nombre}')
    if a.blend:
        import bpy
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(TRABAJO, f'montaje_v{nombre}.blend'))
    if not a.solo_ligero:
        exportar(sc, base + '.mp4', False, con_audio)
    if not a.sin_ligero:
        exportar(sc, base + '_ligero.mp4', True, con_audio)
    with open(os.path.join(TRABAJO, f'montaje_v{nombre}.json'), 'w', encoding='utf-8') as f:
        json.dump({'avisos': avisos, 'duracion': sc.frame_end / FPS, 'tomas': len(edl['tomas']), 'titulos': len(edl['titulos'])}, f, ensure_ascii=False, indent=1)


def main():
    if '--' in sys.argv:          # dentro de Blender
        en_blender(sys.argv[sys.argv.index('--') + 1:])
        return
    a = leer_args(sys.argv[1:])
    cmd = ['taskpolicy', '-b', 'nice', '-n', '15', BLENDER, '-b', '--factory-startup', '--python', os.path.abspath(__file__), '--'] + sys.argv[1:]
    print('·', ' '.join(cmd[:8]), '…')
    rc = subprocess.call(cmd)
    if rc != 0:
        sys.exit(f'Blender terminó con error {rc}')
    nombre = a.salida or a.ver.lstrip('v')
    for suf in ('', '_ligero'):
        p = os.path.join(SALIDA, f'AmazonaVerse_Pitch_v{nombre}{suf}.mp4')
        if os.path.exists(p):
            faststart(p)
            print(f'{p}  {os.path.getsize(p) / 1e6:.1f} MB')
    rep = os.path.join(TRABAJO, f'montaje_v{nombre}.json')
    if os.path.exists(rep):
        with open(rep, encoding='utf-8') as f:
            for m in json.load(f)['avisos']:
                print('AVISO', m)


if __name__ == '__main__':
    main()
