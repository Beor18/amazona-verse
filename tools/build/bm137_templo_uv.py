import json,struct,sys,base64,re
K=float(sys.argv[1]);nombres=sys.argv[2:]
for n in nombres:
    d=bytearray(open(n+'.glb','rb').read())
    l=struct.unpack('<I',d[12:16])[0];j=json.loads(d[20:20+l]);b0=20+l+8
    done=set();cnt=0
    for m in j['meshes']:
        for p in m['primitives']:
            i=p['attributes']['TEXCOORD_0']
            if i in done: continue
            done.add(i);a=j['accessors'][i];assert a['componentType']==5126 and a['type']=='VEC2'
            bv=j['bufferViews'][a['bufferView']];assert 'byteStride' not in bv or bv['byteStride']==8
            o=b0+bv.get('byteOffset',0)+a.get('byteOffset',0)
            for k in range(a['count']*2):
                v=struct.unpack_from('<f',d,o+4*k)[0];struct.pack_into('<f',d,o+4*k,v*K);cnt+=1
    open(n+'.glb','wb').write(d)
    s=open(n+'_glb.js').read()
    s2=re.sub(r'="[A-Za-z0-9+/=]+";?\s*$','="'+base64.b64encode(bytes(d)).decode()+'";\n',s)
    assert s2!=s
    open(n+'_glb.js','w').write(s2);print(n,cnt//2,'uv')
