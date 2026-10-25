# Pipeline de Vittata · paso 3/9: textura mejorada, materiales, máscaras de especie (OUT/vittata_masks.png) y exportación provisional → BUILD/o_final.blend
# Comando: Blender -b BUILD/o_anim.blend --python tools/blender/o6_final.py
# Regenerar todo desde cero (vittata.glb, vittata_masks.png, vittata_mounts.json, vittata_glb.js):
#   tools/blender/vittata_build.sh    · rutas en tools/blender/vittata_paths.py (SRC original, BUILD intermedios, OUT)
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from vittata_paths import src, build, out, tool
import bpy, numpy as np
img=bpy.data.images.load(src("cuerpo_Base_color_mejorada.png"))
img.name="vittata_albedo"
o=bpy.data.objects["Vittata"]
for m in o.data.materials:
    bs=[n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'][0]
    for n in m.node_tree.nodes:
        if n.type=='TEX_IMAGE': n.image=img
    bs.inputs["Roughness"].default_value=0.35 if m.name=="Material.001" else 0.75
    bs.inputs["Metallic"].default_value=0.0
    print("MAT",m.name,"spec",bs.inputs["Specular IOR Level"].default_value)
for i in list(bpy.data.images):
    if i.users==0 or i.name in("Untitled","cuerpo_Base_color.jpg","Material.001_Base_color.jpg"):
        if i.name!="vittata_albedo": bpy.data.images.remove(i)
# ---- masks
W=1024; px=np.array(img.pixels[:],dtype=np.float32).reshape(img.size[1],img.size[0],4)[:,:,:3]
r,g,b=px[...,0],px[...,1],px[...,2]
mx=px.max(-1); mn=px.min(-1); sat=(mx-mn)/np.maximum(mx,1e-4)
R=np.clip((r-np.maximum(g,b)-0.25)/0.2,0,1)
rows=np.arange(W)[:,None]*np.ones((1,W))
G=np.clip((mn-0.6)/0.2,0,1)*np.clip((0.35-sat)/0.15,0,1)*(rows>W*0.55)
# beak: rasterize Material.001 UV triangles
B=np.zeros((W,W),np.float32)
me=o.data; uv=me.uv_layers[0].data; bi=[i for i,m in enumerate(me.materials) if m.name=="Material.001"][0]
me.calc_loop_triangles()
for t in me.loop_triangles:
    if t.material_index!=bi: continue
    P=np.array([uv[l].uv[:] for l in t.loops])*W
    x0,y0=np.floor(P.min(0)).astype(int); x1,y1=np.ceil(P.max(0)).astype(int)
    xs,ys=np.meshgrid(np.arange(x0,x1+1)+0.5,np.arange(y0,y1+1)+0.5)
    (ax,ay),(bx,by),(cx,cy)=P
    d=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy)
    if abs(d)<1e-9: continue
    l1=((by-cy)*(xs-cx)+(cx-bx)*(ys-cy))/d; l2=((cy-ay)*(xs-cx)+(ax-cx)*(ys-cy))/d; l3=1-l1-l2
    ins=(l1>=-0.01)&(l2>=-0.01)&(l3>=-0.01)
    yy=np.clip(np.arange(y0,y1+1),0,W-1); xx=np.clip(np.arange(x0,x1+1),0,W-1)
    sub=B[np.ix_(yy,xx)]; sub[ins]=1; B[np.ix_(yy,xx)]=sub
print("mask coverage R,G,B %",[round(float(x.mean()*100),2) for x in (R,G,B)])
mask=np.dstack([R,G,B,np.ones_like(R)]).astype(np.float32)
mi=bpy.data.images.new("vittata_masks",W,W,alpha=False); mi.pixels.foreach_set(mask.ravel())
mi.filepath_raw=out("vittata_masks.png"); mi.file_format='PNG'; mi.save()
bpy.data.images.remove(mi)
rig=bpy.data.objects["Rig"]; rig.animation_data.action=None
for pb in rig.pose.bones: pb.rotation_quaternion=(1,0,0,0); pb.location=(0,0,0); pb.scale=(1,1,1)
bpy.context.scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=build("o_final.blend"))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out("vittata.glb"),
  export_format='GLB', export_yup=True, export_apply=True, export_texcoords=True, export_normals=True,
  export_materials='EXPORT', export_image_format='JPEG', export_jpeg_quality=90,
  export_skins=True, export_def_bones=False, export_all_influences=False,
  export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True,
  export_optimize_animation_size=True, export_anim_single_armature=True, export_reset_pose_bones=True,
  export_morph=False, export_cameras=False, export_lights=False)
