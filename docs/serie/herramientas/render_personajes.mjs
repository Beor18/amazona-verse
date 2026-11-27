// Renderiza cada .glb en 4 vistas (frente, lado, 3/4, acción) con Three.js en Chrome sin pantalla.
// Requiere: npm i puppeteer-core three@0.160.0 en la carpeta del script, y Chrome en /usr/bin/google-chrome.
// Ejemplo: node render_personajes.mjs <ruta-del-repo> docs/serie/personajes
// Uso: node render.mjs <repo> <salida>
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3]);
const here = path.dirname(new URL(import.meta.url).pathname);

const personajes = [
  ['vittata', 'assets/models/vittata.glb'],
  ['ingeniera', 'assets/models/personajes/ingeniera.glb'],
  ['tuerca', 'assets/models/personajes/tuerca.glb'],
  ['chispa', 'assets/models/personajes/chispa.glb'],
  ['maestro_moon', 'assets/models/personajes/maestro_moon.glb'],
  ['constructor', 'assets/models/personajes/constructor.glb'],
  ['guardian_vuelo', 'assets/models/personajes/guardian_vuelo.glb'],
  ['maquina_puerto', 'assets/models/personajes/maquina_puerto.glb'],
];

const html = `<!doctype html><html><body style="margin:0;background:#e9e6df">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
window.render = async (url, vistas) => {
  const W = 1024, H = 1024;
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  document.body.innerHTML = ''; document.body.appendChild(r.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9e6df');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a948a, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.0); rim.position.set(-4, 3, -3); scene.add(rim);
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene; scene.add(root);
  const mixer = new THREE.AnimationMixer(root);
  const names = gltf.animations.map(a => a.name);
  const out = { animaciones: names, imgs: {} };
  for (const v of vistas) {
    mixer.stopAllAction();
    let clip = gltf.animations.find(a => /idle/i.test(a.name)) || null;
    if (v.accion) {
      const pref = ['Celebrate','Reparar','Trabajar','Volar','Vuelo','Fly','Senalar','Hablar','Saltar','Run','Correr','Walk','Caminar'];
      for (const p of pref) { clip = gltf.animations.find(a => a.name.toLowerCase().includes(p.toLowerCase())); if (clip) break; }
      clip = clip || gltf.animations.find(a => !/idle|t-?pose|rest/i.test(a.name)) || null;
    } else {
      clip = gltf.animations.find(a => /idle/i.test(a.name)) || null;
    }
    if (v.identidad) { clip = null;
      root.traverse(o => { if (!o.isMesh && o !== root && o.parent !== root) o.quaternion.identity(); });
      // El exportador perdió la altura de cada pivote (cabeza, hombros, cola); sus mallas hijas guardan el desfase inverso.
      root.traverse(o => { if (o.isMesh || o === root || o.parent === root || !o.parent || o.parent.parent === root && o.name === 'Rig') return;
        const h = o.children.find(c => c.isMesh && Math.abs(c.position.y) > 1e-4);
        if (h && Math.abs(o.position.y) < 1e-4) o.position.y = -h.position.y; });
      { const cue = root.getObjectByName('Cuerpo') || root.getObjectByName('Torso');
        if (cue) { root.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(cue); const top = cue.parent.worldToLocal(new THREE.Vector3(0, bb.max.y, 0)).y;
          for (const n of ['HombroL', 'HombroR']) { const h = root.getObjectByName(n); if (h && Math.abs(h.position.y) < 1e-4) h.position.y = top * 0.86; }
          const cola = root.getObjectByName('ColaPivote'); if (cola && Math.abs(cola.position.y) < 1e-4) cola.position.y = top * 0.22; } }
      if (v.pose) { const hr = root.getObjectByName('HombroR'), hl = root.getObjectByName('HombroL'), cb = root.getObjectByName('Cabeza');
        if (hr) hr.rotation.set(-2.6, 0, -0.3); if (hl) hl.rotation.set(0.6, 0, 0.25); if (cb) cb.rotation.set(-0.12, 0.25, 0.1); } }
    if (clip) { const a = mixer.clipAction(clip); a.play(); mixer.setTime(clip.duration * (v.accion ? 0.35 : 0.0)); }
    else mixer.setTime(0);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const rad = Math.max(size.x, size.y, size.z) * 0.62;
    const cam = new THREE.PerspectiveCamera(30, W / H, rad / 100, rad * 100);
    const d = rad / Math.tan(THREE.MathUtils.degToRad(15));
    const ang = THREE.MathUtils.degToRad(v.ang);
    cam.position.set(c.x + Math.sin(ang) * d, c.y + size.y * 0.08, c.z + Math.cos(ang) * d);
    cam.lookAt(c);
    r.render(scene, cam);
    out.imgs[v.nombre] = r.domElement.toDataURL('image/png');
    out.clip = out.clip || {}; out.clip[v.nombre] = clip ? clip.name : null;
  }
  return out;
};
window.listo = true;
</script></body></html>`;

const mime = { '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.html': 'text/html' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f;
  if (u === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(html); }
  if (u.startsWith('/three/')) f = path.join(here, 'node_modules', u);
  else f = path.join(repo, u);
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); res.end(b);
  });
}).listen(8765);

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', m => m.type() === 'error' && console.error('[page]', m.text()));
await page.goto('http://localhost:8765/');
await page.waitForFunction('window.listo === true');
// En glTF el frente mira a +Z: 0° = frente.
const vistas = process.env.TEST ? [{nombre:'id_frente',ang:0},{nombre:'accion',ang:25,accion:true}] : [
  { nombre: 'frente', ang: 0 }, { nombre: 'lado', ang: 90 },
  { nombre: 'tres_cuartos', ang: 35 }, { nombre: 'accion', ang: 25, accion: true },
];
const resumen = {};
for (const [id, rel] of personajes.filter(p => !process.env.SOLO || process.env.SOLO.split(',').includes(p[0]))) {
  const vv = id === 'vittata' || id === 'maquina_puerto' ? vistas : vistas.map(x => Object.assign({}, x, { identidad: true, pose: !!x.accion }));
  const res = await page.evaluate((u, v) => window.render(u, v), '/' + rel, vv);
  const dir = path.join(out, id); fs.mkdirSync(dir, { recursive: true });
  for (const [n, data] of Object.entries(res.imgs))
    fs.writeFileSync(path.join(dir, n + '.png'), Buffer.from(data.split(',')[1], 'base64'));
  resumen[id] = { animaciones: res.animaciones, clip: res.clip };
  console.log(id, JSON.stringify(resumen[id]));
}
fs.writeFileSync(path.join(out, '_animaciones.json'), JSON.stringify(resumen, null, 2));
await browser.close(); server.close();
