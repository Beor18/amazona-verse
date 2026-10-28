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
  // Nombre de aventurero: un solo campo (3 a 14 letras) y un dado («🎲 Nombre al azar») que lo rellena
  // con un nombre de las dos listas. Los desplegables se quedan en el DOM, ocultos, para no romper pruebas viejas.
  // Un pack puede dar las suyas en pack.nombres { a: [...], b: [...] }. Al cargar, un nombre que no es de la lista
  // se conserva si pasó el filtro; si no, se cambia por uno de la lista. El nombre libre no sale en récords públicos.
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
  // Filtro del nombre propio (DECISION_LOG 28-oct): malas palabras ES/EN aunque vengan con números o símbolos,
  // marcas, y datos personales. El mensaje propone uno de la lista. Las dos palabras de la lista no pasan por aquí.
  const MALAS = ['pendejo', 'pendeja', 'puto', 'puta', 'mierda', 'cabron', 'cabrona', 'joder', 'cono', 'maricon', 'marica', 'gilipollas', 'verga', 'pinga', 'chingar', 'chingada', 'culero', 'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'pussy', 'whore', 'slut', 'nigger', 'faggot', 'retard'];
  const MARCAS = ['nintendo', 'roblox', 'fortnite', 'pokemon', 'disney', 'minecraft', 'youtube', 'tiktok', 'instagram', 'barbie', 'marvel', 'nike', 'adidas', 'playstation', 'xbox', 'google', 'netflix'];
  function letrasDe(t) {
    const leet = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '|': 'i' };
    let s = String(t || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    s = s.replace(/[013457@$!|]/g, c => leet[c] || '');
    return s.replace(/[^a-z]/g, '');
  }
  function contiene(norm, lista) {
    return lista.some(w => {
      if (norm === w) return true;
      if (w.length < 5 || norm.indexOf(w) < 0) return false;
      return norm.length - w.length <= 2;
    });
  }
  const propuesta = () => 'Prueba «' + nombreAzar() + '».';
  function filtroNombreLibre(raw) {
    const t = String(raw || '').trim();
    if (/\b(me llamo|mi nombre|my name is|my name|i am called)\b/i.test(t)) return 'No escribas «me llamo». ' + propuesta();
    const palabras = t.split(/[\s'-]+/).filter(p => /\p{L}/u.test(p));
    if (palabras.length >= 2) return 'Un solo nombre, sin apellido. ' + propuesta();
    const norm = letrasDe(t);
    if (contiene(norm, MALAS)) return 'Ese nombre no suena bien por aquí. ' + propuesta();
    if (contiene(norm, MARCAS)) return 'Ese nombre es de una marca. ' + propuesta();
    if (!/^[\p{L}]{3,14}$/u.test(t)) return 'De 3 a 14 letras, sin números. ' + propuesta();
    return null;
  }
  function debeReemplazarNombre(p) {
    return !!(p && p.created && p.name && !esNombreDeLista(p.name) && filtroNombreLibre(p.name));
  }
  // Solo letras (sin números, @ ni frases como "me llamo"): para los nombres de las dos listas
  const NAME_OK = /^[\p{L} '\-]{1,24}$/u;
  const escHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function especieConPiel(id) { return !!(id && window.AVE && AVE.pieles && AVE.pieles.tiene && AVE.pieles.tiene(id)); }
  function especieEnCreador(id) { return !!(id && ((C3.SPECIES && C3.SPECIES[id]) || especieConPiel(id))); }
  function nombreDeEspecie(e) { return (e.catalogo && e.catalogo.nombre) || (e.comun && e.comun.es) || e.id; }
  function opcionesEspecie() {
    const ES = window.AV_ESPECIES;
    const vistos = new Set(), out = [];
    const add = (id, nombre) => { if (!id || vistos.has(id) || !especieEnCreador(id)) return; vistos.add(id); out.push({ id, nombre }); };
    add('vittata', (C3.SPECIES.vittata && C3.SPECIES.vittata.name) || 'Vittata');
    for (const e of (ES ? ES.especies.concat(ES.extintas || []) : [])) if (e.piel) add(e.id, nombreDeEspecie(e));
    for (const [id, sp] of Object.entries(C3.SPECIES)) add(id, sp.name);
    return out.filter(o => o.id === 'vittata').concat(out.filter(o => o.id !== 'vittata').sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
  }
  // Las especies con piel no están en SPECIES (eso es el tinte). Sin este puente, normalizeLook las devuelve a vittata.
  const norm0 = C3.normalizeLook;
  C3.normalizeLook = function (look) {
    const out = norm0(look);
    const id = look && look.species;
    if (id && especieEnCreador(id)) out.species = id;
    return out;
  };
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
  // ---------- Nombre de aventurero (dos listas, dado y nombre propio) ----------
  const opciones = lista => lista.map(x => `<option>${x.replace(/[<>&"]/g, '')}</option>`).join('');
  $('p-name-a').innerHTML = opciones(NOMBRES.a); $('p-name-b').innerHTML = opciones(NOMBRES.b);
  function montarNombreLibre() {
    if (!document.getElementById('creador-nombre-css')) {
      const st = document.createElement('style');
      st.id = 'creador-nombre-css';
      st.textContent = '#creator .name-pick{grid-template-columns:1fr}'
        + '#creator .name-pick select{display:none !important}'
        + '#creator #p-name{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);border:0}'
        + '#creator #p-name-azar{grid-column:1;width:100%;min-height:var(--tap);height:auto;padding:0 var(--sp-4);border-radius:var(--r-md);white-space:nowrap}'
        + '#creator #p-name-libre{width:100%;min-height:var(--tap);margin-top:0;font:700 var(--fs-xl)/1.2 var(--font-display)}';
      document.head.appendChild(st);
    }
    for (const id of ['p-name-a', 'p-name-b']) {
      const s = $(id); if (!s) continue;
      s.hidden = true; s.tabIndex = -1; s.setAttribute('aria-hidden', 'true');
    }
    const btn = $('p-name-azar');
    if (btn && btn.textContent.indexOf('Nombre al azar') < 0) {
      btn.classList.remove('icon');
      btn.removeAttribute('data-icon');
      btn.textContent = '🎲 Nombre al azar';
      btn.setAttribute('aria-label', '🎲 Nombre al azar');
      btn.title = 'Nombre al azar';
    }
    if ($('p-name-libre') || !$('p-name')) return;
    const libre = document.createElement('input');
    libre.id = 'p-name-libre';
    libre.type = 'text';
    libre.maxLength = 40;
    libre.autocomplete = 'off';
    libre.spellcheck = false;
    libre.placeholder = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0 ? 'Your name' : 'Tu nombre';
    libre.setAttribute('aria-label', 'Tu nombre, de 3 a 14 letras');
    $('p-name').insertAdjacentElement('beforebegin', libre);
  }
  montarNombreLibre();
  function nombreElegido() { return nombreDe($('p-name-a').value, $('p-name-b').value); }
  function nombreEnPantalla() {
    const libre = $('p-name-libre') && $('p-name-libre').value.trim();
    return libre || (($('p-name') && $('p-name').textContent) || '').trim() || nombreElegido();
  }
  function pintarNombre(n) {
    const a = NOMBRES.a.find(x => n.startsWith(x + ' ')) || NOMBRES.a[0];
    $('p-name-a').value = a; $('p-name-b').value = NOMBRES.b.includes(n.slice(a.length + 1)) ? n.slice(a.length + 1) : NOMBRES.b[0];
    const libre = $('p-name-libre');
    if (libre) libre.value = n;
    $('p-name').textContent = n;
  }
  function pintarLoQueSeLee() { $('p-name').textContent = nombreEnPantalla(); }
  if ($('p-name-libre')) $('p-name-libre').addEventListener('input', pintarLoQueSeLee);
  $('p-name-azar').addEventListener('click', () => {
    const actual = $('p-name-libre') && $('p-name-libre').value.trim();
    let n = nombreAzar();
    for (let k = 0; k < 6 && n === actual; k++) n = nombreAzar();
    pintarNombre(n);
  });
  // Al cargar: un nombre libre que ya pasó el filtro se queda. Uno que no, pasa a la lista (estable por partida).
  if (G.pack.nombres) G.on('apply', () => {
    const p = S.profile;
    if (debeReemplazarNombre(p)) {
      let h = 7; for (const c of String(S.saveId || p.name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      p.name = nombreAzar(h); G.guardado.autosave();
    }
  }, 20);
  async function open(first) {
    const p = S.profile;
    draftLook = profileLook(p);
    if (p.created && p.name && !filtroNombreLibre(p.name)) pintarNombre(p.name);
    else pintarNombre(nombreAzar());
    const ops = opcionesEspecie();
    $('p-species').innerHTML = ops.map(o => `<option value="${escHtml(o.id)}">${escHtml(o.nombre)}</option>`).join('');
    $('p-species').value = ops.some(o => o.id === draftLook.species) ? draftLook.species : 'vittata';
    if ($('p-species').value !== draftLook.species) draftLook = C3.normalizeLook(Object.assign({}, draftLook, { species: $('p-species').value }));
    $('p-error').hidden = true;
    $('p-cancel').hidden = !!first;
    // Foco al primer campo (si la portada está encima, src/ui/ui.js lo pone al cerrarla)
    const portada = $('title');
    if (!portada || !portada.open) setTimeout(() => { const f = $('p-name-libre') || $('p-name-a'); if (f && !$('creator').hidden) f.focus(); }, 0);
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
    const d = draft || { name: nombreEnPantalla(), look: draftLook };
    if (esNombreDeLista(d.name)) {
      if (!NAME_OK.test(d.name) || textoSeguro(d.name)) return 'Elige un nombre de aventurero de las listas.';
    } else {
      const mot = filtroNombreLibre(d.name);
      if (mot) return mot;
    }
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

  function test() {
    const R = [], ok = (name, c, extra) => R.push({ name, ok: !!c, extra: extra == null ? '' : String(extra) });
    const antes = JSON.parse(JSON.stringify(S.profile || {}));
    const quiet = G.quiet, abierto = $('creator') && !$('creator').hidden;
    G.quiet = true;
    try {
      ok('Coralito se acepta', saveCharacter({ name: 'Coralito', look: C3.defaultLook() }) === null && S.profile.name === 'Coralito');
      const mala = saveCharacter({ name: 'p3ndej0', look: C3.defaultLook() });
      ok('Una mala palabra con números se rechaza', typeof mala === 'string' && /no suena bien/.test(mala) && S.profile.name !== 'p3ndej0', mala);
      const marca = saveCharacter({ name: 'Nintendo', look: C3.defaultLook() });
      ok('Una marca se rechaza', typeof marca === 'string' && /marca/.test(marca) && S.profile.name !== 'Nintendo', marca);
      const frase = saveCharacter({ name: 'me llamo Ana Pérez', look: C3.defaultLook() });
      ok('«me llamo Ana Pérez» se rechaza', typeof frase === 'string' && /me llamo/.test(frase), frase);
      ok('Un nombre libre que pasó el filtro no se reemplaza al cargar', debeReemplazarNombre({ created: true, name: 'Coralito' }) === false);
      ok('Un nombre de la lista tampoco se reemplaza', debeReemplazarNombre({ created: true, name: nombreAzar(1) }) === false);
      ok('Un apellido suelto sí se reemplazaría', debeReemplazarNombre({ created: true, name: 'Ana Pérez' }) === true);
      const ops = opcionesEspecie(), ids = new Set(ops.map(o => o.id));
      const ES = window.AV_ESPECIES;
      const conPiel = ES ? ES.especies.concat(ES.extintas || []).filter(e => e.piel && AVE.pieles.tiene(e.id)) : [];
      const faltan = conPiel.filter(e => !ids.has(e.id)).map(e => e.id);
      ok('Las 21 especies con piel de Kelvin salen en el creador', conPiel.length === 21 && !faltan.length, (faltan.join(',') || String(conPiel.length)));
      ok('Vittata sigue la primera', ops[0] && ops[0].id === 'vittata');
      const sinPiel = ES ? ES.especies.concat(ES.extintas || []).filter(e => !e.piel && e.id !== 'vittata' && !C3.SPECIES[e.id]) : [];
      const coladas = sinPiel.filter(e => ids.has(e.id)).map(e => e.id);
      ok('Sin piel de Kelvin no se inventa un color', sinPiel.length === 11 && !coladas.length, coladas.join(',') || String(sinPiel.length));
      ok('Una especie con piel se queda en el look', C3.normalizeLook({ species: 'aestiva', accessories: {} }).species === 'aestiva');
      ok('El botón es «🎲 Nombre al azar»', !!$('p-name-azar') && $('p-name-azar').textContent.indexOf('Nombre al azar') >= 0, $('p-name-azar') && $('p-name-azar').textContent);
      ok('Hay un campo para escribir el nombre', !!$('p-name-libre'));
      if ($('p-name-libre')) {
        $('p-name-libre').value = 'Coralito';
        $('p-name-libre').dispatchEvent(new Event('input', { bubbles: true }));
        ok('El nombre escrito se lee en el único campo', $('p-name').textContent === 'Coralito', $('p-name').textContent);
        ok('Los desplegables no se ven', $('p-name-a').hidden && $('p-name-b').hidden);
        $('p-name-azar').click();
        ok('El dado escribe un nombre de la lista en el campo', esNombreDeLista($('p-name-libre').value) && $('p-name').textContent === $('p-name-libre').value, $('p-name-libre').value);
      }
    } finally {
      S.profile = antes;
      G.quiet = quiet;
      try { G.actores.refreshCompanion(); } catch (e) { /* sin personaje todavía */ }
      try { G.guardado.autosave(); } catch (e2) { /* la prueba no deja el nombre de ensayo */ }
      if ($('creator')) $('creator').hidden = !abierto;
      if ($('p-name-libre')) $('p-name-libre').value = '';
    }
    return { ok: R.every(r => r.ok), passed: R.filter(r => r.ok).length, total: R.length, results: R };
  }

  return { PRESETS, OUTFITS, NAME_OK, profileLook, legacyFields, drawPortrait, open, close, saveCharacter, portraitCanvasFor, renderSlots, textoSeguro, NOMBRES, esNombreDeLista, nombreAzar, nombreElegido, pintarNombre, filtroNombreLibre, debeReemplazarNombre, opcionesEspecie, test };
});
