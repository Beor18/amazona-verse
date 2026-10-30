/* QA · duración real del capítulo 1 (AP4, hito 26 de CAP1_PENDIENTE). AV.duracionCap1() → { rapido, normal, explorador, aula, md }
   Corre el recorrido completo de tests/qa/e2e.js (AV.e2eTest, que debe estar cargado) y, con su modelo de duración, da tres jugadores:
   - «rápido»: el mínimo automático sin leer (cada línea de diálogo y cada botón de tarjeta, 0,8 s; e2e.js `minimoSinLeerSeg`).
   - «normal»: el mismo recorrido leyendo los diálogos a 15 caracteres por segundo (e2e.js `minimoLeyendoSeg`).
   - «explorador»: el normal más ir volando a cada hallazgo del Diario que el recorrido no recogió (vecino más cercano desde donde
     acaba, a la velocidad de vuelo del juego), leer su ficha a 15 car/s y 3 s para mirar cada uno.
   Más los `minutos_mision` que guarda el Aula en la partida del recorrido (reloj de la misión educativa, no del capítulo).
   Todo son cotas inferiores medidas por la prueba: no sustituyen a jugadores reales (hito 26). Carga: inyectar e2e.js y este archivo.
   Uso desde node: tests/qa/duracion_cap1_correr.js <url> <salida.md>. */
(function () {
  'use strict';
  const CAR_POR_SEG = 15, MIRAR_SEG = 3;
  const fmt = s => Math.floor(s / 60) + ' min ' + String(Math.round(s % 60)).padStart(2, '0') + ' s';
  async function duracionCap1(o) {
    o = o || {};
    const AV = window.AV;
    if (!AV || !AV.e2eTest) throw new Error('falta AV.e2eTest (inyecta tests/qa/e2e.js)');
    const r = await AV.e2eTest({ rama: o.rama || 'B', keep: true });
    const d = r.duracion;
    if (!d) throw new Error('el recorrido no llegó a medir la duración (primer fallo: ' + r.primerFallo + ')');
    const fr = [...document.querySelectorAll('iframe')].pop(), W = fr && fr.contentWindow, G = W && W.AV && W.AV.G;
    let extra = { hallazgos: 0, metros: 0, seg: 0 }, aula = null;
    try {
      const S = G.S, ents = (G.pack.diario && G.pack.diario.entradas) || [], vel = (G.fisica && G.fisica.FLY_SPEED) || 12;
      let x = S.pos.x, z = S.pos.z; const quedan = ents.filter(f => !S.field.includes(f.id));
      while (quedan.length) {
        let k = 0, dk = Infinity; quedan.forEach((f, i) => { const dd = Math.hypot(f.x - x, f.z - z); if (dd < dk) { dk = dd; k = i; } });
        const f = quedan.splice(k, 1)[0]; extra.metros += dk; x = f.x; z = f.z; extra.hallazgos++;
        extra.seg += dk / vel + String(f.texto || f.text || f.nombre || '').length / CAR_POR_SEG + MIRAR_SEG;
      }
      const p = G.aula && G.aula.partida && G.aula.partida(); aula = p && p.minutos_mision != null ? p.minutos_mision : null;
    } catch (e) { extra.error = String(e && e.message || e); }
    if (fr && !o.keep) fr.remove();
    const rapido = d.minimoSinLeerSeg, normal = d.minimoLeyendoSeg, explorador = Math.round(normal + extra.seg);
    const md = [
      '# Duración del capítulo 1 (AP4, hito 26)', '',
      'Medido por `tests/qa/duracion_cap1.js` sobre el recorrido completo de `tests/qa/e2e.js` (rama ' + d.rama + ', ' + r.passed + '/' + r.total + ' comprobaciones' + (r.primerFallo ? ', primer fallo: ' + r.primerFallo : '') + '). ' + (o.nota || ''), '',
      '| Jugador | Duración | Cómo se calcula |', '|---|---|---|',
      '| Rápido | **' + fmt(rapido) + '** | juego simulado ' + fmt(d.simSeg) + ' + trayectos ' + fmt(d.trayectoSeg) + ' (' + d.metrosSuelo + ' m a pie, ' + d.metrosAire + ' m en vuelo) + ' + d.lineas + ' líneas y ' + d.clics + ' clics a 0,8 s, sin leer |',
      '| Normal | **' + fmt(normal) + '** | lo mismo leyendo los diálogos a ' + CAR_POR_SEG + ' caracteres por segundo (' + d.caracteres + ' caracteres) |',
      '| Explorador | **' + fmt(explorador) + '** | normal + ' + extra.hallazgos + ' hallazgos del Diario que el recorrido no recogió: ' + Math.round(extra.metros) + ' m de vuelo, su ficha a ' + CAR_POR_SEG + ' car/s y ' + MIRAR_SEG + ' s para mirar cada uno' + (extra.error ? ' (aviso: ' + extra.error + ')' : '') + ' |',
      '', '**Aula:** `minutos_mision` de la partida del recorrido = ' + (aula == null ? 'sin dato' : aula + ' min') + ' (reloj de la misión educativa, en tiempo real de la prueba, que va con atajos: no es la duración de un niño).', '',
      '**Límites:** son cotas inferiores. La prueba se teletransporta en vez de buscar el camino, no se equivoca y no cuenta el texto de las tarjetas ni los bocadillos libres (salen mientras se juega). Las metas del GDD (10–15 min), GAMEPLAY (20–30 min) y EDUCATIVO (45 min de clase) solo se validan con jugadores reales.',
      '', 'Fases (rápido): ' + d.fases.map(f => f.fase + ' ' + f.seg + ' s').join(' · '),
    ].join('\n');
    return { rapido, normal, explorador, aula, extra, e2e: { passed: r.passed, total: r.total, primerFallo: r.primerFallo }, md };
  }
  const poner = () => { if (window.AV) { window.AV.duracionCap1 = duracionCap1; return true; } return false; };
  if (!poner()) { const t = setInterval(() => { if (poner()) clearInterval(t); }, 200); setTimeout(() => clearInterval(t), 120000); }
})();
