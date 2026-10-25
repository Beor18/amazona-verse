# Pipeline de edificios de Kelvin (.max -> migrado fiel + kit web). Ver docs/EDIFICIOS.md. Datos de trabajo en $AV_MAX_WORK.
import json, sys, glob, os
import numpy as np
W=os.path.join(os.environ.get('AV_MAX_WORK', os.path.expanduser('~/AmazonaVerse/_trabajo_claude/av_max')), '')
OUT=sys.argv[1]
UNIT=0.3048
A=json.load(open(W+'assets.json'))
rep={}
for f in sorted(glob.glob(os.path.join(OUT,'_report_faithful_*.json'))):
    for r in json.load(open(f)):
        rep[r['id']]=r
C4=np.array([[1,0,0,0],[0,0,1,0],[0,-1,0,0],[0,0,0,1]],float)
S=np.diag([UNIT,UNIT,UNIT,1.0]); Si=np.linalg.inv(S)
assets=[]; inst=[]
for a in A:
    r=rep.get(a['id'],{})
    assets.append(dict(id=a['id'], archivo=a['id']+'.glb', kit=a['kit'], piezas=len(a['members']),
                       poligonos_max=a['faces'], triangulos=r.get('tris'), kb=r.get('kb'),
                       nodos_max=[m['name'] for m in a['members']][:200], instancias=len(a['instances'])))
    for it in a['instances']:
        Wm=np.array(it['world'])
        G=C4@S@Wm@Si@np.linalg.inv(C4)
        inst.append(dict(asset=a['id'], nodo_max=it['root'],
                         matriz_gltf=[round(x,5) for x in G.T.ravel().tolist()],
                         posicion_m=[round(x,3) for x in G[:3,3].tolist()],
                         escala=round(float(np.cbrt(abs(np.linalg.det(G[:3,:3])))),4)))
doc=dict(fuente='AV3DMaxExportBuildings.max (3ds Max 2015, 2.4 GB)', unidad='1 unidad Max = 0.3048 m (pie); glTF en metros, Y arriba',
         nota='matriz_gltf = column-major (Three.js Matrix4.fromArray). Cada instancia coloca <asset>.glb en la escena original.',
         assets=assets, instancias=inst)
json.dump(doc, open(os.path.join(OUT,'escena_layout.json'),'w'), indent=1, ensure_ascii=False)
print('assets',len(assets),'instancias',len(inst), 'faltan', [a['id'] for a in A if a['id'] not in rep or 'error' in rep[a['id']]])
