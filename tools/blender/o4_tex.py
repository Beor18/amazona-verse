# Pipeline de Vittata · auxiliar (no entra en la build): prueba la textura mejorada sobre o_anim.blend → BUILD/o_tex_<modo>.blend
# Comando: Blender -b BUILD/o_anim.blend --python tools/blender/o4_tex.py -- both
# Regenerar todo desde cero (vittata.glb, vittata_masks.png, vittata_mounts.json, vittata_glb.js):
#   tools/blender/vittata_build.sh    · rutas en tools/blender/vittata_paths.py (SRC original, BUILD intermedios, OUT)
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from vittata_paths import src, build, out, tool
import bpy, sys
mode=sys.argv[-1]
img=bpy.data.images.load(src("cuerpo_Base_color_mejorada.png"))
o=bpy.data.objects["Vittata"]
for m in o.data.materials:
    if mode=="both" or m.name=="cuerpo":
        for n in m.node_tree.nodes:
            if n.type=='TEX_IMAGE': n.image=img
# UV stats for beak faces
me=o.data; uv=me.uv_layers[0].data
import collections
for mi in range(len(me.materials)):
    us=[uv[li].uv for p in me.polygons if p.material_index==mi for li in p.loop_indices]
    print("MAT",me.materials[mi].name,"u",round(min(u.x for u in us),3),round(max(u.x for u in us),3),"v",round(min(u.y for u in us),3),round(max(u.y for u in us),3))
bpy.ops.wm.save_as_mainfile(filepath=build("o_tex_%s.blend"%mode))
