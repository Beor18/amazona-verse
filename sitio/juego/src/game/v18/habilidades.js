/* Juego · V18.1 frente A · motor de habilidades por especie (D7). Contrato abilityId en docs/equipo/V18_CONTRATOS.md:
   { id, especies | familias, tecnica, coste (energía), cooldown (s), efecto: fn(ctx), fx, nombre }.
   Kelvin 5-nov (respuestas definitivas, Demo D7):
   - Dos ataques básicos comunes a TODAS: golpe de ala (cerca) y semilla (a distancia). El grito ya no es básico.
   - Un poder por especie/familia:
       Isleñas (Vittata)      · «Grito del Yunque»  (técnica PICO): abre el pico y lanza ondas sonoras hacia donde mira, con
                                alcance limitado; empujan a la rival e interrumpen lo que hacía un momento. Hay que apuntar.
       Montañeras (arausiaca) · «Escudo de plumas»  (técnica PLUMAS): abre las alas y giran plumas de luz a su alrededor;
                                para UN golpe normal durante poco tiempo y, si es el grito, lo reduce sin anularlo. Luego se dispersan.
   - Energía 0–100 que se recarga sola (indicador aparte de las plumas); cada habilidad tiene su espera.
   - El motor no sabe de duelos: el efecto recibe ctx = { yo, otro, golpear(blanco, g), lanzar(p), despues(s, fn), fx(tipo, x, y, z),
     sonar(nombre), onda(origen, dir, alcance), escudo(luchador, s), poder(ev) } y lo arma quien lo usa (combate.js).
   Solo con la bandera V18. Lo prueba AV.v18CombateTest() (combate.js). */
window.AVV18Habilidades = function (G) {
  'use strict';
  if (G.v18hab) return G.v18hab;
  const ENERGIA_MAX = 100, RECARGA = 12; // por segundo
  const REG = new Map();
  const PODER_DE_FAMILIA = {};
  const familia = sp => (G.dones && G.dones.de && G.dones.de[sp]) || (sp === 'arausiaca' ? 'montaneras' : 'islenas');
  const dirA = (a, b) => { const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz) || 1; return { x: dx / d, z: dz / d, d }; };
  const dist = (a, b) => Math.hypot(b.pos.x - a.pos.x, (b.pos.y - a.pos.y) * 0.6, b.pos.z - a.pos.z);
  // Hacia dónde mira un luchador: el jugador, adonde mira Vittata (hay que apuntar); la IA, hacia su rival
  function mira(yo, otro) {
    if (!yo.ia && yo.mira) { const f = yo.mira(); const n = f && Math.hypot(f.x, f.z); if (n > 0.01) return { x: f.x / n, z: f.z / n }; }
    const d = dirA(yo, otro); return { x: d.x, z: d.z };
  }

  function registrar(def) {
    if (!def || !def.id || typeof def.efecto !== 'function') return false;
    const d = Object.assign({ coste: 0, cooldown: 1, basico: false, especies: null, familias: null }, def);
    REG.set(d.id, d);
    if (!d.basico && d.familias) for (const f of d.familias) PODER_DE_FAMILIA[f] = d.id;
    return true;
  }
  const get = id => REG.get(id) || null;
  // El poder de una especie: por lista de especies y, si no, por familia (cualquier Isleña hereda el Grito del Yunque)
  function poderDe(sp) {
    for (const d of REG.values()) if (!d.basico && d.especies && d.especies.includes(sp)) return d.id;
    return PODER_DE_FAMILIA[familia(sp)] || 'grito_yunque';
  }

  // ---------- Básicos comunes (todas las especies) ----------
  registrar({ id: 'golpe_ala', basico: true, nombre: 'Golpe de ala', coste: 0, cooldown: 0.55, alcance: 2.4, fx: 'feathers',
    efecto(ctx) {
      const { yo, otro } = ctx; ctx.fx('feathers', yo.pos.x, yo.pos.y + 0.9, yo.pos.z); ctx.sonar('aleteo');
      if (dist(yo, otro) > this.alcance) return { ok: true, acierto: false };
      return { ok: true, acierto: ctx.golpear(otro, { plumas: 1, empuje: 7, mareo: 0.7, dir: dirA(yo, otro) }) };
    } });
  registrar({ id: 'semilla', basico: true, nombre: 'Semilla', coste: 15, cooldown: 0.8, alcance: 18, fx: 'leaves',
    efecto(ctx) {
      const { yo, otro } = ctx, d = dirA(yo, otro);
      // Puntería amable: apunta a la rival si está más o menos delante (o siempre, en la IA)
      let ax = d.x, az = d.z;
      if (yo.mira && !yo.ia) { const f = yo.mira(); if (f && f.x * d.x + f.z * d.z < 0.35) { ax = f.x; az = f.z; } }
      ctx.lanzar({ de: yo, x: yo.pos.x + ax * 0.8, y: yo.pos.y + 0.9, z: yo.pos.z + az * 0.8, vx: ax * 16, vy: (otro.pos.y - yo.pos.y) / Math.max(0.3, d.d / 16), vz: az * 16,
        vida: this.alcance / 16, radio: 1.0, golpe: { plumas: 1, empuje: 3.5, mareo: 0.45 } });
      ctx.sonar('dash'); return { ok: true };
    } });

  // ---------- Poderes por especie ----------
  // Grito del Yunque: cono de 7 m hacia donde mira (±35°); la onda viaja a 16 m/s y, si alcanza, empuja e interrumpe (sin quitar plumas)
  registrar({ id: 'grito_yunque', nombre: 'Grito del Yunque', especies: ['vittata'], familias: ['islenas'], tecnica: 'pico', coste: 35, cooldown: 5,
    fx: 'onda', alcance: 7, cono: 0.82, vel: 16, empuje: 15, interrumpe: 1.1, pico: 0.7,
    efecto(ctx) {
      const { yo, otro } = ctx, h = this, dir = mira(yo, otro);
      const origen = { x: yo.pos.x + dir.x * 0.5, y: yo.pos.y + 1.0, z: yo.pos.z + dir.z * 0.5 };
      yo.picoT = h.pico; yo.cara = 'fight'; // abre el pico (hueso «pico» del rig, vía mouth) mientras grita
      ctx.onda(origen, dir, h.alcance); ctx.sonar('dash'); ctx.sonar('ring', 3);
      ctx.poder({ id: h.id, de: yo.id, origen, direccion: { x: dir.x, y: 0, z: dir.z }, alcance: h.alcance });
      const alcanza = () => {
        const dx = otro.pos.x - origen.x, dz = otro.pos.z - origen.z, d = Math.hypot(dx, dz);
        if (d > h.alcance + 0.6) return false;
        return d < 1.2 || (dx * dir.x + dz * dir.z) / d >= h.cono;
      };
      const d0 = Math.hypot(otro.pos.x - origen.x, otro.pos.z - origen.z);
      ctx.despues(Math.min(h.alcance, d0) / h.vel, () => {
        if (!alcanza()) return;
        ctx.golpear(otro, { plumas: 0, empuje: h.empuje, mareo: h.interrumpe, interrumpe: true, sonido: true, dir: { x: dir.x, z: dir.z }, forzar: true });
      });
      return { ok: true, acierto: null, dir };
    } });
  // Escudo de plumas: 2,5 s; para un golpe normal o reduce el grito (empuje ×0,4, interrupción ×0,35) y se dispersa. Espera 7 s.
  registrar({ id: 'escudo_plumas', nombre: 'Escudo de plumas', especies: ['arausiaca'], familias: ['montaneras'], tecnica: 'plumas', coste: 35, cooldown: 7,
    fx: 'escudo', dura: 2.5, reduceEmpuje: 0.4, reduceMareo: 0.35,
    efecto(ctx) {
      const { yo } = ctx;
      yo.escudo = this.dura; yo.alasT = this.dura;
      ctx.escudo(yo, this.dura); ctx.sonar('unlock');
      ctx.poder({ id: this.id, de: yo.id, origen: { x: yo.pos.x, y: yo.pos.y + 0.9, z: yo.pos.z }, dura: this.dura });
      return { ok: true };
    } });

  // ---------- Luchadores ----------
  function luchador(o) {
    const sp = o.especie || 'vittata';
    return Object.assign({ id: 'jugador', nombre: '', especie: sp, familia: familia(sp), poder: poderDe(sp), pos: { x: 0, y: 0, z: 0 },
      plumas: 5, plumasMax: 5, energia: ENERGIA_MAX, energiaMax: ENERGIA_MAX, cd: {}, mareo: 0, inv: 0, escudo: 0, picoT: 0, alasT: 0, ia: false },
    o, { familia: familia(sp), poder: o.poder || poderDe(sp) });
  }
  function listo(f, id) {
    const h = get(id); if (!h) return { ok: false, motivo: 'no existe' };
    if (f.mareo > 0) return { ok: false, motivo: 'mareo' };
    if ((f.cd[id] || 0) > 0) return { ok: false, motivo: 'espera' };
    if (f.energia < h.coste) return { ok: false, motivo: 'energia' };
    if (!h.basico && f.poder !== id) return { ok: false, motivo: 'no es suyo' };
    return { ok: true, h };
  }
  const nada = () => {};
  function usar(f, id, ctx) {
    const l = listo(f, id); if (!l.ok) return l;
    f.energia -= l.h.coste; f.cd[id] = l.h.cooldown;
    const c = Object.assign({ yo: f, onda: nada, escudo: nada, poder: nada, despues: (s, fn) => fn(), fx: nada, sonar: nada, lanzar: nada }, ctx);
    const r = l.h.efecto(c) || { ok: true };
    return Object.assign({ ok: true, id }, r);
  }
  function paso(f, dt) {
    f.energia = Math.min(f.energiaMax, f.energia + RECARGA * dt);
    for (const k in f.cd) f.cd[k] = Math.max(0, f.cd[k] - dt);
    f.mareo = Math.max(0, f.mareo - dt); f.inv = Math.max(0, f.inv - dt); f.escudo = Math.max(0, f.escudo - dt);
    f.picoT = Math.max(0, (f.picoT || 0) - dt); f.alasT = Math.max(0, (f.alasT || 0) - dt);
    if (!f.picoT && f.cara === 'fight') f.cara = null;
  }
  G.v18hab = { ENERGIA_MAX, RECARGA, BASICOS: ['golpe_ala', 'semilla'], registrar, get, lista: () => Array.from(REG.values()), poderDe, familia, luchador, listo, usar, paso, dist, dirA, mira };
  return G.v18hab;
};
