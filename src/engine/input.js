/* AVE · entrada
   Teclado (WASD/flechas, Espacio, F, V, C, E/Enter, Q/R, 1–7, Esc), joystick táctil, botones de acción y arrastre para girar la cámara.
   Solo traduce entrada a llamadas: G.fisica (saltar, impulso, volar), G.actores (gestos), G.interaccion (acción).
   Esc emite el gancho 'escape' (un pack cancela ahí sus modos, p. ej. construir) y cierra la tarjeta abierta.
   Con el juego en pausa (G.pausa) se ignoran las acciones: saltar, impulso, volar, gestos, Acción y los botones táctiles. */
AVE.module('input', function (G) {
  'use strict';
  const $ = G.util.$;
  const keys = new Set();
  const stick = { x: 0, y: 0 };
  let jumpHeld = false, diveHeld = false;
  const paused = () => !!(G.pausa && G.pausa.activa());

  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.target && e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    keys.add(e.key.toLowerCase());
    if (paused()) { if (e.key === ' ') e.preventDefault(); return; }
    if (e.key === ' ') { jumpHeld = true; if (!e.repeat) G.fisica.tryJump(); e.preventDefault(); }
    if ((e.key === 'f' || e.key === 'F') && !e.repeat) G.fisica.tryDash();
    if ((e.key === 'v' || e.key === 'V') && !e.repeat) G.fisica.toggleFly();
    if (/^[1-7]$/.test(e.key) && !e.repeat) G.actores.playEmote(G.actores.EMOTE_KEYS[+e.key - 1]);
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') G.interaccion.action();
    if (e.key === 'Escape') { G.emit('escape'); G.ui.hideCard(); }
  });
  addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); if (e.key === ' ') jumpHeld = false; });
  addEventListener('blur', () => { keys.clear(); jumpHeld = false; });

  const stickEl = $('stick'), knob = $('knob');
  let stickId = null;
  stickEl.addEventListener('pointerdown', e => { stickId = e.pointerId; stickEl.setPointerCapture(e.pointerId); moveStick(e); });
  stickEl.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
  const endStick = e => { if (e.pointerId !== stickId) return; stickId = null; stick.x = stick.y = 0; knob.style.transform = ''; };
  stickEl.addEventListener('pointerup', endStick); stickEl.addEventListener('pointercancel', endStick);
  function moveStick(e) {
    const r = stickEl.getBoundingClientRect();
    let dx = (e.clientX - r.left - r.width / 2) / (r.width / 2), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    stick.x = dx; stick.y = dy;
    knob.style.transform = `translate(${dx * 35}px, ${dy * 35}px)`;
  }
  const jumpBtn = $('b-jump');
  jumpBtn.addEventListener('pointerdown', e => { e.preventDefault(); if (paused()) return; jumpHeld = true; G.fisica.tryJump(); });
  jumpBtn.addEventListener('pointerup', () => { jumpHeld = false; });
  jumpBtn.addEventListener('pointerleave', () => { jumpHeld = false; });
  $('b-dash').addEventListener('pointerdown', e => { e.preventDefault(); if (!paused()) G.fisica.tryDash(); });
  $('b-fly').addEventListener('pointerdown', e => { e.preventDefault(); if (!paused()) G.fisica.toggleFly(); });
  const actBtn = $('b-act');
  actBtn.addEventListener('click', () => { if (!paused()) G.interaccion.action(); });
  // Bucear en táctil: mantener el botón equivale a mantener C
  // (en el agua ocupa el lugar de Volar, así caben los botones en un teléfono)
  const diveBtn = $('b-dive'), flyBtn = $('b-fly');
  diveBtn.addEventListener('pointerdown', e => { e.preventDefault(); diveHeld = true; keys.add('c'); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) diveBtn.addEventListener(ev, () => { if (diveHeld) keys.delete('c'); diveHeld = false; });
  // Muestra Bucear en lugar de Volar mientras se nada
  function syncSwimButtons(swimming) {
    if (diveBtn.hidden === !!swimming) {
      diveBtn.hidden = !swimming; flyBtn.hidden = !!swimming;
      if (!swimming && diveHeld) { keys.delete('c'); diveHeld = false; }
    }
  }

  // Arrastrar en el lienzo gira la cámara
  const canvas = G.renderer.canvas;
  let dragId = null, dragX = 0;
  canvas.addEventListener('pointerdown', e => { dragId = e.pointerId; dragX = e.clientX; });
  canvas.addEventListener('pointermove', e => { if (e.pointerId !== dragId) return; G.camara.yaw -= (e.clientX - dragX) * 0.006; dragX = e.clientX; });
  const endDrag = e => { if (e.pointerId === dragId) dragId = null; };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

  return { keys, stick, get jumpHeld() { return jumpHeld; }, set jumpHeld(v) { jumpHeld = v; }, actBtn, syncSwimButtons };
});
