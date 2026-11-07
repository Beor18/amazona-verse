// KIMI-219 · orquestador de la reaplicación post-lanzamiento de la cuantización de la carga inicial.
// Los bytes cuantizados ya están horneados en tools/build/salida/kimi219-prep/ (kimi2_k219_prep.js,
// evidencia docs/img/kimi219/k219_prep.json). Este script NO cuantiza nada: verifica que aplicar es
// seguro y deja la reaplicación y su revert en un comando, para que el A/B de las 5 puertas sea inmediato.
//
//   node tools/build/kimi2_k219_aplica.js verifica   (todo lo de abajo, sin tocar el repo)
//   node tools/build/kimi2_k219_aplica.js aplica     (cuantiza los 7 .glb del repo + regenera sus _glb.js)
//   node tools/build/kimi2_k219_aplica.js revierte   (git checkout -- de los 14 archivos)
//
// Protocolo del A/B tras `aplica` (post-lanzamiento, con la build servida desde el worktree):
//   1. Capturas antes/después de la vista de arranque (mismo encuadre).
//   2. 5 puertas en sesión nueva: movementTest 52/52 · v18DescubrirTest 26/26 · bohiosTest 27/27
//      · v18GuardianTest 19/19 · v18PuertoTest 45/45.
//   3. streamingTest 24/24 («≤150») + selfTest; medición de carga (kimi1_062.js o avtest).
//   4. Cualquier rojo que no dé HEAD: `revierte` y se investiga.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const SALIDA = path.join(RAIZ, 'tools', 'build', 'salida', 'kimi219-prep');
const EVIDENCIA = path.join(RAIZ, 'docs', 'img', 'kimi219', 'k219_prep.json');
const QUANT = path.join(__dirname, 'kimi2_k218_quant.js');

const CANDIDATOS = [
  'assets/models/mapa/terreno_so.glb',
  'assets/models/mapa/terreno_se.glb',
  'assets/models/mapa/terreno_no.glb',
  'assets/models/mapa/terreno_ne.glb',
  'assets/models/edificios/complejo_ruinas.glb',
  'assets/models/entorno/ceiba.glb',
  'assets/models/entorno/flamboyan.glb',
];

function git(args) {
  return execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }).trim();
}

function cmdVerifica() {
  let mal = 0;
  // 1) scratch presente y consistente con la evidencia commiteada
  const ev = JSON.parse(fs.readFileSync(EVIDENCIA, 'utf8'));
  console.log('== 1) scratch vs evidencia commiteada ==');
  for (const rel of CANDIDATOS) {
    const nombre = path.basename(rel);
    const scratch = path.join(SALIDA, nombre);
    if (!fs.existsSync(scratch)) { console.log('FALTA scratch ' + nombre); mal++; continue; }
    const tam = fs.statSync(scratch).size;
    const esp = ev.archivos[nombre] && ev.archivos[nombre].despues;
    const ok = tam === esp;
    if (!ok) mal++;
    console.log((ok ? 'ok ' : 'TAMAÑO DISTINTO ') + nombre + ': scratch ' + tam + ' B · evidencia ' + esp + ' B');
  }
  // 2) determinismo: cuantizar una COPIA del repo actual debe dar los mismos bytes que el scratch
  console.log('== 2) determinismo (copia del repo -> cuantizar == scratch) ==');
  const tmp = path.join(SALIDA, '_verifica_tmp');
  fs.mkdirSync(tmp, { recursive: true });
  for (const rel of CANDIDATOS) {
    const nombre = path.basename(rel);
    const copia = path.join(tmp, nombre);
    fs.copyFileSync(path.join(RAIZ, rel), copia);
    try {
      execFileSync(process.execPath, [QUANT, copia], { stdio: 'pipe' });
      const a = fs.readFileSync(copia), b = fs.readFileSync(path.join(SALIDA, nombre));
      const ok = a.equals(b);
      if (!ok) mal++;
      console.log((ok ? 'ok ' : 'BYTES DISTINTOS ') + nombre + ' (' + a.length + ' vs ' + b.length + ' B)');
    } catch (e) {
      mal++;
      console.log('FALLO cuantizando copia de ' + nombre + ': ' + (e.stderr || e.message));
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  // el cuantizador también regeneró el wrapper de la copia en tmp (no existe en repo): sin efectos.
  // 3) wrappers parseables por el cuantizador (prefijo =" ... ";)
  console.log('== 3) wrappers _glb.js parseables ==');
  for (const rel of CANDIDATOS) {
    const wrapper = path.join(RAIZ, path.dirname(rel), path.basename(rel, '.glb') + '_glb.js');
    if (!fs.existsSync(wrapper)) { console.log('SIN WRAPPER ' + wrapper); continue; }
    const txt = fs.readFileSync(wrapper, 'utf8');
    const idx = txt.indexOf('="');
    const ok = idx >= 0 && txt.trimEnd().endsWith('";');
    if (!ok) mal++;
    console.log((ok ? 'ok ' : 'FORMATO NO RECONOCIDO ') + path.basename(wrapper));
  }
  // 4) git limpio en los 14 archivos (revierte = checkout seguro)
  console.log('== 4) worktree limpio en los 14 objetivos ==');
  const estado = git(['status', '--porcelain', '--', ...CANDIDATOS, ...CANDIDATOS.map(r => path.join(path.dirname(r), path.basename(r, '.glb') + '_glb.js').split(path.sep).join('/'))]);
  if (estado) { mal++; console.log('SUCIO:\n' + estado); }
  else console.log('ok (0 modificados: revierte = git checkout --)');
  // 5) sanity de la evidencia
  console.log('== 5) evidencia: total y costuras ==');
  console.log('total ' + ev.total.antes + ' -> ' + ev.total.despues + ' B (−' + ev.total.deltaKb + ' KB)');
  for (const [par, c] of Object.entries(ev.costuras))
    console.log('costura ' + par + ': ' + c.paresCompartidos + ' pares · despl max ' + c.desplMaxMm + ' mm');
  console.log(mal ? ('VERIFICA: ' + mal + ' problema(s)') : 'VERIFICA: TODO OK');
  process.exit(mal ? 1 : 0);
}

function cmdAplica() {
  cmdPrecaucion();
  console.log('== aplicando cuantización a los 7 .glb del repo (regenera sus _glb.js) ==');
  execFileSync(process.execPath, [QUANT, ...CANDIDATOS.map(r => path.join(RAIZ, r))], { stdio: 'inherit' });
  console.log('APLICADO. A/B: capturas arranque + movementTest · v18DescubrirTest · bohiosTest · v18GuardianTest · v18PuertoTest + streamingTest/selfTest.');
  console.log('Rojo no atribuible a HEAD: node tools/build/kimi2_k219_aplica.js revierte');
}

function cmdRevierte() {
  const objetivos = [...CANDIDATOS, ...CANDIDATOS.map(r => path.join(path.dirname(r), path.basename(r, '.glb') + '_glb.js'))];
  console.log('git checkout -- ' + objetivos.length + ' archivos');
  git(['checkout', '--', ...objetivos]);
  console.log('REVERTIDO a HEAD.');
}

function cmdPrecaucion() {
  // no aplicar dos veces: los .glb cuantizados ya traen KHR_mesh_quantization y uint16
  for (const rel of CANDIDATOS) {
    const buf = fs.readFileSync(path.join(RAIZ, rel));
    const ya = buf.includes(Buffer.from('KHR_mesh_quantization'));
    if (ya) { console.error('YA CUANTIZADO: ' + rel + ' (revierte antes de aplicar otra vez)'); process.exit(2); }
  }
}

const modo = process.argv[2];
if (modo === 'verifica') cmdVerifica();
else if (modo === 'aplica') cmdAplica();
else if (modo === 'revierte') cmdRevierte();
else { console.error('uso: node kimi2_k219_aplica.js verifica|aplica|revierte'); process.exit(2); }
