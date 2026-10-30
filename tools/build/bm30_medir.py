import json,base64,re,math,struct,sys
R='assets/data/'
s=open(R+'mapa_cap1.js',encoding='utf8').read()
D,_=json.JSONDecoder().raw_decode(s[s.index('AV_MAPA_CAP1 = ')+15:])
a=open(R+'mapa_cap1_altura.js').read()
dat=base64.b64decode(re.search(r'datos: "([^"]+)"',a).group(1))
nx=nz=265;paso=2.0;x0=z0=-264.0;mn,mx=-12.0,103.0
H=struct.unpack('<%dH'%(nx*nz),dat)
def g(x,z):
    fx=(x-x0)/paso;fz=(z-z0)/paso;i=int(math.floor(fx));j=int(math.floor(fz));i=max(0,min(nx-2,i));j=max(0,min(nz-2,j));u=fx-i;v=fz-j
    h=lambda i,j:mn+H[j*nx+i]/65535*(mx-mn)
    return (h(i,j)*(1-u)+h(i+1,j)*u)*(1-v)+(h(i,j+1)*(1-u)+h(i+1,j+1)*u)*v
Z=D['zonasEdificios']
for zid in ('kelvin_aldea_colina','kelvin_ruinas_yunque_2'):
    zc=Z[zid];cx,cz=zc['centro'];r=zc['radio']
    print('==',zid,zc['centro'],r)
    for it in D['escenaKelvin']['compacto']:
        if it['grupo']!=zid: continue
        for k,i in enumerate(it['inst']):
            if len(i)==16: x,y,z=i[12],i[13],i[14]; esc=(i[0]**2+i[1]**2+i[2]**2)**.5
            else: x,y,z=i[0],i[1],i[2]
            gr=g(x,z)
            ring=[g(x+dx*3,z+dz*3) for dx,dz in((1,0),(-1,0),(0,1),(0,-1))]
            print('%-22s k%-3d x=%8.1f z=%8.1f y=%6.1f suelo=%6.1f d=%5.1f  anillo3m=[%.1f..%.1f]'%(it['modelo'],k,x,z,y,gr,y-gr,min(ring),max(ring)))
