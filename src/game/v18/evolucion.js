/* Juego · V18.2 «Evolución, niveles y alianzas» · prototipo (directiva docs/DIRECTIVA_V18_2_EVOLUCION.md §14; diseño
   docs/equipo/V18_2_DISENO.md). Las cotorras NO cambian de especie ni de modelo: suben de nivel y su poder cambia de verdad.
   - Datos en el progreso V18 (progreso.js v2, `d.evo`): { esp: { <sp>: { xp, nivel, mejoras, variante } }, alianzas, alianzaSel,
     marcas (hitos ya pagados), dia (topes diarios), retro }. El nivel SIEMPRE se recalcula a partir de la XP (máx. 40).
   - Curva: XP total para el nivel n = 20(n−1) + 3(n−1)(n−2) → nv 10 = 396, nv 20 = 1.406, nv 40 = 5.226.
   - Fuentes (eventos que ya existen): duelo contra la Campeona ganado 60 (mitad desde la 5.ª victoria del día), perdido 25
     (solo si le quitaste ≥ 1 pluma y duró ≥ 20 s); duelo de 2 = 0. Hitos de una vez (puente, Sombra, Serpiente, Sapo, especies,
     materiales, primera victoria con cada especie, reto de dos cotorras, desafío de la alianza). Minigolf: 30 (+30 récord), 3/día.
     Topes diarios: 360 XP en duelos, 700 XP en todo lo repetible. Los hitos ya cumplidos en partidas viejas pagan una vez.
   - Vittata, tres etapas del Grito del Yunque (ajustar(f, h) → Object.create(h) con los números; habilidades.js no copia código):
       1–9 Grito del Yunque 7 m ±35° · 10–19 Eco Amplificado 9 m ±42° · 20+ Eco Dirigido 11 m ±26°, onda a 22 m/s, desvía semillas.
     Topes fijos: el grito nunca quita plumas, espera ≥ 5 s, coste ≥ 35, alcance ≤ 11 m, interrupción ≤ 1,4 s. Plumas, energía y
     ataques básicos no cambian con el nivel. La Campeona no sube.
   - Arausiaca: Escudo de plumas igual; nv 10 dura 3 s; nv 20 recupera 15 de energía al bloquear (solo si es la del jugador).
   - Alianza Eco Protector (Vittata + Arausiaca): Vittata nv ≥ 10 + Arausiaca elegible → «disponible»; ganar a la Campeona con
     Vittata interrumpiéndola ≥ 2 veces → «desbloqueada» (tarjeta). Coste 60, recarga 14 s, deja el grito en espera 5 s; lanza la
     onda de la etapa actual y pone un escudo de 2 s que para un golpe (Ala fuerte lo rompe). H / botón .vd-ali en el duelo.
   Solo con la bandera V18. Modo de prueba: AV.G.v18evo.prueba({ especie: 'vittata', nivel: 20, alianza: true }) / prueba(null).
   Prueba: AV.v18EvolucionTest(). */
window.AVV18Evolucion = function (G) {
  'use strict';
  if (G.v18evo) return G.v18evo;
  const V = G.v18 || window.AVV18Progreso(G);
  const H = G.v18hab || window.AVV18Habilidades(G);
  const NIVEL_MAX = 40, ALI = 'eco_protector', ESTADOS_ALI = ['bloqueada', 'disponible', 'desbloqueada'], VARIANTES = ['amplificado', 'dirigido'];
  const T = n => 20 * (n - 1) + 3 * (n - 1) * (n - 2); // XP total para llegar al nivel n
  const XP_MAX = T(NIVEL_MAX);
  function nivelDe(xp) { let n = 1; while (n < NIVEL_MAX && xp >= T(n + 1)) n++; return n; }
  const XP = { gana: 60, pierde: 25, ganaEspecie: 50, especie: 40, material: 10, puente: 120, sombra: 150, serpiente: 100, sapo: 100, retoDos: 100, golfNido: 30, golfRecord: 30, desafio: 80 };
  const TOPE = { duelosDia: 360, repetibleDia: 700, golfDia: 3, mitadDesde: 5, pierdeQuitadas: 1, pierdeDura: 20 };
  // Etapas de Vittata (Grito del Yunque). La 1 son exactamente los números de habilidades.js (no se toca nada).
  const ETAPAS = [
    { desde: 1, id: 'grito_yunque', nombre: 'Grito del Yunque', alcance: 7, cono: 0.82, vel: 16, empuje: 15, interrumpe: 1.1, coste: 35, cooldown: 5,
      frase: 'Onda sonora que empuja e interrumpe. Acércate y apunta.' },
    { desde: 10, id: 'eco_amplificado', nombre: 'Eco Amplificado', alcance: 9, cono: 0.74, vel: 16, empuje: 17, interrumpe: 1.2, coste: 35, cooldown: 5.5,
      frase: 'Tu grito llega más lejos (9 m) y abre más. Espera un poco más entre gritos.' },
    { desde: 20, id: 'eco_dirigido', nombre: 'Eco Dirigido', alcance: 11, cono: 0.9, vel: 22, empuje: 18, interrumpe: 1.4, coste: 40, cooldown: 6, desvia: true,
      frase: 'Grito estrecho y rápido hasta 11 m: apunta bien y deshaz las semillas de la rival.' }
  ];
  const TOPES_GRITO = { cooldownMin: 5, costeMin: 35, alcanceMax: 11, interrumpeMax: 1.4 };
  const TXT = {
    subeV: '¡Vittata subió al nivel {}!', sube: '¡Tu cotorra subió al nivel {}!', nv: 'Nv {}', nivel: 'Nivel {}', xp: '+{} XP', subiste: '¡Subiste al nivel {}!',
    etapa: '¡Nueva etapa!', variante: 'Ya puedes elegir la variante del grito en Pausa → Mis cotorras.',
    aliNueva: '¡Nueva alianza!', aliNombre: 'Eco Protector',
    aliFrase: 'Vittata grita y la cotorra de Dominica la cubre con un escudo de plumas. En el duelo: tecla H o el botón Eco Protector.',
    aliDisp: 'La Campeona quiere entrenarte con una alianza: gánale con Vittata interrumpiéndola 2 veces con tu grito.',
    aliReq: 'Alianza Eco Protector: Vittata en nivel 10 y la cotorra de Dominica en tu bandada.',
    aliReto: 'Alianza Eco Protector: gana a la Campeona con Vittata interrumpiéndola 2 veces.',
    aliTit: 'Alianza', aliOn: 'Activada', aliOff: 'Desactivada', varTit: 'Variante del grito',
    retro: 'Tu aventura cuenta: +{} XP para tu cotorra.', prueba: 'Modo de prueba de la evolución'
  };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 3200); } catch (e) { /* sin interfaz */ } };
  const sonar = (n, a) => { try { if (G.audio && G.audio.play) G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const con = (t, n) => t.replace('{}', n);
  const rango = e => Math.max(0, V.ESTADOS.indexOf(e || 'no_descubierta'));
  const elegible = sp => rango(V.estado(sp)) >= rango('seleccionable');
  const perfil = () => (G.S && G.S.profile && ((G.S.profile.look && G.S.profile.look.species) || G.S.profile.species)) || 'vittata';
  let hoyFijo = null; // solo las pruebas
  const hoy = () => { if (hoyFijo) return hoyFijo; const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  // ---------- Datos: saneado (nunca se confía en el guardado) ----------
  function sanear(e) {
    if (!e.esp || typeof e.esp !== 'object' || Array.isArray(e.esp)) e.esp = {};
    for (const sp of Object.keys(e.esp)) {
      const r = e.esp[sp]; if (!r || typeof r !== 'object') { delete e.esp[sp]; continue; }
      r.xp = Number.isFinite(r.xp) && r.xp > 0 ? Math.min(XP_MAX, Math.floor(r.xp)) : 0;
      r.nivel = nivelDe(r.xp);
      if (VARIANTES.indexOf(r.variante) < 0) r.variante = null;
      if (!r.mejoras || typeof r.mejoras !== 'object') r.mejoras = {};
      if (sp === 'vittata') for (const et of ETAPAS) if (et.desde > 1 && r.nivel >= et.desde) r.mejoras[et.id] = true;
    }
    if (!e.alianzas || typeof e.alianzas !== 'object') e.alianzas = {};
    if (ESTADOS_ALI.indexOf(e.alianzas[ALI]) < 0) e.alianzas[ALI] = 'bloqueada';
    if (e.alianzaSel !== ALI || e.alianzas[ALI] !== 'desbloqueada') e.alianzaSel = null;
    if (!e.marcas || typeof e.marcas !== 'object') e.marcas = {};
    if (!e.dia || typeof e.dia !== 'object' || typeof e.dia.fecha !== 'string' || !e.dia.por || typeof e.dia.por !== 'object') e.dia = { fecha: '', por: {} };
    for (const k of Object.keys(e.dia.por)) if (!Number.isFinite(e.dia.por[k]) || e.dia.por[k] < 0) e.dia.por[k] = 0;
    e.retro = !!e.retro;
    return e;
  }
  const E = () => sanear(V.evo());
  const reg = (e, sp) => e.esp[sp] || (e.esp[sp] = { xp: 0, nivel: 1, mejoras: {}, variante: null });
  const info = sp => { const r = E().esp[sp]; return r ? { xp: r.xp, nivel: r.nivel, variante: r.variante } : { xp: 0, nivel: 1, variante: null }; };
  function dia(e) { const f = hoy(); if (e.dia.fecha !== f) e.dia = { fecha: f, por: {} }; return e.dia; }
  function etapaDe(nivel, variante) {
    let et = ETAPAS[0]; for (const x of ETAPAS) if (nivel >= x.desde) et = x;
    if (et.desde >= 20 && variante === 'amplificado') et = ETAPAS[1];
    return et;
  }

  // ---------- XP ----------
  let ultimo = null; // la última XP de un duelo (para el panel de fin)
  let mudo = false;  // las pruebas apagan los oyentes mientras simulan duelos
  // o: { repetible, duelo, cuenta, max, mitadDesde, silencio }
  function dar(sp, n, fuente, o) {
    o = o || {}; if (!sp || !(n > 0)) return 0;
    let dado = 0, antes = 1, despues = 1;
    V.cambiarEvo(e0 => {
      const e = sanear(e0), d = dia(e);
      if (o.cuenta) {
        const c = d.por[o.cuenta] || 0;
        if (o.max != null && c >= o.max) n = 0;
        else { if (o.mitadDesde && c >= o.mitadDesde - 1) n = Math.floor(n / 2); d.por[o.cuenta] = c + 1; }
      }
      if (o.repetible) { n = Math.min(n, Math.max(0, TOPE.repetibleDia - (d.por.total || 0))); if (o.duelo) n = Math.min(n, Math.max(0, TOPE.duelosDia - (d.por.duelo || 0))); }
      if (n <= 0) return;
      const r = reg(e, sp); antes = r.nivel;
      dado = Math.min(n, XP_MAX - r.xp); r.xp += dado; r.nivel = nivelDe(r.xp); despues = r.nivel; sanear(e);
      if (o.repetible) { d.por.total = (d.por.total || 0) + dado; if (o.duelo) d.por.duelo = (d.por.duelo || 0) + dado; }
    });
    if (despues > antes) subio(sp, antes, despues, o.silencio);
    if (dado) revisarAlianza();
    return dado;
  }
  function subio(sp, a, b, silencio) {
    try { G.emit('v18', { tipo: 'evo', especie: sp, nivel: b, antes: a, sube: true }); } catch (e) { /* sin oyentes */ }
    if (silencio) return;
    toast(con(sp === 'vittata' ? TXT.subeV : TXT.sube, b), 3200);
    sonar('unlock');
    try { if (G.fx && G.fx.burst && G.S) { G.fx.burst(G.S.pos.x, G.S.pos.y + 1.4, G.S.pos.z, 'gold', 14); G.fx.burst(G.S.pos.x, G.S.pos.y + 0.8, G.S.pos.z, 'stars', 8); } } catch (e) { /* sin efectos */ }
    if (sp === 'vittata') for (const et of ETAPAS) if (et.desde > 1 && a < et.desde && b >= et.desde) carta(TXT.etapa, et.nombre, et.frase, false, et.desde === 20 ? TXT.variante : '');
  }
  // Hitos de una sola vez: se deducen del progreso V18 (así las partidas viejas cobran lo que ya hicieron, una vez)
  function hitos() {
    const d = V.copia(), out = [], m = d.mundo || {}, ot = d.otorgados || {}, pf = perfil();
    if (m.puente_villa === 'reparado') out.push(['puente', XP.puente]);
    if (m.sombra_tormenta === 'dispersa') out.push(['sombra', XP.sombra]);
    if (m.serpiente_marana === 'deshecha') out.push(['serpiente', XP.serpiente]);
    if (m.sapo_encantado === 'despierto') out.push(['sapo', XP.sapo]);
    if (ot.reto_dos_cotorras) out.push(['reto_dos', XP.retoDos]);
    for (const k of Object.keys(m)) if (m[k] === 'recogida') out.push(['mat:' + k, XP.material]);
    for (const k of Object.keys(ot)) if (/^duelo_gana_/.test(k)) out.push(['gana:' + k.slice(11), XP.ganaEspecie]);
    for (const sp of Object.keys(d.especies || {})) if (sp !== 'vittata' && sp !== pf && rango(d.especies[sp]) >= rango('seleccionable')) out.push(['esp:' + sp, XP.especie]);
    return out;
  }
  function revisarHitos(silencio) {
    const marcas = E().marcas, nuevos = hitos().filter(h => !marcas[h[0]]);
    const primera = !E().retro;
    if (!nuevos.length) { if (primera) V.cambiarEvo(e => { e.retro = true; }); return 0; }
    const total = nuevos.reduce((a, h) => a + h[1], 0);
    V.cambiarEvo(e => { sanear(e); for (const h of nuevos) e.marcas[h[0]] = true; e.retro = true; });
    const sp = V.seleccionada() || perfil();
    const n = dar(sp, total, 'hito', { silencio: silencio || primera });
    if (primera && n && !silencio) toast(con(TXT.retro, n), 4200);
    return n;
  }

  // ---------- Alianza Eco Protector ----------
  const estadoAli = () => E().alianzas[ALI];
  let avisoTO = 0;
  function revisarAlianza() {
    if (estadoAli() !== 'bloqueada' || info('vittata').nivel < 10 || !elegible('arausiaca')) return false;
    V.cambiarEvo(e => { sanear(e).alianzas[ALI] = 'disponible'; });
    clearTimeout(avisoTO); avisoTO = setTimeout(() => { if (estadoAli() === 'disponible') toast(TXT.aliDisp, 5200); }, 3800); // después de los avisos del duelo
    return true;
  }
  function desbloquearAlianza(silencio) {
    if (estadoAli() !== 'disponible') return false;
    V.cambiarEvo(e => { sanear(e); e.alianzas[ALI] = 'desbloqueada'; e.alianzaSel = ALI; e.marcas.desafio_eco = true; });
    dar('vittata', XP.desafio, 'desafio', { silencio });
    if (!silencio) { sonar('unlock'); carta(TXT.aliNueva, TXT.aliNombre, TXT.aliFrase, true); }
    return true;
  }
  function elegirAlianza(on) {
    if (estadoAli() !== 'desbloqueada') return false;
    V.cambiarEvo(e => { sanear(e).alianzaSel = on ? ALI : null; }); return true;
  }
  function elegirVariante(v) {
    if (VARIANTES.indexOf(v) < 0 || info('vittata').nivel < 20) return false;
    V.cambiarEvo(e => { reg(sanear(e), 'vittata').variante = v; }); return true;
  }

  // ---------- Lo que lee el duelo (combate.js) y el motor (habilidades.js) ----------
  function paraDuelo(sp) {
    const r = info(sp), e = E(), o = { nivel: r.nivel, variante: r.variante, xp: r.xp };
    if (sp === 'vittata' && e.alianzas[ALI] === 'desbloqueada' && e.alianzaSel === ALI) o.alianza = ALI;
    if (sp === 'arausiaca' && r.nivel >= 20) o.bonusBloqueo = 15;
    return o;
  }
  function ajustar(f, h) {
    if (!f || !f.nivel || !h) return h;
    if (h.id === 'grito_yunque' && f.especie === 'vittata') {
      const et = etapaDe(f.nivel, f.variante); if (et.desde === 1) return h;
      const a = Object.create(h);
      a.alcance = Math.min(TOPES_GRITO.alcanceMax, et.alcance); a.cono = et.cono; a.vel = et.vel; a.empuje = et.empuje;
      a.interrumpe = Math.min(TOPES_GRITO.interrumpeMax, et.interrumpe); a.coste = Math.max(TOPES_GRITO.costeMin, et.coste);
      a.cooldown = Math.max(TOPES_GRITO.cooldownMin, et.cooldown); a.desvia = !!et.desvia; a.etapa = et.id; a.nombreEtapa = et.nombre;
      return a;
    }
    if (h.id === 'escudo_plumas' && f.especie === 'arausiaca' && f.nivel >= 10) { const a = Object.create(h); a.dura = 3; a.etapa = 'escudo_firme'; return a; }
    return h;
  }
  function lineaHud(f) {
    const r = info(f.especie), n = f.nivel || r.nivel, et = f.especie === 'vittata' ? etapaDe(n, f.variante).nombre : ((H.get(f.poder) || {}).nombre || '');
    const a = T(r.nivel), b = r.nivel >= NIVEL_MAX ? a + 1 : T(r.nivel + 1);
    return { nivel: con(TXT.nv, n), etapa: et, frac: r.nivel >= NIVEL_MAX ? 1 : Math.max(0, Math.min(1, (r.xp - a) / (b - a))) };
  }
  function htmlFin() {
    if (!ultimo || !ultimo.xp) return '';
    return `<span>${esc(con(TXT.xp, ultimo.xp))}</span>` + (ultimo.sube ? ` · <span>${esc(con(TXT.subiste, ultimo.sube))}</span>` : '');
  }

  // ---------- Eco Protector en el motor de habilidades (API pública registrar) ----------
  H.registrar({ id: ALI, nombre: 'Eco Protector', alianza: true, tecnica: 'pico+plumas', coste: 60, cooldown: 14, dura: 2, bloqueaGrito: 5, apoyo: 'arausiaca', fx: 'onda',
    puede: f => !(f.escudo > 0), // no se encadena con un escudo ya puesto
    efecto(ctx) {
      const yo = ctx.yo, g = ajustar(yo, H.get('grito_yunque'));
      const r = g.efecto.call(g, ctx) || {}; // la onda de la etapa actual de Vittata (mismo efecto que el grito)
      yo.escudo = this.dura; yo.alasT = Math.min(this.dura, 0.9);
      ctx.escudo(yo, this.dura);
      yo.cd.grito_yunque = Math.max(yo.cd.grito_yunque || 0, this.bloqueaGrito);
      ctx.fx('feathers', yo.pos.x, yo.pos.y + 1, yo.pos.z); ctx.sonar('unlock');
      ctx.apoyo(this.apoyo);
      ctx.poder({ id: this.id, de: yo.id, apoyo: this.apoyo, dura: this.dura, alcance: g.alcance, origen: { x: yo.pos.x, y: yo.pos.y + 0.9, z: yo.pos.z } });
      return { ok: true, acierto: null, dir: r.dir };
    } });

  // ---------- Avisos: tarjeta dorada que no bloquea el juego ----------
  let cartaEl = null, cartaTO = 0;
  function carta(tit, nombre, frase, alianza, extra) {
    if (!document.getElementById('v18-evo-css')) {
      const st = document.createElement('style'); st.id = 'v18-evo-css';
      // arriba (sobre el aviso y el panel del duelo, que al terminar ya dice lo mismo): abajo tapaba los botones grandes en el móvil
      st.textContent = '#v18-evo-carta{position:fixed;left:0;right:0;margin-inline:auto;top:calc(env(safe-area-inset-top,0px) + 8px);width:min(360px,calc(100vw - 32px));z-index:45;pointer-events:none;' +
        'background:linear-gradient(160deg,#fff6d8,#ffd98a);color:#3b2a14;border-radius:16px;padding:12px 16px;box-shadow:0 0 0 3px #ffefb8,0 6px 24px #0007;font-family:Fredoka,system-ui,sans-serif;text-align:center;animation:v18evo .45s ease-out}' +
        '#v18-evo-carta h3{margin:0;font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:#8a5a20}#v18-evo-carta b{display:block;font-size:24px;margin:2px 0 4px}#v18-evo-carta p{margin:0;font-size:14px;line-height:1.3}' +
        '#v18-evo-carta img{width:44px;height:44px;border-radius:50%;float:left;margin-right:8px;background:#fff8}' +
        '.v18-evo-f{display:block;font-size:12px;margin-top:3px}.v18-evo-bar{display:block;height:4px;border-radius:2px;background:#0003;overflow:hidden;margin:2px 6px}.v18-evo-bar b{display:block;height:100%;background:#e0a526}' +
        '.v18-evo-et{display:inline-block;font-size:10px;padding:1px 5px;border-radius:8px;background:#ffe39a;color:#3b2a14;margin:2px 1px}.v18-evo-et.no{background:#0002;color:inherit;opacity:.6}' +
        '.v18-evo-x{margin-top:8px;font-size:14px}.v18-evo-x .btn{min-height:44px}' +
        '@keyframes v18evo{from{transform:translateY(-16px) scale(.9);opacity:0}to{transform:none;opacity:1}}';
      document.head.appendChild(st);
    }
    if (!cartaEl) { cartaEl = document.createElement('div'); cartaEl.id = 'v18-evo-carta'; cartaEl.setAttribute('role', 'status'); document.body.appendChild(cartaEl); }
    cartaEl.innerHTML = (alianza ? '<img src="assets/retratos/v18/arausiaca.png" alt="">' : '') + `<h3>${esc(tit)}</h3><b>${esc(nombre)}</b><p><span>${esc(frase)}</span>${extra ? ` <span>${esc(extra)}</span>` : ''}</p>`; // un texto por nodo: el traductor EN los encuentra
    cartaEl.hidden = false; cartaEl.style.animation = 'none'; void cartaEl.offsetWidth; cartaEl.style.animation = '';
    try { if (G.fx && G.fx.burst && G.S) G.fx.burst(G.S.pos.x, G.S.pos.y + 1.6, G.S.pos.z, 'gold', 16); } catch (e) { /* sin efectos */ }
    clearTimeout(cartaTO); cartaTO = setTimeout(quitarCarta, 5200);
    return cartaEl;
  }
  function quitarCarta() { clearTimeout(cartaTO); if (cartaEl) { cartaEl.remove(); cartaEl = null; } }

  // ---------- Mis cotorras (descubrir.js): ficha de nivel y fila de alianza ----------
  function htmlFicha(sp) {
    const r = info(sp), L = lineaHud({ especie: sp, nivel: r.nivel, variante: r.variante, poder: H.poderDe(sp) });
    let h = `<span class="v18-evo-f"><span>${esc(L.nivel)}</span> · <span>${esc(L.etapa)}</span></span><i class="v18-evo-bar"><b style="width:${Math.round(L.frac * 100)}%"></b></i>`;
    if (sp === 'vittata') h += '<span style="display:block">' + ETAPAS.slice(1).map(et => r.nivel >= et.desde ? `<span class="v18-evo-et">${esc(et.nombre)}</span>` : `<span class="v18-evo-et no"><span>${esc(et.nombre)}</span> · <span>${esc(con(TXT.nivel, et.desde))}</span></span>`).join('') + '</span>';
    return h;
  }
  function htmlExtra() {
    const e = E(), v = info('vittata'), sel = V.seleccionada(), st = e.alianzas[ALI];
    let h = '';
    if (sel === 'vittata' && v.nivel >= 20) {
      const cur = v.variante || 'dirigido';
      h += `<div class="row v18-evo-x"><span>${esc(TXT.varTit)}</span> ` + VARIANTES.map(x => `<button class="btn${cur === x ? '' : ' ghost'}" type="button" data-v18var="${x}" aria-pressed="${cur === x}">${esc(ETAPAS[x === 'amplificado' ? 1 : 2].nombre)}</button>`).join(' ') + '</div>';
    }
    if (st === 'desbloqueada' && sel === 'vittata') {
      const on = e.alianzaSel === ALI;
      h += `<div class="row v18-evo-x"><span>${esc(TXT.aliTit)}</span> <button class="btn${on ? '' : ' ghost'}" type="button" data-v18ali="1" aria-pressed="${on}"><img src="assets/retratos/v18/arausiaca.png" alt="" width="28" height="28" style="vertical-align:middle;margin-right:4px">${esc(TXT.aliNombre)}</button> <span>${esc(on ? TXT.aliOn : TXT.aliOff)}</span></div>`;
    } else if (st === 'disponible') h += `<p class="v18-evo-x">${esc(TXT.aliReto)}</p>`;
    else if (st === 'bloqueada') h += `<p class="v18-evo-x" style="opacity:.75">${esc(TXT.aliReq)}</p>`;
    return h;
  }
  function enlazar(card) {
    if (!card) return;
    const otra = () => setTimeout(() => { try { const c = G.ui.$('card'); if (G.v18descubrir && c && !c.hidden) G.v18descubrir.abrirSeleccion(); } catch (er) { /* tarjeta */ } }, 0);
    card.querySelectorAll('[data-v18var]').forEach(b => { b.onclick = () => { elegirVariante(b.getAttribute('data-v18var')); sonar('pickup', 2); otra(); }; });
    card.querySelectorAll('[data-v18ali]').forEach(b => { b.onclick = () => { elegirAlianza(E().alianzaSel !== ALI); sonar('pickup', 3); otra(); }; });
  }

  // ---------- Modo de prueba documentado (para videos y equilibrio) ----------
  function prueba(o) {
    if (o === null) {
      const res = E().respaldo; if (!res) return false;
      V.cambiarEvo(e => { const r = JSON.parse(res); e.esp = r.esp; e.alianzas = r.alianzas; e.alianzaSel = r.alianzaSel; delete e.respaldo; delete e.prueba; sanear(e); });
      return true;
    }
    o = o || {}; const sp = o.especie || 'vittata';
    V.cambiarEvo(e0 => {
      const e = sanear(e0);
      if (!e.respaldo) e.respaldo = JSON.stringify({ esp: e.esp, alianzas: e.alianzas, alianzaSel: e.alianzaSel });
      const r = reg(e, sp); r.xp = Math.max(0, Math.min(XP_MAX, o.xp != null ? o.xp : T(Math.max(1, Math.min(NIVEL_MAX, o.nivel || 1)))));
      if (o.variante) r.variante = o.variante;
      if (o.alianza) { e.alianzas[ALI] = 'desbloqueada'; e.alianzaSel = ALI; }
      e.prueba = true; sanear(e);
    });
    try { console.info('[V18.2] ' + TXT.prueba + ': ' + JSON.stringify(info(sp))); } catch (e) { /* consola */ }
    return info(sp);
  }

  // ---------- Conexiones (eventos que ya existen) ----------
  G.on('v18combate', ev => {
    if (mudo || !ev || ev.duelo) return; // duelo de 2: 0 XP
    const sp = ev.especie || (G.v18combate && G.v18combate.estado().j && G.v18combate.estado().j.especie) || V.seleccionada() || perfil();
    const cj = G.v18combate && G.v18combate.estado && G.v18combate.estado().j; // nivel con el que empezó el duelo (los hitos de la victoria también suben)
    const n0 = (cj && cj.especie === sp && cj.nivel) || info(sp).nivel;
    if (ev.tipo === 'win' && ev.de === 'jugador') {
      ultimo = { xp: 0, sube: 0 };
      ultimo.xp = dar(sp, XP.gana, 'duelo', { repetible: true, duelo: true, cuenta: 'victorias', mitadDesde: TOPE.mitadDesde });
      if (sp === 'vittata' && (ev.interrupciones || 0) >= 2) ultimo.xp += desbloquearAlianza() ? XP.desafio : 0;
    } else if (ev.tipo === 'loss' && ev.a === 'jugador') {
      ultimo = { xp: 0, sube: 0 };
      if ((ev.quitadas || 0) >= TOPE.pierdeQuitadas && (ev.dura || 0) >= TOPE.pierdeDura) ultimo.xp = dar(sp, XP.pierde, 'duelo', { repetible: true, duelo: true });
    } else return;
    if (info(sp).nivel > n0) ultimo.sube = info(sp).nivel;
  });
  G.on('v18minigolf', ev => {
    if (mudo || !ev || ev.tipo !== 'nido') return;
    dar(V.seleccionada() || perfil(), XP.golfNido + (ev.nuevo ? XP.golfRecord : 0), 'golf', { repetible: true, cuenta: 'golf', max: TOPE.golfDia });
  });
  G.on('v18', ev => {
    if (mudo || !ev || ev.tipo === 'evo') return;
    if (ev.tipo === 'mundo' || ev.tipo === 'recompensa' || ev.tipo === 'especie') { revisarHitos(); revisarAlianza(); }
  });
  G.on('apply', () => setTimeout(() => { if (!mudo) { revisarHitos(); revisarAlianza(); } }, 0), 98);
  setTimeout(() => { if (!mudo) { revisarHitos(); revisarAlianza(); } }, 0);

  // =====================================================================================================================
  // Prueba: AV.v18EvolucionTest()
  async function test(o) {
    o = o || {};
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const Cb = G.v18combate, S = G.S, P = V;
    let crudo = null; try { crudo = localStorage.getItem(P.clave()); } catch (e) { /* sin almacenamiento */ }
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing, inv0 = Object.assign({}, S.inv), sel0 = P.seleccionada();
    const toasts = [], toast0 = G.ui.toast; G.ui.toast = (t, ms) => { toasts.push(String(t)); return toast0.call(G.ui, t, ms); };
    const evs = [], podEv = []; let oye = true;
    G.on('v18', e => { if (oye && e && e.tipo === 'evo' && e.sube) evs.push(e); });
    G.on('v18poder', e => { if (oye) podEv.push(e); });
    // Estado limpio: Vittata elegida, la primera victoria ya pagada (sin materiales) y los hitos presentes ya cobrados
    const reset = () => { P.borrar(); P.desbloquear('vittata'); P.seleccionar('vittata'); P.otorgar('combate_1', 'victoria_duelo', 1); P.otorgar('duelo_gana_vittata', 'victoria_vittata', 1); P.otorgar('duelo_gana_arausiaca', 'victoria_arausiaca', 1);
      P.cambiarEvo(e => { for (const k of Object.keys(e)) delete e[k]; sanear(e); e.retro = true; for (const h of hitos()) e.marcas[h[0]] = true; }); hoyFijo = 'prueba-1'; ultimo = null; };
    const C = () => Cb.estado();
    const correr = (s, antes) => { for (let t = 0; t < s && C().fase === 'lucha'; t += 0.05) { if (antes) antes(); Cb.paso(0.05); } };
    const quieta = (dx, dz) => { const r = C().r; r.pos.x = S.pos.x + dx; r.pos.z = S.pos.z + (dz || 0); r.pensar = 99; r.esquivaT = 99; r.poderT = 99; r.golpeT = 99; r.tiroT = 99; r.mov.t = 99; r.mov.x = r.mov.z = 0; r.kb.t = 0; r.kb.x = r.kb.z = 0; }; // mov.t > 0 con velocidad 0: no se acerca
    const cara = (x, z) => { const n = Math.hypot(x, z || 0) || 1; S.facing = { x: x / n, z: (z || 0) / n }; };
    const vaciar = () => { while (C().timers.length) C().timers.shift().fn(); };
    const fresco = () => { const c = C(), j = c.j, r = c.r; j.cd = {}; j.energia = 100; j.escudo = 0; j.mareo = 0; j.inv = 0; r.mareo = 0; r.inv = 0; r.escudo = 0; r.interrumpida = 0; r.kb.t = 0; r.kb.x = r.kb.z = 0; r.plumas = 5; j.plumas = 5; };
    try {
      // 10 (antes que nada). Sin la bandera no se carga nada: lo mide boot.js antes de pedir este módulo
      const antes = o.antes || {};
      if (antes.v18 === false) check('Sin la bandera ?v18=1 no se carga evolucion.js (ni con gestos del jugador)', !antes.cargado && !antes.evo && !antes.script, JSON.stringify(antes));
      else check('Sin la bandera no se carga nada (esta sesión tiene la bandera: se comprueba en boot.js con v18On)', antes.v18 === true || antes.v18 == null, JSON.stringify(antes));

      // 1. Curva y topes de XP
      let mono = true; for (let x = 0, n0 = 1; x <= XP_MAX + 500; x += 7) { const n = nivelDe(x); if (n < n0) mono = false; n0 = n; }
      check('Curva: T(10)=396, T(20)=1406, T(30)=3016, T(40)=5226; nivel monótono y tope 40',
        T(10) === 396 && T(20) === 1406 && T(30) === 3016 && T(40) === 5226 && nivelDe(395) === 9 && nivelDe(396) === 10 && nivelDe(1e9) === NIVEL_MAX && mono && nivelDe(0) === 1);

      // 2. Migración: una partida V18 vieja (v1, sin evo) carga igual; evo corrupto se sanea; una build vieja conserva evo
      reset();
      const v1 = { v: 1, especies: { arausiaca: 'seleccionable', agilis: 'descubierta' }, inv: { pluma_rival: 2 }, otorgados: { combate_1: true, duelo_gana_vittata: true }, mundo: { puente_villa: 'reparado', v18_piedra1: 'recogida' }, sel: 'vittata' };
      localStorage.setItem(P.clave(), JSON.stringify(v1)); P.recargar();
      const c1 = P.copia();
      check('Partida V18 vieja (v1 sin evolución): carga sin errores, pasa a v2 y conserva especies, inventario, recompensas, mundo y elegida',
        c1.v === 2 && c1.especies.arausiaca === 'seleccionable' && c1.especies.agilis === 'descubierta' && c1.inv.pluma_rival === 2 && c1.otorgados.combate_1 && c1.mundo.puente_villa === 'reparado' && P.seleccionada() === 'vittata' &&
        typeof c1.evo === 'object' && info('vittata').nivel === 1 && paraDuelo('vittata').nivel === 1 && !paraDuelo('vittata').alianza, JSON.stringify(c1));
      const r1 = revisarHitos(true), r2 = revisarHitos(true);
      check('Partida vieja: los hitos ya cumplidos dan su XP una sola vez (puente 120 + arausiaca 40 + 1.ª victoria 50 + material 10)', r1 === 220 && r2 === 0 && info('vittata').xp === 220, r1 + ' / ' + r2 + ' / ' + info('vittata').xp);
      Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true });
      check('Partida vieja: el duelo empieza con su nivel (sin alianza) y sin errores', C().fase === 'lucha' && C().j.nivel === info('vittata').nivel && !C().j.alianza, C().j.nivel);
      Cb.salir();
      localStorage.setItem(P.clave(), JSON.stringify({ v: 2, especies: {}, inv: {}, otorgados: {}, mundo: {}, sel: null, evo: { esp: { vittata: { xp: -50, nivel: 99, variante: 'rara' }, x: 7 }, alianzas: { eco_protector: 'regalada' }, alianzaSel: 'otra', dia: 5, marcas: null } }));
      P.recargar(); const ev1 = E();
      check('Evolución corrupta se sanea: xp<0 → 0, nivel 99 → recalculado, variante rara → null, alianza → bloqueada',
        ev1.esp.vittata.xp === 0 && ev1.esp.vittata.nivel === 1 && ev1.esp.vittata.variante === null && !ev1.esp.x && ev1.alianzas[ALI] === 'bloqueada' && ev1.alianzaSel === null && typeof ev1.dia === 'object', JSON.stringify(ev1));
      { // una build anterior (V = 1) lee un v2: lo marca v1 y conserva evo (Object.assign); al volver aquí la XP sigue
        localStorage.setItem(P.clave(), JSON.stringify({ v: 2, especies: { arausiaca: 'seleccionable' }, inv: {}, otorgados: {}, mundo: {}, sel: 'vittata', evo: { esp: { vittata: { xp: 500 } } } }));
        let d = JSON.parse(localStorage.getItem(P.clave())); if (d.v !== 1) { d.v = 1; d = Object.assign({ v: 1, especies: {}, inv: {}, otorgados: {}, mundo: {}, sel: null }, d); }
        localStorage.setItem(P.clave(), JSON.stringify(d)); P.recargar();
        check('Vuelta atrás: una build anterior conserva evo y al volver se lee igual (xp 500 → nivel 11)', info('vittata').xp === 500 && info('vittata').nivel === 11, JSON.stringify(info('vittata')));
      }

      // 3. Guardar → recargar conserva nivel, XP, variante, alianza y alianza elegida
      reset(); P.desbloquear('arausiaca'); const x3 = info('vittata').xp;
      prueba({ especie: 'vittata', xp: T(22) + 17, variante: 'amplificado', alianza: true });
      P.recargar();
      const g3 = info('vittata'), raw3 = JSON.parse(localStorage.getItem(P.clave()));
      check('Guardar → recargar conserva nivel, XP, variante, alianza y su elección', g3.nivel === 22 && g3.xp === T(22) + 17 && g3.variante === 'amplificado' && estadoAli() === 'desbloqueada' && E().alianzaSel === ALI &&
        raw3.evo.esp.vittata.xp === T(22) + 17 && raw3.v === 2, JSON.stringify(g3));
      check('Modo de prueba documentado: prueba(null) restaura lo de antes', prueba(null) && info('vittata').xp === x3 && estadoAli() === 'bloqueada', JSON.stringify(info('vittata')));

      // 4. Topes de XP
      reset();
      const win = ex => G.emit('v18combate', Object.assign({ tipo: 'win', de: 'jugador', a: 'rival', especie: 'arausiaca', dura: 40, interrupciones: 0, quitadas: 5 }, ex));
      const loss = ex => G.emit('v18combate', Object.assign({ tipo: 'loss', de: 'rival', a: 'jugador', especie: 'arausiaca', dura: 40, interrupciones: 0, quitadas: 2 }, ex));
      const xs = []; for (let i = 0; i < 20; i++) { const a = info('arausiaca').xp; win(); xs.push(info('arausiaca').xp - a); }
      check('20 victorias en un día dan como máximo 360 XP de duelo (60 ×4, luego la mitad)', info('arausiaca').xp === 360 && xs[0] === 60 && xs[4] === 30 && xs[19] === 0, xs.join(','));
      hoyFijo = 'prueba-2'; let a4 = info('arausiaca').xp;
      loss({ quitadas: 0 }); const l0 = info('arausiaca').xp - a4; a4 = info('arausiaca').xp;
      loss({ dura: 12 }); const l1 = info('arausiaca').xp - a4; a4 = info('arausiaca').xp;
      loss(); const l2 = info('arausiaca').xp - a4; a4 = info('arausiaca').xp;
      G.emit('v18combate', { tipo: 'win', de: 'jugador', duelo: 2, especie: 'arausiaca' }); const d2 = info('arausiaca').xp - a4; a4 = info('arausiaca').xp;
      check('Derrota sin quitar plumas = 0, derrota corta (<20 s) = 0, derrota peleada = 25, duelo de 2 = 0', l0 === 0 && l1 === 0 && l2 === 25 && d2 === 0, [l0, l1, l2, d2].join(','));
      check('Al cambiar de fecha se reinician los topes diarios (la primera victoria vuelve a dar 60)', (win(), info('arausiaca').xp - a4 === 60), info('arausiaca').xp - a4);
      P.desbloquear('arausiaca'); P.seleccionar('arausiaca'); a4 = info('arausiaca').xp;
      for (let i = 0; i < 5; i++) G.emit('v18minigolf', { tipo: 'nido', golpes: 3, nuevo: i === 0 });
      check('Minigolf: 30 por nido (+30 récord), como máximo 3 nidos al día', info('arausiaca').xp - a4 === 120, info('arausiaca').xp - a4);
      { hoyFijo = 'prueba-3'; let t = 0; for (let i = 0; i < 30; i++) { const a = info('arausiaca').xp; win(); G.emit('v18minigolf', { tipo: 'nido', golpes: 2, nuevo: true }); t += info('arausiaca').xp - a; }
        const extra = dar('arausiaca', 500, 'otra', { repetible: true }), extra2 = dar('arausiaca', 50, 'otra', { repetible: true });
        check('Tope global de lo repetible: como máximo 700 XP al día (duelos 360 + minigolf 180 + 160 de otra fuente; luego 0)', t === 540 && extra === 160 && extra2 === 0, [t, extra, extra2].join(',')); }
      const h0 = revisarHitos(true), pre = info('arausiaca').xp; P.cambiarMundo('puente_villa', 'reparado'); const h1 = info('arausiaca').xp; P.cambiarMundo('puente_villa', 'roto'); P.cambiarMundo('puente_villa', 'reparado');
      check('Los hitos no se repiten (el puente paga 120 una vez aunque se vuelva a marcar)', h0 === 0 && h1 - pre === 120 && info('arausiaca').xp === h1 && revisarHitos(true) === 0, [h0, h1 - pre, info('arausiaca').xp - h1].join(','));
      // Ritmo: nivel 10 en la 1.ª sesión, 20 en 2-3 sesiones (simulado con las fuentes reales)
      { reset(); P.desbloquear('arausiaca'); P.cambiarMundo('puente_villa', 'reparado'); P.otorgar('duelo_gana_vittata', 'victoria_vittata', 1);
        for (let i = 0; i < 6; i++) win({ especie: 'vittata' }); const s1 = info('vittata').nivel;
        hoyFijo = 'prueba-s2'; P.cambiarMundo('sombra_tormenta', 'dispersa'); P.cambiarMundo('serpiente_marana', 'deshecha'); for (let i = 0; i < 8; i++) win({ especie: 'vittata' }); const s2 = info('vittata').nivel;
        hoyFijo = 'prueba-s3'; P.cambiarMundo('sapo_encantado', 'despierto'); P.otorgar('reto_dos_cotorras', 'reto_extra', 1); for (let i = 0; i < 8; i++) win({ especie: 'vittata' }); const s3 = info('vittata').nivel;
        check('Ritmo: nivel ≥ 10 tras la 1.ª sesión (6 duelos y los hitos), ~20 en 2-3 sesiones, nunca más de 30', s1 >= 10 && s1 < 14 && s3 >= 18 && s3 <= 30, [s1, s2, s3].join(' → ')); }
      oye = true;

      // 5. Etapas: ajustar() devuelve los números de cada etapa, sin nivel devuelve el mismo objeto, topes en todas
      const gr = H.get('grito_yunque'), gr0 = gr, A = n => ajustar({ especie: 'vittata', nivel: n }, gr);
      const e1 = A(1), e10 = A(10), e20 = A(20), e25a = ajustar({ especie: 'vittata', nivel: 25, variante: 'amplificado' }, gr);
      check('Etapas: nv 1 = el grito de hoy (mismo objeto); nv 10 = 9 m ±42° 5,5 s; nv 20 = 11 m ±26° onda 22 m/s 6 s y desvía; nv 25 Amplificado = 9 m',
        e1 === gr && e10.alcance === 9 && e10.cono === 0.74 && e10.cooldown === 5.5 && e10.coste === 35 && e20.alcance === 11 && e20.cono === 0.9 && e20.vel === 22 && e20.cooldown === 6 && e20.coste === 40 && e20.desvia && !e10.desvia && e25a.alcance === 9,
        JSON.stringify({ 10: [e10.alcance, e10.cono, e10.cooldown], 20: [e20.alcance, e20.cono, e20.vel, e20.cooldown] }));
      check('Sin f.nivel (IA, duelo de 2, minigolf, amenazas) el motor recibe el mismo objeto; otras especies no cambian',
        ajustar({ especie: 'vittata' }, gr) === gr && H.ver({ especie: 'vittata' }, gr) === gr && ajustar({ especie: 'agilis', nivel: 30 }, H.get('quiebro')) === H.get('quiebro') && ajustar({ especie: 'ventralis', nivel: 30 }, gr) === gr);
      const topes = [1, 9, 10, 19, 20, 30, 40].map(n => A(n)).concat([e25a]);
      check('Topes en todas las etapas: espera ≥ 5 s, coste ≥ 35, alcance ≤ 11 m, interrupción ≤ 1,4 s, esquivable (≥ 0,43 s en llegar)',
        topes.every(h => h.cooldown >= 5 && h.coste >= 35 && h.alcance <= 11 && h.interrumpe <= 1.4 && h.alcance / h.vel >= 0.43), topes.map(h => h.alcance + '/' + h.vel).join(' '));
      const es10 = ajustar({ especie: 'arausiaca', nivel: 10 }, H.get('escudo_plumas'));
      check('Arausiaca: Escudo de plumas igual en nv 1; nv 10 dura 3 s; nv 20 recupera 15 de energía al bloquear', ajustar({ especie: 'arausiaca', nivel: 1 }, H.get('escudo_plumas')) === H.get('escudo_plumas') && es10.dura === 3 && es10.cooldown === 7 && paraDuelo('arausiaca').bonusBloqueo === undefined);

      // 6. En el duelo real: cada etapa cambia de verdad el grito (alcance, empuje y precisión MEDIDOS)
      mudo = true;
      const medir = (nivel, dist, ang) => {
        Cb.iniciar({ sinCuenta: true, especie: 'vittata', evo: { nivel } }); fresco();
        const a = (ang || 0) * Math.PI / 180; quieta(Math.cos(a) * dist, Math.sin(a) * dist); cara(1, 0);
        const i0 = C().stats.intJ, x0 = C().r.pos.x; Cb.usar(C().j, 'grito_yunque');
        correr(1.0, () => { const r = C().r; r.pensar = 99; r.golpeT = 99; r.tiroT = 99; r.poderT = 99; r.esquivaT = 99; });
        return { da: C().stats.intJ > i0, empuje: Math.round((C().r.pos.x - x0) * 100) / 100, mareo: C().r.interrumpida || 0, plumas: C().r.plumas };
      };
      const M = {};
      // (distancia entre las dos; la onda sale 0,5 m por delante del pico y alcanza hasta alcance + 0,6)
      for (const n of [1, 10, 20]) M[n] = { 7: medir(n, 7), 9: medir(n, 9), 11: medir(n, 11), 13: medir(n, 13), ang38: medir(n, 6.5, 38), ang30: medir(n, 6.5, 30) };
      const alc = n => [7, 9, 11, 13].filter(d => M[n][d].da).pop() || 0;
      check('Alcance medido: nv 1 acierta a 7 m y no a 9; nv 10 a 9 y no a 11; nv 20 a 11 y no a 13',
        M[1][7].da && !M[1][9].da && M[10][9].da && !M[10][11].da && M[20][11].da && !M[20][13].da, JSON.stringify({ 1: alc(1), 10: alc(10), 20: alc(20) }));
      check('Empuje e interrupción medidos crecen con la etapa (a 7 m) y el grito nunca quita plumas',
        M[1][7].empuje < M[10][7].empuje && M[10][7].empuje < M[20][7].empuje && M[1][7].mareo < M[20][7].mareo && [1, 10, 20].every(n => M[n][7].plumas === 5),
        JSON.stringify({ empuje_m: [M[1][7].empuje, M[10][7].empuje, M[20][7].empuje], mareo_s: [M[1][7].mareo, M[10][7].mareo, M[20][7].mareo] }));
      check('Precisión medida: a 38° de lado solo acierta el Eco Amplificado (cono ancho); a 30°, nv 1 y 10 sí y el Eco Dirigido no (cono estrecho)',
        !M[1].ang38.da && M[10].ang38.da && !M[20].ang38.da && M[1].ang30.da && M[10].ang30.da && !M[20].ang30.da, JSON.stringify({ a38: [M[1].ang38.da, M[10].ang38.da, M[20].ang38.da], a30: [M[1].ang30.da, M[10].ang30.da, M[20].ang30.da] }));
      // Eco Dirigido deshace las semillas rivales dentro del cono; el Amplificado no
      const semilla = nivel => {
        Cb.iniciar({ sinCuenta: true, especie: 'vittata', evo: { nivel } }); fresco(); quieta(8); cara(1, 0);
        const r = C().r; r.energia = 100; Cb.usar(r, 'semilla'); Cb.paso(0.05);
        const n0 = C().balas.filter(b => b.de === r).length; Cb.usar(C().j, 'grito_yunque');
        return { antes: n0, despues: C().balas.filter(b => b.de === r).length, desvios: C().stats.desvios };
      };
      const sd20 = semilla(20), sd10 = semilla(10);
      check('Eco Dirigido (nv 20) deshace la semilla rival que viene en su cono; con Eco Amplificado sigue volando', sd20.antes === 1 && sd20.despues === 0 && sd20.desvios === 1 && sd10.antes === 1 && sd10.despues === 1, JSON.stringify({ sd20, sd10 }));
      Cb.iniciar({ sinCuenta: true, especie: 'vittata', evo: { nivel: 1 } });
      check('Nivel 1 en el duelo: el motor usa el grito de hoy tal cual', H.listo(C().j, 'grito_yunque').h === gr && C().j.nivel === 1);
      Cb.salir(); mudo = false;

      // 7. Subida de nivel jugando: con 380 XP, ganar a la Campeona sube a 10 (aviso, evento y tarjeta); la etapa entra en el siguiente duelo
      reset(); prueba({ especie: 'vittata', xp: 380 }); evs.length = 0; toasts.length = 0;
      Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true }); fresco();
      const nvAntes = C().j.nivel, hudNv = document.querySelector('#v18-duelo [data-k="nvN"]');
      C().r.plumas = 1; quieta(1.2); cara(1, 0); Cb.usar(C().j, 'golpe_ala');
      const finXp = document.querySelector('#v18-duelo [data-k="finXp"]');
      check('Ganar a la Campeona con 380 XP: +60 XP y sube a nivel 10 con aviso, evento v18 {tipo:"evo"}, tarjeta «Eco Amplificado» y «+60 XP» en el panel',
        C().resultado === 'win' && info('vittata').nivel === 10 && info('vittata').xp === 440 && toasts.some(t => t === con(TXT.subeV, 10)) && evs.some(e => e.nivel === 10 && e.especie === 'vittata') &&
        !!cartaEl && /Eco Amplificado/.test(cartaEl.textContent) && finXp && /\+60 XP/.test(finXp.textContent) && /10/.test(finXp.textContent), JSON.stringify({ nv: info('vittata'), t: toasts.slice(-3), fin: finXp && finXp.textContent }));
      check('El HUD del duelo muestra «Nv 9 · Grito del Yunque» y la barra de XP; la etapa no cambia a mitad del duelo', nvAntes === 9 && hudNv && hudNv.textContent === 'Nv 9' && C().j.nivel === 9, hudNv && hudNv.textContent);
      C().finT -= 5000; Cb.otraVez(); C().fase = 'lucha';
      check('En el siguiente duelo («Otra vez») ya es Eco Amplificado: 9 m', C().j.nivel === 10 && H.listo(C().j, 'grito_yunque').h.alcance === 9 && document.querySelector('#v18-duelo [data-k="nvE"]').textContent === 'Eco Amplificado');
      Cb.salir(); quitarCarta();

      // 8. Alianza Eco Protector
      reset(); prueba({ especie: 'vittata', nivel: 12 }); revisarAlianza();
      const b1 = estadoAli(); prueba({ especie: 'vittata', nivel: 5 }); P.desbloquear('arausiaca'); revisarAlianza(); const b2 = estadoAli();
      prueba({ especie: 'vittata', nivel: 10 }); revisarAlianza(); const b3 = estadoAli();
      check('Alianza: bloqueada sin la cotorra de Dominica o con Vittata < 10; con las dos → disponible (aviso)', b1 === 'bloqueada' && b2 === 'bloqueada' && b3 === 'disponible', [b1, b2, b3].join(' → '));
      // Desafío en un duelo real: ganar a la Campeona con 1 interrupción no basta; con 2 sí
      const desafio = n => {
        Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true }); fresco(); cara(1, 0);
        for (let i = 0; i < n; i++) { fresco(); quieta(5); Cb.usar(C().j, 'grito_yunque'); vaciar(); }
        fresco(); C().r.plumas = 1; quieta(1.2); Cb.usar(C().j, 'golpe_ala');
        return { res: C().resultado, intJ: C().stats.intJ, ali: estadoAli() };
      };
      const dsf1 = desafio(1); C().finT -= 5000; const dsf2 = desafio(2);
      check('Desafío: ganar con 1 interrupción no la desbloquea; con 2 sí (tarjeta «¡Nueva alianza!» y queda elegida)', dsf1.res === 'win' && dsf1.ali === 'disponible' && dsf2.res === 'win' && dsf2.intJ === 2 && dsf2.ali === 'desbloqueada' &&
        E().alianzaSel === ALI && !!cartaEl && /Eco Protector/.test(cartaEl.textContent), JSON.stringify({ dsf1, dsf2 }));
      Cb.salir(); quitarCarta(); mudo = true;
      Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true }); fresco(); quieta(5); cara(1, 0);
      const ali = document.querySelector('#v18-duelo .vd-ali');
      check('Con la alianza elegida, el duelo trae Eco Protector y su botón', C().j.alianza === ALI && ali && !ali.hidden && ali.textContent === 'Eco Protector');
      podEv.length = 0; const ond0 = C().stats.ondas, int0 = C().stats.intJ;
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', code: 'KeyH', bubbles: true, cancelable: true }));
      const tieneH = !!(G.input && G.input.keys && G.input.keys.has('h')); document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'h', code: 'KeyH', bubbles: true }));
      const j8 = C().j, enDesp = j8.energia, escDesp = j8.escudo; vaciar();
      check('Tecla H: lanza la onda (empuja e interrumpe) + escudo de 2 s; −60 energía, recarga 14 s, grito en espera 5 s; la H no llega al juego',
        podEv.some(e => e.id === ALI && e.apoyo === 'arausiaca') && C().stats.ondas > ond0 && C().stats.intJ === int0 + 1 && Math.abs(escDesp - 2) < 1e-6 && Math.abs(enDesp - 40) < 1e-6 &&
        j8.cd.eco_protector === 14 && j8.cd.grito_yunque >= 5 && !H.listo(j8, 'grito_yunque').ok && !tieneH && C().r.plumas === 5, JSON.stringify({ en: enDesp, esc: escDesp, cd: j8.cd, tieneH }));
      check('Apoyo visual de la cotorra de Dominica: retrato y «¡La cotorra de Dominica te cubre!» en el HUD', !document.querySelector('#v18-duelo [data-k="apoyo"]').hidden);
      j8.cd = {}; j8.energia = 100;
      check('Con un escudo ya puesto no sale (no se encadena)', H.listo(j8, ALI).motivo === 'ahora no');
      const r8 = C().r; r8.pos.x = S.pos.x + 1.5; r8.pos.z = S.pos.z; r8.cd = {}; r8.mareo = 0; r8.interrumpida = 0;
      Cb.usar(r8, 'golpe_ala'); const tras1 = { pl: j8.plumas, esc: j8.escudo }; j8.inv = 0; r8.cd = {};
      Cb.usar(r8, 'golpe_ala');
      check('Su escudo para UN golpe normal; el siguiente sí quita pluma', tras1.pl === 5 && tras1.esc === 0 && j8.plumas === 4, JSON.stringify(tras1) + ' → ' + j8.plumas);
      fresco(); j8.cd = {}; Cb.usar(j8, ALI); vaciar(); const poder0 = r8.poder; r8.poder = 'ala_fuerte'; r8.cd = {}; r8.energia = 100; r8.mareo = 0; r8.pos.x = S.pos.x + 1.5; r8.pos.z = S.pos.z;
      Cb.usar(r8, 'ala_fuerte'); r8.poder = poder0;
      check('Ala fuerte rompe su escudo y el golpe entra entero', j8.escudo === 0 && j8.plumas === 4, JSON.stringify({ esc: j8.escudo, pl: j8.plumas }));
      fresco(); j8.cd = {}; Cb.usar(j8, ALI); vaciar(); let tEsc = 0;
      correr(2.5, () => { quieta(9); if (j8.escudo > 0) tEsc += 0.05; j8.inv = 9; });
      check('Duración: el escudo dura 2 s y se va solo (nunca permanente)', j8.escudo === 0 && tEsc >= 1.9 && tEsc <= 2.1, tEsc.toFixed(2));
      j8.energia = 100; correr(11.0, () => { quieta(9); j8.energia = 100; });
      const a13 = H.listo(j8, ALI).ok; correr(1.0, () => { quieta(9); j8.energia = 100; });
      check('Recarga: a los 13,5 s aún no; a los 14,5 s sí', !a13 && H.listo(j8, ALI).ok);
      j8.energia = 50; j8.cd = {};
      check('Coste: con 50 de energía no sale (cuesta 60)', H.listo(j8, ALI).motivo === 'energia');
      j8.energia = 100; podEv.length = 0;
      ali.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
      check('El botón (también con el dedo) la lanza igual', podEv.some(e => e.id === ALI));
      // No gana sola: una jugadora que solo machaca la alianza y el grito pierde contra la Campeona
      const spam = { usos: 0, gritos: 0 };
      Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true, semilla: 11 });
      correr(150, () => { const c = C(), d = H.dirA(c.j, c.r); cara(d.x, d.z); S.pos.x = Cb.sitio.x - 5; S.pos.z = Cb.sitio.z;
        if (H.listo(c.j, ALI).ok) { Cb.usar(c.j, ALI); spam.usos++; } else if (H.listo(c.j, 'grito_yunque').ok) { Cb.usar(c.j, 'grito_yunque'); spam.gritos++; } });
      check('No gana sola: quien solo machaca Eco Protector y el grito pierde contra la Campeona (sin quitarle plumas)', C().resultado === 'loss' && C().r.plumas === 5 && spam.usos >= 1 && spam.gritos + spam.usos >= 2,
        JSON.stringify(Object.assign(spam, { res: C().resultado, plumasRival: C().r.plumas, dura: Math.round(C().tLucha) })));
      Cb.salir();
      // Sin alianza elegida: no hay botón y la H no hace nada (sigue libre para el juego)
      elegirAlianza(false); Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true }); podEv.length = 0;
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', code: 'KeyH', bubbles: true, cancelable: true }));
      const hLibre = !!(G.input && G.input.keys && G.input.keys.has('h')); document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'h', code: 'KeyH', bubbles: true }));
      check('Sin alianza elegida: ni botón ni H (la tecla sigue libre para el juego)', !C().j.alianza && document.querySelector('#v18-duelo .vd-ali').hidden && !podEv.some(e => e.id === ALI), 'H llega a input.js: ' + hLibre);
      Cb.salir(); elegirAlianza(true);

      // 9. Táctil simulado: botón visible, ≥ 56 px, sin tapar el Diario ni los botones grandes
      { Cb.iniciar({ sinCuenta: true, especie: 'vittata', evoReal: true }); const hudEl = document.getElementById('v18-duelo'), eraT = hudEl.classList.contains('tactil'); hudEl.classList.add('tactil');
        const b = hudEl.querySelector('.vd-ali'), rb = b.getBoundingClientRect();
        const choca = ['b-diary', 'b-act', 'b-dash', 'b-jump', 'b-fly', 'b-dive', 'b-menu', 'minimapa'].map(id => document.getElementById(id)).filter(el => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
          .filter(el => { const r = el.getBoundingClientRect(); return r.width && r.height && !(r.right <= rb.left || r.left >= rb.right || r.bottom <= rb.top || r.top >= rb.bottom); }).map(el => el.id);
        check('Táctil: el botón Eco Protector se ve, mide ≥ 56 px y no tapa el Diario ni los botones grandes', !b.hidden && rb.height >= 56 && rb.width >= 120 && !choca.length, JSON.stringify({ alto: rb.height, ancho: rb.width, choca }));
        if (!eraT) hudEl.classList.remove('tactil'); Cb.salir(); }

      // Mis cotorras: nivel, barra, etapas y fila de alianza
      { P.seleccionar('vittata'); const D = G.v18descubrir; let okM = false, txt = '';
        if (D && D.abrirSeleccion) { D.abrirSeleccion(); const card = G.ui.$('card'); txt = card ? card.textContent : ''; okM = txt.indexOf('Nv ' + info('vittata').nivel) >= 0 && /Eco Amplificado/.test(txt) && /Eco Dirigido/.test(txt) && /Nivel 20/.test(txt) && !!card.querySelector('[data-v18ali]');
          const bA = card.querySelector('[data-v18ali]'); if (bA) bA.click(); okM = okM && E().alianzaSel === null; G.ui.hideCard(); elegirAlianza(true); }
        check('Mis cotorras: nivel, barra de XP, etapas (bloqueadas con «Nivel 20») y la fila de alianza que se activa y desactiva', okM, txt.slice(0, 160)); }

      // Equilibrio (informativo, con números): dos jugadoras automáticas de ritmo humano (una acción cada 0,6 s como mucho), con la
      // misma estrategia en nv 1, 10 y 20, contra la Campeona sin cambios. «cuerpo»: se pega y usa el ala; «distancia»: guarda la
      // distancia del grito, grita y lanza semillas, sin ala (el estilo donde la etapa más se nota).
      if (o.equilibrio !== false) {
        const res = {}, N = o.n || 6;
        for (const estilo of ['cuerpo', 'distancia']) for (const nivel of [1, 10, 20]) {
          let g = 0, dur = 0, pl = 0, gr = 0, ac = 0;
          for (let k = 0; k < N; k++) {
            Cb.iniciar({ sinCuenta: true, especie: 'vittata', evo: { nivel }, semilla: 3 + k * 17 });
            let t = 0, prox = 0; const i0 = () => C().stats.intJ; let int0 = i0();
            correr(150, () => {
              t += 0.05; const c = C(), j = c.j, r = c.r, d = H.dirA(j, r); cara(d.x, d.z);
              const gH = H.listo(j, 'grito_yunque'), alcG = gH.h ? gH.h.alcance : (ajustar(j, gr0) || gr0).alcance, v = 5.5 * 0.05;
              const quiere = estilo === 'cuerpo' ? 1.8 : Math.max(4, Math.min(9, alcG - 1));
              let mx = 0, mz = 0; if (d.d > quiere + 0.8) { mx = d.x; mz = d.z; } else if (d.d < quiere - 0.8) { mx = -d.x; mz = -d.z; }
              const ox = S.pos.x - Cb.sitio.x, oz = S.pos.z - Cb.sitio.z, od = Math.hypot(ox, oz) || 1;
              if (od > 9.5 && (mx * ox + mz * oz) > 0) { const tx = -oz / od, tz = ox / od, sg = (tx * d.x + tz * d.z) > 0 ? -1 : 1; mx = tx * sg; mz = tz * sg; } // en el borde, rodea
              S.pos.x += mx * v; S.pos.z += mz * v;
              const ox2 = S.pos.x - Cb.sitio.x, oz2 = S.pos.z - Cb.sitio.z, od2 = Math.hypot(ox2, oz2); if (od2 > 11) { S.pos.x = Cb.sitio.x + ox2 / od2 * 11; S.pos.z = Cb.sitio.z + oz2 / od2 * 11; }
              if (j.mareo > 0 || t < prox) return;
              let u = null;
              if (gH.ok && d.d < alcG + 0.3 && d.d > 2.4) u = 'grito_yunque';
              else if (estilo === 'cuerpo' && d.d < 2.3 && H.listo(j, 'golpe_ala').ok) u = 'golpe_ala';
              else if (estilo === 'distancia' && d.d > 3 && j.energia >= 50 && H.listo(j, 'semilla').ok) u = 'semilla';
              if (u && Cb.usar(j, u).ok) { prox = t + 0.6; if (u === 'grito_yunque') gr++; }
            });
            if (C().resultado === 'win') g++; dur += C().tLucha || 0; pl += 5 - C().r.plumas; ac += C().stats.intJ - int0;
          }
          res[estilo + ' nv' + nivel] = { gana: g + '/' + N, pct: Math.round(100 * g / N), s: Math.round(dur / N), plumas: Math.round(10 * pl / N) / 10, gritos: Math.round(10 * gr / N) / 10, interrumpe: Math.round(10 * ac / N) / 10 };
        }
        Cb.salir();
        const dif = e => res[e + ' nv20'].pct - res[e + ' nv1'].pct;
        check('Equilibrio (2 estilos × 3 niveles × ' + N + ' duelos contra la Campeona): el nivel ayuda pero no decide (nv 20 − nv 1 ≤ 50 puntos)', dif('cuerpo') <= 50 && dif('distancia') <= 50, JSON.stringify(res));
      }
    } catch (e) { check('Sin excepciones', false, e && (e.stack || e.message)); }
    mudo = false; oye = false; hoyFijo = null; quitarCarta();
    try { Cb.salir(); } catch (e) { /* ya fuera */ }
    G.ui.toast = toast0;
    Object.assign(S.pos, pos0); S.facing = fac0;
    for (const k of Object.keys(S.inv)) if (!(k in inv0)) delete S.inv[k];
    Object.assign(S.inv, inv0); try { if (G.objetos && G.objetos.renderInv) G.objetos.renderInv(); } catch (e) { /* HUD */ }
    try { if (crudo == null) localStorage.removeItem(P.clave()); else localStorage.setItem(P.clave(), crudo); } catch (e) { /* sin almacenamiento */ }
    P.recargar(); void sel0;
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18evo = { T, nivelDe, NIVEL_MAX, XP, TOPE, ETAPAS, TOPES_GRITO, info, etapaDe, paraDuelo, ajustar, lineaHud, htmlFin, htmlFicha, htmlExtra, enlazar,
    dar, revisarHitos, revisarAlianza, desbloquearAlianza, elegirAlianza, elegirVariante, estadoAlianza: estadoAli, prueba, carta, test };
  return G.v18evo;
};
