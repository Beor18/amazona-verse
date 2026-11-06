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
     sonar(nombre), onda(origen, dir, alcance), escudo(luchador, s), poder(ev), desviar(origen, dir, alcance, cono) } y lo arma
     quien lo usa (combate.js).
   - V18.2 (evolución): el motor consulta y no decide. Si el luchador trae `nivel` y existe G.v18evo, ver(f, h) pide a
     evolucion.js la versión de la etapa (Object.create(h) con otros números); el efecto lee this.* y la usa sin copiar código.
     Sin `nivel` (IA, duelo de 2, minigolf, amenazas) todo es idéntico. `f.alianza` habilita un poder de alianza (Eco Protector).
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
      const vel = h.vel * (yo.lenta > 0 ? ((get('mirada_piton') || {}).lento || 0.5) : 1); // Mirada del Pitón: la onda va más lenta
      const origen = { x: yo.pos.x + dir.x * 0.5, y: yo.pos.y + 1.0, z: yo.pos.z + dir.z * 0.5 };
      yo.picoT = h.pico; yo.cara = 'fight'; // abre el pico (hueso «pico» del rig, vía mouth) mientras grita
      ctx.onda(origen, dir, h.alcance, vel); ctx.sonar('dash'); ctx.sonar('ring', 3);
      if (h.desvia) ctx.desviar(origen, dir, h.alcance, h.cono); // V18.2 Eco Dirigido: aparta las semillas rivales del cono
      ctx.poder({ id: h.id, de: yo.id, origen, direccion: { x: dir.x, y: 0, z: dir.z }, alcance: h.alcance });
      const alcanza = () => {
        const dx = otro.pos.x - origen.x, dz = otro.pos.z - origen.z, d = Math.hypot(dx, dz);
        if (d > h.alcance + 0.6) return false;
        return d < 1.2 || (dx * dir.x + dz * dir.z) / d >= h.cono;
      };
      const d0 = Math.hypot(otro.pos.x - origen.x, otro.pos.z - origen.z);
      ctx.despues(Math.min(h.alcance, d0) / vel, () => {
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

  // ---------- Los 4 siguientes (Kelvin 5-nov, docs/equipo/V18_MATRIZ_36.md #4, #6, #17, #29) ----------
  // Cada uno cambia cómo se juega, con ventaja y debilidad, y solo reutiliza efectos que ya existen (kb, inv, lanzar, fx).
  // Quiebro (agilis, ALAS): esquiva rápida de lado; 0,6 s sin que te den (menos el grito). Ventaja: la más ágil. Debilidad: no hace daño.
  registrar({ id: 'quiebro', nombre: 'Quiebro', especies: ['agilis'], tecnica: 'alas', coste: 25, cooldown: 4, fx: 'feathers', dura: 0.6, vel: 13,
    efecto(ctx) {
      const { yo, otro } = ctx, d = mira(yo, otro); yo.lado = -(yo.lado || 1);
      yo.kb = yo.kb || { x: 0, z: 0, t: 0 }; yo.kb.x = -d.z * yo.lado * this.vel; yo.kb.z = d.x * yo.lado * this.vel; yo.kb.t = 0.28;
      yo.inv = Math.max(yo.inv || 0, this.dura); yo.alasT = 0.4;
      ctx.fx('feathers', yo.pos.x, yo.pos.y + 0.9, yo.pos.z); ctx.sonar('dash');
      ctx.poder({ id: this.id, de: yo.id, origen: { x: yo.pos.x, y: yo.pos.y + 0.9, z: yo.pos.z }, dura: this.dura });
      return { ok: true };
    } });
  // Lluvia de semillas (barbadensis, PICO): tres semillas en abanico. Ventaja: difícil de esquivar. Debilidad: cada una empuja poco
  // y, tras la primera que acierta, la rival queda un momento sin recibir más (inv del golpe): da 1 pluma, casi seguro.
  registrar({ id: 'lluvia_semillas', nombre: 'Lluvia de semillas', especies: ['barbadensis'], tecnica: 'pico', coste: 40, cooldown: 6, fx: 'leaves', alcance: 16, abre: 0.32,
    efecto(ctx) {
      const { yo, otro } = ctx, d = mira(yo, otro), a0 = Math.atan2(d.z, d.x);
      for (const k of [-1, 0, 1]) {
        const a = a0 + k * this.abre, ax = Math.cos(a), az = Math.sin(a);
        ctx.lanzar({ de: yo, x: yo.pos.x + ax * 0.8, y: yo.pos.y + 0.9, z: yo.pos.z + az * 0.8, vx: ax * 15, vy: (otro.pos.y - yo.pos.y) / Math.max(0.3, dist(yo, otro) / 15), vz: az * 15,
          vida: this.alcance / 15, radio: 0.9, golpe: { plumas: 1, empuje: 2.5, mareo: 0.35 } });
      }
      ctx.fx('leaves', yo.pos.x, yo.pos.y + 1, yo.pos.z); ctx.sonar('dash');
      ctx.poder({ id: this.id, de: yo.id, origen: { x: yo.pos.x, y: yo.pos.y + 0.9, z: yo.pos.z }, direccion: { x: d.x, y: 0, z: d.z } });
      return { ok: true };
    } });
  // Ojo del cenote (xantholora, OJOS): marca a la rival 4 s: no puede esquivar ni quiebros, y tus semillas la siguen un poco.
  // Ventaja: puntería. Debilidad: no hace daño por sí solo y cuesta energía que no te queda para disparar.
  registrar({ id: 'ojo_cenote', nombre: 'Ojo del cenote', especies: ['xantholora'], tecnica: 'ojos', coste: 30, cooldown: 9, fx: 'gold', dura: 4,
    efecto(ctx) {
      const { yo, otro } = ctx;
      otro.marcada = this.dura; otro.marcaK = 1; yo.cara = 'fight'; // marcaK: fuerza con que la siguen las semillas (Ojo de sol: menos)
      ctx.fx('gold', otro.pos.x, otro.pos.y + 1.4, otro.pos.z); ctx.sonar('ring', 2);
      ctx.poder({ id: this.id, de: yo.id, a: otro.id, dura: this.dura });
      return { ok: true };
    } });
  // Ala fuerte (farinosa, ALAS): golpe cargado de cerca que ROMPE el escudo de plumas (el golpe básico se para contra él),
  // empuja lejos y marea más. Ventaja: el único que atraviesa un escudo. Debilidad: muy corto (2,6 m) y espera larga.
  registrar({ id: 'ala_fuerte', nombre: 'Ala fuerte', especies: ['farinosa'], tecnica: 'alas', coste: 35, cooldown: 7, fx: 'feathers', alcance: 2.6,
    efecto(ctx) {
      const { yo, otro } = ctx; yo.alasT = 0.5;
      ctx.fx('feathers', yo.pos.x, yo.pos.y + 0.9, yo.pos.z); ctx.sonar('aleteo');
      ctx.poder({ id: this.id, de: yo.id, origen: { x: yo.pos.x, y: yo.pos.y + 0.9, z: yo.pos.z } });
      if (dist(yo, otro) > this.alcance) return { ok: true, acierto: false };
      return { ok: true, acierto: ctx.golpear(otro, { plumas: 1, empuje: 15, mareo: 1.2, rompeEscudo: true, dir: dirA(yo, otro) }) };
    } });

  // ---------- Dos más (Kelvin 5-nov, V18_MATRIZ_36.md #9 y #24): llegan al deshacer la Serpiente y al despertar al Sapo ----------
  // Abanico de colores (guildingii, PLUMAS): abre la cola y deslumbra a la rival 1 s (no puede atacar) y su siguiente tiro
  // (semillas, en los 5 s siguientes) sale torcido y falla. Ventaja: corta combos. Debilidad: no empuja ni quita plumas; alcance 8 m.
  registrar({ id: 'abanico_colores', nombre: 'Abanico de colores', especies: ['guildingii'], tecnica: 'plumas', coste: 30, cooldown: 9, fx: 'stars',
    alcance: 8, deslumbra: 1, fallaDura: 5,
    efecto(ctx) {
      const { yo, otro } = ctx; yo.alasT = 0.6; yo.cara = 'fight';
      ctx.fx('stars', yo.pos.x, yo.pos.y + 1.1, yo.pos.z); ctx.sonar('unlock');
      ctx.poder({ id: this.id, de: yo.id, origen: { x: yo.pos.x, y: yo.pos.y + 0.9, z: yo.pos.z }, alcance: this.alcance });
      if (dist(yo, otro) > this.alcance) return { ok: true, acierto: false };
      otro.deslumbrada = Math.max(otro.deslumbrada || 0, this.deslumbra); otro.falla = this.fallaDura;
      ctx.fx('stars', otro.pos.x, otro.pos.y + 1.5, otro.pos.z);
      return { ok: true, acierto: true };
    } });
  // Semilla de río (diadema, PICO): semilla lenta (9 m/s) que sale en arco y bota en el suelo dos veces antes de acabarse.
  // Ventaja: difícil de esquivar (llega por abajo y a destiempo). Debilidad: lenta. Quien mueve las semillas aplica `arco`
  // (combate.js); donde no se aplica, vuela como una semilla lenta normal.
  registrar({ id: 'semilla_rio', nombre: 'Semilla de río', especies: ['diadema'], tecnica: 'pico', coste: 30, cooldown: 8, fx: 'leaves', vel: 9, vida: 2.6,
    efecto(ctx) {
      const { yo, otro } = ctx, d = dirA(yo, otro);
      if (yo.mira && !yo.ia) { const f = yo.mira(); if (f && f.x * d.x + f.z * d.z < 0.35) { const n = Math.hypot(f.x, f.z) || 1; d.x = f.x / n; d.z = f.z / n; } } // puntería amable, como la semilla
      ctx.lanzar({ de: yo, x: yo.pos.x + d.x * 0.8, y: yo.pos.y + 0.9, z: yo.pos.z + d.z * 0.8, vx: d.x * this.vel, vy: 0, vz: d.z * this.vel,
        vida: this.vida, radio: 1.1, arco: { vy: 3, g: 12, rebote: 0.75 }, botes: 2, golpe: { plumas: 1, empuje: 4, mareo: 0.5 } });
      ctx.fx('leaves', yo.pos.x, yo.pos.y + 1, yo.pos.z); ctx.sonar('dash');
      ctx.poder({ id: this.id, de: yo.id, origen: { x: yo.pos.x, y: yo.pos.y + 0.9, z: yo.pos.z }, direccion: { x: d.x, y: 0, z: d.z } });
      return { ok: true };
    } });

  // ---------- Dos más (Kelvin 5-nov, V18_MATRIZ_36.md #10 y #5): llegan con el oro del minigolf y al ganar 3 duelos ----------
  // Mirada del Pitón (versicolor, OJOS): 3 s en que las semillas y el grito de la rival van a la mitad de velocidad (también las
  // que ya vuelan). Ventaja: defensa contra tiros, da tiempo a esquivar. Debilidad: nada contra golpes de ala ni hace daño.
  // Quien mueve las semillas aplica `lenta` (combate.js); el grito lo frena aquí.
  registrar({ id: 'mirada_piton', nombre: 'Mirada del Pitón', especies: ['versicolor'], tecnica: 'ojos', coste: 30, cooldown: 10, fx: 'ring', dura: 3, lento: 0.5,
    efecto(ctx) {
      const { yo, otro } = ctx;
      otro.lenta = this.dura; yo.cara = 'fight';
      ctx.fx('ring', otro.pos.x, otro.pos.y + 1.0, otro.pos.z); ctx.fx('bubbles', otro.pos.x, otro.pos.y + 1.4, otro.pos.z); ctx.sonar('ring', 1);
      ctx.poder({ id: this.id, de: yo.id, a: otro.id, dura: this.dura });
      return { ok: true };
    } });
  // Ojo de sol (collaria, OJOS): como el Ojo del cenote pero más largo y más suave: marca 5 s y tus semillas la siguen la mitad
  // de fuerte (corrigen menos). Ventaja: dura más. Debilidad: si se aparta mucho, falla igual; no hace daño por sí solo.
  registrar({ id: 'ojo_sol', nombre: 'Ojo de sol', especies: ['collaria'], tecnica: 'ojos', coste: 30, cooldown: 9, fx: 'gold', dura: 5, fuerza: 0.5,
    efecto(ctx) {
      const { yo, otro } = ctx;
      otro.marcada = this.dura; otro.marcaK = this.fuerza; yo.cara = 'fight';
      ctx.fx('gold', otro.pos.x, otro.pos.y + 1.4, otro.pos.z); ctx.fx('stars', otro.pos.x, otro.pos.y + 1.8, otro.pos.z); ctx.sonar('ring', 2);
      ctx.poder({ id: this.id, de: yo.id, a: otro.id, dura: this.dura });
      return { ok: true };
    } });

  // ---------- Cuatro de coste M (V18_MATRIZ_36.md #3, #18, #31, #25): defensas de PLUMAS y un OJOS que avisa ----------
  // El efecto solo pone el estado (segundos que quedan); quien mueve las semillas y reparte los golpes lo aplica y lo
  // descuenta (combate.js: devolver(), golpear() y pasoNuevos()). Donde no se aplica (amenaza, duelo de 2), no pasa nada.
  // Capa de palma (leucocephala, PLUMAS): escudo frontal breve (1,5 s) que para UNA semilla que llega por delante (hacia
  // donde miras) y la devuelve a quien la tiró. Ventaja: castiga al que dispara. Debilidad: no para golpes de ala ni por detrás.
  registrar({ id: 'capa_palma', nombre: 'Capa de palma', especies: ['leucocephala'], tecnica: 'plumas', coste: 25, cooldown: 10, fx: 'leaves', dura: 1.5, cono: 0.3,
    efecto(ctx) {
      const { yo } = ctx; yo.capa = this.dura; yo.alasT = this.dura;
      ctx.fx('leaves', yo.pos.x, yo.pos.y + 1, yo.pos.z); ctx.sonar('unlock');
      ctx.poder({ id: this.id, de: yo.id, origen: { x: yo.pos.x, y: yo.pos.y + 0.9, z: yo.pos.z }, dura: this.dura });
      return { ok: true };
    } });
  // Pluma rebote (albifrons, PLUMAS): durante 5 s, la siguiente semilla que te dé (venga de donde venga) rebota hacia la
  // rival en vez de quitarte una pluma. Solo un rebote: una semilla devuelta no se vuelve a devolver. Ventaja: dura y no hay
  // que apuntar. Debilidad: espera larga y no hace nada contra golpes de ala.
  registrar({ id: 'pluma_rebote', nombre: 'Pluma rebote', especies: ['albifrons'], tecnica: 'plumas', coste: 25, cooldown: 10, fx: 'feathers', dura: 5,
    efecto(ctx) {
      const { yo } = ctx; yo.rebote = this.dura; yo.alasT = 0.5;
      ctx.fx('feathers', yo.pos.x, yo.pos.y + 1.1, yo.pos.z); ctx.sonar('unlock');
      ctx.poder({ id: this.id, de: yo.id, origen: { x: yo.pos.x, y: yo.pos.y + 0.9, z: yo.pos.z }, dura: this.dura });
      return { ok: true };
    } });
  // Hojas que envuelven (rhodocorytha, PLUMAS): 3 s envuelta en hojas; el siguiente golpe que te quitaría una pluma solo te
  // marea. Ventaja: aguantar. Debilidad: no ataca ni devuelve nada, y el mareo te deja un momento sin atacar.
  registrar({ id: 'hojas_envuelven', nombre: 'Hojas que envuelven', especies: ['rhodocorytha'], tecnica: 'plumas', coste: 25, cooldown: 10, fx: 'leaves', dura: 3, mareo: 0.8,
    efecto(ctx) {
      const { yo } = ctx; yo.hojas = this.dura;
      ctx.fx('leaves', yo.pos.x, yo.pos.y + 1, yo.pos.z); ctx.fx('leaves', yo.pos.x, yo.pos.y + 0.4, yo.pos.z); ctx.sonar('unlock');
      ctx.poder({ id: this.id, de: yo.id, origen: { x: yo.pos.x, y: yo.pos.y + 0.9, z: yo.pos.z }, dura: this.dura });
      return { ok: true };
    } });
  // Ojo de selva (kawalli, OJOS): 4 s en que la rival brilla en dorado y su siguiente ataque se anuncia («¡Cuidado, va a
  // atacar!») y sale 0,6 s más tarde: da tiempo a apartarse. Ventaja: seguirla y leerla. Debilidad: no hace daño.
  registrar({ id: 'ojo_selva', nombre: 'Ojo de selva', especies: ['kawalli'], tecnica: 'ojos', coste: 30, cooldown: 9, fx: 'gold', dura: 4, aviso: 0.6,
    efecto(ctx) {
      const { yo, otro } = ctx;
      otro.vista = this.dura; otro.avisada = false; yo.cara = 'fight';
      ctx.fx('gold', otro.pos.x, otro.pos.y + 1.4, otro.pos.z); ctx.fx('ring', otro.pos.x, otro.pos.y, otro.pos.z); ctx.sonar('ring', 2);
      ctx.poder({ id: this.id, de: yo.id, a: otro.id, dura: this.dura });
      return { ok: true };
    } });

  // ---------- Luchadores ----------
  function luchador(o) {
    const sp = o.especie || 'vittata';
    return Object.assign({ id: 'jugador', nombre: '', especie: sp, familia: familia(sp), poder: poderDe(sp), pos: { x: 0, y: 0, z: 0 },
      plumas: 5, plumasMax: 5, energia: ENERGIA_MAX, energiaMax: ENERGIA_MAX, cd: {}, mareo: 0, inv: 0, escudo: 0, picoT: 0, alasT: 0, ia: false },
    o, { familia: familia(sp), poder: o.poder || poderDe(sp) });
  }
  const ver = (f, h) => (h && f && f.nivel && G.v18evo && G.v18evo.ajustar) ? G.v18evo.ajustar(f, h) : h; // V18.2: números de la etapa
  function listo(f, id) {
    const h = ver(f, get(id)); if (!h) return { ok: false, motivo: 'no existe' };
    if (f.mareo > 0) return { ok: false, motivo: 'mareo' };
    if (f.deslumbrada > 0) return { ok: false, motivo: 'deslumbrada' }; // Abanico de colores
    if ((f.cd[id] || 0) > 0) return { ok: false, motivo: 'espera' };
    if (f.energia < h.coste) return { ok: false, motivo: 'energia' };
    if (!h.basico && f.poder !== id && f.alianza !== id) return { ok: false, motivo: 'no es suyo' };
    if (h.puede && !h.puede(f)) return { ok: false, motivo: 'ahora no' }; // p. ej. Eco Protector con un escudo ya puesto
    return { ok: true, h };
  }
  const nada = () => {};
  function usar(f, id, ctx) {
    const l = listo(f, id); if (!l.ok) return l;
    f.energia -= l.h.coste; f.cd[id] = l.h.cooldown;
    const c = Object.assign({ yo: f, onda: nada, escudo: nada, poder: nada, despues: (s, fn) => fn(), fx: nada, sonar: nada, lanzar: nada, desviar: nada, apoyo: nada }, ctx);
    // Abanico de colores: el siguiente tiro de la deslumbrada sale torcido (todas las semillas de ese uso) y no da
    let torcido = 0;
    if (f.falla > 0) { const l0 = c.lanzar, lado = Math.random() < 0.5 ? -1 : 1; c.lanzar = b => { const a = lado * 0.6, ca = Math.cos(a), sa = Math.sin(a), vx = b.vx;
      b.vx = vx * ca - b.vz * sa; b.vz = vx * sa + b.vz * ca; b.vy = (b.vy || 0) + 2.5; b.falla = true; torcido++; return l0(b); }; }
    const r = l.h.efecto(c) || { ok: true };
    if (torcido) f.falla = 0;
    return Object.assign({ ok: true, id }, r);
  }
  // Recibir un golpe: la regla común de todos los duelos (contra la IA en combate.js, de 2 jugadores en duelo2.js).
  // El Escudo de plumas para un golpe normal del todo y reduce el grito sin anularlo; en los dos casos se gasta.
  // Sin escudo, la invulnerabilidad breve tras perder una pluma ignora lo que no venga con «forzar».
  // Cambia plumas, mareo, inv y kb de `blanco`; los efectos, avisos y eventos los pone quien llama.
  // Devuelve { r: 'bloqueado' | 'inmune' | 'ok', n (plumas quitadas), empuje, mareo, parcial, dir, escudo (había escudo) }.
  const ESCUDO_DEF = { reduceEmpuje: 0.4, reduceMareo: 0.35 };
  function recibir(de, blanco, g) {
    let n = g.plumas || 0, empuje = g.empuje || 0, mareo = g.mareo || 0, parcial = false;
    if (blanco.escudo > 0 && g.rompeEscudo) { blanco.escudo = 0; blanco.alasT = 0; blanco.escudoRoto = true; } // Ala fuerte: rompe el escudo (también en el duelo de 2)
    const escudo = blanco.escudo > 0;
    if (escudo) {
      blanco.escudo = 0; blanco.alasT = 0;
      if (!g.interrumpe) return { r: 'bloqueado', n: 0, empuje: 0, mareo: 0, parcial: false, escudo };
      const E = get('escudo_plumas') || ESCUDO_DEF;
      n = 0; empuje *= E.reduceEmpuje; mareo *= E.reduceMareo; parcial = true;
    }
    if (blanco.inv > 0 && !g.forzar) return { r: 'inmune', n: 0, empuje: 0, mareo: 0, parcial, escudo };
    const dir = g.dir || dirA(de, blanco);
    blanco.plumas = Math.max(0, blanco.plumas - n);
    blanco.mareo = Math.max(blanco.mareo, mareo);
    if (n > 0) blanco.inv = mareo + 0.25;
    if (blanco.kb) { blanco.kb.x = dir.x * empuje; blanco.kb.z = dir.z * empuje; blanco.kb.t = 0.3; }
    return { r: 'ok', n, empuje, mareo, parcial, dir, escudo };
  }
  function paso(f, dt) {
    f.energia = Math.min(f.energiaMax, f.energia + RECARGA * dt);
    for (const k in f.cd) f.cd[k] = Math.max(0, f.cd[k] - dt);
    f.mareo = Math.max(0, f.mareo - dt); f.inv = Math.max(0, f.inv - dt); f.escudo = Math.max(0, f.escudo - dt);
    f.picoT = Math.max(0, (f.picoT || 0) - dt); f.marcada = Math.max(0, (f.marcada || 0) - dt); f.alasT = Math.max(0, (f.alasT || 0) - dt);
    f.deslumbrada = Math.max(0, (f.deslumbrada || 0) - dt); f.falla = Math.max(0, (f.falla || 0) - dt); f.lenta = Math.max(0, (f.lenta || 0) - dt);
    if (!f.picoT && f.cara === 'fight') f.cara = null;
  }
  G.v18hab = { ENERGIA_MAX, RECARGA, BASICOS: ['golpe_ala', 'semilla'], registrar, get, lista: () => Array.from(REG.values()), poderDe, familia, luchador, listo, usar, recibir, paso, dist, dirA, mira, ver };
  return G.v18hab;
};
