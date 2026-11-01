import json,sys,os
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'out'); os.makedirs(OUT,exist_ok=True)
sp=sys.argv[1]; pre=sys.argv[2]; size=int(sys.argv[3]) if len(sys.argv)>3 else 768
base={"look":{"species":"vittata","accessories":{}},"piel":sp,"pose":"Idle","t":0.3,"size":size,"tf":0.5,"cx":0,"cy":0.75,"d":3.2,"vt":True,"sunLocal":[-0.448,0.747,0.491],"fixedBox":[[-0.82,0,-0.45],[0.82,1.4,0.45]]}
J=[]
for n,y in [("frente",0),("lado",1.5708),("espalda",3.1416),("tq",-0.6)]:
    j=dict(base,yaw=y,out=f"{OUT}/{pre}_{n}.png"); J.append(j)
# head close-up
J.append(dict(base,yaw=-0.5,focusBone=None,out=f"{OUT}/{pre}_cara.png",tf=0.75,cy=0.82,d=1.3))
json.dump(J,open(f"{OUT}/j_{pre}.json","w"))
