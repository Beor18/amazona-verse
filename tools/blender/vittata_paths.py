"""Rutas del pipeline de Vittata (modelo jugable hecho desde el original de Kelvin). Todo es relativo al repo; nada vive en /tmp.

  SRC   ../04_Blender_3D/cotorro_original/cotorro/   original de Kelvin (cotorrofiver.blend, 3 texturas). Solo se lee.
  BUILD ../_trabajo_claude/vittata_build/            intermedios (.blend de cada paso, landmarks.json, beakverts.json, jaw.json).
                                                     Se puede borrar: el pipeline lo rehace. Cambiar con AV_VITTATA_BUILD.
  OUT   assets/models/                               salidas del juego (vittata.glb, vittata_masks.png, vittata_mounts.json,
                                                     vittata_glb.js). Cambiar con AV_VITTATA_OUT (para comparar sin pisar).

Regenerar todo desde cero: tools/blender/vittata_build.sh (ver el orden de los pasos allí).
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.normpath(os.path.join(REPO, '..', '04_Blender_3D', 'cotorro_original', 'cotorro'))
BUILD = os.environ.get('AV_VITTATA_BUILD') or os.path.normpath(os.path.join(REPO, '..', '_trabajo_claude', 'vittata_build'))
OUT = os.environ.get('AV_VITTATA_OUT') or os.path.join(REPO, 'assets', 'models')


def src(*p):
    return os.path.join(SRC, *p)


def build(*p):
    os.makedirs(BUILD, exist_ok=True)
    return os.path.join(BUILD, *p)


def out(*p):
    os.makedirs(OUT, exist_ok=True)
    return os.path.join(OUT, *p)


def tool(*p):
    return os.path.join(HERE, *p)
