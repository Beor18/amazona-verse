// uso: node run.js jobs.json  -> cada job {out, ...opts}
const {chromium}=require('playwright');const fs=require('fs');const http=require('http');const path=require('path');
const ROOT=path.join(__dirname,'..','..'); /* raíz del repo */
const mime={'.js':'text/javascript','.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.glb':'model/gltf-binary','.wasm':'application/wasm'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);if(process.env.TEX&&process.env.PIEL&&p==='/assets/textures/pieles/'+process.env.PIEL+'.jpg')f=process.env.TEX; /* textura en prueba */try{const d=fs.readFileSync(f);r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}catch(e){console.log('404',p);r.writeHead(404);r.end();}}).listen(0);
(async()=>{const port=srv.address().port;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--headless=new']});
const pg=await b.newPage();pg.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});pg.on('pageerror',e=>console.log('PAGEERR',e.message));
await pg.goto(`http://127.0.0.1:${port}/${process.env.PAGE||'tools/pieles/render.html'}`);await pg.waitForFunction('window.READY',null,{timeout:120000});
const jobs=JSON.parse(fs.readFileSync(process.argv[2]));
for(const j of jobs){ if(j.lookInfo){console.log(JSON.stringify(await pg.evaluate('lookInfo()')));continue;} if(j.dbg){console.log(JSON.stringify(await pg.evaluate('dbg()'),null,1));continue;} if(j.uvdump){fs.writeFileSync(j.out,JSON.stringify(await pg.evaluate('uvdump()')));console.log('uv',j.out);continue;} if(j.info){const i=await pg.evaluate('info()');console.log(JSON.stringify(i));continue;}
 const d=await pg.evaluate(o=>render(o),j);fs.writeFileSync(j.out,Buffer.from(d.split(',')[1],'base64'));console.log('ok',j.out);}
await b.close();srv.close();})().catch(e=>{console.error(e);process.exit(1)});
