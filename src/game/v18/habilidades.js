/* Juego · V18.1 frente A · motor de habilidades por especie (D7). Contrato abilityId en docs/equipo/V18_CONTRATOS.md:
   { id, especies | familias, coste (energía), cooldown (s), efecto: fn(ctx), fx, nombre }.
   - Tres ataques básicos comunes: golpe de ala (cerca), semilla (a distancia) y grito (empuja, sin quitar plumas).
   - Un poder exclusivo por familia, basado en los dones de src/game/dones.js (sin tocarlo; solo se lee G.dones.de):
       Isleñas (Vittata)      · «Ráfaga doble»     = dos acometidas seguidas que empujan (el impulso encadenado del don rafaga).
       Montañeras (arausiaca) · «Columna de nube»  = sube y esquiva todo un rato, y aparta a quien esté cerca (don columna: vy 6, burbujas).
   - Energía 0–100 que se recarga sola; cada habilidad tiene su espera.
   - El motor no sabe de duelos: el efecto recibe ctx = { yo, otro, golpear(blanco, {plumas, empuje, mareo, dir}), lanzar(p),
     mover(luchador, vx, vz, s), subir(luchador, alto, s), fx(tipo, x, y, z), sonar(nombre) } y lo arma quien lo usa (combate.js).
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

  function registrar(def) {
    if (!def || !def.id || typeof def.efecto !== 'function') return false;
    const d = Object.assign({ coste: 0, cooldown: 1, basico: false, especies: null, familias: null }, def);
    REG.set(d.id, d);
    if (!d.basico && d.familias) for (const f of d.familias) PODER_DE_FAMILIA[f] = d.id;
    return true;
  }
  const get = id => REG.get(id) || null;
  // El poder exclusivo de una especie: por lista de especies y, si no, por familia (cualquier Isleña hereda la Ráfaga doble)
  function poderDe(sp) {
    for (const d of REG.values()) if (!d.basico && d.especies && d.especies.includes(sp)) return d.id;
    return PODER_DE_FAMILIA[familia(sp)] || 'rafaga_doble';
  }

  // ---------- Básicos comunes ----------
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
  registrar({ id: 'grito', basico: true, nombre: 'Grito', coste: 25, cooldown: 3, alcance: 5, fx: 'ring',
    efecto(ctx) {
      const { yo, otro } = ctx; ctx.fx('ring', yo.pos.x, yo.pos.y + 0.9, yo.pos.z); ctx.sonar('has');
      if (dist(yo, otro) > this.alcance) return { ok: true, acierto: false };
      return { ok: true, acierto: ctx.golpear(otro, { plumas: 0, empuje: 12, mareo: 0.9, dir: dirA(yo, otro) }) };
    } });

  // ---------- Poderes exclusivos ----------
  registrar({ id: 'rafaga_doble', nombre: 'Ráfaga doble', especies: ['vittata'], familias: ['islenas'], coste: 40, cooldown: 6,
    don: 'rafaga', fx: 'feathers', vel: 22, tramo: 0.18, pausa: 0.12, alcance: 2.0,
    efecto(ctx) {
      const { yo, otro } = ctx, h = this;
      // Dos acometidas: cada una corre hacia la rival y, si la alcanza, empuja fuerte (le quita una pluma la primera que pega)
      const acometida = n => {
        const d = dirA(yo, otro); ctx.mover(yo, d.x * h.vel, d.z * h.vel, h.tramo); ctx.sonar('dash');
        ctx.fx('feathers', yo.pos.x, yo.pos.y + 0.8, yo.pos.z);
        ctx.despues(h.tramo, () => { if (dist(yo, otro) <= h.alcance + 0.6) ctx.golpear(otro, { plumas: n === 0 ? 1 : 0, empuje: 10, mareo: 0.9, dir: dirA(yo, otro), forzar: n > 0 }); });
      };
      acometida(0); ctx.despues(h.tramo + h.pausa, () => acometida(1));
      return { ok: true };
    } });
  registrar({ id: 'columna_nube', nombre: 'Columna de nube', especies: ['arausiaca'], familias: ['montaneras'], coste: 40, cooldown: 7,
    don: 'columna', fx: 'bubbles', dura: 1.8, alto: 2.6, radio: 3.2,
    efecto(ctx) {
      const { yo, otro } = ctx;
      yo.escudo = this.dura; ctx.subir(yo, this.alto, this.dura);
      ctx.fx('bubbles', yo.pos.x, yo.pos.y + 0.4, yo.pos.z); ctx.fx('ring', yo.pos.x, yo.pos.y + 0.5, yo.pos.z); ctx.sonar('unlock');
      if (dist(yo, otro) <= this.radio) ctx.golpear(otro, { plumas: 0, empuje: 8, mareo: 0.6, dir: dirA(yo, otro) });
      return { ok: true };
    } });

  // ---------- Luchadores ----------
  function luchador(o) {
    const sp = o.especie || 'vittata';
    return Object.assign({ id: 'jugador', nombre: '', especie: sp, familia: familia(sp), poder: poderDe(sp), pos: { x: 0, y: 0, z: 0 },
      plumas: 5, plumasMax: 5, energia: ENERGIA_MAX, energiaMax: ENERGIA_MAX, cd: {}, mareo: 0, inv: 0, escudo: 0, ia: false }, o, { familia: familia(sp), poder: o.poder || poderDe(sp) });
  }
  function listo(f, id) {
    const h = get(id); if (!h) return { ok: false, motivo: 'no existe' };
    if (f.mareo > 0) return { ok: false, motivo: 'mareo' };
    if ((f.cd[id] || 0) > 0) return { ok: false, motivo: 'espera' };
    if (f.energia < h.coste) return { ok: false, motivo: 'energia' };
    if (!h.basico && f.poder !== id) return { ok: false, motivo: 'no es suyo' };
    return { ok: true, h };
  }
  function usar(f, id, ctx) {
    const l = listo(f, id); if (!l.ok) return l;
    f.energia -= l.h.coste; f.cd[id] = l.h.cooldown;
    const r = l.h.efecto(Object.assign({ yo: f }, ctx)) || { ok: true };
    return Object.assign({ ok: true, id }, r);
  }
  function paso(f, dt) {
    f.energia = Math.min(f.energiaMax, f.energia + RECARGA * dt);
    for (const k in f.cd) f.cd[k] = Math.max(0, f.cd[k] - dt);
    f.mareo = Math.max(0, f.mareo - dt); f.inv = Math.max(0, f.inv - dt); f.escudo = Math.max(0, f.escudo - dt);
  }
  G.v18hab = { ENERGIA_MAX, RECARGA, registrar, get, lista: () => Array.from(REG.values()), poderDe, familia, luchador, listo, usar, paso, dist, dirA };
  return G.v18hab;
};
