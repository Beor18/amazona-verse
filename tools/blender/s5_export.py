import bpy
rig=bpy.data.objects["Rig"]
rig.animation_data.action=None
for pb in rig.pose.bones:
    pb.rotation_quaternion=(1,0,0,0); pb.location=(0,0,0); pb.scale=(1,1,1)
bpy.context.scene.frame_set(0)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath="/Users/kelvingarciapr/AmazonaVerse/Juego/assets/models/vittata.glb",
  export_format='GLB', use_selection=False, export_yup=True, export_apply=True,
  export_texcoords=False, export_normals=True, export_tangents=False,
  export_materials='EXPORT', export_vertex_color='MATERIAL',
  export_skins=True, export_def_bones=False, export_all_influences=False,
  export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True,
  export_frame_step=1, export_optimize_animation_size=True, export_anim_single_armature=True,
  export_reset_pose_bones=True, export_morph=False, export_cameras=False, export_lights=False,
  export_extras=False)
