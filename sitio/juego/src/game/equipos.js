/* Juego · Bandada de la casa (CG-18, fase 0).
   Todo en este dispositivo. Sin red, sin ranking y sin texto libre.
   Clave `<almacen>.equipos`:
     { v:1, nombre:[i,j], emblema:{glifo,color}, miembros:[nombres de cotorra],
       marana:{perchas,meta,semillas,pichones,viva}, relevo:{tramos,total,mejor} }
   «Nuevo estudiante» lo borra (también boot.js). La pestaña «Bandada» vive en «Mis récords».
   La Maraña es fantasía (enredadera gris): no es un animal ni una persona. Si entra en canon, lo decide Kelvin.
   No se afirma ninguna especie invasora. Prueba: AV.equiposTest(). */
(function () {
  'use strict';
  const NOMBRE_A = ['Bandada del', 'Vuelo del', 'Nido de la', 'Coro del', 'Ala del', 'Canto de la', 'Rama del', 'Cielo del'];
  const NOMBRE_B = ['Coquí Valiente', 'Ceiba Alegre', 'Palma Solar', 'Río Gentil', 'Yunque Brillante', 'Mar Azul', 'Flor Tropical', 'Monte Veloz'];
  const GLIFOS = ['coqui', 'flor', 'hoja', 'rio', 'monte', 'sol', 'nido', 'bandera'];
  const COLORES = ['#2f8f4e', '#3d8fb0', '#e0a020', '#c45c26', '#6b4c9a', '#1f6b4a'];
  const META = 30;
  const SOSTENER_MS = 1500;
  const ROJO = '#ee0000', BLANCO = '#ffffff', AZUL = '#0044ff';

  window.AVEquipos = function (G) {
    if (G.equipos) return G.equipos;
    const ALM = (G.pack.meta && G.pack.meta.almacen) || G.pack.id || 'amazonaverse';
    const CLAVE_REAL = ALM + '.equipos';
    let clave = CLAVE_REAL;
    let casaForzada = null;
    const mem = {};
    const esObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
    const idioma = () => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? 'en' : 'es');
    const tx = (es, en) => (idioma() === 'en' ? en : es);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const reloj = t => { const d = Math.max(0, Math.round(t * 10)); return Math.floor(d / 600) + ':' + String(Math.floor(d / 10) % 60).padStart(2, '0') + '.' + (d % 10); };
    let tVirtual = null;
    const ahora = () => (tVirtual != null ? tVirtual : performance.now());

    function leerRaw(k) {
      try { const v = localStorage.getItem(k); if (v != null) return v; } catch (e) { /* sin almacén */ }
      return mem[k] == null ? null : mem[k];
    }
    function escribirRaw(k, v) {
      if (G.quiet && k === CLAVE_REAL) return false;
      try { localStorage.setItem(k, v); delete mem[k]; return true; } catch (e) { mem[k] = v; return false; }
    }
    function quitarRaw(k) {
      try { localStorage.removeItem(k); } catch (e) { /* sin almacén */ }
      delete mem[k];
    }
    function vacio() {
      return { v: 1, nombre: [0, 0], emblema: { glifo: 0, color: 0 }, miembros: [], marana: { perchas: 0, meta: META, semillas: 0, pichones: 0, viva: false }, relevo: { tramos: [], total: null, mejor: null } };
    }
    function sanear(d) {
      const e = vacio();
      if (!esObj(d)) return e;
      const i = d.nombre && d.nombre[0], j = d.nombre && d.nombre[1];
      if (Number.isInteger(i) && i >= 0 && i < NOMBRE_A.length && Number.isInteger(j) && j >= 0 && j < NOMBRE_B.length) e.nombre = [i, j];
      const em = esObj(d.emblema) ? d.emblema : {};
      if (Number.isInteger(em.glifo) && em.glifo >= 0 && em.glifo < GLIFOS.length) e.emblema.glifo = em.glifo;
      if (Number.isInteger(em.color) && em.color >= 0 && em.color < COLORES.length) e.emblema.color = em.color;
      if (Array.isArray(d.miembros)) e.miembros = d.miembros.filter(nombreOk).slice(0, 24);
      const m = esObj(d.marana) ? d.marana : {};
      e.marana.perchas = Number.isInteger(m.perchas) && m.perchas > 0 ? Math.min(META, m.perchas) : 0;
      e.marana.semillas = Number.isInteger(m.semillas) && m.semillas > 0 ? Math.min(999, m.semillas) : 0;
      e.marana.pichones = Number.isInteger(m.pichones) && m.pichones > 0 ? Math.min(999, m.pichones) : 0;
      e.marana.viva = !!m.viva && e.marana.perchas >= META;
      const r = esObj(d.relevo) ? d.relevo : {};
      e.relevo.tramos = (Array.isArray(r.tramos) ? r.tramos : []).filter(tramoOk).slice(0, 3);
      e.relevo.total = e.relevo.tramos.length === 3 ? e.relevo.tramos.reduce((s, t) => s + t.ms, 0) : null;
      e.relevo.mejor = typeof r.mejor === 'number' && r.mejor > 0 ? r.mejor : e.relevo.total;
      return e;
    }
    function nombreOk(n) {
      if (G.creador && G.creador.esNombreDeLista) return !!G.creador.esNombreDeLista(n);
      return typeof n === 'string' && /^[\p{L}][\p{L} ]{0,22}$/u.test(n) && !/\d|@|https?/i.test(n);
    }
    function tramoOk(t) {
      return esObj(t) && nombreOk(t.miembro) && typeof t.ms === 'number' && t.ms >= 0 && t.ms < 36e5
        && typeof t.especie === 'string' && /^[a-z]{3,24}$/.test(t.especie)
        && Array.isArray(t.muestras) && t.muestras.length <= 360 && t.muestras.every(x => typeof x === 'number' && isFinite(x));
    }
    function leer() {
      try { return sanear(JSON.parse(leerRaw(clave) || 'null')); } catch (e) { return vacio(); }
    }
    function guardar(e) {
      const limpio = sanear(e);
      escribirRaw(clave, JSON.stringify({
        v: 1, nombre: limpio.nombre, emblema: limpio.emblema, miembros: limpio.miembros,
        marana: { perchas: limpio.marana.perchas, meta: META, semillas: limpio.marana.semillas, pichones: limpio.marana.pichones, viva: limpio.marana.viva },
        relevo: { tramos: limpio.relevo.tramos, total: limpio.relevo.total, mejor: limpio.relevo.mejor }
      }));
      return limpio;
    }
    function borrar() { quitarRaw(clave); }
    const nombreDe = e => NOMBRE_A[e.nombre[0]] + ' ' + NOMBRE_B[e.nombre[1]];
    function fijarNombre(i, j) {
      i |= 0; j |= 0;
      if (i < 0 || j < 0 || i >= NOMBRE_A.length || j >= NOMBRE_B.length) return false;
      const e = leer(); e.nombre = [i, j]; guardar(e); return true;
    }
    function fijarEmblema(glifo, color) {
      const e = leer();
      if (glifo != null) { glifo |= 0; if (glifo < 0 || glifo >= GLIFOS.length) return false; e.emblema.glifo = glifo; }
      if (color != null) { color |= 0; if (color < 0 || color >= COLORES.length) return false; e.emblema.color = color; }
      guardar(e); return true;
    }

    function leerCasa() {
      const k = casaForzada || (G.recordsApi && G.recordsApi.CLAVE && G.recordsApi.CLAVE.casa) || (ALM + '.records');
      try {
        const d = JSON.parse(leerRaw(k) || 'null');
        return esObj(d) && esObj(d.jugadores) ? d : { jugadores: {} };
      } catch (e) { return { jugadores: {} }; }
    }
    function sincronizar() {
      const e = leer();
      e.miembros = Object.keys(leerCasa().jugadores || {}).filter(nombreOk).slice(0, 24);
      return guardar(e);
    }
    function suma() {
      const e = leer(), jug = leerCasa().jugadores || {};
      let jugadas = 0, mejorRio = null, mejorCarrera = null, mejorTormenta = null;
      const filas = e.miembros.map(nombre => {
        const j = jug[nombre] || {}, c = j.carrera || {}, t = j.tormenta || {}, w = j.rio || {};
        jugadas += (c.jugadas || 0) + (t.jugadas || 0) + (w.jugadas || 0);
        if (w.mejor > 0 && (mejorRio == null || w.mejor < mejorRio)) mejorRio = w.mejor;
        if (c.mejor > 0 && (mejorCarrera == null || c.mejor < mejorCarrera)) mejorCarrera = c.mejor;
        if (t.mejor > 0 && (mejorTormenta == null || t.mejor > mejorTormenta)) mejorTormenta = t.mejor;
        return { nombre, carrera: c.mejor || null, tormenta: t.mejor || null, rio: w.mejor || null };
      });
      return { jugadas, mejorRio, mejorCarrera, mejorTormenta, filas, perchas: e.marana.perchas, meta: META };
    }

    // --- Bandera de Puerto Rico (docs/BANDERA_PR_GUIA.md): 2:3, 5 franjas, triángulo equilátero, estrella con punta arriba ---
    function estrella(ctx, cx, cy, r) {
      const ri = r * 0.382;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 ? ri : r, a = -Math.PI / 2 + i * Math.PI / 5;
        const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fill();
    }
    function dibujarBandera(ctx, x, y, h) {
      const w = h * 1.5, fr = h / 5;
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? BLANCO : ROJO; ctx.fillRect(x, y + fr * i, w, fr + 0.5); }
      ctx.fillStyle = AZUL; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + h * 0.866, y + h / 2); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = BLANCO; estrella(ctx, x + h * 0.2887, y + h / 2, h / 6);
      return { w, h };
    }
    function lienzoBandera(h) {
      h = h || 60;
      const cv = document.createElement('canvas'); cv.width = Math.round(h * 1.5); cv.height = h;
      dibujarBandera(cv.getContext('2d'), 0, 0, h);
      return cv;
    }
    function dibujarGlifo(ctx, id, color, w, h) {
      if (GLIFOS[id] === 'bandera') { dibujarBandera(ctx, 0, 0, h); return; }
      ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fffaf0'; ctx.beginPath();
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.28;
      if (id === 1 || id === 5) { ctx.arc(cx, cy, r, 0, 7); }
      else if (id === 2) { ctx.ellipse(cx, cy, r * 0.7, r * 1.15, -0.6, 0, 7); }
      else if (id === 3) { ctx.arc(cx - r * 0.4, cy, r * 0.7, Math.PI, 0); ctx.arc(cx + r * 0.4, cy, r * 0.7, Math.PI, 0); }
      else if (id === 4) { ctx.moveTo(cx - r, cy + r * 0.7); ctx.lineTo(cx, cy - r); ctx.lineTo(cx + r, cy + r * 0.7); }
      else if (id === 6) { ctx.arc(cx, cy + r * 0.2, r, 0, Math.PI, true); }
      else { ctx.arc(cx - r * 0.35, cy, r * 0.45, 0, 7); ctx.arc(cx + r * 0.35, cy, r * 0.45, 0, 7); }
      ctx.fill();
    }

    function villa() {
      const L = G.terreno && G.terreno.mapa && G.terreno.mapa.lugares && G.terreno.mapa.lugares.villa;
      return L ? { x: L.x, z: L.z } : { x: 150, z: 170 };
    }
    function suelo(x, z) { try { return G.terreno.height(x, z); } catch (e) { return 0; } }
    function perchas() {
      const v = villa(), offs = [[-8, 4], [9, 2], [5, -9], [-4, -7], [12, 9], [0, 11]];
      return offs.map((o, i) => ({ id: 'villa-' + i, x: v.x + o[0], z: v.z + o[1], y: suelo(v.x + o[0], v.z + o[1]), r: 2.4 }));
    }
    function claros() {
      const v = villa();
      return [{ id: 'claro-1', x: v.x + 16, z: v.z - 4, r: 5 }, { id: 'claro-2', x: v.x - 14, z: v.z + 8, r: 5 }];
    }
    function perchaActual() {
      const S = G.S, M = G.fisica && G.fisica.MOVE;
      if (!S || !S.pos || (M && M.flying)) return null;
      for (const p of perchas()) if (Math.hypot(S.pos.x - p.x, S.pos.z - p.z) <= p.r && Math.abs(S.pos.y - p.y) < 4) return p;
      return null;
    }
    let sostenerDesde = null, usoLlamadas = 0, vivaAvisada = false;
    function celebrar(e) {
      e.marana.viva = true;
      if (vivaAvisada) return;
      vivaAvisada = true;
      G.emit('bandadaViva', { zona: 'villa', flores: true, mariposas: true });
      if (!G.quiet && G.fx && G.fx.burst && G.S && G.S.pos) { try { G.fx.burst(G.S.pos.x, G.S.pos.y + 1, G.S.pos.z, 'petalos', 24); } catch (err) { /* sin fx */ } }
      mostrarVineta();
    }
    function sumarPerchas(n) {
      const e = leer();
      if (e.marana.viva) return e;
      e.marana.perchas = Math.min(META, e.marana.perchas + n);
      if (e.marana.perchas >= META) celebrar(e);
      return guardar(e);
    }
    function usarGesto() {
      usoLlamadas++;
      try { if (G.agarre && G.agarre.usar) G.agarre.usar(); } catch (e) { /* sin agarre */ }
    }
    function desenredar(o) {
      o = o || {};
      if (G.quiet && !o.forzar) return false;
      const p = o.forzar ? (o.percha || perchas()[0]) : perchaActual();
      if (!p) return false;
      usarGesto();
      return sumarPerchas(1).marana.perchas;
    }
    function pasoSostener() {
      if (G.quiet || sostenerDesde == null) return false;
      if (ahora() - sostenerDesde < SOSTENER_MS) return false;
      if (!perchaActual()) return false;
      sostenerDesde = null;
      return desenredar() > 0;
    }
    function sostener(on) {
      if (on) { if (sostenerDesde == null) sostenerDesde = ahora(); }
      else sostenerDesde = null;
    }
    function semilla(o) {
      o = o || {};
      if (!(o.forzar)) {
        const S = G.S; if (!S || !S.pos) return false;
        const dentro = claros().some(c => Math.hypot(S.pos.x - c.x, S.pos.z - c.z) <= c.r);
        const lleva = G.agarre && G.agarre.lleva && G.agarre.lleva();
        if (!dentro || !lleva) return false;
      }
      const e = leer(); e.marana.semillas += 1; guardar(e); return true;
    }
    function pichon() {
      if (G.quiet) return false;
      const e = leer(); e.marana.pichones += 1; guardar(e); return true;
    }

    // El mismo vuelo para toda la casa ese día. No premia seguir ni castiga faltar.
    function vueloDelDia(fecha) {
      const d = fecha || fechaHoy();
      let n = 0; for (const ch of d) n = (n * 33 + ch.charCodeAt(0)) >>> 0;
      return { fecha: d, ruta: n % 4, viento: n % 3, frutos: n % 5 };
    }
    function fechaHoy() {
      const d = new Date();
      return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    }

    // --- Relevo: la contrarreloj del río en 3 tramos, por turnos en este dispositivo ---
    function cortes(n) {
      n = Math.max(3, n | 0);
      const a = Math.ceil(n / 3), b = a + Math.ceil((n - a) / 2);
      return [a, b, n];
    }
    let relevoRun = null;
    function anotarTramo(t) {
      const e = leer();
      if (!tramoOk(t) || !e.miembros.includes(t.miembro)) return null;
      if (e.relevo.tramos.length >= 3) e.relevo.tramos = [];
      e.relevo.tramos.push({ miembro: t.miembro, ms: t.ms, especie: t.especie, muestras: t.muestras.slice(0, 360) });
      if (e.relevo.tramos.length === 3) {
        e.relevo.total = e.relevo.tramos.reduce((s, x) => s + x.ms, 0);
        if (e.relevo.mejor == null || e.relevo.total < e.relevo.mejor) e.relevo.mejor = e.relevo.total;
      }
      guardar(e);
      return e.relevo;
    }
    function especieDe(nombre) {
      const p = G.S && G.S.profile, look = p && p.look, yo = p && p.name === nombre;
      const sp = yo && look && look.species;
      return typeof sp === 'string' && /^[a-z]{3,24}$/.test(sp) ? sp : 'vittata';
    }
    function vigilar(C, nPuntos) {
      if (!relevoRun || relevoRun.cerrado || !C || !C.rio) return false;
      const fin = cortes(nPuntos || 8)[Math.min(relevoRun.i, 2)];
      const ultimo = relevoRun.i >= 2;
      if (!(C.sig >= fin || (ultimo && C.fase === 'fin'))) return false;
      relevoRun.cerrado = true;
      const e = leer();
      const miembro = e.miembros[relevoRun.i] || e.miembros[0];
      const muestras = (C.grab && C.grab.m) ? C.grab.m.slice(0, 360) : [];
      if (miembro) anotarTramo({ miembro, ms: Math.max(0, Math.round((C.t || 0) * 1000)), especie: especieDe(miembro), muestras });
      relevoRun.i += 1;
      return true;
    }
    function mando(miembro, tramo) {
      return new Promise(res => {
        let capa = document.getElementById('eq-mando');
        if (!capa) {
          capa = document.createElement('div'); capa.id = 'eq-mando';
          capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); capa.setAttribute('aria-labelledby', 'eq-mando-t');
          capa.innerHTML = '<div class="eq-mando-box paper" tabindex="-1"><h2 id="eq-mando-t"></h2><p id="eq-mando-p"></p><button class="btn" type="button" id="eq-mando-ok"></button></div>';
          document.body.appendChild(capa);
          capa.addEventListener('click', ev => { if (ev.target.closest('#eq-mando-ok') && capa._res) { const f = capa._res; capa._res = null; capa.hidden = true; f(true); } });
        }
        capa.querySelector('#eq-mando-t').textContent = tx('Pasa el mando', 'Pass the controller');
        capa.querySelector('#eq-mando-p').textContent = tx('Ahora vuela ' + miembro + '. Tramo ' + tramo + ' de 3.', 'Now ' + miembro + ' flies. Leg ' + tramo + ' of 3.');
        const b = capa.querySelector('#eq-mando-ok'); b.textContent = tx('Listo', 'Ready');
        capa.hidden = false; capa._res = res; b.focus({ preventScroll: true });
      });
    }
    function empezarRelevo() {
      const e = sincronizar();
      if (!e.miembros.length) return Promise.resolve(false);
      const i = e.relevo.tramos.length % 3;
      relevoRun = { i: i, cerrado: false };
      const miembro = e.miembros[i];
      return mando(miembro, i + 1).then(() => {
        const jugar = () => G.retosApi && G.retosApi.jugar && G.retosApi.jugar('rio');
        if (G.retosApi) return jugar();
        if (G.AVE && G.AVE.assets) return G.AVE.assets.script('src/game/retos.js').then(() => window.AVRetos && window.AVRetos(G)).then(jugar);
        return false;
      });
    }
    G.on('update', () => {
      if (!relevoRun || G.quiet) return;
      const dev = G.retosApi && G.retosApi._dev, C = dev && dev.C, R = dev && dev.ruta && dev.ruta.R;
      if (!C) return;
      const n = R && R.puntos ? R.puntos.length : 8;
      if (!vigilar(C, n)) return;
      const seguir = relevoRun.i < 3;
      const miembro = leer().miembros[relevoRun.i];
      setTimeout(() => {
        try { if (G.retosApi && G.retosApi.salir) G.retosApi.salir(); } catch (e) { /* ya fuera */ }
        if (seguir && miembro) mando(miembro, relevoRun.i + 1).then(() => { relevoRun.cerrado = false; if (G.retosApi && G.retosApi.jugar) G.retosApi.jugar('rio'); });
        else relevoRun = null;
      }, 0);
    }, 80);
    G.on('rescateFin', () => { if (!G.quiet) pichon(); });
    G.on('nuevoEstudiante', () => { quitarRaw(CLAVE_REAL); quitarRaw(clave); vivaAvisada = false; });

    function esAccion(e) { return !!(G.input && G.input.es && G.input.es('accion', e)) || e.key === 'e' || e.key === 'E' || e.key === 'Enter'; }
    addEventListener('keydown', e => { if (!e.repeat && esAccion(e)) sostener(true); }, true);
    addEventListener('keyup', e => { if (esAccion(e)) { pasoSostener(); sostener(false); } }, true);
    G.on('update', () => { if (sostenerDesde != null) pasoSostener(); }, 60);
    const actBtn = G.input && G.input.actBtn;
    if (actBtn) {
      actBtn.addEventListener('pointerdown', () => sostener(true));
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) actBtn.addEventListener(ev, () => { pasoSostener(); sostener(false); });
    }

    // --- Pestaña en «Mis récords» ---
    let tab = 'casa', pintando = false;
    const CSS = `
#records .eq-tabs { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin: 0 0 var(--sp-3); }
#records .eq-tabs .btn, #eq-panel .btn, #eq-panel select, #eq-mando .btn { min-height: 44px; min-width: 44px; }
#eq-panel[hidden] { display: none !important; }
#eq-panel { margin: 0 0 var(--sp-4); }
#eq-panel h3 { margin: 0 0 var(--sp-2); font: 700 var(--fs-lg)/1.2 var(--font-display); color: var(--c-ink); }
#eq-panel p, #eq-panel li { font-size: var(--fs-sm); color: var(--c-ink); }
#eq-panel .eq-fila { display: flex; flex-wrap: wrap; gap: var(--sp-2); align-items: center; margin: 0 0 var(--sp-3); }
#eq-panel select { font: 600 var(--fs-md)/1 var(--font-body); }
#eq-panel .eq-meta { height: 14px; border-radius: 8px; background: rgba(107,82,54,.18); overflow: hidden; }
#eq-panel .eq-meta > span { display: block; height: 100%; background: #2f8f4e; }
#eq-panel ol { margin: 0; padding: 0; list-style: none; display: grid; gap: var(--sp-2); }
#eq-panel li { padding: var(--sp-2) var(--sp-3); background: #fffaf0; border: 2px solid var(--c-paper-edge); border-radius: var(--r-md); }
#eq-mando { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; padding: var(--sp-3); background: rgba(6,16,12,.78); }
#eq-mando[hidden] { display: none !important; }
#eq-mando .eq-mando-box, #eq-vineta .eq-vineta-box { width: min(420px, 100%); padding: var(--sp-5); text-align: center; }
#eq-vineta { position: fixed; inset: 0; z-index: 72; display: grid; place-items: center; padding: var(--sp-3); background: rgba(6,16,12,.78); }
#eq-vineta[hidden] { display: none !important; }
#eq-vineta h2 { margin: 0 0 var(--sp-2); font: 700 var(--fs-xl)/1.2 var(--font-display); }
`;
    if (!document.getElementById('equipos-css')) { const st = document.createElement('style'); st.id = 'equipos-css'; st.textContent = CSS; document.head.appendChild(st); }

    function htmlPanel() {
      const e = leer(), s = suma(), dia = vueloDelDia();
      const opts = (lista, sel) => lista.map((n, i) => `<option value="${i}"${i === sel ? ' selected' : ''}>${esc(n)}</option>`).join('');
      const filas = s.filas.length ? s.filas.map(f => `<li><b>${esc(f.nombre)}</b> · ${esc(tx('Carrera', 'Race'))} ${f.carrera ? reloj(f.carrera / 1000) : '—'} · ${esc(tx('Río', 'River'))} ${f.rio ? reloj(f.rio / 1000) : '—'} · ${esc(tx('Tormenta', 'Storm'))} ${f.tormenta == null ? '—' : f.tormenta}</li>`).join('') : `<li>${esc(tx('Cuando jueguen varias cotorras en esta casa, aquí está su bandada.', 'When several parrots play in this house, their flock shows up here.'))}</li>`;
      const tramos = [0, 1, 2].map(i => { const t = e.relevo.tramos[i]; return `<li>${esc(tx('Tramo', 'Leg'))} ${i + 1}: ${t ? esc(t.miembro) + ' · ' + reloj(t.ms / 1000) : '—'}</li>`; }).join('');
      const pct = Math.round(100 * e.marana.perchas / META);
      return `<h3>${esc(tx('Tu bandada', 'Your flock'))}</h3>
        <div class="eq-fila"><canvas id="eq-emblema" width="96" height="64" aria-hidden="true"></canvas>
          <label>${esc(tx('Nombre', 'Name'))} <select data-eq-nombre="a" aria-label="${esc(tx('Primera lista', 'First list'))}">${opts(NOMBRE_A, e.nombre[0])}</select></label>
          <label><select data-eq-nombre="b" aria-label="${esc(tx('Segunda lista', 'Second list'))}">${opts(NOMBRE_B, e.nombre[1])}</select></label></div>
        <p><b>${esc(nombreDe(e))}</b></p>
        <div class="eq-fila"><label>${esc(tx('Emblema', 'Emblem'))} <select data-eq-glifo aria-label="${esc(tx('Glifo', 'Glyph'))}">${GLIFOS.map((g, i) => `<option value="${i}"${i === e.emblema.glifo ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select></label>
          <label><select data-eq-color aria-label="${esc(tx('Color', 'Color'))}">${COLORES.map((c, i) => `<option value="${i}"${i === e.emblema.color ? ' selected' : ''}>${i + 1}</option>`).join('')}</select></label></div>
        <p>${esc(tx('Entre todos', 'Together'))}: ${s.jugadas} ${esc(tx('partidas', 'rounds'))}. ${esc(tx('Mejor río', 'Best river'))} ${s.mejorRio ? reloj(s.mejorRio / 1000) : '—'}.</p>
        <ol>${filas}</ol>
        <h3>${esc(tx('La Maraña', 'The Tangle'))}</h3>
        <p>${esc(tx('Entre todos', 'Together'))}: ${e.marana.perchas} ${esc(tx('perchas libres en Villa Raíz', 'perches free in Villa Raíz'))}.</p>
        <div class="eq-meta" role="progressbar" aria-valuemin="0" aria-valuemax="${META}" aria-valuenow="${e.marana.perchas}"><span style="width:${pct}%"></span></div>
        <p>${esc(tx('Semillas en los claros', 'Seeds in the clearings'))}: ${e.marana.semillas}. ${esc(tx('Pichones que salieron', 'Chicks that got out'))}: ${e.marana.pichones}. ${e.marana.viva ? esc(tx('La zona se ve más viva.', 'The place looks more alive.')) : esc(tx('Pósate y mantén Acción. No caduca y no hay racha.', 'Perch and hold Action. It does not expire and there is no streak.'))}</p>
        <h3>${esc(tx('Relevo del río', 'River relay'))}</h3>
        <ol>${tramos}</ol>
        <p>${esc(tx('Tiempo de la bandada', 'Flock time'))}: ${e.relevo.total ? reloj(e.relevo.total / 1000) : '—'}.</p>
        <p><button class="btn" type="button" data-eq-relevo>${esc(tx('Pasa el mando', 'Pass the controller'))}</button></p>
        <p>${esc(tx('Vuelo de hoy', 'Today\'s flight'))}: ${esc(dia.fecha)} · ${dia.ruta + 1}.</p>`;
    }
    function pintarEmblema() {
      const cv = document.getElementById('eq-emblema'); if (!cv) return;
      const e = leer(), ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (GLIFOS[e.emblema.glifo] === 'bandera') dibujarBandera(ctx, 0, 0, cv.height);
      else dibujarGlifo(ctx, e.emblema.glifo, COLORES[e.emblema.color], cv.width, cv.height);
    }
    function aplicarTab() {
      const body = document.querySelector('#records .rec-body'); if (!body) return;
      for (const ch of body.children) {
        if (ch.id === 'eq-tabs') ch.hidden = false;
        else if (ch.id === 'eq-panel') ch.hidden = tab !== 'bandada';
        else ch.hidden = tab === 'bandada';
      }
      const tabs = body.querySelectorAll('[data-eq-tab]');
      tabs.forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-eq-tab') === tab)));
    }
    function asegurar() {
      const body = document.querySelector('#records .rec-body'); if (!body || pintando) return;
      pintando = true;
      try {
        if (!body.querySelector('#eq-tabs')) {
          const nav = document.createElement('div'); nav.id = 'eq-tabs'; nav.className = 'eq-tabs';
          nav.innerHTML = `<button class="btn ghost" type="button" data-eq-tab="casa"></button><button class="btn ghost" type="button" data-eq-tab="bandada"></button>`;
          body.insertBefore(nav, body.firstChild);
        }
        const nav = body.querySelector('#eq-tabs');
        const [a, b] = nav.querySelectorAll('[data-eq-tab]');
        if (a) a.textContent = tx('Récords', 'Records');
        if (b) b.textContent = tx('Bandada', 'Flock');
        let panel = body.querySelector('#eq-panel');
        if (!panel) { panel = document.createElement('section'); panel.id = 'eq-panel'; panel.setAttribute('aria-label', tx('Tu bandada', 'Your flock')); body.appendChild(panel); }
        if (tab === 'bandada') { sincronizar(); panel.innerHTML = htmlPanel(); pintarEmblema(); }
        aplicarTab();
      } finally { pintando = false; }
    }
    function mostrarVineta() {
      let v = document.getElementById('eq-vineta');
      if (!v) {
        v = document.createElement('div'); v.id = 'eq-vineta'; v.hidden = true;
        v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-labelledby', 'eq-vineta-t');
        v.innerHTML = '<div class="eq-vineta-box paper"><h2 id="eq-vineta-t"></h2><p id="eq-vineta-p"></p><button class="btn" type="button" id="eq-vineta-ok"></button></div>';
        document.body.appendChild(v);
        v.addEventListener('click', ev => { if (ev.target.closest('#eq-vineta-ok')) v.hidden = true; });
      }
      v.querySelector('#eq-vineta-t').textContent = tx('Lo hicimos juntos', 'We did it together');
      v.querySelector('#eq-vineta-p').textContent = tx('La Maraña se aflojó. Villa Raíz se ve más viva.', 'The Tangle loosened. Villa Raíz looks more alive.');
      v.querySelector('#eq-vineta-ok').textContent = tx('Seguir', 'Go on');
      v.hidden = false;
    }
    function enganchar() {
      const root = document.getElementById('records');
      if (root && !root._eq) {
        root._eq = true;
        root.addEventListener('click', e => {
          const b = e.target.closest('[data-eq-tab]');
          if (b) { tab = b.getAttribute('data-eq-tab'); asegurar(); return; }
          if (e.target.closest('[data-eq-relevo]')) { e.preventDefault(); empezarRelevo(); }
        });
        root.addEventListener('change', e => {
          const t = e.target;
          if (t.matches('[data-eq-nombre]')) {
            const eNow = leer();
            const i = t.getAttribute('data-eq-nombre') === 'a' ? +t.value : eNow.nombre[0];
            const j = t.getAttribute('data-eq-nombre') === 'b' ? +t.value : eNow.nombre[1];
            fijarNombre(i, j); asegurar();
          } else if (t.matches('[data-eq-glifo]') || t.matches('[data-eq-color]')) {
            fijarEmblema(t.matches('[data-eq-glifo]') ? +t.value : null, t.matches('[data-eq-color]') ? +t.value : null);
            pintarEmblema();
          }
        });
      }
      // records.js monta #records en su primer abrir(); si la bandada se enganchó antes (carga a demanda desde boot.js),
      // el oyente de las pestañas y el observador se ponen aquí, al abrir, o «Bandada» no hace nada.
      if (G.recordsApi && !G.recordsApi._eqAbrir) {
        const abrir0 = G.recordsApi.abrir;
        G.recordsApi.abrir = function () { const r = abrir0.apply(this, arguments); try { enganchar(); asegurar(); } catch (err) { /* la pestaña no tapa los récords */ } return r; };
        G.recordsApi._eqAbrir = true;
      }
      const body = document.querySelector('#records .rec-body');
      if (body && !body._eqObs) {
        const obs = new MutationObserver(() => { if (!pintando) asegurar(); });
        obs.observe(body, { childList: true });
        body._eqObs = true;
      }
    }
    if (window.AVRecords && !window.AVRecords._eq) {
      const prev = window.AVRecords;
      const wrapped = function (g) { const api = prev(g); if (g === G) enganchar(); return api; };
      wrapped._eq = true; window.AVRecords = wrapped;
    }
    enganchar();
    G.on('aula', () => { if (tab === 'bandada') asegurar(); });

    async function test() {
      const out = [], check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
      const claveAntes = clave, casaAntes = casaForzada, idiomaAntes = G.aula && G.aula.aj ? G.aula.aj.idioma : null;
      const quieta = G.quiet;
      const prueba = CLAVE_REAL + '.prueba', casaPrueba = ALM + '.records.eqprueba';
      const reales = [ALM + '.retos', ALM + '.records', CLAVE_REAL].map(k => [k, leerRaw(k)]);
      const pos0 = G.S && G.S.pos ? { x: G.S.pos.x, y: G.S.pos.y, z: G.S.pos.z } : null;
      const fly0 = G.fisica && G.fisica.MOVE ? G.fisica.MOVE.flying : null;
      let fetchN = 0; const fetch0 = window.fetch;
      if (typeof fetch0 === 'function') window.fetch = function () { fetchN++; return fetch0.apply(this, arguments); };
      const pub0 = G.recordsApi && G.recordsApi.publicarRanking;
      let pubN = 0; if (G.recordsApi) G.recordsApi.publicarRanking = () => { pubN++; };
      let viva = 0; const alViva = () => { viva++; }; G.on('bandadaViva', alViva);
      const cerrarUi = () => {
        tab = 'casa';
        const v = document.getElementById('eq-vineta'); if (v) v.hidden = true;
        const m = document.getElementById('eq-mando'); if (m) { m.hidden = true; if (m._res) { const f = m._res; m._res = null; f(false); } }
        try { if (G.recordsApi && G.recordsApi.abierto && G.recordsApi.abierto()) G.recordsApi.cerrar(); } catch (e) { /* cerrado */ }
      };
      try {
        clave = prueba; casaForzada = casaPrueba; quitarRaw(prueba); quitarRaw(casaPrueba); G.quiet = false; vivaAvisada = false;
        check('Un nombre que no es de las dos listas no se guarda', fijarNombre(0, 0) && !fijarNombre(9, 0) && !fijarNombre(-1, 0) && leer().nombre[0] === 0 && nombreDe(leer()) === 'Bandada del Coquí Valiente');
        check('El emblema solo acepta 8 glifos y 6 colores', fijarEmblema(7, 5) && !fijarEmblema(8, 0) && leer().emblema.glifo === 7 && leer().emblema.color === 5);
        escribirRaw(prueba, '{');
        check('Un guardado dañado no rompe la lectura', leer().v === 1 && leer().marana.meta === 30 && nombreDe(leer()) === 'Bandada del Coquí Valiente');
        const libro = { v: 1, jugadores: {
          'Nube Azul': { carrera: { mejor: 70000, puesto: 2, jugadas: 3 }, tormenta: { mejor: 900, jugadas: 1 }, rio: { mejor: 64000, medalla: 'plata', jugadas: 2 } },
          'Pluma Verde': { carrera: { mejor: 61000, puesto: 1, jugadas: 4 }, tormenta: { mejor: 400, jugadas: 1 }, rio: { mejor: 80000, medalla: 'bronce', jugadas: 1 } },
          'Cielo 787 555': { carrera: { mejor: 1000, jugadas: 1 } }
        } };
        escribirRaw(casaPrueba, JSON.stringify(libro));
        const sync = sincronizar();
        check('La bandada son las cotorras del libro y un teléfono no entra', sync.miembros.length === 2 && sync.miembros.includes('Nube Azul') && sync.miembros.includes('Pluma Verde') && !sync.miembros.some(n => /\d/.test(n)), sync.miembros.join(', '));
        const s = suma();
        check('Suma lo de todas y enseña el récord de cada una', s.jugadas === 12 && s.mejorRio === 64000 && s.mejorCarrera === 61000 && s.mejorTormenta === 900 && s.filas.length === 2, String(s.jugadas));
        const crudo = leerRaw(prueba);
        check('Lo guardado es local: nombre, emblema y miembros, sin red ni racha', /"nombre":\[0,0\]/.test(crudo) && /"miembros":\[/.test(crudo) && !/racha|caduc|streak|supabase|https?:/i.test(crudo));
        if (!G.recordsApi) { await G.AVE.assets.script('src/game/records.js'); window.AVRecords(G); }
        enganchar();
        check('La pestaña abre dentro de Mis récords', G.recordsApi.abrir({ desde: 'portada' }) && document.getElementById('records') && document.querySelector('[data-eq-tab="bandada"]'));
        document.querySelector('[data-eq-tab="bandada"]').click();
        const panel = document.getElementById('eq-panel');
        check('La pestaña Bandada muestra el nombre, la suma y a cada cotorra', panel && !panel.hidden && /Bandada del Coquí Valiente/.test(panel.textContent) && /Entre todos: 12/.test(panel.textContent) && /Nube Azul/.test(panel.textContent) && /1:04\.0/.test(panel.textContent) && /Pluma Verde/.test(panel.textContent) && /1:01\.0/.test(panel.textContent), panel && panel.textContent.replace(/\s+/g, ' ').slice(0, 180));
        const botones = [...document.querySelectorAll('#eq-panel button, #eq-panel select, #records .eq-tabs button')].filter(b => b.getClientRects().length);
        check('Los controles de la bandada miden 44 px o más', botones.length > 0 && botones.every(b => b.offsetHeight >= 44 && b.offsetWidth >= 44), botones.map(b => b.offsetHeight).join(','));
        const cuerpo = document.querySelector('#records .rec-body'), caja = document.querySelector('#records .rec-box');
        check('La pestaña no se sale a lo ancho', cuerpo && caja && cuerpo.scrollWidth <= cuerpo.clientWidth + 1 && caja.scrollWidth <= caja.clientWidth + 1, cuerpo && (cuerpo.scrollWidth + '/' + cuerpo.clientWidth));
        const cv = lienzoBandera(60), px = (x, y) => { const d = cv.getContext('2d').getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; };
        const cerca = (p, rgb) => Math.abs(p[0] - rgb[0]) < 4 && Math.abs(p[1] - rgb[1]) < 4 && Math.abs(p[2] - rgb[2]) < 4;
        check('La bandera es 2:3, con 5 franjas, triángulo azul y estrella blanca', cv.width === 90 && cv.height === 60 && cerca(px(72, 6), [238, 0, 0]) && cerca(px(72, 18), [255, 255, 255]) && cerca(px(72, 30), [238, 0, 0]) && cerca(px(72, 42), [255, 255, 255]) && cerca(px(72, 54), [238, 0, 0]) && cerca(px(4, 8), [0, 68, 255]) && cerca(px(17, 30), [255, 255, 255]), JSON.stringify({ top: px(72, 6), azul: px(4, 8), estrella: px(17, 30) }));
        fijarEmblema(7, 0); asegurar();
        const emb = document.getElementById('eq-emblema'), ep = (x, y) => { const d = emb.getContext('2d').getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; };
        check('El emblema de bandera usa los mismos tonos', emb && cerca(ep(80, 4), [238, 0, 0]) && cerca(ep(4, 32), [0, 68, 255]));
        usoLlamadas = 0;
        const p0 = perchas()[0];
        if (pos0) { G.S.pos.x = p0.x; G.S.pos.y = p0.y; G.S.pos.z = p0.z; }
        if (G.fisica && G.fisica.MOVE) G.fisica.MOVE.flying = false;
        tVirtual = 1000; sostener(true);
        tVirtual = 2400; check('Mantener Acción menos de 1,5 s no libera la percha', pasoSostener() === false && leer().marana.perchas === 0);
        tVirtual = 2500; check('A los 1,5 s, posada, usa el gesto y suma una percha', pasoSostener() === true && usoLlamadas >= 1 && leer().marana.perchas === 1, String(usoLlamadas));
        check('Llevar una semilla al claro suma, y sin estar allí no', semilla({ forzar: true }) && leer().marana.semillas === 1 && semilla() === false);
        const antesP = leer().marana.pichones; G.emit('rescateFin');
        check('Un rescate suma un pichón a la casa', leer().marana.pichones === antesP + 1);
        sumarPerchas(29);
        check('A las 30 perchas la zona queda viva y sale la viñeta, sin caducar', leer().marana.perchas === 30 && leer().marana.viva === true && viva >= 1 && document.getElementById('eq-vineta') && !document.getElementById('eq-vineta').hidden && /Lo hicimos juntos/.test(document.getElementById('eq-vineta').textContent) && !/racha|caduc/.test(leerRaw(prueba)));
        document.getElementById('eq-vineta-ok').click();
        const c8 = cortes(8);
        check('El río se parte en 3 tramos', c8.length === 3 && c8[0] < c8[1] && c8[1] < c8[2] && c8[2] === 8 && c8.join(',') === '3,6,8', c8.join(','));
        check('Sin un relevo en curso el corte no anota nada', vigilar({ rio: true, sig: 3, t: 4.2, fase: 'juego', grab: { m: [1, 2, 3, 4, 5, 6] } }, 8) === false && leer().relevo.tramos.length === 0);
        relevoRun = { i: 0, cerrado: false };
        check('El primer tramo guarda el fantasma de quien lo voló', vigilar({ rio: true, sig: 3, t: 4.2, fase: 'juego', grab: { m: [1, 2, 3, 4, 5, 6] } }, 8) === true && leer().relevo.tramos[0] && leer().relevo.tramos[0].miembro === 'Nube Azul' && leer().relevo.tramos[0].ms === 4200 && leer().relevo.tramos[0].muestras.length === 6, JSON.stringify(leer().relevo.tramos[0]));
        relevoRun = null;
        check('Un nombre libre no anota tramo', anotarTramo({ miembro: 'hola@correo', ms: 1000, especie: 'vittata', muestras: [0, 1, 2] }) === null);
        anotarTramo({ miembro: 'Pluma Verde', ms: 5100, especie: 'oratrix', muestras: [0, 1, 2] });
        const rel = anotarTramo({ miembro: 'Nube Azul', ms: 3000, especie: 'vittata', muestras: [3, 4, 5] });
        check('El tiempo de los 3 tramos es el de la bandada', rel && rel.tramos.length === 3 && rel.total === 4200 + 5100 + 3000 && rel.tramos[1].especie === 'oratrix', String(rel && rel.total));
        const prom = mando('Pluma Verde', 2);
        const capa = document.getElementById('eq-mando');
        check('Pasa el mando dice el nombre y el tramo', capa && !capa.hidden && /Pasa el mando/.test(capa.textContent) && /Pluma Verde/.test(capa.textContent) && /Tramo 2 de 3/.test(capa.textContent) && capa.querySelector('#eq-mando-ok').offsetHeight >= 44);
        capa.querySelector('#eq-mando-ok').click();
        check('Listo cierra la pantalla de relevo', (await prom) === true && capa.hidden);
        const hoy = vueloDelDia('20261102'), hoy2 = vueloDelDia('20261102'), otro = vueloDelDia('20261103');
        check('El vuelo del día es el mismo para la casa y no lleva racha', hoy.fecha === '20261102' && hoy.ruta === hoy2.ruta && hoy.viento === hoy2.viento && hoy.frutos === hoy2.frutos && otro.fecha !== hoy.fecha && !('racha' in hoy));
        if (G.aula && G.aula.aj) { G.aula.aj.idioma = 'en'; asegurar(); check('La pestaña también está en inglés', /Your flock/.test(document.getElementById('eq-panel').textContent) && /Flock/.test(document.querySelector('[data-eq-tab="bandada"]').textContent)); }
        const marcador = '{"v":1,"marca":1}'; escribirRaw(CLAVE_REAL, marcador);
        const antesFetch = fetchN, antesPub = pubN;
        G.emit('nuevoEstudiante');
        check('Nuevo estudiante borra la bandada de este dispositivo', leerRaw(CLAVE_REAL) == null && leerRaw(prueba) == null);
        check('Nada de esto llama al ranking ni a la red', fetchN === antesFetch && pubN === antesPub);
      } catch (e) {
        check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 400));
      } finally {
        cerrarUi();
        tVirtual = null; sostenerDesde = null; relevoRun = null; vivaAvisada = false;
        clave = claveAntes; casaForzada = casaAntes; G.quiet = quieta;
        if (pos0) { G.S.pos.x = pos0.x; G.S.pos.y = pos0.y; G.S.pos.z = pos0.z; }
        if (fly0 != null) G.fisica.MOVE.flying = fly0;
        if (G.aula && G.aula.aj && idiomaAntes) G.aula.aj.idioma = idiomaAntes;
        quitarRaw(prueba); quitarRaw(casaPrueba);
        for (const [k, v] of reales) { if (v == null) quitarRaw(k); else escribirRaw(k, v); }
        if (typeof fetch0 === 'function') window.fetch = fetch0;
        if (G.recordsApi && pub0) G.recordsApi.publicarRanking = pub0;
        tab = 'casa';
      }
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    const api = G.equipos = {
      leer, guardar, borrar, sincronizar, suma, fijarNombre, fijarEmblema, nombreDe, desenredar, semilla, pichon, sostener, pasoSostener,
      vueloDelDia, cortes, anotarTramo, vigilar, mando, empezarRelevo, lienzoBandera, asegurar, test,
      CLAVE: CLAVE_REAL, NOMBRE_A, NOMBRE_B, GLIFOS, COLORES,
      _dev: { set clave(v) { clave = v; }, get clave() { return clave; }, set casa(v) { casaForzada = v; }, reloj(t) { tVirtual = t; }, perchas, usos: () => usoLlamadas }
    };
    if (window.AV && window.AV.G === G && !window.AV.equiposTest) window.AV.equiposTest = o => test(o);
    return api;
  };
})();
