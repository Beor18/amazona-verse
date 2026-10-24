/* Amazona Verse · personaje 3D modular
   Carga el modelo con esqueleto (assets/models/vittata.glb), crea instancias independientes,
   monta accesorios 3D en huesos de montaje y renderiza retratos idénticos para el juego y el cómic. */
(function () {
  'use strict';

  const MODEL_URL = 'assets/models/vittata.glb';
  const MOUNTS = ['mount_head_top', 'mount_eyes', 'mount_neck', 'mount_chest', 'mount_back', 'mount_wing_L', 'mount_wing_R'];

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
    { id: 'panuelo', slot: 'neck', mount: 'mount_neck', offset: [0, -0.1, 0], wrap: true, name: 'Pañuelo aventurero', colors: ['#f2a03d', '#3d8fb0', '#d6403a', '#2f8f4e', '#7a4fb3', '#e8c32a'], placeholder: false },
    { id: 'brujula', slot: 'chest', mount: 'mount_chest', offset: [0, 0, 0.06], name: 'Brújula colgante', colors: ['#c9a227', '#b9c4c9', '#b87333'], placeholder: false },
    { id: 'mochila', slot: 'back', mount: 'mount_back', offset: [0, 0, -0.05], name: 'Mochila de exploración', colors: ['#8a5a2b', '#2f8f4e', '#3d8fb0', '#d6403a'], placeholder: true },
    { id: 'brazaletes', slot: 'wings', mount: 'mount_wing_L', mount2: 'mount_wing_R', offset: [0, -0.06, 0], size: 0.8, name: 'Brazaletes de constructor', colors: ['#c9a227', '#3d8fb0', '#d6403a', '#2b2b2b'], placeholder: false },
  ];
  const SLOTS = ['head', 'eyes', 'neck', 'chest', 'back', 'wings'];

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
        if (def) out.accessories[slot] = { id: def.id, color: def.colors.includes(a.color) ? a.color : def.colors[0] };
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

  // ---------- Geometría de accesorios (piezas simples, materiales reutilizables) ----------
  const matCache = {};
  function mat(color, opts) {
    const key = color + JSON.stringify(opts || {});
    if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.05 }, opts || {}));
    return matCache[key];
  }
  // Todas las medidas en unidades de "radio de cabeza" (R); se escalan al montar
  function buildAccessory(id, color) {
    const g = new THREE.Group(); g.name = 'acc_' + id;
    const M = mat(color), dark = mat('#2b2016', { roughness: 0.5 }), metal = mat('#c9d4d9', { metalness: 0.7, roughness: 0.3 });
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
      if (this.clips.Idle) this.play('Idle');
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
    update(dt) { this.mixer.update(dt); }
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
    // Monta, quita o recolorea cada ranura; el accesorio queda como hijo del hueso y sigue sus animaciones
    applyLook(look) {
      this.look = normalizeLook(look);
      this.setSpecies(this.look.species);
      for (const slot of SLOTS) {
        const want = this.look.accessories[slot];
        const have = this.mounted[slot];
        if (have && (!want || have.id !== want.id || have.color !== want.color)) { for (const obj of have.objects) obj.parent && obj.parent.remove(obj); delete this.mounted[slot]; }
        if (want && !this.mounted[slot]) {
          const def = ACCESSORIES.find(a => a.id === want.id);
          const objects = [];
          for (const mountName of [def.mount, def.mount2].filter(Boolean)) {
            const bone = this.bones[mountName]; if (!bone) continue;
            const acc = buildAccessory(def.id, want.color);
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
          this.mounted[slot] = { id: want.id, color: want.color, objects };
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

  window.AVCharacter = { SPECIES, ACCESSORIES, SLOTS, MOUNTS, create, loadGLTF, buildAccessory, normalizeLook, defaultLook, renderPortrait, mountsInfo: () => mountsInfo };
})();
