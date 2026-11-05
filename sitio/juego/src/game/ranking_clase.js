/* Juego · Ranking de clase local (Directiva de privacidad infantil, 5-nov-2026, decisión 4: prototipo aprobado)
   Una tabla que un ADULTO (maestro o padre) lleva a mano en SU aparato. Nada de servidor, red, sincronización ni cuentas.
   - Acceso: pestaña «Ranking de clase» del Modo Maestro (src/game/aula.js), detrás de la puerta de adulto que ya existe
     (mantener pulsado + multiplicación). Toda escritura comprueba G.aula.maestroAbierto(): sin la puerta no se cambia nada.
   - Cada fila: un alias (apodo «Animal Cualidad NN» de las mismas listas fijas de records.js, o iniciales de 1 a 3 letras;
     nunca texto libre, nombre completo ni fotos), un reto de «Mis récords» y la marca que el niño enseña en su pantalla.
   - Orden por reto: los de tiempo, de menos a más; los de puntos, de más a menos. Empates comparten puesto.
   - Borrar una fila, reiniciar la tabla (con confirmación) y exportar para la pizarra: copiar texto, descargar .txt,
     descargar imagen .png (dibujada aquí en un canvas) o imprimir solo la tabla. Nada se sube a ningún sitio.
   - Guardado: localStorage `<almacen>.rankingClase` (cap1: amazonaverse.rankingClase) =
       { v: 1, clase: 'Nivel 1' (≤ 24 letras), sig: n, filas: [{ id, alias: { a, j, n } | { ini: 'AB' }, reto, valor }] }
     valor en ms (retos de tiempo) o puntos enteros. Es del adulto, no del niño: «Nuevo estudiante» no lo borra.
   Prueba: AV.rankingClaseTest() (src/boot.js). Carga perezosa: aula.js la pide al abrir el Modo Maestro. */
window.AVRankingClase = function (G) {
  'use strict';
  if (G.rankingClase) return G.rankingClase;
  const AU = G.aula;
  const ALM = (G.pack && G.pack.meta && G.pack.meta.almacen) || (G.pack && G.pack.id) || 'amazonaverse';
  const KEY = ALM + '.rankingClase';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const idioma = () => (AU && AU.aj && AU.aj.idioma === 'en' ? 'en' : 'es');
  const t = v => (v == null ? '' : typeof v === 'string' ? v : v[idioma()] != null ? v[idioma()] : v.es);

  // Mismas listas fijas de apodos que records.js (ANIMALES / ADJETIVOS): nunca texto libre
  const ANIMALES = ['Cotorra', 'Coquí', 'Guaraguao', 'Colibrí', 'Iguaca', 'Tinglar', 'Manatí', 'Reinita', 'Múcaro', 'Lagartijo'];
  const ADJETIVOS = ['Veloz', 'Valiente', 'Curioso', 'Brillante', 'Alegre', 'Audaz', 'Sabio', 'Feliz', 'Ágil', 'Sereno'];
  // Los retos tal como salen en «Mis récords» (records.js). tipo 'tiempo': menos es mejor (ms); 'puntos': más es mejor.
  const RETOS = [
    { id: 'carrera', tipo: 'tiempo', nombre: { es: 'Carrera en El Yunque', en: 'El Yunque race' } },
    { id: 'tormenta', tipo: 'puntos', nombre: { es: '¡Escapa de la tormenta!', en: 'Escape the storm!' } },
    { id: 'rio', tipo: 'tiempo', nombre: { es: 'Contrarreloj del río', en: 'River time trial' } },
    { id: 'banquete', tipo: 'puntos', nombre: { es: '¡Banquete!', en: 'Feast!' } },
    { id: 'rescate', tipo: 'tiempo', nombre: { es: '¡Salva al pichón!', en: 'Save the Parrot' } },
    { id: 'flight', tipo: 'puntos', nombre: { es: 'Amazona Flight', en: 'Amazona Flight' } },
    { id: 'rio_rush', tipo: 'puntos', nombre: { es: 'River Rush', en: 'River Rush' } },
    { id: 'maze', tipo: 'puntos', nombre: { es: 'Amazona Maze', en: 'Amazona Maze' } },
  ];
  const RETO = Object.fromEntries(RETOS.map(r => [r.id, r]));
  const CLASES = ['Nivel 1', 'Nivel 2', 'Grupo A', 'Grupo B', 'Grupo C', 'Grupo D', 'Club', 'Casa'];
  const CLASES_EN = ['Level 1', 'Level 2', 'Group A', 'Group B', 'Group C', 'Group D', 'Club', 'Home'];
  // Se guarda el nombre en español (estable); se muestra en el idioma del Aula. Un nombre corto propio se muestra tal cual.
  const claseTxt = c => { const i = CLASES.indexOf(c); return i >= 0 && idioma() === 'en' ? CLASES_EN[i] : c; };
  const MAX_FILAS = 80, MAX_CLASE = 24, MAX_MS = 60 * 60 * 1000, MAX_PUNTOS = 999999;

  const TX = {
    titulo: { es: 'Ranking de clase', en: 'Class leaderboard' },
    nota: { es: 'Solo en este aparato. Nada se envía a ningún servidor. Usa apodos del juego o iniciales: nunca nombres completos ni fotos. Anota la marca que cada estudiante te enseña en «Mis récords».', en: 'This device only. Nothing is sent to any server. Use game nicknames or initials: never full names or photos. Write down the score each student shows you in "My records".' },
    clase: { es: 'Clase', en: 'Class' }, otra: { es: 'Otro nombre corto…', en: 'Other short name…' }, nombreCorto: { es: 'Nombre corto de la clase', en: 'Short class name' },
    nueva: { es: 'Añadir una marca', en: 'Add a score' }, alias: { es: 'Alias', en: 'Nickname' },
    apodo: { es: 'Apodo del juego', en: 'Game nickname' }, iniciales: { es: 'Iniciales', en: 'Initials' },
    animal: { es: 'Animal', en: 'Animal' }, cualidad: { es: 'Cualidad', en: 'Quality' }, numero: { es: 'Número', en: 'Number' }, sinNum: { es: 'sin número', en: 'no number' },
    reto: { es: 'Reto', en: 'Challenge' }, marca: { es: 'Marca', en: 'Score' },
    phTiempo: { es: 'Tiempo, p. ej. 1:23.4', en: 'Time, e.g. 1:23.4' }, phPuntos: { es: 'Puntos, p. ej. 850', en: 'Points, e.g. 850' },
    anadir: { es: 'Añadir', en: 'Add' }, borrarFila: { es: 'Borrar', en: 'Delete' },
    tiempo: { es: 'tiempo: menos es mejor', en: 'time: lower is better' }, puntos: { es: 'puntos: más es mejor', en: 'points: higher is better' }, pts: { es: 'puntos', en: 'points' },
    vacia: { es: 'La tabla está vacía. Añade la primera marca.', en: 'The table is empty. Add the first score.' },
    pizarra: { es: 'Para la pizarra', en: 'For the board' },
    copiar: { es: 'Copiar texto', en: 'Copy text' }, txt: { es: 'Descargar texto', en: 'Download text' },
    png: { es: 'Descargar imagen', en: 'Download image' }, imprimir: { es: 'Imprimir', en: 'Print' },
    reiniciar: { es: 'Reiniciar la tabla', en: 'Reset the table' }, reiniciarQ: { es: '¿Borrar todas las filas de esta tabla?', en: 'Delete every row in this table?' },
    reiniciarSi: { es: 'Sí, borrar todo', en: 'Yes, erase everything' }, no: { es: 'No', en: 'No' },
    okAnadida: { es: 'Marca añadida.', en: 'Score added.' }, okBorrada: { es: 'Fila borrada.', en: 'Row deleted.' }, okReinicio: { es: 'Tabla reiniciada.', en: 'Table reset.' },
    okCopiado: { es: 'Texto copiado.', en: 'Text copied.' }, okDescarga: { es: 'Archivo listo.', en: 'File ready.' },
    errAlias: { es: 'Elige un apodo o escribe de 1 a 3 iniciales (solo letras).', en: 'Pick a nickname or type 1 to 3 initials (letters only).' },
    errMarca: { es: 'Revisa la marca: tiempo como 1:23.4 o puntos enteros.', en: 'Check the score: time like 1:23.4 or whole points.' },
    errLleno: { es: 'La tabla está llena. Borra alguna fila.', en: 'The table is full. Delete a row.' },
    errCopiar: { es: 'No se pudo copiar en este navegador.', en: 'Could not copy in this browser.' },
    pie: { es: 'Amazona Verse · solo en este aparato · alias del juego, sin nombres', en: 'Amazona Verse · this device only · game nicknames, no names' },
  };

  // ---------- Almacén ----------
  const limpiaClase = s => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_CLASE);
  const iniValidas = s => /^[A-ZÁÉÍÓÚÑÜ]{1,3}$/.test(s);
  function aliasValido(x) {
    if (!x || typeof x !== 'object') return null;
    if (typeof x.ini === 'string') { const s = x.ini.toUpperCase(); return iniValidas(s) ? { ini: s } : null; }
    if (Number.isInteger(x.a) && ANIMALES[x.a] && Number.isInteger(x.j) && ADJETIVOS[x.j]) {
      const n = Number.isInteger(x.n) && x.n >= 1 && x.n <= 99 ? x.n : 0;
      return n ? { a: x.a, j: x.j, n } : { a: x.a, j: x.j };
    }
    return null;
  }
  const valorValido = (reto, v) => RETO[reto] && Number.isFinite(v) && v > 0 && (RETO[reto].tipo === 'tiempo' ? v <= MAX_MS : Number.isInteger(v) && v <= MAX_PUNTOS);
  const vacio = () => ({ v: 1, clase: CLASES[0], sig: 1, filas: [] });
  function cargar() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && d.v === 1 && Array.isArray(d.filas)) {
        const filas = [];
        for (const f of d.filas.slice(0, MAX_FILAS)) {
          const alias = aliasValido(f && f.alias);
          if (alias && Number.isInteger(f.id) && valorValido(f.reto, f.valor)) filas.push({ id: f.id, alias, reto: f.reto, valor: f.valor });
        }
        const sig = Math.max(Number.isInteger(d.sig) ? d.sig : 1, ...filas.map(f => f.id + 1), 1);
        return { v: 1, clase: limpiaClase(d.clase) || CLASES[0], sig, filas };
      }
    } catch (e) { /* almacén ilegible: tabla nueva */ }
    return vacio();
  }
  let data = cargar();
  function persistir() { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } }

  // ---------- Puerta de adulto ----------
  const puertaAbierta = () => !!(AU && AU.maestroAbierto && AU.maestroAbierto());
  const conPuerta = fn => function () { if (!puertaAbierta()) return { ok: false, error: 'puerta' }; return fn.apply(null, arguments); };

  // ---------- Formato ----------
  const reloj = ms => { const d = Math.max(0, Math.round(ms / 100)); return Math.floor(d / 600) + ':' + String(Math.floor(d / 10) % 60).padStart(2, '0') + '.' + (d % 10); };
  const aliasTexto = x => (x.ini ? x.ini : ANIMALES[x.a] + ' ' + ADJETIVOS[x.j] + (x.n ? ' ' + x.n : ''));
  const marcaTexto = (reto, v) => (RETO[reto].tipo === 'tiempo' ? reloj(v) : v + ' ' + t(TX.pts));
  // «1:23.4», «83.4», «83», «1:23» → ms. Puntos: entero.
  function leerMarca(reto, s) {
    const r = RETO[reto]; if (!r) return NaN;
    s = String(s == null ? '' : s).trim().replace(',', '.');
    if (r.tipo === 'puntos') return /^\d{1,6}$/.test(s) ? parseInt(s, 10) : NaN;
    let m = /^(\d{1,2}):([0-5]?\d(?:\.\d{1,3})?)$/.exec(s);
    if (m) return Math.round((parseInt(m[1], 10) * 60 + parseFloat(m[2])) * 1000);
    m = /^\d{1,4}(?:\.\d{1,3})?$/.exec(s);
    return m ? Math.round(parseFloat(s) * 1000) : NaN;
  }

  // ---------- Orden ----------
  function ordenado() {
    const grupos = [];
    for (const r of RETOS) {
      const fs = data.filas.filter(f => f.reto === r.id).sort((x, y) => (r.tipo === 'tiempo' ? x.valor - y.valor : y.valor - x.valor) || x.id - y.id);
      if (!fs.length) continue;
      let puesto = 0, prev = null;
      grupos.push({ reto: r, filas: fs.map((f, i) => { if (f.valor !== prev) { puesto = i + 1; prev = f.valor; } return Object.assign({ puesto }, f); }) });
    }
    return grupos;
  }

  // ---------- Operaciones (todas con puerta) ----------
  const agregar = conPuerta(function (fila) {
    const alias = aliasValido(fila && fila.alias);
    if (!alias) return { ok: false, error: 'alias' };
    const reto = fila && fila.reto;
    const valor = typeof fila.valor === 'string' ? leerMarca(reto, fila.valor) : fila.valor;
    if (!valorValido(reto, valor)) return { ok: false, error: 'marca' };
    if (data.filas.length >= MAX_FILAS) return { ok: false, error: 'lleno' };
    const f = { id: data.sig++, alias, reto, valor };
    data.filas.push(f); persistir();
    return { ok: true, id: f.id };
  });
  const borrar = conPuerta(function (id) {
    const i = data.filas.findIndex(f => f.id === id); if (i < 0) return { ok: false, error: 'fila' };
    data.filas.splice(i, 1); persistir(); return { ok: true };
  });
  const reiniciar = conPuerta(function () { const clase = data.clase; data = vacio(); data.clase = clase; persistir(); return { ok: true }; });
  const ponerClase = conPuerta(function (s) { const c = limpiaClase(s); if (!c) return { ok: false, error: 'clase' }; data.clase = c; persistir(); return { ok: true }; });

  // ---------- Exportar (sin red) ----------
  const hoy = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'clase';
  const nombreArchivo = ext => `ranking_${slug(claseTxt(data.clase))}_${hoy()}.${ext}`;
  function texto() {
    const L = [`${t(TX.titulo)} · ${claseTxt(data.clase)} · ${hoy()}`, ''];
    const gs = ordenado();
    if (!gs.length) L.push(t(TX.vacia));
    for (const g of gs) {
      L.push(`${t(g.reto.nombre)} (${t(TX[g.reto.tipo])})`);
      for (const f of g.filas) L.push(`  ${f.puesto}. ${aliasTexto(f.alias)} · ${marcaTexto(f.reto, f.valor)}`);
      L.push('');
    }
    L.push(t(TX.pie));
    return L.join('\n');
  }
  // Imagen para proyectar o imprimir: 1200 px de ancho, fondo claro, letra grande
  function lienzo() {
    const gs = ordenado(), W = 1200, PAD = 56, LH = 44;
    let alto = PAD + 70 + 40;
    for (const g of gs) alto += 64 + g.filas.length * LH + 20;
    if (!gs.length) alto += 60;
    alto += 60 + PAD;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = alto;
    const c = cv.getContext('2d'); if (!c) return null;
    const fuente = (peso, px) => `${peso} ${px}px "Baloo 2", "Nunito", system-ui, sans-serif`;
    c.fillStyle = '#fffaf0'; c.fillRect(0, 0, W, alto);
    c.fillStyle = '#1f6f3a'; c.fillRect(0, 0, W, 14);
    let y = PAD + 50;
    c.fillStyle = '#1d2a22'; c.font = fuente(800, 52); c.textBaseline = 'alphabetic';
    c.fillText(t(TX.titulo), PAD, y);
    c.font = fuente(600, 28); c.fillStyle = '#4a5a50';
    c.fillText(`${claseTxt(data.clase)} · ${hoy()}`, PAD, y + 40); y += 40 + 40;
    if (!gs.length) { y += 40; c.font = fuente(600, 28); c.fillText(t(TX.vacia), PAD, y); }
    for (const g of gs) {
      y += 52; c.fillStyle = '#1f6f3a'; c.font = fuente(800, 34); c.fillText(t(g.reto.nombre), PAD, y);
      c.font = fuente(600, 22); c.fillStyle = '#4a5a50'; c.textAlign = 'right'; c.fillText(t(TX[g.reto.tipo]), W - PAD, y); c.textAlign = 'left';
      y += 12;
      g.filas.forEach((f, i) => {
        y += LH;
        if (i % 2 === 0) { c.fillStyle = 'rgba(31,111,58,0.07)'; c.fillRect(PAD - 12, y - LH + 10, W - 2 * PAD + 24, LH); }
        const med = f.puesto === 1 ? '#e2a400' : f.puesto === 2 ? '#9aa4ad' : f.puesto === 3 ? '#b8743a' : null;
        if (med) { c.fillStyle = med; c.beginPath(); c.arc(PAD + 18, y - 12, 16, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = med ? '#ffffff' : '#1d2a22'; c.font = fuente(800, 24); c.textAlign = 'center'; c.fillText(String(f.puesto), PAD + 18, y - 4);
        c.textAlign = 'left'; c.fillStyle = '#1d2a22'; c.font = fuente(700, 30); c.fillText(aliasTexto(f.alias), PAD + 56, y);
        c.textAlign = 'right'; c.font = fuente(800, 30); c.fillText(marcaTexto(f.reto, f.valor), W - PAD, y); c.textAlign = 'left';
      });
      y += 20;
    }
    c.font = fuente(600, 20); c.fillStyle = '#6b7a70'; c.fillText(t(TX.pie), PAD, alto - PAD + 10);
    return cv;
  }
  // Descarga local: capacidad 'downloads' del visor de Claude si existe; si no, <a download> con un enlace blob: (local)
  async function descargar(nombre, blob) {
    let d = null;
    if (window.claude && window.claude.use) { try { d = await Promise.race([window.claude.use('downloads'), new Promise(r => setTimeout(() => r(null), 3000))]); } catch (e) { d = null; } }
    if (d && typeof d.save === 'function') { try { await d.save({ filename: nombre, data: blob }); return 'ok'; } catch (e) { if (e && e.code === 'declined') return 'cancelado'; } }
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = nombre; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return 'ok';
  }
  // Imprimir solo la tabla: una hoja temporal visible únicamente en @media print
  function imprimir() {
    const cv = lienzo(); if (!cv) return false;
    let hoja = document.getElementById('rc-hoja');
    if (!hoja) { hoja = document.createElement('div'); hoja.id = 'rc-hoja'; document.body.appendChild(hoja); }
    hoja.innerHTML = ''; const img = new Image(); img.alt = t(TX.titulo); img.src = cv.toDataURL('image/png'); hoja.appendChild(img);
    document.documentElement.classList.add('rc-imprimiendo');
    const fin = () => { document.documentElement.classList.remove('rc-imprimiendo'); hoja.innerHTML = ''; removeEventListener('afterprint', fin); };
    addEventListener('afterprint', fin);
    try { window.print(); } catch (e) { fin(); return false; }
    setTimeout(fin, 60000);
    return true;
  }

  // ---------- Estilos (propios; no se toca aula.css) ----------
  if (!document.getElementById('rc-estilos')) {
    const st = document.createElement('style'); st.id = 'rc-estilos';
    st.textContent = `.rc-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--sp-2) var(--sp-3); align-items: end; }
.rc-form label { margin: 0 0 var(--sp-1) !important; }
.rc-form select, .rc-form input[type=text] { width: 100% !important; }
.rc-tipo { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin: var(--sp-2) 0; }
.rc-tipo .chip { color: var(--c-ink); background: #fffaf0; border-color: var(--c-paper-edge); }
.rc-tipo .chip[aria-pressed="true"] { background: #1f6f3a; border-color: #1f6f3a; color: #fff; }
.rc-grupo h4 { margin: var(--sp-4) 0 var(--sp-1); font: 700 var(--fs-md)/1.2 var(--font-display); }
.rc-grupo h4 small { font-weight: 400; color: var(--c-ink-muted); }
.rc-tabla td.rc-p { width: 2.5em; font-weight: 800; text-align: center; }
.rc-tabla td.rc-m { font-weight: 800; text-align: right; }
.rc-tabla td.rc-b { width: 1%; }
#rc-hoja { display: none; }
@media print {
  html.rc-imprimiendo body > *:not(#rc-hoja) { display: none !important; }
  html.rc-imprimiendo #rc-hoja { display: block !important; }
  html.rc-imprimiendo #rc-hoja img { width: 100%; height: auto; }
}`;
    document.head.appendChild(st);
  }

  // ---------- Pestaña del Modo Maestro ----------
  let tipoAlias = 'apodo', ultimoReto = RETOS[0].id, estadoTxt = '';
  function html() {
    const op = (v, txt, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(txt)}</option>`;
    const enLista = CLASES.includes(data.clase);
    const gs = ordenado();
    const tabla = !gs.length ? `<p class="note">${esc(t(TX.vacia))}</p>` : gs.map(g => `<section class="rc-grupo" data-rc-reto="${esc(g.reto.id)}"><h4>${esc(t(g.reto.nombre))} <small>· ${esc(t(TX[g.reto.tipo]))}</small></h4>
      <div class="maestro-scroll"><table class="maestro-tabla rc-tabla"><tbody>${g.filas.map(f => `<tr data-rc-fila="${f.id}"><td class="rc-p">${f.puesto}</td><td data-no-tr>${esc(aliasTexto(f.alias))}</td><td class="rc-m">${esc(marcaTexto(f.reto, f.valor))}</td>
        <td class="rc-b"><button class="btn ghost sm" type="button" data-rc-borrar="${f.id}" aria-label="${esc(t(TX.borrarFila) + ': ' + aliasTexto(f.alias))}">${esc(t(TX.borrarFila))}</button></td></tr>`).join('')}</tbody></table></div></section>`).join('');
    const retoSel = RETO[ultimoReto] || RETOS[0];
    return `<p class="note">${esc(t(TX.nota))}</p>
      <label for="rc-clase">${esc(t(TX.clase))}</label>
      <select id="rc-clase">${CLASES.map(c => op(c, claseTxt(c), c === data.clase)).join('')}${op('__otra', t(TX.otra), !enLista)}</select>
      <input id="rc-clase-otra" type="text" maxlength="${MAX_CLASE}" autocomplete="off" aria-label="${esc(t(TX.nombreCorto))}" placeholder="${esc(t(TX.nombreCorto))}" value="${enLista ? '' : esc(data.clase)}"${enLista ? ' hidden' : ''}>
      <h3>${esc(t(TX.nueva))}</h3>
      <div class="rc-tipo" role="group" aria-label="${esc(t(TX.alias))}"><button class="chip" type="button" data-rc-tipo="apodo" aria-pressed="${tipoAlias === 'apodo'}">${esc(t(TX.apodo))}</button><button class="chip" type="button" data-rc-tipo="ini" aria-pressed="${tipoAlias === 'ini'}">${esc(t(TX.iniciales))}</button></div>
      <form class="rc-form" id="rc-form" novalidate>
        <div data-rc-apodo${tipoAlias === 'apodo' ? '' : ' hidden'}><label for="rc-a">${esc(t(TX.animal))}</label><select id="rc-a" data-no-tr>${ANIMALES.map((x, i) => op(i, x)).join('')}</select></div>
        <div data-rc-apodo${tipoAlias === 'apodo' ? '' : ' hidden'}><label for="rc-j">${esc(t(TX.cualidad))}</label><select id="rc-j" data-no-tr>${ADJETIVOS.map((x, i) => op(i, x)).join('')}</select></div>
        <div data-rc-apodo${tipoAlias === 'apodo' ? '' : ' hidden'}><label for="rc-n">${esc(t(TX.numero))}</label><select id="rc-n">${op(0, '— ' + t(TX.sinNum))}${Array.from({ length: 99 }, (_, i) => op(i + 1, i + 1)).join('')}</select></div>
        <div data-rc-ini${tipoAlias === 'ini' ? '' : ' hidden'}><label for="rc-ini">${esc(t(TX.iniciales))}</label><input id="rc-ini" type="text" maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="AB"></div>
        <div><label for="rc-reto">${esc(t(TX.reto))}</label><select id="rc-reto">${RETOS.map(r => op(r.id, t(r.nombre), r.id === retoSel.id)).join('')}</select></div>
        <div><label for="rc-valor">${esc(t(TX.marca))}</label><input id="rc-valor" type="text" inputmode="decimal" maxlength="9" autocomplete="off" placeholder="${esc(t(retoSel.tipo === 'tiempo' ? TX.phTiempo : TX.phPuntos))}"></div>
        <div><button class="btn sm" type="submit" id="rc-anadir" data-icon="check">${esc(t(TX.anadir))}</button></div>
      </form>
      <p class="maestro-estado" id="rc-estado" role="status" aria-live="polite">${esc(estadoTxt)}</p>
      <div id="rc-tabla">${tabla}</div>
      <h3>${esc(t(TX.pizarra))}</h3>
      <div class="row maestro-acciones"><button class="btn ghost sm" type="button" data-rc="copiar">${esc(t(TX.copiar))}</button><button class="btn ghost sm" type="button" data-rc="txt" data-icon="save">${esc(t(TX.txt))}</button><button class="btn ghost sm" type="button" data-rc="png" data-icon="save">${esc(t(TX.png))}</button><button class="btn ghost sm" type="button" data-rc="imprimir">${esc(t(TX.imprimir))}</button></div>
      <div class="row maestro-borrar"><button class="btn ghost sm" type="button" data-rc="reiniciar" data-icon="reset">${esc(t(TX.reiniciar))}</button></div>
      <div class="row maestro-borrar" data-rc-confirmar hidden><span class="maestro-estado">${esc(t(TX.reiniciarQ))}</span><button class="btn ghost sm" type="button" data-rc="reiniciar-no">${esc(t(TX.no))}</button><button class="btn danger sm" type="button" data-rc="reiniciar-si" data-icon="reset">${esc(t(TX.reiniciarSi))}</button></div>`;
  }
  let raiz = null;
  const repintar = () => {
    if (!raiz || !document.contains(raiz)) return;
    const foco = document.activeElement && document.activeElement.id;
    raiz.innerHTML = html(); enlazar(raiz);
    const f = foco && raiz.querySelector('#' + foco); if (f) f.focus();
  };
  const aviso = s => { estadoTxt = s; const e = raiz && raiz.querySelector('#rc-estado'); if (e) e.textContent = s; };
  function enlazar(panel) {
    raiz = panel;
    const q = s => panel.querySelector(s);
    const selC = q('#rc-clase'), otra = q('#rc-clase-otra');
    selC.onchange = () => {
      if (selC.value === '__otra') { otra.hidden = false; otra.focus(); return; }
      otra.hidden = true; ponerClase(selC.value);
    };
    otra.onchange = () => { const r = ponerClase(otra.value); if (r.ok) otra.value = data.clase; };
    for (const b of panel.querySelectorAll('[data-rc-tipo]')) b.onclick = () => { tipoAlias = b.dataset.rcTipo; repintar(); const p = q(tipoAlias === 'ini' ? '#rc-ini' : '#rc-a'); if (p) p.focus(); };
    const ini = q('#rc-ini'); ini.oninput = () => { const v = ini.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '').slice(0, 3); if (v !== ini.value) ini.value = v; };
    const reto = q('#rc-reto'), valor = q('#rc-valor');
    reto.onchange = () => { ultimoReto = reto.value; valor.placeholder = t(RETO[reto.value].tipo === 'tiempo' ? TX.phTiempo : TX.phPuntos); };
    q('#rc-form').onsubmit = e => {
      e.preventDefault();
      const alias = tipoAlias === 'ini' ? { ini: ini.value } : { a: +q('#rc-a').value, j: +q('#rc-j').value, n: +q('#rc-n').value };
      const r = agregar({ alias, reto: reto.value, valor: valor.value });
      if (!r.ok) { aviso(t(r.error === 'alias' ? TX.errAlias : r.error === 'lleno' ? TX.errLleno : TX.errMarca)); return; }
      ultimoReto = reto.value; estadoTxt = t(TX.okAnadida); repintar();
      const v = raiz.querySelector('#rc-valor'); if (v) v.focus();
    };
    for (const b of panel.querySelectorAll('[data-rc-borrar]')) b.onclick = () => { const r = borrar(+b.dataset.rcBorrar); if (r.ok) { estadoTxt = t(TX.okBorrada); repintar(); } };
    const conf = q('[data-rc-confirmar]');
    panel.querySelector('[data-rc="reiniciar"]').onclick = () => { conf.hidden = false; panel.querySelector('[data-rc="reiniciar-no"]').focus(); };
    panel.querySelector('[data-rc="reiniciar-no"]').onclick = () => { conf.hidden = true; };
    panel.querySelector('[data-rc="reiniciar-si"]').onclick = () => { const r = reiniciar(); if (r.ok) { estadoTxt = t(TX.okReinicio); repintar(); } };
    panel.querySelector('[data-rc="copiar"]').onclick = async () => { const ok = AU && AU.copiar ? await AU.copiar(texto()) : false; aviso(t(ok ? TX.okCopiado : TX.errCopiar)); };
    panel.querySelector('[data-rc="txt"]').onclick = async () => { if (!puertaAbierta()) return; const r = await descargar(nombreArchivo('txt'), new Blob([texto()], { type: 'text/plain;charset=utf-8' })); if (r === 'ok') aviso(t(TX.okDescarga)); };
    panel.querySelector('[data-rc="png"]').onclick = () => {
      if (!puertaAbierta()) return; const cv = lienzo(); if (!cv) return;
      cv.toBlob(b => { if (b) descargar(nombreArchivo('png'), b).then(r => { if (r === 'ok') aviso(t(TX.okDescarga)); }); }, 'image/png');
    };
    panel.querySelector('[data-rc="imprimir"]').onclick = () => { if (puertaAbierta()) imprimir(); };
  }
  const salir = () => { estadoTxt = ''; };
  const PESTANA = { id: 'ranking', titulo: TX.titulo, html: () => { salir(); return html(); }, enlazar };
  if (AU && AU.pestana) AU.pestana(PESTANA);

  // =================================================================================================================
  // AV.rankingClaseTest(): puerta de adulto, alta/baja, orden por reto, reinicio, persistencia, cero red, sin errores.
  // Guarda y repone la tabla real del aparato (no la pisa).
  // =================================================================================================================
  async function test() {
    const out = [], check = (name, ok, info) => out.push({ name, ok: !!ok, info: info == null ? undefined : String(info) });
    const errores = [], alErr = e => errores.push(String((e && (e.message || (e.reason && e.reason.message) || e.reason)) || e));
    addEventListener('error', alErr); addEventListener('unhandledrejection', alErr);
    // Espía de red: todo fetch o XHR que vaya a otro origen o a algo que no sea un archivo del propio juego (assets/, src/,
    // content/, blob:, data:), y cualquier sendBeacon o WebSocket, es fallo. El motor sigue cargando sus sonidos y modelos
    // mientras tanto (al cerrar el Modo Maestro se reanuda): eso no sale del aparato hacia ningún servidor de datos.
    const propio = u => { try { const x = new URL(String(u && (u.url || u)), location.href); return x.protocol === 'blob:' || x.protocol === 'data:' || (x.origin === location.origin && /^\/(?:[^?#]*\/)?(?:assets|src|content)\//.test(x.pathname)); } catch (e) { return false; } };
    const red = [], deAqui = u => !propio(u);
    const orig = { fetch: window.fetch, open: XMLHttpRequest.prototype.open, beacon: navigator.sendBeacon, WS: window.WebSocket };
    const espiar = () => {
      window.fetch = function () { if (deAqui(arguments[0])) red.push('fetch ' + String(arguments[0] && (arguments[0].url || arguments[0]))); return orig.fetch.apply(this, arguments); };
      XMLHttpRequest.prototype.open = function () { if (deAqui(arguments[1])) red.push('xhr ' + arguments[1]); return orig.open.apply(this, arguments); };
      if (orig.beacon) navigator.sendBeacon = function () { red.push('beacon'); return orig.beacon.apply(navigator, arguments); };
      if (orig.WS) window.WebSocket = function (u) { red.push('ws ' + u); return new orig.WS(...arguments); };
    };
    const soltar = () => { window.fetch = orig.fetch; XMLHttpRequest.prototype.open = orig.open; if (orig.beacon) navigator.sendBeacon = orig.beacon; if (orig.WS) window.WebSocket = orig.WS; };
    let copia = null; try { copia = localStorage.getItem(KEY); } catch (e) { copia = null; }
    const tipoMemo = tipoAlias, retoMemo = ultimoReto;
    const estabaAbierto = puertaAbierta();
    const pausaAbierta = () => { try { const m = document.getElementById('pause'); return !!(m && m.matches(':popover-open')); } catch (e) { return false; } };
    try {
      check('Módulo cargado y pestaña registrada en el Modo Maestro', AU && AU.pestanas && AU.pestanas().includes('ranking'), AU && AU.pestanas && AU.pestanas().join(','));
      // Código del módulo hasta esta prueba (la prueba nombra las API de red para espiarlas)
      const src = String(window.AVRankingClase), corte = src.indexOf('async function ' + 'test(');
      const prod = corte > 0 ? src.slice(0, corte) : src;
      check('El código no usa red (sin fetch, XMLHttpRequest, sendBeacon, WebSocket, import() ni URL http)', corte > 0 && !/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|import\s*\(|https?:\/\//.test(prod));
      espiar();
      // 1) Puerta de adulto
      if (estabaAbierto) AU.cerrarMaestro();
      data = vacio(); persistir();
      const sin = agregar({ alias: { a: 0, j: 0, n: 1 }, reto: 'carrera', valor: 60000 });
      check('Sin la puerta de adulto no se puede añadir', !sin.ok && sin.error === 'puerta' && data.filas.length === 0, JSON.stringify(sin));
      check('Sin la puerta de adulto no se puede reiniciar ni borrar', reiniciar().error === 'puerta' && borrar(1).error === 'puerta');
      check('La tabla no está en la página con el Modo Maestro cerrado', !document.querySelector('#m-panel #rc-form') || !AU.maestroAbierto());
      // La puerta real: mantener pulsado + multiplicación (respuesta mala no abre; la buena sí)
      const link = document.querySelector('#pause .maestro-link'), form = document.querySelector('#pause .maestro-reto');
      if (link && form) {
        link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        await new Promise(r => setTimeout(r, 1350));
        check('Mantener pulsado muestra la multiplicación', !form.hidden);
        const inp = form.querySelector('input');
        inp.value = String(AU.reto() + 1); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
        check('Una respuesta mala no abre el Modo Maestro', !AU.maestroAbierto());
        inp.value = String(AU.reto()); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
        check('La respuesta buena abre el Modo Maestro', AU.maestroAbierto());
      } else { AU.abrirMaestro(); check('Puerta del menú de pausa presente', false, 'sin .maestro-link'); }
      // 2) Pestaña
      const tabB = document.getElementById('m-tab-ranking');
      check('La pestaña «Ranking de clase» aparece en el Modo Maestro', !!tabB, tabB && tabB.textContent);
      if (tabB) tabB.click();
      const P = () => document.getElementById('m-panel');
      check('La pestaña muestra el formulario', !!(P() && P().querySelector('#rc-form')));
      // 3) Altas por la interfaz
      const alta = (alias, reto, valor) => {
        const p = P();
        if (alias.ini != null) { p.querySelector('[data-rc-tipo="ini"]').click(); P().querySelector('#rc-ini').value = alias.ini; }
        else { const ap = P().querySelector('[data-rc-tipo="apodo"]'); if (ap.getAttribute('aria-pressed') !== 'true') ap.click(); const q = P(); q.querySelector('#rc-a').value = alias.a; q.querySelector('#rc-j').value = alias.j; q.querySelector('#rc-n').value = alias.n || 0; }
        const q = P(); q.querySelector('#rc-reto').value = reto; q.querySelector('#rc-reto').dispatchEvent(new Event('change')); q.querySelector('#rc-valor').value = valor;
        q.querySelector('#rc-form').requestSubmit();
      };
      alta({ a: 1, j: 0, n: 7 }, 'carrera', '1:05.2');  // Coquí Veloz 7
      alta({ a: 3, j: 2 }, 'carrera', '58.9');          // Colibrí Curioso
      alta({ ini: 'jr' }, 'carrera', '1:20');            // JR
      alta({ a: 2, j: 1, n: 3 }, 'tormenta', '850');     // Guaraguao Valiente 3
      alta({ ini: 'AMV' }, 'tormenta', '1500');          // AMV
      alta({ a: 4, j: 5 }, 'tormenta', '850');           // empate
      check('Se añaden 6 filas por la interfaz', data.filas.length === 6, data.filas.length);
      check('Las iniciales se guardan en mayúsculas', data.filas.some(f => f.alias.ini === 'JR'));
      alta({ ini: 'Ana López' }, 'carrera', '1:00'); alta({ ini: '12' }, 'carrera', '1:00');
      check('Texto libre o nombres largos no entran como alias', data.filas.length === 6 && !data.filas.some(f => f.alias.ini && f.alias.ini.length > 3));
      alta({ a: 0, j: 0 }, 'carrera', 'mucho'); alta({ a: 0, j: 0 }, 'tormenta', '12.5');
      check('Marcas inválidas se rechazan con aviso', data.filas.length === 6 && /marca|score/i.test(P().querySelector('#rc-estado').textContent), P().querySelector('#rc-estado').textContent);
      // 4) Orden por reto
      const filasDe = id => Array.from(P().querySelectorAll(`[data-rc-reto="${id}"] tr`)).map(tr => tr.children[0].textContent + '|' + tr.children[1].textContent + '|' + tr.children[2].textContent);
      const car = filasDe('carrera'), tor = filasDe('tormenta');
      check('Carrera (tiempo): de menos a más', car.join(';') === '1|Colibrí Curioso|0:58.9;2|Coquí Veloz 7|1:05.2;3|JR|1:20.0', car.join(';'));
      check('Tormenta (puntos): de más a menos y el empate comparte puesto', /^1\|AMV\|1500 .*;2\|Guaraguao Valiente 3\|850 .*;2\|Iguaca Audaz\|850 /.test(tor.join(';')), tor.join(';'));
      const grupos = Array.from(P().querySelectorAll('[data-rc-reto]')).map(s => s.dataset.rcReto);
      check('Los retos salen en el orden de «Mis récords»', grupos.join(',') === 'carrera,tormenta', grupos.join(','));
      // 5) Baja de una fila
      const idJR = data.filas.find(f => f.alias.ini === 'JR').id;
      const bJR = P().querySelector(`[data-rc-borrar="${idJR}"]`); if (bJR) bJR.click();
      check('Borrar una fila la quita de la tabla y del almacén', data.filas.length === 5 && !P().querySelector(`[data-rc-fila="${idJR}"]`) && !JSON.parse(localStorage.getItem(KEY)).filas.some(f => f.id === idJR));
      // 6) Exportar
      const txt = texto();
      check('El texto para la pizarra trae la clase, los retos y los puestos', txt.includes(claseTxt(data.clase)) && txt.includes('1. Colibrí Curioso · 0:58.9') && txt.includes('1. AMV'), txt.split('\n').slice(0, 4).join(' / '));
      const cv = lienzo();
      check('La imagen para la pizarra se dibuja (PNG local)', cv && cv.width === 1200 && cv.height > 300 && /^data:image\/png/.test(cv.toDataURL('image/png')), cv && cv.width + 'x' + cv.height);
      // 7) Clase
      const sel = P().querySelector('#rc-clase'); sel.value = 'Grupo B'; sel.dispatchEvent(new Event('change'));
      check('El nombre de la clase se elige de la lista', data.clase === 'Grupo B');
      const r1 = ponerClase('  4to <b>rojo</b>  muy muy largo de verdad ');
      check('Un nombre corto se limpia y recorta', r1.ok && data.clase.length <= MAX_CLASE && !/[<>]/.test(data.clase), data.clase);
      // 8) Persistencia tras recargar (se relee el almacén como al abrir la página)
      // Instancia nueva del módulo (cierre nuevo que solo conoce localStorage), como al recargar la página; luego se repone esta
      const antes = JSON.stringify(data), viejo = G.rankingClase;
      let fresca = null;
      try { delete G.rankingClase; fresca = window.AVRankingClase(G); } finally { G.rankingClase = viejo; if (AU && AU.pestana) AU.pestana(PESTANA); }
      check('Persistencia: una instancia nueva (como al recargar) lee la misma tabla', fresca && fresca !== viejo && JSON.stringify(fresca.data) === antes && JSON.parse(localStorage.getItem(KEY)).v === 1, fresca && fresca.data.filas.length);
      check('La pestaña sigue siendo la de esta instancia', P() && (tabB2 => { if (tabB2) tabB2.click(); return !!P().querySelector('#rc-form'); })(document.getElementById('m-tab-ranking')));
      // 9) Reinicio con confirmación
      P().querySelector('[data-rc="reiniciar"]').click();
      const conf = P().querySelector('[data-rc-confirmar]');
      check('Reiniciar pide confirmación', conf && !conf.hidden && data.filas.length === 5);
      P().querySelector('[data-rc="reiniciar-si"]').click();
      check('Reiniciar vacía la tabla (y conserva el nombre de la clase)', data.filas.length === 0 && JSON.parse(localStorage.getItem(KEY)).filas.length === 0 && data.clase.length > 0);
      // 10) Cerrar la puerta vuelve a bloquear
      AU.cerrarMaestro();
      check('Al cerrar el Modo Maestro la tabla vuelve a quedar bloqueada', agregar({ alias: { ini: 'AB' }, reto: 'carrera', valor: 1000 }).error === 'puerta');
      check('El espía distingue un servidor externo de los archivos del juego', !propio('https://ejemplo.test/ranking') && !propio('/api/records') && propio(['assets', 'audio', 'x.ogg'].join('/')));
      check('Cero peticiones a servidores (ni fetch, XHR, sendBeacon ni WebSocket) durante la prueba del ranking', red.length === 0, red.join(' | '));
    } catch (e) {
      check('La prueba terminó sin excepciones', false, e && e.stack || e);
    } finally {
      soltar();
      try { if (AU.maestroAbierto()) AU.cerrarMaestro(); } catch (e) { /* */ }
      try { if (pausaAbierta()) document.getElementById('pause').hidePopover(); } catch (e) { /* */ }
      try { if (copia == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, copia); } catch (e) { /* */ }
      data = copia == null ? vacio() : cargar(); tipoAlias = tipoMemo; ultimoReto = retoMemo; estadoTxt = '';
      removeEventListener('error', alErr); removeEventListener('unhandledrejection', alErr);
    }
    check('Sin errores de JavaScript durante la prueba', errores.length === 0, errores.join(' | '));
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }

  G.rankingClase = { KEY, RETOS, ANIMALES, ADJETIVOS, CLASES, agregar, borrar, reiniciar, ponerClase, ordenado, texto, lienzo, leerMarca, aliasTexto, imprimir, puertaAbierta, get data() { return data; }, recargar() { data = cargar(); repintar(); }, test };
  return G.rankingClase;
};
