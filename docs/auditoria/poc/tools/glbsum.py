import sys, json, struct, os
def summ(p):
    d=open(p,'rb').read()
    if d[:4]!=b'glTF': return {'file':p,'error':'not glb'}
    L=struct.unpack('<I',d[12:16])[0]; j=json.loads(d[20:20+L])
    binlen=len(d)-20-L
    acc=j.get('accessors',[])
    tris=0; verts=0
    for m in j.get('meshes',[]):
        for pr in m['primitives']:
            if 'indices' in pr: tris+=acc[pr['indices']]['count']//3
            verts+=acc[pr['attributes']['POSITION']]['count']
    comp=set()
    for a in acc: comp.add(a['componentType'])
    out={'file':os.path.basename(p),'MB':round(len(d)/1e6,2),'json_KB':round(L/1e3),'meshes':len(j.get('meshes',[])),
     'verts':verts,'tris':tris,'skins':len(j.get('skins',[])),
     'joints':[len(s['joints']) for s in j.get('skins',[])],
     'animations':[(a.get('name'),len(a['channels'])) for a in j.get('animations',[])],
     'materials':[m.get('name') for m in j.get('materials',[])],
     'textures':len(j.get('textures',[])),'images':[(i.get('name'),i.get('mimeType')) for i in j.get('images',[])],
     'extensionsUsed':j.get('extensionsUsed',[]),'componentTypes':sorted(comp),
     'morphTargets':sum(1 for m in j.get('meshes',[]) for pr in m['primitives'] if 'targets' in pr),
     'nodes':len(j.get('nodes',[])),'generator':j.get('asset',{}).get('generator')}
    return out
for p in sys.argv[1:]:
    print(json.dumps(summ(p),ensure_ascii=False))
