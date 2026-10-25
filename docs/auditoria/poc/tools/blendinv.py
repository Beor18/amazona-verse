import bpy, json, sys
D=bpy.data
out={'file':bpy.data.filepath.split('/')[-1]}
out['objects']=[]
for o in D.objects:
    e={'name':o.name,'type':o.type}
    if o.type=='MESH':
        me=o.data; e['verts']=len(me.vertices); e['polys']=len(me.polygons)
        e['mods']=[m.type for m in o.modifiers]; e['vgroups']=len(o.vertex_groups)
        e['mats']=[m.name for m in me.materials if m]
        e['shapekeys']=len(me.shape_keys.key_blocks) if me.shape_keys else 0
        e['uv']=len(me.uv_layers)
    if o.type=='ARMATURE': e['bones']=len(o.data.bones); e['bone_sample']=[b.name for b in o.data.bones][:12]
    if o.animation_data and o.animation_data.action: e['action']=o.animation_data.action.name
    if o.parent: e['parent']=o.parent.name
    out['objects'].append(e)
out['actions']=[(a.name,len(a.fcurves),[int(x) for x in a.frame_range]) for a in D.actions]
out['materials']=[]
for m in D.materials:
    nodes=[n.type for n in m.node_tree.nodes] if m.use_nodes and m.node_tree else []
    out['materials'].append((m.name, sorted(set(nodes))))
out['images']=[(i.name,i.filepath,list(i.size),bool(i.packed_file)) for i in D.images]
out['scenes']=[(s.name,s.render.engine,s.frame_start,s.frame_end) for s in D.scenes]
out['cameras']=len(D.cameras); out['lights']=len(D.lights)
print('JSON>'+json.dumps(out,ensure_ascii=False))
