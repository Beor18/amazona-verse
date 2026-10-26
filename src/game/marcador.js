/* Juego · Marcador del capítulo: cronómetro, puntuación y medalla
   Se carga sola al arrancar (boot.js). window.AVMarcador(G) devuelve la API (también G.marcador):
   tiempo(), puntos(), fin(), sumar(motivo, pts), mostrar(on), htmlRecords(), compartir(), test().

   TODO ES LOCAL. Nada de servidores ni cuentas. Sin castigos: nada resta puntos ni tiempo; solo se suma.

   CRONÓMETRO. Cuenta el tiempo de juego real del capítulo: se detiene en la pausa, la portada, los diálogos, las tarjetas, los
   menús, el Modo Retos y con la pestaña oculta (solo suma en el 'update' del juego cuando nada de eso está activo). Se ve en el
   HUD, dentro del cuadro del objetivo (#marcador), y se puede ocultar desde la pausa («Cronómetro: sí/no», preferencia del
   dispositivo en <almacén>.marcador.ajustes). En el modo relajado no se muestra, no hay medalla ni bonificación por tiempo y no
   se anota ningún tiempo (el capítulo no tiene tiempos).

   PUNTUACIÓN (todo suma, nada resta; [KELVIN] los valores son provisionales):
     Diario +50 por hallazgo · lugar descubierto +25 · rescate en la crecida +75 · misión +100 · fruto del Banquete +5 al comerlo y
     +10 por cada uno entregado en el nido. Al terminar, bonificación por tiempo: oro (hasta 30 min) +1000, plata (hasta 45 min)
     +600, bronce (más tiempo) +300. Cada suma muestra «+50» flotando junto al marcador.
   Las partidas viejas, sin marcador, reciben los puntos de lo que ya tenían (Diario, lugares, misiones y rescates) y el tiempo en 0.

   GUARDADO. S.marcador (clave del pack en content/cap1/pack.js, vale null en las partidas viejas):
     { v: 1, t (s de juego), pts, n: { diario, lugares, rescates, misiones, frutos, bono }, fin: null | { t|null, pts, bonus, medalla|null,
       relajado, rec: { primero, tiempo, puntos } | null } }
   «Comenzar de cero» crea una partida nueva, así que el cronómetro y los puntos de esa partida empiezan en 0.
   LIBRO DE LA CASA (aparte de la partida, <almacén>.marcador): { v: 1, jugadores: { "<nombre de la cotorra>": { mejorT (s),
   mejorPts, medalla, jugadas } } }. «Comenzar de cero» no lo borra (es lo que permite que la casa guarde a varias cotorras);
   «Nuevo estudiante» (equipo compartido) sí.
   AL TERMINAR: el panel final (#end) muestra tiempo, puntuación, medalla y si es récord; «Mis récords» (records.js) llama a
   htmlRecords(). Compartir la tarjeta pasa por la puerta para adultos de records.js (G.recordsApi.puerta).
   Pruebas: AV.marcadorTest() (test() al final). */
(function () {
  'use strict';
  window.AVMarcador = function (G) {
    if (G.marcador) return G.marcador;
    const S = G.S, $ = G.util.$;
    const ALM = (G.pack.meta && G.pack.meta.almacen) || G.pack.id;
    const CLAVE = { casa: ALM + '.marcador', ajustes: ALM + '.marcador.ajustes' };

    // ---------- Valores (provisionales: [KELVIN] ajustar con partidas reales; ver CAP1_PENDIENTE P0-3) ----------
    const PUNTOS = { diario: 50, lugares: 25, rescates: 75, misiones: 100, comer: 5, entrega: 10 };
    const MEDALLAS = [['oro', 30 * 60, 1000], ['plata', 45 * 60, 600], ['bronce', Infinity, 300]];
    const ORDEN = ['oro', 'plata', 'bronce'];
    const GUARDAR_CADA = 30; // s de juego entre guardados automáticos del tiempo
    const MAX_CASA = 24;

    const esObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
    const nn = (v, max) => (typeof v === 'number' && isFinite(v) && v > 0 ? Math.min(v, max || 1e7) : 0);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const idioma = () => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? 'en' : 'es');
    const L = (es, en) => (idioma() === 'en' ? en : es);
    const relajado = () => !!(G.accesibilidad && G.accesibilidad.relajado && G.accesibilidad.relajado());
    // m:ss con aritmética entera (h:mm:ss pasada la hora)
    const reloj = t => {
      const s = Math.max(0, Math.floor(t)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60;
      return h ? h + ':' + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0') : m + ':' + String(ss).padStart(2, '0');
    };
    const TX = {
      tiempo: ['Tiempo', 'Time'], puntos: ['Puntos', 'Points'], pts: ['pts', 'pts'],
      cronoSi: ['Cronómetro: sí', 'Timer: on'], cronoNo: ['Cronómetro: no', 'Timer: off'],
      oro: ['Oro', 'Gold'], plata: ['Plata', 'Silver'], bronce: ['Bronce', 'Bronze'],
      medalla: ['Medalla', 'Medal'], bono: ['Bonificación por tiempo', 'Time bonus'],
      recPrimero: ['¡Tu primer récord!', 'Your first record!'], recTiempo: ['¡Nuevo récord de tiempo!', 'New time record!'],
      recPuntos: ['¡Nuevo récord de puntos!', 'New points record!'], recAmbos: ['¡Récord de tiempo y de puntos!', 'Record time and points!'],
      sinRec: ['Tu récord sigue en pie. ¡Puedes superarlo!', 'Your record still stands. You can beat it!'],
      relajado: ['Modo relajado: sin tiempos ni medalla.', 'Relaxed mode: no timers or medal.'],
      compartir: ['Compartir mi tarjeta', 'Share my card'],
      tituloCap: ['Mi capítulo', 'My chapter'], casa: ['Récords de la casa', 'House records'],
      sinCasa: ['Aún no hay capítulos terminados en este dispositivo.', 'No chapters finished on this device yet.'],
      mejorT: ['Mejor tiempo', 'Best time'], mejorP: ['Mejor puntuación', 'Best score'], jugadas: ['Capítulos terminados', 'Chapters finished'],
      enCamino: ['En camino', 'In progress'], terminado: ['Terminado', 'Finished'], tu: ['tú', 'you'],
      lema: ['Vuela, explora y salva tu isla con Vittata', 'Fly, explore and save your island with Vittata'],
      tituloImg: ['Mi capítulo en Amazona Verse', 'My chapter in Amazona Verse'],
      preparando: ['Preparando tu imagen…', 'Getting your image ready…'], errImagen: ['Este navegador no pudo crear la imagen.', 'This browser could not create the image.'],
      compartido: ['Listo: ya la compartiste.', 'Done: you shared it.'], descargado: ['Listo: tu imagen se descargó.', 'Done: your image was downloaded.'],
      miTiempo: ['MI TIEMPO', 'MY TIME'], miPuntos: ['MIS PUNTOS', 'MY POINTS'], capitulo: ['Capítulo', 'Chapter'],
    };
    const tx = k => TX[k][idioma() === 'en' ? 1 : 0];
    const nombreMedalla = m => (m ? tx(m) : '');

    // ---------- Almacén del dispositivo (si el navegador lo bloquea, vive en memoria durante la sesión) ----------
    const mem = {};
    const leerRaw = k => { try { const v = localStorage.getItem(k); if (v != null) return v; } catch (e) { /* sin almacén */ } return mem[k] == null ? null : mem[k]; };
    const escribirRaw = (k, v) => { try { localStorage.setItem(k, v); delete mem[k]; return true; } catch (e) { mem[k] = v; return false; } };
    const leerJSON = k => { try { const d = JSON.parse(leerRaw(k) || 'null'); return esObj(d) ? d : null; } catch (e) { return null; } };
    const quitarRaw = k => { try { localStorage.removeItem(k); } catch (e) { /* sin almacén */ } delete mem[k]; };

    let claveCasa = CLAVE.casa; // las pruebas la cambian un momento por una clave `.prueba`
    const nombreCotorra = () => { const n = S.profile && S.profile.name; const f = G.guardado && G.guardado.limpiarTexto; return (f ? f(n, 24) : String(n || '').slice(0, 24)) || 'Aprendiz'; };
    const casaDe = d => {
      const out = {};
      for (const [n, e] of Object.entries(esObj(d) && d.v === 1 && esObj(d.jugadores) ? d.jugadores : {})) {
        if (!esObj(e) || Object.keys(out).length >= MAX_CASA) continue;
        out[String(n).slice(0, 24)] = { mejorT: nn(e.mejorT, 1e6) || null, mejorPts: nn(e.mejorPts) || null, medalla: ORDEN.includes(e.medalla) ? e.medalla : null, jugadas: Math.floor(nn(e.jugadas, 1e5)) };
      }
      return out;
    };
    const leerCasa = () => casaDe(leerJSON(claveCasa));
    const guardarCasa = c => escribirRaw(claveCasa, JSON.stringify({ v: 1, jugadores: c }));

    // ---------- Estado de la partida (S.marcador) ----------
    const nuevo = () => ({ v: 1, t: 0, pts: 0, n: { diario: 0, lugares: 0, rescates: 0, misiones: 0, frutos: 0, bono: 0 }, fin: null });
    const medallaDe = t => { for (const [m, max] of MEDALLAS) if (t <= max) return m; return 'bronce'; };
    const bonoDe = m => { const f = MEDALLAS.find(x => x[0] === m); return f ? f[2] : 0; };
    function limpiarFin(f) {
      if (!esObj(f)) return null;
      const rec = esObj(f.rec) ? { primero: !!f.rec.primero, tiempo: !!f.rec.tiempo, puntos: !!f.rec.puntos } : null;
      return { t: nn(f.t, 1e7) || null, pts: nn(f.pts), bonus: nn(f.bonus), medalla: ORDEN.includes(f.medalla) ? f.medalla : null, relajado: !!f.relajado, rec };
    }
    // Partida vieja (sin marcador): los puntos de lo que ya tenía; el tiempo empieza en 0
    function desdeLoViejo() {
      const m = nuevo(), ev = Array.isArray(S.events) ? S.events : [];
      m.n.diario = (Array.isArray(S.field) ? S.field.length : 0) * PUNTOS.diario;
      m.n.lugares = (Array.isArray(S.lugares) ? S.lugares.length : 0) * PUNTOS.lugares;
      m.n.rescates = ev.filter(e => e && e.key === 'FloodRescue').length * PUNTOS.rescates;
      m.n.misiones = Object.values(esObj(S.missions) ? S.missions : {}).filter(v => v === true).length * PUNTOS.misiones;
      m.pts = m.n.diario + m.n.lugares + m.n.rescates + m.n.misiones;
      return m;
    }
    function normalizar() {
      const d = S.marcador;
      let m;
      if (esObj(d) && d.v === 1) {
        const n = esObj(d.n) ? d.n : {};
        m = { v: 1, t: nn(d.t, 1e7), pts: Math.floor(nn(d.pts)), n: { diario: 0, lugares: 0, rescates: 0, misiones: 0, frutos: 0, bono: 0 }, fin: limpiarFin(d.fin) };
        for (const k of Object.keys(m.n)) m.n[k] = Math.floor(nn(n[k]));
      } else m = desdeLoViejo();
      if (S.complete && !m.fin) { // terminada antes del marcador: el tiempo de la historia (reloj del evento ChapterCompleted)
        const ev = (S.events || []).find(e => e && e.key === 'ChapterCompleted'), t = ev && nn(ev.t, 1e7);
        const med = t ? medallaDe(t) : null, bonus = med ? bonoDe(med) : 0;
        m.n.bono = bonus; m.pts += bonus;
        m.fin = { t: t || null, pts: m.pts, bonus, medalla: med, relajado: false, rec: null };
        if (t && !m.t) m.t = t;
      }
      S.marcador = m;
      return m;
    }
    const M = () => (esObj(S.marcador) && S.marcador.v === 1 ? S.marcador : normalizar());

    // ---------- HUD ----------
    const CSS = `
:root { --i-reloj: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='13' r='8' fill='none' stroke='%23000' stroke-width='2.4'/%3E%3Cpath fill='none' stroke='%23000' stroke-width='2.4' stroke-linecap='round' d='M12 8.5V13l3 2M9.5 2.5h5'/%3E%3C/svg%3E"); }
#quest { position: relative; }
/* En una esquina del cuadro del objetivo, sin sumarle altura (así no empuja ni tapa nada) */
#marcador { position: absolute; z-index: 1; top: var(--sp-3); right: var(--sp-4); display: flex; align-items: center; flex-wrap: nowrap; gap: 8px var(--sp-3); margin: 0; font: 700 var(--fs-xs)/1.2 var(--font-display); color: var(--c-text); font-variant-numeric: tabular-nums; }
#marcador[hidden] { display: none; }
#marcador span { display: inline-flex; align-items: center; gap: 5px; }
#marcador i { flex: none; width: 13px; height: 13px; background: currentColor; -webkit-mask: var(--icon) center / contain no-repeat; mask: var(--icon) center / contain no-repeat; color: var(--c-eyebrow); }
#marcador .mc-t i { --icon: var(--i-reloj); }
#marcador .mc-p i { --icon: var(--i-star, none); }
#marcador .mc-p.late { animation: mc-late .45s var(--ease-pop, ease-out); }
#marcador .mc-pops { position: absolute; left: 0; right: 0; top: 100%; height: 0; pointer-events: none; }
#marcador .mc-pop { position: absolute; left: 24px; top: 0; white-space: nowrap; font: 700 var(--fs-md)/1 var(--font-display); color: var(--gold, #ffd24a); text-shadow: 0 2px 0 rgba(0, 0, 0, .55), 0 0 10px rgba(255, 210, 74, .6); animation: mc-sube 1.4s ease-out forwards; }
#marcador .mc-pop small { font: 600 var(--fs-xs)/1 var(--font-body); color: var(--c-text); opacity: .85; }
@keyframes mc-sube { 0% { opacity: 0; transform: translateY(-4px) scale(.8); } 15% { opacity: 1; transform: translateY(2px) scale(1.15); } 100% { opacity: 0; transform: translateY(26px) scale(1); } }
@keyframes mc-late { 40% { transform: scale(1.25); } }
.mc-med { display: inline-grid; place-items: center; flex: none; width: 56px; height: 56px; border-radius: 50%; font: 700 var(--fs-xl)/1 var(--font-display); color: #4a2a05;
  background: radial-gradient(circle at 35% 30%, #fff8d8, var(--m1) 45%, var(--m2)); box-shadow: 0 0 0 3px #fff, 0 3px 0 3px rgba(0, 0, 0, .18); }
.mc-med.oro { --m1: #ffd24a; --m2: #c98a10; } .mc-med.plata { --m1: #e4ecf2; --m2: #8a9aa8; } .mc-med.bronce { --m1: #f0a86a; --m2: #9a5a24; }
#end-marcador { display: grid; gap: var(--sp-2); justify-items: center; margin: var(--sp-3) 0; text-align: center; }
#end-marcador[hidden] { display: none; }
.panel:has(#end-confirm:not([hidden])) #end-marcador { display: none; }
#end-marcador .mc-fila { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: var(--sp-3) var(--sp-5); }
#end-marcador .mc-dato { display: grid; gap: 2px; }
#end-marcador .mc-dato b { font: 700 var(--fs-3xl)/1 var(--font-display); color: var(--c-text); font-variant-numeric: tabular-nums; }
#end-marcador .mc-dato small { font: 400 var(--fs-sm)/1.2 var(--font-body); color: var(--c-text-muted); }
#end-marcador .mc-rec { margin: 0; font: 700 var(--fs-md)/1.3 var(--font-display); color: var(--c-eyebrow); }
#end-marcador .mc-nota { margin: 0; font-size: var(--fs-sm); color: var(--c-text-muted); }
@media (max-width: 560px) {
  #marcador { top: auto; bottom: 9px; right: 34px; }
  #quest.abierto #marcador { top: 10px; bottom: auto; }
  #quest:not(.abierto):has(#marcador .mc-t:not([hidden])) #steps li.now { padding-right: 96px; }
  #quest:not(.abierto):has(#marcador .mc-t[hidden]) #steps li.now { padding-right: 56px; }
}
@media (prefers-reduced-motion: reduce) { #marcador .mc-pop { animation: mc-fundir 1.4s linear forwards; } #marcador .mc-p.late { animation: none; } @keyframes mc-fundir { 0%, 70% { opacity: 1; } 100% { opacity: 0; } } }
`;
    if (!document.getElementById('marcador-css')) { const st = document.createElement('style'); st.id = 'marcador-css'; st.textContent = CSS; document.head.appendChild(st); }

    const verCrono = () => { const a = leerJSON(CLAVE.ajustes); return !(a && a.ver === false); };
    let ver = verCrono();
    let hud = null, elT = null, elP = null, pops = null, ultimoHud = '';
    function montarHud() {
      if (hud && document.contains(hud)) return hud;
      const q = $('quest'); if (!q) return null;
      hud = document.createElement('div'); hud.id = 'marcador'; hud.setAttribute('role', 'timer'); hud.setAttribute('aria-live', 'off');
      hud.innerHTML = '<span class="mc-t"><i aria-hidden="true"></i><b></b></span><span class="mc-p"><i aria-hidden="true" data-icon="star"></i><b></b></span><div class="mc-pops" aria-hidden="true"></div>';
      const tras = $('steps'); if (tras && tras.parentNode === q) tras.after(hud); else q.appendChild(hud);
      elT = hud.querySelector('.mc-t'); elP = hud.querySelector('.mc-p'); pops = hud.querySelector('.mc-pops');
      return hud;
    }
    function pintarHud(forzar) {
      if (!montarHud()) return;
      const m = M(), rel = relajado();
      const mostrarT = ver && !rel;
      const t = m.fin && m.fin.t ? m.fin.t : m.t;
      const clave = (mostrarT ? reloj(t) : '') + '|' + m.pts + '|' + idioma();
      elT.hidden = !mostrarT;
      if (!forzar && clave === ultimoHud) return;
      ultimoHud = clave;
      elT.querySelector('b').textContent = reloj(t);
      elP.querySelector('b').textContent = m.pts;
      elT.title = tx('tiempo'); elP.title = tx('puntos');
      elT.setAttribute('aria-label', tx('tiempo') + ' ' + reloj(t)); elP.setAttribute('aria-label', tx('puntos') + ' ' + m.pts);
    }
    function pop(pts, motivo) {
      if (!montarHud() || G.quiet) return;
      const e = document.createElement('div'); e.className = 'mc-pop';
      e.style.top = (pops.children.length % 3) * 14 + 'px';
      e.innerHTML = '+' + pts + (motivo ? ' <small>' + esc(motivo) + '</small>' : '');
      pops.appendChild(e);
      setTimeout(() => e.remove(), 1500);
      elP.classList.remove('late'); void elP.offsetWidth; elP.classList.add('late');
    }

    // ---------- Puntuación ----------
    const MOTIVO = { diario: ['Diario', 'Journal'], lugares: ['Lugar', 'Place'], rescates: ['Rescate', 'Rescue'], misiones: ['Misión', 'Mission'], frutos: ['Fruto', 'Fruit'] };
    function sumar(motivo, pts) {
      const m = M();
      if (m.fin || !(pts > 0) || !(motivo in m.n)) return 0;
      m.pts += pts; m.n[motivo] += pts;
      pintarHud(); pop(pts, MOTIVO[motivo] && MOTIVO[motivo][idioma() === 'en' ? 1 : 0]);
      G.emit('marcador', { motivo, pts, total: m.pts });
      G.guardado.autosave();
      return pts;
    }
    G.on('aprendizaje', e => {
      if (!e) return;
      if (e.tipo === 'hallazgo') sumar('diario', PUNTOS.diario);
      else if (e.tipo === 'lugar') sumar('lugares', PUNTOS.lugares);
      else if (e.tipo === 'mision') sumar('misiones', PUNTOS.misiones);
    });
    G.on('banquete', e => {
      if (!e) return;
      if (e.tipo === 'comer') sumar('frutos', PUNTOS.comer);
      else if (e.tipo === 'entrega') sumar('frutos', PUNTOS.entrega * Math.max(1, Math.min(10, e.n | 0)));
    });

    // ---------- Final del capítulo ----------
    function registrar(t, pts, med) {
      const libro = leerCasa(), nom = nombreCotorra();
      const e = libro[nom] || (Object.keys(libro).length < MAX_CASA ? (libro[nom] = { mejorT: null, mejorPts: null, medalla: null, jugadas: 0 }) : null);
      if (!e) return null;
      const primero = e.jugadas === 0;
      const recT = !!t && (!e.mejorT || t < e.mejorT), recP = !e.mejorPts || pts > e.mejorPts;
      if (recT) e.mejorT = t;
      if (recP) e.mejorPts = pts;
      if (med && (!e.medalla || ORDEN.indexOf(med) < ORDEN.indexOf(e.medalla))) e.medalla = med;
      e.jugadas++;
      guardarCasa(libro);
      return { primero, tiempo: recT && !primero, puntos: recP && !primero };
    }
    function terminar() {
      const m = M();
      if (m.fin) return m.fin;
      const rel = relajado(), t = rel ? null : Math.round(m.t * 10) / 10;
      const med = !rel && t ? medallaDe(t) : null, bonus = med ? bonoDe(med) : 0;
      m.n.bono = bonus; m.pts += bonus;
      m.fin = { t, pts: m.pts, bonus, medalla: med, relajado: rel, rec: registrar(t, m.pts, med) };
      pintarHud(true); pintarFin();
      if (bonus) pop(bonus, tx('bono'));
      G.emit('marcador', { motivo: 'fin', pts: bonus, total: m.pts });
      G.guardado.autosave();
      return m.fin;
    }
    // Rescates y fin: se leen del registro de eventos de la partida (no hace falta tocar historia.js)
    let vistos = 0;
    function escanear() {
      const ev = S.events; if (!Array.isArray(ev)) return;
      if (ev.length < vistos) vistos = 0;
      for (; vistos < ev.length; vistos++) {
        const e = ev[vistos];
        if (!e) continue;
        if (e.key === 'FloodRescue') sumar('rescates', PUNTOS.rescates);
        else if (e.key === 'ChapterCompleted' && !M().fin) terminar();
      }
    }

    // ---------- Cronómetro ----------
    const conReloj = () => !(G.retosApi && G.retosApi.activo);
    let aGuardar = 0, tMostrado = -1;
    function cuenta(dt, busy) {
      const m = M();
      if (m.fin || S.complete || !(dt > 0) || busy || document.hidden || !conReloj()) return false;
      if (G.pausa && G.pausa.activa()) return false;
      m.t += Math.min(dt, 0.25);
      return true;
    }
    G.on('update', (dt, busy) => {
      escanear();
      if (cuenta(dt, busy)) {
        const s = Math.floor(M().t);
        if (s !== tMostrado) { tMostrado = s; pintarHud(); }
        if ((aGuardar += Math.min(dt, 0.25)) >= GUARDAR_CADA) { aGuardar = 0; G.guardado.autosave(); }
      }
    }, 85);

    // ---------- Panel final ----------
    function htmlFin(f) {
      const med = f.medalla ? `<span class="mc-med ${f.medalla}" role="img" aria-label="${esc(tx('medalla') + ': ' + nombreMedalla(f.medalla))}">★</span>` : '';
      let rec = '';
      if (f.rec) rec = f.rec.primero ? tx('recPrimero') : f.rec.tiempo && f.rec.puntos ? tx('recAmbos') : f.rec.tiempo ? tx('recTiempo') : f.rec.puntos ? tx('recPuntos') : tx('sinRec');
      return `<div class="mc-fila">${med}
        ${f.t ? `<div class="mc-dato"><b>${reloj(f.t)}</b><small>${esc(tx('tiempo'))}${f.medalla ? ' · ' + esc(nombreMedalla(f.medalla)) : ''}</small></div>` : ''}
        <div class="mc-dato"><b>${f.pts}</b><small>${esc(tx('puntos'))}${f.bonus ? ' · ' + esc(tx('bono')) + ' +' + f.bonus : ''}</small></div></div>
        ${rec ? `<p class="mc-rec">${esc(rec)}</p>` : ''}${f.relajado ? `<p class="mc-nota">${esc(tx('relajado'))}</p>` : ''}
        <button class="btn ghost sm" type="button" data-mc-compartir data-icon="share">${esc(tx('compartir'))}</button>`;
    }
    function pintarFin() {
      const fin = $('end'); if (!fin) return;
      const panel = fin.querySelector('.panel'), acc = $('end-acciones'); if (!panel || !acc) return;
      let el = $('end-marcador');
      if (!el) { el = document.createElement('div'); el.id = 'end-marcador'; el.setAttribute('aria-live', 'polite'); panel.insertBefore(el, acc); }
      const f = M().fin;
      el.hidden = !f;
      el.innerHTML = f ? htmlFin(f) : '';
    }

    // ---------- «Mis récords» (records.js llama a htmlRecords) ----------
    function htmlRecords() {
      const m = M(), f = m.fin, rel = relajado(), t = f && f.t ? f.t : m.t;
      const casa = Object.entries(leerCasa()).sort((a, b) => ((a[1].mejorT || 1e12) - (b[1].mejorT || 1e12)) || ((b[1].mejorPts || 0) - (a[1].mejorPts || 0)));
      const yo = nombreCotorra();
      const ahora = `<article class="rec-card"><h4>${esc(tx('tituloCap'))}</h4>
        <div class="rec-grande">${f && f.medalla ? `<span class="rec-m ${f.medalla}" role="img" aria-label="${esc(nombreMedalla(f.medalla))}">★</span>` : ''}<div><b class="rec-num">${m.pts} <small>${esc(tx('pts'))}</small></b><small>${esc(f ? tx('terminado') : tx('enCamino'))}</small></div></div>
        <dl>${rel ? '' : `<div><dt>${esc(tx('tiempo'))}</dt><dd>${reloj(t)}</dd></div>`}${f && f.bonus ? `<div><dt>${esc(tx('bono'))}</dt><dd>+${f.bonus}</dd></div>` : ''}</dl>
        ${f ? `<p><button class="btn ghost sm" type="button" data-mc-compartir data-icon="share">${esc(tx('compartir'))}</button></p>` : ''}</article>`;
      const lista = casa.length
        ? `<ol class="rec-casa">${casa.map(([n, e]) => `<li${n === yo ? ' aria-current="true"' : ''}><span>${esc(n)}${n === yo ? ` <em>(${esc(tx('tu'))})</em>` : ''}</span>
            <span>${e.medalla ? `<span class="rec-m ${e.medalla}" role="img" aria-label="${esc(nombreMedalla(e.medalla))}">★</span>` : ''}${e.mejorT ? `<b>${reloj(e.mejorT)}</b>` : '—'}</span>
            <span><b>${e.mejorPts || '—'}</b> ${esc(tx('pts'))}</span></li>`).join('')}</ol>`
        : `<p class="rec-nota">${esc(tx('sinCasa'))}</p>`;
      return `<section class="rec-sec" aria-labelledby="rec-h-marcador"><h3 id="rec-h-marcador">${esc(tx('capitulo'))} ${(G.pack.meta && G.pack.meta.capitulo) || 1} <small>${esc(tx('casa'))}</small></h3>
        <div class="rec-grid rec-dos">${ahora}</div><div style="margin-top:var(--sp-3)">${lista}</div></section>`;
    }

    // ---------- Tarjeta para compartir (1080×1350) ----------
    async function tarjetaPNG() {
      const m = M(), f = m.fin || { t: m.t, pts: m.pts, medalla: null }, W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const x = cv.getContext('2d'), cx = W / 2;
      try { await Promise.all([document.fonts.load('700 100px Fredoka'), document.fonts.load('700 30px "Atkinson Hyperlegible"')]); } catch (e) { /* fuentes del sistema */ }
      const F = (peso, px) => `${peso} ${px}px Fredoka, "Trebuchet MS", system-ui, sans-serif`, B = (peso, px) => `${peso} ${px}px "Atkinson Hyperlegible", system-ui, sans-serif`;
      let g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1b1550'); g.addColorStop(0.3, '#3b2c8f'); g.addColorStop(0.55, '#7a55c9'); g.addColorStop(0.78, '#f08a5d'); g.addColorStop(1, '#ffc46b');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = '#2c6b45'; x.beginPath(); x.moveTo(0, 1130); x.bezierCurveTo(250, 1070, 450, 1100, 640, 1120); x.bezierCurveTo(840, 1140, 960, 1090, W, 1110); x.lineTo(W, H); x.lineTo(0, H); x.fill();
      x.fillStyle = '#0f2e1e'; x.fillRect(0, 1262, W, H - 1262);
      x.textAlign = 'center'; x.lineJoin = 'round';
      x.font = F(700, 116); x.lineWidth = 22; x.strokeStyle = '#2b1405'; x.strokeText('AMAZONA VERSE', cx, 168);
      g = x.createLinearGradient(0, 70, 0, 170); g.addColorStop(0, '#fff8cf'); g.addColorStop(0.5, '#ffcb3d'); g.addColorStop(1, '#ee7a12'); x.fillStyle = g; x.fillText('AMAZONA VERSE', cx, 168);
      const rot = tx('capitulo') + ' ' + ((G.pack.meta && G.pack.meta.capitulo) || 1);
      x.font = F(600, 44); const rw = Math.min(x.measureText(rot).width + 80, W - 120);
      x.fillStyle = 'rgba(20,12,60,.6)'; x.beginPath(); if (x.roundRect) x.roundRect(cx - rw / 2, 206, rw, 70, 35); else x.rect(cx - rw / 2, 206, rw, 70); x.fill();
      x.fillStyle = '#fff'; x.fillText(rot, cx, 256);
      const col = { oro: ['#ffd24a', '#c98a10'], plata: ['#e4ecf2', '#8a9aa8'], bronce: ['#f0a86a', '#9a5a24'] }[f.medalla] || ['#bfe7c8', '#3f9a55'], r = 170, cy = 520;
      x.shadowColor = 'rgba(255,210,122,.9)'; x.shadowBlur = 60; x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, r + 14, 0, 7); x.fill(); x.shadowBlur = 0;
      g = x.createRadialGradient(cx - 55, cy - 65, 10, cx, cy, r); g.addColorStop(0, '#fff8d8'); g.addColorStop(0.45, col[0]); g.addColorStop(1, col[1]);
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
      x.fillStyle = '#4a2a05'; x.font = F(700, 190); x.textBaseline = 'middle'; x.fillText('★', cx, cy + 10); x.textBaseline = 'alphabetic';
      x.lineWidth = 12; x.strokeStyle = '#1b1550';
      let y = 800;
      if (f.t) {
        x.font = B(700, 36); x.fillStyle = '#ffe9a8'; x.lineWidth = 8; x.strokeText(tx('miTiempo').split('').join(String.fromCharCode(8202)), cx, y); x.fillText(tx('miTiempo').split('').join(String.fromCharCode(8202)), cx, y);
        x.font = F(700, 170); x.lineWidth = 26; x.strokeText(reloj(f.t), cx, y + 150); x.fillStyle = '#fff'; x.fillText(reloj(f.t), cx, y + 150); y += 230;
      }
      x.font = B(700, 36); x.fillStyle = '#ffe9a8'; x.lineWidth = 8; x.strokeText(tx('miPuntos').split('').join(String.fromCharCode(8202)), cx, y); x.fillText(tx('miPuntos').split('').join(String.fromCharCode(8202)), cx, y);
      x.font = F(700, f.t ? 130 : 190); x.lineWidth = 22; x.strokeText(String(f.pts), cx, y + (f.t ? 120 : 170)); x.fillStyle = '#fff'; x.fillText(String(f.pts), cx, y + (f.t ? 120 : 170));
      if (f.medalla) { x.font = F(600, 44); x.lineWidth = 10; const l = tx('medalla') + ': ' + nombreMedalla(f.medalla); x.strokeText(l, cx, 1230); x.fillStyle = '#ffe9a8'; x.fillText(l, cx, 1230); }
      try { const im = await G.AVE.assets.image('assets/vittata.png'); if (im) { const s = 300; x.drawImage(im, W - s - 24, H - s - 6, s, s); } } catch (e) { /* sin imagen */ }
      x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = B(700, 28); x.fillText(tx('lema'), 56, 1288, 640);
      x.font = F(600, 34); x.fillStyle = '#ffd27a'; x.fillText('amazona-verse.vercel.app', 56, 1328);
      return new Promise(res => {
        let listo = false; const fin = b => { if (!listo) { listo = true; res(b); } };
        try { cv.toBlob(fin, 'image/png'); } catch (e) { fin(null); }
        setTimeout(() => fin(null), 10000);
      });
    }
    let compartiendo = false;
    // Puerta para adultos de records.js; la tarjeta se prepara mientras se resuelve la suma. o.* : pruebas
    async function compartir(o) {
      o = o || {};
      if (compartiendo) return 'ocupado';
      compartiendo = true;
      try {
        if (!window.AVRecords) await G.AVE.assets.script('src/game/records.js');
        const R = G.recordsApi || window.AVRecords(G);
        const preparar = Promise.resolve().then(o.preparar || tarjetaPNG); preparar.catch(() => {});
        if (!(await R.puerta(o))) return 'puerta';
        G.ui.toast(tx('preparando'), 3000);
        const blob = await preparar.catch(() => null);
        if (!blob) { G.ui.toast(tx('errImagen'), 4000); return 'error'; }
        const r = await R.compartirArchivo(blob, 'amazona-verse-mi-capitulo.png', { title: tx('tituloImg'), text: tx('tituloImg') + ' · ' + M().pts + ' ' + tx('pts') + ' · amazona-verse.vercel.app' }, o);
        if (r === 'compartido') G.ui.toast(tx('compartido'), 3000); else if (r === 'descargado') G.ui.toast(tx('descargado'), 3000);
        return r;
      } finally { compartiendo = false; }
    }
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-mc-compartir]')) compartir().catch(() => {}); });

    // ---------- Pausa: ocultar el cronómetro ----------
    let boton = null;
    function montarBoton() {
      if (boton && document.contains(boton)) return;
      const grid = document.querySelector('#pause .pause-grid'); if (!grid) return;
      boton = document.createElement('button'); boton.className = 'btn tile'; boton.type = 'button'; boton.id = 'b-crono'; boton.setAttribute('data-icon', 'flag');
      const ref = $('b-records'); if (ref) ref.after(boton); else grid.appendChild(boton);
      boton.addEventListener('click', () => mostrar(!ver));
    }
    function pintarBoton() {
      if (!boton) return;
      boton.textContent = ver ? tx('cronoSi') : tx('cronoNo'); boton.setAttribute('aria-pressed', String(ver)); boton.hidden = relajado();
    }
    function mostrar(on) {
      ver = !!on; escribirRaw(CLAVE.ajustes, JSON.stringify({ v: 1, ver }));
      pintarBoton(); pintarHud(true);
    }

    // ---------- Ciclo de vida ----------
    function alAplicar() { normalizar(); vistos = (S.events || []).length; tMostrado = -1; aGuardar = 0; montarHud(); montarBoton(); pintarBoton(); pintarHud(true); pintarFin(); }
    G.on('apply', alAplicar, 75);
    G.on('aula', () => { pintarBoton(); pintarHud(true); pintarFin(); });
    G.on('nuevoEstudiante', () => { quitarRaw(CLAVE.casa); quitarRaw(CLAVE.ajustes); ver = true; });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') G.guardado.autosave(); });
    alAplicar();

    // =================================================================================================================
    // AV.marcadorTest(): el cronómetro se pausa (pausa, diálogo, pestaña oculta, Retos) y cuenta jugando; la puntuación suma
    // (Diario, lugares, misiones, rescates, frutos) con su «+N»; la medalla y el bono por tiempo; el récord de la casa (aparte de
    // la partida y no se borra al comenzar de cero); el panel final; y el guardado compatible con partidas viejas.
    // La partida y los almacenes reales quedan como estaban.
    // =================================================================================================================
    async function test() {
      const out = [], check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
      const snap = G.guardado.instantanea(), casa0 = leerRaw(CLAVE.casa), aj0 = leerRaw(CLAVE.ajustes), verAntes = ver;
      const quieta = G.quiet, relOrig = G.accesibilidad && G.accesibilidad.relajado;
      const claveOrig = claveCasa, pruebaCasa = CLAVE.casa + '.prueba';
      const motivoPausa = 'marcador-prueba';
      let hiddenDef = false;
      const base = () => { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, JSON.parse(JSON.stringify(G.guardado.freshState()))); alAplicar(); };
      const paso = (dt, busy) => { G.emit('update', dt, !!busy, false); };
      G.guardado.suspender(true); G.quiet = true; claveCasa = pruebaCasa; quitarRaw(pruebaCasa);
      try {
        // 1. Partida nueva: empieza en 0
        base();
        check('Partida nueva: cronómetro y puntos en 0, sin final', M().t === 0 && M().pts === 0 && M().fin === null && S.marcador && S.marcador.v === 1);
        check('El HUD (#marcador) está dentro del cuadro del objetivo (#quest) y muestra 0:00', !!$('marcador') && $('quest').contains($('marcador')) && /0:00/.test($('marcador').textContent));
        // 2. El cronómetro cuenta jugando y se detiene
        paso(1); paso(1);
        check('Jugando, el cronómetro suma el tiempo del juego', Math.abs(M().t - 2) < 1e-6, M().t);
        G.pausa.set(motivoPausa, true); paso(5); G.pausa.set(motivoPausa, false);
        check('En pausa (menú, portada o motivo de otro módulo) se detiene', Math.abs(M().t - 2) < 1e-6, M().t);
        paso(5, true);
        check('Con un diálogo, tarjeta o menú abierto (busy) se detiene', Math.abs(M().t - 2) < 1e-6, M().t);
        try { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); hiddenDef = true; } catch (e) { /* sin override */ }
        if (hiddenDef) { paso(5); check('Con la pestaña oculta se detiene', Math.abs(M().t - 2) < 1e-6, M().t); delete document.hidden; hiddenDef = false; }
        const retosAntes = G.retosApi; G.retosApi = { activo: true }; paso(5); G.retosApi = retosAntes;
        check('En el Modo Retos se detiene (tiene su propio reloj)', Math.abs(M().t - 2) < 1e-6, M().t);
        paso(30);
        check('Un salto grande de tiempo (pestaña dormida) cuenta como mucho 0,25 s', Math.abs(M().t - 2.25) < 1e-6, M().t);
        M().t = 2;
        // 3. Puntuación
        const p0 = M().pts;
        G.emit('aprendizaje', { tipo: 'hallazgo', id: 'x' });
        check('Un hallazgo del Diario suma 50 y se anota', M().pts === p0 + 50 && M().n.diario === 50);
        G.emit('aprendizaje', { tipo: 'lugar', id: 'x' }); G.emit('aprendizaje', { tipo: 'mision', id: 'x' });
        check('Un lugar suma 25 y una misión 100', M().pts === p0 + 175 && M().n.lugares === 25 && M().n.misiones === 100);
        S.events.push({ key: 'FloodRescue', t: 1 }); paso(0.016);
        check('Un rescate en la crecida suma 75 (se lee del registro de eventos, una sola vez)', M().pts === p0 + 250 && M().n.rescates === 75 && (paso(0.016), M().pts === p0 + 250));
        G.emit('banquete', { tipo: 'comer' }); G.emit('banquete', { tipo: 'entrega', n: 3 });
        check('Los frutos del Banquete suman: 5 al comer y 10 por cada uno entregado', M().pts === p0 + 285 && M().n.frutos === 35);
        G.quiet = false; G.emit('aprendizaje', { tipo: 'hallazgo', id: 'z' }); G.quiet = true;
        check('Al sumar sale un «+N» flotando en el HUD', !!$('marcador').querySelector('.mc-pop') && /\+50/.test($('marcador').querySelector('.mc-pop').textContent));
        M().pts -= 50; M().n.diario -= 50;
        // 4. El HUD se puede ocultar y el modo relajado lo quita
        mostrar(false); check('Se oculta desde la pausa (preferencia del dispositivo)', $('marcador').querySelector('.mc-t').hidden === true && !!$('b-crono'));
        mostrar(true); check('Se vuelve a mostrar', $('marcador').querySelector('.mc-t').hidden === false);
        if (G.accesibilidad) { G.accesibilidad.relajado = () => true; pintarHud(true); check('En el modo relajado no se muestra el cronómetro (los puntos sí)', $('marcador').querySelector('.mc-t').hidden === true && !$('marcador').querySelector('.mc-p').hidden); G.accesibilidad.relajado = relOrig; pintarHud(true); }
        // 5. Medallas y bonificación
        check('Medallas por tiempo: oro hasta 30 min, plata hasta 45, bronce después', medallaDe(10 * 60) === 'oro' && medallaDe(30 * 60) === 'oro' && medallaDe(31 * 60) === 'plata' && medallaDe(45 * 60) === 'plata' && medallaDe(90 * 60) === 'bronce');
        check('Bonificación: oro 1000, plata 600, bronce 300 (siempre suma)', bonoDe('oro') === 1000 && bonoDe('plata') === 600 && bonoDe('bronce') === 300);
        // 6. Terminar el capítulo (por el evento, como en el juego)
        M().t = 20 * 60; const antes = M().pts;
        S.complete = true; S.events.push({ key: 'ChapterCompleted', t: 1 }); paso(0.016);
        const f = M().fin;
        check('Al terminar: oro, bonificación 1000 y puntos finales', f && f.medalla === 'oro' && f.bonus === 1000 && f.pts === antes + 1000 && f.t === 1200, JSON.stringify(f));
        check('Es el primer récord de esta cotorra', f && f.rec && f.rec.primero === true);
        const tFin = M().t; paso(5); G.emit('aprendizaje', { tipo: 'hallazgo', id: 'y' });
        check('Terminado, el cronómetro y los puntos quedan fijos', M().t === tFin && M().pts === f.pts);
        check('El panel final muestra tiempo, puntos, medalla, récord y el botón de compartir', (() => { const e = $('end-marcador'); return !!e && !e.hidden && /20:00/.test(e.textContent) && e.textContent.includes(String(f.pts)) && !!e.querySelector('.mc-med.oro') && /récord|record/i.test(e.textContent) && !!e.querySelector('[data-mc-compartir]'); })());
        check('El libro de la casa tiene la marca de la cotorra (aparte de la partida)', (() => { const c = leerCasa()[nombreCotorra()]; return c && c.mejorT === 1200 && c.mejorPts === f.pts && c.medalla === 'oro' && c.jugadas === 1; })());
        check('«Mis récords» incluye el capítulo y la casa', (() => { const h = htmlRecords(); return h.includes('rec-sec') && h.includes('20:00') && h.includes(String(f.pts)); })());
        // 7. Récord: mejor y peor segunda partida
        base(); M().t = 40 * 60; M().pts = 100; S.complete = true; S.events.push({ key: 'ChapterCompleted', t: 1 }); paso(0.016);
        const f2 = M().fin, c2 = leerCasa()[nombreCotorra()];
        check('Una partida peor no es récord y no baja el récord de la casa', f2.medalla === 'plata' && f2.rec && !f2.rec.primero && !f2.rec.tiempo && !f2.rec.puntos && c2.mejorT === 1200 && c2.jugadas === 2, JSON.stringify(f2.rec));
        base(); M().t = 10 * 60; S.complete = true; S.events.push({ key: 'ChapterCompleted', t: 1 }); paso(0.016);
        const f3 = M().fin, c3 = leerCasa()[nombreCotorra()];
        check('Una partida más rápida es récord de tiempo y se guarda', f3.rec && f3.rec.tiempo === true && c3.mejorT === 600, JSON.stringify(f3.rec));
        // 8. Comenzar de cero: la partida nueva reinicia; los récords de la casa se quedan
        G.guardado.replace(G.guardado.freshState()); alAplicar();
        check('«Comenzar de cero» reinicia el cronómetro y los puntos de la partida', M().t === 0 && M().pts === 0 && M().fin === null && (!$('end-marcador') || $('end-marcador').hidden));
        check('…pero el récord de la casa se queda', (leerCasa()[nombreCotorra()] || {}).mejorT === 600);
        // 9. Guardado y partidas viejas
        check('La clave marcador viaja en la partida', G.guardado.KEYS.includes('marcador'));
        base(); M().t = 123.4; M().pts = 321;
        const d = JSON.parse(G.guardado.serialize());
        check('La partida guardada lleva el marcador', d.marcador && d.marcador.t === 123.4 && d.marcador.pts === 321 && d.marcador.v === 1);
        const viejo = JSON.parse(JSON.stringify(d)); delete viejo.marcador;
        check('Una partida vieja (sin marcador) sigue siendo válida', G.guardado.validSave(viejo) === true);
        G.guardado.replace(Object.assign(G.guardado.freshState(), viejo, { field: ['a', 'b'], lugares: ['p'], missions: Object.assign({}, G.guardado.freshState().missions, { [Object.keys(G.guardado.freshState().missions)[0]]: true }), events: [{ key: 'FloodRescue', t: 3 }] }));
        delete S.marcador; alAplicar();
        check('Al cargar una partida vieja, los puntos salen de lo que ya tenía y el tiempo empieza en 0', M().t === 0 && M().pts === 100 + 25 + 100 + 75 && M().fin === null, M().pts);
        G.guardado.replace(Object.assign(G.guardado.freshState(), viejo, { complete: true, events: [{ key: 'ChapterCompleted', t: 2000 }] }));
        delete S.marcador; alAplicar();
        check('Una partida vieja ya terminada recibe su final con el tiempo de la historia (sin tocar el libro de la casa)', M().fin && M().fin.t === 2000 && M().fin.medalla === 'plata' && M().fin.rec === null);
        S.marcador = { v: 1, t: 'x', pts: -5, n: 7, fin: { medalla: 'platino', t: -1 } }; alAplicar();
        check('Un marcador dañado se sanea', M().t === 0 && M().pts === 0 && (!M().fin || M().fin.medalla === null));
        // 10. Compartir pasa por la puerta para adultos
        base(); M().t = 100; S.complete = true; S.events.push({ key: 'ChapterCompleted', t: 1 }); paso(0.016);
        let blob = null;
        const pr = compartir({ preparar: () => new Blob(['x'], { type: 'image/png' }), azar: () => 0.5, descargar: async b => { blob = b; return 'descargado'; }, movil: false });
        for (let i = 0; i < 200 && !($('rec-puerta') && !$('rec-puerta').hidden); i++) await new Promise(r => setTimeout(r, 25));
        const pu = $('rec-puerta');
        check('Compartir abre la puerta para adultos antes de compartir nada', !!pu && !pu.hidden && blob === null);
        if (pu) pu.querySelector('#rp-no').click();
        check('Si el adulto dice «Ahora no», no se comparte ni se descarga nada', (await pr) === 'puerta' && blob === null);
      } catch (e) {
        check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 400));
      } finally {
        if (hiddenDef) delete document.hidden;
        G.pausa.set(motivoPausa, false);
        const pu = $('rec-puerta'); if (pu && !pu.hidden) { const no = pu.querySelector('#rp-no'); if (no) no.click(); }
        G.accesibilidad && relOrig && (G.accesibilidad.relajado = relOrig);
        quitarRaw(pruebaCasa); claveCasa = claveOrig;
        ver = verAntes; if (aj0 == null) quitarRaw(CLAVE.ajustes); else escribirRaw(CLAVE.ajustes, aj0);
        if (casa0 == null) quitarRaw(CLAVE.casa); else escribirRaw(CLAVE.casa, casa0);
        G.guardado.replace(JSON.parse(JSON.stringify(snap))); alAplicar();
        G.quiet = quieta; G.guardado.suspender(false);
      }
      check('La partida y el libro de la casa reales quedan como estaban', JSON.stringify(G.guardado.instantanea()) === JSON.stringify(snap) && leerRaw(CLAVE.casa) === casa0);
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    const api = { tiempo: () => M().t, puntos: () => M().pts, fin: () => M().fin, sumar, terminar, mostrar, htmlRecords, tarjetaPNG, compartir, medallaDe, reloj, test, PUNTOS, MEDALLAS };
    G.marcador = api;
    return api;
  };
})();
