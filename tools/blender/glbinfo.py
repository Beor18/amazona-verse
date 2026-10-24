import json, struct, sys
import numpy as np
f=open(sys.argv[1],'rb').read()
jl=struct.unpack('<I',f[12:16])[0]; J=json.loads(f[20:20+jl]); bin_=f[20+jl+8:]
print("meshes",[(m['name'],[(list(p['attributes'].keys()),J['materials'][p['material']]['name']) for p in m['primitives']]) for m in J['meshes']])
print("anims",[(a['name'],len(a['channels'])) for a in J['animations']])
CT={5126:'f4',5123:'u2',5125:'u4',5121:'u1'}; NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def acc(i):
    a=J['accessors'][i]; bv=J['bufferViews'][a['bufferView']]
    o=bv.get('byteOffset',0)+a.get('byteOffset',0); n=a['count']*NC[a['type']]
    return np.frombuffer(bin_,dtype=CT[a['componentType']],count=n,offset=o).reshape(a['count'],-1)
for m in J['meshes']:
    for p in m['primitives']:
        for k,v in p['attributes'].items():
            x=acc(v)
            if x.dtype.kind=='f' and not np.isfinite(x).all(): print("NONFINITE",m['name'],k,(~np.isfinite(x)).sum())
