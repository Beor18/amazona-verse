const fs = require('fs');
const txt = fs.readFileSync('assets/models/personajes/tuerca_glb.js', 'utf8');
const m = txt.match(/\["[a-z_]+"\]="([A-Za-z0-9+/=]+)"/);
const buf = Buffer.from(m[1], 'base64');
const jsonLen = buf.readUInt32LE(12);
const jj = JSON.parse(buf.slice(20, 20 + jsonLen).toString());
console.log('NODOS:');
(jj.nodes || []).forEach((n, i) => console.log(' ', i, n.name, n.mesh != null ? '[mesh]' : '', n.children ? 'kids:' + n.children.length : ''));
console.log('MESHES:', (jj.meshes || []).map((x, i) => i + ':' + x.name).join(' '));
