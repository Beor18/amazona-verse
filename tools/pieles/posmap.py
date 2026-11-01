import json,numpy as np
d=json.load(open('out/uv.json')); N=1024
P=np.full((N,N,3),np.nan,np.float32); NM=np.zeros((N,N,3),np.float32); MID=np.full((N,N),-1,np.int8)
for mi,m in enumerate(d):
    if not m['hasMap']: continue
    uv=np.array(m['uv']).reshape(-1,3,2)*N; p=np.array(m['pos']).reshape(-1,3,3)
    for t,q in zip(uv,p):
        n=np.cross(q[1]-q[0],q[2]-q[0]); ln=np.linalg.norm(n); n=n/ln if ln>0 else n
        x0,y0=np.floor(t.min(0)).astype(int); x1,y1=np.ceil(t.max(0)).astype(int)
        x0=max(x0,0);y0=max(y0,0);x1=min(x1,N-1);y1=min(y1,N-1)
        xs,ys=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
        a,b,c=t; v0=b-a; v1=c-a; den=v0[0]*v1[1]-v1[0]*v0[1]
        if abs(den)<1e-12: continue
        px=xs-a[0]; py=ys-a[1]
        l1=(px*v1[1]-v1[0]*py)/den; l2=(v0[0]*py-px*v0[1])/den; l0=1-l1-l2
        e=-0.02
        ins=(l0>=e)&(l1>=e)&(l2>=e)
        if not ins.any(): continue
        Y=(ys[ins]-.5).astype(int); X=(xs[ins]-.5).astype(int)
        P[Y,X]=(l0[ins,None]*q[0]+l1[ins,None]*q[1]+l2[ins,None]*q[2]); NM[Y,X]=n; MID[Y,X]=mi
np.savez_compressed('out/posmap.npz',P=P,NM=NM,MID=MID)
print('cubiertos',np.isfinite(P[...,0]).sum())
