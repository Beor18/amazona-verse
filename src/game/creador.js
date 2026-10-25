/* Juego · creador de personaje
   Taller de los Guardianes en 3D (src/personaje/showcase.js), una fila por ranura con miniaturas, estilos y colores,
   ropa bloqueada hasta ganarla (G.misiones.lockOf), nombre inventado validado y retratos idénticos para el juego y el cómic.
   También traduce perfiles 2D de versiones viejas (preset/outfit/accessory) al formato modular. */
AVE.module('creador', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$;
  const C3 = window.AVCharacter;
  // Perfiles 2D heredados (renders oficiales de especies): se siguen aceptando al cargar partidas y en las pruebas
  const PRESETS = [
    { id: 'agilis', name: 'Pico negro (agilis)' }, { id: 'albifrons', name: 'Frente blanca (albifrons)' },
    { id: 'amazonica', name: 'Ala naranja (amazonica)' }, { id: 'auropalliata', name: 'Nuca amarilla (auropalliata)' },
    { id: 'festiva', name: 'Festiva (festiva)' }, { id: 'guildingii', name: 'Multicolor (guildingii)' },
    { id: 'oratrix', name: 'Cabeza amarilla (oratrix)' }, { id: 'versicolor', name: 'Cara azul (versicolor)' },
  ];
  const OUTFITS = [
    { id: 'naranja', name: 'Pañuelo naranja', color: '#f2a03d' }, { id: 'rojo', name: 'Pañuelo rojo', color: '#d6403a' },
    { id: 'azul', name: 'Pañuelo azul', color: '#3d8fb0' }, { id: 'morado', name: 'Pañuelo morado', color: '#7a4fb3' },
    { id: 'amarillo', name: 'Pañuelo amarillo', color: '#e8c32a' },
  ];
  // Nombre de aventurero: el niño lo ELIGE de dos listas (seguridad infantil: sin texto libre). Un pack puede dar las suyas
  // en pack.nombres { a: [...], b: [...] }; si las da, al cargar una partida un nombre que no salga de ellas se cambia por uno
  // de la lista (partidas viejas con nombre escrito a mano). saveCharacter(draft) por código sigue aceptando letras sueltas.
  const NOMBRES = Object.assign({
    a: ['Nube', 'Pluma', 'Brisa', 'Rayo', 'Trueno', 'Lluvia', 'Semilla', 'Hoja', 'Coral', 'Estrella', 'Luna', 'Sol', 'Ola', 'Flor', 'Viento', 'Cielo', 'Ceiba', 'Palma'],
    b: ['Azul', 'Verde', 'Veloz', 'Valiente', 'Feliz', 'Alegre', 'Brillante', 'Gentil', 'Tropical', 'Solar', 'del Río', 'del Monte', 'del Yunque', 'de la Bahía', 'del Mar'],
  }, G.pack.nombres);
  const nombreDe = (a, b) => a + ' ' + b;
  const esNombreDeLista = n => typeof n === 'string' && NOMBRES.a.some(a => n.startsWith(a + ' ') && NOMBRES.b.includes(n.slice(a.length + 1)));
  const nombreAzar = (semilla) => {
    const R = semilla != null ? G.util.rng(semilla) : Math.random;
    return nombreDe(NOMBRES.a[Math.floor(R() * NOMBRES.a.length)], NOMBRES.b[Math.floor(R() * NOMBRES.b.length)]);
  };
  // Solo letras (sin números, @ ni frases como "me llamo"): para nombres que llegan por código
  const NAME_OK = /^[\p{L} '\-]{1,24}$/u;
  // Texto libre del niño (nombre, título y viñetas del cómic): rechaza números, contactos, enlaces y frases de datos personales.
  // Devuelve el motivo o null si es seguro.
  function textoSeguro(t) {
    t = String(t || '');
    if (/[0-9]/.test(t)) return 'Sin números: pueden ser un teléfono, una edad o una dirección.';
    if (/@|https?:|www\.|\.(com|net|org|pr)\b/i.test(t)) return 'Sin correos ni enlaces.';
    if (/\b(me llamo|mi nombre|my name|i live|vivo en|mi casa|tel[eé]fono|phone|whatsapp|instagram|tiktok)\b/i.test(t)) return 'No escribas datos tuyos: este cómic es de tu personaje.';
    return null;
  }
  const SLOT_LABEL = { head: 'Cabeza', eyes: 'Ojos', neck: 'Cuello', torso: 'Camisa', chest: 'Pecho', back: 'Espalda', wings: 'Alas', legs: 'Pantalón', feet: 'Calzado', hand: 'En la mano' };
  const LEGACY_SPECIES = { agilis: 1, albifrons: 1, amazonica: 1, festiva: 1, guildingii: 1, oratrix: 1, versicolor: 1 };
  const playerSprite = G.actores.sprite;

  // Perfiles de versiones anteriores (preset/outfit/accessory) pasan al formato modular
  function profileLook(p) {
    if (p && p.look) return C3.normalizeLook(p.look);
    p = p || {};
    const outfit = (OUTFITS.find(o => o.id === p.outfit) || OUTFITS[0]).color;
    const acc = { neck: { id: 'panuelo', color: outfit } };
    if (p.accessory === 'gafas') acc.eyes = { id: 'gafas' };
    if (p.accessory === 'gorra') acc.head = { id: 'sombrero' };
    if (p.accessory === 'medalla') acc.chest = { id: 'brujula' };
    return C3.normalizeLook({ species: LEGACY_SPECIES[p.preset] ? p.preset : 'vittata', accessories: acc });
  }
  // Datos para el retrato 2D de respaldo (cuando no hay modelo 3D)
  function legacyFields(p) {
    if (p.preset && p.outfit) return p;
    const look = profileLook(p);
    const neck = look.accessories.neck, outfit = neck ? (OUTFITS.find(o => o.color === neck.color) || OUTFITS[0]).id : 'naranja';
    const accessory = look.accessories.eyes ? 'gafas' : look.accessories.head ? 'gorra' : look.accessories.chest ? 'medalla' : 'ninguno';
    return { name: p.name, preset: LEGACY_SPECIES[look.species] ? look.species : 'vittata', outfit, accessory };
  }
  // withBg = retrato de busto (creador, cómic, perfil); sin fondo = cuerpo entero para el sprite del mundo.
  // Los adornos se dibujan en coordenadas del render de 256 px y se transforman con el encuadre.
  async function drawPortrait(ctx, size, p, withBg) {
    p = legacyFields(p);
    const img = await G.assets.image(p.preset === 'vittata' ? playerSprite : 'assets/presets/' + p.preset + '.png');
    const outfit = (OUTFITS.find(o => o.id === p.outfit) || OUTFITS[0]).color;
    ctx.save();
    ctx.clearRect(0, 0, size, size);
    if (withBg) {
      const g = ctx.createRadialGradient(size * 0.5, size * 0.38, size * 0.05, size * 0.5, size * 0.5, size * 0.72);
      g.addColorStop(0, '#2d5a43'); g.addColorStop(1, '#10241c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 0.35; ctx.fillStyle = outfit;
      ctx.beginPath(); ctx.arc(size * 0.5, size * 1.05, size * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      const k = size / 164; ctx.scale(k, k); ctx.translate(-46, 2);
    } else ctx.scale(size / 256, size / 256);
    if (img) ctx.drawImage(img, 0, 0, 256, 256);
    // Pañuelo al cuello
    ctx.fillStyle = outfit; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(98, 120); ctx.quadraticCurveTo(128, 140, 160, 118); ctx.lineTo(164, 132);
    ctx.quadraticCurveTo(128, 156, 94, 134); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(122, 142); ctx.lineTo(112, 166); ctx.lineTo(134, 158); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#3a2a1a';
    if (p.accessory === 'gafas') {
      ctx.fillStyle = 'rgba(170,225,255,.4)';
      for (const cx of [108, 146]) { ctx.beginPath(); ctx.arc(cx, 52, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(121, 52); ctx.lineTo(133, 52); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (const cx of [103, 141]) { ctx.beginPath(); ctx.arc(cx, 47, 3, 0, Math.PI * 2); ctx.fill(); }
    } else if (p.accessory === 'gorra') {
      ctx.fillStyle = outfit;
      ctx.beginPath(); ctx.arc(127, 34, 30, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(150, 35, 22, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (p.accessory === 'medalla') {
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath(); ctx.arc(124, 150, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  let draftLook = null;
  const thumbCache = {};
  // Un solo renderizador para todas las miniaturas (crear uno por pieza agota los contextos WebGL del celular)
  let thumbRig = null;
  async function accessoryThumb(id, color, style) {
    const key = id + color + (style || '');
    if (thumbCache[key]) return thumbCache[key];
    if (!thumbRig) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 104;
      const rr = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
      rr.outputEncoding = THREE.sRGBEncoding; rr.toneMapping = THREE.ACESFilmicToneMapping; rr.toneMappingExposure = 0.7; // mismo color que el creador
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight('#fff4dc', '#2f5a3a', 0.9));
      const dl = new THREE.DirectionalLight('#ffffff', 0.9); dl.position.set(1, 2, 3); sc.add(dl);
      thumbRig = { cv, rr, sc, cam: new THREE.PerspectiveCamera(30, 1, 0.01, 50) };
    }
    const { cv, rr, sc, cam } = thumbRig;
    const acc = C3.buildAccessory(id, color, style); sc.add(acc);
    const box = new THREE.Box3().setFromObject(acc), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()).length() || 1;
    cam.position.set(c.x + sz * 0.9, c.y + sz * 0.6, c.z + sz * 1.6); cam.lookAt(c);
    rr.clear(); rr.render(sc, cam);
    sc.remove(acc);
    if (C3.disposeObject) C3.disposeObject(acc); // la miniatura queda en caché como imagen; la malla ya no hace falta
    thumbCache[key] = cv.toDataURL('image/png');
    return thumbCache[key];
  }
  // Una fila por ranura: "Nada" + una miniatura por pieza; la pieza elegida muestra sus estilos y colores
  async function renderSlots() {
    const look = draftLook, lockOf = G.misiones.lockOf;
    const rows = [];
    for (const slot of C3.SLOTS) {
      const defs = C3.ACCESSORIES.filter(a => a.slot === slot);
      if (!defs.length) continue;
      const cur = look.accessories[slot], curDef = cur && defs.find(d => d.id === cur.id);
      const thumbs = [];
      // Ropa desbloqueable (GDD §5): lo bloqueado se ve, pero apagado y con la pista de cómo conseguirlo
      const lockAttr = u => u ? ` disabled data-locked="1" title="Se desbloquea con ${u.pista}"` : '';
      for (const d of defs) {
        const mine = cur && cur.id === d.id;
        const lk = lockOf(d.id);
        const img = await accessoryThumb(d.id, mine ? cur.color : d.colors[0], mine ? cur.style : d.styles && d.styles[0][0]);
        thumbs.push(`<button class="thumb${lk ? ' locked' : ''}" type="button" data-id="${d.id}" aria-pressed="${!!mine}" aria-label="${d.name}${lk ? ' (bloqueado)' : ''}" title="${d.name}"${lockAttr(lk)}><img src="${img}" alt="">${lk ? '<span class="lock">Bloq.</span>' : ''}</button>`);
      }
      const styles = curDef && curDef.styles ? `<div class="styles">${curDef.styles.map(([s, n]) => { const lk = lockOf(curDef.id, s); return `<button class="chip${lk ? ' locked' : ''}" type="button" data-style="${s}" aria-pressed="${cur.style === s}"${lockAttr(lk)}>${n}${lk ? ' (bloq.)' : ''}</button>`; }).join('')}</div>` : '';
      const swatches = curDef ? `<div class="swatches">${curDef.colors.map(c => { const lk = lockOf(curDef.id, undefined, c); return `<button class="swatch${lk ? ' locked' : ''}" type="button" data-color="${c}" aria-pressed="${cur.color === c}" aria-label="Color ${c}${lk ? ' (bloqueado)' : ''}" style="background:${c}"${lockAttr(lk)}></button>`; }).join('')}</div>` : '';
      rows.push(`<div class="slot" data-slot="${slot}">
        <div class="sname">${SLOT_LABEL[slot] || slot}<small>${curDef ? curDef.name : 'Nada'}${curDef && curDef.placeholder ? ' <span class="ph-tag">(provisional)</span>' : ''}</small></div>
        <div class="opts">
          <div class="thumbs"><button class="thumb" type="button" data-act="none" aria-pressed="${!cur}" aria-label="Sin ${SLOT_LABEL[slot]}">Nada</button>${thumbs.join('')}</div>
          ${styles}${swatches}
        </div></div>`);
    }
    $('p-slots').innerHTML = rows.join('');
  }
  function changeLook(mutator) {
    mutator(draftLook);
    draftLook = C3.normalizeLook(draftLook);
    if (window.AVShowcase) window.AVShowcase.setLook(draftLook, true);
    renderSlots();
  }
  $('p-slots').addEventListener('click', e => {
    const row = e.target.closest('.slot'); if (!row) return;
    const slot = row.dataset.slot;
    const btn = e.target.closest('button'); if (!btn || btn.dataset.locked) return;
    const cur = draftLook.accessories[slot];
    if (btn.dataset.act === 'none') changeLook(l => { delete l.accessories[slot]; });
    else if (btn.dataset.id) {
      const d = C3.ACCESSORIES.find(a => a.id === btn.dataset.id);
      changeLook(l => { l.accessories[slot] = { id: d.id, color: d.colors[0], style: d.styles && d.styles[0][0] }; });
    } else if (cur && btn.dataset.style) changeLook(l => { l.accessories[slot] = Object.assign({}, cur, { style: btn.dataset.style }); });
    else if (cur && btn.dataset.color) changeLook(l => { l.accessories[slot] = Object.assign({}, cur, { color: btn.dataset.color }); });
  });
  $('p-species').addEventListener('change', () => changeLook(l => { l.species = $('p-species').value; }));
  // El error del creador se anuncia en lectores de pantalla (QA-08)
  $('p-error').setAttribute('role', 'alert');
  // ---------- Nombre de aventurero (dos listas) ----------
  const opciones = lista => lista.map(x => `<option>${x.replace(/[<>&"]/g, '')}</option>`).join('');
  $('p-name-a').innerHTML = opciones(NOMBRES.a); $('p-name-b').innerHTML = opciones(NOMBRES.b);
  function nombreElegido() { return nombreDe($('p-name-a').value, $('p-name-b').value); }
  function pintarNombre(n) {
    const a = NOMBRES.a.find(x => n.startsWith(x + ' ')) || NOMBRES.a[0];
    $('p-name-a').value = a; $('p-name-b').value = NOMBRES.b.includes(n.slice(a.length + 1)) ? n.slice(a.length + 1) : NOMBRES.b[0];
    $('p-name').textContent = nombreElegido();
  }
  for (const id of ['p-name-a', 'p-name-b']) $(id).addEventListener('change', () => { $('p-name').textContent = nombreElegido(); });
  $('p-name-azar').addEventListener('click', () => { let n = nombreElegido(); for (let k = 0; k < 5 && n === nombreElegido(); k++) n = nombreAzar(); pintarNombre(n); });
  // Partidas viejas: un nombre escrito a mano (que podría ser real) se cambia por uno de la lista, estable por partida
  if (G.pack.nombres) G.on('apply', () => {
    const p = S.profile;
    if (p && p.created && !esNombreDeLista(p.name)) {
      let h = 7; for (const c of String(S.saveId || p.name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      p.name = nombreAzar(h); G.guardado.autosave();
    }
  }, 20);
  async function open(first) {
    const p = S.profile;
    draftLook = profileLook(p);
    pintarNombre(p.created && esNombreDeLista(p.name) ? p.name : nombreAzar());
    $('p-species').innerHTML = Object.entries(C3.SPECIES).map(([id, sp]) => `<option value="${id}">${sp.name}</option>`).join('');
    $('p-species').value = draftLook.species;
    $('p-error').hidden = true;
    $('p-cancel').hidden = !!first;
    // Foco al primer campo (si la portada está encima, src/ui/ui.js lo pone al cerrarla)
    const portada = $('title');
    if (!portada || !portada.open) setTimeout(() => { const f = $('p-name-a'); if (f && !$('creator').hidden) f.focus(); }, 0);
    $('creator').hidden = false;
    renderSlots();
    if (window.AVShowcase) {
      $('p-stage-status').hidden = false; $('p-stage-status').textContent = 'Cargando el taller…';
      window.AVShowcase.setLook(draftLook, false);
      await window.AVShowcase.mount($('p-stage'));
      const st = window.AVShowcase.status();
      $('p-stage-status').hidden = st === 'ready';
      if (st === 'failed') $('p-stage-status').textContent = 'No se pudo cargar el modelo 3D en este dispositivo.';
    }
  }
  function close() { $('creator').hidden = true; if (window.AVShowcase) window.AVShowcase.unmount(); }
  // Devuelve null si se guardó, o el texto del error
  function saveCharacter(draft) {
    const d = draft || { name: nombreElegido(), look: draftLook };
    if (!NAME_OK.test(d.name) || textoSeguro(d.name)) return 'Elige un nombre de aventurero de las listas.';
    if (d.preset && !PRESETS.some(o => o.id === d.preset)) return 'Opción no válida.';
    const look = d.look ? C3.normalizeLook(d.look) : profileLook(d);
    const firstTime = !S.profile.created;
    S.profile = { created: true, name: d.name, look };
    const meta = { species: look.species, accessories: Object.values(look.accessories).map(a => a.id) };
    G.eventos.log(firstTime ? 'PlayerCharacterCreated' : 'PlayerCharacterUpdated', meta);
    close();
    G.actores.refreshCompanion();
    G.guardado.autosave();
    if (firstTime && !G.quiet && G.pack.inicio) setTimeout(() => G.pack.inicio(G), 300);
    return null;
  }
  $('p-save').onclick = () => { const err = saveCharacter(); if (err) { $('p-error').textContent = err; $('p-error').hidden = false; } };
  $('p-cancel').onclick = close;
  $('b-char').onclick = () => open(false);

  // Retrato idéntico al del juego: se renderiza con el mismo modelo, plumaje y accesorios
  async function portraitCanvasFor(size, withBg) {
    const out = document.createElement('canvas'); out.width = out.height = size;
    const x = out.getContext('2d');
    if (window.AVCharacter && !G.actores.failed3D) {
      try {
        const cv = await C3.renderPortrait(profileLook(S.profile), size);
        if (withBg) {
          const g = x.createRadialGradient(size * 0.5, size * 0.38, size * 0.05, size * 0.5, size * 0.5, size * 0.72);
          g.addColorStop(0, '#2d5a43'); g.addColorStop(1, '#10241c'); x.fillStyle = g; x.fillRect(0, 0, size, size);
        }
        x.drawImage(cv, 0, 0, size, size);
        return out;
      } catch (e) { /* sin modelo: retrato 2D */ }
    }
    await drawPortrait(x, size, S.profile, withBg);
    return out;
  }
  G.on('apply', () => { $('creator').hidden = true; }, 60);

  return { PRESETS, OUTFITS, NAME_OK, profileLook, legacyFields, drawPortrait, open, close, saveCharacter, portraitCanvasFor, renderSlots, textoSeguro, NOMBRES, esNombreDeLista, nombreAzar, nombreElegido, pintarNombre };
});
