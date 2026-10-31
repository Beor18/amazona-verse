import struct,json,sys,os,mmap,re,numpy as np
src,out,tag=sys.argv[1],sys.argv[2],sys.argv[3]
os.makedirs(out+'/piezas',exist_ok=True)
f=open(src,'rb');mm=mmap.mmap(f.fileno(),0,access=mmap.ACCESS_READ)
l,_=struct.unpack('<II',mm[12:20]);j=json.loads(mm[20:20+l]);bo=20+l+8
N=j['nodes'];M=j['meshes'];A=j['accessors'];BV=j['bufferViews'];MA=j.get('materials',[]);TX=j.get('textures',[]);IM=j.get('images',[])
def mat(n):
    t=np.array(n.get('translation',[0,0,0]));q=n.get('rotation',[0,0,0,1]);s=np.array(n.get('scale',[1,1,1]))
    x,y,z,w=q;R=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
    m=np.eye(4);m[:3,:3]=R*s;m[:3,3]=t;return m
def sub(i,acc=None):
    acc=acc if acc is not None else []
    acc.append(i)
    for c in N[i].get('children',[]):sub(c,acc)
    return acc
def tris(m):
    t=0
    for p in M[m]['primitives']:
        if p.get('mode',4)!=4:continue
        t+=(A[p['indices']]['count'] if 'indices' in p else A[p['attributes']['POSITION']]['count'])//3
    return t
inv=[];used={}
TEXD=os.path.join(out,"texturas");os.makedirs(TEXD,exist_ok=True);imgfile={}
def imguri(o):
    if o in imgfile:return imgfile[o]
    im=IM[o];b=BV[im["bufferView"]];ext="png" if "png" in im.get("mimeType","") else "jpg"
    fn="tex_%03d.%s"%(o,ext);p=os.path.join(TEXD,fn)
    open(p,"wb").write(mm[bo+b.get("byteOffset",0):bo+b.get("byteOffset",0)+b["byteLength"]])
    imgfile[o]="texturas/"+fn;return imgfile[o]
for r in j['scenes'][0]['nodes']:
    nm=N[r].get('name','node%d'%r)
    ids=sub(r)
    # bbox in root-local (root translation zeroed)
    root=dict(N[r]);root['translation']=[0,0,0]
    pts=[];ntr=0;meshes=set();mats=set()
    def walk(i,P):
        global ntr
        n=root if i==r else N[i];Mx=P@mat(n)
        if 'mesh' in N[i]:
            m=N[i]['mesh'];meshes.add(m);ntr+=tris(m)
            for p in M[m]['primitives']:
                if 'material' in p:mats.add(p['material'])
                a=A[p['attributes']['POSITION']]
                if 'min' in a:
                    lo,hi=a['min'],a['max']
                    for cx in(lo[0],hi[0]):
                        for cy in(lo[1],hi[1]):
                            for cz in(lo[2],hi[2]):pts.append((Mx@[cx,cy,cz,1])[:3])
        for c in N[i].get('children',[]):walk(c,Mx)
    walk(r,np.eye(4))
    imgs=set();texs=set()
    for mi in mats:
        s=json.dumps(MA[mi]);texs|={int(x) for x in re.findall(r'"index": (\d+)',s)}
    for t in texs:imgs.add(TX[t]['source'])
    imgb=sum(BV[IM[i]['bufferView']]['byteLength'] for i in imgs if 'bufferView' in IM[i])
    pts=np.array(pts) if pts else np.zeros((1,3));lo=pts.min(0);hi=pts.max(0)
    # build glb
    nmap={o:k for k,o in enumerate(ids)};mmap_={o:k for k,o in enumerate(sorted(meshes))}
    matl=sorted(mats);matmap={o:k for k,o in enumerate(matl)}
    texl=sorted(texs);texmap={o:k for k,o in enumerate(texl)}
    iml=sorted(imgs);immap={o:k for k,o in enumerate(iml)}
    accmap={};bvmap={};accs=[];bvs=[];blob=bytearray()
    def bv(i):
        if i in bvmap:return bvmap[i]
        b=dict(BV[i]);d=mm[bo+b.get('byteOffset',0):bo+b.get('byteOffset',0)+b['byteLength']]
        while len(blob)%4:blob.append(0)
        b['byteOffset']=len(blob);b['buffer']=0;blob.extend(d);bvs.append(b);bvmap[i]=len(bvs)-1;return bvmap[i]
    def acc(i):
        if i in accmap:return accmap[i]
        a=dict(A[i])
        if 'bufferView' in a:a['bufferView']=bv(a['bufferView'])
        accs.append(a);accmap[i]=len(accs)-1;return accmap[i]
    nn=[]
    for o in ids:
        n=dict(root if o==r else N[o])
        if 'children' in n:n['children']=[nmap[c] for c in n['children']]
        if 'mesh' in n:n['mesh']=mmap_[n['mesh']]
        n.pop('camera',None);n.pop('skin',None);nn.append(n)
    mm2=[]
    for o in sorted(meshes):
        m=json.loads(json.dumps(M[o]))
        for p in m['primitives']:
            p['attributes']={k:acc(v) for k,v in p['attributes'].items()}
            if 'indices' in p:p['indices']=acc(p['indices'])
            if 'material' in p:p['material']=matmap[p['material']]
            p.pop('targets',None)
        m.pop('weights',None);mm2.append(m)
    s=json.dumps([MA[i] for i in matl])
    s=re.sub(r'"index": (\d+)',lambda x:'"index": %d'%texmap[int(x.group(1))],s)
    mats2=json.loads(s)
    ims=[]
    for o in iml:
        im={'uri':'../'+imguri(o)} if 'bufferView' in IM[o] else dict(IM[o]);im['name']=IM[o].get('name','')
        ims.append(im)
    tx=[]
    for o in texl:
        t=dict(TX[o]);t['source']=immap[t['source']];tx.append(t)
    g={'asset':j['asset'],'scene':0,'scenes':[{'nodes':[0]}],'nodes':nn,'meshes':mm2,'accessors':accs,'bufferViews':bvs,'buffers':[{'byteLength':0}]}
    if mats2:g['materials']=mats2
    if tx:g['textures']=tx;g['images']=ims;g['samplers']=j.get('samplers',[{}])
    if 'extensionsUsed' in j:g['extensionsUsed']=j['extensionsUsed']
    while len(blob)%4:blob.append(0)
    g['buffers'][0]['byteLength']=len(blob)
    js=json.dumps(g,separators=(',',':')).encode()
    while len(js)%4:js+=b' '
    safe=re.sub(r'[^A-Za-z0-9_.-]','_',nm);fn=safe+'.glb'
    k=1
    while fn in used:k+=1;fn='%s_%d.glb'%(safe,k)
    used[fn]=1
    with open(os.path.join(out,'piezas',fn),'wb') as o:
        o.write(struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(blob)));o.write(struct.pack('<II',len(js),0x4E4F534A));o.write(js);o.write(struct.pack('<II',len(blob),0x004E4942));o.write(blob)
    inv.append(dict(file=fn,node=nm,tris=ntr,mats=len(mats),texs=len(imgs),texMB=round(imgb/1e6,2),glbMB=round((len(blob)+len(js))/1e6,2),size=[round(float(x),1) for x in hi-lo],pos=[round(x,1) for x in N[r].get('translation',[0,0,0])],yoff=round(float(lo[1]),2),scale=N[r].get('scale',[1])[0]))
json.dump(inv,open('/tmp/bm77/inv_%s.json'%tag,'w'),indent=0)
print(len(inv),'piezas',sum(i['glbMB'] for i in inv),'MB')
