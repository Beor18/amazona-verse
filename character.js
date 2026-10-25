/* Amazona Verse · personaje 3D modular
   Carga el modelo con esqueleto (assets/models/vittata.glb), crea instancias independientes,
   monta accesorios 3D en huesos de montaje y renderiza retratos idénticos para el juego y el cómic. */
(function () {
  'use strict';

  const MODEL_URL = 'assets/models/vittata.glb';
  const MOUNTS = ['mount_head_top', 'mount_eyes', 'mount_neck', 'mount_chest', 'mount_back', 'mount_wing_L', 'mount_wing_R'];
  // Dedos de las alas-mano (nombres de three, sin puntos): tres dedos por mano, dos falanges cada uno
  const FINGERS = ['armL2002', 'armL2003', 'armL2004', 'armL2005', 'armL2006', 'armL2007',
    'armL2010', 'armL2011', 'armL2013', 'armL2014', 'armL2016', 'armL2017'];

  // Plumajes: base común del proyecto original con máscaras de color por especie (ver grupo_especies_referencia.jpg)
  const SPECIES = {
    vittata: { name: 'Vittata (verde clásico)', patch: '#d63a2f', ring: '#f4f4f0', wingTip: null },
    agilis: { name: 'Pico negro (agilis)', patch: '#2f9e44', ring: '#e9efe9', wingTip: '#c0392b', beak: '#3a3a36' },
    albifrons: { name: 'Frente blanca (albifrons)', patch: '#f4f4f0', ring: '#d63a2f', wingTip: null },
    amazonica: { name: 'Ala naranja (amazonica)', patch: '#2f6fd1', ring: '#f2c21a', wingTip: '#e8811a' },
    festiva: { name: 'Antifaz rojo y azul (festiva)', patch: '#c0392b', ring: '#3a6fc4', wingTip: '#3a6fc4' },
    oratrix: { name: 'Cabeza amarilla (oratrix)', patch: '#f2c21a', ring: '#f2c21a', wingTip: '#c0392b' },
    versicolor: { name: 'Antifaz azul (versicolor)', patch: '#2f5fd1', ring: '#2f5fd1', wingTip: '#2f5fd1' },
    guildingii: { name: 'Multicolor (guildingii)', patch: '#e6b422', ring: '#f4f4f0', wingTip: '#2f6fd1' },
  };

  // Seis accesorios modulares: ranura, hueso de montaje, colores y si es un sustituto pendiente de modelado
  const PALETTE = ['#f2a03d', '#d6403a', '#3d8fb0', '#2f8f4e', '#7a4fb3', '#5a3a22', '#e8c32a', '#2b2b2b'];
  const ACCESSORIES = [
    { id: 'gafas', slot: 'eyes', mount: 'mount_eyes', offset: [0, 0.09, 0.05], name: 'Gafas de inventor', colors: ['#5a3a22', '#2b2b2b', '#c9a227', '#3d8fb0'], placeholder: false },
    { id: 'sombrero', slot: 'head', mount: 'mount_head_top', offset: [0, -0.08, 0], name: 'Sombrero explorador', colors: ['#8a6a3a', '#5a3a22', '#2f8f4e', '#d6403a'], placeholder: false },
    { id: 'panuelo', slot: 'neck', mount: 'mount_neck', offset: [0, -0.1, 0], wrap: true, glb: 'panuelo', name: 'Pañuelo aventurero', colors: ['#f2a03d', '#3d8fb0', '#d6403a', '#2f8f4e', '#7a4fb3', '#e8c32a'], placeholder: false,
      styles: [['liso', 'Liso'], ['pr', 'Bandera PR'], ['coqui', 'Coquí'], ['caribe', 'Tropical'], ['camuflaje', 'Camuflaje']] },
    { id: 'brujula', slot: 'chest', mount: 'mount_chest', offset: [0, 0, 0.06], name: 'Brújula colgante', colors: ['#c9a227', '#b9c4c9', '#b87333'], placeholder: false },
    { id: 'mochila', slot: 'back', mount: 'mount_back', offset: [0, 0, -0.05], name: 'Mochila de exploración', colors: ['#8a5a2b', '#2f8f4e', '#3d8fb0', '#d6403a'], placeholder: true },
    { id: 'brazaletes', slot: 'wings', mount: 'mount_wing_L', mount2: 'mount_wing_R', offset: [0, -0.06, 0], size: 0.8, name: 'Brazaletes de constructor', colors: ['#c9a227', '#3d8fb0', '#d6403a', '#2b2b2b'], placeholder: false },
  ];
  // Ropero (wardrobe.js): gorras, ropa ajustada, calzado y objetos; se suman al catálogo base
  const BASE_IDS = ACCESSORIES.map(a => a.id);
  if (window.AVWardrobe) ACCESSORIES.push(...window.AVWardrobe.defs);
  const SLOTS = ['head', 'eyes', 'neck', 'torso', 'chest', 'back', 'wings', 'legs', 'feet', 'hand'];
  const styleOf = (def, s) => def.styles ? (def.styles.some(x => x[0] === s) ? s : def.styles[0][0]) : undefined;

  function defaultLook() {
    return { species: 'vittata', accessories: { neck: { id: 'panuelo', color: '#f2a03d' }, eyes: { id: 'gafas', color: '#5a3a22' } } };
  }
  function normalizeLook(look) {
    const out = defaultLook();
    if (!look) return out;
    if (SPECIES[look.species]) out.species = look.species;
    if (look.accessories && typeof look.accessories === 'object') {
      out.accessories = {};
      for (const slot of SLOTS) {
        const a = look.accessories[slot];
        const def = a && ACCESSORIES.find(x => x.id === a.id && x.slot === slot);
        if (def) {
          out.accessories[slot] = { id: def.id, color: def.colors.includes(a.color) ? a.color : def.colors[0] };
          if (def.styles) out.accessories[slot].style = styleOf(def, a.style);
        }
      }
    }
    return out;
  }

  // ---------- Carga compartida ----------
  let gltfPromise = null, mountsInfo = null, maskTexture = null;
  function loadGLTF() {
    if (gltfPromise) return gltfPromise;
    const info = fetch('assets/models/vittata_mounts.json').then(r => r.ok ? r.json() : null).catch(() => null).then(j => {
      mountsInfo = j;
      if (!j || !j.masks) return null;
      return new Promise(res => new THREE.TextureLoader().load('assets/models/' + j.masks, t => { t.flipY = false; maskTexture = t; res(t); }, undefined, () => res(null)));
    });
    // Primero el .glb; si el host no lo sirve, el mismo modelo empaquetado en vittata_glb.js
    const fromB64 = () => new Promise((resolve, reject) => {
      const parse = () => {
        const bin = atob(window.AV_MODEL_B64), buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        new THREE.GLTFLoader().parse(buf.buffer, 'assets/models/', resolve, reject);
      };
      if (window.AV_MODEL_B64) { parse(); return; }
      const sc = document.createElement('script'); sc.src = 'assets/models/vittata_glb.js';
      sc.onload = parse; sc.onerror = () => reject(new Error('modelo no disponible')); document.head.appendChild(sc);
    });
    gltfPromise = info.then(() => new Promise((resolve, reject) => {
      if (!THREE.GLTFLoader) { reject(new Error('GLTFLoader no disponible')); return; }
      new THREE.GLTFLoader().load(MODEL_URL, resolve, undefined, () => fromB64().then(resolve, reject));
    }));
    return gltfPromise;
  }

  // ---------- Ropa modelada en Blender (assets/models/ropa/<nombre>.glb, o su copia base64 en <nombre>_glb.js) ----------
  const ropaCache = {};
  function loadRopa(name) {
    if (ropaCache[name] && ropaCache[name].then) return ropaCache[name];
    const p = new Promise((resolve, reject) => {
      const fromB64 = () => {
        const parse = () => {
          const bin = atob(window.AV_ROPA_B64[name]), buf = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
          new THREE.GLTFLoader().parse(buf.buffer, 'assets/models/ropa/', resolve, reject);
        };
        if (window.AV_ROPA_B64 && window.AV_ROPA_B64[name]) { parse(); return; }
        const sc = document.createElement('script'); sc.src = 'assets/models/ropa/' + name + '_glb.js';
        sc.onload = parse; sc.onerror = () => reject(new Error('ropa no disponible')); document.head.appendChild(sc);
      };
      if (!THREE.GLTFLoader) { reject(new Error('sin GLTFLoader')); return; }
      new THREE.GLTFLoader().load('assets/models/ropa/' + name + '.glb', resolve, undefined, fromB64);
    }).then(g => { ropaCache[name] = g; return g; }, () => { ropaCache[name] = 'error'; });
    ropaCache[name] = p;
    return p;
  }
  // Material por nombre (ver tools/blender/ropa_lib.py): TELA = color/estampado elegido, ACENTO = 2.º color, PAJA = paja
  // (three r128: una malla con piel necesita material.skinning = true; si no, se dibuja quieta en pose T)
  const skinCache = {};
  // Modelo de Blender para la pieza y estilo: def.glb es un nombre o un mapa estilo → nombre (sin entrada = versión simple)
  function glbName(def, style) {
    if (!def.glb) return null;
    if (typeof def.glb === 'string') return def.glb;
    return def.glb[style] || def.glb['*'] || null;
  }
  function ropaMaterial(m, color, style) {
    const W = window.AVWardrobe;
    let base = m, key = null;
    if (/^TELA/.test(m.name) && W) {
      // la gorra criolla lleva la copa de paja; la playera, estampado tropical
      const st = style === 'criolla' ? 'paja' : style === 'playera' ? 'caribe' : style;
      base = W.cloth(st, st === 'paja' ? '#d9b56a' : color); key = 'tela' + st + color;
    }
    else if (/^PAJA/.test(m.name) && W) { base = W.cloth('paja', '#d9b56a'); key = 'paja'; }
    else if (/^ACENTO/.test(m.name)) { base = m.clone(); base.color.set(color); }
    else if (/^VIDRIO/.test(m.name)) { base = m.clone(); base.transparent = true; base.opacity = Math.min(base.opacity, 0.55); base.depthWrite = false; }
    if (key && skinCache[key]) return skinCache[key];
    const s = base === m ? m.clone() : base.clone();
    s.skinning = true;
    if (key) { skinCache[key] = s; s.userData.shared = true; }
    return s;
  }
  const HEAD_R = () => (mountsInfo && mountsInfo.head_sphere && mountsInfo.head_sphere.radius) || 0.5104;
  // ---------- Geometría de accesorios (piezas simples, materiales reutilizables) ----------
  const matCache = {};
  function mat(color, opts) {
    const key = color + JSON.stringify(opts || {});
    if (!matCache[key]) { matCache[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.05 }, opts || {})); matCache[key].userData.shared = true; }
    return matCache[key];
  }
  // Libera la GPU de una pieza quitada: geometría propia y materiales sin caché. Las texturas están todas en caché
  // (estampados, banderas, parches) y la ropa de Blender comparte geometría con el modelo cargado: esas se conservan.
  function disposeObject(obj, sharedGeometry) {
    obj.traverse(o => {
      if (o.isSkinnedMesh && o.skeleton && o.userData.isAccessory) o.skeleton.dispose();
      if (o.geometry && !sharedGeometry) o.geometry.dispose();
      if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (!m.userData.shared) m.dispose();
    });
  }
  function unmountSlot(ch, slot) {
    const m = ch.mounted[slot]; if (!m) return;
    for (const obj of m.objects) { if (obj.parent) obj.parent.remove(obj); disposeObject(obj, !!m.blender); }
    delete ch.mounted[slot];
  }
  // Todas las medidas en unidades de "radio de cabeza" (R); se escalan al montar
  function buildAccessory(id, color, style) {
    const def = ACCESSORIES.find(a => a.id === id);
    if (def && def.fit) {
      // Pieza ajustada: para la miniatura se juntan todas sus partes en el espacio del modelo
      const g = new THREE.Group(); g.name = 'acc_' + id;
      for (const p of def.fit(color, styleOf(def, style))) g.add(p.obj);
      g.traverse(o => { if (o.isMesh) o.userData.isAccessory = true; });
      return g;
    }
    if (def && def.build) {
      // Pieza del ropero en metros: se lleva a "radios de cabeza" como las demás
      const g = new THREE.Group(); g.name = 'acc_' + id;
      const inner = def.build(color, styleOf(def, style)); inner.scale.setScalar(1 / HEAD_R()); g.add(inner);
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.isAccessory = true; } });
      return g;
    }
    const g = new THREE.Group(); g.name = 'acc_' + id;
    const pat = style && style !== 'liso' && window.AVWardrobe;
    const M = pat ? new THREE.MeshStandardMaterial({ map: window.AVWardrobe.pattern(style, color), roughness: 0.85 }) : mat(color), dark = mat('#2b2016', { roughness: 0.5 }), metal = mat('#c9d4d9', { metalness: 0.7, roughness: 0.3 });
    if (id === 'gafas') {
      const lens = new THREE.MeshPhysicalMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0.1 });
      for (const x of [-0.37, 0.37]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 10, 28), M); rim.position.set(x, 0, 0); g.add(rim);
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 24, 1, true), M); cup.rotation.x = Math.PI / 2; cup.position.set(x, 0, -0.04); g.add(cup);
        const l = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), lens); l.position.set(x, 0, 0.01); g.add(l);
      }
      const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 14, Math.PI), M); bridge.position.y = 0.08; g.add(bridge);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 40, Math.PI * 1.25), dark); strap.rotation.set(Math.PI / 2, 0, Math.PI * 0.375); strap.position.z = -0.45; g.add(strap);
    } else if (id === 'sombrero') {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.42, 28), M); crown.position.y = 0.2; g.add(crown);
      const dent = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 8, 0, Math.PI * 2, 0, Math.PI / 3), M); dent.position.y = 0.32; dent.scale.y = 0.5; g.add(dent);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.04, 36), M); brim.position.y = 0.0; g.add(brim);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.505, 0.505, 0.08, 28, 1, true), dark); band.position.y = 0.06; g.add(band);
    } else if (id === 'panuelo') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.11, 10, 36), M); ring.rotation.x = Math.PI / 2; g.add(ring);
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 3), M); knot.position.set(0, -0.25, 0.48); knot.rotation.set(Math.PI + 0.25, 0, 0); g.add(knot);
    } else if (id === 'brujula') {
      const cord = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.018, 6, 30, Math.PI), dark); cord.rotation.z = Math.PI; cord.position.y = 0.42; g.add(cord);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 24), M); body.rotation.x = Math.PI / 2; g.add(body);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.135, 24), mat('#f4f1e6')); face.position.z = 0.032; g.add(face);
      const needle = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 4), mat('#d6403a')); needle.position.z = 0.04; needle.rotation.z = 0.5; g.add(needle);
    } else if (id === 'mochila') {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.32), M); pack.position.z = -0.16; g.add(pack);
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.26, 0.34), mat('#5a3a22')); flap.position.set(0, 0.26, -0.15); g.add(flap);
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.72, 16), mat('#7a5634')); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.44, -0.2); g.add(roll);
      for (const x of [-0.2, 0.2]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.04), dark); st.position.set(x, 0, 0.02); g.add(st); }
      g.userData.placeholder = true;
    } else if (id === 'brazaletes') {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 24), M); band.rotation.y = Math.PI / 2; g.add(band);
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), metal); stud.position.set(0, 0.16, 0); g.add(stud);
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.isAccessory = true; } });
    return g;
  }

  // ---------- Instancia de personaje ----------
  class Character {
    constructor(gltf) {
      this.root = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true);
      this.root.name = 'personaje';
      this.bones = {};
      this.materials = {};
      this.root.traverse(o => {
        if (o.isBone) this.bones[o.name] = o;
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
          o.material = Array.isArray(o.material) ? o.material.map(m => this._own(m)) : this._own(o.material);
        }
      });
      this.root.updateMatrixWorld(true);
      this.restQuat = {};
      const qRoot = this.root.getWorldQuaternion(new THREE.Quaternion()).invert();
      for (const n of MOUNTS) if (this.bones[n]) this.restQuat[n] = qRoot.clone().multiply(this.bones[n].getWorldQuaternion(new THREE.Quaternion()));
      // Matriz de reposo de cada hueso respecto al personaje: la ropa ajustada se construye en ese espacio
      const rootInv = this.root.matrixWorld.clone().invert();
      this.restMat = {};
      for (const [n, b] of Object.entries(this.bones)) this.restMat[n] = rootInv.clone().multiply(b.matrixWorld);
      const box = new THREE.Box3().setFromObject(this.root);
      this.height = box.getSize(new THREE.Vector3()).y || 1;
      this.mixer = new THREE.AnimationMixer(this.root);
      this.clips = {};
      for (const c of gltf.animations) this.clips[c.name] = c;
      this.actions = {};
      this.current = null;
      this.mounted = {};
      this.headR = (mountsInfo && mountsInfo.head_sphere && mountsInfo.head_sphere.radius) || this.height * 0.2;
      this.look = defaultLook();
      this.lids = this._buildLids();
      this.expression = 'neutral'; this.talking = false;
      if (this.clips.Idle) this.play('Idle');
    }
    // Párpados: cúpula sobre cada ojo pintado, pegada al hueso de la cabeza. scale.y 0 = abierto, 1 = cerrado.
    _buildLids() {
      const head = this.bones.cabeza001, E = mountsInfo && mountsInfo.eye_lids;
      if (!head || !E) return [];
      const mat = new THREE.MeshStandardMaterial({ color: '#4f9e30', roughness: 0.85 });
      this.root.updateMatrixWorld(true);
      const qHeadInv = head.getWorldQuaternion(new THREE.Quaternion()).invert(), ws = head.getWorldScale(new THREE.Vector3());
      return ['L', 'R'].map(k => {
        // Cúpula algo más ancha y abombada que el ojo pintado, para cubrirlo sin hundirse en él
        const r = E[k].radius * 1.18, depth = E[k].bulge * 1.9 + 0.006;
        const geo = new THREE.SphereGeometry(r, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        geo.rotateX(Math.PI / 2); geo.scale(1, 1, depth / r); geo.translate(0, -r, 0); // borde superior en el origen
        const p = new THREE.Vector3().fromArray(E[k].center), n = new THREE.Vector3().fromArray(E[k].normal).normalize();
        const x = new THREE.Vector3(0, 1, 0).cross(n).normalize(), y = n.clone().cross(x);
        const pivot = new THREE.Object3D();
        pivot.position.copy(head.worldToLocal(p.clone().addScaledVector(y, r).addScaledVector(n, -0.004)));
        pivot.quaternion.copy(qHeadInv.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, n))));
        pivot.scale.set(1 / ws.x, 1 / ws.y, 1 / ws.z);
        const lid = new THREE.Mesh(geo, mat); lid.scale.y = 0.05; lid.castShadow = false;
        pivot.add(lid); head.add(pivot);
        return lid;
      });
    }
    _own(m) {
      const c = m.clone(); this.materials[m.name] = c; c.userData.base = c.color ? c.color.clone() : null;
      if (maskTexture && c.map) this._addMaskTint(c);
      return c;
    }
    // Recolor por especie con la máscara (R parche, G anillo de ojos, B pico): conserva el detalle de la textura original
    _addMaskTint(m) {
      const u = this.tint || (this.tint = {
        maskMap: { value: maskTexture },
        patchColor: { value: new THREE.Color('#d63a2f') }, ringColor: { value: new THREE.Color('#f4f4f0') }, beakColor: { value: new THREE.Color('#f2a23a') },
        tintOn: { value: new THREE.Vector3(0, 0, 0) },
      });
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, u);
        sh.fragmentShader = 'uniform sampler2D maskMap; uniform vec3 patchColor; uniform vec3 ringColor; uniform vec3 beakColor; uniform vec3 tintOn;\n' +
          sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
            vec4 mk = texture2D(maskMap, vUv);
            float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            float shade = clamp(0.55 + lum * 0.7, 0.0, 1.25);
            diffuseColor.rgb = mix(diffuseColor.rgb, patchColor * shade, mk.r * tintOn.x);
            diffuseColor.rgb = mix(diffuseColor.rgb, ringColor * shade, mk.g * tintOn.y);
            diffuseColor.rgb = mix(diffuseColor.rgb, beakColor * shade, mk.b * tintOn.z);`);
      };
      m.customProgramCacheKey = () => 'avmask';
      m.needsUpdate = true;
    }
    missingMounts() { return MOUNTS.filter(n => !this.bones[n]); }
    play(name, once) {
      const clip = this.clips[name]; if (!clip) return false;
      const a = this.actions[name] || (this.actions[name] = this.mixer.clipAction(clip));
      if (once) {
        a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false;
        if (this.current) this.current.crossFadeTo(a, 0.25, false);
        a.play();
        const back = e => { if (e.action === a) { this.mixer.removeEventListener('finished', back); this.play('Idle'); } };
        this.mixer.addEventListener('finished', back);
      } else {
        a.reset(); a.setLoop(THREE.LoopRepeat, Infinity);
        if (this.current && this.current !== a) this.current.crossFadeTo(a, 0.3, false);
        a.play(); this.current = a;
      }
      return true;
    }
    // wingMode: 'idle' | 'walk' | 'flap' (subiendo) | 'glide' (planeando). Se suma encima del clip activo.
    // El mixer solo reescribe un hueso cuando el valor del clip cambia, así que los ajustes del cuadro
    // anterior se deshacen antes de mezclar; si no, se acumulan y el cuerpo termina girado.
    update(dt) {
      for (const [bone, ax, v] of this.ofs || []) bone.rotation[ax] -= v;
      this.ofs = [];
      this.mixer.update(dt);
      const L = this.bones.armL1, R = this.bones.armL1001;
      if (!L || !R) return;
      const t = this.wingT = (this.wingT || 0) + dt;
      const mode = this.wingMode || 'idle';
      // Nado de ave real: las dos alas reman a la vez sobre el agua. Fase de empuje (sin>0): abiertas y hacia atrás;
      // recuperación: cerradas, codo doblado y hacia adelante. swimRate (Hz) lo pone el juego: lento quieto, más rápido avanzando.
      if (mode === 'swim' || mode === 'dive') {
        this.sPh = ((this.sPh || 0) + dt * (this.swimRate || 0.7) * Math.PI * 2) % (Math.PI * 2);
      }
      const sS = Math.sin(this.sPh || 0), sC = Math.cos(this.sPh || 0);
      const open = mode === 'swim' ? 0.62 + 0.3 * sS : mode === 'dive' ? -0.05
        : mode === 'fly' ? 0.85 + 0.6 * Math.sin(t * 12)
        : mode === 'flap' ? 0.8 + 0.6 * Math.sin(t * 20)
        : mode === 'glide' ? 1.2 + 0.08 * Math.sin(t * 9)
        : mode === 'walk' ? 0.14 + 0.06 * Math.sin(t * 11) : 0.05 * Math.sin(t * 2.2);
      const swing = mode === 'walk' ? 0.3 * Math.sin(t * 11) : 0;            // alterno (caminar)
      const reach = mode === 'swim' ? 0.55 * sC : mode === 'dive' ? 0.45 : 0;  // a la vez (remar / pegadas al bucear)
      const k = 1 - Math.exp(-dt * 12);
      this.wOpen = (this.wOpen || 0) + (open - (this.wOpen || 0)) * k;
      this.wSwing = (this.wSwing || 0) + (swing - (this.wSwing || 0)) * k;
      this.wReach = (this.wReach || 0) + (reach - (this.wReach || 0)) * k;
      this.rot(L, "z", this.wOpen); this.rot(R, "z", -this.wOpen);
      this.rot(L, "x", this.wSwing + this.wReach); this.rot(R, "x", -this.wSwing + this.wReach);
      if (mode === 'swim') for (const el of ['armL2', 'armL2001']) if (this.bones[el]) this.rot(this.bones[el], "x", 0.15 + 0.6 * Math.max(0, -sS));
      // Sacudirse el agua al salir: temblor rápido de cuerpo, cabeza y alas
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        const env = Math.sin(Math.min(1, this.shakeT / 0.7) * Math.PI), q = Math.sin(t * 48) * env;
        if (this.bones.espalda1) this.rot(this.bones.espalda1, "y", q * 0.35);
        if (this.bones.cabeza) this.rot(this.bones.cabeza, "y", -q * 0.5);
        this.rot(L, "z", 0.35 * env); this.rot(R, "z", -0.35 * env);
      }
      this.locomotion(dt, k);
      this.face(dt);
      this.emotePose(dt);
    }
    // Gestos de cuerpo entero (emote: 'dance' | 'fight' | 'angry' | 'annoyed' | 'idea'), con transición suave.
    // Hombro: -X adelanta; abrir hacia arriba/afuera es +Z en el izquierdo y -Z en el derecho. Codo +X dobla.
    emotePose(dt) {
      const B = this.bones;
      if (this.emote !== this.emoteLast) { if (this.emote) { this.emoteT = 0; this.emoteName = this.emote; } this.emoteLast = this.emote; }
      this.eW = (this.eW || 0) + ((this.emote ? 1 : 0) - (this.eW || 0)) * (1 - Math.exp(-dt * 8));
      const w = this.eW;
      if (w < 0.01 || !this.emoteName) return;
      const t = this.emoteT = (this.emoteT || 0) + dt, P = Math.PI * 2;
      const arm = (side, x, zOut, elbow) => {
        const sh = B[side === 'L' ? 'armL1' : 'armL1001'], el = B[side === 'L' ? 'armL2' : 'armL2001'];
        if (!sh || !el) return;
        this.rot(sh, 'x', x * w); this.rot(sh, 'z', (side === 'L' ? zOut : -zOut) * w); this.rot(el, 'x', elbow * w);
      };
      const leg = (side, hip, knee, ankle) => {
        const s = side === 'L' ? '' : '001';
        if (!B['pieL1' + s]) return;
        this.rot(B['pieL1' + s], 'x', hip * w); this.rot(B['pieL2' + s], 'x', knee * w); this.rot(B['pieL3' + s], 'x', ankle * w);
      };
      const body = (lean, tilt, twist) => { if (B.espalda1) { this.rot(B.espalda1, 'x', lean * w); this.rot(B.espalda1, 'z', tilt * w); this.rot(B.espalda1, 'y', twist * w); } };
      const head = (x, y, z) => { if (B.cabeza) { this.rot(B.cabeza, 'x', x * w); this.rot(B.cabeza, 'y', y * w); this.rot(B.cabeza, 'z', z * w); } };
      const beak = v => { if (B.pico) this.rot(B.pico, 'x', v * w); };
      const lift = v => { this.root.position.y += v * w * this.root.scale.y; };
      switch (this.emoteName) {
        case 'dance': {
          const b = t * P * 2, h = Math.sin(b / 2);
          body(0.05, h * 0.22, h * 0.28); lift((1 - Math.cos(b)) * 0.03);
          arm('L', -0.4 * h, 0.9 + 0.5 * h, 0.7 + 0.4 * Math.sin(b));
          arm('R', 0.4 * h, 0.9 - 0.5 * h, 0.7 - 0.4 * Math.sin(b));
          leg('L', -0.2 * Math.max(0, h), -0.6 * Math.max(0, h), 0.3 * Math.max(0, h));
          leg('R', -0.2 * Math.max(0, -h), -0.6 * Math.max(0, -h), 0.3 * Math.max(0, -h));
          head(Math.sin(b) * 0.08, 0, h * 0.18); beak(0.12 * Math.max(0, Math.sin(b * 1.5)));
          break;
        }
        case 'fight': {
          const bounce = Math.sin(t * P * 2.5), cyc = t % 1.4, punch = cyc < 0.18 ? Math.sin(cyc / 0.18 * Math.PI) : 0, side = Math.floor(t / 1.4) % 2;
          body(0.18, 0, 0.3); lift(-0.03 + bounce * 0.015);
          leg('L', -0.15, -0.3, 0.3); leg('R', -0.15, -0.3, 0.3);
          arm('L', -0.9 - (side === 0 ? 0.5 * punch : 0), 0.15, 1.6 - (side === 0 ? 1.3 * punch : 0));
          arm('R', -0.9 - (side === 1 ? 0.5 * punch : 0), 0.15, 1.6 - (side === 1 ? 1.3 * punch : 0));
          head(0.12, -0.15, 0); beak(punch * 0.12);
          break;
        }
        case 'angry': {
          const st = t % 0.55, up = st < 0.3 ? Math.sin(st / 0.3 * Math.PI) : 0, stomp = st > 0.3 && st < 0.38 ? 1 : 0;
          body(0.15, 0, 0); lift(-stomp * 0.015);
          leg('L', -0.25 * up, -0.9 * up, 0.4 * up);
          arm('L', -0.15, -0.15, 0.6); arm('R', -0.15, -0.15, 0.6);
          head(0.2, Math.sin(t * 25) * 0.07 * (t < 0.6 ? 1 : 0.3), 0); beak(0.16 * Math.max(0, Math.sin(t * 16)));
          break;
        }
        case 'annoyed': {
          const tap = Math.max(0, Math.sin(t * P * 3));
          arm('L', -0.7, -0.35, 1.9); arm('R', -0.7, -0.35, 1.9);
          leg('R', 0, -0.1 * tap, 0.35 * tap);
          body(0, 0, 0.15); head(0.04, Math.sin(t * 1.5) * 0.2, 0.15);
          beak(t % 2 < 0.4 ? 0.08 : 0);
          break;
        }
        case 'idea': {
          const up = Math.min(1, t / 0.3);
          lift(0.08 * Math.sin(Math.min(1, t / 0.35) * Math.PI));
          arm('L', -1.9 * up, 0.2, 0.3); arm('R', -0.1, 0, 0.3);
          body(-0.08, 0, 0); head(-0.2 * up, 0, 0.1);
          for (const n of ['armL2002', 'armL2003']) if (B[n]) this.rot(B[n], 'x', -0.4 * w * up); // dedo índice estirado
          break;
        }
      }
    }
    // Cara y manos: parpadeo, expresión (párpados, pico, cabeza), hablar, mirar alrededor, gestos y dedos.
    // Ejes medidos: pico +X abre; cabeza X asiente, Y gira, Z ladea; codo +X dobla; dedos +X cierran.
    face(dt) {
      const B = this.bones, t = this.wingT || 0, k = 1 - Math.exp(-dt * 7);
      const EX = {
        neutral: [0.05, 0, 0, 0], happy: [0.42, 0.12, -0.06, 0.14], surprised: [0, 0.3, -0.16, 0],
        sad: [0.55, 0, 0.22, -0.1], curious: [0.22, 0.05, 0.04, 0.26], angry: [0.48, 0.06, 0.12, 0],
        idea: [0, 0.18, -0.2, 0], fight: [0.38, 0.05, 0.14, 0], annoyed: [0.52, 0, 0.04, 0.16],
      };
      const e = EX[this.expression] || EX.neutral;
      const ex = this.ex || (this.ex = e.slice());
      for (let i = 0; i < 4; i++) ex[i] += (e[i] - ex[i]) * k;
      // Parpadeo con pausas al azar; a veces doble
      this.blinkIn = (this.blinkIn == null ? 1 + Math.random() * 2 : this.blinkIn) - dt;
      if (this.blinkIn <= 0) { this.blinkT = 0.15; this.blinkIn = Math.random() < 0.15 ? 0.3 : 2 + Math.random() * 3.5; }
      let blink = 0;
      if (this.blinkT > 0) { this.blinkT -= dt; blink = Math.sin(Math.max(0, 1 - this.blinkT / 0.15) * Math.PI); }
      for (const lid of this.lids || []) lid.scale.y = Math.max(0.03, Math.min(1, ex[0] + blink * (1 - ex[0])));
      // Hablar: el pico abre y cierra con ritmo de sílabas
      let talk = 0;
      if (this.talking) { this.talkPh = (this.talkPh || 0) + dt * 15; talk = Math.max(0, Math.sin(this.talkPh)) * (0.55 + 0.45 * Math.sin(this.talkPh * 0.37 + 1.3)) * 0.32; }
      this.talkV = (this.talkV || 0) + (talk - (this.talkV || 0)) * Math.min(1, dt * 25);
      if (B.pico) this.rot(B.pico, "x", ex[1] + this.talkV);
      // Mirar alrededor cuando está quieto
      this.lookIn = (this.lookIn || 0) - dt;
      if (this.lookIn <= 0) { this.lookIn = 1.5 + Math.random() * 3; this.lookGoal = [(Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.25]; }
      const still = !(this.gW > 0.1) && !this.talking, g = still ? (this.lookGoal || [0, 0]) : [0, 0];
      const lk = this.lk || (this.lk = [0, 0]);
      lk[0] += (g[0] - lk[0]) * Math.min(1, dt * 3); lk[1] += (g[1] - lk[1]) * Math.min(1, dt * 3);
      if (B.cabeza) {
        const nod = this.talking ? Math.sin((this.talkPh || 0) * 0.45) * 0.06 : 0;
        this.rot(B.cabeza, "y", lk[0]); this.rot(B.cabeza, "x", lk[1] + ex[2] + nod); this.rot(B.cabeza, "z", ex[3]);
      }
      // Gestos al hablar: una mano y luego la otra suben, codo doblado
      const gest = this.talking ? 1 : 0;
      this.gestW = (this.gestW || 0) + (gest - (this.gestW || 0)) * k;
      const gw = this.gestW, gp = (this.talkPh || 0) * 0.18;
      for (const [sh, el, sg, off] of [['armL1', 'armL2', 1, 0], ['armL1001', 'armL2001', -1, Math.PI]]) {
        if (!B[sh]) continue;
        const a = Math.max(0, Math.sin(gp + off)) * gw;
        this.rot(B[sh], "x", -0.5 * a); this.rot(B[sh], "z", 0.25 * a * sg);
        this.rot(B[el], "x", 0.12 + 0.9 * a);
      }
      // Dedos: algo cerrados en reposo, se abren al gesticular, con leve movimiento propio
      let i = 0;
      for (const n of FINGERS) if (B[n]) this.rot(B[n], "x", 0.18 + Math.sin(t * 1.4 + i++) * 0.05 - gw * 0.15);
    }
    rot(bone, ax, v) { bone.rotation[ax] += v; this.ofs.push([bone, ax, v]); }
    // Paso procedural encima del clip: gait 0 quieto, 1 caminar, 2 correr; airborne recoge las patas.
    // Ejes medidos en el rig: muslo -X adelanta el pie, rodilla -X lo levanta, tobillo +X lo aplana.
    locomotion(dt, k) {
      const B = this.bones, g = this.gait || 0, run = g > 1.5;
      this.gW = (this.gW || 0) + ((g > 0 ? 1 : 0) - (this.gW || 0)) * k;
      this.aW = (this.aW || 0) + ((this.airborne ? 1 : 0) - (this.aW || 0)) * k;
      const w = this.gW, aw = this.aW;
      if (w > 0.01) this.ph = ((this.ph || 0) + dt * (this.swimming ? (run ? 2.6 : 1.4) : run ? 4.8 : 3.4) * Math.PI * 2) % (Math.PI * 2);
      const ph = this.ph || 0, s = Math.sin(ph), c = Math.cos(ph);
      const A = (run ? 0.8 : 0.55) * w;
      for (const [hip, knee, ankle, sg] of [['pieL1', 'pieL2', 'pieL3', 1], ['pieL1001', 'pieL2001', 'pieL3001', -1]]) {
        if (!B[hip]) continue;
        const sw = s * sg, lift = Math.max(0, c * sg) * w * (run ? 1.1 : 0.85);
        // Nadando el cuerpo va tumbado: las patas se adelantan ~1 rad para quedar debajo y patalear en el agua
        this.rot(B[hip], "x", -A * sw + aw * 0.55 - (this.swimming && !this.diving ? 1.0 : 0));
        this.rot(B[knee], "x", -lift * 0.95 - aw * 0.7);
        this.rot(B[ankle], "x", lift * 0.45 + A * sw * 0.25 + aw * 0.3);
      }
      if (B.espalda1) {
        this.rot(B.espalda1, "x", (run ? 0.2 : 0.08) * w + aw * 0.12);
        this.rot(B.espalda1, "z", s * 0.07 * w);
      }
      if (B.cabeza) {
        this.rot(B.cabeza, "x", -((run ? 0.14 : 0.05) + Math.cos(ph * 2) * 0.04) * w);
        this.rot(B.cabeza, "z", -s * 0.05 * w);
      }
      if (B.espalda1001) this.rot(B.espalda1001, "z", Math.sin(ph + 1) * 0.12 * w);
      // Cintura: la cadera gira con el paso y el pecho contrarresta
      if (B.espalda1 && B.espalda2) { this.rot(B.espalda1, "y", s * 0.14 * w); this.rot(B.espalda2, "y", -s * 0.12 * w); }
      // Codos: más doblados al correr y cuando el brazo va adelante
      for (const [el, sg] of [['armL2', 1], ['armL2001', -1]]) if (B[el]) this.rot(B[el], "x", (run ? 0.55 : 0.25) * w + Math.max(0, s * sg) * 0.2 * w);
      // Nadando: la cabeza mira al frente aunque el cuerpo vaya tumbado, y no hay rebote de pasos
      // (el cuerpo va casi horizontal; el cuello levanta la cabeza para llevar el pico fuera del agua)
      if (this.swimming) { if (B.cabeza) this.rot(B.cabeza, "x", this.diving ? 0.3 : -0.75); if (B.espalda2) this.rot(B.espalda2, "x", this.diving ? 0 : -0.25); return; }
      // Rebote del cuerpo: dos subidas por ciclo (una por pie); el juego fija root.position antes de update
      this.root.position.y += (1 - Math.cos(ph * 2)) * 0.5 * (run ? 0.09 : 0.05) * w * this.root.scale.y;
    }
    setSpecies(id) {
      const s = SPECIES[id] || SPECIES.vittata;
      this.species = id;
      if (this.tint) {
        const base = SPECIES.vittata, on = this.tint.tintOn.value;
        this.tint.patchColor.value.set(s.patch); this.tint.ringColor.value.set(s.ring); this.tint.beakColor.value.set(s.beak || '#f2a23a');
        on.set(s.patch !== base.patch ? 1 : 0, s.ring !== base.ring ? 1 : 0, s.beak ? 1 : 0);
        return;
      }
      const set = (name, hex) => { const m = this.materials[name]; if (!m) return; if (hex) m.color.set(hex); else if (m.userData.base) m.color.copy(m.userData.base); };
      set('Patch', s.patch); set('Ring', s.ring); set('WingTip', s.wingTip); set('Beak', s.beak || null);
    }
    // Engancha las mallas con piel de una pieza de Blender al esqueleto de este personaje (huesos por nombre)
    _mountRopa(def, want) {
      const gltf = ropaCache[glbName(def, want.style)];
      const sceneCopy = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true);
      let body = null; this.root.traverse(o => { if (o.isSkinnedMesh && !o.userData.isAccessory && !body) body = o; });
      if (!body) return null;
      const out = [];
      sceneCopy.traverse(o => { if (o.isSkinnedMesh) out.push(o); });
      for (const mesh of out) {
        const bones = mesh.skeleton.bones.map(b => this.bones[b.name]);
        if (bones.some(b => !b)) return null;
        mesh.bind(new THREE.Skeleton(bones, mesh.skeleton.boneInverses.map(m => m.clone())), mesh.bindMatrix);
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const swap = mats.map(m => ropaMaterial(m, want.color, want.style));
        mesh.material = Array.isArray(mesh.material) ? swap : swap[0];
        mesh.castShadow = true; mesh.frustumCulled = false; mesh.userData.isAccessory = true;
        body.parent.add(mesh);
      }
      return out;
    }
    // Monta, quita o recolorea cada ranura; el accesorio queda como hijo del hueso y sigue sus animaciones
    applyLook(look) {
      this.look = normalizeLook(look);
      this.setSpecies(this.look.species);
      for (const slot of SLOTS) {
        const want = this.look.accessories[slot];
        const have = this.mounted[slot];
        if (have && (!want || have.id !== want.id || have.color !== want.color || have.style !== want.style)) unmountSlot(this, slot);
        if (want && !this.mounted[slot]) {
          const def = ACCESSORIES.find(a => a.id === want.id);
          const objects = [];
          // Pieza modelada en Blender (con piel sobre el mismo esqueleto): si ya está cargada se usa;
          // si no, se monta la versión simple y se cambia sola cuando termine de cargar.
          const gname = glbName(def, want.style);
          if (gname && ropaCache[gname] && ropaCache[gname] !== 'error' && !ropaCache[gname].then) {
            const objs = this._mountRopa(def, want);
            if (objs) { this.mounted[slot] = { id: want.id, color: want.color, style: want.style, objects: objs, blender: true }; continue; }
          }
          if (gname && !ropaCache[gname]) {
            loadRopa(gname).then(() => {
              const cur = this.look.accessories[slot], m = this.mounted[slot];
              if (cur && m && cur.id === want.id && cur.style === want.style && cur.color === want.color && !m.blender) {
                unmountSlot(this, slot); this.applyLook(this.look);
              }
            });
          }
          if (def.fit) {
            // Cada parte se pasa del espacio del modelo en reposo al espacio de su hueso, y lo sigue al animarse
            for (const part of def.fit(want.color, want.style)) {
              const bone = this.bones[part.bone], rest = this.restMat[part.bone]; if (!bone || !rest) continue;
              part.obj.applyMatrix4(rest.clone().invert());
              part.obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.isAccessory = true; } });
              bone.add(part.obj); objects.push(part.obj);
            }
            this.mounted[slot] = { id: want.id, color: want.color, style: want.style, objects };
            continue;
          }
          for (const mountName of [def.mount, def.mount2].filter(Boolean)) {
            const bone = this.bones[mountName]; if (!bone) continue;
            const acc = buildAccessory(def.id, want.color, want.style);
            const ws = new THREE.Vector3(); bone.getWorldScale(ws);
            const rs = new THREE.Vector3(); this.root.getWorldScale(rs);
            const k = 1 / ((ws.x || 1) / (rs.x || 1));
            const inv = (this.restQuat[mountName] || new THREE.Quaternion()).clone().invert();
            // El accesorio se orienta como el personaje en reposo y luego sigue al hueso en cada animación
            acc.quaternion.copy(inv);
            const off = new THREE.Vector3().fromArray(def.offset || [0, 0, 0]).multiplyScalar(this.headR);
            if (mountName.endsWith('_R')) off.x *= -1;
            let size = def.size ? def.size * this.headR : this.headR;
            if (def.wrap && mountsInfo && mountsInfo.mounts && mountsInfo.mounts[mountName] && mountsInfo.head_sphere) {
              // El montaje está en la superficie del frente del cuello: el centro del cuello queda detrás
              const mp = new THREE.Vector3().fromArray(mountsInfo.mounts[mountName].position);
              const axis = new THREE.Vector3(0, mp.y, mountsInfo.head_sphere.center[2] - 0.02);
              const neckR = Math.hypot(mp.x - axis.x, mp.z - axis.z);
              off.set(axis.x - mp.x, off.y, axis.z - mp.z);
              size = (neckR * 1.3 + 0.02) / 0.5; // el aro mide 0.5 unidades de radio; holgura para el pecho
            }
            acc.position.copy(off.applyQuaternion(inv).multiplyScalar(k));
            acc.scale.setScalar(size * k);
            bone.add(acc); objects.push(acc);
          }
          this.mounted[slot] = { id: want.id, color: want.color, style: want.style, objects };
        }
      }
    }
  }

  async function create() { const gltf = await loadGLTF(); return new Character(gltf); }

  // ---------- Retrato: misma cámara y luz para el creador, el juego y el cómic ----------
  let portraitRig = null;
  async function renderPortrait(look, size, pose) {
    if (!portraitRig) {
      const canvas = document.createElement('canvas');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight('#ffe9c4', '#1f3a2c', 0.8));
      const key = new THREE.DirectionalLight('#ffd9a0', 1.1); key.position.set(2, 3, 4); scene.add(key);
      const rim = new THREE.DirectionalLight('#9fd7ff', 0.6); rim.position.set(-3, 2, -2); scene.add(rim);
      const camera = new THREE.PerspectiveCamera(26, 1, 0.01, 100);
      const ch = await create();
      scene.add(ch.root);
      portraitRig = { canvas, renderer, scene, camera, ch };
    }
    const { canvas, renderer, scene, camera, ch } = portraitRig;
    renderer.setSize(size, size, false);
    ch.applyLook(look);
    // Pose estable del retrato: un fotograma fijo de Welcome (o Idle)
    ch.mixer.stopAllAction();
    const clip = ch.clips[pose || 'Welcome'] || ch.clips.Idle;
    if (clip) { const a = ch.mixer.clipAction(clip); a.reset().play(); ch.mixer.setTime(clip.duration * 0.45); }
    ch.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(ch.root);
    const h = box.max.y - box.min.y;
    const target = new THREE.Vector3(0, box.min.y + h * 0.68, 0);
    camera.position.set(h * 0.5, box.min.y + h * 0.82, h * 3.0);
    camera.lookAt(target);
    renderer.render(scene, camera);
    return canvas;
  }

  window.AVCharacter = { SPECIES, ACCESSORIES, SLOTS, MOUNTS, BASE_IDS, create, loadGLTF, buildAccessory, disposeObject, normalizeLook, defaultLook, renderPortrait, mountsInfo: () => mountsInfo };
})();
