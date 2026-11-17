/* AVE · AV.sonidoTest (F21): cada acción importante con su efecto de assets/audio/sfx/, el ambiente según la hora y volúmenes equilibrados.
   Se carga al pedir la prueba (boot.js), no en la descarga inicial. Comprueba, con un espía en G.audio.play (sin altavoces):
   - Tabla de volúmenes (src/engine/audio.js NIVEL y src/game/musica.js BUCLES): cada efecto en archivo tiene su sonoridad medida y su
     nivel, y suena a ±0,6 LU de él; entre el más flojo y el más fuerte no hay más de 7,5 LU; el bosque de día y los coquíes de noche
     suenan igual (±0,5) y todos los ambientes quedan 4 LU o más por debajo del efecto más suave.
   - Vuelo con la física real (G.fisica): despegar, aletear, planear, frenar y aterrizar suenan; planear 60 cuadros seguidos suena una vez.
   - Recoger un objeto del mundo suena «semilla» (y el combo sube el tono).
   - Construir, pesca, duelo y poderes: cada acción llama a su efecto en el código de su módulo (sus baterías lo prueban en vivo).
   - Enfriamiento: el mismo efecto dos veces seguidas dentro de su minMs no se repite (G.audio.medir, sin conexión).
   - Ambiente: de día bosque y aves, de noche coquíes, con un fundido al atardecer; la hora sale de S.hora. En los minijuegos que callan
     la música el ambiente baja a 0,4.
   - Silencio: con el sonido apagado G.audio.play no suena nada, el master queda a 0 y la música y el ambiente no se oyen.
   Deja el sonido, la física, la hora y la partida como estaban. Devuelve { passed, total, results }. */
window.AVSonidoTest = function (G) {
  'use strict';
  const DT = 1 / 60;
  // Acción → efecto y el módulo que lo toca (comprobación en el código; en vivo lo prueban v18PescaTest, v18CombateTest, construirTest…)
  const EN_CODIGO = [
    ['construir: colocar', 'pieza', 'src/game/construir.js'], ['construir: encajar', 'encaje', 'src/game/construir.js'],
    ['pesca: lanzar', 'lanzar', 'src/game/v18/pesca.js'], ['pesca: pica', 'pica', 'src/game/v18/pesca.js'], ['pesca: sacar el pez', 'clavado', 'src/game/v18/pesca.js'],
    ['duelo: aletazo', 'duelo_ala', 'src/game/v18/combate.js'], ['duelo: patada', 'duelo_pata', 'src/game/v18/combate.js'], ['duelo: semilla', 'duelo_semilla', 'src/game/v18/habilidades.js'],
    ['duelo: poder', 'duelo_poder', 'src/game/v18/habilidades.js'], ['duelo: victoria', 'duelo_victoria', 'src/game/v18/combate.js'], ['duelo: derrota', 'duelo_derrota', 'src/game/v18/combate.js'],
    ['poder: Grito del Yunque', 'poder_grito', 'src/game/v18/explorar.js'], ['poder: ráfaga', 'poder_rafaga', 'src/game/v18/poderes_extra.js'],
    ['poder: ojo', 'poder_ojo', 'src/game/v18/poderes_extra.js'], ['poder: planeo', 'poder_planeo', 'src/game/v18/poderes_extra.js'],
    ['vuelo: picada', 'picada', 'src/game/juice.js'], ['reparar el puente', 'puente_reparado', 'src/game/v18/reparar.js'],
  ];
  async function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const fin = () => ({ passed: results.filter(r => r.ok).length, total: results.length, results });
    const A = G.audio, S = G.S, F = G.fisica;
    if (!A || !F) { ok('Audio y física cargados', false); return fin(); }
    const M = F.MOVE, play0 = A.play, oidos = [];
    const espia = () => { oidos.length = 0; A.play = function (n, a) { oidos.push({ n, a }); return false; }; };
    const suelta = () => { A.play = play0; };
    const nombres = () => oidos.map(o => o.n);
    const guarda = { quiet: G.quiet, pos: Object.assign({}, S.pos), vy: S.vy, move: Object.assign({}, M), hora: S.hora, teniaHora: Object.prototype.hasOwnProperty.call(S, 'hora'), muted: A.vol.muted };
    try {
      // ---------- 1. Tabla de volúmenes ----------
      const archivos = A.muestras().map(n => [n, A.ficha(n)]).filter(([, f]) => f && !f.bucle);
      const sinNivel = archivos.filter(([, f]) => f.lu == null || A.NIVEL[f.nivel] == null).map(([n]) => n);
      ok('F21 · Cada efecto en archivo tiene su sonoridad medida (lu) y su nivel', archivos.length >= 31 && !sinNivel.length, archivos.length + ' archivos · sin nivel: ' + sinNivel.join(','));
      const fuera = archivos.filter(([n, f]) => { const e = A.efectivo(n), obj = A.NIVEL[f.nivel]; return !(f.gain > 0 && f.gain <= 1) || (f.gain < 1 ? Math.abs(e - obj) > 0.6 : e > obj + 0.6); }).map(([n]) => n + ' ' + (A.efectivo(n) || 0).toFixed(1));
      ok('F21 · Cada efecto suena a ±0,6 LU del nivel de su tipo (ganancia de 0 a 1)', !fuera.length, fuera.join(', '));
      const efs = archivos.map(([n]) => A.efectivo(n)).filter(Number.isFinite), lo = Math.min(...efs), hi = Math.max(...efs);
      ok('F21 · Ninguno destaca ni se pierde: del más flojo al más fuerte, 7,5 LU o menos', hi - lo <= 7.5, lo.toFixed(1) + ' … ' + hi.toFixed(1));
      const mus = G.musicaApi || await cargarMusica();
      if (mus && mus.bucles) {
        const B = {}; for (const b of mus.bucles()) B[b.n] = b.lufs + 20 * Math.log10(b.k);
        const suave = Math.min(...Object.values(A.NIVEL));
        ok('F21 · Ambientes: el bosque de día y los coquíes de noche suenan igual (±0,5 LU)', Math.abs(B.bosque_yunque - B.noche_coquis) <= 0.5, JSON.stringify(B));
        ok('F21 · Ambientes 4 LU o más por debajo del efecto más suave (de fondo)', Object.values(B).every(v => v <= suave - 4), Object.keys(B).map(k => k + ' ' + B[k].toFixed(1)).join(' · '));
      } else ok('Ambientes: musica.js cargado', false, 'sin G.musicaApi');

      // ---------- 2. Vuelo con la física real ----------
      G.quiet = true;
      const ui = G.ui, dlg = G.dialogo, ov0 = ui.overlayOpen, open0 = dlg.open;
      const x = S.pos.x, z = S.pos.z, suelo = F.suelo(x, z, G.terreno.height(x, z) + 0.5);
      const pasos = n => { for (let i = 0; i < n; i++) F.step(DT, false); };
      try {
        ui.overlayOpen = () => false; dlg.open = () => false; if (ui.cardOpen && ui.hideCard) ui.hideCard(); // una ficha abierta frenaría el despegue
        F.endFlight(); Object.assign(M, { flying: false, landing: false, takeoff: 0, swimming: false, vx: 0, vz: 0, dashT: 0, dashCd: 0, grounded: true });
        S.pos.y = suelo; S.vy = 0;
        espia(); F.startFlying();
        ok('F21 · Despegar suena «despegar»', nombres().includes('despegar') && M.flying, nombres().join());
        // En el aire, alto y quieto: cernirse (aleteo), planear, frenar para posarse
        Object.assign(M, { takeoff: 0, landing: false, vx: 0, vz: 0 }); S.pos.y = suelo + 20; S.vy = 0;
        espia(); M.fase = 'cernido'; pasos(1); M.fase = 'cernido'; pasos(1);
        ok('F21 · Cernirse en el aire aletea («aleteo»)', nombres().includes('aleteo'), nombres().join());
        espia(); for (let i = 0; i < 60; i++) { M.fase = 'vuelo'; S.pos.y = suelo + 20; S.vy = 0; pasos(1); }
        const nPlaneo = nombres().filter(n => n === 'planeo').length;
        ok('F21 · Planear suena «planeo» una sola vez en 60 cuadros (al empezar, no por cuadro)', nPlaneo === 1, nombres().join());
        espia(); F.land(); S.pos.y = suelo + 3; S.vy = 0; pasos(1);
        ok('F21 · Frenar para posarse suena «frenada»', nombres().includes('frenada'), nombres().join());
        for (let i = 0; i < 300 && M.flying; i++) pasos(1);
        pasos(2);
        ok('F21 · Aterrizar suena (golpe en el suelo, techo o rama)', nombres().some(n => n === 'land' || n === 'aterrizar_techo' || n === 'posarse_rama') && !M.flying, nombres().join());
      } finally { suelta(); ui.overlayOpen = ov0; dlg.open = open0; }

      // ---------- 3. Recoger un objeto del mundo ----------
      const O = G.objetos;
      if (O && O.recursos && O.recursos.length && O.collect) {
        const r = O.recursos[0], inv0 = Object.assign({}, S.inv), col0 = S.collected.slice(), check0 = G.misiones.check, toast0 = ui.toast, juice = G.camara.juice, j0 = { combo: juice.combo, comboT: juice.comboT };
        try {
          G.misiones.check = () => {}; ui.toast = () => {};
          espia(); O.collect(r); O.collect(r);
          const s = oidos.filter(o => o.n === 'semilla');
          ok('F21 · Recoger un objeto suena «semilla» (no el «pickup» genérico) y el combo sube el tono', s.length === 2 && !nombres().includes('pickup') && s[1].a > s[0].a, oidos.map(o => o.n + ':' + o.a).join());
        } finally {
          suelta(); G.misiones.check = check0; ui.toast = toast0; S.inv = inv0; S.collected = col0; juice.combo = j0.combo; juice.comboT = j0.comboT; O.syncVisible();
        }
      } else ok('Recoger: G.objetos con recursos', true, 'este pack no tiene recursos');

      // ---------- 4. Construir, pesca, duelo y poderes: cada acción llama a su efecto ----------
      const textos = {};
      for (const [, , f] of EN_CODIGO) if (!(f in textos)) { try { textos[f] = await fetch(f).then(r => (r.ok ? r.text() : '')); } catch (e) { textos[f] = ''; } }
      const faltan = EN_CODIGO.filter(([, n, f]) => {
        const re = new RegExp('(sonar|play|son|s0)\\([^\\n]*[\'"]' + n + '[\'"]');
        return !A.has(n) || !(textos[f] || '').split('\n').some(l => !/precargar/.test(l) && re.test(l));
      }).map(([q, n]) => q + ' → ' + n);
      ok('F21 · Construir, pesca, duelo y poderes: cada acción toca su efecto de assets/audio/sfx/ (' + EN_CODIGO.length + ')', !faltan.length, faltan.join(' · '));
      ok('F21 · Los efectos que tocan existen como archivo (assets/audio/sfx/)', EN_CODIGO.every(([, n]) => { const f = A.ficha(n); return f && /assets\/audio\/sfx\//.test(f.url); }));

      // ---------- 5. Enfriamiento ----------
      if (A.medir && (window.OfflineAudioContext || window.webkitOfflineAudioContext)) {
        const m1 = await A.medir('puente_reparado', 0.5), m2 = await A.medir('puente_reparado', 0.5);
        ok('F21 · Enfriamiento: el mismo efecto otra vez antes de su minMs no se repite', !!(m1 && m2) && m1.pico > 0.001 && m2.pico === 0, m1 && m2 ? m1.pico.toFixed(3) + ' → ' + m2.pico : 'sin medida');
        const m3 = await A.medir('aleteo', 0.3), m4 = await A.medir('aleteo', 0.3);
        ok('F21 · Enfriamiento con «pronto»: el segundo aletazo seguido suena el sintético suave (bajito), no el archivo otra vez', !!(m3 && m4) && m3.pico > 0 && m4.pico > 0 && m4.pico < 0.2, m3 && m4 ? m3.pico.toFixed(3) + ' → ' + m4.pico.toFixed(3) : 'sin medida');
      } else ok('Enfriamiento (sin OfflineAudioContext: no se mide)', true);

      // ---------- 6. Ambiente según la hora ----------
      if (mus) {
        const dia = mus.calcularAmbiente({ hora: 12 }), noche = mus.calcularAmbiente({ hora: 23 }), tarde = mus.calcularAmbiente({ hora: 18.25 });
        ok('F21 · De día suena el bosque (aves) y no los coquíes; de noche, al revés', dia.aves > 0.9 && dia.coquies < 0.05 && noche.coquies > 0.9 && noche.aves < 0.05, `día ${dia.aves.toFixed(2)}/${dia.coquies.toFixed(2)} · noche ${noche.aves.toFixed(2)}/${noche.coquies.toFixed(2)}`);
        ok('F21 · Al atardecer se funden (los dos a medias, sin corte)', tarde.aves > 0.1 && tarde.aves < 0.9 && tarde.coquies > 0.1 && tarde.coquies < 0.9, `${tarde.aves.toFixed(2)}/${tarde.coquies.toFixed(2)}`);
        const bs = mus.bucles().map(b => b.n + ':' + b.capa).join();
        ok('F21 · bosque_yunque sigue a las aves (día) y noche_coquis a los coquíes (noche)', /bosque_yunque:aves/.test(bs) && /noche_coquis:coquies/.test(bs), bs);
        S.hora = 20; const hNoche = mus.hora(null); delete S.hora; const hSin = mus.hora(null);
        ok('F21 · La hora del ambiente es la del juego (S.hora); sin S.hora, de día', hNoche === 20 && hSin === 12, hNoche + ' / ' + hSin);
        const cl = document.body.classList, tenia = cl.contains('compas-on');
        cl.add('compas-on'); mus.tick(); const enMini = mus.minijuego() && mus.duckAmbiente() === 0.4;
        if (!tenia) cl.remove('compas-on'); mus.tick(); const fuera2 = !mus.minijuego() && mus.duckAmbiente() === (G.dialogo.activo && G.dialogo.activo() ? 0.4 : 1);
        ok('F21 · En los minijuegos que callan la música el ambiente baja a 0,4 y vuelve al salir', enMini && fuera2);
      }

      // ---------- 7. Silencio ----------
      A.vol.muted = true; A.apply();
      const sono = play0.call(A, 'semilla', 0) || play0.call(A, 'despegar') || play0.call(A, 'bosque_yunque');
      const masterCero = !A.ctx || A.master.gain.value === 0;
      let musCalla = true, det = '';
      if (mus) { mus.tick(); const e = mus.estado(); musCalla = e.silencio && !e.audible && (!e.buses || (!e.buses.m && !e.buses.a)); det = JSON.stringify({ silencio: e.silencio, audible: e.audible, buses: e.buses }); }
      ok('F21 · Con el sonido apagado no suena nada: efectos, master, música y ambiente', !sono && masterCero && musCalla, 'ctx ' + (A.ctx ? A.ctx.state : 'sin') + ' ' + det);
    } catch (e) {
      ok('Sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      suelta(); A.vol.muted = guarda.muted; A.apply(); if (G.musicaApi) G.musicaApi.tick();
      F.endFlight(); Object.assign(M, guarda.move); Object.assign(S.pos, guarda.pos); S.vy = guarda.vy;
      if (guarda.teniaHora) S.hora = guarda.hora; else delete S.hora;
      G.quiet = guarda.quiet;
    }
    return fin();
  }
  function cargarMusica() {
    if (G.musicaApi) return Promise.resolve(G.musicaApi);
    if (window.AVMusica) return Promise.resolve(window.AVMusica(G));
    return AVE.assets.script('src/game/musica.js').then(() => window.AVMusica(G), () => null);
  }
  return { test };
};
