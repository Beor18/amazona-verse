import bpy
D=bpy.data
print('ARMS>', [(a.name,len(a.bones),a.users) for a in D.armatures])
print('OBJS_ALL>', [(o.name,o.type,o.users,[c.name for c in o.users_collection]) for o in D.objects])
for o in D.objects:
    for m in o.modifiers:
        if m.type=='ARMATURE': print('MOD>',o.name,m.name,m.object.name if m.object else None)
print('COLL>',[(c.name,len(c.objects)) for c in D.collections])
print('LIBS>',[l.filepath for l in D.libraries])
