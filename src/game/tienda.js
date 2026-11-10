/* Juego · Mercadito del río (G.tienda). Kelvin 9-nov, idea de su hija: «con esos peces el premio sea comprar más ropa y más cosas».
   La pesca (src/game/v18/pesca.js) paga CONCHITAS, una moneda del juego que solo se gana jugando, y aquí se gastan en ropa nueva para
   tu cotorra y en piezas nuevas para Construir (src/game/construir.js). Reglas de Kelvin (CLAUDE.md): sin dinero real, sin cajas
   sorpresa ni premios al azar, sin relojes, ofertas ni anuncios; cada cosa tiene un precio fijo y a la vista, y nada de lo que ya se
   tenía se bloquea (la ropa son colores nuevos de piezas que ya existían; las piezas de Construir son tipos nuevos).
   - Pagos (fijos por especie, PAGO_PEZ): olivo 5, dajao 10, guavina 15, anguila 15 (más grande o más difícil, más conchitas), tilapia y
     pleco 5 por la foto; reportar una invasora al DRNA da BONO_DRNA = 10 más (premio de conservación). El pez que se suelta paga igual.
     Una ronda de 2 min 30 s da unas 50–100 conchitas: alcanza para algo pequeño (25–60); el traje «Pescador del río» (4 piezas, 200)
     sale en unas 3 rondas.
   - Catálogo: pack.tienda (content/cap1/coleccionables.js): ropa [{ id, clave 'pieza:color', precio, nombre, viste, conjunto? }] y
     construir [{ id (= tipo de construir.js), precio, nombre }]. La ropa comprada entra en S.unlocked (Mi personaje la deja elegir:
     G.misiones.lockOf) y se viste al comprarla, como un premio de misión; luego «Ponértela» la vuelve a poner.
   - Guardado: S.tienda = { v: 1, conchitas, ganadas, compras: [id] } en la partida (clave «tienda» de content/cap1/pack.js). Lo que no
     se entiende (dañado, otra versión, números raros, ids que no existen, repetidos) se lee como vacío o se descarta; nunca negativo.
   - Dónde se abre: resultados de la pesca (botón «Mercadito» o T), la Pausa («Mercadito»), Mi personaje («Mercadito: ropa nueva») y la
     barra de Construir («Mercadito»). Es la tarjeta del juego (#card): Esc o «Cerrar» la cierran y el foco vuelve a donde estaba.
   - Textos en español; el inglés en content/cap1/en.js (idioma.js los traduce en pantalla).
   API: disponible(), saldo(), ganadas(), compradas(), tiene(id), precio(id), pagarPez(idPez, 'foto'|'drna'), ganar(n),
   ganarLogro(clave, n) (minigolf y retos: pocas, una vez por récord, tope diario; la pesca no usa este tope), comprar(id),
   vestir(id), abrir(origen), cerrar(), abierta(), PAGO_PEZ, BONO_DRNA, CATALOGO, leer(d), test(). Prueba: AV.tiendaTest(). */
window.AVTienda = function (G) {
  'use strict';
  if (G.tienda) return G.tienda;
  const S = G.S, $ = id => document.getElementById(id);
  const CAT = (G.pack && G.pack.tienda) || null;
  const ROPA = CAT && Array.isArray(CAT.ropa) ? CAT.ropa : [], PIEZAS = CAT && Array.isArray(CAT.construir) ? CAT.construir : [];
  const ITEMS = ROPA.map(r => Object.assign({ tipo: 'ropa' }, r)).concat(PIEZAS.map(p => Object.assign({ tipo: 'construir' }, p)));
  const POR_ID = {}; for (const it of ITEMS) POR_ID[it.id] = it;
  const MAX = 99999;
  const PAGO_PEZ = Object.freeze({ olivo: 5, dajao: 10, guavina: 15, anguila: 15, tilapia: 5, pleco: 5 });
  const BONO_DRNA = 10, INVASORAS = ['tilapia', 'pleco'];
  const CONJUNTO = { pescador: 'Traje «Pescador del río»' };
  const esObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const entero = v => (Number.isInteger(v) && v >= 0 && v <= MAX ? v : 0);
  const disponible = () => ITEMS.length > 0;
  let ultimoSonido = '';
  const sonar = (n, a) => { ultimoSonido = n; if (G.quiet) return; try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };

  // ---------- Datos: leer (tolerante) y guardar ----------
  const TOPE_DIA = 12, PAGO_LOGRO = Object.freeze({ record: 2, uno: 3, carrera: 2 });
  function leer(d) {
    const out = { v: 1, conchitas: 0, ganadas: 0, compras: [], logros: [], dia: { fecha: '', n: 0 } };
    if (!esObj(d) || d.v !== 1) return out;
    out.conchitas = entero(d.conchitas);
    out.ganadas = Math.max(entero(d.ganadas), out.conchitas);
    if (Array.isArray(d.compras)) for (const id of d.compras) if (typeof id === 'string' && POR_ID[id] && !out.compras.includes(id)) out.compras.push(id);
    if (Array.isArray(d.logros)) for (const k of d.logros) if (typeof k === 'string' && k.length > 0 && k.length <= 48 && !out.logros.includes(k) && out.logros.length < 120) out.logros.push(k);
    if (esObj(d.dia) && typeof d.dia.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.dia.fecha)) { out.dia.fecha = d.dia.fecha; out.dia.n = Math.min(TOPE_DIA, entero(d.dia.n)); }
    return out;
  }
  const est = () => leer(S.tienda);
  function escribir(e, tipo) {
    S.tienda = { v: 1, conchitas: e.conchitas, ganadas: e.ganadas, compras: e.compras.slice(), logros: (e.logros || []).slice(), dia: { fecha: (e.dia && e.dia.fecha) || '', n: (e.dia && e.dia.n) || 0 } };
    try { if (G.guardado && G.guardado.autosave) G.guardado.autosave(); } catch (er) { /* sin guardado */ }
    try { G.emit('tienda', { tipo, conchitas: e.conchitas }); } catch (er) { /* sin oyentes */ }
  }
  // Al cargar: se normaliza lo guardado y la ropa comprada vuelve a estar libre en Mi personaje (S.unlocked)
  function normalizar() {
    if (!disponible()) return;
    if (S.tienda == null) return;
    const e = leer(S.tienda); S.tienda = e;
    if (!Array.isArray(S.unlocked)) return;
    for (const id of e.compras) { const it = POR_ID[id]; if (it.tipo === 'ropa' && !S.unlocked.includes(it.clave)) S.unlocked.push(it.clave); }
  }
  G.on('apply', () => { normalizar(); if (abierta()) cerrar(); }, 61);
  normalizar();

  const saldo = () => est().conchitas, ganadas = () => est().ganadas, compradas = () => est().compras;
  const tiene = id => compradas().includes(id);
  const precio = id => (POR_ID[id] ? POR_ID[id].precio : null);
  // Ganar: solo enteros positivos; nunca pasa de MAX
  function ganar(n, tipo) {
    if (!disponible() || !Number.isInteger(n) || n <= 0) return 0;
    const e = est(), antes = e.conchitas;
    e.conchitas = Math.min(MAX, e.conchitas + n); e.ganadas = Math.min(MAX, Math.max(e.ganadas + n, e.conchitas));
    escribir(e, tipo || 'gana');
    return e.conchitas - antes;
  }
  // La pesca paga lo fijo de cada especie: 'foto' al atraparlo; 'drna' (solo invasoras) al reportarla
  function pagarPez(id, como) {
    if (como === 'drna') return INVASORAS.includes(id) ? ganar(BONO_DRNA, 'drna') : 0;
    return PAGO_PEZ[id] ? ganar(PAGO_PEZ[id], 'pez') : 0;
  }
  // Logros fuera de la pesca: cantidad fija, una vez por clave de récord, y como mucho TOPE_DIA al día.
  // La pesca (pagarPez / ganar) no pasa por aquí. Sin azar. Con G.quiet no paga (las pruebas no farmean).
  const fechaHoy = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function ganarLogro(clave, n, o) {
    o = o || {};
    if (!disponible() || (G.quiet && !o.prueba)) return 0;
    if (typeof clave !== 'string' || clave.length < 3 || clave.length > 48) return 0;
    if (!Number.isInteger(n) || n <= 0 || n > 8) return 0;
    const e = est();
    if (e.logros.includes(clave)) return 0;
    const fecha = fechaHoy();
    if (e.dia.fecha !== fecha) e.dia = { fecha, n: 0 };
    const cabe = TOPE_DIA - e.dia.n;
    if (cabe <= 0) return 0;
    const pago = Math.min(n, cabe);
    e.logros.push(clave); e.dia.n += pago;
    e.conchitas = Math.min(MAX, e.conchitas + pago); e.ganadas = Math.min(MAX, Math.max(e.ganadas + pago, e.conchitas));
    escribir(e, 'logro');
    if (o.aviso !== false && !G.quiet) { try { G.ui.toast('+' + pago + ' conchitas', 2400); } catch (er) { /* sin HUD */ } }
    return pago;
  }
  // Carreras y retos que ya avisan su récord (retosResultado). Una partida de prueba no paga.
  const MODOS_RETO = { flight: 1, rio_rush: 1, tren: 1, rio: 1, carrera: 1, tormenta: 1, rescate: 1, maze: 1, banquete: 1 };
  G.on('retosResultado', ev => {
    if (!ev || ev.prueba || G.quiet || !MODOS_RETO[ev.modo]) return;
    if (ev.llego === false) return;
    if (!(ev.nuevo || ev.nuevoRecord || ev.medalla === 'oro')) return;
    const marca = (ev.nuevo || ev.nuevoRecord) ? String(ev.ms || ev.puntos || ev.puesto || 'rec') : 'oro';
    ganarLogro('carrera:' + ev.modo + ':' + marca, PAGO_LOGRO.carrera);
  });
  // Comprar: descuenta el precio exacto o no hace nada (nunca deja el saldo en negativo)
  function comprar(id) {
    const it = POR_ID[id];
    if (!it) return { ok: false, motivo: 'desconocido' };
    const e = est();
    if (e.compras.includes(id)) return { ok: false, motivo: 'tiene' };
    if (e.conchitas < it.precio) return { ok: false, motivo: 'faltan', faltan: it.precio - e.conchitas };
    e.conchitas -= it.precio; e.compras.push(id);
    if (it.tipo === 'ropa') { if (!Array.isArray(S.unlocked)) S.unlocked = []; if (!S.unlocked.includes(it.clave)) S.unlocked.push(it.clave); }
    escribir(e, 'compra');
    if (it.tipo === 'ropa') vestir(id, true);
    try { if (it.tipo === 'construir' && G.construir && G.construir.refrescar) G.construir.refrescar(); } catch (er) { /* sin construir */ }
    try { if (it.tipo === 'ropa' && G.creador && $('creator') && !$('creator').hidden) G.creador.renderSlots(); } catch (er) { /* sin creador */ }
    try { G.eventos.log('ShopPurchase', { item: id, price: it.precio }); } catch (er) { /* sin eventos */ }
    return { ok: true, saldo: e.conchitas };
  }
  // Ponerse una pieza comprada (como los premios de misión: S.wear del protagonista)
  const puesta = it => { const w = S.wear && S.wear[it.viste.slot]; return !!w && w.id === it.viste.id && w.color === it.viste.color && (it.viste.style == null || w.style === it.viste.style); };
  function vestir(id, sinGuardar) {
    const it = POR_ID[id]; if (!it || it.tipo !== 'ropa' || !tiene(id)) return false;
    const v = it.viste; S.wear = Object.assign({}, S.wear, { [v.slot]: v.style ? { id: v.id, color: v.color, style: v.style } : { id: v.id, color: v.color } });
    try { G.actores.applyWear(); } catch (e) { /* sin personaje 3D */ }
    if (!sinGuardar) try { G.guardado.autosave(); } catch (e) { /* sin guardado */ }
    return true;
  }
  function vestirConjunto(c) { let n = 0; for (const it of ROPA) if (it.conjunto === c && tiene(it.id) && vestir(it.id, true)) n++; if (n) try { G.guardado.autosave(); } catch (e) { /* */ } return n; }

  // ---------- Interfaz: la tarjeta del Mercadito ----------
  const CONCHA = '<svg class="tn-concha" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C7 3 3 7.2 3 12.2c0 2.4 1 4.6 2.6 6.1L12 21l6.4-2.7c1.6-1.5 2.6-3.7 2.6-6.1C21 7.2 17 3 12 3z" fill="#f6b38f"/><path d="M12 21V4.5M12 21L6.2 6.8M12 21l5.8-14.2M12 21L3.6 10.4M12 21l8.4-10.6" stroke="#c9694a" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M8.6 20.4h6.8l-1.2 1.6H9.8z" fill="#e48a68"/></svg>';
  const ICONO = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M12 3C7 3 3 7.2 3 12.2c0 2.4 1 4.6 2.6 6.1L12 21l6.4-2.7c1.6-1.5 2.6-3.7 2.6-6.1C21 7.2 17 3 12 3zm0 3.2.9 11.6h-1.8zM8 7.6l2.7 10.3-1.6.6zm8 0-1.1 10.9-1.6-.6zM5.6 11l4 7.2-1.3.9zm12.8 0-2.7 8.1-1.3-.9z"/></svg>') + '")';
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tienesTxt = n => (n === 1 ? 'Tienes 1 conchita' : 'Tienes ' + n + ' conchitas');
  const precioTxt = n => n + ' conchitas', comprarTxt = n => 'Comprar · ' + n;
  // «Te faltan 15: Ir a pescar»: las dos frases ya están en en.js (CG-75 tiene ese archivo). Van en nodos separados para que el inglés las traduzca.
  const faltanTxt = n => 'Te faltan ' + n + ': ' + TXT.pescar;
  const faltanHtml = n => `<span class="tn-falta"><span>${esc('Te faltan ' + n)}</span>: <span>${esc(TXT.pescar)}</span></span>`;
  const conjuntoTxt = (n, p) => n + ' piezas · ' + p + ' conchitas en total';
  const TXT = {
    titulo: 'Mercadito del río',
    nota: 'Las conchitas se ganan pescando en el río: cada pez de tu álbum paga, y reportar una invasora al DRNA paga más. Todo tiene su precio fijo.',
    ropa: 'Ropa nueva para tu cotorra', piezas: 'Piezas para Construir', otras: 'Más ropa',
    tuya: 'Ya es tuya', puesta: 'Puesta', ponerla: 'Ponértela', ponerConj: 'Ponerme el traje completo',
    cerrar: 'Cerrar', pescar: 'Ir a pescar',
    compraRopa: '¡Ya es tuya! Tu cotorra la estrena y está en Mi personaje.', compraPieza: '¡Ya es tuya! Está en la barra de Construir (tecla B).',
    vestida: '¡Lista! Ya la llevas puesta.', conjVestido: '¡Traje completo puesto!', sinPiezas: 'Construir está apagado en esta partida.',
    abrirCreador: 'Mercadito: ropa nueva'
  };
  let estilo = null;
  function css() {
    if (estilo) return;
    estilo = document.createElement('style'); estilo.id = 'tn-estilo';
    estilo.textContent =
      '#card:has(#tienda){z-index:45;width:min(640px,calc(100vw - 24px));padding:var(--sp-5,20px) var(--sp-5,20px) 0}' +
      '#tienda h2{margin-bottom:var(--sp-2,8px)}#tienda h3{margin:var(--sp-4,16px) 0 var(--sp-2,8px);font:700 var(--fs-lg,18px)/1.2 var(--font-display,inherit);color:var(--c-ink,#3b2a14)}' +
      '#tienda .tn-saldo{display:inline-flex;align-items:center;gap:8px;margin:0 0 var(--sp-2,8px);padding:6px 14px 6px 8px;border-radius:999px;background:#fff1e4;border:2px solid #f0c4a8;font:700 var(--fs-md,16px)/1.2 var(--font-display,inherit);color:#7a3418}' +
      '#tienda .tn-concha{width:26px;height:26px;flex:none}#tienda small .tn-concha{width:18px;height:18px;vertical-align:-4px;margin-right:2px}' +
      '#tienda .tn-nota{font-size:var(--fs-sm,14px);color:var(--c-ink-muted,#6b5236);margin:0 0 var(--sp-2,8px)}' +
      '#tienda .tn-sub{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 10px;margin:0 0 6px;font-weight:700;color:var(--c-ink,#3b2a14)}#tienda .tn-sub small{font-weight:400;color:var(--c-ink-muted,#6b5236)}' +
      '#tienda ul{list-style:none;margin:0 0 var(--sp-2,8px);padding:0;display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(min(270px,100%),1fr))}' +
      '#tienda li{display:grid;grid-template-columns:56px 1fr auto;align-items:center;gap:10px;padding:8px 10px;border-radius:14px;background:rgba(255,255,255,.7);border:2px solid rgba(107,82,54,.18)}' +
      '#tienda li.tuya{background:#e9f7ea;border-color:#a7dbb0}' +
      '#tienda .tn-img{width:56px;height:56px;border-radius:12px;background:radial-gradient(circle at 50% 40%,#fffaf0,#efe2c8);display:grid;place-items:center;overflow:hidden}' +
      '#tienda .tn-img img{width:56px;height:56px;object-fit:contain}#tienda .tn-img svg{width:44px;height:44px}' +
      '#tienda .tn-img .tn-color{width:30px;height:30px;border-radius:50%;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18),0 0 0 3px #fff}' +
      '#tienda .tn-txt{min-width:0}#tienda .tn-txt b{display:block;font-size:var(--fs-sm,15px);line-height:1.25;color:var(--c-ink,#3b2a14)}#tienda .tn-txt small{display:block;margin-top:2px;font-size:var(--fs-xs,13px);color:var(--c-ink-muted,#6b5236)}' +
      '#tienda .tn-b{min-height:var(--tap,48px);min-width:var(--tap,48px);padding:0 14px;white-space:nowrap;font-size:var(--fs-sm,15px)}' +
      '#tienda .tn-falta,#tienda .tn-ok{font:700 var(--fs-xs,13px)/1.2 var(--font-body,inherit);white-space:nowrap;padding:6px 10px;border-radius:999px}' +
      '#tienda .tn-falta{color:#7a4b16;background:#fbe7c4;white-space:normal}#tienda .tn-ok{color:#17552c;background:#d3f0d8}' +
      '#tienda .tn-cats{display:flex;gap:8px;margin:0 0 8px}#tienda .tn-cat{flex:1 1 40%;min-height:var(--tap,48px);min-width:var(--tap,48px);padding:8px 10px;white-space:normal;line-height:1.2}' +
      '#tienda .tn-cat[aria-pressed="true"]{box-shadow:inset 0 0 0 3px #1f7a4a}' +
      '#tienda .tn-acc{display:flex;flex-direction:column;gap:6px;min-width:0}' +
      '#tienda li.tn-vista{outline:3px solid #3d8fb0}' +
      '@keyframes tn-pop{0%{transform:scale(.97)}45%{transform:scale(1.03)}100%{transform:scale(1)}}' +
      '#tienda li.tn-nueva{animation:tn-pop .5s var(--ease-pop,ease);outline:3px solid #e8c32a}' +
      '@media (prefers-reduced-motion:reduce){#tienda li.tn-nueva{animation:none}}' +
      '#tienda .tn-msg{min-height:1.4em;margin:var(--sp-2,8px) 0 0;font-weight:700;color:#17552c}' +
      '#tienda .tn-pie{position:sticky;bottom:0;display:flex;flex-wrap:wrap;gap:var(--sp-3,12px);justify-content:flex-end;margin:var(--sp-2,8px) calc(var(--sp-5,20px) * -1) 0;padding:var(--sp-3,12px) var(--sp-5,20px) var(--sp-4,16px);background:linear-gradient(180deg,rgba(251,241,220,0),var(--c-paper,#fbf1dc) 30%)}' +
      '#tienda .tn-pie .btn{min-height:var(--tap,48px)}' +
      '@media (max-width:560px){#card:has(#tienda){padding:var(--sp-4,16px) var(--sp-4,16px) 0}#tienda li{grid-template-columns:48px 1fr;row-gap:8px}#tienda .tn-img,#tienda .tn-img img{width:48px;height:48px}' +
      '#tienda li>:last-child{grid-column:1 / -1;justify-self:stretch;text-align:center}#tienda .tn-b{width:100%}#tienda .tn-pie{margin:var(--sp-2,8px) calc(var(--sp-4,16px) * -1) 0;padding:var(--sp-3,12px) var(--sp-4,16px) var(--sp-4,16px)}#tienda .tn-pie .btn{flex:1 1 40%}}' +
      '#p-tienda{width:100%;margin:0 0 var(--sp-3,12px);min-height:var(--tap,48px)}#p-tienda::before{--icon:' + ICONO + '}';
    document.head.appendChild(estilo);
  }
  let abiertaYa = false, origen = '', foco = null, ariaLabel0 = null, msg = '', msgFalta = null;
  let probando = '', recien = '', cat = 'ropa';
  let puestoDeVerdad = null, lookDeVerdad = null;
  const abierta = () => abiertaYa && !!$('tienda') && G.ui && G.ui.cardOpen;
  function miniatura(it) {
    if (it.tipo === 'construir') {
      const svg = G.construir && G.construir.SVG && G.construir.SVG[it.id];
      return svg ? `<svg viewBox="0 0 32 32" aria-hidden="true">${svg}</svg>` : CONCHA;
    }
    return `<span class="tn-color" style="background:${esc(it.viste.color)}" aria-hidden="true"></span>`;
  }
  function filaItem(it, e) {
    const mia = e.compras.includes(it.id);
    const esRopa = it.tipo === 'ropa' || (it.tipo !== 'construir' && !!it.viste);
    const probar = esRopa && !mia ? `<button class="btn secondary tn-b" type="button" data-tn="probar" data-id="${it.id}" aria-pressed="${probando === it.id}" aria-label="${esc('Probar: ' + it.nombre)}">${esc('Probar')}</button>` : '';
    let accion;
    if (!mia) {
      const pago = e.conchitas >= it.precio
        ? `<button class="btn tn-b" type="button" data-tn="comprar" data-id="${it.id}" aria-label="${esc('Comprar ' + it.nombre + ' por ' + precioTxt(it.precio))}">${esc(comprarTxt(it.precio))}</button>`
        : faltanHtml(it.precio - e.conchitas);
      accion = probar ? `<span class="tn-acc">${probar}${pago}</span>` : pago;
    } else if (esRopa) accion = puesta(it) ? `<span class="tn-ok"><span>${esc(TXT.puesta)}</span> ✓</span>` : `<button class="btn secondary tn-b" type="button" data-tn="vestir" data-id="${it.id}" aria-label="${esc(TXT.ponerla + ': ' + it.nombre)}">${esc(TXT.ponerla)}</button>`;
    else accion = `<span class="tn-ok"><span>${esc(TXT.tuya)}</span> ✓</span>`;
    const sub = mia ? esc(TXT.tuya) : CONCHA + esc(precioTxt(it.precio));
    const cls = (mia ? 'tuya' : '') + (recien === it.id ? ' tn-nueva' : '') + (probando === it.id ? ' tn-vista' : '');
    return `<li class="${cls.trim()}" data-id="${it.id}"><span class="tn-img" data-img="${it.id}">${miniatura(it)}</span><span class="tn-txt"><b>${esc(it.nombre)}</b><small>${sub}</small></span>${accion}</li>`;
  }
  function html() {
    const e = est(), conj = {}, sueltas = [];
    for (const it of ROPA) (it.conjunto ? (conj[it.conjunto] = conj[it.conjunto] || []) : sueltas).push(it);
    let ropa = '';
    for (const c in conj) {
      const l = conj[c], total = l.reduce((s, it) => s + it.precio, 0), todas = l.every(it => e.compras.includes(it.id)), puesto = todas && l.every(puesta);
      const boton = todas && !puesto ? `<button class="btn secondary tn-b" type="button" data-tn="conjunto" data-id="${c}">${esc(TXT.ponerConj)}</button>` : '';
      ropa += `<p class="tn-sub"><span><span>${esc(CONJUNTO[c] || c)}</span> <small>${esc(conjuntoTxt(l.length, total))}</small></span>${boton}</p><ul>${l.map(it => filaItem(it, e)).join('')}</ul>`;
    }
    if (sueltas.length) ropa += `<p class="tn-sub"><span>${esc(TXT.otras)}</span></p><ul>${sueltas.map(it => filaItem(it, e)).join('')}</ul>`;
    const conConstruir = G.CONSTRUIR !== false && !!G.construir;
    const piezas = conConstruir ? `<ul>${ITEMS.filter(it => it.tipo === 'construir').map(it => filaItem(it, e)).join('')}</ul>` : `<p class="tn-nota">${esc(TXT.sinPiezas)}</p>`;
    const pescar = origen !== 'pesca' && G.PESCA !== false && G.pescaBotonPausa ? `<button class="btn" type="button" data-tn="pescar">${esc(TXT.pescar)}</button>` : '';
    const cats = `<div class="tn-cats" role="tablist"><button class="btn secondary tn-cat" type="button" data-tn="cat" data-id="ropa" aria-pressed="${cat === 'ropa'}">${esc(TXT.ropa)}</button><button class="btn secondary tn-cat" type="button" data-tn="cat" data-id="piezas" aria-pressed="${cat === 'piezas'}">${esc(TXT.piezas)}</button></div>`;
    const aviso = msgFalta != null ? `<p class="tn-msg" role="status" aria-live="polite">${faltanHtml(msgFalta)}</p>` : `<p class="tn-msg" role="status" aria-live="polite">${esc(msg)}</p>`;
    return `<div id="tienda" data-origen="${esc(origen)}"><h2>${esc(TXT.titulo)}</h2>` +
      `<p class="tn-saldo" data-tn-saldo>${CONCHA}<span>${esc(tienesTxt(e.conchitas))}</span></p><p class="tn-nota">${esc(TXT.nota)}</p>` +
      cats + `<h3 id="tn-ropa">${esc(TXT.ropa)}</h3>${ropa}<h3 id="tn-piezas">${esc(TXT.piezas)}</h3>${piezas}` +
      aviso +
      `<div class="tn-pie">${pescar}<button class="btn ghost" type="button" data-tn="cerrar">${esc(TXT.cerrar)}</button></div></div>`;
  }
  // Miniaturas reales de la ropa (el mismo render que Mi personaje, G.creador.accessoryThumb); si no hay WebGL, queda el color
  async function miniaturas() {
    const C = G.creador; if (!C || !C.accessoryThumb || G.actores.failed3D) return;
    for (const it of ROPA) {
      try {
        const src = await C.accessoryThumb(it.viste.id, it.viste.color, it.viste.style);
        const box = $('tienda') && $('tienda').querySelector(`[data-img="${it.id}"]`);
        if (box && src) { box.innerHTML = ''; const img = new Image(); img.alt = ''; img.src = src; box.appendChild(img); }
      } catch (e) { /* queda el círculo de color */ }
    }
  }
  function pintar(enfocar) {
    const card = $('card'); if (!card || !abierta()) return;
    const activo = document.activeElement, clave = activo && activo.dataset && activo.dataset.tn ? activo.dataset.tn + ':' + (activo.dataset.id || '') : '';
    card.innerHTML = html(); miniaturas();
    const t = $('tienda'), mismo = clave && t.querySelector(`[data-tn="${clave.split(':')[0]}"][data-id="${clave.split(':')[1]}"]`);
    const b = enfocar || !mismo ? (enfocar ? t.querySelector(enfocar) : null) || t.querySelector('[data-tn="comprar"],[data-tn="vestir"],[data-tn="cerrar"]') : mismo;
    if (b) try { b.focus({ preventScroll: !!mismo }); } catch (e) { /* */ }
  }
  function copia(x) { return JSON.parse(JSON.stringify(x || {})); }
  function anclar(inicial) {
    puestoDeVerdad = copia(S.wear);
    if (inicial) {
      try {
        const ch = window.AVShowcase && AVShowcase.character && AVShowcase.character();
        lookDeVerdad = ch && ch.look ? copia(ch.look) : null;
      } catch (e) { lookDeVerdad = null; }
    }
    if (lookDeVerdad) lookDeVerdad.accessories = copia(S.wear);
  }
  function pintarCotorra(wear, celebrar) {
    S.wear = wear;
    try { G.actores.applyWear(); } catch (e) { /* sin personaje 3D */ }
    try {
      const sh = window.AVShowcase;
      if (!sh || !sh.setLook || sh.status() !== 'ready') return null;
      const base = lookDeVerdad || (sh.character() && sh.character().look);
      if (!base) return null;
      const look = copia(base); look.accessories = copia(wear);
      sh.setLook(look, !!celebrar);
      return look;
    } catch (e) { return null; }
  }
  function probar(id) {
    const it = POR_ID[id]; if (!it || it.tipo !== 'ropa' || tiene(id)) return false;
    if (!puestoDeVerdad) anclar();
    const v = it.viste;
    const pieza = v.style ? { id: v.id, color: v.color, style: v.style } : { id: v.id, color: v.color };
    pintarCotorra(Object.assign({}, puestoDeVerdad, { [v.slot]: pieza }), true);
    probando = id; msg = TXT.puesta; msgFalta = null; sonar('tick');
    return true;
  }
  function restaurar() {
    if (!puestoDeVerdad) return;
    const wear = puestoDeVerdad, look = lookDeVerdad;
    puestoDeVerdad = null; lookDeVerdad = null; probando = '';
    S.wear = wear;
    try { G.actores.applyWear(); } catch (e) { /* */ }
    try { if (look && window.AVShowcase && AVShowcase.status() === 'ready') AVShowcase.setLook(look, false); } catch (e) { /* */ }
  }
  function abrir(o) {
    if (!disponible()) return false;
    css();
    if (!abierta()) {
      foco = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
      msg = ''; msgFalta = null; probando = ''; recien = '';
      anclar(true);
    }
    origen = o || 'pausa'; abiertaYa = true;
    G.ui.showCard(html());
    const card = $('card');
    if (ariaLabel0 == null) ariaLabel0 = card.getAttribute('aria-label') || '';
    card.setAttribute('aria-label', TXT.titulo); card.setAttribute('aria-modal', 'true'); card.scrollTop = 0;
    pintar('[data-tn="comprar"],[data-tn="vestir"],[data-tn="cerrar"]');
    sonar('tick');
    return true;
  }
  function cerrar() { if (!abiertaYa) return false; G.ui.hideCard(); return true; }
  // cardHidden: la cierre quien la cierre (Esc en input.js, «Cerrar», otra tarjeta), se recoge todo y el foco vuelve
  G.on('cardHidden', () => {
    if (!abiertaYa) return;
    abiertaYa = false;
    restaurar();
    const card = $('card'); if (card) { card.setAttribute('aria-label', ariaLabel0 || 'Tarjeta'); card.setAttribute('aria-modal', 'false'); }
    try { if (G.creador && $('creator') && !$('creator').hidden) G.creador.renderSlots(); } catch (e) { /* */ }
    const f = foco; foco = null;
    if (f && document.contains(f) && f.getClientRects().length) try { f.focus({ preventScroll: true }); } catch (e) { /* */ }
  });
  // Otra tarjeta que pisa la del Mercadito (showCard de otro módulo) también la cierra
  const cardEl = $('card');
  if (cardEl) {
    cardEl.addEventListener('click', ev => {
      if (!abierta()) return;
      const b = ev.target.closest && ev.target.closest('[data-tn]'); if (!b) return;
      const a = b.dataset.tn, id = b.dataset.id;
      if (a === 'cerrar') { cerrar(); return; }
      if (a === 'cat') {
        cat = id === 'piezas' ? 'piezas' : 'ropa';
        const sec = document.getElementById(cat === 'piezas' ? 'tn-piezas' : 'tn-ropa');
        if (sec) sec.scrollIntoView({ block: 'nearest' });
        const nav = $('tienda') && $('tienda').querySelectorAll('[data-tn="cat"]');
        if (nav) nav.forEach(x => x.setAttribute('aria-pressed', x.dataset.id === cat ? 'true' : 'false'));
        return;
      }
      if (a === 'pescar') { cerrar(); const t = G.pescaBotonPausa && G.pescaBotonPausa(); if (t && !t.hidden) t.click(); return; }
      if (a === 'probar') { if (probar(id)) pintar(`[data-tn="probar"][data-id="${id}"]`); return; }
      if (a === 'comprar') {
        const it = POR_ID[id];
        if (it && it.tipo === 'ropa' && puestoDeVerdad) S.wear = copia(puestoDeVerdad);
        const r = comprar(id);
        if (r.ok) {
          msg = it.tipo === 'ropa' ? TXT.compraRopa : TXT.compraPieza; msgFalta = null; recien = id; probando = '';
          if (it.tipo === 'ropa') { anclar(false); pintarCotorra(S.wear, true); }
          sonar('unlock');
          try { if (!G.quiet && G.fx && G.fx.burst && G.S.pos) G.fx.burst(S.pos.x, S.pos.y + 1, S.pos.z, 'gold', 10); } catch (e) { /* */ }
        } else { msg = ''; msgFalta = r.motivo === 'faltan' ? r.faltan : null; sonar('wrong'); }
        pintar(r.ok ? `[data-tn="vestir"][data-id="${id}"],[data-tn="conjunto"],[data-tn="cerrar"]` : null);
        return;
      }
      if (a === 'vestir') {
        if (puestoDeVerdad) S.wear = copia(puestoDeVerdad);
        if (vestir(id)) { msg = TXT.vestida; msgFalta = null; anclar(false); pintarCotorra(S.wear, true); sonar('tick'); }
        pintar(); return;
      }
      if (a === 'conjunto') {
        if (puestoDeVerdad) S.wear = copia(puestoDeVerdad);
        if (vestirConjunto(id)) { msg = TXT.conjVestido; msgFalta = null; anclar(false); pintarCotorra(S.wear, true); sonar('unlock'); }
        pintar('[data-tn="cerrar"]');
      }
    });
  }
  // Escape lo atiende input.js (cierra la tarjeta); con la pesca enganchada, pesca.js deja pasar las teclas mientras hay tarjeta

  // ---------- Entradas: botón de la Pausa y de Mi personaje ----------
  function entradas() {
    if (!disponible()) return;
    css();
    const grid = document.querySelector('#pause .pause-grid');
    if (grid && !$('b-tienda')) {
      const b = document.createElement('button'); b.className = 'btn tile'; b.id = 'b-tienda'; b.type = 'button';
      b.dataset.icon = 'tienda'; b.style.setProperty('--icon', ICONO); b.setAttribute('popovertarget', 'pause'); b.setAttribute('popovertargetaction', 'hide');
      b.textContent = 'Mercadito';
      b.addEventListener('click', () => setTimeout(() => abrir('pausa'), 0));
      const ref = $('b-save'); grid.insertBefore(b, ref && ref.parentNode === grid ? ref : null);
    }
    const slots = $('p-slots');
    if (slots && !$('p-tienda')) {
      const b = document.createElement('button'); b.className = 'btn secondary'; b.id = 'p-tienda'; b.type = 'button';
      b.dataset.icon = 'tienda'; b.textContent = TXT.abrirCreador;
      b.addEventListener('click', () => abrir('creador'));
      slots.parentNode.insertBefore(b, slots);
    }
  }
  entradas();

  // ---------- Prueba: AV.tiendaTest() ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const espera = ms => new Promise(r => setTimeout(r, ms));
    const copia = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
    const antes = { tienda: copia(S.tienda), unlocked: copia(S.unlocked), wear: copia(S.wear), quiet: G.quiet };
    const errores = [], cerr0 = console.error; console.error = function () { errores.push([...arguments].map(String).join(' ').slice(0, 200)); return cerr0.apply(console, arguments); };
    const susp = G.guardado && G.guardado.suspender; if (susp) susp(true);
    try {
      G.quiet = true;
      check('Hay catálogo: 6 piezas de ropa (colores nuevos) y 6 piezas de Construir, cada una con precio fijo entero', ROPA.length === 6 && PIEZAS.length === 6 && ITEMS.every(it => Number.isInteger(it.precio) && it.precio > 0), ITEMS.map(i => i.id + ':' + i.precio).join(' '));
      // La ropa del Mercadito son colores NUEVOS: existen en el ropero, no eran de un premio de misión y no se bloqueó nada que ya se tuviera
      const C3 = window.AVCharacter, defs = (C3 && C3.ACCESSORIES) || [];
      const nuevos = ROPA.every(it => { const d = defs.find(a => a.id === it.viste.id); return d && d.colors[d.colors.length - 1] === it.viste.color && it.clave === it.viste.id + ':' + it.viste.color && (!it.viste.style || (d.styles || []).some(s => s[0] === it.viste.style)); });
      check('La ropa del Mercadito son colores nuevos del ropero (el último de cada pieza) y su estilo existe', nuevos);
      check('Ningún premio de misión ni del Diario pasa a la tienda (lo ya ganado sigue igual)', ROPA.every(it => !(G.misiones.unlocks || []).some(u => u.clave === it.clave)));
      check('Construir tiene las 6 piezas del Mercadito como tipos propios', !G.construir || PIEZAS.every(p => G.construir.EXTRA.includes(p.id)));
      // 1. Saldo, ganar y comprar
      S.tienda = null;
      check('Partida sin Mercadito: 0 conchitas y nada comprado', saldo() === 0 && compradas().length === 0);
      check('Ganar solo suma enteros positivos', ganar(-5) === 0 && ganar(2.5) === 0 && ganar(0) === 0 && ganar('9') === 0 && saldo() === 0);
      check('La pesca paga fijo por especie y el DRNA da el bono solo por invasoras', pagarPez('olivo', 'foto') === 5 && pagarPez('guavina', 'foto') === 15 && pagarPez('tilapia', 'drna') === 10 && pagarPez('dajao', 'drna') === 0 && pagarPez('tiburon', 'foto') === 0 && saldo() === 30, saldo());
      // CG-87: logros fuera de la pesca. La pesca de arriba no cuenta para el tope.
      S.tienda = { v: 1, conchitas: 0, ganadas: 0, compras: [] };
      G.quiet = false;
      const rec = ganarLogro('golf-rec:1:1', PAGO_LOGRO.record), otra = ganarLogro('golf-rec:1:1', PAGO_LOGRO.record), uno = ganarLogro('golf-uno:1', PAGO_LOGRO.uno);
      let carreras = 0; for (let i = 0; i < 20; i++) carreras += ganarLogro('carrera:flight:' + i, PAGO_LOGRO.carrera);
      const tope = rec + otra + uno + carreras;
      check('Récord y hoyo en uno pagan poco y una sola vez; el tope diario es ' + TOPE_DIA, rec === 2 && otra === 0 && uno === 3 && tope === TOPE_DIA && saldo() === TOPE_DIA, saldo());
      const ayer = leer(S.tienda); ayer.dia = { fecha: '2000-01-01', n: TOPE_DIA }; S.tienda = ayer;
      check('Al día siguiente el tope vuelve a empezar', ganarLogro('golf-rec:2:1', 2) === 2 && saldo() === TOPE_DIA + 2);
      G.emit('retosResultado', { modo: 'tren', nuevo: true, puntos: 40, prueba: true });
      const antesTren = saldo();
      G.emit('retosResultado', { modo: 'tren', nuevo: true, puntos: 40 });
      const tren1 = saldo() - antesTren;
      G.emit('retosResultado', { modo: 'tren', nuevo: true, puntos: 40 });
      check('Un récord de reto paga +2 una vez; una partida de prueba no paga', tren1 === 2 && saldo() === antesTren + 2);
      G.quiet = true;
      check('Con la prueba en silencio un logro no paga', ganarLogro('golf-rec:3:1', 2) === 0 && saldo() === antesTren + 2);
      check('La pesca no usa el tope del día', pagarPez('olivo', 'foto') === 5 && saldo() === antesTren + 7);
      G.quiet = true;
      S.tienda = { v: 1, conchitas: 30, ganadas: 30, compras: [] };
      const r0 = comprar('farol');
      check('Sin conchitas suficientes no se compra y dice cuántas faltan; el saldo no baja', !r0.ok && r0.motivo === 'faltan' && r0.faltan === 10 && saldo() === 30 && !tiene('farol'), JSON.stringify(r0));
      ganar(70);
      const s1 = saldo(), r1 = comprar('farol');
      check('Comprar descuenta el precio exacto (100 − 40 = 60) y la pieza queda tuya', r1.ok && s1 === 100 && saldo() === 60 && tiene('farol') && S.tienda.ganadas === 100, saldo());
      check('No se compra dos veces lo mismo', comprar('farol').motivo === 'tiene' && saldo() === 60);
      check('Un id que no existe no hace nada', comprar('cofre_sorpresa').motivo === 'desconocido' && saldo() === 60);
      check('La pieza comprada sale en la barra de Construir', !G.construir || (G.construir.tiene('farol') && G.construir.disponibles().includes('farol')));
      const lk0 = G.misiones.lockOf('lentes', 'redondas', '#1fb5b0');
      check('Antes de comprarlos, los lentes turquesa salen bloqueados en Mi personaje con su precio', !!lk0 && /Mercadito del río \(30 conchitas\)/.test(lk0.pista), lk0 && lk0.pista);
      const r2 = comprar('lentes_turquesa');
      check('Comprar ropa: 60 − 30 = 30, se libera en Mi personaje y tu cotorra la estrena', r2.ok && saldo() === 30 && S.unlocked.includes('lentes:#1fb5b0') && !G.misiones.lockOf('lentes', 'sol', '#1fb5b0') && S.wear.eyes && S.wear.eyes.color === '#1fb5b0' && S.wear.eyes.style === 'redondas');
      const p3 = G.actores && G.actores.player3D ? G.actores.player3D : null;
      check('El personaje 3D lleva los lentes comprados', !p3 || !p3.mounted || (p3.mounted.eyes && p3.mounted.eyes.color === '#1fb5b0'), p3 && p3.mounted && JSON.stringify(p3.mounted.eyes && { id: p3.mounted.eyes.id, c: p3.mounted.eyes.color }));
      check('Nunca negativo: con 30 no se compra el traje de 120', !comprar('traje_rio').ok && saldo() === 30);
      // 2. Guardado: la compra sigue tras recargar; lo dañado se lee seguro
      const d = JSON.parse(G.guardado.serialize(true));
      check('La partida guarda S.tienda (v1, saldo y compras) y es una clave del guardado', d.tienda && d.tienda.v === 1 && d.tienda.conchitas === 30 && d.tienda.compras.join() === 'farol,lentes_turquesa' && G.guardado.KEYS.includes('tienda'), JSON.stringify(d.tienda));
      S.tienda = null; S.unlocked = S.unlocked.filter(k => k !== 'lentes:#1fb5b0');
      S.tienda = d.tienda; normalizar();
      check('Al recargar, el saldo y lo comprado vuelven (y los lentes vuelven a estar libres)', saldo() === 30 && tiene('farol') && tiene('lentes_turquesa') && S.unlocked.includes('lentes:#1fb5b0'));
      const malos = ['basura', 42, [], null, { v: 2, conchitas: 50 }, { v: 1, conchitas: -20 }, { v: 1, conchitas: 1e9 }, { v: 1, conchitas: '500' }, { v: 1, conchitas: NaN }, { v: 1, conchitas: 3.5 }];
      check('Un guardado dañado, de otra versión o con números raros se lee como 0 conchitas', malos.every(m => leer(m).conchitas === 0 && leer(m).compras.length === 0));
      const raro = leer({ v: 1, conchitas: 12, ganadas: 3, compras: ['farol', 'farol', 'nave', 7, null, 'hamaca'] });
      check('Compras raras se descartan (repetidas, ids que no existen) y ganadas nunca es menor que el saldo', raro.compras.join() === 'farol,hamaca' && raro.ganadas === 12, JSON.stringify(raro));
      S.tienda = { v: 1, conchitas: -50, compras: 'x' };
      check('Con un S.tienda dañado en memoria la tienda no se rompe: 0 y sin compras', saldo() === 0 && compradas().length === 0 && !comprar('helecho').ok);
      // 3. Sin azar: precios fijos y ningún número aleatorio en este módulo
      const fuente = String(window.AVTienda);
      check('Sin azar: el módulo no usa números aleatorios; precios y pagos fijos', !/Math\.random|crypto\.getRandom|sorpresa\(|azar\(/.test(fuente) && Object.isFrozen(PAGO_PEZ));
      // 4. La tarjeta: se abre, compra con el botón, cabe en 390 × 844 y se cierra con el foco de vuelta
      S.tienda = { v: 1, conchitas: 75, ganadas: 75, compras: [] };
      const bP = $('b-tienda'), bC = $('p-tienda');
      check('Entradas: botón «Mercadito» en la Pausa y en Mi personaje', !!bP && !!bP.closest('#pause') && !!bC && !!bC.closest('#creator'));
      check('abrir() muestra la tarjeta del Mercadito con el saldo', abrir('prueba') && G.ui.cardOpen && !!$('tienda') && $('tienda').querySelector('[data-tn-saldo]').textContent.includes(tienesTxt(75)));
      await espera(50);
      const bRopa = $('tienda').querySelector('[data-tn="cat"][data-id="ropa"]'), bPie = $('tienda').querySelector('[data-tn="cat"][data-id="piezas"]');
      check('Categorías claras: Ropa y Piezas', !!bRopa && !!bPie && bRopa.textContent.trim() === TXT.ropa && bPie.textContent.trim() === TXT.piezas && bRopa.getAttribute('aria-pressed') === 'true');
      const bPro = $('tienda').querySelector('[data-tn="probar"][data-id="sombrero_rio"]');
      check('La ropa sin comprar tiene «Probar»', !!bPro && bPro.textContent.trim() === 'Probar', bPro ? bPro.textContent : 'sin botón');
      if (bPro) bPro.click();
      check('Probar la pone en la cotorra sin cobrar ni desbloquear', saldo() === 75 && !tiene('sombrero_rio') && S.wear.head && S.wear.head.id === 'sombrero2' && S.wear.head.color === '#2e8b7a' && !(S.unlocked || []).includes('sombrero2:#2e8b7a'), JSON.stringify(S.wear && S.wear.head));
      const bHel = $('tienda').querySelector('[data-tn="comprar"][data-id="helecho"]'), sinBoton = !$('tienda').querySelector('[data-tn="comprar"][data-id="traje_rio"]');
      check('Lo que alcanza tiene «Comprar · precio»; lo que no, «Te faltan N» (sin botón)', !!bHel && bHel.textContent.trim() === comprarTxt(25) && sinBoton && $('tienda').querySelector('[data-id="traje_rio"] .tn-falta').textContent === faltanTxt(45), bHel && bHel.textContent);
      bHel.click();
      check('El botón compra: 75 − 25 = 50, la fila pasa a «Ya es tuya» y lo anuncia', saldo() === 50 && tiene('helecho') && !!$('tienda').querySelector('li.tuya[data-id="helecho"]') && $('tienda').querySelector('.tn-msg').textContent === TXT.compraPieza);
      check('Comprar suena y anima la fila', ultimoSonido === 'unlock' && $('tienda').querySelector('li[data-id="helecho"]').classList.contains('tn-nueva'));
      // maqueta a 390 × 844 con las hojas reales
      const fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
      fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:390px;height:844px;border:0';
      const hojas = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
      fr.srcdoc = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${hojas}${estilo.outerHTML}<style>#card{animation:none!important}</style></head><body><div id="card" class="hud panel" role="dialog">${$('card').innerHTML}</div></body></html>`;
      document.body.appendChild(fr);
      await new Promise(r => { fr.addEventListener('load', r, { once: true }); setTimeout(r, 4000); });
      const md = fr.contentDocument, mal = [];
      if (!md || !md.getElementById('tienda')) mal.push('la maqueta no cargó');
      else {
        const card = md.getElementById('card'), rc = card.getBoundingClientRect();
        if (rc.left < 0 || rc.right > 390 || rc.top < 0 || rc.bottom > 844) mal.push(`tarjeta ${Math.round(rc.left)},${Math.round(rc.top)}–${Math.round(rc.right)},${Math.round(rc.bottom)}`);
        for (const b of md.querySelectorAll('#tienda button')) { const r = b.getBoundingClientRect(); if (r.width < 44 || r.height < 44 || r.left < rc.left - 1 || r.right > rc.right + 1) mal.push(`«${b.textContent.trim()}» ${Math.round(r.width)}×${Math.round(r.height)}`); }
        for (const li of md.querySelectorAll('#tienda li')) if (li.scrollWidth > li.clientWidth + 1) mal.push('fila desborda: ' + li.dataset.id);
        if (md.documentElement.scrollWidth > 390) mal.push('scroll horizontal');
      }
      fr.remove();
      check('Móvil (390 × 844): la tarjeta cabe, los botones miden ≥ 44 px y nada se desborda', !mal.length, mal.join(' · '));
      // Comprar un traje entero y ponérselo
      S.tienda = { v: 1, conchitas: 200, ganadas: 275, compras: ['helecho'] }; pintar();
      for (const it of ROPA.filter(x => x.conjunto === 'pescador')) { const b = $('tienda').querySelector(`[data-tn="comprar"][data-id="${it.id}"]`); if (b) b.click(); }
      check('Con 200 conchitas (unas 3 rondas) se compra el traje «Pescador del río» entero y queda en 0', saldo() === 0 && ROPA.filter(x => x.conjunto === 'pescador').every(it => tiene(it.id)), saldo());
      S.wear = Object.assign({}, S.wear, { head: { id: 'pava', color: '#d6403a' } }); G.actores.applyWear(); pintar();
      const bConj = $('tienda').querySelector('[data-tn="conjunto"]'); if (bConj) bConj.click();
      check('«Ponerme el traje completo» viste las 4 piezas', !!bConj && ROPA.filter(x => x.conjunto === 'pescador').every(puesta), JSON.stringify(S.wear));
      check('Esc cierra el Mercadito (como toda tarjeta)', (dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), !G.ui.cardOpen && !abierta()));
      // 5. Inglés: todos los textos tienen su entrada en content/cap1/en.js
      try {
        const en = await (await fetch('content/cap1/en.js', { cache: 'no-store' })).text(), falta = [];
        const ver = t => { if (!en.includes(JSON.stringify(t))) falta.push(t); };
        for (const k in TXT) ver(TXT[k]);
        for (const it of ITEMS) ver(it.nombre);
        for (const c in CONJUNTO) ver(CONJUNTO[c]);
        for (const t of ['Tienes {} conchitas', 'Tienes 1 conchita', '{} conchitas', 'Te faltan {}', 'Comprar · {}', '{} piezas · {} conchitas en total', 'Comprar {} por {} conchitas', 'el Mercadito del río ({} conchitas)', 'Mercadito', 'Ponértela: {}', 'Esa pieza está en el Mercadito del río.']) ver(t);
        check('Inglés: todos los textos del Mercadito están en content/cap1/en.js', !falta.length, falta.slice(0, 5).join(' | '));
      } catch (e) { check('Inglés: se pudo leer content/cap1/en.js', false, e); }
      // CG-74: la miniatura del traje azul es el modelo (túnica + emblema), la misma que Mi personaje
      if (G.creador && G.creador.accessoryThumb && !G.actores.failed3D) {
        const src = await G.creador.accessoryThumb('traje', '#1c6e8c');
        const img = new Image();
        await new Promise(r => { img.onload = img.onerror = r; img.src = src; });
        const cv = document.createElement('canvas'); cv.width = cv.height = 64;
        const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 64, 64);
        const px = g.getImageData(0, 0, 64, 64).data;
        let opacos = 0, azul = 0, oro = 0, verde = 0;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] < 24) continue;
          opacos++;
          const r = px[i], gg = px[i + 1], b = px[i + 2];
          if (b > r + 18 && b > gg && b > 45) azul++;
          else if (r > 150 && gg > 100 && b < 110 && r > b + 30) oro++;
          else if (gg > r + 12 && gg > b && gg > 50) verde++;
        }
        check('La miniatura del traje azul del Guardián muestra la túnica y el emblema', opacos > 350 && azul > opacos * 0.18 && oro > 8 && verde > 4, `opacos ${opacos} azul ${azul} oro ${oro} verde ${verde}`);
      } else check('La miniatura del traje azul del Guardián muestra la túnica y el emblema', !G.actores.failed3D, 'sin WebGL');
      check('Sin errores de consola durante la prueba', !errores.length, errores.slice(0, 3).join(' | '));
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      if (abierta()) cerrar();
      S.tienda = antes.tienda; S.unlocked = antes.unlocked; S.wear = antes.wear;
      try { G.actores.applyWear(); } catch (e) { /* */ }
      try { if (G.construir && G.construir.refrescar) G.construir.refrescar(); } catch (e) { /* */ }
      G.quiet = antes.quiet; console.error = cerr0; msg = '';
      if (susp) susp(false);
    }
    check('Limpieza: la partida queda como estaba', JSON.stringify(S.tienda) === JSON.stringify(antes.tienda) && JSON.stringify(S.unlocked) === JSON.stringify(antes.unlocked));
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }

  const api = { disponible, saldo, ganadas, compradas, tiene, precio, pagarPez, ganar, ganarLogro, comprar, vestir, vestirConjunto, abrir, cerrar, abierta, leer,
    PAGO_PEZ, PAGO_LOGRO, TOPE_DIA, BONO_DRNA, CATALOGO: ITEMS.map(it => Object.assign({}, it)), test };
  G.tienda = api;
  return api;
};
